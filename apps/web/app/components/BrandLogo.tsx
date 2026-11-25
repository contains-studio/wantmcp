import type { Brand } from "~/lib/brands";

/**
 * A client's mark at its tuned optical height, with the dark-mode file when the vendor has one.
 * Marks that don't spell the product's name get the name set beside them in our type.
 */
export function BrandLogo({ brand, scale = 1 }: { brand: Brand; scale?: number }) {
  const l = brand.logo;
  if (!l) return <span className="text-[0.95rem] font-semibold">{brand.name}</span>;
  const style = { height: `${(l.optical ?? 1.5) * scale}rem` };
  return (
    <>
      <img src={l.light} alt="" width={l.width} height={l.height} style={style} className={`brand-logo ${l.dark ? "brand-logo-light" : ""} ${l.tile ? "brand-logo-tile" : ""}`} decoding="async" />
      {l.dark && <img src={l.dark} alt="" width={l.width} height={l.height} style={style} className={`brand-logo brand-logo-dark ${l.tile ? "brand-logo-tile" : ""}`} decoding="async" />}
      {l.nameBeside && <span className="text-[0.95rem] font-semibold">{brand.name}</span>}
    </>
  );
}
