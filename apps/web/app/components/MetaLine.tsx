import { Fragment, isValidElement, type ReactNode } from "react";

/** An item with its own class, e.g. "max-sm:hidden" for the least useful count on phones. */
export type MetaItem = ReactNode | { node: ReactNode; className: string };
const isWrapped = (i: MetaItem): i is { node: ReactNode; className: string } =>
  typeof i === "object" && i !== null && !isValidElement(i) && "node" in (i as object);

/**
 * "a · b · c" that wraps as whole items and never starts or ends a line with a dot: each item draws its dot in the gap
 * before it, and the dot that would start a wrapped line falls outside a clipped edge (app.css, .meta-line).
 */
export function MetaLine({ items, className = "", as: Tag = "div" }: { items: MetaItem[]; className?: string; as?: "div" | "p" }) {
  const shown = items.filter((i) => i !== null && i !== undefined && i !== false && i !== "" && !(isWrapped(i) && (i.node === null || i.node === false)));
  if (!shown.length) return null;
  return (
    <Tag className={`meta-line ${className}`}>
      <span className="block">
        <span className="meta-row">
          {shown.map((item, i) => (
            <Fragment key={i}>
              {isWrapped(item) ? <span className={`meta-item ${item.className}`}>{item.node}</span> : <span className="meta-item">{item}</span>}
            </Fragment>
          ))}
        </span>
      </span>
    </Tag>
  );
}
