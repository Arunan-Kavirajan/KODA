const STEPS = [
  {
    num: "01",
    title: "Repository ingestion",
    detail: "Download and walk the file tree. Filter noise. Preserve structure.",
    status: "active",
  },
  {
    num: "02",
    title: "Multi-agent analysis",
    detail: "Architect, Code Analyst, and Security agents examine the codebase in parallel.",
    status: "planned",
  },
  {
    num: "03",
    title: "Knowledge graph",
    detail: "Findings become nodes and edges — modules, imports, APIs, dependencies.",
    status: "planned",
  },
  {
    num: "04",
    title: "Interactive exploration",
    detail: "Navigate the map. Inspect files. Ask questions about what you find.",
    status: "planned",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="border-b border-border py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
          <div>
            <p className="font-mono text-xs text-terminal">pipeline</p>
            <h2 className="font-display mt-2 text-3xl tracking-tight sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Each stage is an independent module. Ingestion does not depend on
              AI. Agents do not depend on the UI. The graph does not depend on a
              specific visualization library.
            </p>
          </div>

          <ol className="space-y-0 divide-y divide-border border-y border-border">
            {STEPS.map((step) => (
              <li
                key={step.num}
                className="grid grid-cols-[3rem_1fr_auto] items-start gap-4 py-5 sm:grid-cols-[4rem_1fr_auto]"
              >
                <span className="font-mono text-sm text-muted-foreground/50">
                  {step.num}
                </span>
                <div>
                  <h3 className="text-sm font-medium">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
                <span
                  className={`font-mono text-[10px] uppercase tracking-wide ${
                    step.status === "active"
                      ? "text-accent"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {step.status}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
