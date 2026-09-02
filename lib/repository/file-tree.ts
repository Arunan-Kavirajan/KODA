import type {
  RepositoryFileEntry,
  RepositoryStats,
  RepositoryTreeNode,
} from "@/types/repository";
import type { TarEntry } from "@/lib/github/fetch-repo";
import { shouldIgnoreFile, shouldIgnorePath } from "./filter";

const LANGUAGE_MAP: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  py: "Python",
  rs: "Rust",
  go: "Go",
  java: "Java",
  rb: "Ruby",
  php: "PHP",
  cs: "C#",
  cpp: "C++",
  c: "C",
  swift: "Swift",
  kt: "Kotlin",
  md: "Markdown",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  css: "CSS",
  scss: "SCSS",
  html: "HTML",
  sql: "SQL",
  sh: "Shell",
};

export function buildFileTreeFromTarEntries(
  entries: TarEntry[]
): { entries: RepositoryFileEntry[]; tree: RepositoryTreeNode[]; stats: RepositoryStats } {
  const directorySet = new Set<string>();
  const fileEntries: RepositoryFileEntry[] = [];
  let ignoredCount = 0;

  for (const entry of entries) {
    if (shouldIgnorePath(entry.path)) {
      ignoredCount++;
      continue;
    }

    const segments = entry.path.split("/").filter(Boolean);
    const name = segments[segments.length - 1] ?? entry.path;
    const depth = segments.length - 1;
    const parentPath =
      segments.length > 1 ? segments.slice(0, -1).join("/") : undefined;

    if (entry.type === "file" && shouldIgnoreFile(name)) {
      ignoredCount++;
      continue;
    }

    const extension =
      entry.type === "file" && name.includes(".")
        ? name.slice(name.lastIndexOf(".")).toLowerCase()
        : undefined;

    const repoEntry: RepositoryFileEntry = {
      path: entry.path,
      name,
      type: entry.type,
      extension,
      size: entry.size,
      depth,
      parentPath,
      language: extension ? inferLanguage(name) : undefined,
    };

    fileEntries.push(repoEntry);

    if (entry.type === "directory") {
      directorySet.add(entry.path);
    }

    // Ensure parent directories exist in the tree
    if (parentPath) {
      const parentSegments = parentPath.split("/");
      for (let i = 1; i <= parentSegments.length; i++) {
        const dirPath = parentSegments.slice(0, i).join("/");
        if (!directorySet.has(dirPath) && !shouldIgnorePath(dirPath)) {
          directorySet.add(dirPath);
          const dirSegments = dirPath.split("/");
          fileEntries.push({
            path: dirPath,
            name: dirSegments[dirSegments.length - 1],
            type: "directory",
            depth: dirSegments.length - 1,
            parentPath:
              dirSegments.length > 1
                ? dirSegments.slice(0, -1).join("/")
                : undefined,
          });
        }
      }
    }
  }

  const uniqueEntries = deduplicateEntries(fileEntries);
  const tree = buildNestedTree(uniqueEntries);
  const stats = computeStats(entries, uniqueEntries, ignoredCount);

  return { entries: uniqueEntries, tree, stats };
}

function deduplicateEntries(entries: RepositoryFileEntry[]): RepositoryFileEntry[] {
  const map = new Map<string, RepositoryFileEntry>();
  for (const entry of entries) {
    map.set(entry.path, entry);
  }
  return Array.from(map.values()).sort((a, b) => a.path.localeCompare(b.path));
}

function buildNestedTree(entries: RepositoryFileEntry[]): RepositoryTreeNode[] {
  const nodeMap = new Map<string, RepositoryTreeNode>();
  const roots: RepositoryTreeNode[] = [];

  for (const entry of entries) {
    nodeMap.set(entry.path, { entry, children: [] });
  }

  for (const entry of entries) {
    const node = nodeMap.get(entry.path)!;
    if (entry.parentPath && nodeMap.has(entry.parentPath)) {
      nodeMap.get(entry.parentPath)!.children.push(node);
    } else if (!entry.parentPath) {
      roots.push(node);
    }
  }

  sortTreeNodes(roots);
  return roots;
}

function sortTreeNodes(nodes: RepositoryTreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.entry.type !== b.entry.type) {
      return a.entry.type === "directory" ? -1 : 1;
    }
    return a.entry.name.localeCompare(b.entry.name);
  });
  for (const node of nodes) {
    sortTreeNodes(node.children);
  }
}

function computeStats(
  rawEntries: TarEntry[],
  filteredEntries: RepositoryFileEntry[],
  ignoredCount: number
): RepositoryStats {
  const totalFiles = rawEntries.filter((e) => e.type === "file").length;
  const totalDirectories = rawEntries.filter((e) => e.type === "directory").length;
  const filteredFiles = filteredEntries.filter((e) => e.type === "file").length;
  const filteredDirectories = filteredEntries.filter((e) => e.type === "directory").length;

  return {
    totalFiles,
    totalDirectories,
    filteredFiles,
    filteredDirectories,
    ignoredCount,
  };
}

function inferLanguage(filename: string): string | undefined {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) return undefined;
  const ext = filename.slice(dotIndex + 1).toLowerCase();
  return LANGUAGE_MAP[ext];
}

export function getTopLevelModules(tree: RepositoryTreeNode[]): string[] {
  return tree
    .filter((node) => node.entry.type === "directory")
    .map((node) => node.entry.name)
    .slice(0, 8);
}
