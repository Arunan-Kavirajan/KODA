import { RepoInput } from "@/components/landing/repo-input";

export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="font-display text-2xl tracking-tight">
              Ready to investigate?
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Start with any public repository on GitHub.
            </p>
          </div>
          <RepoInput />
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono text-xs text-muted-foreground">
            KODA · codebase investigation
          </span>
          <span className="font-mono text-[10px] text-muted-foreground/50">
            v0.2.0 · ingestion phase
          </span>
        </div>
      </div>
    </footer>
  );
}
