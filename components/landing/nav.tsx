import Link from "next/link";

export function LandingNav() {
  return (
    <header className="border-b border-border">
      <nav
        className="mx-auto flex h-12 max-w-7xl items-center justify-between px-5 sm:px-8"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="font-mono text-sm tracking-tight text-foreground"
        >
          KODA
        </Link>

        <div className="flex items-center gap-6 sm:gap-8">
          <a
            href="#investigate"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Investigate
          </a>
          <a
            href="#how-it-works"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            How it works
          </a>
          <span
            className="font-mono text-xs text-muted-foreground/60"
            aria-label="GitHub link coming soon"
          >
            GitHub
          </span>
        </div>
      </nav>
    </header>
  );
}
