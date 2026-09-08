/**
 * Function and class symbol detection for JS/TS/Python.
 *
 * Strategy: conservative line-by-line regex.
 * We only detect obvious, unambiguous patterns.
 * False positives (detecting something that isn't a function) are worse than
 * missing an obscure declaration.
 */

import type { CodeFunction, CodeClass, Language } from "@/types/code";

// ─── JS/TS Patterns ───────────────────────────────────────────────────────────

// function foo(...)
// async function foo(...)
// export function foo(...)
// export async function foo(...)
// export default function foo(...)
const JS_FUNCTION_RE =
  /^\s*(export\s+)?(default\s+)?(async\s+)?function\s*\*?\s*([\w$]+)\s*\(([^)]*)\)/;

// const foo = (...) => ...
// const foo = async (...) => ...
// export const foo = (...) => ...
const JS_ARROW_RE =
  /^\s*(export\s+)?(const|let|var)\s+([\w$]+)\s*=\s*(async\s+)?\(([^)]*)\)\s*(?::\s*[^=]+)?\s*=>/;

// const foo = function(...)
// export const foo = function(...)
const JS_FUNC_EXPR_RE =
  /^\s*(export\s+)?(const|let|var)\s+([\w$]+)\s*=\s*(async\s+)?function\s*\*?\s*\(/;

// class Foo
// export class Foo
// export default class Foo
// abstract class Foo (TS)
const JS_CLASS_RE =
  /^\s*(export\s+)?(default\s+)?(abstract\s+)?class\s+([\w$]+)/;

// method inside a class: foo(...) { or async foo(...) {
// (but not constructor - we include it)
const JS_METHOD_RE =
  /^\s+(?:(?:public|private|protected|static|abstract|async|override|readonly)\s+)*(?:(?:get|set)\s+)?([\w$]+)\s*\(([^)]*)\)\s*(?::\s*[^{]*)?(?:\{|$)/;

// ─── Python Patterns ──────────────────────────────────────────────────────────

// def foo(...)
// async def foo(...)
const PY_FUNCTION_RE = /^\s*(async\s+)?def\s+([\w]+)\s*\(([^)]*)\)/;

// class Foo:
// class Foo(Base):
const PY_CLASS_RE = /^\s*class\s+([\w]+)\s*(?:\([^)]*\))?\s*:/;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseParameters(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((p) => {
      // Remove type annotations and defaults
      const name = p.trim().split(/[:=]/)[0]?.trim() ?? "";
      // Remove destructuring, rest params, etc. — just keep identifier-like names
      return name.replace(/^\.\.\./, "").replace(/^\{.*\}$/, "").replace(/^\[.*\]$/, "").trim();
    })
    .filter((p) => /^[\w$]+$/.test(p));
}

// ─── JS/TS Extractor ──────────────────────────────────────────────────────────

export function extractJsFunctions(source: string): CodeFunction[] {
  const functions: CodeFunction[] = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNum = i + 1;

    // Skip comments
    const stripped = line.trim();
    if (stripped.startsWith("//") || stripped.startsWith("*") || stripped.startsWith("/*")) {
      continue;
    }

    // function declaration
    const funcMatch = JS_FUNCTION_RE.exec(line);
    if (funcMatch) {
      const isExported = !!funcMatch[1]?.trim();
      const isAsync = !!funcMatch[3]?.trim();
      const name = funcMatch[4] ?? "";
      const params = funcMatch[5] ?? "";
      if (name) {
        functions.push({
          name,
          parameters: parseParameters(params),
          line: lineNum,
          isExported,
          isAsync,
        });
      }
      continue;
    }

    // Arrow function: const foo = (...) =>
    const arrowMatch = JS_ARROW_RE.exec(line);
    if (arrowMatch) {
      const isExported = !!arrowMatch[1]?.trim();
      const isAsync = !!arrowMatch[4]?.trim();
      const name = arrowMatch[3] ?? "";
      const params = arrowMatch[5] ?? "";
      if (name) {
        functions.push({
          name,
          parameters: parseParameters(params),
          line: lineNum,
          isExported,
          isAsync,
        });
      }
      continue;
    }

    // Function expression: const foo = function(...)
    const funcExprMatch = JS_FUNC_EXPR_RE.exec(line);
    if (funcExprMatch) {
      const isExported = !!funcExprMatch[1]?.trim();
      const isAsync = !!funcExprMatch[4]?.trim();
      const name = funcExprMatch[3] ?? "";
      if (name) {
        functions.push({
          name,
          parameters: [],
          line: lineNum,
          isExported,
          isAsync,
        });
      }
    }
  }

  return functions;
}

export function extractJsClasses(source: string): CodeClass[] {
  const classes: CodeClass[] = [];
  const lines = source.split("\n");
  let inClass = false;
  let currentClass: CodeClass | null = null;
  let braceDepth = 0;
  let classStartDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNum = i + 1;
    const stripped = line.trim();

    if (stripped.startsWith("//") || stripped.startsWith("*")) continue;

    // Count braces for class body tracking
    const openBraces = (line.match(/\{/g) ?? []).length;
    const closeBraces = (line.match(/\}/g) ?? []).length;

    if (!inClass) {
      const classMatch = JS_CLASS_RE.exec(line);
      if (classMatch) {
        const isExported = !!classMatch[1]?.trim();
        const name = classMatch[4] ?? "";
        if (name) {
          currentClass = {
            name,
            methods: [],
            line: lineNum,
            isExported,
          };
          inClass = true;
          classStartDepth = braceDepth;
        }
      }
    } else if (currentClass) {
      // Look for methods inside the class
      // Method must be indented (inside class body)
      if (braceDepth > classStartDepth) {
        const methodMatch = JS_METHOD_RE.exec(line);
        if (
          methodMatch &&
          !stripped.startsWith("//") &&
          !JS_CLASS_RE.test(line) // not a nested class declaration
        ) {
          const methodName = methodMatch[1] ?? "";
          // Exclude obvious non-method lines
          if (
            methodName &&
            methodName !== "if" &&
            methodName !== "else" &&
            methodName !== "for" &&
            methodName !== "while" &&
            methodName !== "switch" &&
            methodName !== "catch"
          ) {
            if (!currentClass.methods.includes(methodName)) {
              currentClass.methods.push(methodName);
            }
          }
        }
      }
    }

    braceDepth += openBraces - closeBraces;

    // Class body ended
    if (inClass && currentClass && braceDepth <= classStartDepth) {
      classes.push(currentClass);
      currentClass = null;
      inClass = false;
    }
  }

  // Handle class that extends to end of file
  if (inClass && currentClass) {
    classes.push(currentClass);
  }

  return classes;
}

// ─── Python Extractor ─────────────────────────────────────────────────────────

export function extractPyFunctions(source: string): CodeFunction[] {
  const functions: CodeFunction[] = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const stripped = line.trim();
    if (stripped.startsWith("#")) continue;

    const funcMatch = PY_FUNCTION_RE.exec(line);
    if (funcMatch) {
      const isAsync = !!funcMatch[1]?.trim();
      const name = funcMatch[2] ?? "";
      const params = funcMatch[3] ?? "";

      // indent 0 = top level, indent 4 = class method
      // We include both but we'll separate via classes extraction
      functions.push({
        name,
        parameters: parseParameters(params.replace("self,", "").replace("cls,", "").trim()),
        line: i + 1,
        isExported: !name.startsWith("_"),
        isAsync,
      });
    }
  }

  return functions;
}

export function extractPyClasses(source: string): CodeClass[] {
  const classes: CodeClass[] = [];
  const lines = source.split("\n");
  let inClass = false;
  let currentClass: CodeClass | null = null;
  let classIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const stripped = line.trim();
    if (stripped.startsWith("#") || stripped === "") continue;

    const indent = line.length - line.trimStart().length;

    if (!inClass) {
      const classMatch = PY_CLASS_RE.exec(line);
      if (classMatch && indent === 0) {
        const name = classMatch[1] ?? "";
        if (name) {
          currentClass = {
            name,
            methods: [],
            line: i + 1,
            isExported: !name.startsWith("_"),
          };
          inClass = true;
          classIndent = indent;
        }
      }
    } else if (currentClass) {
      // End of class: non-empty line at same or lower indent
      if (indent <= classIndent && stripped !== "" && !stripped.startsWith("#")) {
        // Check if it's not a decorator or continuation
        if (!stripped.startsWith("@")) {
          classes.push(currentClass);
          currentClass = null;
          inClass = false;

          // Also check if this line starts a new class
          const classMatch = PY_CLASS_RE.exec(line);
          if (classMatch && indent === 0) {
            const name = classMatch[1] ?? "";
            if (name) {
              currentClass = {
                name,
                methods: [],
                line: i + 1,
                isExported: !name.startsWith("_"),
              };
              inClass = true;
              classIndent = indent;
            }
          }
          continue;
        }
      }

      // Method inside class
      const methodMatch = PY_FUNCTION_RE.exec(line);
      if (methodMatch && indent > classIndent) {
        const methodName = methodMatch[2] ?? "";
        if (methodName && !currentClass.methods.includes(methodName)) {
          currentClass.methods.push(methodName);
        }
      }
    }
  }

  if (inClass && currentClass) {
    classes.push(currentClass);
  }

  return classes;
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export function extractFunctions(source: string, language: Language): CodeFunction[] {
  switch (language) {
    case "TypeScript":
    case "TSX":
    case "JavaScript":
    case "JSX":
      return extractJsFunctions(source);
    case "Python":
      return extractPyFunctions(source);
    default:
      return [];
  }
}

export function extractClasses(source: string, language: Language): CodeClass[] {
  switch (language) {
    case "TypeScript":
    case "TSX":
    case "JavaScript":
    case "JSX":
      return extractJsClasses(source);
    case "Python":
      return extractPyClasses(source);
    default:
      return [];
  }
}
