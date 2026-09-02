/**
 * Repository ingestion types.
 * Independent from AI agents and graph visualization.
 */

export type RepositoryFileEntry = {
  path: string;
  name: string;
  type: "file" | "directory";
  extension?: string;
  size?: number;
  depth: number;
  parentPath?: string;
  language?: string;
};

export type RepositoryMetadata = {
  owner: string;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string;
  description?: string;
};

export type RepositoryStats = {
  totalFiles: number;
  totalDirectories: number;
  filteredFiles: number;
  filteredDirectories: number;
  ignoredCount: number;
};

export type RepositorySnapshot = {
  metadata: RepositoryMetadata;
  entries: RepositoryFileEntry[];
  tree: RepositoryTreeNode[];
  stats: RepositoryStats;
  ingestedAt: string;
  /** Code intelligence analysis results (populated in Phase 2). */
  codeFiles?: import("./code").CodeFile[];
  /** Extracted package dependencies from manifests. */
  dependencies?: import("./code").PackageDependency[];
  /** Metadata about the analysis run. */
  analysisMetadata?: import("./code").AnalysisMetadata;
};

export type RepositoryTreeNode = {
  entry: RepositoryFileEntry;
  children: RepositoryTreeNode[];
};

export type IngestionError = {
  code: "INVALID_URL" | "NOT_FOUND" | "FORBIDDEN" | "RATE_LIMITED" | "EXTRACTION_FAILED" | "UNKNOWN";
  message: string;
};

export type IngestionResult =
  | { success: true; snapshot: RepositorySnapshot }
  | { success: false; error: IngestionError };
