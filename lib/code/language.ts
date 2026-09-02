/**
 * Language detection from file extension.
 * Returns a Language type — never throws.
 */

import type { Language } from "@/types/code";

const EXTENSION_MAP: Record<string, Language> = {
  // TypeScript
  ts: "TypeScript",
  // TSX
  tsx: "TSX",
  // JavaScript
  js: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  // JSX
  jsx: "JSX",
  // Python
  py: "Python",
  pyw: "Python",
  // Java
  java: "Java",
  // C
  c: "C",
  h: "C",
  // C++
  cpp: "C++",
  cc: "C++",
  cxx: "C++",
  hpp: "C++",
  hh: "C++",
  // C#
  cs: "C#",
  // Go
  go: "Go",
  // Rust
  rs: "Rust",
  // PHP
  php: "PHP",
  // Ruby
  rb: "Ruby",
  // Swift
  swift: "Swift",
  // Kotlin
  kt: "Kotlin",
  kts: "Kotlin",
  // Dart
  dart: "Dart",
  // HTML
  html: "HTML",
  htm: "HTML",
  // CSS
  css: "CSS",
  // SCSS
  scss: "SCSS",
  sass: "SCSS",
  // JSON
  json: "JSON",
  // YAML
  yaml: "YAML",
  yml: "YAML",
  // Markdown
  md: "Markdown",
  mdx: "Markdown",
  // Shell
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  fish: "Shell",
  // TOML
  toml: "TOML",
  // SQL
  sql: "SQL",
};

/** Known text-parseable languages (source code we can analyze). */
const PARSEABLE_LANGUAGES = new Set<Language>([
  "TypeScript",
  "TSX",
  "JavaScript",
  "JSX",
  "Python",
]);

/**
 * Detect the language of a file from its name/extension.
 * Returns "unknown" rather than throwing on unrecognized extensions.
 */
export function detectLanguage(filename: string): Language {
  try {
    const lower = filename.toLowerCase();
    const dotIndex = lower.lastIndexOf(".");
    if (dotIndex === -1) return "unknown";
    const ext = lower.slice(dotIndex + 1);
    return EXTENSION_MAP[ext] ?? "unknown";
  } catch {
    return "unknown";
  }
}

/** Whether we can attempt import/symbol extraction for this language. */
export function isAnalyzableLanguage(language: Language): boolean {
  return PARSEABLE_LANGUAGES.has(language);
}

/** Whether a file extension indicates a text (non-binary) file. */
export function isTextExtension(filename: string): boolean {
  try {
    const lower = filename.toLowerCase();
    const dotIndex = lower.lastIndexOf(".");
    if (dotIndex === -1) return true; // No extension, assume text (like Makefile, Dockerfile)
    const ext = lower.slice(dotIndex + 1);
    return ext in EXTENSION_MAP || TEXT_ONLY_EXTENSIONS.has(ext);
  } catch {
    return false;
  }
}

// Additional text-only extensions not in the language map
const TEXT_ONLY_EXTENSIONS = new Set([
  "txt",
  "lock",
  "env",
  "gitignore",
  "gitattributes",
  "editorconfig",
  "eslintrc",
  "prettierrc",
  "babelrc",
  "xml",
  "plist",
  "ini",
  "cfg",
  "conf",
  "properties",
  "gradle",
  "mod",
  "sum",
]);
