import { useLocation } from "react-router";

/** A page whose one lookup failed (not "not found": couldn't check). A plain retry with the reference to quote. */
export function Unavailable({ reference, what }: { reference: string; what: string }) {
  const here = useLocation();
  return (
    <div className="wrap grid place-items-center py-12">
      <div role="alert" className="card grid w-full max-w-md justify-items-center gap-3 p-6 text-center sm:p-8">
        <h1 className="text-[1.6rem] leading-tight font-semibold">We couldn't check {what} just now</h1>
        <p className="text-ink-2">It's on our side. Try again in a moment.</p>
        <a href={here.pathname + here.search} className="btn btn-want mt-2">
          Try again
        </a>
        <p className="hint">
          Reference: <code className="font-semibold">{reference}</code>
        </p>
      </div>
    </div>
  );
}
