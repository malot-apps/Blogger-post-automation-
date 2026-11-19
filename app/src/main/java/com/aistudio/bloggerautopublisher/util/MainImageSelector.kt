package com.aistudio.bloggerautopublisher.util

import java.net.URI
import java.util.Locale

enum class ThumbnailCandidateRole {
    OG_IMAGE,
    METADATA,
    HERO,
    ARTICLE,
    MEDIA_THUMBNAIL
}

data class ThumbnailCandidate(
    val src: String,
    val alt: String = "",
    val title: String = "",
    val srcset: String? = null,
    val className: String = "",
    val id: String = "",
    val width: Int? = null,
    val height: Int? = null,
    val isAdOrUnrelated: Boolean = false,
    val role: ThumbnailCandidateRole? = null,
    val index: Int = 0
)

data class ImageUrlValidationResult(
    val valid: Boolean,
    val normalizedUrl: String? = null,
    val reason: String? = null
)

/**
 * Centralized Blogger Main Post Image & Thumbnail Selection Logic for Android.
 *
 * Rules enforced (100% parity with Web MainImageSelector):
 * 1. Prioritize original post metadata (og:image, twitter:image, JSON-LD) & top hero image;
 *    use media$thumbnail strictly as a fallback.
 * 2. Support valid JPG, JPEG, PNG, and WebP images. Prefer JPG/JPEG when available,
 *    but NEVER reject valid PNG or WebP images.
 * 3. Ignore advertisement images, tracking pixels, logos, icons, play buttons, badges, and UI assets.
 * 4. Preserve genuine article PNG images (infographics, charts, screenshots) inside post content.
 */
object MainImageSelector {

    val SUPPORTED_IMAGE_MIME_TYPES = setOf(
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/avif",
        "image/gif"
    )

    private val AD_OR_TRACKER_URL_REGEX = Regex(
        "(doubleclick\\.net|googlesyndication\\.com|googleadservices\\.com|google-analytics\\.com|googletagmanager\\.com|googletagservices\\.com|adnxs\\.com|criteo\\.|taboola\\.com|outbrain\\.com|mgid\\.com|adsterra\\.com|effectivecpmnetwork\\.com|highperformanceformat\\.com|cheflobesofficer\\.com|profitablegatecpm\\.com|profitablecpmrate\\.com|effectiveratecpm\\.com|highcpmgate\\.com|highrevenuegate\\.com|toprevenuegate\\.com|topcreativeformat\\.com|gatetocpm\\.com|wayfarerorthodox\\.com|propellerads\\.com|popads\\.net|popcash\\.net|adcash\\.com|monetag\\.com|hilltopads\\.|exoclick\\.com|trafficjunky\\.|juicyads\\.com|clickadu\\.|galaksion\\.|admaven\\.|evadav\\.|richads\\.|amazon-adsystem\\.com|media\\.net|revcontent\\.com|statcounter\\.com|histats\\.com|quantserve\\.com|scorecardresearch\\.com|feedburner\\.com/~r/|/tracker/)",
        RegexOption.IGNORE_CASE
    )

    private val ICON_CDN_HOST_REGEX = Regex(
        "(^|\\.)(flaticon\\.com|icons8\\.com|iconfinder\\.com|twemoji\\.maxcdn\\.com)$",
        RegexOption.IGNORE_CASE
    )

    private val AD_OR_UNRELATED_FILENAME_REGEX = Regex(
        "(^|[/_\\-.])(ad[-_]?banner|adsense|ad[-_]?slot|ad[-_]?unit|sponsored|promo[-_]?banner|promotional[-_]?banner|affiliate[-_]?banner|buy[-_]?now|shop[-_]?now|download[-_]?(btn|button|icon)|play[-_]?(btn|button|icon|overlay|circle|triangle)|video[-_]?play|youtube[-_]?play|btn[-_]?play|119514|watch[-_]?(btn|button|now)|subscribe[-_]?(btn|banner|button)|join[-_]?telegram|favicon|site[-_]?logo|header[-_]?logo|footer[-_]?logo|brand[-_]?logo|logo[-_]?icon|sprite|emoji|smilies|smiley|spacer|blank|pixel|1x1|beacon|impression|loading|spinner|loader|share[-_]?icon|social[-_]?icon|follow[-_]?icon|facebook[-_]?icon|fb[-_]?icon|twitter[-_]?icon|whatsapp[-_]?icon|telegram[-_]?icon|instagram[-_]?icon|pinterest[-_]?icon|linkedin[-_]?icon|youtube[-_]?icon|arrow[-_]?(icon|btn|left|right|up|down)|bullet[-_]?icon|checkmark|verified[-_]?badge|star[-_]?rating|rating[-_]?star|divider[-_]?line|separator[-_]?line|728x90|300x250|468x60|160x600|320x50|336x280|300x600|120x600|970x90|970x250|250x250|200x200)([/_\\-.]|$)",
        RegexOption.IGNORE_CASE
    )

    private val EXACT_UI_ICON_FILENAME_REGEX = Regex(
        "/(?:logo|favicon|play|play-button|playbutton|play_button|play-icon|playicon|arrow|share|facebook|twitter|whatsapp|telegram|instagram|pinterest|linkedin|youtube|subscribe|download|watermark|badge|avatar|spinner|loader|spacer|blank|pixel|ad|ads)\\.(?:png|gif|svg|ico|webp)$",
        RegexOption.IGNORE_CASE
    )

    private val NON_IMAGE_EXTENSION_REGEX = Regex(
        "\\.(?:svg|ico|html?|xhtml|js|mjs|cjs|css|json|xml|txt|pdf|mp4|webm|mkv|avi|mov|mp3|wav|woff2?|ttf|eot)$",
        RegexOption.IGNORE_CASE
    )

    private val STANDARD_AD_DIMENSION_PAIRS = listOf(
        728 to 90, 468 to 60, 320 to 50, 320 to 100, 300 to 250,
        336 to 280, 300 to 600, 160 to 600, 120 to 600,
        970 to 90, 970 to 250, 250 to 250, 200 to 200
    )

    private val GENUINE_CDN_HOST_REGEX = Regex(
        "(^|\\.)(blogger\\.googleusercontent\\.com|bp\\.blogspot\\.com|googleusercontent\\.com|ggpht\\.com|wp\\.com|wordpress\\.com|imgur\\.com|cloudinary\\.com|unsplash\\.com|pexels\\.com)$",
        RegexOption.IGNORE_CASE
    )

    private val NON_IMAGE_OR_AD_LABEL_REGEX = Regex(
        "^(advertisement|sponsored(\\s+(ad|banner|content))?|ad\\s*banner|promo\\s*banner|ads|buy\\s+now|shop\\s+now|download(\\s+now)?|play(\\s+button|\\s+icon|\\s+video)?|watch(\\s+now|\\s+video)?|logo|site\\s+logo|favicon|share\\s+(on\\s+)?(facebook|twitter|whatsapp|telegram|pinterest|linkedin)|▶\\uFE0F?)$",
        RegexOption.IGNORE_CASE
    )

    private val UI_MARKER_REGEX = Regex(
        "(^|[-_\\s])(ad|ads|advert|advertisement|ad-banner|promo-banner|sponsor-banner|adsense|adsterra|play[-_]?(btn|button|icon|overlay)|video-play|favicon|site-logo|brand-logo|header-logo|footer-logo|social[-_]?icon|share[-_]?icon|badge|avatar|emoji|smiley|spinner|loader|watermark)([-_\\s]|$)",
        RegexOption.IGNORE_CASE
    )

    private fun stripQueryAndHash(url: String): String {
        return url.substringBefore('#').substringBefore('?').trim().lowercase(Locale.US)
    }

    private fun extractQueryParam(url: String, key: String): String? {
        return try {
            val normalized = if (url.startsWith("//")) "https:$url" else url
            val query = URI(normalized).rawQuery ?: return null
            query.split('&').firstNotNullOfOrNull { pair ->
                val parts = pair.split('=', limit = 2)
                if (parts.size == 2 && parts[0].equals(key, ignoreCase = true)) {
                    parts[1].lowercase(Locale.US)
                } else {
                    null
                }
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun getFormatQueryParam(url: String): String {
        return extractQueryParam(url, "format")
            ?: extractQueryParam(url, "fm")
            ?: extractQueryParam(url, "ext")
            ?: ""
    }

    fun normalizeImageMimeType(mimeType: String?): String {
        if (mimeType.isNullOrBlank()) return ""
        val base = mimeType.substringBefore(';').trim().lowercase(Locale.US)
        return if (base == "image/jpg") "image/jpeg" else base
    }

    fun isSupportedImageMimeType(mimeType: String?, allowGif: Boolean = true): Boolean {
        val normalized = normalizeImageMimeType(mimeType)
        if (normalized.isEmpty() || normalized == "image/svg+xml") return false
        if (normalized == "image/gif") return allowGif
        return normalized == "image/jpeg" ||
            normalized == "image/png" ||
            normalized == "image/webp" ||
            normalized == "image/avif"
    }

    fun isPngImageUrl(url: String?): Boolean {
        if (url.isNullOrBlank()) return false
        val trimmed = url.trim().lowercase(Locale.US)
        if (trimmed.startsWith("data:image/png")) return true
        if (stripQueryAndHash(trimmed).endsWith(".png")) return true
        return getFormatQueryParam(trimmed) == "png"
    }

    fun isJpgImageUrl(url: String?): Boolean {
        if (url.isNullOrBlank()) return false
        val trimmed = url.trim().lowercase(Locale.US)
        if (trimmed.startsWith("data:image/jpeg") || trimmed.startsWith("data:image/jpg")) return true
        val cleanPath = stripQueryAndHash(trimmed)
        if (cleanPath.endsWith(".jpg") || cleanPath.endsWith(".jpeg")) return true
        val fmt = getFormatQueryParam(trimmed)
        return fmt == "jpg" || fmt == "jpeg"
    }

    fun isWebpImageUrl(url: String?): Boolean {
        if (url.isNullOrBlank()) return false
        val trimmed = url.trim().lowercase(Locale.US)
        if (trimmed.startsWith("data:image/webp")) return true
        if (stripQueryAndHash(trimmed).endsWith(".webp")) return true
        return getFormatQueryParam(trimmed) == "webp"
    }

    fun isAvifImageUrl(url: String?): Boolean {
        if (url.isNullOrBlank()) return false
        val trimmed = url.trim().lowercase(Locale.US)
        if (trimmed.startsWith("data:image/avif")) return true
        if (stripQueryAndHash(trimmed).endsWith(".avif")) return true
        return getFormatQueryParam(trimmed) == "avif"
    }

    fun isGenuinePhotoCdnUrl(url: String?): Boolean {
        if (url.isNullOrBlank()) return false
        return try {
            val normalized = if (url.startsWith("//")) "https:$url" else url
            val host = URI(normalized).host.orEmpty().lowercase(Locale.US)
            GENUINE_CDN_HOST_REGEX.containsMatchIn(host)
        } catch (_: Exception) {
            false
        }
    }

    fun isDisallowedNonThumbnailFormat(url: String?): Boolean {
        if (url.isNullOrBlank()) return true
        val trimmed = url.trim()
        val lower = trimmed.lowercase(Locale.US)

        if (lower.contains("{{") && lower.contains("}}")) return true

        // Block local device URIs, content URIs, blob URIs, and executable schemes
        if (
            lower.startsWith("file:") ||
            lower.startsWith("content:") ||
            lower.startsWith("blob:") ||
            lower.startsWith("javascript:") ||
            lower.startsWith("vbscript:")
        ) {
            return true
        }

        if (lower.startsWith("data:")) {
            if (
                lower.startsWith("data:image/svg+xml") ||
                lower.startsWith("data:image/gif;base64,r0lgod") ||
                lower.startsWith("data:text/")
            ) {
                return true
            }
            return !Regex("^data:image/(?:jpe?g|png|webp|avif|gif);base64,", RegexOption.IGNORE_CASE)
                .containsMatchIn(lower)
        }

        val cleanPath = stripQueryAndHash(lower)
        return NON_IMAGE_EXTENSION_REGEX.containsMatchIn(cleanPath)
    }

    fun validateImageUrlSyntax(
        url: String?,
        allowDataUri: Boolean = false,
        allowHttpUpgrade: Boolean = true
    ): ImageUrlValidationResult {
        if (url.isNullOrBlank()) {
            return ImageUrlValidationResult(false, reason = "Image URL is empty.")
        }
        val trimmed = url.trim()
        if (trimmed.contains("{{") || Regex("[\"'<>\\\\\\r\\n]").containsMatchIn(trimmed)) {
            return ImageUrlValidationResult(false, reason = "Image URL contains invalid or unresolved characters.")
        }

        if (trimmed.startsWith("data:", ignoreCase = true)) {
            if (!allowDataUri) {
                return ImageUrlValidationResult(false, reason = "Data URI must be uploaded to obtain a public HTTPS image URL.")
            }
            if (isDisallowedNonThumbnailFormat(trimmed)) {
                return ImageUrlValidationResult(false, reason = "Unsupported data URI image format (allowed: JPG, JPEG, PNG, WebP, AVIF).")
            }
            return ImageUrlValidationResult(true, normalizedUrl = trimmed)
        }

        if (isDisallowedNonThumbnailFormat(trimmed)) {
            return ImageUrlValidationResult(false, reason = "Unsupported or local image URI format.")
        }

        var candidate = trimmed
        if (candidate.startsWith("//")) {
            candidate = "https:$candidate"
        } else if (allowHttpUpgrade && candidate.startsWith("http://", ignoreCase = true)) {
            candidate = "https://${candidate.substring(7)}"
        }

        return try {
            val uri = URI(candidate)
            val scheme = uri.scheme?.lowercase(Locale.US)
            if (scheme != "https" && scheme != "http") {
                return ImageUrlValidationResult(false, reason = "Unsupported protocol '$scheme'.")
            }
            val host = uri.host?.lowercase(Locale.US)
            if (host.isNullOrBlank() || host == "localhost" || host == "127.0.0.1" || host == "0.0.0.0" || host == "::1") {
                return ImageUrlValidationResult(false, reason = "Local/loopback image hostnames cannot be published to Blogger.")
            }
            ImageUrlValidationResult(true, normalizedUrl = uri.toString())
        } catch (_: Exception) {
            ImageUrlValidationResult(false, reason = "Malformed image URL.")
        }
    }

    private fun inferDimensionsFromUrl(url: String): Pair<Int?, Int?> {
        val whMatch = Regex("/w(\\d+)-h(\\d+)(?:-[^/]*)?/", RegexOption.IGNORE_CASE).find(url)
        if (whMatch != null) {
            return Pair(whMatch.groupValues[1].toIntOrNull(), whMatch.groupValues[2].toIntOrNull())
        }
        val eqWhMatch = Regex("=w(\\d+)-h(\\d+)(?:-[^&#/?]*)?(?:[?#]|$)", RegexOption.IGNORE_CASE).find(url)
        if (eqWhMatch != null) {
            return Pair(eqWhMatch.groupValues[1].toIntOrNull(), eqWhMatch.groupValues[2].toIntOrNull())
        }
        val sMatch = Regex("/s(\\d+)(?:-[^/]*)?/", RegexOption.IGNORE_CASE).find(url)
        if (sMatch != null) {
            val size = sMatch.groupValues[1].toIntOrNull()
            return Pair(size, size)
        }
        val eqSMatch = Regex("=s(\\d+)(?:-[^&#/?]*)?(?:[?#]|$)", RegexOption.IGNORE_CASE).find(url)
        if (eqSMatch != null) {
            val size = eqSMatch.groupValues[1].toIntOrNull()
            return Pair(size, size)
        }
        val qw = (extractQueryParam(url, "w") ?: extractQueryParam(url, "width"))?.toIntOrNull()
        val qh = (extractQueryParam(url, "h") ?: extractQueryParam(url, "height"))?.toIntOrNull()
        if (qw != null || qh != null) {
            return Pair(qw, qh)
        }
        return Pair(null, null)
    }

    fun isStandardAdBannerDimensions(width: Int?, height: Int?): Boolean {
        if (width == null || height == null) return false
        return STANDARD_AD_DIMENSION_PAIRS.any { (aw, ah) ->
            (width == aw && height == ah) || (width <= 180 && height <= 60)
        }
    }

    fun isUnwantedUiOrAdImage(candidate: ThumbnailCandidate): Boolean {
        val src = candidate.src.trim()
        if (src.isEmpty()) return true

        val cleanPath = stripQueryAndHash(src)
        if (cleanPath.endsWith(".ico") || cleanPath.endsWith(".svg")) return true
        if (AD_OR_TRACKER_URL_REGEX.containsMatchIn(src)) return true

        try {
            val normalized = if (src.startsWith("//")) "https:$src" else src
            val uri = URI(normalized)
            val host = uri.host.orEmpty().lowercase(Locale.US)
            val path = uri.path.orEmpty().lowercase(Locale.US)
            if (ICON_CDN_HOST_REGEX.containsMatchIn(host) || path.contains("/images/core/emoji/")) {
                return true
            }
        } catch (_: Exception) {}

        if (AD_OR_UNRELATED_FILENAME_REGEX.containsMatchIn(cleanPath) || EXACT_UI_ICON_FILENAME_REGEX.containsMatchIn(cleanPath)) {
            return true
        }

        val labelText = "${candidate.alt.trim()} ${candidate.title.trim()}".trim()
        if (labelText.isNotEmpty() && NON_IMAGE_OR_AD_LABEL_REGEX.matches(labelText)) {
            return true
        }

        val marker = "${candidate.className} ${candidate.id}".trim()
        if (marker.isNotEmpty() && UI_MARKER_REGEX.containsMatchIn(marker)) {
            return true
        }

        val (inferredW, inferredH) = inferDimensionsFromUrl(src)
        val w = candidate.width ?: inferredW
        val h = candidate.height ?: inferredH

        if ((w != null && w <= 2) || (h != null && h <= 2)) return true
        if (isStandardAdBannerDimensions(w, h)) return true

        // Small PNG/GIF UI icon/badge heuristic while preserving large PNG infographics & screenshots
        val isIconFormat = isPngImageUrl(src) || cleanPath.endsWith(".gif")
        if (isIconFormat) {
            if (w != null && h != null && w <= 128 && h <= 128) return true
            if ((w != null && w <= 96) || (h != null && h <= 96)) return true
            if (Regex("/(?:icons?|emojis?|badges?|buttons?|logos?|assets/ui)/", RegexOption.IGNORE_CASE).containsMatchIn(cleanPath)) {
                return true
            }
        }

        return false
    }

    fun isAdOrUnrelatedImageCandidate(candidate: ThumbnailCandidate): Boolean {
        if (candidate.isAdOrUnrelated) return true
        return isUnwantedUiOrAdImage(candidate)
    }

    private fun getRolePriorityBonus(role: ThumbnailCandidateRole?, orderIndex: Int): Double {
        return when (role) {
            ThumbnailCandidateRole.OG_IMAGE -> 24_000.0
            ThumbnailCandidateRole.METADATA -> 20_000.0
            ThumbnailCandidateRole.HERO -> 10_000.0
            ThumbnailCandidateRole.ARTICLE -> maxOf(2_000, 6_000 - orderIndex * 250).toDouble()
            ThumbnailCandidateRole.MEDIA_THUMBNAIL -> 1_000.0
            null -> if (orderIndex == 0) 10_000.0 else maxOf(2_000, 6_000 - orderIndex * 250).toDouble()
        }
    }

    private fun scoreCandidate(candidate: ThumbnailCandidate, orderIndex: Int): Double {
        val src = candidate.src.trim()
        var score = getRolePriorityBonus(candidate.role, orderIndex)

        // Format preference: JPG/JPEG highest; extensionless CDN photos next; WebP/AVIF next; valid PNG preserved; GIF penalized
        score += when {
            isJpgImageUrl(src) -> 6_500.0
            isWebpImageUrl(src) || isAvifImageUrl(src) -> 3_500.0
            isPngImageUrl(src) -> 2_000.0
            stripQueryAndHash(src).endsWith(".gif") -> -2_000.0
            isGenuinePhotoCdnUrl(src) -> 4_500.0
            else -> 1_500.0
        }

        if (isGenuinePhotoCdnUrl(src)) {
            score += 500.0
        }

        val (inferredW, inferredH) = inferDimensionsFromUrl(src)
        val w = candidate.width ?: inferredW
        val h = candidate.height ?: inferredH

        if (w != null && h != null) {
            score += when {
                w <= 120 || h <= 120 -> -4_000.0
                w >= 300 && h >= 200 -> 1_500.0 + minOf(2_000, (w * h) / 1000).toDouble()
                else -> minOf(1_000, (w * h) / 500).toDouble()
            }
        } else if (w != null) {
            score += if (w <= 120) -4_000.0 else minOf(1_500, w).toDouble()
        }

        score -= orderIndex * 0.1
        return score
    }

    fun rankMainThumbnailCandidates(
        candidates: List<ThumbnailCandidate>,
        jpgOnly: Boolean = false
    ): List<String> {
        val seen = HashSet<String>()
        val filtered = mutableListOf<ThumbnailCandidate>()

        for ((idx, item) in candidates.withIndex()) {
            val src = item.src.trim()
            if (src.isEmpty() || !seen.add(src)) continue
            if (isDisallowedNonThumbnailFormat(src)) continue
            if (isAdOrUnrelatedImageCandidate(item)) continue
            if (jpgOnly && !isJpgImageUrl(src)) continue
            filtered.add(item.copy(src = src, index = if (item.index != 0) item.index else idx))
        }

        if (filtered.isEmpty()) return emptyList()

        return filtered
            .mapIndexed { idx, cand -> cand.src to scoreCandidate(cand, idx) }
            .sortedByDescending { it.second }
            .map { it.first }
    }

    fun selectMainThumbnailImage(
        candidates: List<ThumbnailCandidate>,
        jpgOnly: Boolean = false
    ): String? {
        return rankMainThumbnailCandidates(candidates, jpgOnly).firstOrNull()
    }

    private fun extractFirstSrcFromSrcset(srcset: String?): String {
        if (srcset.isNullOrBlank()) return ""
        val parts = srcset.split(Regex(",(?=\\s*(?:https?://|//|/|data:image/))", RegexOption.IGNORE_CASE))
        for (part in parts) {
            val url = part.trim().split(Regex("\\s+")).firstOrNull()?.trim().orEmpty()
            if (
                url.isNotEmpty() &&
                !url.startsWith("data:image/svg+xml", ignoreCase = true) &&
                !url.startsWith("data:image/gif;base64,r0lgod", ignoreCase = true)
            ) {
                return url
            }
        }
        return ""
    }

    private fun isPlaceholderUrl(url: String?): Boolean {
        if (url.isNullOrBlank()) return true
        val lower = url.trim().lowercase(Locale.US)
        if (lower.startsWith("data:image/svg+xml")) return true
        if (lower.startsWith("data:image/gif;base64,r0lgod")) return true
        return Regex("/(blank|spacer|transparent|pixel|1x1|loading|spinner|placeholder)\\.(gif|png|jpg|webp|svg)(\\?|$)", RegexOption.IGNORE_CASE)
            .containsMatchIn(lower)
    }

    fun selectMainThumbnailImageFromHtml(html: String?): String? {
        if (html.isNullOrBlank()) return null

        val cleanedHtml = html
            .replace(Regex("<(script|style|noscript|iframe|svg|template)\\b[^>]*>[\\s\\S]*?</\\1>", RegexOption.IGNORE_CASE), " ")
            .replace(Regex("<aside\\b[^>]*\\b(?:ad-slot-wrapper|data-ad-slot|data-app-ad)\\b[^>]*>[\\s\\S]*?</aside>", RegexOption.IGNORE_CASE), " ")
            .replace(Regex("<ins\\b[^>]*adsbygoogle[\\s\\S]*?</ins>", RegexOption.IGNORE_CASE), " ")

        val imgRegex = Regex("<img\\b([^>]*)>", RegexOption.IGNORE_CASE)
        val adMarkerRegex = Regex("(^|[-_\\s])(ad|ads|advert|advertisement|ad-banner|promo|sponsor|play-icon|play-btn|play-button|badge|avatar|emoji|logo)([-_\\s]|$)", RegexOption.IGNORE_CASE)

        fun extractAttr(attrs: String, name: String): String {
            val rx = Regex("\\b$name\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", RegexOption.IGNORE_CASE)
            val m = rx.find(attrs) ?: return ""
            return m.groupValues[1].ifEmpty { m.groupValues[2].ifEmpty { m.groupValues[3] } }.trim()
        }

        val candidates = mutableListOf<ThumbnailCandidate>()
        var idx = 0
        for (match in imgRegex.findAll(cleanedHtml)) {
            val attrs = match.groupValues.getOrElse(1) { "" }
            val lazyCandidates = listOf(
                extractAttr(attrs, "src"),
                extractAttr(attrs, "data-src"),
                extractAttr(attrs, "data-original"),
                extractAttr(attrs, "data-lazy-src"),
                extractAttr(attrs, "data-lazyload"),
                extractAttr(attrs, "data-url"),
                extractAttr(attrs, "data-hi-res-src"),
                extractFirstSrcFromSrcset(extractAttr(attrs, "srcset")),
                extractFirstSrcFromSrcset(extractAttr(attrs, "data-srcset"))
            )
            val src = lazyCandidates.firstOrNull { it.isNotEmpty() && !isPlaceholderUrl(it) }.orEmpty()
            if (src.isEmpty() || src.contains("{{")) continue

            val alt = extractAttr(attrs, "alt")
            val title = extractAttr(attrs, "title")
            val cls = extractAttr(attrs, "class")
            val id = extractAttr(attrs, "id")
            val srcset = extractAttr(attrs, "srcset").ifBlank { null }
            val w = (extractAttr(attrs, "width").ifEmpty { extractAttr(attrs, "data-original-width") }).toIntOrNull()
            val h = (extractAttr(attrs, "height").ifEmpty { extractAttr(attrs, "data-original-height") }).toIntOrNull()

            candidates.add(
                ThumbnailCandidate(
                    src = src,
                    alt = alt,
                    title = title,
                    srcset = srcset,
                    className = cls,
                    id = id,
                    width = w,
                    height = h,
                    isAdOrUnrelated = adMarkerRegex.containsMatchIn("$cls $id"),
                    role = if (idx == 0) ThumbnailCandidateRole.HERO else ThumbnailCandidateRole.ARTICLE,
                    index = idx++
                )
            )
        }

        return selectMainThumbnailImage(candidates)
    }
}
