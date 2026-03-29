const DashboardPage = () => {
  return (
    <main className="min-h-screen px-6 py-12 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <section className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-teal-300">
            Meeting Intelligence Hub
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
            Turn raw meeting transcripts into decisions, action items, and
            searchable knowledge.
          </h1>
          <p className="max-w-2xl text-base text-slate-300 md:text-lg">
            We are starting with a clean project shell so the upload pipeline,
            AI extraction, semantic search, and transcript chat can slot into a
            stable architecture.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            "Transcript upload and parsing",
            "AI extraction and sentiment timeline",
            "Chat with citations and semantic retrieval"
          ].map((item) => (
            <article
              key={item}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
            >
              <p className="text-sm text-slate-200">{item}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
};

export default DashboardPage;
