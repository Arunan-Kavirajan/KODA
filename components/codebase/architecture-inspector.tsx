"use client";

import { useState } from "react";
import type { ArchitectureReport } from "@/types/architecture";

type ArchitectureInspectorProps = {
  jobId: string;
};

export function ArchitectureInspector({ jobId }: ArchitectureInspectorProps) {
  const [report, setReport] = useState<ArchitectureReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runArchitect = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/analyze/${jobId}/architect`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze architecture");
      }

      const data: ArchitectureReport = await response.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <SectionHeader>Architecture</SectionHeader>
        <div className="flex-1 flex items-center justify-center p-4 text-center">
          <p className="font-mono text-xs text-muted-foreground animate-pulse">
            Analyzing architecture...<br/>
            (This may take a moment)
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col">
        <SectionHeader>Architecture</SectionHeader>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center gap-4">
          <p className="font-mono text-xs text-destructive">{error}</p>
          <button
            onClick={runArchitect}
            className="font-mono text-[10px] text-accent hover:underline"
          >
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex h-full flex-col">
        <SectionHeader>Architecture</SectionHeader>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center gap-4">
          <p className="font-mono text-xs text-muted-foreground">
            No architecture report generated yet.
          </p>
          <button
            onClick={runArchitect}
            className="rounded bg-accent/10 px-3 py-1.5 font-mono text-[10px] text-accent hover:bg-accent/20"
          >
            Run Architect Agent
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <SectionHeader>Architecture</SectionHeader>
      <div className="flex-1 overflow-y-auto p-3 space-y-4 font-mono text-[11px]">
        
        <div>
          <Label>Overview</Label>
          <p className="mt-1 leading-relaxed text-muted-foreground text-[10px]">
            {report.summary}
          </p>
        </div>

        <Divider />
        <div>
          <Label>Style: {report.architectureStyle.name}</Label>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {report.architectureStyle.explanation} (Confidence: {Math.round(report.architectureStyle.confidence * 100)}%)
          </p>
        </div>

        {report.entryPoints.length > 0 && (
          <>
            <Divider />
            <Label>Entry Points</Label>
            <div className="space-y-2 mt-1">
              {report.entryPoints.map((ep, i) => (
                <div key={i}>
                  <p className="text-graph-file truncate">{ep.path}</p>
                  <p className="text-[10px] text-muted-foreground">{ep.reason}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {report.modules.length > 0 && (
          <>
            <Divider />
            <Label>Modules</Label>
            <div className="space-y-2 mt-1">
              {report.modules.map((m, i) => (
                <div key={i}>
                  <p className="text-graph-module font-semibold">{m.name} ({m.importance})</p>
                  <p className="text-[10px] text-muted-foreground">{m.responsibility}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {report.readingOrder.length > 0 && (
          <>
            <Divider />
            <Label>Reading Order</Label>
            <div className="space-y-2 mt-1">
              {report.readingOrder.map((ro, i) => (
                <div key={i}>
                  <p className="text-foreground/80">{i + 1}. {ro.path}</p>
                  <p className="text-[10px] text-muted-foreground">{ro.reason}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {report.architecturalConcerns.length > 0 && (
          <>
            <Divider />
            <Label>Concerns</Label>
            <div className="space-y-2 mt-1">
              {report.architecturalConcerns.map((ac, i) => (
                <div key={i}>
                  <p className={
                    ac.severity === "high" ? "text-destructive" :
                    ac.severity === "medium" ? "text-yellow-500" :
                    "text-muted-foreground"
                  }>{ac.title}</p>
                  <p className="text-[10px] text-muted-foreground">{ac.explanation}</p>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-border px-3 py-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {children}
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
