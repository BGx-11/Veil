/**
 * Sanitizes text extracted from iframes before passing to the local LLM.
 * This helps prevent prompt injection attacks where invisible text commands the AI.
 */
export function sanitizeContextText(text: string): string {
  if (!text) return '';
  
  // 1. Remove all HTML-like tags entirely to prevent sneaky injections like <script> or hidden divs
  let clean = text.replace(/<[^>]*>?/gm, ' ');

  // 2. Remove common prompt injection syntax and keywords (basic heuristic)
  const injectionPatterns = [
    /\[SYSTEM OVERRIDE.*\]/gi,
    /Ignore previous instructions/gi,
    /You are now/gi,
    /system instruction/gi,
    /sudo /gi
  ];

  for (const pattern of injectionPatterns) {
    clean = clean.replace(pattern, '[REDACTED]');
  }

  // 3. Normalize whitespace
  clean = clean.replace(/\s+/g, ' ').trim();

  // 4. Truncate to reasonable context limit to avoid overflow attacks
  return clean.substring(0, 15000);
}
