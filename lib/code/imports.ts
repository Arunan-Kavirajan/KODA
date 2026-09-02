/**
 * Import and export extraction for JavaScript, TypeScript, JSX, TSX, and Python.
 *
 * Strategy: conservative regex patterns rather than a full AST parser.
 * We deliberately miss some edge cases to avoid false positives.
 * False positives (wrong data) are worse than false negatives (missing data).
 */

import type { CodeImport, CodeExport, Language } from "@/types/code";

// ─── JS/TS Import Patterns ────────────────────────────────────────────────────

// import defaultExport from "module"
// import defaultExport, { named } from "module"
// import { named1, named2 } from "module"
// import * as namespace from "module"
// import "module" (side-effect)
const JS_IMPORT_RE =
  /^\s*import\s+(?:([\w$]+)(?:\s*,\s*)?)?(?:\{([^}]*)\})?(?:\s*\*\s+as\s+([\w$]+))?\s*(?:from\s+)?['"]([^'"]+)['"]/;

// const x = require("module")
// require("module")
const JS_REQUIRE_RE = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/;

// export default ...
const JS_EXPORT_DEFAULT_RE = /^\s*export\s+default\b/;

// export { name1, name2 }
// export { name as alias }
const JS_EXPORT_NAMED_BRACE_RE = /^\s*export\s+\{([^}]+)\}/;

// export const/function/class/type/interface name
const JS_EXPORT_DECLARATION_RE =
  /^\s*export\s+(?:async\s+)?(?:const|let|var|function\*?|class|type|interface|enum|abstract\s+class)\s+([\w$]+)/;

// export * from "module"
// export * as name from "module"
const JS_EXPORT_STAR_RE = /^\s*export\s+\*(?:\s+as\s+([\w$]+))?\s+from\s+['"]([^'"]+)['"]/;

// export { x } from "module"  (re-export)
const JS_REEXPORT_RE = /^\s*export\s+\{[^}]*\}\s+from\s+['"]([^'"]+)['"]/;

// module.exports = { ... }  or  module.exports.x = ...
const CJS_EXPORTS_RE = /^\s*module\.exports\s*=/;

// ─── Python Import Patterns ───────────────────────────────────────────────────

// import x
// import x.y.z
// import x as y
const PY_IMPORT_RE = /^\s*import\s+([\w.]+)(?:\s+as\s+[\w]+)?/;

// from x import y, z
// from x.y import z
// from x import *
const PY_FROM_IMPORT_RE =
  /^\s*from\s+([\w.]+)\s+import\s+((?:[\w$*]+(?:\s+as\s+[\w]+)?(?:\s*,\s*)?)+)/;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isInternal(source: string): boolean {
  return source.startsWith("./") || source.startsWith("../") || source.startsWith("/");
}

function parseNamedImports(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => {
      // Handle "name as alias" — we keep the original name
      const parts = s.trim().split(/\s+as\s+/);
      return (parts[0] ?? "").trim();
    })
    .filter(Boolean);
}

// ─── JS/TS/JSX/TSX Extractor ─────────────────────────────────────────────────

export function extractJsImports(source: string): CodeImport[] {
  const imports: CodeImport[] = [];
  const lines = source.split("\n");

  for (const line of lines) {
    const stripped = line.trim();
    // Skip comments
    if (stripped.startsWith("//") || stripped.startsWith("*") || stripped.startsWith("/*")) {
      continue;
    }

    // Static import statement
    const importMatch = JS_IMPORT_RE.exec(line);
    if (importMatch) {
      const defaultImport = importMatch[1] ?? undefined;
      const namedRaw = importMatch[2] ?? "";
      const namespaceImport = importMatch[3] ?? undefined;
      const src = importMatch[4] ?? "";

      const names = namedRaw ? parseNamedImports(namedRaw) : [];

      imports.push({
        source: src,
        names,
        defaultImport,
        namespaceImport,
        isInternal: isInternal(src),
        kind: namespaceImport ? "namespace" : defaultImport && names.length === 0 ? "default" : names.length > 0 ? "named" : "side-effect",
      });
      continue;
    }

    // require()
    const requireMatch = JS_REQUIRE_RE.exec(line);
    if (requireMatch) {
      const src = requireMatch[1] ?? "";
      imports.push({
        source: src,
        names: [],
        isInternal: isInternal(src),
        kind: "require",
      });
    }
  }

  return imports;
}

export function extractJsExports(source: string): CodeExport[] {
  const exports: CodeExport[] = [];
  const lines = source.split("\n");

  for (const line of lines) {
    const stripped = line.trim();
    if (stripped.startsWith("//") || stripped.startsWith("*")) continue;

    // export * from "module"
    const starMatch = JS_EXPORT_STAR_RE.exec(line);
    if (starMatch) {
      const alias = starMatch[1];
      const src = starMatch[2] ?? "";
      exports.push({
        name: alias ?? "*",
        kind: "namespace",
        source: src,
      });
      continue;
    }

    // export { x } from "module"
    if (JS_REEXPORT_RE.test(line)) {
      const braceMatch = JS_EXPORT_NAMED_BRACE_RE.exec(line);
      const fromMatch = /from\s+['"]([^'"]+)['"]/.exec(line);
      if (braceMatch) {
        const names = parseNamedImports(braceMatch[1] ?? "");
        for (const name of names) {
          exports.push({ name, kind: "re-export", source: fromMatch?.[1] });
        }
      }
      continue;
    }

    // export { name1, name2 }
    const braceExportMatch = JS_EXPORT_NAMED_BRACE_RE.exec(line);
    if (braceExportMatch) {
      const names = parseNamedImports(braceExportMatch[1] ?? "");
      for (const name of names) {
        exports.push({ name, kind: "named" });
      }
      continue;
    }

    // export default
    if (JS_EXPORT_DEFAULT_RE.test(line)) {
      exports.push({ name: "default", kind: "default" });
      continue;
    }

    // export const/function/class/etc name
    const declMatch = JS_EXPORT_DECLARATION_RE.exec(line);
    if (declMatch) {
      exports.push({ name: declMatch[1] ?? "", kind: "named" });
      continue;
    }

    // module.exports
    if (CJS_EXPORTS_RE.test(line)) {
      exports.push({ name: "module.exports", kind: "default" });
    }
  }

  return exports;
}

// ─── Python Extractor ─────────────────────────────────────────────────────────

export function extractPyImports(source: string): CodeImport[] {
  const imports: CodeImport[] = [];
  const lines = source.split("\n");

  for (const line of lines) {
    const stripped = line.trim();
    if (stripped.startsWith("#")) continue;

    // from x import y, z
    const fromMatch = PY_FROM_IMPORT_RE.exec(line);
    if (fromMatch) {
      const src = fromMatch[1] ?? "";
      const namesRaw = fromMatch[2] ?? "";
      const names = namesRaw
        .split(",")
        .map((s) => s.trim().split(/\s+as\s+/)[0]?.trim() ?? "")
        .filter(Boolean);

      imports.push({
        source: src,
        names,
        isInternal: false, // Python relative resolution is complex; mark as external
        kind: "named",
      });
      continue;
    }

    // import x
    const importMatch = PY_IMPORT_RE.exec(line);
    if (importMatch) {
      const src = importMatch[1] ?? "";
      imports.push({
        source: src,
        names: [],
        isInternal: false,
        kind: "default",
      });
    }
  }

  return imports;
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export function extractImports(source: string, language: Language): CodeImport[] {
  switch (language) {
    case "TypeScript":
    case "TSX":
    case "JavaScript":
    case "JSX":
      return extractJsImports(source);
    case "Python":
      return extractPyImports(source);
    default:
      return [];
  }
}

export function extractExports(source: string, language: Language): CodeExport[] {
  switch (language) {
    case "TypeScript":
    case "TSX":
    case "JavaScript":
    case "JSX":
      return extractJsExports(source);
    default:
      return [];
  }
}
