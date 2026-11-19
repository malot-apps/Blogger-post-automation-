/**
 * HTML sanitization, entity decoding, and escaping utilities to prevent XSS
 * and avoid double-escaped HTML numeric entities (especially for UTF-8 Bengali text).
 */

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ensp: ' ',
  emsp: ' ',
  thinsp: ' ',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
  ldquo: '“',
  rdquo: '”',
  bdquo: '„',
  hellip: '…',
  middot: '·',
  bull: '•',
  copy: '©',
  reg: '®',
  trade: '™',
  times: '×',
  divide: '÷',
  plusmn: '±',
  laquo: '«',
  raquo: '»',
  lsaquo: '‹',
  rsaquo: '›',
  larr: '←',
  rarr: '→',
  uarr: '↑',
  darr: '↓',
  zwj: '\u200D',
  zwnj: '\u200C',
};

const WINDOWS_1252_EXT: Record<number, number> = {
  0x80: 0x20ac,
  0x82: 0x201a,
  0x83: 0x0192,
  0x84: 0x201e,
  0x85: 0x2026,
  0x86: 0x2020,
  0x87: 0x2021,
  0x88: 0x02c6,
  0x89: 0x2030,
  0x8a: 0x0160,
  0x8b: 0x2039,
  0x8c: 0x0152,
  0x8e: 0x017d,
  0x91: 0x2018,
  0x92: 0x2019,
  0x93: 0x201c,
  0x94: 0x201d,
  0x95: 0x2022,
  0x96: 0x2013,
  0x97: 0x2014,
  0x98: 0x02dc,
  0x99: 0x2122,
  0x9a: 0x0161,
  0x9b: 0x203a,
  0x9c: 0x0153,
  0x9e: 0x017e,
  0x9f: 0x0178,
};

function safeFromCodePoint(codePoint: number): string | null {
  if (!Number.isInteger(codePoint) || codePoint <= 0 || codePoint > 0x10ffff) {
    return null;
  }
  // Exclude UTF-16 surrogates
  if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
    return null;
  }
  // Exclude unsafe C0 controls except tab, LF, CR
  if (codePoint < 0x20 && codePoint !== 0x09 && codePoint !== 0x0a && codePoint !== 0x0d) {
    return null;
  }
  if (codePoint === 0x7f) {
    return null;
  }
  if (codePoint >= 0x80 && codePoint <= 0x9f) {
    const mapped = WINDOWS_1252_EXT[codePoint];
    return mapped ? String.fromCodePoint(mapped) : null;
  }
  return String.fromCodePoint(codePoint);
}

/**
 * Safely decodes HTML entities (including single/double-escaped numeric entities like
 * `&#2495;`, `&#x09BF;`, and `&amp;#2495;`) in plain-text strings exactly once to UTF-8.
 * Intended for plain-text inputs that will either be rendered via `.textContent` / React text
 * or subsequently passed through `escapeHtml(...)`.
 */
export function decodeHtmlEntities(
  input: string,
  options: { preserveNewlines?: boolean } = {}
): string {
  if (!input || typeof input !== 'string') return '';

  let current = input;
  const entityRegex = /&(?:#(\d{1,7})|#x([0-9a-fA-F]{1,6})|([a-zA-Z][a-zA-Z0-9]{1,12}));/g;

  // Bounded unwrap (up to 3 passes) catches double-escaped entities like &amp;#2495; or &amp;quot;
  for (let pass = 0; pass < 3; pass += 1) {
    let changed = false;
    const next = current.replace(
      entityRegex,
      (fullMatch, decStr?: string, hexStr?: string, named?: string) => {
        if (decStr) {
          const decoded = safeFromCodePoint(parseInt(decStr, 10));
          if (decoded !== null) {
            changed = true;
            return decoded;
          }
          return fullMatch;
        }
        if (hexStr) {
          const decoded = safeFromCodePoint(parseInt(hexStr, 16));
          if (decoded !== null) {
            changed = true;
            return decoded;
          }
          return fullMatch;
        }
        if (named) {
          const mapped = NAMED_HTML_ENTITIES[named.toLowerCase()];
          if (mapped !== undefined) {
            changed = true;
            return mapped;
          }
        }
        return fullMatch;
      }
    );
    current = next;
    if (!changed) break;
  }

  current = current.replace(/\u00a0/g, ' ');
  if (options.preserveNewlines) {
    return current.replace(/\r\n?/g, '\n').trim();
  }
  return current.replace(/\s+/g, ' ').trim();
}

/**
 * Repairs numeric HTML entities representing non-ASCII Unicode scalar characters (>= U+0100),
 * including Bengali script (`&#2432;`..`&#2559;`, `&#x0980;`..`&#x09FF`), emojis, and typography,
 * even when double/triple escaped (`&amp;#2495;`).
 *
 * Security & syntax guarantee: Never decodes ASCII metacharacters (`<`, `>`, `&`, `"`, `'`, `\`),
 * control characters, or U+2028/U+2029, making it safe to run across complete HTML templates and `<script>` blocks.
 */
export function repairNonAsciiHtmlEntities(html: string): string {
  if (!html || typeof html !== 'string' || !html.includes('#')) {
    return html || '';
  }

  return html.replace(
    /&(?:amp;){0,3}(?:#(\d{1,7})|#x([0-9a-fA-F]{1,6}));/gi,
    (fullMatch, decStr?: string, hexStr?: string) => {
      const cp = decStr ? parseInt(decStr, 10) : hexStr ? parseInt(hexStr, 16) : NaN;
      if (
        !Number.isInteger(cp) ||
        cp < 0x0100 ||
        cp > 0x10ffff ||
        (cp >= 0xd800 && cp <= 0xdfff) ||
        cp === 0x2028 ||
        cp === 0x2029
      ) {
        return fullMatch;
      }
      return String.fromCodePoint(cp);
    }
  );
}

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
 * Decodes existing HTML entities once beforehand so inputs never double-escape.
 */
export function formatCaptionToHtml(caption: string): string {
  if (!caption) return '';

  const normalized = decodeHtmlEntities(caption, { preserveNewlines: true });
  if (!normalized) return '';

  // Split by double newline for paragraphs, and single newline for <br />
  const paragraphs = normalized
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
 * Strips HTML tags and decodes HTML entities for plain text display / title generation.
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  const withoutTags = html.replace(/<[^>]*>?/gm, '');
  return decodeHtmlEntities(withoutTags, { preserveNewlines: true });
}
