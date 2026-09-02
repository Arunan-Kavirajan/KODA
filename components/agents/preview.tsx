import { getAgentDefinitions } from "@/lib/agents";

export function AgentSection() {
  const agents = getAgentDefinitions();

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <p className="font-mono text-xs text-terminal">future architecture</p>
        <h2 className="font-display mt-2 text-3xl tracking-tight sm:text-4xl">
          Specialized agents
        </h2>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          The multi-agent system we are building toward. Not implemented yet —
          ingestion comes first.
        </p>

        <div className="mt-10 font-mono text-xs leading-relaxed text-muted-foreground">
          <pre className="overflow-x-auto border border-border bg-surface p-4 text-[11px] sm:text-xs">
{`User
  │
  ▼
Orchestrator
  │
  ├── Architect Agent          (structure, boundaries, patterns)
  ├── Code Analyst Agent       (files, paths, data flow)
  │     └── Security Agent     (vulnerabilities, risks)
  │
  ▼
Synthesizer Agent
  │
  ▼
Graph Builder → KODA Workspace`}
          </pre>
        </div>

        <ul className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-2">
          {agents.map((agent) => (
            <li key={agent.name} className="bg-surface p-5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-mono text-sm">{agent.name}</h3>
                <span className="font-mono text-[10px] text-muted-foreground/50">
                  planned
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {agent.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
