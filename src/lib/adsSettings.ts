import { escapeHtml } from './sanitizer';

export interface SmartLinkAdConfig {
  enabled: boolean;
  url: string;
}

export interface DirectLinkAdConfig {
  enabled: boolean;
  url: string;
}

export interface PopupAdConfig {
  enabled: boolean;
  url: string;
}

export interface BannerAdConfig {
  enabled: boolean;
  imageUrl: string;
  clickUrl: string;
}

export interface AdsSettings {
  smartLink: SmartLinkAdConfig;
  directLink: DirectLinkAdConfig;
  popupAd: PopupAdConfig;
  bannerAd: BannerAdConfig;
  updatedAt?: string;
}

export const DEFAULT_ADS_SETTINGS: AdsSettings = {
  smartLink: {
    enabled: true,
    url: 'https://cheflobesofficer.com/b1b9djat?key=a45917b862f040650d5da9b0f6ceac52',
  },
  directLink: {
    enabled: true,
    url: 'https://www.effectivecpmnetwork.com/b1b9djat?key=a45917b862f040650d5da9b0f6ceac52',
  },
  popupAd: {
    enabled: true,
    url: 'https://pl30161573.effectivecpmnetwork.com/bc/17/d1/bc17d177bcada949929a7511850a6cf0.js',
  },
  bannerAd: {
    enabled: false,
    imageUrl: '',
    clickUrl: '',
  },
};

export const EMPTY_ADS_SETTINGS: AdsSettings = {
  smartLink: { enabled: false, url: '' },
  directLink: { enabled: false, url: '' },
  popupAd: { enabled: false, url: '' },
  bannerAd: { enabled: false, imageUrl: '', clickUrl: '' },
};

const STORAGE_KEY_ADS_GLOBAL = 'blogger_ads_settings_v1';
const getAdsUserStorageKey = (uid: string) => `blogger_ads_settings_v1_${uid}`;

export interface AdUrlValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

/**
 * Validates an advertisement URL strictly:
 * - Empty string is allowed when field is optional/disabled.
 * - Rejects javascript:, vbscript:, data:, file:, embedded credentials, quotes, or angle brackets.
 * - Requires http: or https: with a valid hostname.
 */
export function validateAdUrl(rawUrl?: string | null): AdUrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: true, normalized: '' };
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: true, normalized: '' };
  }

  if (/[<>"'\s]/.test(trimmed)) {
    return { valid: false, normalized: '', error: 'URL contains invalid whitespace or characters.' };
  }

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:')
  ) {
    return { valid: false, normalized: '', error: 'Only http:// or https:// URLs are permitted.' };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, normalized: '', error: 'URL must start with https:// or http://.' };
    }
    if (parsed.username || parsed.password) {
      return { valid: false, normalized: '', error: 'URL must not contain embedded credentials.' };
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return { valid: false, normalized: '', error: 'Please enter a valid domain name.' };
    }
    return { valid: true, normalized: parsed.toString() };
  } catch {
    return { valid: false, normalized: '', error: 'Invalid URL format. Include https:// prefix.' };
  }
}

export function isValidAdUrl(rawUrl?: string | null): boolean {
  const res = validateAdUrl(rawUrl);
  return res.valid && res.normalized.length > 0;
}

export function sanitizeAdsSettings(raw?: unknown): AdsSettings {
  if (!raw || typeof raw !== 'object') {
    return {
      smartLink: { ...DEFAULT_ADS_SETTINGS.smartLink },
      directLink: { ...DEFAULT_ADS_SETTINGS.directLink },
      popupAd: { ...DEFAULT_ADS_SETTINGS.popupAd },
      bannerAd: { ...DEFAULT_ADS_SETTINGS.bannerAd },
    };
  }

  const obj = raw as Record<string, unknown>;

  const pickLink = (
    section: unknown,
    fallback: { enabled: boolean; url: string }
  ): { enabled: boolean; url: string } => {
    if (!section || typeof section !== 'object') {
      return { ...fallback };
    }
    const rec = section as Record<string, unknown>;
    const urlCheck = validateAdUrl(typeof rec.url === 'string' ? rec.url : '');
    const cleanUrl = urlCheck.valid ? urlCheck.normalized : '';
    const enabled = Boolean(rec.enabled) && cleanUrl.length > 0;
    return { enabled, url: cleanUrl };
  };

  const bannerRaw =
    obj.bannerAd && typeof obj.bannerAd === 'object'
      ? (obj.bannerAd as Record<string, unknown>)
      : null;

  const imgCheck = validateAdUrl(bannerRaw && typeof bannerRaw.imageUrl === 'string' ? bannerRaw.imageUrl : '');
  const clickCheck = validateAdUrl(bannerRaw && typeof bannerRaw.clickUrl === 'string' ? bannerRaw.clickUrl : '');
  const cleanBannerImg = imgCheck.valid ? imgCheck.normalized : '';
  const cleanBannerClick = clickCheck.valid ? clickCheck.normalized : '';
  const bannerEnabled = Boolean(bannerRaw?.enabled) && cleanBannerImg.length > 0;

  return {
    smartLink: pickLink(obj.smartLink, DEFAULT_ADS_SETTINGS.smartLink),
    directLink: pickLink(obj.directLink, DEFAULT_ADS_SETTINGS.directLink),
    popupAd: pickLink(obj.popupAd, DEFAULT_ADS_SETTINGS.popupAd),
    bannerAd: {
      enabled: bannerEnabled,
      imageUrl: cleanBannerImg,
      clickUrl: cleanBannerClick,
    },
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : undefined,
  };
}

/**
 * Detects unmodified legacy templates so upgrading the default Master HTML Template
 * replaces cached old defaults seamlessly while preserving truly customized user templates.
 */
export function isLegacyDefaultTemplate(template?: string | null): boolean {
  if (!template || typeof template !== 'string') return false;
  const trimmed = template.trim();
  if (!trimmed) return false;
  const hasNewMarkers =
    trimmed.includes('bn-player-heading') ||
    trimmed.includes('BUTTON_CLICK_CONFIG') ||
    trimmed.includes('initLazyAds');
  if (hasNewMarkers) return false;

  return (
    trimmed.includes('MAIN_AD_LINK') &&
    (trimmed.includes('Loading premium content...') ||
      trimmed.includes('https://cheflobesofficer.com/b1b9djat?key=a45917b862f040650d5da9b0f6ceac52'))
  );
}

export function loadAdsSettings(userId?: string): AdsSettings {
  if (typeof window === 'undefined') {
    return sanitizeAdsSettings(DEFAULT_ADS_SETTINGS);
  }
  try {
    const raw =
      (userId ? localStorage.getItem(getAdsUserStorageKey(userId)) : null) ||
      localStorage.getItem(STORAGE_KEY_ADS_GLOBAL);
    if (!raw) {
      return sanitizeAdsSettings(DEFAULT_ADS_SETTINGS);
    }
    return sanitizeAdsSettings(JSON.parse(raw));
  } catch {
    return sanitizeAdsSettings(DEFAULT_ADS_SETTINGS);
  }
}

export function saveAdsSettings(settings: AdsSettings, userId?: string): AdsSettings {
  const normalized = sanitizeAdsSettings({
    ...settings,
    updatedAt: new Date().toISOString(),
  });
  if (typeof window !== 'undefined') {
    try {
      const payload = JSON.stringify(normalized);
      localStorage.setItem(STORAGE_KEY_ADS_GLOBAL, payload);
      if (userId) {
        localStorage.setItem(getAdsUserStorageKey(userId), payload);
      }
    } catch {
      // ignore storage quota errors
    }
  }
  return normalized;
}

function isScriptAdUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname.toLowerCase().endsWith('.js');
  } catch {
    return /\.js(\?|#|$)/i.test(url);
  }
}

function escapeJsString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');
}

/**
 * Applies the active Ads Settings cleanly to the rendered Blogger HTML:
 * - Smart Link URL -> #btn1 (and legacy MAIN_AD_LINK if custom template)
 * - Direct Link URL -> #btn2 (and legacy LINKS if custom template)
 * - Pop-up Ad URL -> <head> external script when ending in .js, or user-click POPUP_AD_CONFIG when regular URL
 * - Banner Image URL + Banner Click URL -> #ad-bottom-banner (placed after Main Image & player so Main Image stays #1 Blogger thumbnail)
 *
 * Empty or disabled ads NEVER produce broken <a>, <img>, or <script> tags,
 * and every enabled ad is injected strictly once.
 */
export function applyAdsSettingsToHtml(html: string, rawAdsSettings?: AdsSettings | null): string {
  if (!html) return html;

  const settings = rawAdsSettings ? sanitizeAdsSettings(rawAdsSettings) : sanitizeAdsSettings(DEFAULT_ADS_SETTINGS);

  const smartActive = settings.smartLink.enabled && isValidAdUrl(settings.smartLink.url);
  const directActive = settings.directLink.enabled && isValidAdUrl(settings.directLink.url);
  const popupActive = settings.popupAd.enabled && isValidAdUrl(settings.popupAd.url);
  const bannerActive = settings.bannerAd.enabled && isValidAdUrl(settings.bannerAd.imageUrl);
  const bannerClickActive = bannerActive && isValidAdUrl(settings.bannerAd.clickUrl);

  let output = html;

  // 1. Always strip previous app-managed ad tags & default popup script so disabled/deleted ads never linger
  output = output
    .replace(/<script\b[^>]*\bdata-app-ad=["'][^"']*["'][^>]*>[\s\S]*?<\/script>\s*/gi, '')
    .replace(/<script\b[^>]*\bsrc=["']https:\/\/pl30161573\.effectivecpmnetwork\.com\/bc\/17\/d1\/bc17d177bcada949929a7511850a6cf0\.js["'][^>]*>[\s\S]*?<\/script>\s*/gi, '')
    .replace(/<div\b[^>]*\bdata-app-ad=["']banner["'][^>]*>[\s\S]*?<\/div>\s*/gi, '');

  // 2. Smart Link & Direct Link configuration in BUTTON_CLICK_CONFIG (new Master Template)
  const smartLiteral = smartActive ? `"${escapeJsString(settings.smartLink.url)}"` : '""';
  const directLiteral = directActive ? `"${escapeJsString(settings.directLink.url)}"` : '""';

  if (/\bBUTTON_CLICK_CONFIG\b/.test(output)) {
    output = output.replace(
      /(btn1\s*:\s*\{[\s\S]*?\benabled\s*:\s*)(?:true|false)([\s\S]*?\burl\s*:\s*)(?:"[^"]*"|'[^']*')([\s\S]*?\btriggerPlayback\s*:\s*)(?:true|false)/,
      `$1${smartActive ? 'true' : 'false'}$2${smartLiteral}$3true`
    );

    output = output.replace(
      /(btn2\s*:\s*\{[\s\S]*?\benabled\s*:\s*)(?:true|false)([\s\S]*?\burl\s*:\s*)(?:"[^"]*"|'[^']*')([\s\S]*?\btriggerPlayback\s*:\s*)(?:true|false)/,
      `$1${directActive ? 'true' : 'false'}$2${directLiteral}$3${directActive ? 'false' : 'true'}`
    );
  } else {
    // Support legacy/custom templates using MAIN_AD_LINK / LINKS
    if (/\bMAIN_AD_LINK\b/.test(output)) {
      output = output.replace(
        /(\bconst\s+MAIN_AD_LINK\s*=\s*)(?:"[^"]*"|'[^']*')/g,
        `$1${smartLiteral}`
      );
    }
    if (/\bconst\s+LINKS\s*=/.test(output)) {
      const linksLiteral = directActive ? `["${escapeJsString(settings.directLink.url)}"]` : '[]';
      output = output.replace(/\bconst\s+LINKS\s*=\s*\[[\s\S]*?\]/g, `const LINKS = ${linksLiteral}`);
    }
  }

  // 3. Pop-up Ad configuration
  const isPopupJsScript = popupActive && isScriptAdUrl(settings.popupAd.url);
  const isPopupPageUrl = popupActive && !isPopupJsScript;

  if (/\bPOPUP_AD_CONFIG\b/.test(output)) {
    const popupUrlLiteral = isPopupPageUrl ? `"${escapeJsString(settings.popupAd.url)}"` : '""';
    output = output.replace(
      /(\bPOPUP_AD_CONFIG\s*=\s*\{[\s\S]*?\benabled\s*:\s*)(?:true|false)([\s\S]*?\burl\s*:\s*)(?:"[^"]*"|'[^']*')/,
      `$1${isPopupPageUrl ? 'true' : 'false'}$2${popupUrlLiteral}`
    );
  } else if (isPopupPageUrl) {
    const customPopupScript = `<script data-app-ad="popup-runtime">
(function(){
  if (window.__appPopupBound) return;
  window.__appPopupBound = true;
  var lastPopupAt = 0;
  var popupUrl = "${escapeJsString(settings.popupAd.url)}";
  document.addEventListener('click', function(e) {
    if (!e || e.isTrusted === false) return;
    var target = e.target && e.target.closest ? e.target.closest('#playIcon, #videoContainer, #retryPlayBtn, .play-icon') : null;
    if (!target) return;
    var now = Date.now();
    if (now - lastPopupAt < 15000) return;
    lastPopupAt = now;
    window.open(popupUrl, '_blank', 'noopener,noreferrer');
  });
})();
</script>`;
    if (/<\/body>/i.test(output)) {
      output = output.replace(/<\/body>/i, () => `  ${customPopupScript}\n</body>`);
    } else {
      output = `${output}\n${customPopupScript}`;
    }
  }

  if (isPopupJsScript) {
    const safePopupSrc = escapeHtml(settings.popupAd.url);
    const popupScriptTag = `<script src="${safePopupSrc}" data-app-ad="popup-script"></script>`;
    if (/<head\b[^>]*>/i.test(output)) {
      output = output.replace(/<head\b[^>]*>/i, (m) => `${m}\n  ${popupScriptTag}`);
    } else {
      output = `${popupScriptTag}\n${output}`;
    }
  }

  // 4. Banner Ad configuration (placed inside #ad-bottom-banner so Main Image .separator stays first)
  if (bannerActive) {
    const safeImgUrl = escapeHtml(settings.bannerAd.imageUrl);
    const imgHtml = `<img src="${safeImgUrl}" alt="Sponsored Banner" loading="lazy" style="max-width:100%;height:auto;display:block;margin:0 auto;border-radius:8px;" />`;
    const bannerInnerHtml = bannerClickActive
      ? `<div data-app-ad="banner" style="width:100%;text-align:center;"><a href="${escapeHtml(
          settings.bannerAd.clickUrl
        )}" target="_blank" rel="noopener noreferrer sponsored" style="display:inline-block;max-width:100%;">${imgHtml}</a></div>`
      : `<div data-app-ad="banner" style="width:100%;text-align:center;">${imgHtml}</div>`;

    const bottomSlotRx = /(<aside\b[^>]*\bdata-ad-slot=["']bottom-banner["'][^>]*>[\s\S]*?<div\b[^>]*\bid=["']ad-bottom-banner["'][^>]*>)([\s\S]*?)(<\/div>\s*<\/aside>)/i;
    if (bottomSlotRx.test(output)) {
      output = output.replace(bottomSlotRx, (_m, openTag: string, _inner: string, closeTag: string) => {
        return `${openTag}\n      ${bannerInnerHtml}\n    ${closeTag}`;
      });
    } else {
      const standaloneBanner = `<aside class="ad-slot-wrapper ad-slot--banner" data-app-ad="banner" aria-label="Sponsored Banner" style="margin:18px auto;text-align:center;">${bannerInnerHtml}</aside>`;
      if (/<\/body>/i.test(output)) {
        output = output.replace(/<\/body>/i, () => `  ${standaloneBanner}\n</body>`);
      } else {
        output = `${output}\n${standaloneBanner}`;
      }
    }
  }

  return output.replace(/\n{3,}/g, '\n\n').trim();
}
