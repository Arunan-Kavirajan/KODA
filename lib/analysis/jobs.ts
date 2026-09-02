import type { AnalysisJob, AnalyzeRequest, AnalyzeResponse } from "@/types";
import type { RepositorySnapshot } from "@/types/repository";
import type { CodebaseGraph } from "@/types/graph";
import { ingestFromGitHub } from "@/lib/repository";
import { analyzeRepository } from "@/lib/code/analyzer";
import { extractDependencies, isDependencyManifest } from "@/lib/repository/dependencies";
import { normalizePath } from "@/lib/code/resolver";
import { buildCodebaseGraph } from "@/lib/graph/build";

/**
 * Analysis orchestration layer.
 * Coordinates ingestion → code analysis → dependency extraction → graph building.
 * No AI agents involved — purely deterministic.
 */

const jobs = new Map<string, AnalysisJob>();
const snapshots = new Map<string, RepositorySnapshot>();
const graphs = new Map<string, CodebaseGraph>();

function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export type AnalyzeResponseWithGraph = AnalyzeResponse & { graph?: CodebaseGraph };

export async function runAnalysis(
  request: AnalyzeRequest
): Promise<AnalyzeResponseWithGraph> {
  const jobId = generateJobId();
  const now = new Date().toISOString();

  if (!request.repositoryUrl) {
    return {
      status: "failed",
      message: "No repository URL provided.",
      error: "repositoryUrl is required",
    };
  }

  const job: AnalysisJob = {
    id: jobId,
    status: "ingesting",
    repositoryUrl: request.repositoryUrl,
    createdAt: now,
    updatedAt: now,
  };
  jobs.set(jobId, job);

  // ── Step 1: Ingest repository (fetch archive + build file tree) ───────────
  const ingestion = await ingestFromGitHub(request.repositoryUrl);

  if (!ingestion.success) {
    job.status = "failed";
    job.error = ingestion.error.message;
    job.updatedAt = new Date().toISOString();
    jobs.set(jobId, job);

    return {
      jobId,
      status: "failed",
      message: ingestion.error.message,
      error: ingestion.error.message,
    };
  }

  job.status = "analyzing";
  job.updatedAt = new Date().toISOString();
  jobs.set(jobId, job);

  // ── Step 2: Build content map from raw tar entries ────────────────────────
  // rawEntries carry the file content extracted during archive parsing.
  const contentMap = new Map<string, string>();
  for (const tarEntry of ingestion.rawEntries) {
    if (tarEntry.content !== undefined) {
      contentMap.set(normalizePath(tarEntry.path), tarEntry.content);
    }
  }

  // ── Step 3: Extract dependencies from manifest files ─────────────────────
  const allDependencies: ReturnType<typeof extractDependencies> = [];
  for (const entry of ingestion.snapshot.entries) {
    if (entry.type === "file" && isDependencyManifest(entry.name)) {
      const content = contentMap.get(normalizePath(entry.path));
      if (content) {
        const deps = extractDependencies(content, entry.path);
        allDependencies.push(...deps);
      }
    }
  }

  // ── Step 4: Run code analysis ─────────────────────────────────────────────
  const { codeFiles, analysisMetadata } = analyzeRepository({
    entries: ingestion.snapshot.entries,
    contentMap,
  });

  // ── Step 5: Build codebase graph ──────────────────────────────────────────
  job.status = "building_graph";
  job.updatedAt = new Date().toISOString();
  jobs.set(jobId, job);

  const enrichedSnapshot: RepositorySnapshot = {
    ...ingestion.snapshot,
    codeFiles,
    dependencies: allDependencies,
    analysisMetadata,
  };

  const graph = buildCodebaseGraph(enrichedSnapshot);

  // ── Complete ───────────────────────────────────────────────────────────────
  snapshots.set(jobId, enrichedSnapshot);
  graphs.set(jobId, graph);
  job.status = "complete";
  job.repositoryName = ingestion.snapshot.metadata.fullName;
  job.updatedAt = new Date().toISOString();
  jobs.set(jobId, job);

  return {
    jobId,
    status: "complete",
    message: `Analyzed ${analysisMetadata.analyzedFiles} of ${ingestion.snapshot.stats.filteredFiles} files from ${ingestion.snapshot.metadata.fullName}.`,
    snapshot: enrichedSnapshot,
    graph,
  };
}

export function getAnalysisJob(jobId: string): AnalysisJob | undefined {
  return jobs.get(jobId);
}

export function getSnapshot(jobId: string): RepositorySnapshot | undefined {
  return snapshots.get(jobId);
}

export function getGraph(jobId: string): CodebaseGraph | undefined {
  return graphs.get(jobId);
}
