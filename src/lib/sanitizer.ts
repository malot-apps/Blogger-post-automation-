/**
 * HTML sanitization and escaping utilities to prevent XSS and malformed HTML in Blogger posts.
 */

export function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Converts user caption plain text into clean, formatted HTML paragraphs with line breaks preserved.
 */
export function formatCaptionToHtml(caption: string): string {
  if (!caption) return '';
  
  // Split by double newline for paragraphs, and single newline for <br />
  const paragraphs = caption
    .trim()
    .split(/\n\s*\n/)
    .map((para) => {
      const sanitizedLines = para
        .split('\n')
        .map((line) => escapeHtml(line.trim()))
        .join('<br />');
      return `<p style="margin: 0 0 1em 0; line-height: 1.6; font-size: 16px; color: #333333;">${sanitizedLines}</p>`;
    });

  return paragraphs.join('\n');
}

/**
 * Strips HTML tags for plain text display / title generation.
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').trim();
}
