import { isInternal } from './store';

/**
 * Robustly parses user input to distinguish between search queries and URLs/IPs.
 */
export function parseNavigationInput(input: string): string {
  // Strip surrounding quotes (common when pasting URLs) and whitespace
  let raw = input.trim().replace(/^["']+|["']+$/g, '').trim();
  if (!raw) return '';

  if (raw.startsWith('http://') || raw.startsWith('https://') || isInternal(raw)) {
    return raw;
  }

  // Regex to detect IPv4, IPv6, localhost, or domains with valid TLDs
  // It handles "localhost:8080", "127.0.0.1", "example.com", "example.com/path"
  // But NOT "react v18." or "hello world"
  const urlRegex = /^(?:(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}|localhost|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?(?:\/.*)?$/;

  // Check if it's a URL-like string without spaces
  if (!raw.includes(' ') && urlRegex.test(raw)) {
    return `https://${raw}`;
  }

  // Otherwise, it's a search query.
  // Use encodeURIComponent to safely encode the query. This properly handles
  // special characters like +, #, &, @, etc. that would otherwise break the URL.
  return `search://${encodeURIComponent(raw)}`;
}
