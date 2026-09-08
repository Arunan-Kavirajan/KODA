export interface ArchitectureReport {
  summary: string;

  architectureStyle: {
    name: string;
    confidence: number;
    explanation: string;
  };

  entryPoints: Array<{
    path: string;
    reason: string;
    confidence: number;
  }>;

  modules: Array<{
    name: string;
    paths: string[];
    responsibility: string;
    importance: "high" | "medium" | "low";
  }>;

  relationships: Array<{
    from: string;
    to: string;
    relationship: string;
    explanation: string;
  }>;

  externalDependencies: Array<{
    name: string;
    purpose: string;
    importance: "high" | "medium" | "low";
  }>;

  readingOrder: Array<{
    path: string;
    reason: string;
  }>;

  architecturalConcerns: Array<{
    title: string;
    explanation: string;
    severity: "low" | "medium" | "high";
  }>;
}
