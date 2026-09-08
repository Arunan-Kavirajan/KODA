export interface AIProvider {
  generateText(prompt: string, systemPrompt?: string): Promise<string>;
  generateStructured<T>(prompt: string, validator: (data: unknown) => T, systemPrompt?: string): Promise<T>;
}
