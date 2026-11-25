export const CONTACT_EMAIL = "hello@wantmcp.com";
export const EFFECTIVE_DATE = "24 November 2026";
export const UPDATED_DATE = "25 November 2026";

export function ContactLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="link">
      {CONTACT_EMAIL}
    </a>
  );
}

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="wrap prose-page max-w-2xl py-12">
      <p className="eyebrow">Effective {EFFECTIVE_DATE} · updated {UPDATED_DATE}</p>
      <h1 className="mt-2 mb-6 text-4xl font-extrabold sm:text-5xl">{title}</h1>
      {children}
    </article>
  );
}
