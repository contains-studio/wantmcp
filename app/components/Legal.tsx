export function DraftNotice() {
  return (
    <div role="note" className="not-prose mb-6 rounded-xl border-2 border-dashed border-warn bg-warn-soft p-4 text-[0.92rem] text-warn">
      <strong>Draft for the owner to review.</strong> This text is a plain-language starting point, not legal advice, and hasn't been reviewed by a
      lawyer yet.
    </div>
  );
}

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="wrap prose-page max-w-2xl py-12">
      <p className="eyebrow">Draft · {updated}</p>
      <h1 className="mt-2 mb-6 text-4xl font-extrabold sm:text-5xl">{title}</h1>
      {children}
    </article>
  );
}
