import fs from 'fs';
import path from 'path';
import { escapeHtml } from '../lib/sanitizer';
import {
  DEFAULT_MASTER_TEMPLATE,
  ensureMainImageFirstInPostHtml,
  renderImportedPostTemplate,
  type ImportedTemplateVariables,
} from '../templates/BloggerPostTemplate';
import {
  isPngImageUrl,
  selectMainThumbnailImageFromHtml,
} from '../lib/mainImageSelector';
import {
  deduplicateAdScriptsAndContainers,
  ensureMasterAdConfiguration,
} from '../lib/importedHtmlCleaner';

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
      return deduplicateAdScriptsAndContainers(fs.readFileSync(templatePath, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading /templates/blogger-post-template.html:', err);
  }
  return deduplicateAdScriptsAndContainers(DEFAULT_MASTER_TEMPLATE);
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
  const masterTemplate = loadMasterTemplate();
  const rawTemplate = templateString && templateString.trim().length > 0
    ? deduplicateAdScriptsAndContainers(templateString)
    : masterTemplate;

  const escapedTitle = escapeHtml(variables.title || '');
  const escapedCaption = escapeHtml(variables.caption || '');
  let safeImageUrl = (variables.imageUrl || '').trim().replace(/["'<>]/g, '');
  if (!safeImageUrl || isPngImageUrl(safeImageUrl)) {
    const recoveredFromTemplate = selectMainThumbnailImageFromHtml(rawTemplate);
    if (recoveredFromTemplate && !isPngImageUrl(recoveredFromTemplate)) {
      safeImageUrl = recoveredFromTemplate.trim().replace(/["'<>]/g, '');
    }
  }

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

  const secured = ensureMasterAdConfiguration(rendered, masterTemplate);
  return ensureMainImageFirstInPostHtml(secured, safeImageUrl, variables.title);
}

/**
 * Renders a sanitized imported article into the existing Master HTML Template
 * (/templates/blogger-post-template.html or the user's saved custom template),
 * automatically injecting the Master Template's configured ad links and preventing duplicate ad scripts/containers.
 */
export function renderImportedTemplate(
  templateString: string | undefined | null,
  variables: ImportedTemplateVariables
): string {
  const masterTemplate = loadMasterTemplate();
  const trimmedCustom = templateString?.trim();
  const normalizedCustom = trimmedCustom ? deduplicateAdScriptsAndContainers(trimmedCustom) : '';
  const effectiveTemplate =
    normalizedCustom &&
    normalizedCustom !== DEFAULT_MASTER_TEMPLATE.trim() &&
    normalizedCustom !== masterTemplate.trim()
      ? normalizedCustom
      : masterTemplate;

  return renderImportedPostTemplate(effectiveTemplate, variables, masterTemplate);
}
