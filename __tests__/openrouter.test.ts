import { OpenRouterProvider } from "@/lib/ai/openrouter";

// Mock fetch globally
global.fetch = jest.fn();

describe("OpenRouterProvider", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv, OPENROUTER_API_KEY: "test-key" };
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws if missing API key", () => {
    delete process.env.OPENROUTER_API_KEY;
    const provider = new OpenRouterProvider();
    expect(() => (provider as any).apiKey).toThrow("OPENROUTER_API_KEY");
  });

  it("handles successful structured output", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"hello": "world"}' } }],
      }),
    });

    const provider = new OpenRouterProvider();
    const result = await provider.generateStructured("test", (d) => d);
    expect(result).toEqual({ hello: "world" });
  });

  it("handles fenced JSON blocks", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '```json\n{"test": true}\n```' } }],
      }),
    });

    const provider = new OpenRouterProvider();
    const result = await provider.generateStructured("test", (d) => d);
    expect(result).toEqual({ test: true });
  });

  it("throws on malformed JSON", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'not json' } }],
      }),
    });

    const provider = new OpenRouterProvider();
    await expect(provider.generateStructured("test", (d) => d)).rejects.toThrow(/Failed to parse/);
  });

  it("throws on API error", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });

    const provider = new OpenRouterProvider();
    await expect(provider.generateText("test")).rejects.toThrow("401 Unauthorized");
  });
});
