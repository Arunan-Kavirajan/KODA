/**
 * Code analysis orchestrator.
 *
 * Takes repository file entries + a map of file content,
 * runs language detection, import/export extraction, symbol detection,
 * and import resolution.
 *
 * Each file is analyzed in isolation. One bad file cannot crash the whole run.
 */

import type { CodeFile, AnalysisMetadata, Language } from "@/types/code";
import type { RepositoryFileEntry } from "@/types/repository";
import { detectLanguage, isAnalyzableLanguage } from "./language";
import { extractImports, extractExports } from "./imports";
import { extractFunctions, extractClasses } from "./symbols";
import { resolveImport, buildFilePathSet, normalizePath } from "./resolver";
import { isDependencyManifest } from "@/lib/repository/dependencies";

/** Maximum file size to attempt analysis (500 KB). */
const MAX_ANALYZE_SIZE = 512 * 1024;

/** Maximum number of parse failures before we stop recording them (avoid huge lists). */
const MAX_FAILURES_RECORDED = 50;

export type AnalyzerInput = {
  entries: RepositoryFileEntry[];
  /** Map of file path → raw text content. Paths should match entry.path. */
  contentMap: Map<string, string>;
};

export type AnalyzerOutput = {
  codeFiles: CodeFile[];
  analysisMetadata: AnalysisMetadata;
};

export function analyzeRepository(input: AnalyzerInput): AnalyzerOutput {
  const { entries, contentMap } = input;
  const codeFiles: CodeFile[] = [];
  const parseFailures: AnalysisMetadata["parseFailures"] = [];
  const languageCounts: Record<string, number> = {};
  let analyzedFiles = 0;
  let skippedFiles = 0;

  // Build a set of all known file paths for import resolution
  const allPaths = entries
    .filter((e) => e.type === "file")
    .map((e) => normalizePath(e.path));
  const filePathSet = buildFilePathSet(allPaths);

  const fileEntries = entries.filter((e) => e.type === "file");

  for (const entry of fileEntries) {
    const language = detectLanguage(entry.name);
    const normalizedPath = normalizePath(entry.path);

    // Skip non-analyzable files and manifests (handled separately)
    if (
      !isAnalyzableLanguage(language) ||
      isDependencyManifest(entry.name)
    ) {
      skippedFiles++;
      continue;
    }

    // Skip oversized files
    const size = entry.size ?? 0;
    if (size > MAX_ANALYZE_SIZE) {
      skippedFiles++;
      if (parseFailures.length < MAX_FAILURES_RECORDED) {
        parseFailures.push({
          path: entry.path,
          reason: `File too large (${Math.round(size / 1024)}KB > 500KB)`,
        });
      }
      continue;
    }

    const content = contentMap.get(normalizedPath) ?? contentMap.get(entry.path);

    // If no content available, record as skipped (not a parse failure)
    if (content === undefined) {
      skippedFiles++;
      continue;
    }

    try {
      const rawImports = extractImports(content, language);
      const exports = extractExports(content, language);
      const functions = extractFunctions(content, language);
      const classes = extractClasses(content, language);

      // Resolve internal vs external for each import
      const imports = rawImports.map((imp) => {
        if (!imp.isInternal) return imp;
        const resolution = resolveImport(imp.source, normalizedPath, filePathSet);
        return {
          ...imp,
          isInternal: resolution.isInternal,
          resolvedPath: resolution.resolvedPath,
        };
      });

      codeFiles.push({
        path: entry.path,
        language: language as Language,
        size,
        imports,
        exports,
        functions,
        classes,
        parsed: true,
      });

      analyzedFiles++;
      languageCounts[language] = (languageCounts[language] ?? 0) + 1;
    } catch (err) {
      skippedFiles++;
      if (parseFailures.length < MAX_FAILURES_RECORDED) {
        parseFailures.push({
          path: entry.path,
          reason: err instanceof Error ? err.message : "Unknown parse error",
        });
      }

      // Still include the file in results, just without analysis
      codeFiles.push({
        path: entry.path,
        language: language as Language,
        size,
        imports: [],
        exports: [],
        functions: [],
        classes: [],
        parsed: false,
        parseError: err instanceof Error ? err.message : "Unknown parse error",
      });
    }
  }

  const analysisMetadata: AnalysisMetadata = {
    analyzedAt: new Date().toISOString(),
    totalFiles: fileEntries.length,
    analyzedFiles,
    skippedFiles,
    parseFailures,
    languages: languageCounts,
  };

  return { codeFiles, analysisMetadata };
}
