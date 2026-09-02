"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isValidGitHubUrl } from "@/lib/github";

export function RepoInput({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    const trimmed = url.trim();

    if (!trimmed) {
      setError("Enter a repository URL.");
      return;
    }

    if (!isValidGitHubUrl(trimmed)) {
      setError("Expected format: github.com/owner/repo");
      return;
    }

    router.push(`/analyze?url=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className={compact ? "w-full" : "max-w-lg"}>
      <label htmlFor="repo-url" className="sr-only">
        GitHub repository URL
      </label>
      <div className="flex border border-border-strong bg-input">
        <span className="flex items-center border-r border-border px-3 font-mono text-xs text-muted-foreground">
          →
        </span>
        <input
          id="repo-url"
          type="text"
          placeholder="github.com/owner/repository"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          aria-describedby={error ? "url-error" : undefined}
          aria-invalid={error ? true : undefined}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSubmit}
          className="border-l border-border-strong bg-surface-raised px-4 py-2.5 font-mono text-xs text-accent transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Investigate
        </button>
      </div>
      {error && (
        <p id="url-error" role="alert" className="mt-2 font-mono text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
