# KODA

Codebase investigation tool. Ingest public GitHub repositories, explore file structure, and prepare for multi-agent analysis.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste a public GitHub URL, and investigate.

## Scripts

- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — Run ESLint

## Project Structure

```
app/                  # Pages and API routes
components/
  codebase/           # Workspace: explorer, map, status bar
  landing/            # Landing page
  mindmap/            # Graph visualizations
lib/
  github/             # URL parsing, archive fetching
  repository/         # Ingestion, file tree, filtering
  agents/             # Agent registry (planned)
  analysis/           # Job orchestration
  graph/              # Graph model (planned)
types/                # Shared TypeScript interfaces
```

## Current Status

**v0.2.0 — Ingestion phase**

- Landing page with distinctive developer-tool aesthetic
- Public GitHub repository ingestion via tarball API
- File tree extraction with vendor/build filtering
- `/analyze` workspace with real repository explorer
- Structure map derived from top-level modules

Not yet implemented: AI agents, interactive knowledge graph, ZIP upload, authentication.

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- ESLint
