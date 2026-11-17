package com.aistudio.bloggerautopublisher.util

import java.net.URI
import java.util.Locale

data class SanitizedImportedHtmlResult(
    val html: String,
    val plainText: String,
    val images: List<ThumbnailCandidate>
)

/**
 * Android-side Imported HTML Sanitizer matching the Web sanitization rules:
 * 1. Strips all external <script>, <style>, <noscript>, <iframe>, <object>, <embed>, <button>, <form>, and inline JS handlers.
 * 2. Removes all external Smart Links, Direct Links, popup/redirect URLs, ad-network URLs, and foreign Blogger site links.
 * 3. Unwraps clickable <a> links wrapping imported <img> elements (JPG & PNG banners), keeping images preserved and non-clickable.
 * 4. Removes imported .video-container / .controls / .play-icon / .loading-screen / #container-* blocks while harvesting genuine hero JPG candidates.
 * 5. Preserves legitimate article text, headings, paragraphs, lists, formatting, JPG images, and PNG images.
 * 6. Neutralizes template placeholders ({{TITLE}}, {{IMAGE_URL}}, etc.) so imported HTML cannot override Master Template config.
 */
object ImportedHtmlSanitizer {

    private val AD_BANNER_PATH_OR_HOST_REGEX = Regex(
        "(banner|promo|sponsor|adsense|adsterra|propeller|cpmnetwork|highperformanceformat|effectivecpm|728x90|300x250|320x50|160x600|468x60|970x90|aff[_-]?banner)",
        RegexOption.IGNORE_CASE
    )

    private val TRACKING_OR_AD_HOST_REGEX = Regex(
        "(^|\\.)(doubleclick\\.net|googlesyndication\\.com|googleadservices\\.com|google-analytics\\.com|googletagmanager\\.com|googletagservices\\.com|facebook\\.com|connect\\.facebook\\.net|statcounter\\.com|histats\\.com|feedburner\\.com|quantserve\\.com|scorecardresearch\\.com|adnxs\\.com|criteo\\.(com|net)|pubmatic\\.com|rubiconproject\\.com|openx\\.net|taboola\\.com|outbrain\\.com|mgid\\.com|adsterra\\.com|effectivecpmnetwork\\.com|highperformanceformat\\.com|cheflobesofficer\\.com|profitablegatecpm\\.com|profitablecpmrate\\.com|effectiveratecpm\\.com|highcpmgate\\.com|highrevenuegate\\.com|toprevenuegate\\.com|topcreativeformat\\.com|gatetocpm\\.com|wayfarerorthodox\\.com|cpmnetwork\\.[a-z]{2,}|propellerads\\.com|onclickalgo\\.[a-z]{2,}|onclickads\\.[a-z]{2,}|popads\\.net|popcash\\.net|adcash\\.com|monetag\\.com|hilltopads\\.[a-z]{2,}|exoclick\\.com|trafficjunky\\.[a-z]{2,}|juicyads\\.com|clickadu\\.[a-z]{2,}|galaksion\\.[a-z]{2,}|admaven\\.[a-z]{2,}|evadav\\.[a-z]{2,}|richads\\.[a-z]{2,}|amazon-adsystem\\.com|assoc-amazon\\.com|media\\.net|revcontent\\.com)$",
        RegexOption.IGNORE_CASE
    )

    private val AFFILIATE_OR_SHORTENER_HOST_REGEX = Regex(
        "(^|\\.)(amzn\\.to|amzn\\.eu|amzn\\.in|a\\.co|click\\.linksynergy\\.com|anrdoezrs\\.net|dpbolvw\\.net|jdoqocy\\.com|tkqlhce\\.com|kqzyfj\\.com|shareasale\\.com|awin1\\.com|gopjn\\.com|pntra\\.com|pjatr\\.com|pjtra\\.com|avantlink\\.com|go\\.redirectingat\\.com|go\\.skimresources\\.com|rstyle\\.me|howl\\.me|shop-links\\.co|magik\\.ly|bit\\.ly|tinyurl\\.com|goo\\.gl|t\\.co|ow\\.ly|is\\.gd|buff\\.ly|rebrand\\.ly|cutt\\.ly|shorturl\\.at|rb\\.gy|ouo\\.(io|press)|shrinkme\\.io|exe\\.io|linkvertise\\.com|adf\\.ly|bc\\.vc|za\\.gl|gplinks\\.co|droplink\\.co|mdisk\\.me)$",
        RegexOption.IGNORE_CASE
    )

    private val AD_QUERY_PARAM_NAMES = setOf(
        "aff", "aff_id", "affiliate", "affiliate_id", "ascsubtag", "irclickid",
        "clickid", "ranmid", "raneaid", "ransiteid", "skimlinks", "zoneid",
        "bannerid", "subid", "pubid", "adurl", "ad_id", "pop", "popunder",
        "smartlink", "directlink"
    )

    private val AD_URL_PATH_REGEX = Regex(
        "(/smart[-_]?link|/direct[-_]?link|/afu\\.php|/pop\\.php|/popunder|/popup|/adclick|/ad[-_]?redirect|/invoke\\.js|/click[-_]?track)",
        RegexOption.IGNORE_CASE
    )

    private val PROMO_CTA_TEXT_REGEX = Regex(
        "^(buy now|shop now|check price|get deal|claim offer|download now|free download|download|play now|watch now|play\\s*&\\s*watch|watch full video|full video|watch video|click here|continue|open link|skip ad|visit link|subscribe now|join telegram|follow us|advertisement|sponsored|sponsored banner|recommended partner|player sponsor|sponsored content|sponsored suggestion|loading premium content\\.{0,3}|▶\\uFE0F?|ভিডিওটি চালু করুন|এখনই দেখুন|পুরো ভিডিও দেখুন|ডাউনলোড করুন|ক্লিক করুন|নিচে Scroll করুন)$",
        RegexOption.IGNORE_CASE
    )

    private val PLAYER_OR_AD_BLOCK_REGEX = Regex(
        "<(?:div|aside|section)\\b[^>]*\\b(?:class\\s*=\\s*(?:\"[^\"]*\\b(?:video-container|controls|play-icon|loading-screen|playback-error-screen|play-center-group|bn-player-heading-wrap|live-viewer-badge|scroll-indicator-wrap|related-section|ad-slot-wrapper|ad-fallback|adsbygoogle|adsterra|effectivecpmnetwork)\\b[^\"]*\"|'[^']*\\b(?:video-container|controls|play-icon|loading-screen|playback-error-screen|play-center-group|bn-player-heading-wrap|live-viewer-badge|scroll-indicator-wrap|related-section|ad-slot-wrapper|ad-fallback|adsbygoogle|adsterra|effectivecpmnetwork)\\b[^']*')|id\\s*=\\s*(?:\"container-[^\"]+\"|'container-[^']+'|\"ad-[^\"]+\"|'ad-[^']+'|\"(?:playIcon|loadingScreen|playbackErrorScreen|videoContainer|playCenterGroup|liveViewerCount)\"|'(?:playIcon|loadingScreen|playbackErrorScreen|videoContainer|playCenterGroup|liveViewerCount)')|data-ad-(?:slot|client)\\s*=|data-app-ad\\s*=)[^>]*>(?:(?!</?(?:div|aside|section)\\b)[\\s\\S])*?(?:<(?:div|aside|section)\\b[^>]*>(?:(?!</?(?:div|aside|section)\\b)[\\s\\S])*?</(?:div|aside|section)>(?:(?!</?(?:div|aside|section)\\b)[\\s\\S])*?)*</(?:div|aside|section)>",
        RegexOption.IGNORE_CASE
    )

    private val DANGEROUS_PAIR_TAG_REGEX = Regex(
        "<(script|style|noscript|iframe|frame|frameset|object|embed|applet|form|button|svg|canvas|head|title|template)\\b[^>]*>[\\s\\S]*?</\\1>",
        RegexOption.IGNORE_CASE
    )

    private val DANGEROUS_VOID_TAG_REGEX = Regex(
        "<(script|style|noscript|iframe|frame|embed|object|input|textarea|button|meta|link|base|param|area|track)\\b[^>]*/?>",
        RegexOption.IGNORE_CASE
    )

    private val INLINE_HANDLER_OR_PING_REGEX = Regex(
        "\\s+(?:on[a-z]+|ping|formaction)\\s*=\\s*(?:\"[^\"]*\"|'[^']*'|[^\\s>]+)",
        RegexOption.IGNORE_CASE
    )

    private val NOISE_TEXT_ELEMENT_REGEX = Regex(
        "<(?:p|div|span|h2)\\b[^>]*>\\s*(?:Loading premium content\\.{0,3}|Please allow pop-ups for this site[^<]*|▶\\uFE0F?|সম্পূর্ণ ভিডিওটি দেখতে প্লে বাটনে ক্লিক করুন|মোবাইল ও ডেস্কটপ উপযোগী এইচডি প্লেব্যাক|ভিডিও চালু করতে উপরের প্লে বাটনে চাপ দিন|নিচে Scroll করুন|সম্পর্কিত আরও ভিডিও)\\s*</(?:p|div|span|h2)>",
        RegexOption.IGNORE_CASE
    )

    fun neutralizeTemplatePlaceholders(html: String): String {
        if (html.isBlank()) return ""
        return html.replace(
            Regex("\\{\\{\\s*(TITLE|IMAGE_URL|THUMBNAIL_URL|CAPTION|PUBLISHED_DATE)\\s*\\}\\}", RegexOption.IGNORE_CASE),
            ""
        )
    }

    fun isExternalBloggerSiteHref(href: String, sourceBlogHost: String? = null): Boolean {
        return try {
            val normalized = if (href.startsWith("//")) "https:$href" else href
            val uri = URI(normalized)
            val host = uri.host?.lowercase(Locale.US) ?: return false
            val path = uri.path?.lowercase(Locale.US).orEmpty()

            if (host.contains("googleusercontent.com") || host.endsWith("bp.blogspot.com")) {
                return false
            }

            if (!sourceBlogHost.isNullOrBlank()) {
                val normSrc = sourceBlogHost.lowercase(Locale.US).removePrefix("www.")
                val normHref = host.removePrefix("www.")
                if (normSrc == normHref) return true
            }

            if (host.endsWith(".blogspot.com") || host == "blogger.com" || host.endsWith(".blogger.com")) {
                return true
            }

            path.startsWith("/search/label/") || path == "/feeds/posts/default"
        } catch (_: Exception) {
            false
        }
    }

    fun isAdOrSmartLinkUrl(rawHref: String?): Boolean {
        if (rawHref.isNullOrBlank()) return false
        val trimmed = rawHref.trim()
        val lower = trimmed.lowercase(Locale.US)

        if (lower.startsWith("javascript:") || lower.startsWith("vbscript:") || lower.startsWith("data:text/")) {
            return true
        }

        return try {
            val normalized = if (trimmed.startsWith("//")) "https:$trimmed" else trimmed
            val uri = URI(normalized)
            val host = uri.host?.lowercase(Locale.US) ?: return false
            val path = uri.path.orEmpty()

            if (TRACKING_OR_AD_HOST_REGEX.containsMatchIn(host) || AFFILIATE_OR_SHORTENER_HOST_REGEX.containsMatchIn(host)) {
                return true
            }

            if (AD_URL_PATH_REGEX.containsMatchIn(path)) {
                return true
            }

            val rawQuery = uri.rawQuery.orEmpty()
            if (rawQuery.isNotEmpty()) {
                val isAmazonHost = Regex("(^|\\.)amazon\\.[a-z.]{2,}$", RegexOption.IGNORE_CASE).containsMatchIn(host)
                for (pair in rawQuery.split('&')) {
                    val parts = pair.split('=', limit = 2)
                    val key = parts[0].lowercase(Locale.US)
                    val value = if (parts.size > 1) parts[1] else ""
                    if (key == "key" && Regex("^[a-f0-9_-]{16,}$", RegexOption.IGNORE_CASE).matches(value)) {
                        return true
                    }
                    if (AD_QUERY_PARAM_NAMES.contains(key) || (isAmazonHost && key == "tag")) {
                        return true
                    }
                }
            }
            false
        } catch (_: Exception) {
            false
        }
    }

    private fun isBannerDimension(width: Int?, height: Int?): Boolean {
        if (width == null || height == null) return false
        return (width == 728 && height == 90) ||
            (width == 300 && height == 250) ||
            (width == 320 && height == 50) ||
            (width == 160 && height == 600) ||
            (width == 468 && height == 60) ||
            (width == 970 && (height == 90 || height == 250)) ||
            (width == 336 && height == 280)
    }

    private fun normalizeUrl(rawUrl: String?, baseUrl: String?): String? {
        if (rawUrl.isNullOrBlank()) return null
        var candidate = rawUrl.trim()
        val lower = candidate.lowercase(Locale.US)
        if (lower.startsWith("javascript:") || lower.startsWith("vbscript:") || lower.startsWith("blob:") ||
            lower.startsWith("file:") || lower.startsWith("data:text/") || lower.startsWith("data:image/svg+xml")
        ) {
            return null
        }
        if (lower.startsWith("data:image/")) {
            return if (lower.length < 180) null else candidate
        }
        if (candidate.startsWith("//")) {
            candidate = "https:$candidate"
        } else if (!candidate.startsWith("http://", ignoreCase = true) && !candidate.startsWith("https://", ignoreCase = true)) {
            if (baseUrl.isNullOrBlank()) return null
            return try {
                val normalizedBase = if (baseUrl.startsWith("http")) baseUrl else "https://$baseUrl"
                URI(normalizedBase).resolve(candidate).toString()
            } catch (_: Exception) {
                null
            }
        }
        return try {
            val uri = URI(candidate)
            if (uri.scheme?.equals("http", true) == true) {
                val host = uri.host?.lowercase(Locale.US).orEmpty()
                if (host.endsWith("googleusercontent.com") || host.endsWith("bp.blogspot.com") || host.endsWith("ggpht.com")) {
                    return "https" + candidate.substring(4)
                }
            }
            candidate
        } catch (_: Exception) {
            null
        }
    }

    fun sanitize(rawHtml: String, sourceUrl: String? = null): SanitizedImportedHtmlResult {
        if (rawHtml.isBlank()) {
            return SanitizedImportedHtmlResult(html = "", plainText = "", images = emptyList())
        }

        val sourceBlogHost = try {
            if (!sourceUrl.isNullOrBlank()) {
                val norm = if (sourceUrl.startsWith("http")) sourceUrl else "https://$sourceUrl"
                URI(norm).host?.lowercase(Locale.US)
            } else {
                null
            }
        } catch (_: Exception) {
            null
        }

        // Harvest #videoThumbnail / .video-container candidate before stripping player UI
        val rescuedImages = mutableListOf<ThumbnailCandidate>()
        val videoThumbMatch = Regex(
            "<img\\b([^>]*\\bid\\s*=\\s*(?:\"videoThumbnail\"|'videoThumbnail')[^>]*)>",
            RegexOption.IGNORE_CASE
        ).find(rawHtml)
        if (videoThumbMatch != null) {
            val attrs = videoThumbMatch.groupValues[1]
            val srcMatch = Regex("\\bsrc\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')", RegexOption.IGNORE_CASE).find(attrs)
            val normSrc = normalizeUrl(srcMatch?.let { it.groupValues[1].ifEmpty { it.groupValues[2] } }, sourceUrl)
            if (!normSrc.isNullOrBlank()) {
                rescuedImages.add(ThumbnailCandidate(src = normSrc))
            }
        }

        // 1. Strip comments, dangerous executable/embed tags, and player/ad containers
        var cleaned = rawHtml
            .replace(Regex("<!--[\\s\\S]*?-->"), "")
            .replace(DANGEROUS_PAIR_TAG_REGEX, "")
            .replace(DANGEROUS_VOID_TAG_REGEX, "")

        // Iteratively remove imported player & ad container blocks (including nested inner divs/asides/sections)
        repeat(4) {
            cleaned = cleaned.replace(PLAYER_OR_AD_BLOCK_REGEX, "")
        }

        cleaned = cleaned
            .replace(NOISE_TEXT_ELEMENT_REGEX, "")
            .replace(INLINE_HANDLER_OR_PING_REGEX, "")

        val srcAttrRx = Regex("\\bsrc\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", RegexOption.IGNORE_CASE)
        val srcsetAttrRx = Regex("\\b(?:data-)?srcset\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')", RegexOption.IGNORE_CASE)
        val altAttrRx = Regex("\\balt\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')", RegexOption.IGNORE_CASE)
        val widthAttrRx = Regex("\\bwidth\\s*=\\s*(?:\"(\\d+)\"|'(\\d+)'|(\\d+))", RegexOption.IGNORE_CASE)
        val heightAttrRx = Regex("\\bheight\\s*=\\s*(?:\"(\\d+)\"|'(\\d+)'|(\\d+))", RegexOption.IGNORE_CASE)

        // 2. Clean <a> tags:
        // - Remove clickable ad banners completely
        // - Unwrap <a> wrapping genuine <img> so kept images are non-clickable
        // - Remove popup/javascript/ad/smart/direct/CTA links and foreign Blogger website links
        // - Preserve legitimate editorial links cleanly
        val anchorRegex = Regex("<a\\b([^>]*)>([\\s\\S]*?)</a>", RegexOption.IGNORE_CASE)
        val hrefRegex = Regex("\\bhref\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", RegexOption.IGNORE_CASE)
        val titleAttrRegex = Regex("\\btitle\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')", RegexOption.IGNORE_CASE)

        cleaned = anchorRegex.replace(cleaned) { match ->
            val attrs = match.groupValues[1]
            val innerHtml = match.groupValues[2]
            val rawHref = hrefRegex.find(attrs)?.let {
                it.groupValues[1].ifEmpty { it.groupValues[2].ifEmpty { it.groupValues[3] } }
            }.orEmpty()
            val normalizedHref = normalizeUrl(rawHref, sourceUrl)

            if (Regex("<img\\b", RegexOption.IGNORE_CASE).containsMatchIn(innerHtml)) {
                val innerImgMatch = Regex("<img\\b([^>]*)>", RegexOption.IGNORE_CASE).find(innerHtml)
                val imgAttrs = innerImgMatch?.groupValues?.getOrElse(1) { "" }.orEmpty()
                val imgRawSrc = srcAttrRx.find(imgAttrs)?.let {
                    it.groupValues[1].ifEmpty { it.groupValues[2].ifEmpty { it.groupValues[3] } }
                }.orEmpty()
                val imgAlt = altAttrRx.find(imgAttrs)?.let { it.groupValues[1].ifEmpty { it.groupValues[2] } }.orEmpty()
                val w = widthAttrRx.find(imgAttrs)?.let {
                    (it.groupValues[1].ifEmpty { it.groupValues[2].ifEmpty { it.groupValues[3] } }).toIntOrNull()
                }
                val h = heightAttrRx.find(imgAttrs)?.let {
                    (it.groupValues[1].ifEmpty { it.groupValues[2].ifEmpty { it.groupValues[3] } }).toIntOrNull()
                }

                val isAdHref = normalizedHref != null && (
                    isAdOrSmartLinkUrl(normalizedHref) ||
                        isExternalBloggerSiteHref(normalizedHref, sourceBlogHost)
                    )
                val isBannerImg = AD_BANNER_PATH_OR_HOST_REGEX.containsMatchIn(imgRawSrc) ||
                    AD_BANNER_PATH_OR_HOST_REGEX.containsMatchIn(imgAlt) ||
                    isBannerDimension(w, h)

                if (isAdHref && isBannerImg) {
                    ""
                } else {
                    innerHtml.replace(Regex(">\\s*(Play Now|Watch Now|Play\\s*&\\s*Watch|Click Here|Download Now)\\s*<", RegexOption.IGNORE_CASE), "><")
                }
            } else {
                val plainAnchorText = innerHtml.replace(Regex("<[^>]*>"), "").replace(Regex("\\s+"), " ").trim()

                if (
                    normalizedHref.isNullOrBlank() ||
                    isAdOrSmartLinkUrl(normalizedHref) ||
                    isExternalBloggerSiteHref(normalizedHref, sourceBlogHost)
                ) {
                    if (plainAnchorText.isEmpty() || PROMO_CTA_TEXT_REGEX.matches(plainAnchorText)) {
                        ""
                    } else {
                        innerHtml
                    }
                } else if (PROMO_CTA_TEXT_REGEX.matches(plainAnchorText)) {
                    ""
                } else {
                    val safeTitle = titleAttrRegex.find(attrs)?.let { it.groupValues[1].ifEmpty { it.groupValues[2] } }
                    val titlePart = if (!safeTitle.isNullOrBlank()) """ title="${safeTitle.replace("\"", "&quot;")}"""" else ""
                    """<a href="$normalizedHref"$titlePart target="_blank" rel="noopener noreferrer">$innerHtml</a>"""
                }
            }
        }

        // 2b. Validate & preserve safe article <video>/<audio> media elements (outside stripped .video-container)
        val mediaRegex = Regex("<(video|audio)\\b([^>]*)>([\\s\\S]*?)</\\1>", RegexOption.IGNORE_CASE)
        val posterAttrRx = Regex("\\bposter\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')", RegexOption.IGNORE_CASE)
        val sourceTagRx = Regex("<source\\b([^>]*)>", RegexOption.IGNORE_CASE)

        cleaned = mediaRegex.replace(cleaned) { match ->
            val tag = match.groupValues[1].lowercase(Locale.US)
            val attrs = match.groupValues[2]
            val inner = match.groupValues[3]

            val directSrc = srcAttrRx.find(attrs)?.let {
                it.groupValues[1].ifEmpty { it.groupValues[2].ifEmpty { it.groupValues[3] } }
            }
            val cleanDirectSrc = normalizeUrl(directSrc, sourceUrl)
                ?.takeIf { it.startsWith("https://", ignoreCase = true) || it.startsWith("http://", ignoreCase = true) }
            val cleanPoster = normalizeUrl(
                posterAttrRx.find(attrs)?.let { it.groupValues[1].ifEmpty { it.groupValues[2] } },
                sourceUrl
            )?.takeIf { it.startsWith("https://", ignoreCase = true) || it.startsWith("http://", ignoreCase = true) }

            val validSources = mutableListOf<String>()
            for (srcMatch in sourceTagRx.findAll(inner)) {
                val sAttrs = srcMatch.groupValues[1]
                val sUrl = srcAttrRx.find(sAttrs)?.let {
                    it.groupValues[1].ifEmpty { it.groupValues[2].ifEmpty { it.groupValues[3] } }
                }
                val cleanSourceUrl = normalizeUrl(sUrl, sourceUrl)
                    ?.takeIf { it.startsWith("https://", ignoreCase = true) || it.startsWith("http://", ignoreCase = true) }
                if (!cleanSourceUrl.isNullOrBlank() && !isAdOrSmartLinkUrl(cleanSourceUrl)) {
                    val typeAttr = Regex("\\btype\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')", RegexOption.IGNORE_CASE)
                        .find(sAttrs)?.let { it.groupValues[1].ifEmpty { it.groupValues[2] } }
                    val safeType = if (!typeAttr.isNullOrBlank() && Regex("^[a-z0-9/+.-]+$", RegexOption.IGNORE_CASE).matches(typeAttr)) {
                        """ type="$typeAttr""""
                    } else ""
                    validSources.add("""<source src="$cleanSourceUrl"$safeType />""")
                }
            }

            if (cleanDirectSrc.isNullOrBlank() && validSources.isEmpty()) {
                ""
            } else {
                buildString {
                    append("<$tag controls preload=\"metadata\"")
                    if (!cleanDirectSrc.isNullOrBlank() && !isAdOrSmartLinkUrl(cleanDirectSrc)) {
                        append(""" src="$cleanDirectSrc"""")
                    }
                    if (tag == "video" && !cleanPoster.isNullOrBlank()) {
                        append(""" poster="$cleanPoster"""")
                    }
                    append(">")
                    append(validSources.joinToString(""))
                    append("</$tag>")
                }
            }
        }

        // 3. Validate <img> tags cleanly (drop ad/pixel images, strip style/class/id/on* attrs, keep clean src/srcset/alt/width/height)
        val collectedImages = mutableListOf<ThumbnailCandidate>()
        val seenImgSrcs = HashSet<String>()
        val imgRegex = Regex("<img\\b([^>]*)>", RegexOption.IGNORE_CASE)

        cleaned = imgRegex.replace(cleaned) { match ->
            val attrs = match.groupValues[1]
            val rawSrc = srcAttrRx.find(attrs)?.let {
                it.groupValues[1].ifEmpty { it.groupValues[2].ifEmpty { it.groupValues[3] } }
            }
            val cleanSrc = normalizeUrl(rawSrc, sourceUrl)
            if (cleanSrc.isNullOrBlank() || isAdOrSmartLinkUrl(cleanSrc)) {
                ""
            } else {
                val alt = altAttrRx.find(attrs)?.let { it.groupValues[1].ifEmpty { it.groupValues[2] } }.orEmpty()
                val srcset = srcsetAttrRx.find(attrs)?.let { it.groupValues[1].ifEmpty { it.groupValues[2] } }.orEmpty()
                val w = widthAttrRx.find(attrs)?.let {
                    (it.groupValues[1].ifEmpty { it.groupValues[2].ifEmpty { it.groupValues[3] } }).toIntOrNull()
                }
                val h = heightAttrRx.find(attrs)?.let {
                    (it.groupValues[1].ifEmpty { it.groupValues[2].ifEmpty { it.groupValues[3] } }).toIntOrNull()
                }

                if ((w != null && w <= 2) || (h != null && h <= 2)) {
                    ""
                } else if (isBannerDimension(w, h) && AD_BANNER_PATH_OR_HOST_REGEX.containsMatchIn(cleanSrc)) {
                    ""
                } else {
                    if (seenImgSrcs.add(cleanSrc)) {
                        collectedImages.add(
                            ThumbnailCandidate(
                                src = cleanSrc,
                                alt = alt,
                                width = w,
                                height = h,
                                index = collectedImages.size
                            )
                        )
                    }
                    buildString {
                        append("""<img src="$cleanSrc" alt="${alt.replace("\"", "&quot;")}" """)
                        if (srcset.isNotBlank()) append("""srcset="${srcset.replace("\"", "&quot;")}" """)
                        if (w != null && w > 2) append("""width="$w" """)
                        if (h != null && h > 2) append("""height="$h" """)
                        append("/>")
                    }
                }
            }
        }

        // 4. Strip unnecessary id / class / style attributes from kept elements to avoid Master Template CSS/JS collisions
        cleaned = cleaned
            .replace(Regex("\\s+(?:id|class|style|data-ad-[a-z-]+|data-app-ad)\\s*=\\s*(?:\"[^\"]*\"|'[^']*')", RegexOption.IGNORE_CASE), "")
            .replace(Regex("(?:<br\\s*/?>\\s*){3,}", RegexOption.IGNORE_CASE), "<br /><br />")
            .replace(Regex("\\n{3,}"), "\n\n")
            .trim()

        cleaned = neutralizeTemplatePlaceholders(cleaned)

        for (rescued in rescuedImages) {
            if (seenImgSrcs.add(rescued.src)) {
                collectedImages.add(rescued.copy(index = collectedImages.size))
            }
        }

        val plainText = cleaned
            .replace(Regex("<[^>]*>"), " ")
            .replace(Regex("\\s+"), " ")
            .trim()

        return SanitizedImportedHtmlResult(
            html = cleaned,
            plainText = plainText,
            images = collectedImages
        )
    }
}
