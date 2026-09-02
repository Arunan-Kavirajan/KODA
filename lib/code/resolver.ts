/**
 * Internal vs external import resolver.
 *
 * Given an import source string (e.g. "./utils", "../components/Button")
 * and the set of known file paths in the repository, determine whether the
 * import resolves to an internal file or an external package.
 *
 * We do not attempt full Node.js resolution — we use heuristics that are
 * correct for the vast majority of real codebases.
 */

import * as path from "path";

/** The extensions we try when resolving bare paths (no extension). */
const RESOLUTION_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
] as const;

/** Index files we look for when resolving a directory import. */
const INDEX_FILES = RESOLUTION_EXTENSIONS.map((ext) => `index${ext}`);

/**
 * Resolve an import source relative to the importing file's path.
 * Returns:
 *   - `{ isInternal: true, resolvedPath: string }` if found in the file set
 *   - `{ isInternal: false }` if it looks external or can't be found
 */
export function resolveImport(
  importSource: string,
  importingFilePath: string,
  allFilePaths: Set<string>
): { isInternal: boolean; resolvedPath?: string } {
  // External package: not a relative or absolute path
  if (!importSource.startsWith(".") && !importSource.startsWith("/")) {
    return { isInternal: false };
  }

  try {
    // Compute the base directory of the importing file using forward slashes
    const importingDir = posixDirname(importingFilePath);

    // Resolve the raw path
    const rawResolved = posixJoin(importingDir, importSource);

    // 1. Exact match
    if (allFilePaths.has(rawResolved)) {
      return { isInternal: true, resolvedPath: rawResolved };
    }

    // 2. Try adding extensions
    for (const ext of RESOLUTION_EXTENSIONS) {
      const candidate = rawResolved + ext;
      if (allFilePaths.has(candidate)) {
        return { isInternal: true, resolvedPath: candidate };
      }
    }

    // 3. Try as directory index
    for (const indexFile of INDEX_FILES) {
      const candidate = posixJoin(rawResolved, indexFile);
      if (allFilePaths.has(candidate)) {
        return { isInternal: true, resolvedPath: candidate };
      }
    }

    // 4. Starts with known relative prefix but couldn't resolve — still internal
    return { isInternal: true };
  } catch {
    return { isInternal: false };
  }
}

/**
 * Build a Set of all file paths from the repository entries.
 * Normalizes backslashes to forward slashes for consistent comparison.
 */
export function buildFilePathSet(filePaths: string[]): Set<string> {
  return new Set(filePaths.map(normalizePath));
}

export function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

/** POSIX-style dirname that works with forward slashes. */
function posixDirname(filePath: string): string {
  const normalized = normalizePath(filePath);
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash === -1) return ".";
  return normalized.slice(0, lastSlash) || ".";
}

/** POSIX-style join and normalize. */
function posixJoin(...parts: string[]): string {
  // Use Node's path.posix for cross-platform safety
  const joined = parts.join("/").replace(/\\/g, "/");
  // Normalize: resolve ./ and ../
  const segments = joined.split("/");
  const result: string[] = [];
  for (const seg of segments) {
    if (seg === "..") {
      if (result.length > 0 && result[result.length - 1] !== "..") {
        result.pop();
      } else {
        result.push(seg);
      }
    } else if (seg !== ".") {
      result.push(seg);
    }
  }
  return result.join("/");
}

// Make path available as named export for potential reuse
export { path };
