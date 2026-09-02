import type { RepositorySnapshot } from "@/types/repository";

type StatusBarProps = {
  snapshot: RepositorySnapshot;
  status: "ready" | "loading" | "error";
  message?: string;
};

export function StatusBar({ snapshot, status, message }: StatusBarProps) {
  return (
    <footer className="flex h-8 shrink-0 items-center justify-between border-t border-border bg-surface px-3 font-mono text-[10px]">
      <div className="flex items-center gap-3 text-muted-foreground">
        {status === "loading" && (
          <>
            <span className="animate-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            <span>{message ?? "Working..."}</span>
          </>
        )}
        {status === "ready" && (
          <>
            <span className="text-graph-dir">●</span>
            <span>
              {snapshot.stats.filteredFiles} files ·{" "}
              {snapshot.stats.filteredDirectories} dirs ·{" "}
              {snapshot.stats.ignoredCount} ignored
            </span>
          </>
        )}
        {status === "error" && (
          <>
            <span className="text-destructive">●</span>
            <span className="text-destructive">{message}</span>
          </>
        )}
      </div>

      {status === "ready" && (
        <span className="text-muted-foreground/50">
          branch: {snapshot.metadata.defaultBranch}
        </span>
      )}
    </footer>
  );
}
