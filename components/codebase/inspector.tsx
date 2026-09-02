"use client";

import type { RepositorySnapshot } from "@/types/repository";
import type { CodebaseGraph } from "@/types/graph";
import type { CodeFile, PackageDependency } from "@/types/code";

type InspectorProps = {
  snapshot: RepositorySnapshot;
  graph?: CodebaseGraph;
  selectedNodeId?: string | null;
};

export function Inspector({ snapshot, graph, selectedNodeId }: InspectorProps) {
  if (!selectedNodeId || !graph) {
    return <RepositoryOverview snapshot={snapshot} />;
  }

  const node = graph.nodes.find((n) => n.id === selectedNodeId);
  if (!node) return <RepositoryOverview snapshot={snapshot} />;

  switch (node.type) {
    case "repository":
      return <RepositoryOverview snapshot={snapshot} />;
    case "directory":
      return <DirectoryInspector node={node} snapshot={snapshot} />;
    case "file":
      return <FileInspector node={node} snapshot={snapshot} />;
    case "external_dependency":
      return <DependencyInspector node={node} />;
    default:
      return <RepositoryOverview snapshot={snapshot} />;
  }
}

// ─── Repository Overview ──────────────────────────────────────────────────────

function RepositoryOverview({ snapshot }: { snapshot: RepositorySnapshot }) {
  const analysis = snapshot.analysisMetadata;
  const langEntries = analysis
    ? Object.entries(analysis.languages).sort(([, a], [, b]) => b - a)
    : [];

  return (
    <div className="flex h-full flex-col">
      <SectionHeader>Repository</SectionHeader>
      <div className="flex-1 overflow-y-auto p-3 space-y-4 font-mono text-[11px]">
        <InfoRow label="name" value={snapshot.metadata.name} />
        <InfoRow label="owner" value={snapshot.metadata.owner} />
        <InfoRow label="branch" value={snapshot.metadata.defaultBranch} />
        <InfoRow label="files" value={String(snapshot.stats.filteredFiles)} />
        <InfoRow label="dirs" value={String(snapshot.stats.filteredDirectories)} />

        {analysis && (
          <>
            <Divider />
            <Label>Code Analysis</Label>
            <InfoRow label="analyzed" value={`${analysis.analyzedFiles} files`} />
            <InfoRow label="skipped" value={`${analysis.skippedFiles} files`} />
            {analysis.parseFailures.length > 0 && (
              <InfoRow
                label="failures"
                value={String(analysis.parseFailures.length)}
                valueColor="text-destructive"
              />
            )}
          </>
        )}

        {langEntries.length > 0 && (
          <>
            <Divider />
            <Label>Languages</Label>
            {langEntries.slice(0, 8).map(([lang, count]) => (
              <InfoRow key={lang} label={lang} value={String(count)} />
            ))}
          </>
        )}

        {snapshot.dependencies && snapshot.dependencies.length > 0 && (
          <>
            <Divider />
            <InfoRow
              label="dependencies"
              value={String(new Set(snapshot.dependencies.map((d) => d.name)).size)}
            />
          </>
        )}

        {snapshot.metadata.description && (
          <>
            <Divider />
            <p className="text-[10px] text-muted-foreground/50">description</p>
            <p className="mt-1 leading-relaxed text-muted-foreground text-[10px]">
              {snapshot.metadata.description}
            </p>
          </>
        )}

        <Divider />
        <a
          href={snapshot.metadata.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline text-[10px]"
        >
          View on GitHub →
        </a>
      </div>
    </div>
  );
}

// ─── Directory Inspector ──────────────────────────────────────────────────────

function DirectoryInspector({
  node,
  snapshot,
}: {
  node: { id: string; label: string; metadata?: Record<string, unknown> };
  snapshot: RepositorySnapshot;
}) {
  const path = node.metadata?.["path"] as string | undefined;
  const fileCount = node.metadata?.["fileCount"] as number | undefined;
  const childCount = node.metadata?.["childCount"] as number | undefined;
  const depth = node.metadata?.["depth"] as number | undefined;

  const subDirCount = path
    ? snapshot.entries.filter(
        (e) => e.type === "directory" && e.parentPath === path
      ).length
    : undefined;

  return (
    <div className="flex h-full flex-col">
      <SectionHeader>Directory</SectionHeader>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-[11px]">
        <p className="text-graph-dir break-all">{node.label}/</p>
        {path && <InfoRow label="path" value={path} />}
        {depth !== undefined && <InfoRow label="depth" value={String(depth)} />}
        <Divider />
        {fileCount !== undefined && <InfoRow label="files" value={String(fileCount)} />}
        {subDirCount !== undefined && <InfoRow label="subdirs" value={String(subDirCount)} />}
        {childCount !== undefined && <InfoRow label="children" value={String(childCount)} />}
      </div>
    </div>
  );
}

// ─── File Inspector ───────────────────────────────────────────────────────────

function FileInspector({
  node,
  snapshot,
}: {
  node: { id: string; label: string; metadata?: Record<string, unknown> };
  snapshot: RepositorySnapshot;
}) {
  const path = node.metadata?.["path"] as string | undefined;
  const language = node.metadata?.["language"] as string | undefined;
  const size = node.metadata?.["size"] as number | undefined;

  const codeFile = path
    ? snapshot.codeFiles?.find((cf) => cf.path === path)
    : undefined;

  const externalImports = codeFile?.imports.filter((i) => !i.isInternal) ?? [];
  const internalImports = codeFile?.imports.filter((i) => i.isInternal) ?? [];

  return (
    <div className="flex h-full flex-col">
      <SectionHeader>File</SectionHeader>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-[11px]">
        <p className="text-foreground/80 break-all">{node.label}</p>

        <div className="space-y-1.5">
          {language && <InfoRow label="language" value={language} />}
          {size !== undefined && (
            <InfoRow label="size" value={formatBytes(size)} />
          )}
          {path && <InfoRow label="path" value={path} small />}
        </div>

        {codeFile ? (
          <>
            {codeFile.exports.length > 0 && (
              <>
                <Divider />
                <Label>Exports ({codeFile.exports.length})</Label>
                <TagList
                  items={codeFile.exports.map((e) =>
                    e.kind === "default" ? "default" : e.name
                  ).slice(0, 8)}
                  color="text-graph-module"
                />
              </>
            )}

            {codeFile.functions.length > 0 && (
              <>
                <Divider />
                <Label>Functions ({codeFile.functions.length})</Label>
                <TagList
                  items={codeFile.functions.map((f) => f.name).slice(0, 10)}
                  color="text-foreground/70"
                />
              </>
            )}

            {codeFile.classes.length > 0 && (
              <>
                <Divider />
                <Label>Classes ({codeFile.classes.length})</Label>
                <TagList
                  items={codeFile.classes.map((c) => c.name)}
                  color="text-graph-module"
                />
              </>
            )}

            {internalImports.length > 0 && (
              <>
                <Divider />
                <Label>Internal imports ({internalImports.length})</Label>
                <TagList
                  items={internalImports.map((i) => i.source).slice(0, 6)}
                  color="text-graph-dir"
                />
              </>
            )}

            {externalImports.length > 0 && (
              <>
                <Divider />
                <Label>External imports ({externalImports.length})</Label>
                <TagList
                  items={externalImports.map((i) => i.source).slice(0, 8)}
                  color="text-graph-dep"
                />
              </>
            )}

            {!codeFile.parsed && (
              <>
                <Divider />
                <p className="text-[10px] text-destructive">
                  ⚠ Parse error: {codeFile.parseError ?? "unknown"}
                </p>
              </>
            )}
          </>
        ) : (
          <p className="text-[10px] text-muted-foreground/50 mt-2">
            No analysis data for this file type.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Dependency Inspector ─────────────────────────────────────────────────────

function DependencyInspector({
  node,
}: {
  node: { id: string; label: string; metadata?: Record<string, unknown> };
}) {
  const name = node.metadata?.["name"] as string | undefined;
  const version = node.metadata?.["version"] as string | undefined;
  const usedBy = node.metadata?.["usedBy"] as string[] | undefined;

  return (
    <div className="flex h-full flex-col">
      <SectionHeader>Package</SectionHeader>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-[11px]">
        <p className="text-graph-dep break-all">{name ?? node.label}</p>
        {version && version !== "*" && (
          <InfoRow label="version" value={version} />
        )}

        {usedBy && usedBy.length > 0 && (
          <>
            <Divider />
            <Label>Used by ({usedBy.length} files)</Label>
            <div className="space-y-0.5">
              {usedBy.slice(0, 10).map((p) => (
                <p
                  key={p}
                  className="text-[10px] text-muted-foreground/70 break-all"
                >
                  {p.split("/").pop() ?? p}
                </p>
              ))}
              {usedBy.length > 10 && (
                <p className="text-[10px] text-muted-foreground/40">
                  +{usedBy.length - 10} more
                </p>
              )}
            </div>
          </>
        )}

        <Divider />
        <a
          href={`https://www.npmjs.com/package/${name}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-accent hover:underline"
        >
          View on npm →
        </a>
      </div>
    </div>
  );
}

// ─── UI Primitives ────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-border px-3 py-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

function InfoRow({
  label,
  value,
  valueColor,
  small,
}: {
  label: string;
  value: string;
  valueColor?: string;
  small?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="shrink-0 text-muted-foreground/50">{label}</span>
      <span
        className={`truncate text-right ${valueColor ?? "text-foreground"} ${small ? "text-[10px]" : ""}`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="border-t border-border" />;
}

function TagList({ items, color }: { items: string[]; color?: string }) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className={`rounded bg-surface-raised px-1.5 py-0.5 text-[10px] ${color ?? "text-foreground/70"}`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
