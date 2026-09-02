/**
 * Deterministic codebase graph builder.
 *
 * Input:  RepositorySnapshot (with codeFiles and dependencies populated)
 * Output: CodebaseGraph (nodes + edges, no visualization details)
 *
 * Current graph includes:
 *   Nodes: repository, directories, files, external dependencies
 *   Edges: contains (repo→dir, dir→dir, dir→file), imports (file→file),
 *          depends_on (file→external-dep)
 *
 * We deliberately exclude individual functions/classes from the graph
 * to keep it readable. Future phases will add that depth.
 */

import type { CodebaseGraph, GraphNode, GraphEdge } from "@/types/graph";
import type { RepositorySnapshot } from "@/types/repository";
import type { CodeFile } from "@/types/code";

let _edgeCounter = 0;
function edgeId(prefix: string): string {
  return `${prefix}_${++_edgeCounter}`;
}

export function buildCodebaseGraph(snapshot: RepositorySnapshot): CodebaseGraph {
  _edgeCounter = 0;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const repoId = `repo:${snapshot.metadata.fullName}`;

  // ── Repository root node ──────────────────────────────────────────────────
  nodes.push({
    id: repoId,
    type: "repository",
    label: snapshot.metadata.name,
    metadata: {
      fullName: snapshot.metadata.fullName,
      description: snapshot.metadata.description,
      defaultBranch: snapshot.metadata.defaultBranch,
      url: snapshot.metadata.url,
    },
  });

  // ── Directory nodes ───────────────────────────────────────────────────────
  const directoryEntries = snapshot.entries.filter((e) => e.type === "directory");
  for (const dir of directoryEntries) {
    const nodeId = `dir:${dir.path}`;
    const childCount = snapshot.entries.filter(
      (e) => e.parentPath === dir.path
    ).length;
    const fileCount = snapshot.entries.filter(
      (e) => e.type === "file" && e.parentPath === dir.path
    ).length;

    nodes.push({
      id: nodeId,
      type: "directory",
      label: dir.name,
      metadata: {
        path: dir.path,
        depth: dir.depth,
        childCount,
        fileCount,
      },
    });

    // Edge: parent contains this directory
    const parentId = dir.parentPath ? `dir:${dir.parentPath}` : repoId;
    edges.push({
      id: edgeId("e"),
      source: parentId,
      target: nodeId,
      type: "contains",
    });
  }

  // ── File nodes ────────────────────────────────────────────────────────────
  const fileEntries = snapshot.entries.filter((e) => e.type === "file");
  const codeFileMap = new Map<string, CodeFile>();
  for (const cf of snapshot.codeFiles ?? []) {
    codeFileMap.set(cf.path, cf);
  }

  for (const file of fileEntries) {
    const nodeId = `file:${file.path}`;
    const codeFile = codeFileMap.get(file.path);

    nodes.push({
      id: nodeId,
      type: "file",
      label: file.name,
      metadata: {
        path: file.path,
        language: file.language ?? codeFile?.language ?? "unknown",
        size: file.size ?? 0,
        depth: file.depth,
        importCount: codeFile?.imports.length ?? 0,
        exportCount: codeFile?.exports.length ?? 0,
        functionCount: codeFile?.functions.length ?? 0,
        classCount: codeFile?.classes.length ?? 0,
      },
    });

    // Edge: parent contains this file
    const parentId = file.parentPath ? `dir:${file.parentPath}` : repoId;
    edges.push({
      id: edgeId("e"),
      source: parentId,
      target: nodeId,
      type: "contains",
    });

    // Edges: file imports internal files
    if (codeFile) {
      for (const imp of codeFile.imports) {
        if (imp.isInternal && imp.resolvedPath) {
          const targetId = `file:${imp.resolvedPath}`;
          // Only add if target exists in our node set
          if (fileEntries.some((f) => f.path === imp.resolvedPath)) {
            edges.push({
              id: edgeId("e"),
              source: nodeId,
              target: targetId,
              type: "imports",
              metadata: { importSource: imp.source },
            });
          }
        }
      }
    }
  }

  // ── External dependency nodes ─────────────────────────────────────────────
  if (snapshot.dependencies) {
    // Deduplicate by name
    const depMap = new Map<string, { version: string; usedBy: string[] }>();

    for (const dep of snapshot.dependencies) {
      if (!depMap.has(dep.name)) {
        depMap.set(dep.name, { version: dep.version, usedBy: [] });
      }
    }

    // Find which files import each external package
    for (const codeFile of snapshot.codeFiles ?? []) {
      for (const imp of codeFile.imports) {
        if (!imp.isInternal) {
          // Match package name (handle scoped packages and sub-paths)
          const pkgName = extractPackageName(imp.source);
          if (depMap.has(pkgName)) {
            const entry = depMap.get(pkgName)!;
            if (!entry.usedBy.includes(codeFile.path)) {
              entry.usedBy.push(codeFile.path);
            }
          }
        }
      }
    }

    for (const [name, { version, usedBy }] of depMap) {
      const depId = `dep:${name}`;
      nodes.push({
        id: depId,
        type: "external_dependency",
        label: name,
        metadata: { name, version, usedBy },
      });

      // Edges: files that depend on this package
      for (const filePath of usedBy) {
        edges.push({
          id: edgeId("e"),
          source: `file:${filePath}`,
          target: depId,
          type: "depends_on",
          metadata: { packageName: name },
        });
      }
    }
  }

  return {
    nodes,
    edges,
    metadata: {
      repositoryName: snapshot.metadata.fullName,
      generatedAt: new Date().toISOString(),
      version: "2.0.0",
    },
  };
}

/**
 * Extract the base package name from an import source.
 * "@scope/package/sub" → "@scope/package"
 * "package/sub" → "package"
 * "package" → "package"
 */
function extractPackageName(source: string): string {
  if (source.startsWith("@")) {
    const parts = source.split("/");
    return parts.slice(0, 2).join("/");
  }
  return source.split("/")[0] ?? source;
}
