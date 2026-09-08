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

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: KODA_MODEL,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Malformed response from OpenRouter");
    }

    return data.choices[0].message.content;
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
      throw new Error(`Failed to parse structured model output as JSON: ${e instanceof Error ? e.message : 'Unknown error'}\nOutput: ${text}`);
    }

    try {
      return validator(parsed);
    } catch (e) {
      throw new Error(`Model output validation failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }
}
