"use client";

import { HeroGraph } from "@/components/mindmap/hero-graph";
import { RepoInput } from "@/components/landing/repo-input";

export function HeroSection() {
  return (
    <section id="investigate" className="border-b border-border">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-20">
        <div className="flex flex-col justify-center">
          <p className="font-mono text-xs text-terminal">
            codebase investigation tool
          </p>

          <h1 className="font-display mt-4 text-4xl leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
            Your codebase knows more than its README.
          </h1>

          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            Drop in a repository. KODA maps its structure, traces how pieces
            connect, and prepares the ground for deep investigation.
          </p>

          <div className="mt-8">
            <RepoInput />
          </div>

          <p className="mt-3 font-mono text-[11px] text-muted-foreground/70">
            Public GitHub repositories · No account required
          </p>
        </div>

        <div className="relative flex items-center justify-center lg:justify-end">
          <HeroGraph />
          <aside className="absolute -bottom-2 left-0 font-mono text-[10px] leading-relaxed text-muted-foreground/60 lg:-left-4">
            <p>37 files discovered</p>
            <p>12 modules mapped</p>
            <p>4 dependency clusters</p>
            <p className="mt-1 text-muted-foreground/40">— static preview</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
