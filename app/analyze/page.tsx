import { Suspense } from "react";
import Link from "next/link";
import { Workspace } from "@/components/codebase/workspace";

type AnalyzePageProps = {
  searchParams: Promise<{ url?: string }>;
};

export default async function AnalyzePage({ searchParams }: AnalyzePageProps) {
  const { url } = await searchParams;

  if (!url) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="font-mono text-sm text-muted-foreground">
          No repository URL provided.
        </p>
        <Link href="/" className="font-mono text-xs text-accent hover:underline">
          ← Back to KODA
        </Link>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <p className="font-mono text-xs text-muted-foreground">Loading workspace...</p>
        </div>
      }
    >
      <Workspace repositoryUrl={url} />
    </Suspense>
  );
}
