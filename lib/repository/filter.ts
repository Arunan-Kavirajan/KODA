/**
 * File and directory filtering for repository ingestion.
 * Keeps vendor/build/generated content out of future agent analysis.
 */

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  "vendor",
  ".turbo",
  ".cache",
  "__pycache__",
  ".venv",
  "venv",
  "target",
  ".idea",
  ".vscode",
]);

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".svg",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".otf",
  ".mp3",
  ".mp4",
  ".wav",
  ".avi",
  ".mov",
  ".zip",
  ".tar",
  ".gz",
  ".7z",
  ".rar",
  ".pdf",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".dat",
  ".lock",
  ".wasm",
]);

export function shouldIgnoreDirectory(name: string): boolean {
  return IGNORED_DIRECTORIES.has(name.toLowerCase());
}

export function shouldIgnorePath(path: string): boolean {
  const segments = path.split("/").filter(Boolean);
  return segments.some((segment) => shouldIgnoreDirectory(segment));
}

export function shouldIgnoreFile(name: string): boolean {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex === -1) return false;
  const ext = name.slice(dotIndex).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

export function getIgnoredDirectoryNames(): string[] {
  return Array.from(IGNORED_DIRECTORIES).sort();
}
