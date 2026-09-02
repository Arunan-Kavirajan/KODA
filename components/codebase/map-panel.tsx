"use client";

import dynamic from "next/dynamic";
import type { RepositorySnapshot } from "@/types/repository";
import type { CodebaseGraph } from "@/types/graph";
import { buildCodebaseGraph } from "@/lib/graph/build";
import { useMemo } from "react";

// Load ReactFlow client-side only (it uses browser APIs)
const CodebaseGraphView = dynamic(
  () => import("./codebase-graph").then((m) => ({ default: m.CodebaseGraphView })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <p className="font-mono text-xs text-muted-foreground animate-pulse">
          Loading graph...
        </p>
      </div>
    ),
  }
);

type MapPanelProps = {
  snapshot: RepositorySnapshot;
  selectedPath?: string;
  onNodeSelect: (nodeId: string | null) => void;
  selectedNodeId?: string | null;
  /** Pre-built graph from the server. If absent, builds from snapshot client-side. */
  graph?: CodebaseGraph;
};

export function MapPanel({
  snapshot,
  onNodeSelect,
  selectedNodeId,
  graph: serverGraph,
}: MapPanelProps) {
  const repoName = snapshot.metadata.name;

  // Use server-provided graph or build from snapshot data (for backwards compat)
  const graph = useMemo(() => {
    if (serverGraph) return serverGraph;
    return buildCodebaseGraph(snapshot);
  }, [serverGraph, snapshot]);

  const hasAnalysis = !!(snapshot.codeFiles && snapshot.codeFiles.length > 0);
  const nodeCount = graph.nodes.length;
  const edgeCount = graph.edges.length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Codebase map
        </span>
        <div className="flex items-center gap-3">
          {hasAnalysis && (
            <span className="font-mono text-[10px] text-graph-dir">
              ● analyzed
            </span>
          )}
          <span className="font-mono text-[10px] text-muted-foreground/50">
            {nodeCount} nodes · {edgeCount} edges
          </span>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {graph.nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <p className="font-mono text-xs text-muted-foreground">
              No nodes to display.
              <br />
              Try a repository with source files.
            </p>
          </div>
        ) : (
          <CodebaseGraphView
            graph={graph}
            onNodeSelect={onNodeSelect}
            selectedNodeId={selectedNodeId}
          />
        )}
      </div>

      <div className="border-t border-border px-3 py-1.5">
        <div className="flex items-center gap-4 font-mono text-[9px] text-muted-foreground/50">
          <span className="flex items-center gap-1">
            <span style={{ color: "#7a9e87" }}>■</span> directory
          </span>
          <span className="flex items-center gap-1">
            <span style={{ color: "#8a847c" }}>■</span> file
          </span>
          <span className="flex items-center gap-1">
            <span style={{ color: "#7a8ec4" }}>■</span> dependency
          </span>
          <span className="flex items-center gap-1">
            <span style={{ color: "#c4956a" }}>—</span> imports
          </span>
        </div>
        <p className="mt-0.5 font-mono text-[9px] text-muted-foreground/30">
          {repoName} · click a node to inspect
        </p>
      </div>
    </div>
  );
}
