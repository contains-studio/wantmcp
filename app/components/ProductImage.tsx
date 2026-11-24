import { useEffect, useRef, useState } from "react";

/**
 * A hotlinked product image: never proxied or stored. Lazy-loaded, sends no referrer,
 * fixed 4:3 frame, and falls back to a placeholder if the retailer's image fails.
 */
export function ProductImage({ src, alt, eager = false }: { src: string | null; alt: string; eager?: boolean }) {
  const [failed, setFailed] = useState(!src);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // The image may have failed before hydration attached onError.
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  return (
    <div className="product-img">
      {src && !failed && (
        <img
          ref={ref}
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          width={400}
          height={300}
          onError={() => setFailed(true)}
        />
      )}
      {failed && (
        <div className="fallback" role="img" aria-label={src ? `${alt} (image unavailable)` : `${alt} (no image)`}>
          <svg width="40" height="40" viewBox="0 0 32 32" aria-hidden="true" className="opacity-60">
            <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h9.36a2.5 2.5 0 0 1 1.77.73l10.6 10.6a2.5 2.5 0 0 1 0 3.54l-9.36 9.36a2.5 2.5 0 0 1-3.54 0L4.73 17.63A2.5 2.5 0 0 1 4 15.86Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="10" cy="10" r="2" fill="currentColor" />
          </svg>
        </div>
      )}
    </div>
  );
}
