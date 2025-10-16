/**
 * GitHub API utilities for fetching repository information
 */

interface GitHubRepo {
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  updated_at: string
}

/**
 * Extract owner and repo from GitHub URL or repo string
 * @param source - GitHub URL (https://github.com/owner/repo) or repo string (owner/repo)
 * @returns Object with owner and repo, or null if invalid
 */
export function parseGitHubRepo(source: string): { owner: string, repo: string } | null {
  try {
    // Handle URL format: https://github.com/owner/repo
    if (source.startsWith('http')) {
      const url = new URL(source)
      const parts = url.pathname.split('/').filter(Boolean)
      if (parts.length >= 2) {
        return { owner: parts[0], repo: parts[1] }
      }
    }

    // Handle repo format: owner/repo
    const parts = source.split('/')
    if (parts.length === 2 && parts[0] && parts[1]) {
      return { owner: parts[0], repo: parts[1] }
    }

    return null
  }
  catch {
    return null
  }
}

/**
 * Fetch GitHub repository star count
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns Star count, or null if fetch fails
 */
export async function fetchGitHubStars(owner: string, repo: string): Promise<number | null> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}`

    // Use GitHub token if available to increase rate limit
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'claude-code-plugins-marketplace',
    }

    const githubToken = process.env.GITHUB_TOKEN
    if (githubToken) {
      headers.Authorization = `token ${githubToken}`
    }

    const response = await $fetch<GitHubRepo>(url, {
      headers,
      // Add timeout to prevent hanging
      timeout: 5000,
    })

    return response.stargazers_count
  }
  catch (error) {
    console.warn(`Failed to fetch stars for ${owner}/${repo}:`, error)
    return null
  }
}

/**
 * Fetch stars for a plugin based on its source
 * @param source - Plugin source (GitHub URL or repo string)
 * @returns Star count, or null if fetch fails
 */
export async function fetchPluginStars(source: string | { source: string, repo: string }): Promise<number | null> {
  // Handle object format with repo property
  if (typeof source === 'object' && source.repo) {
    const parsed = parseGitHubRepo(source.repo)
    if (!parsed)
      return null
    return fetchGitHubStars(parsed.owner, parsed.repo)
  }

  // Handle string format
  if (typeof source === 'string') {
    const parsed = parseGitHubRepo(source)
    if (!parsed)
      return null
    return fetchGitHubStars(parsed.owner, parsed.repo)
  }

  return null
}