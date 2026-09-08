"use client";

import { useCallback, useState } from "react";
import type { RepositoryTreeNode } from "@/types/repository";

type FileExplorerProps = {
  tree: RepositoryTreeNode[];
  selectedPath?: string;
  onSelect?: (path: string) => void;
};

export function FileExplorer({ tree, selectedPath, onSelect }: FileExplorerProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Explorer
        </span>
      </div>
      <div
        className="flex-1 overflow-y-auto py-1"
        role="tree"
        aria-label="Repository file tree"
      >
        {tree.map((node) => (
          <TreeNode
            key={node.entry.path}
            node={node}
            depth={0}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function TreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: RepositoryTreeNode;
  depth: number;
  selectedPath?: string;
  onSelect?: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isDir = node.entry.type === "directory";
  const isSelected = selectedPath === node.entry.path;
  const hasChildren = node.children.length > 0;

  const toggle = useCallback(() => {
    if (isDir) setExpanded((prev) => !prev);
    onSelect?.(node.entry.path);
  }, [isDir, node.entry.path, onSelect]);

  return (
    <div role="treeitem" aria-expanded={isDir ? expanded : undefined} aria-selected={isSelected}>
      <button
        type="button"
        onClick={toggle}
        className={`flex w-full items-center gap-1 px-2 py-0.5 text-left font-mono text-[11px] transition-colors hover:bg-surface-raised ${
          isSelected ? "bg-accent-muted text-accent" : "text-muted-foreground"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isDir && (
          <span className="w-3 shrink-0 text-[10px] text-muted-foreground/50">
            {hasChildren ? (expanded ? "▾" : "▸") : " "}
          </span>
        )}
        {!isDir && <span className="w-3 shrink-0" />}
        <span
          className={`truncate ${isDir ? "text-graph-dir" : "text-foreground/80"}`}
        >
          {node.entry.name}
          {!isDir && node.entry.extension && (
            <span className="text-muted-foreground/40">{node.entry.extension}</span>
          )}
        </span>
      </button>

      {isDir && expanded && hasChildren && (
        <div role="group">
          {node.children.map((child) => (
            <TreeNode
              key={child.entry.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
