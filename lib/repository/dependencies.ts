/**
 * Dependency manifest parser.
 * Extracts external package dependencies from common manifest formats.
 * Does NOT call any network APIs — pure file parsing.
 */

import type { PackageDependency, DependencyKind } from "@/types/code";

// ─── package.json ─────────────────────────────────────────────────────────────

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

function parsePackageJson(content: string, sourcePath: string): PackageDependency[] {
  try {
    const pkg = JSON.parse(content) as PackageJson;
    const results: PackageDependency[] = [];

    const addDeps = (deps: Record<string, string> | undefined, kind: DependencyKind) => {
      if (!deps) return;
      for (const [name, version] of Object.entries(deps)) {
        results.push({ name, version: version || "*", kind, source: sourcePath });
      }
    };

    addDeps(pkg.dependencies, "production");
    addDeps(pkg.devDependencies, "development");
    addDeps(pkg.peerDependencies, "peer");
    addDeps(pkg.optionalDependencies, "optional");

    return results;
  } catch {
    return [];
  }
}

// ─── requirements.txt ─────────────────────────────────────────────────────────

function parseRequirementsTxt(content: string, sourcePath: string): PackageDependency[] {
  const results: PackageDependency[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const stripped = line.trim();
    // Skip comments, blank lines, options (-r, -c, --), URLs
    if (!stripped || stripped.startsWith("#") || stripped.startsWith("-") || stripped.includes("://")) {
      continue;
    }

    // Remove inline comments
    const withoutComment = stripped.split("#")[0]?.trim() ?? stripped;

    // Parse name and optional version specifier
    // Formats: package, package==1.0, package>=1.0,<2.0, package~=1.0
    const match = /^([A-Za-z0-9_.\-]+)\s*([><=!~^]+.*)?$/.exec(withoutComment);
    if (match) {
      const name = match[1] ?? "";
      const version = match[2]?.trim() || "*";
      if (name) {
        results.push({ name, version, kind: "production", source: sourcePath });
      }
    }
  }

  return results;
}

// ─── Cargo.toml ───────────────────────────────────────────────────────────────

function parseCargoToml(content: string, sourcePath: string): PackageDependency[] {
  const results: PackageDependency[] = [];
  const lines = content.split("\n");
  let inDependencies = false;
  let inDevDependencies = false;

  for (const line of lines) {
    const stripped = line.trim();
    if (stripped.startsWith("#") || stripped === "") continue;

    // Section headers
    if (stripped === "[dependencies]") { inDependencies = true; inDevDependencies = false; continue; }
    if (stripped === "[dev-dependencies]") { inDevDependencies = true; inDependencies = false; continue; }
    if (stripped.startsWith("[")) { inDependencies = false; inDevDependencies = false; continue; }

    if (!inDependencies && !inDevDependencies) continue;

    // Simple: name = "version"  or  name = { version = "x" }
    const simpleMatch = /^([\w-]+)\s*=\s*"([^"]*)"/.exec(stripped);
    if (simpleMatch) {
      results.push({
        name: simpleMatch[1] ?? "",
        version: simpleMatch[2] || "*",
        kind: inDevDependencies ? "development" : "production",
        source: sourcePath,
      });
      continue;
    }
    // Table form: name = { version = "x", ... }
    const tableMatch = /^([\w-]+)\s*=\s*\{/.exec(stripped);
    if (tableMatch) {
      const versionMatch = /version\s*=\s*"([^"]*)"/.exec(stripped);
      results.push({
        name: tableMatch[1] ?? "",
        version: versionMatch?.[1] || "*",
        kind: inDevDependencies ? "development" : "production",
        source: sourcePath,
      });
    }
  }

  return results;
}

// ─── go.mod ───────────────────────────────────────────────────────────────────

function parseGoMod(content: string, sourcePath: string): PackageDependency[] {
  const results: PackageDependency[] = [];
  const lines = content.split("\n");
  let inRequire = false;

  for (const line of lines) {
    const stripped = line.trim();
    if (stripped.startsWith("//") || stripped === "") continue;

    if (stripped.startsWith("require (")) { inRequire = true; continue; }
    if (inRequire && stripped === ")") { inRequire = false; continue; }

    // Single require: require module version
    const singleMatch = /^require\s+([\w./\-]+)\s+(v[\d.]+[\w.\-]*)/.exec(stripped);
    if (singleMatch) {
      results.push({
        name: singleMatch[1] ?? "",
        version: singleMatch[2] || "*",
        kind: "production",
        source: sourcePath,
      });
      continue;
    }

    // Inside require block: module version [// indirect]
    if (inRequire) {
      const match = /^([\w./\-]+)\s+(v[\d.]+[\w.\-]*)/.exec(stripped);
      if (match) {
        results.push({
          name: match[1] ?? "",
          version: match[2] || "*",
          kind: "production",
          source: sourcePath,
        });
      }
    }
  }

  return results;
}

// ─── pyproject.toml ───────────────────────────────────────────────────────────

function parsePyprojectToml(content: string, sourcePath: string): PackageDependency[] {
  const results: PackageDependency[] = [];
  const lines = content.split("\n");
  let inDeps = false;

  for (const line of lines) {
    const stripped = line.trim();
    if (stripped.startsWith("#") || stripped === "") continue;

    if (stripped === "[tool.poetry.dependencies]" || stripped === "[project.dependencies]") {
      inDeps = true; continue;
    }
    if (stripped.startsWith("[") && inDeps) { inDeps = false; continue; }

    // dependencies = [...] array form (PEP 621)
    // Or poetry: name = "version"
    if (inDeps) {
      // Poetry style: name = "^1.0"
      const poetryMatch = /^([\w.\-]+)\s*=\s*(?:\{[^}]*\}|"([^"]*)")/.exec(stripped);
      if (poetryMatch) {
        const name = poetryMatch[1] ?? "";
        const version = poetryMatch[2] || "*";
        if (name !== "python") {
          results.push({ name, version, kind: "production", source: sourcePath });
        }
        continue;
      }
      // PEP 621: "package>=1.0"
      const pep621Match = /^"([A-Za-z0-9_.\-]+)([><=!~^]+[^"]*)?/.exec(stripped);
      if (pep621Match) {
        results.push({
          name: pep621Match[1] ?? "",
          version: pep621Match[2]?.trim() || "*",
          kind: "production",
          source: sourcePath,
        });
      }
    }
  }

  return results;
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export type ManifestFile = {
  path: string;
  content: string;
};

const MANIFEST_PARSERS: Record<
  string,
  (content: string, path: string) => PackageDependency[]
> = {
  "package.json": parsePackageJson,
  "requirements.txt": parseRequirementsTxt,
  "Cargo.toml": parseCargoToml,
  "go.mod": parseGoMod,
  "pyproject.toml": parsePyprojectToml,
};

/**
 * Extract dependencies from a manifest file.
 * Returns empty array if the filename isn't recognized or parsing fails.
 */
export function extractDependencies(
  content: string,
  filePath: string
): PackageDependency[] {
  const filename = filePath.split("/").pop() ?? filePath;
  const parser = MANIFEST_PARSERS[filename];
  if (!parser) return [];
  try {
    return parser(content, filePath);
  } catch {
    return [];
  }
}

/** Returns true if a file path is a known dependency manifest. */
export function isDependencyManifest(filePath: string): boolean {
  const filename = filePath.split("/").pop() ?? filePath;
  return filename in MANIFEST_PARSERS;
}
