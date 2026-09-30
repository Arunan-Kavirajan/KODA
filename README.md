<div align="center">
  <h1>KODA</h1>
  <strong>A deterministic codebase intelligence and investigation platform.</strong>
  <br />
  <em>KODA ingests public repositories to build a structural source of truth before applying AI architectural reasoning.</em>
  <br />
  <br />
  <strong><a href="https://koda-github.vercel.app">[View Live Demo]</a></strong>
  <br />
  <br />
  <img src="https://img.shields.io/badge/Status-In%20Development-yellow?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/OpenRouter-1A1A1A?style=for-the-badge" alt="OpenRouter" />
</div>

<br />

## Introduction

KODA is designed to solve the problem of overwhelming codebase complexity for developers onboarding to new projects. Standard AI wrappers simply dump raw source code into a language model, resulting in hallucinations and lost context. KODA takes a radically different approach. It first ingests a repository to build a deterministic, structural source of truth: resolving imports, mapping dependencies, and constructing a fully traversable codebase graph. Only then does it invoke specialized AI agents to interpret the architecture and provide grounded insights.

This project is intended for software engineers, tech leads, and technical architects who need to rapidly understand large, unfamiliar repositories. By maintaining strict boundaries between untrusted repository data and AI execution environments, KODA ensures highly performant, secure, and accurate architectural analysis without exposing local environments to malicious execution.

> **Disclaimer:** KODA is currently in active development. The architecture and features described below represent the current working state, but this is not the final version.

<br />

## Features

* **Deterministic Ingestion**: Clones and maps repository structures safely without executing untrusted code.
* **Codebase Graph Visualization**: Renders an interactive, semantic map of directories, files, and dependencies.
* **Architect Agent**: Analyzes the structural snapshot to identify architectural styles, entry points, core modules, and reading orders.
* **Secure Execution**: Enforces strict boundaries to ensure repository contents are treated purely as data, preventing prompt injection or malicious code execution.
* **Semantic Cross Highlighting**: Connects AI generated architecture reports directly to the visual graph for intuitive spatial navigation.

<br />

## Tech Stack

### Frontend
* **Next.js**: Provides the React framework, routing, and server side API endpoints.
* **React**: Powers the interactive user interface and state management.
* **Tailwind CSS**: Delivers utility class styling for a clean, technical aesthetic.

### Backend and AI
* **Node.js**: Executes the deterministic parsing and file tree traversal.
* **OpenRouter**: Acts as the AI provider gateway, utilizing models like Qwen for structured architectural analysis.

### Core Libraries
* **React Flow**: Renders the highly interactive, customizable node based codebase map.
* **TypeScript**: Ensures end to end type safety across data structures and agent payloads.

<br />

## Project Structure

```text
KODA/
│
├── app/                  # Next.js App Router and API endpoints
├── components/           # React UI components (workspace, inspector, graph)
├── lib/
│   ├── agents/           # AI agent definitions and validation logic
│   ├── analysis/         # Deterministic pipeline and job orchestration
│   ├── ai/               # OpenRouter provider and API configuration
│   └── graph/            # Codebase graph construction utilities
├── types/                # Global TypeScript definitions
└── package.json          # Project dependencies and scripts
```

<br />

## How It Works

```text
[ GitHub Repository ]
         │
         ▼
[ Ingestion Engine ]
         │
         ▼
[ Structural Analysis ]
         │
         ▼
[ Codebase Graph ]
         │
         ▼
[ Architect Agent ]
         │
         ▼
[ Interactive Workspace UI ]
```

> **Note:** DETERMINISTIC ANALYSIS = STRUCTURAL SOURCE OF TRUTH. AI = INTERPRETATION. KODA never relies on the LLM to guess the file structure. It builds an exact replica of the repository's architecture and feeds this structured context to the AI, ensuring hallucinations regarding file existence or module relationships are effectively eliminated.

<br />

## Getting Started

### Prerequisites
* Node.js (v18 or higher)
* npm or yarn
* An OpenRouter API Key

### Installation

```bash
git clone https://github.com/Arunan-Kavirajan/KODA.git
cd KODA
npm install
```

### Development

```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

### Build

```bash
npm run build
npm start
```

<br />

## Configuration

KODA requires specific environment variables to function correctly. Create a `.env` file in the root directory and configure the following values:

<table>
  <thead>
    <tr>
      <th>Variable</th>
      <th>Description</th>
      <th>Default / Example</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>OPENROUTER_API_KEY</code></td>
      <td>Your API key from OpenRouter to power the AI agents.</td>
      <td><code>sk-or-v1-xyz</code></td>
    </tr>
    <tr>
      <td><code>KODA_MODEL</code></td>
      <td>The specific LLM model to be used for the Architect Agent.</td>
      <td><code>qwen/qwen3-coder:free</code></td>
    </tr>
  </tbody>
</table>
