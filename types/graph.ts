/**
 * Codebase knowledge graph model.
 * Independent from visualization — can be rendered by any graph library.
 */

export type GraphNodeType =
  | "repository"
  | "directory"
  | "file"
  | "function"
  | "class"
  | "module"
  | "api"
  | "database"
  | "external_dependency";

export type GraphEdgeType =
  | "contains"
  | "imports"
  | "calls"
  | "depends_on"
  | "communicates_with"
  | "reads_from"
  | "writes_to";

export type GraphNode = {
  id: string;
  type: GraphNodeType;
  label: string;
  metadata?: Record<string, unknown>;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
  metadata?: Record<string, unknown>;
};

export type CodebaseGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata?: {
    repositoryName?: string;
    generatedAt?: string;
    version?: string;
  };
};
