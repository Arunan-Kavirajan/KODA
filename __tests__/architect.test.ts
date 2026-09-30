import { ArchitectAgent } from "@/lib/agents/architect";
import { AIProvider } from "@/lib/ai/provider";

describe("ArchitectAgent", () => {
  it("handles empty snapshot safely", async () => {
    const mockProvider: AIProvider = {
      generateText: jest.fn(),
      generateStructured: jest.fn(),
    };
    const agent = new ArchitectAgent(mockProvider);
    const result = await agent.analyze({});
    expect(result.status).toBe("error");
    expect(result.metadata?.error).toBe("No repository snapshot provided");
  });

  it("validates valid ArchitectureReport", async () => {
    const validReport = {
      summary: "test",
      architectureStyle: { name: "test", confidence: 1, explanation: "test" },
      entryPoints: [{ path: "index.ts", reason: "Main entry", confidence: 0.9 }],
      modules: [{ name: "Core", paths: ["lib/"], responsibility: "Logic", importance: "high" }],
      relationships: [{ from: "lib/", to: "utils/", relationship: "uses", explanation: "depends on utils" }],
      externalDependencies: [{ name: "react", purpose: "UI", importance: "high" }],
      readingOrder: [{ path: "index.ts", reason: "Start here" }],
      architecturalConcerns: [{ title: "Monolith", explanation: "Too big", severity: "medium" }]
    };

    const mockProvider: AIProvider = {
      generateText: jest.fn(),
      generateStructured: jest.fn().mockImplementation((prompt, validator) => {
        return Promise.resolve(validator(validReport));
      }),
    };

    const agent = new ArchitectAgent(mockProvider);
    const result = await agent.analyze({ 
      snapshot: { metadata: {} as any, entries: [], tree: [], stats: {} as any, ingestedAt: "" } 
    });

    expect(result.status).toBe("success");
    expect(result.findings).toEqual(validReport);
  });

  it("handles invalid ArchitectureReport safely", async () => {
    const invalidReport = { summary: "missing fields" };

    const mockProvider: AIProvider = {
      generateText: jest.fn(),
      generateStructured: jest.fn().mockImplementation((prompt, validator) => {
        return Promise.resolve(validator(invalidReport)); 
      }),
    };

    const agent = new ArchitectAgent(mockProvider);
    const result = await agent.analyze({ 
      snapshot: { metadata: {} as any, entries: [], tree: [], stats: {} as any, ingestedAt: "" } 
    });

    expect(result.status).toBe("error");
    expect(result.metadata?.error).toMatch(/Missing or invalid architectureStyle/);
  });

  it("fails on invalid confidence bounds", async () => {
    const invalidReport = {
      summary: "test",
      architectureStyle: { name: "test", confidence: 1.5, explanation: "test" }, // > 1
      entryPoints: [],
      modules: [],
      relationships: [],
      externalDependencies: [],
      readingOrder: [],
      architecturalConcerns: []
    };

    const mockProvider: AIProvider = {
      generateText: jest.fn(),
      generateStructured: jest.fn().mockImplementation((prompt, validator) => {
        return Promise.resolve(validator(invalidReport)); 
      }),
    };

    const agent = new ArchitectAgent(mockProvider);
    const result = await agent.analyze({ 
      snapshot: { metadata: {} as any, entries: [], tree: [], stats: {} as any, ingestedAt: "" } 
    });

    expect(result.status).toBe("error");
    expect(result.metadata?.error).toMatch(/Invalid architectureStyle.confidence/);
  });
});
