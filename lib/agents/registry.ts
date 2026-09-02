import type { CodebaseAgent } from "@/types";

/**
 * Registry of future specialized agents.
 * Actual agent implementations will be added incrementally.
 */

export const AGENT_DEFINITIONS: Pick<CodebaseAgent, "name" | "description">[] = [
  {
    name: "Architect",
    description:
      "Maps high-level system structure, module boundaries, and architectural patterns.",
  },
  {
    name: "Code Analyst",
    description:
      "Examines source files, identifies key code paths, and traces data flow.",
  },
  {
    name: "Security Analyst",
    description:
      "Scans for potential vulnerabilities, insecure patterns, and dependency risks.",
  },
  {
    name: "Synthesizer",
    description:
      "Combines agent findings into a unified codebase report and knowledge graph.",
  },
];

export function getAgentDefinitions() {
  return AGENT_DEFINITIONS;
}
