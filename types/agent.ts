/**
 * Core agent types for the KODA multi-agent analysis system.
 * Agents are provider-agnostic and independent from UI components.
 */

export type AgentStatus = "success" | "error" | "pending" | "running";

export type AgentResult<TFindings = unknown> = {
  agent: string;
  status: "success" | "error";
  findings: TFindings;
  metadata?: Record<string, unknown>;
};

export type AgentInput = {
  repositoryUrl?: string;
  repositoryPath?: string;
  snapshot?: import("./repository").RepositorySnapshot;
  context?: Record<string, unknown>;
};

export interface CodebaseAgent<TFindings = unknown> {
  name: string;
  description: string;
  analyze(input: AgentInput): Promise<AgentResult<TFindings>>;
}

export type RepositoryFileEntry = import("./repository").RepositoryFileEntry;

export type AnalysisJobStatus =
  | "queued"
  | "ingesting"
  | "analyzing"
  | "building_graph"
  | "complete"
  | "architect-analyzing"
  | "architect-ready"
  | "failed";

export type AnalysisJob = {
  id: string;
  status: AnalysisJobStatus;
  repositoryUrl?: string;
  repositoryName?: string;
  createdAt: string;
  updatedAt: string;
  agentResults?: AgentResult[];
  error?: string;
};

export type AnalyzeRequest = {
  repositoryUrl?: string;
  source?: "github" | "zip";
};

export type AnalyzeResponse = {
  jobId?: string;
  status: AnalysisJobStatus;
  message: string;
  snapshot?: import("./repository").RepositorySnapshot;
  error?: string;
};
