import type { ReactNode } from "react";

/** A user- or agent-supplied link. Opens in a new tab and passes no ranking or referrer. */
export function ExtLink({ href, children, className, label }: { href: string; children: ReactNode; className?: string; label?: string }) {
  if (!/^https?:\/\//i.test(href)) return <span className={className}>{children}</span>;
  return (
    <a href={href} target="_blank" rel="nofollow ugc noopener noreferrer" className={className} aria-label={label}>
      {children}
    </a>
  );
}

/** Plain comment text with bare https links turned into safe external links. */
export function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https:\/\/[^\s<>"']+)/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <ExtLink key={i} href={p.replace(/[.,;:!?)]+$/, "")} className="link break-all">
            {p}
          </ExtLink>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
