import { buildArchitectContext } from "@/lib/agents/context";
import { RepositorySnapshot } from "@/types/repository";
import { CodeFile } from "@/types/code";

describe("ArchitectContext Builder", () => {
  it("prioritizes entry points and ranks files deterministically", () => {
    const codeFiles: CodeFile[] = [
      {
        path: "utils/helper.ts",
        language: "TypeScript",
        size: 100,
        imports: [],
        exports: [{ name: "help", kind: "named" }],
        functions: [{ name: "help", parameters: [], isExported: true, isAsync: false }],
        classes: [],
        parsed: true,
      },
      {
        path: "src/index.ts",
        language: "TypeScript",
        size: 200,
        imports: [{ source: "./app", names: ["App"], isInternal: true, kind: "named" }],
        exports: [{ name: "App", kind: "named" }],
        functions: [],
        classes: [],
        parsed: true,
      },
    ];

    const snapshot: RepositorySnapshot = {
      metadata: { owner: "test", name: "test", fullName: "test/test", url: "", defaultBranch: "main" },
      entries: [
        { path: "utils", name: "utils", type: "directory", depth: 1 },
        { path: "src", name: "src", type: "directory", depth: 1 },
        { path: "utils/helper.ts", name: "helper.ts", type: "file", depth: 2 },
        { path: "src/index.ts", name: "index.ts", type: "file", depth: 2 },
      ],
      tree: [],
      stats: { totalFiles: 2, totalDirectories: 2, filteredFiles: 2, filteredDirectories: 2, ignoredCount: 0 },
      ingestedAt: "",
      codeFiles,
      analysisMetadata: {
        analyzedAt: "",
        totalFiles: 2,
        analyzedFiles: 2,
        skippedFiles: 0,
        parseFailures: [],
        languages: { TypeScript: 2 },
      }
    };

    const context = buildArchitectContext(snapshot);
    
    // Index should appear before helper.ts because it gets entry point boost
    const indexPos = context.indexOf("### src/index.ts");
    const helperPos = context.indexOf("### utils/helper.ts");
    
    expect(indexPos).toBeGreaterThan(-1);
    expect(helperPos).toBeGreaterThan(-1);
    expect(indexPos).toBeLessThan(helperPos);
  });
});
