import fs from 'fs';
import path from 'path';
import { escapeHtml } from '../lib/sanitizer';
import {
  DEFAULT_MASTER_TEMPLATE,
  ensureMainImageFirstInPostHtml,
  renderImportedPostTemplate,
  type ImportedTemplateVariables,
} from '../templates/BloggerPostTemplate';

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
 * - {{IMAGE_URL}} (always used as the Blogger post thumbnail & first image)
 * - {{CAPTION}}
 * - {{PUBLISHED_DATE}}
 * Note: Any legacy {{THUMBNAIL_URL}} placeholder in saved templates resolves directly to {{IMAGE_URL}}.
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
  const safeImageUrl = (variables.imageUrl || '').trim().replace(/["'<>]/g, '');

  const formattedDate = variables.publishedDate || new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const rendered = rawTemplate
    .replace(/\{\{TITLE\}\}/g, () => escapedTitle)
    .replace(/\{\{IMAGE_URL\}\}/g, () => safeImageUrl)
    .replace(/\{\{THUMBNAIL_URL\}\}/g, () => safeImageUrl)
    .replace(/\{\{CAPTION\}\}/g, () => escapedCaption)
    .replace(/\{\{PUBLISHED_DATE\}\}/g, () => formattedDate);

  return ensureMainImageFirstInPostHtml(rendered, safeImageUrl, variables.title);
}

/**
 * Renders a sanitized imported article into the existing Master HTML Template
 * (/templates/blogger-post-template.html or the user's saved custom template).
 */
export function renderImportedTemplate(
  templateString: string | undefined | null,
  variables: ImportedTemplateVariables
): string {
  const trimmedCustom = templateString?.trim();
  // Prefer /templates/blogger-post-template.html when no custom override was edited
  const effectiveTemplate =
    trimmedCustom && trimmedCustom.length > 0 && trimmedCustom !== DEFAULT_MASTER_TEMPLATE.trim()
      ? templateString!
      : loadMasterTemplate();

  return renderImportedPostTemplate(effectiveTemplate, variables);
}
