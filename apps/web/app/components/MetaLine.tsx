import { Fragment, type ReactNode } from "react";

/**
 * "a · b · c" that wraps as whole items and never starts or ends a line with a dot: each item draws its dot in the gap
 * before it, and the dot that would start a wrapped line falls outside a clipped edge (app.css, .meta-line).
 */
export function MetaLine({ items, className = "", as: Tag = "div" }: { items: ReactNode[]; className?: string; as?: "div" | "p" }) {
  const shown = items.filter((i) => i !== null && i !== undefined && i !== false && i !== "");
  if (!shown.length) return null;
  return (
    <Tag className={`meta-line ${className}`}>
      <span className="block">
        <span className="meta-row">
          {shown.map((item, i) => (
            <Fragment key={i}>
              <span className="meta-item">{item}</span>
            </Fragment>
          ))}
        </span>
      </span>
    </Tag>
  );
}
