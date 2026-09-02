/**
 * GitHub repository utilities.
 * Repository ingestion will be implemented in the next phase.
 */

export type ParsedGitHubUrl = {
  owner: string;
  repo: string;
  url: string;
};

export function parseGitHubUrl(input: string): ParsedGitHubUrl | null {
  const trimmed = input.trim();

  const patterns = [
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/,
    /^github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/,
    /^([^/]+)\/([^/]+)$/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const [, owner, repo] = match;
      return {
        owner,
        repo: repo.replace(/\.git$/, ""),
        url: `https://github.com/${owner}/${repo.replace(/\.git$/, "")}`,
      };
    }
  }

  return null;
}

export function isValidGitHubUrl(input: string): boolean {
  return parseGitHubUrl(input) !== null;
}
