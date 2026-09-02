"use client";

const NODES = [
  { id: "repo", label: "repository", x: 50, y: 10, type: "module" as const },
  { id: "frontend", label: "frontend", x: 28, y: 38, type: "dir" as const },
  { id: "backend", label: "backend", x: 72, y: 38, type: "dir" as const },
  { id: "components", label: "components", x: 16, y: 66, type: "file" as const },
  { id: "api", label: "api", x: 72, y: 66, type: "file" as const },
  { id: "auth", label: "auth", x: 50, y: 88, type: "dep" as const },
];

const EDGES = [
  { from: "repo", to: "frontend" },
  { from: "repo", to: "backend" },
  { from: "frontend", to: "components" },
  { from: "backend", to: "api" },
  { from: "components", to: "auth" },
  { from: "api", to: "auth" },
];

const COLORS = {
  module: "var(--graph-module)",
  dir: "var(--graph-dir)",
  file: "var(--graph-file)",
  dep: "var(--graph-dep)",
};

export function HeroGraph() {
  const nodeMap = Object.fromEntries(NODES.map((n) => [n.id, n]));

  return (
    <div className="relative w-full max-w-md border border-border bg-surface panel-border">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="font-mono text-[10px] text-muted-foreground">
          codebase map
        </span>
        <span className="font-mono text-[10px] text-muted-foreground/50">
          preview
        </span>
      </div>

      <div className="graph-grid relative aspect-square p-4">
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full"
          role="img"
          aria-label="Preview codebase graph showing repository structure"
        >
          {EDGES.map((edge, i) => {
            const from = nodeMap[edge.from];
            const to = nodeMap[edge.to];
            return (
              <line
                key={`${edge.from}-${edge.to}`}
                x1={from.x}
                y1={from.y + 3}
                x2={to.x}
                y2={to.y - 3}
                stroke="var(--border-strong)"
                strokeWidth="0.4"
                className="animate-draw-line"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            );
          })}

          {NODES.map((node, i) => (
            <g
              key={node.id}
              className="animate-fade-up"
              style={{ animationDelay: `${0.2 + i * 0.08}s`, opacity: 0 }}
            >
              <rect
                x={node.x - 14}
                y={node.y - 3}
                width="28"
                height="6"
                fill="var(--surface-raised)"
                stroke={COLORS[node.type]}
                strokeWidth="0.35"
              />
              <text
                x={node.x}
                y={node.y + 0.8}
                textAnchor="middle"
                fill="var(--foreground)"
                style={{ fontSize: "2.6px", fontFamily: "var(--font-mono)" }}
              >
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
