package com.aistudio.bloggerautopublisher.util

import java.net.URI
import java.util.Locale

data class ThumbnailCandidate(
    val src: String,
    val alt: String = "",
    val width: Int? = null,
    val height: Int? = null,
    val isAdOrUnrelated: Boolean = false,
    val index: Int = 0
)

/**
 * Centralized Blogger Main Post Image & Thumbnail Selection Logic for Android.
 *
 * Rules enforced:
 * 1. Always select the actual Main Post Image (JPG/JPEG) as the Blogger thumbnail.
 * 2. NEVER select PNG images (e.g. icons/overlays like "119514.png") as the post thumbnail.
 * 3. Ignore advertisement images, tracking pixels, badges/buttons, and unrelated embedded images.
 * 4. Preserve all images inside post content.
 */
object MainImageSelector {

    private val AD_OR_TRACKER_URL_REGEX = Regex(
        "(doubleclick\\.net|googlesyndication\\.com|googleadservices\\.com|google-analytics\\.com|googletagmanager\\.com|adnxs\\.com|criteo\\.|taboola\\.com|outbrain\\.com|mgid\\.com|adsterra\\.com|effectivecpmnetwork\\.com|highperformanceformat\\.com|cheflobesofficer\\.com|propellerads\\.com|popads\\.net|monetag\\.com|amazon-adsystem\\.com|revcontent\\.com|media\\.net|feedburner\\.com/~r/|/tracker/)",
        RegexOption.IGNORE_CASE
    )

    private val AD_OR_UNRELATED_FILENAME_REGEX = Regex(
        "(^|[/_\\-.])(ad[-_]?banner|adsense|ad[-_]?slot|ad[-_]?unit|sponsored|promo[-_]?banner|buy[-_]?now|shop[-_]?now|download[-_]?(btn|button)|play[-_]?(btn|button|icon)|watch[-_]?(btn|button|now)|subscribe[-_]?(btn|banner)|favicon|sprite|emoji|smilies|spacer|blank|pixel|1x1|beacon|loading|spinner|728x90|300x250|468x60|160x600|320x50)([/_\\-.]|$)",
        RegexOption.IGNORE_CASE
    )

    private val GENUINE_CDN_HOST_REGEX = Regex(
        "(^|\\.)(blogger\\.googleusercontent\\.com|bp\\.blogspot\\.com|googleusercontent\\.com|ggpht\\.com|wp\\.com|wordpress\\.com|imgur\\.com|cloudinary\\.com|unsplash\\.com|pexels\\.com)$",
        RegexOption.IGNORE_CASE
    )

    private val NON_IMAGE_OR_AD_ALT_REGEX = Regex(
        "^(advertisement|sponsored|ad|buy now|shop now|download now|play button)$",
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

    fun isPngImageUrl(url: String?): Boolean {
        if (url.isNullOrBlank()) return false
        val trimmed = url.trim().lowercase(Locale.US)
        if (trimmed.startsWith("data:image/png")) return true
        if (stripQueryAndHash(trimmed).endsWith(".png")) return true

        val fmt = extractQueryParam(trimmed, "format")
            ?: extractQueryParam(trimmed, "fm")
            ?: extractQueryParam(trimmed, "ext")
        return fmt == "png"
    }

    fun isJpgImageUrl(url: String?): Boolean {
        if (url.isNullOrBlank()) return false
        val trimmed = url.trim().lowercase(Locale.US)
        if (trimmed.startsWith("data:image/jpeg") || trimmed.startsWith("data:image/jpg")) return true

        val cleanPath = stripQueryAndHash(trimmed)
        if (cleanPath.endsWith(".jpg") || cleanPath.endsWith(".jpeg")) return true

        val fmt = extractQueryParam(trimmed, "format")
            ?: extractQueryParam(trimmed, "fm")
            ?: extractQueryParam(trimmed, "ext")
        return fmt == "jpg" || fmt == "jpeg"
    }

    fun isDisallowedNonThumbnailFormat(url: String?): Boolean {
        if (url.isNullOrBlank()) return true
        val trimmed = url.trim().lowercase(Locale.US)

        if (
            trimmed.startsWith("data:image/svg+xml") ||
            trimmed.startsWith("data:image/gif;base64,r0lgod") ||
            trimmed.startsWith("data:text/")
        ) {
            return true
        }

        if (isPngImageUrl(trimmed)) return true

        val cleanPath = stripQueryAndHash(trimmed)
        return cleanPath.endsWith(".svg") || cleanPath.endsWith(".ico")
    }

    fun isAdOrUnrelatedImageCandidate(candidate: ThumbnailCandidate): Boolean {
        if (candidate.isAdOrUnrelated) return true
        val src = candidate.src.trim()
        if (src.isEmpty()) return true
        if (AD_OR_TRACKER_URL_REGEX.containsMatchIn(src)) return true
        if (AD_OR_UNRELATED_FILENAME_REGEX.containsMatchIn(src)) return true
        val alt = candidate.alt.trim()
        if (alt.isNotEmpty() && NON_IMAGE_OR_AD_ALT_REGEX.matches(alt)) return true
        return false
    }

    private fun inferDimensionsFromUrl(url: String): Pair<Int?, Int?> {
        val whMatch = Regex("/w(\\d+)-h(\\d+)(?:-[^/]*)?/", RegexOption.IGNORE_CASE).find(url)
        if (whMatch != null) {
            return Pair(whMatch.groupValues[1].toIntOrNull(), whMatch.groupValues[2].toIntOrNull())
        }
        val sMatch = Regex("/s(\\d+)(?:-c)?(?:-[^/]*)?/", RegexOption.IGNORE_CASE).find(url)
        if (sMatch != null) {
            val size = sMatch.groupValues[1].toIntOrNull()
            return Pair(size, size)
        }
        return Pair(null, null)
    }

    private fun scoreCandidate(candidate: ThumbnailCandidate, orderIndex: Int): Double {
        val src = candidate.src.trim()
        var score = 0.0

        score += when {
            isJpgImageUrl(src) -> 10000.0
            stripQueryAndHash(src).endsWith(".gif") -> -500.0
            else -> 1000.0
        }

        try {
            val normalized = if (src.startsWith("//")) "https:$src" else src
            val host = URI(normalized).host.orEmpty()
            if (GENUINE_CDN_HOST_REGEX.containsMatchIn(host)) {
                score += 500.0
            }
        } catch (_: Exception) {}

        val (inferredW, inferredH) = inferDimensionsFromUrl(src)
        val w = candidate.width ?: inferredW
        val h = candidate.height ?: inferredH

        if (w != null && h != null) {
            score += when {
                w <= 80 || h <= 80 -> -3000.0
                w >= 300 && h >= 200 -> 1500.0 + minOf(2000, (w * h) / 1000).toDouble()
                else -> minOf(1000, (w * h) / 500).toDouble()
            }
        } else if (w != null) {
            score += if (w <= 80) -3000.0 else minOf(1500, w).toDouble()
        }

        score -= orderIndex * 0.01
        return score
    }

    fun selectMainThumbnailImage(
        candidates: List<ThumbnailCandidate>,
        jpgOnly: Boolean = false
    ): String? {
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

        if (filtered.isEmpty()) return null

        val jpgPool = filtered.filter { isJpgImageUrl(it.src) }
        val pool = jpgPool.ifEmpty { filtered }

        var best = pool[0]
        var bestScore = scoreCandidate(best, 0)
        for (i in 1 until pool.size) {
            val score = scoreCandidate(pool[i], i)
            if (score > bestScore) {
                bestScore = score
                best = pool[i]
            }
        }

        return best.src
    }

    fun selectMainThumbnailImageFromHtml(html: String?): String? {
        if (html.isNullOrBlank()) return null

        val cleanedHtml = html
            .replace(Regex("<(script|style|noscript|iframe|svg|template)\\b[^>]*>[\\s\\S]*?</\\1>", RegexOption.IGNORE_CASE), " ")
            .replace(Regex("<ins\\b[^>]*adsbygoogle[\\s\\S]*?</ins>", RegexOption.IGNORE_CASE), " ")

        val imgRegex = Regex("<img\\b([^>]*)>", RegexOption.IGNORE_CASE)
        val srcRegex = Regex("\\bsrc\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", RegexOption.IGNORE_CASE)
        val altRegex = Regex("\\balt\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')", RegexOption.IGNORE_CASE)
        val classRegex = Regex("\\bclass\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')", RegexOption.IGNORE_CASE)
        val idRegex = Regex("\\bid\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')", RegexOption.IGNORE_CASE)
        val widthRegex = Regex("\\b(?:data-original-)?width\\s*=\\s*(?:\"(\\d+)\"|'(\\d+)'|(\\d+))", RegexOption.IGNORE_CASE)
        val heightRegex = Regex("\\b(?:data-original-)?height\\s*=\\s*(?:\"(\\d+)\"|'(\\d+)'|(\\d+))", RegexOption.IGNORE_CASE)
        val adMarkerRegex = Regex("(^|[-_\\s])(ad|ads|advert|banner|promo|sponsor|play-icon|badge|avatar|emoji)([-_\\s]|$)", RegexOption.IGNORE_CASE)

        val candidates = mutableListOf<ThumbnailCandidate>()
        var idx = 0
        for (match in imgRegex.findAll(cleanedHtml)) {
            val attrs = match.groupValues.getOrElse(1) { "" }
            val srcMatch = srcRegex.find(attrs) ?: continue
            val src = srcMatch.groupValues[1].ifEmpty { srcMatch.groupValues[2].ifEmpty { srcMatch.groupValues[3] } }.trim()
            if (src.isEmpty() || src.contains("{{")) continue

            val alt = altRegex.find(attrs)?.let { it.groupValues[1].ifEmpty { it.groupValues[2] } }.orEmpty()
            val cls = classRegex.find(attrs)?.let { it.groupValues[1].ifEmpty { it.groupValues[2] } }.orEmpty()
            val id = idRegex.find(attrs)?.let { it.groupValues[1].ifEmpty { it.groupValues[2] } }.orEmpty()
            val w = widthRegex.find(attrs)?.let {
                (it.groupValues[1].ifEmpty { it.groupValues[2].ifEmpty { it.groupValues[3] } }).toIntOrNull()
            }
            val h = heightRegex.find(attrs)?.let {
                (it.groupValues[1].ifEmpty { it.groupValues[2].ifEmpty { it.groupValues[3] } }).toIntOrNull()
            }

            candidates.add(
                ThumbnailCandidate(
                    src = src,
                    alt = alt,
                    width = w,
                    height = h,
                    isAdOrUnrelated = adMarkerRegex.containsMatchIn("$cls $id"),
                    index = idx++
                )
            )
        }

        return selectMainThumbnailImage(candidates)
    }
}
