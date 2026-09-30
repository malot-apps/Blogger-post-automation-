import { stripHtml } from './sanitizer';

/**
 * Generates a clean, simple post title from user caption if the title was left blank.
 * Follows rule: Do not invent misleading or fabricated information.
 */
export function generateTitleFromCaption(caption: string): string {
  const clean = stripHtml(caption).trim();
  if (!clean) {
    const today = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `Photo Post - ${today}`;
  }

  // Get the first sentence or first line
  const firstLine = clean.split('\n')[0].trim();
  const firstSentenceMatch = firstLine.match(/^([^.!?]+[.!?]?)/);
  const candidate = firstSentenceMatch ? firstSentenceMatch[1].trim() : firstLine;

  // If candidate is reasonably short (<= 70 chars), use it
  if (candidate.length <= 70) {
    return candidate;
  }

  // Otherwise, take first 8-10 words and add ellipsis
  const words = candidate.split(/\s+/);
  if (words.length <= 10) {
    return candidate;
  }

  const truncated = words.slice(0, 9).join(' ');
  return `${truncated}...`;
}
