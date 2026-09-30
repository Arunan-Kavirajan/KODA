import { AIProvider } from "./provider";
import { KODA_MODEL } from "./model";

export class OpenRouterProvider implements AIProvider {
  private get apiKey(): string {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      throw new Error("OPENROUTER_API_KEY environment variable is missing");
    }
    return key;
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    let response: Response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: KODA_MODEL,
          messages,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("OpenRouter API request timed out after 60 seconds");
      }
      throw new Error(`OpenRouter API network failure: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("OpenRouter API rate limit exceeded (HTTP 429)");
      }
      if (response.status >= 500) {
        throw new Error(`OpenRouter API server error (HTTP ${response.status})`);
      }
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error("Failed to parse response body from OpenRouter API");
    }

    if (
      !data ||
      typeof data !== "object" ||
      !("choices" in data) ||
      !Array.isArray(data.choices) ||
      data.choices.length === 0 ||
      !data.choices[0] ||
      typeof data.choices[0] !== "object" ||
      !("message" in data.choices[0])
    ) {
      throw new Error("Missing or malformed model output from OpenRouter API");
    }

    const firstChoice = data.choices[0] as Record<string, unknown>;
    const message = firstChoice.message as Record<string, unknown>;
    const content = message.content;
    if (typeof content !== "string") {
      throw new Error("Model output content is not a string");
    }

    return content;
  }

  async generateStructured<T>(prompt: string, validator: (data: unknown) => T, systemPrompt?: string): Promise<T> {
    const structuredPrompt = `${prompt}\n\nPlease respond ONLY with valid JSON. Do not include markdown formatting or explanations outside the JSON object.`;
    
    const text = await this.generateText(structuredPrompt, systemPrompt);
    
    let parsed: unknown;
    try {
      // Handle fenced JSON blocks
      let cleanText = text.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.replace(/^```json/, "");
        if (cleanText.endsWith("```")) {
          cleanText = cleanText.slice(0, -3);
        }
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```/, "");
        if (cleanText.endsWith("```")) {
          cleanText = cleanText.slice(0, -3);
        }
      }
      
      parsed = JSON.parse(cleanText.trim());
    } catch (e) {
      throw new Error(`Failed to parse structured model output as JSON: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    try {
      return validator(parsed);
    } catch (e) {
      throw new Error(`Model output validation failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }
}
