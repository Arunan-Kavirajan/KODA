"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CodebaseGraph } from "@/types/graph";
import type { RepositorySnapshot } from "@/types/repository";
import { FileExplorer } from "./explorer";
import { MapPanel } from "./map-panel";
import { StatusBar } from "./status-bar";
import { Inspector } from "./inspector";

// Loading messages go through stages of the pipeline
const LOADING_MESSAGES = [
  "Fetching repository...",
  "Extracting archive...",
  "Walking the file tree...",
  "Following the directory structure...",
  "Filtering build artifacts...",
  "Analyzing imports...",
  "Extracting symbols...",
  "Building dependency graph...",
  "Mapping relationships...",
];

type AnalyzeApiResponse = {
  status: string;
  message: string;
  snapshot?: RepositorySnapshot;
  graph?: CodebaseGraph;
  error?: string;
};

type WorkspaceProps = {
  repositoryUrl: string;
};

export function Workspace({ repositoryUrl }: WorkspaceProps) {
  const [snapshot, setSnapshot] = useState<RepositorySnapshot | null>(null);
  const [graph, setGraph] = useState<CodebaseGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [selectedPath, setSelectedPath] = useState<string | undefined>();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [explorerOpen, setExplorerOpen] = useState(true);

  useEffect(() => {
    let messageIndex = 0;
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[messageIndex] ?? LOADING_MESSAGES[0]);
    }, 2200);

    async function analyze() {
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repositoryUrl, source: "github" }),
        });

        const data: AnalyzeApiResponse = await response.json();

        if (!response.ok || data.status === "failed") {
          setError(data.error ?? data.message ?? "Analysis failed.");
          setLoading(false);
          return;
        }

        if (data.snapshot) {
          setSnapshot(data.snapshot);
        }
        if (data.graph) {
          setGraph(data.graph);
        }
        setLoading(false);
      } catch {
        setError("Could not reach the analysis server.");
        setLoading(false);
      } finally {
        clearInterval(interval);
      }
    }

    analyze();
    return () => clearInterval(interval);
  }, [repositoryUrl]);

  // Sync file explorer selection with graph node
  const handleNodeSelect = (nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId?.startsWith("file:")) {
      setSelectedPath(nodeId.slice(5));
    } else if (nodeId?.startsWith("dir:")) {
      setSelectedPath(nodeId.slice(4));
    } else {
      setSelectedPath(undefined);
    }
  };

  const handleExplorerSelect = (path: string) => {
    setSelectedPath(path);
    // Find and select the corresponding graph node
    const fileNodeId = `file:${path}`;
    const dirNodeId = `dir:${path}`;
    const match = graph?.nodes.find(
      (n) => n.id === fileNodeId || n.id === dirNodeId
    );
    setSelectedNodeId(match?.id ?? null);
  };

  const isAnalyzed = !!(snapshot?.codeFiles && snapshot.codeFiles.length > 0);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3 sm:px-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="font-mono text-sm text-foreground hover:text-accent"
          >
            KODA
          </Link>
          {snapshot && (
            <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
              {snapshot.metadata.fullName}
            </span>
          )}
          {loading && (
            <span className="font-mono text-xs text-muted-foreground">
              analyzing...
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {loading && (
            <span className="font-mono text-[10px] text-accent">
              ● ANALYZING
            </span>
          )}
          {snapshot && !loading && isAnalyzed && (
            <span className="font-mono text-[10px] text-graph-dir">
              ● ANALYZED
            </span>
          )}
          {snapshot && !loading && !isAnalyzed && (
            <span className="font-mono text-[10px] text-graph-file">
              ● INGESTED
            </span>
          )}
          {error && (
            <span className="font-mono text-[10px] text-destructive">
              ● ERROR
            </span>
          )}
          <button
            type="button"
            onClick={() => setExplorerOpen((prev) => !prev)}
            className="font-mono text-[10px] text-muted-foreground hover:text-foreground lg:hidden"
            aria-label={explorerOpen ? "Hide explorer" : "Show explorer"}
          >
            {explorerOpen ? "Hide" : "Explorer"}
          </button>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      {error && !snapshot ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="font-mono text-sm text-destructive">{error}</p>
          <Link
            href="/"
            className="font-mono text-xs text-accent hover:underline"
          >
            ← Try another repository
          </Link>
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1">
            {/* ── LEFT: File Explorer ──────────────────────────────────────── */}
            {snapshot && (
              <aside
                className={`${
                  explorerOpen ? "flex" : "hidden"
                } w-full shrink-0 flex-col border-r border-border bg-surface lg:flex lg:w-64 xl:w-72`}
              >
                <FileExplorer
                  tree={snapshot.tree}
                  selectedPath={selectedPath}
                  onSelect={handleExplorerSelect}
                />
              </aside>
            )}

            {/* ── CENTER: Codebase Map ─────────────────────────────────────── */}
            <main className="flex min-w-0 flex-1 flex-col">
              {loading && !snapshot && (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
                  <div className="h-px w-16 bg-border-strong" />
                  <p className="font-mono text-xs text-muted-foreground animate-fade-up">
                    {loadingMessage}
                  </p>
                </div>
              )}

              {snapshot && (
                <MapPanel
                  snapshot={snapshot}
                  selectedPath={selectedPath}
                  onNodeSelect={handleNodeSelect}
                  selectedNodeId={selectedNodeId}
                  graph={graph ?? undefined}
                />
              )}
            </main>

            {/* ── RIGHT: Inspector ─────────────────────────────────────────── */}
            {snapshot && (
              <aside className="hidden w-60 shrink-0 flex-col border-l border-border bg-surface xl:flex">
                <Inspector
                  snapshot={snapshot}
                  graph={graph ?? undefined}
                  selectedNodeId={selectedNodeId}
                />
              </aside>
            )}
          </div>

          {/* ── Status Bar ──────────────────────────────────────────────────── */}
          {snapshot && (
            <StatusBar
              snapshot={snapshot}
              status="ready"
              isAnalyzed={isAnalyzed}
            />
          )}
          {loading && !snapshot && (
            <StatusBar
              snapshot={{
                metadata: {
                  owner: "",
                  name: "",
                  fullName: "",
                  url: "",
                  defaultBranch: "",
                },
                entries: [],
                tree: [],
                stats: {
                  totalFiles: 0,
                  totalDirectories: 0,
                  filteredFiles: 0,
                  filteredDirectories: 0,
                  ignoredCount: 0,
                },
                ingestedAt: "",
              }}
              status="loading"
              message={loadingMessage}
            />
          )}
        </>
      )}
    </div>
  );
}
