export function Legal({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="flex-1">
      <div className="stripe h-3" />
      <article className="max-w-2xl mx-auto px-5 py-14 text-cream/90 leading-relaxed">
        <a href="/" className="font-accent text-marigold text-lg">← back to the auto</a>
        <h1 className="font-display text-4xl sm:text-5xl text-cream mt-4">{title}</h1>
        <p className="font-accent text-cream/60 mt-1">last updated {updated}</p>
        <div className="mt-8 space-y-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-marigold [&_h2]:mt-8 [&_p]:mt-2 [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-6">{children}</div>
      </article>
    </main>
  );
}
