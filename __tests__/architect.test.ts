import { ArchitectAgent } from "@/lib/agents/architect";
import { OpenRouterProvider } from "@/lib/ai/openrouter";

// Mock the provider
jest.mock("@/lib/ai/openrouter");

describe("ArchitectAgent", () => {
  let agent: ArchitectAgent;

  beforeEach(() => {
    agent = new ArchitectAgent();
    (OpenRouterProvider as jest.Mock).mockClear();
  });

  it("handles empty snapshot safely", async () => {
    const result = await agent.analyze({});
    expect(result.status).toBe("error");
    expect(result.metadata?.error).toBe("No repository snapshot provided");
  });

  it("validates valid ArchitectureReport", async () => {
    const validReport = {
      summary: "test",
      architectureStyle: { name: "test", confidence: 1, explanation: "test" },
      entryPoints: [],
      modules: [],
      relationships: [],
      externalDependencies: [],
      readingOrder: [],
      architecturalConcerns: []
    };

    const mockGenerate = jest.fn().mockResolvedValue(validReport);
    (OpenRouterProvider as jest.Mock).mockImplementation(() => ({
      generateStructured: mockGenerate
    }));

    const result = await agent.analyze({ 
      snapshot: { metadata: {} as any, entries: [], tree: [], stats: {} as any, ingestedAt: "" } 
    });

    expect(result.status).toBe("success");
    expect(result.findings).toEqual(validReport);
  });

  it("handles invalid ArchitectureReport from provider safely", async () => {
    const invalidReport = { summary: "missing fields" };

    // Set up the mock to simulate validation failure inside the agent logic
    // The provider itself calls the validator, so we mock the provider to 
    // actually execute the validator passed to it and throw if it fails.
    const mockGenerate = jest.fn().mockImplementation((prompt, validator, system) => {
      // Simulate provider executing validator
      return Promise.resolve(validator(invalidReport)); 
    });
    
    (OpenRouterProvider as jest.Mock).mockImplementation(() => ({
      generateStructured: mockGenerate
    }));

    const result = await agent.analyze({ 
      snapshot: { metadata: {} as any, entries: [], tree: [], stats: {} as any, ingestedAt: "" } 
    });

    expect(result.status).toBe("error");
    expect(result.metadata?.error).toMatch(/Missing or invalid/);
  });
});
