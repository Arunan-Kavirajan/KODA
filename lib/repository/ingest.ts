import { parseGitHubUrl } from "@/lib/github/parse-url";
import { fetchPublicRepoArchive } from "@/lib/github/fetch-repo";
import { buildFileTreeFromTarEntries } from "./file-tree";
import type { TarEntry } from "@/lib/github/fetch-repo";
import type { IngestionError, IngestionResult, RepositorySnapshot } from "@/types/repository";

export type { IngestionResult, RepositorySnapshot } from "@/types/repository";

/** Extended ingestion result that carries raw tar entries (including file content). */
export type IngestionSuccess = {
  success: true;
  snapshot: RepositorySnapshot;
  /** Raw tar entries from the archive, including extracted file content. */
  rawEntries: TarEntry[];
};

export type ExtendedIngestionResult =
  | IngestionSuccess
  | { success: false; error: IngestionError };

export async function ingestFromGitHub(url: string): Promise<ExtendedIngestionResult> {
  const parsed = parseGitHubUrl(url);

  if (!parsed) {
    return {
      success: false,
      error: {
        code: "INVALID_URL",
        message: "Invalid GitHub repository URL.",
      },
    };
  }

  const fetchResult = await fetchPublicRepoArchive(parsed);

  if (!fetchResult.success) {
    return {
      success: false,
      error: {
        code: mapStatusToErrorCode(fetchResult.status),
        message: fetchResult.message,
      },
    };
  }

  try {
    const { entries, tree, stats } = buildFileTreeFromTarEntries(
      fetchResult.entries
    );

    const snapshot: RepositorySnapshot = {
      metadata: {
        owner: fetchResult.metadata.owner,
        name: fetchResult.metadata.name,
        fullName: fetchResult.metadata.fullName,
        url: fetchResult.metadata.url,
        defaultBranch: fetchResult.metadata.defaultBranch,
        description: fetchResult.metadata.description,
      },
      entries,
      tree,
      stats,
      ingestedAt: new Date().toISOString(),
    };

    return { success: true, snapshot, rawEntries: fetchResult.entries };
  } catch {
    return {
      success: false,
      error: {
        code: "EXTRACTION_FAILED",
        message: "Failed to build file tree from repository archive.",
      },
    };
  }
}

export async function ingestFromZip(_file: File): Promise<IngestionResult> {
  void _file;
  return {
    success: false,
    error: {
      code: "UNKNOWN",
      message: "ZIP upload ingestion is not yet implemented.",
    },
  };
}

function mapStatusToErrorCode(status: number): IngestionError["code"] {
  if (status === 404) return "NOT_FOUND";
  if (status === 403) return "RATE_LIMITED";
  if (status === 401) return "FORBIDDEN";
  return "UNKNOWN";
}
