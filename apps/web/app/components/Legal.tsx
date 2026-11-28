export const CONTACT_EMAIL = "hello@wantmcp.com";
export const EFFECTIVE_DATE = "24 November 2026";
// The day in the US, where the owner is: dated by their calendar, not UTC's.
export const UPDATED_DATE = "25 November 2026";
/** /privacy with its routines part (shown once routines are launched for the reader): the day it was updated for them. */
export const ROUTINES_UPDATED_DATE = "28 November 2026";

export function ContactLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="link">
      {CONTACT_EMAIL}
    </a>
  );
}

export function LegalPage({ title, updated = UPDATED_DATE, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <article className="wrap prose-page max-w-2xl py-12">
      <p className="eyebrow">Effective {EFFECTIVE_DATE} · updated {updated}</p>
      <h1 className="serif mt-2 mb-6 text-[2.5rem] leading-tight sm:text-[3rem]">{title}</h1>
      {children}
    </article>
  );
}
