const rebuildDocs = [
  '00-rebuild-direction.md',
  '01-product-and-information-architecture.md',
  '03-aigc-module-requirements.md',
  '04-conversation-module-requirements.md',
  '05-interface-contract.md',
  '06-storage-and-config-schema.md',
  '07-core-and-provider-organization.md',
  '08-frontend-organization.md',
  '09-visual-and-interaction-guidelines.md',
  '10-technology-stack-and-dependency-decisions.md',
  '11-implementation-brief.md',
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-medium text-muted-foreground">ModelScope Prism</p>
          <h1 className="text-4xl font-semibold tracking-normal sm:text-5xl">
            Rebuild handoff skeleton
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            This branch intentionally contains only the rebuild documentation and a minimal Next.js
            scaffold. Start with <code>docs/rebuild/11-implementation-brief.md</code>, then build
            the system through the documented contracts and module boundaries.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {rebuildDocs.map((doc) => (
            <div
              key={doc}
              className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-card-foreground"
            >
              {doc}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
