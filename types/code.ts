/**
 * Code structure types for KODA Phase 2: Repository Intelligence.
 * These types represent the deterministic analysis of source code —
 * no AI involved. They form the structured input for future agents.
 */

// ─── Language ────────────────────────────────────────────────────────────────

export type Language =
  | "TypeScript"
  | "TSX"
  | "JavaScript"
  | "JSX"
  | "Python"
  | "Java"
  | "C"
  | "C++"
  | "C#"
  | "Go"
  | "Rust"
  | "PHP"
  | "Ruby"
  | "Swift"
  | "Kotlin"
  | "Dart"
  | "HTML"
  | "CSS"
  | "SCSS"
  | "JSON"
  | "YAML"
  | "Markdown"
  | "Shell"
  | "TOML"
  | "SQL"
  | "unknown";

// ─── Import ───────────────────────────────────────────────────────────────────

export type ImportKind = "named" | "default" | "namespace" | "side-effect" | "require" | "dynamic";

export type CodeImport = {
  /** The raw import source string (e.g. "react", "./utils", "../api") */
  source: string;
  /** Named imports: import { foo, bar } */
  names: string[];
  /** Default import: import Foo from "..." */
  defaultImport?: string;
  /** Namespace import: import * as X from "..." */
  namespaceImport?: string;
  /** Whether this appears to be a local file (relative path) */
  isInternal: boolean;
  /** Resolved absolute path within the repo, if internal and resolvable */
  resolvedPath?: string;
  kind: ImportKind;
};

// ─── Export ───────────────────────────────────────────────────────────────────

export type ExportKind = "named" | "default" | "namespace" | "re-export";

export type CodeExport = {
  name: string;
  kind: ExportKind;
  /** For re-exports: the source module */
  source?: string;
};

// ─── Function ─────────────────────────────────────────────────────────────────

export type CodeFunction = {
  name: string;
  /** Parameter names, if detectable */
  parameters: string[];
  /** 1-indexed line number where the function starts */
  line?: number;
  /** Whether the function is exported */
  isExported: boolean;
  /** Whether this is an async function */
  isAsync: boolean;
};

// ─── Class ────────────────────────────────────────────────────────────────────

export type CodeClass = {
  name: string;
  /** Method names within the class */
  methods: string[];
  /** 1-indexed line number where the class starts */
  line?: number;
  /** Whether the class is exported */
  isExported: boolean;
};

// ─── File ─────────────────────────────────────────────────────────────────────

export type CodeFile = {
  /** Relative path within the repository */
  path: string;
  language: Language;
  /** File size in bytes */
  size: number;
  imports: CodeImport[];
  exports: CodeExport[];
  functions: CodeFunction[];
  classes: CodeClass[];
  /** Whether this file was successfully parsed */
  parsed: boolean;
  /** Error message if parsing failed */
  parseError?: string;
};

// ─── Dependencies ─────────────────────────────────────────────────────────────

export type DependencyKind = "production" | "development" | "peer" | "optional";

export type PackageDependency = {
  name: string;
  version: string;
  kind: DependencyKind;
  /** Which manifest file it came from */
  source: string;
};

// ─── Analysis Metadata ────────────────────────────────────────────────────────

export type AnalysisMetadata = {
  analyzedAt: string;
  totalFiles: number;
  analyzedFiles: number;
  skippedFiles: number;
  parseFailures: { path: string; reason: string }[];
  languages: Record<string, number>;
};

// ─── Repository Analysis ──────────────────────────────────────────────────────

export type RepositoryAnalysis = {
  codeFiles: CodeFile[];
  dependencies: PackageDependency[];
  metadata: AnalysisMetadata;
};
