import type { CodebaseGraph, GraphEdge, GraphNode } from "@/types";

/**
 * Graph model utilities.
 * Full graph engine and builder will be implemented in a future phase.
 */

export function createEmptyGraph(): CodebaseGraph {
  return {
    nodes: [],
    edges: [],
    metadata: {
      version: "0.1.0",
    },
  };
}

export function addNode(graph: CodebaseGraph, node: GraphNode): CodebaseGraph {
  return {
    ...graph,
    nodes: [...graph.nodes, node],
  };
}

export function addEdge(graph: CodebaseGraph, edge: GraphEdge): CodebaseGraph {
  return {
    ...graph,
    edges: [...graph.edges, edge],
  };
}

/**
 * Static preview graph for the landing page mock visualization.
 */
export function getPreviewGraph(): CodebaseGraph {
  const nodes: GraphNode[] = [
    { id: "repo", type: "repository", label: "Repository" },
    { id: "frontend", type: "module", label: "Frontend" },
    { id: "backend", type: "module", label: "Backend" },
    { id: "database", type: "database", label: "Database" },
    { id: "auth", type: "module", label: "Authentication" },
    { id: "api", type: "api", label: "API" },
  ];

  const edges: GraphEdge[] = [
    { id: "e1", source: "repo", target: "frontend", type: "contains" },
    { id: "e2", source: "repo", target: "backend", type: "contains" },
    { id: "e3", source: "backend", target: "database", type: "reads_from" },
    { id: "e4", source: "backend", target: "database", type: "writes_to" },
    { id: "e5", source: "backend", target: "auth", type: "depends_on" },
    { id: "e6", source: "frontend", target: "api", type: "communicates_with" },
    { id: "e7", source: "api", target: "backend", type: "communicates_with" },
    { id: "e8", source: "auth", target: "database", type: "reads_from" },
  ];

  return {
    nodes,
    edges,
    metadata: {
      repositoryName: "example-repo",
      generatedAt: new Date().toISOString(),
      version: "0.1.0-preview",
    },
  };
}
