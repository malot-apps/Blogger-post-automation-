import fs from 'fs';
import path from 'path';
import { escapeHtml } from '../lib/sanitizer';
import { DEFAULT_MASTER_TEMPLATE } from '../templates/BloggerPostTemplate';

export interface TemplateVariables {
  title: string;
  imageUrl: string;
  thumbnailUrl?: string;
  caption: string;
  publishedDate?: string;
}

/**
 * Loads the master Blogger HTML template directly from /templates/blogger-post-template.html
 */
export function loadMasterTemplate(): string {
  try {
    const templatePath = path.join(process.cwd(), 'templates', 'blogger-post-template.html');
    if (fs.existsSync(templatePath)) {
      return fs.readFileSync(templatePath, 'utf8');
    }
  } catch (err) {
    console.error('Error reading /templates/blogger-post-template.html:', err);
  }
  return DEFAULT_MASTER_TEMPLATE;
}

/**
 * Injects all dynamic variables into the master HTML template before Blogger publishing:
 * - {{TITLE}}
 * - {{IMAGE_URL}}
 * - {{THUMBNAIL_URL}}
 * - {{CAPTION}}
 * - {{PUBLISHED_DATE}}
 */
export function renderTemplate(
  templateString: string | undefined | null,
  variables: TemplateVariables
): string {
  const rawTemplate = templateString && templateString.trim().length > 0
    ? templateString
    : loadMasterTemplate();

  const escapedTitle = escapeHtml(variables.title || '');
  const escapedCaption = escapeHtml(variables.caption || '');
  const safeImageUrl = (variables.imageUrl || '').trim();
  
  // Thumbnail fallback rule: if no separate thumbnail is provided, use main imageUrl
  const safeThumbnailUrl = variables.thumbnailUrl && variables.thumbnailUrl.trim().length > 0
    ? variables.thumbnailUrl.trim()
    : safeImageUrl;

  const formattedDate = variables.publishedDate || new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return rawTemplate
    .replace(/\{\{TITLE\}\}/g, escapedTitle)
    .replace(/\{\{IMAGE_URL\}\}/g, safeImageUrl)
    .replace(/\{\{THUMBNAIL_URL\}\}/g, safeThumbnailUrl)
    .replace(/\{\{CAPTION\}\}/g, escapedCaption)
    .replace(/\{\{PUBLISHED_DATE\}\}/g, formattedDate);
}
