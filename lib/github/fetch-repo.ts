import { gunzipSync } from "zlib";
import type { ParsedGitHubUrl } from "./parse-url";

export type GitHubRepoMetadata = {
  owner: string;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string;
  description?: string;
};

export type TarEntry = {
  path: string;
  type: "file" | "directory";
  size: number;
  /** UTF-8 text content for text files under 500KB. Undefined for binary/large files. */
  content?: string;
};

/** Maximum file size to read content for (500 KB). */
const MAX_CONTENT_SIZE = 512 * 1024;

/** Text file extensions whose content we extract from the archive. */
const TEXT_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs",
  "py", "pyw", "rb", "php", "go", "rs", "java", "cs", "cpp", "cc", "c", "h",
  "swift", "kt", "kts", "dart",
  "html", "htm", "css", "scss", "sass",
  "json", "yaml", "yml", "toml", "xml", "md", "mdx",
  "sh", "bash", "zsh",
  "txt", "env", "sql", "mod", "sum", "cfg", "conf", "ini",
]);

function isTextFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  const dotIndex = lower.lastIndexOf(".");
  if (dotIndex === -1) {
    const base = lower.split("/").pop() ?? lower;
    return ["makefile", "dockerfile", "procfile", "gemfile", "rakefile"].includes(base);
  }
  return TEXT_EXTENSIONS.has(lower.slice(dotIndex + 1));
}



export type FetchRepoResult =
  | { success: true; metadata: GitHubRepoMetadata; entries: TarEntry[] }
  | { success: false; status: number; message: string };

const GITHUB_API = "https://api.github.com";

export async function fetchRepoMetadata(
  parsed: ParsedGitHubUrl
): Promise<FetchRepoResult | { success: true; metadata: GitHubRepoMetadata }> {
  const response = await fetch(`${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "KODA-Codebase-Intelligence",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    return mapGitHubError(response.status, parsed);
  }

  const data = (await response.json()) as {
    name: string;
    full_name: string;
    html_url: string;
    default_branch: string;
    description: string | null;
  };

  return {
    success: true,
    metadata: {
      owner: parsed.owner,
      name: data.name,
      fullName: data.full_name,
      url: data.html_url,
      defaultBranch: data.default_branch,
      description: data.description ?? undefined,
    },
  };
}

export async function fetchPublicRepoArchive(
  parsed: ParsedGitHubUrl,
  ref?: string
): Promise<FetchRepoResult> {
  const metaResult = await fetchRepoMetadata(parsed);
  if (!metaResult.success) {
    return metaResult;
  }

  const branch = ref ?? metaResult.metadata.defaultBranch;
  const tarballUrl = `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/tarball/${branch}`;

  const response = await fetch(tarballUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "KODA-Codebase-Intelligence",
    },
    redirect: "follow",
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    return mapGitHubError(response.status, parsed);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  try {
    const decompressed = gunzipSync(buffer);
    const rawEntries = parseTarEntries(decompressed);
    const entries = stripTarballRootPrefix(rawEntries);

    if (entries.length === 0) {
      return {
        success: false,
        status: 500,
        message: "Repository archive was empty or could not be parsed.",
      };
    }

    return {
      success: true,
      metadata: metaResult.metadata,
      entries,
    };
  } catch {
    return {
      success: false,
      status: 500,
      message: "Failed to extract repository archive.",
    };
  }
}

function parseTarEntries(buffer: Buffer): TarEntry[] {
  const entries: TarEntry[] = [];
  let offset = 0;

  while (offset + 512 <= buffer.length) {
    const header = buffer.subarray(offset, offset + 512);

    if (header.every((byte) => byte === 0)) {
      break;
    }

    const rawName = header.subarray(0, 100).toString("utf8").replace(/\0/g, "").trim();
    const prefix = header.subarray(345, 500).toString("utf8").replace(/\0/g, "").trim();
    const name = prefix ? `${prefix}/${rawName}` : rawName;

    const sizeOctal = header.subarray(124, 136).toString("utf8").replace(/\0/g, "").trim();
    const size = parseInt(sizeOctal, 8) || 0;
    const typeFlag = header[156];

    const isDirectory = typeFlag === 53 || name.endsWith("/");
    const cleanPath = name.replace(/\/$/, "");

    if (cleanPath) {
      let content: string | undefined;

      // Extract text content for small text files
      if (!isDirectory && size > 0 && size <= MAX_CONTENT_SIZE && isTextFile(cleanPath)) {
        try {
          const dataStart = offset + 512;
          const dataEnd = dataStart + size;
          if (dataEnd <= buffer.length) {
            content = buffer.subarray(dataStart, dataEnd).toString("utf8");
          }
        } catch {
          // Content extraction failed — continue without it
        }
      }

      entries.push({
        path: cleanPath,
        type: isDirectory ? "directory" : "file",
        size: isDirectory ? 0 : size,
        content,
      });
    }

    offset += 512 + Math.ceil(size / 512) * 512;
  }

  return entries;
}

function stripTarballRootPrefix(entries: TarEntry[]): TarEntry[] {
  if (entries.length === 0) return entries;

  const firstPath = entries[0].path;
  const rootPrefix = firstPath.split("/")[0];

  if (!rootPrefix) return entries;

  return entries
    .map((entry) => ({
      ...entry,
      path: entry.path.startsWith(`${rootPrefix}/`)
        ? entry.path.slice(rootPrefix.length + 1)
        : entry.path === rootPrefix
          ? ""
          : entry.path,
    }))
    .filter((entry) => entry.path.length > 0);
}

function mapGitHubError(status: number, parsed: ParsedGitHubUrl): FetchRepoResult {
  switch (status) {
    case 404:
      return {
        success: false,
        status,
        message: `Repository "${parsed.owner}/${parsed.repo}" was not found or is private.`,
      };
    case 403:
      return {
        success: false,
        status,
        message: "GitHub rate limit reached. Try again in a few minutes.",
      };
    default:
      return {
        success: false,
        status,
        message: `Failed to access repository (HTTP ${status}).`,
      };
  }
}
