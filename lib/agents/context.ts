import { RepositorySnapshot } from "@/types";

export function buildArchitectContext(snapshot: RepositorySnapshot): string {
  const parts: string[] = [];

  // 1. Metadata
  parts.push(`## Repository Metadata`);
  parts.push(`Name: ${snapshot.metadata.fullName}`);
  parts.push(`Description: ${snapshot.metadata.description || "N/A"}`);
  parts.push(`Default Branch: ${snapshot.metadata.defaultBranch}`);
  if (snapshot.analysisMetadata) {
    parts.push(`Total Files: ${snapshot.analysisMetadata.totalFiles}`);
    const langs = Object.entries(snapshot.analysisMetadata.languages)
      .sort((a, b) => b[1] - a[1])
      .map(([lang, count]) => `${lang} (${count})`)
      .join(", ");
    parts.push(`Languages: ${langs}`);
  }
  parts.push("");

  // 2. Dependencies
  if (snapshot.dependencies && snapshot.dependencies.length > 0) {
    parts.push(`## External Dependencies`);
    const prod = snapshot.dependencies.filter((d) => d.kind === "production").slice(0, 30);
    const dev = snapshot.dependencies.filter((d) => d.kind === "development").slice(0, 20);
    if (prod.length > 0) {
      parts.push(`Production: ${prod.map((d) => d.name).join(", ")}`);
    }
    if (dev.length > 0) {
      parts.push(`Development: ${dev.map((d) => d.name).join(", ")}`);
    }
    parts.push("");
  }

  // 3. Directory Structure (top 500 entries to avoid overflow)
  parts.push(`## Directory Structure`);
  const dirs = snapshot.entries
    .filter((e) => e.type === "directory")
    .map((e) => e.path + "/")
    .slice(0, 100);
  const files = snapshot.entries
    .filter((e) => e.type === "file")
    .map((e) => e.path)
    .slice(0, 400);
  
  parts.push([...dirs, ...files].slice(0, 500).join("\n"));
  parts.push("");

  // 4. Key Files
  if (snapshot.codeFiles && snapshot.codeFiles.length > 0) {
    parts.push(`## Important Files\n`);
    
    // Score files to find important ones
    const scoredFiles = snapshot.codeFiles.map((file) => {
      let score = 0;
      const lower = file.path.toLowerCase();
      // Entry points boost
      if (lower.includes("index") || lower.includes("main") || lower.includes("app.") || lower.includes("server.")) {
        score += 50;
      }
      // Config boost
      if (lower.includes("config") || lower.includes("setup")) {
        score += 20;
      }
      // Connectivity boost
      score += file.exports.length * 2;
      score += file.imports.length;
      score += file.functions.length;
      score += file.classes.length * 3;
      
      return { file, score };
    });

    // Top 50 files
    const topFiles = scoredFiles
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map((item) => item.file);

    for (const file of topFiles) {
      parts.push(`### ${file.path}`);
      if (file.classes.length > 0) {
        parts.push(`Classes: ${file.classes.map((c) => c.name).join(", ")}`);
      }
      if (file.functions.length > 0) {
        parts.push(`Functions: ${file.functions.map((f) => f.name).join(", ")}`);
      }
      const internalImports = file.imports.filter((i) => i.isInternal).map((i) => i.source);
      const externalImports = file.imports.filter((i) => !i.isInternal).map((i) => i.source);
      if (externalImports.length > 0) {
        // limit to 10
        parts.push(`External Imports: ${externalImports.slice(0, 10).join(", ")}`);
      }
      if (internalImports.length > 0) {
        // limit to 10
        parts.push(`Internal Imports: ${internalImports.slice(0, 10).join(", ")}`);
      }
      if (file.exports.length > 0) {
        parts.push(`Exports: ${file.exports.map((e) => e.name).slice(0, 10).join(", ")}`);
      }
      parts.push("");
    }
  }

  return parts.join("\n");
}
