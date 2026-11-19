package com.aistudio.bloggerautopublisher.util

/**
 * Shared HTML entity decoding and UTF-8 Bengali repair utilities for Android,
 * mirroring `/src/lib/sanitizer.ts` on Web.
 *
 * Security guarantee:
 * - `decodePlainTextEntities(...)` only decodes plain text that will be rendered natively or
 *   re-escaped via `BloggerTemplateEngine.escapeHtml(...)` before entering HTML.
 * - `repairNonAsciiHtmlEntities(...)` NEVER decodes ASCII metacharacters (`<`, `>`, `&`, `"`, `'`, `\`),
 *   control chars, or U+2028/U+2029, making it safe to run across complete HTML templates and `<script>` blocks.
 */
object HtmlEntityCodec {

    private val NAMED_HTML_ENTITIES = mapOf(
        "amp" to "&",
        "lt" to "<",
        "gt" to ">",
        "quot" to "\"",
        "apos" to "'",
        "nbsp" to " ",
        "ensp" to " ",
        "emsp" to " ",
        "thinsp" to " ",
        "ndash" to "–",
        "mdash" to "—",
        "lsquo" to "‘",
        "rsquo" to "’",
        "sbquo" to "‚",
        "ldquo" to "“",
        "rdquo" to "”",
        "bdquo" to "„",
        "hellip" to "…",
        "middot" to "·",
        "bull" to "•",
        "copy" to "©",
        "reg" to "®",
        "trade" to "™",
        "times" to "×",
        "divide" to "÷",
        "plusmn" to "±",
        "laquo" to "«",
        "raquo" to "»",
        "lsaquo" to "‹",
        "rsaquo" to "›",
        "larr" to "←",
        "rarr" to "→",
        "uarr" to "↑",
        "darr" to "↓",
        "zwj" to "\u200D",
        "zwnj" to "\u200C"
    )

    private val WINDOWS_1252_EXT = mapOf(
        0x80 to 0x20AC,
        0x82 to 0x201A,
        0x83 to 0x0192,
        0x84 to 0x201E,
        0x85 to 0x2026,
        0x86 to 0x2020,
        0x87 to 0x2021,
        0x88 to 0x02C6,
        0x89 to 0x2030,
        0x8A to 0x0160,
        0x8B to 0x2039,
        0x8C to 0x0152,
        0x8E to 0x017D,
        0x91 to 0x2018,
        0x92 to 0x2019,
        0x93 to 0x201C,
        0x94 to 0x201D,
        0x95 to 0x2022,
        0x96 to 0x2013,
        0x97 to 0x2014,
        0x98 to 0x02DC,
        0x99 to 0x2122,
        0x9A to 0x0161,
        0x9B to 0x203A,
        0x9C to 0x0153,
        0x9E to 0x017E,
        0x9F to 0x0178
    )

    private val PLAIN_ENTITY_REGEX = Regex("&(?:#(\\d{1,7})|#x([0-9a-fA-F]{1,6})|([a-zA-Z][a-zA-Z0-9]{1,12}));")
    private val NON_ASCII_ENTITY_REGEX = Regex("&(?:amp;){0,3}(?:#(\\d{1,7})|#x([0-9a-fA-F]{1,6}));", RegexOption.IGNORE_CASE)

    private fun safeFromCodePoint(codePoint: Int): String? {
        if (codePoint <= 0 || codePoint > 0x10FFFF) return null
        if (codePoint in 0xD800..0xDFFF) return null
        if (codePoint < 0x20 && codePoint != 0x09 && codePoint != 0x0A && codePoint != 0x0D) return null
        if (codePoint == 0x7F) return null
        if (codePoint in 0x80..0x9F) {
            val mapped = WINDOWS_1252_EXT[codePoint] ?: return null
            return String(Character.toChars(mapped))
        }
        return String(Character.toChars(codePoint))
    }

    fun decodePlainTextEntities(input: String?, preserveNewlines: Boolean = false): String {
        if (input.isNullOrEmpty()) return ""
        var current = input

        // Bounded unwrap (up to 3 passes) catches double-escaped entities like &amp;#2495; or &amp;quot;
        for (pass in 0 until 3) {
            var changed = false
            val next = PLAIN_ENTITY_REGEX.replace(current) { match ->
                val decStr = match.groupValues[1]
                val hexStr = match.groupValues[2]
                val named = match.groupValues[3]

                when {
                    decStr.isNotEmpty() -> {
                        val cp = decStr.toIntOrNull()
                        val decoded = cp?.let { safeFromCodePoint(it) }
                        if (decoded != null) {
                            changed = true
                            decoded
                        } else {
                            match.value
                        }
                    }
                    hexStr.isNotEmpty() -> {
                        val cp = hexStr.toIntOrNull(16)
                        val decoded = cp?.let { safeFromCodePoint(it) }
                        if (decoded != null) {
                            changed = true
                            decoded
                        } else {
                            match.value
                        }
                    }
                    named.isNotEmpty() -> {
                        val mapped = NAMED_HTML_ENTITIES[named.lowercase()]
                        if (mapped != null) {
                            changed = true
                            mapped
                        } else {
                            match.value
                        }
                    }
                    else -> match.value
                }
            }
            current = next
            if (!changed) break
        }

        current = current.replace('\u00A0', ' ')
        return if (preserveNewlines) {
            current.replace(Regex("\r\n?"), "\n").trim()
        } else {
            current.replace(Regex("\\s+"), " ").trim()
        }
    }

    fun repairNonAsciiHtmlEntities(html: String): String {
        if (html.isEmpty() || !html.contains('#')) return html

        return NON_ASCII_ENTITY_REGEX.replace(html) { match ->
            val decStr = match.groupValues[1]
            val hexStr = match.groupValues[2]
            val cp = when {
                decStr.isNotEmpty() -> decStr.toIntOrNull()
                hexStr.isNotEmpty() -> hexStr.toIntOrNull(16)
                else -> null
            } ?: return@replace match.value

            if (
                cp < 0x0100 ||
                cp > 0x10FFFF ||
                cp in 0xD800..0xDFFF ||
                cp == 0x2028 ||
                cp == 0x2029
            ) {
                match.value
            } else {
                String(Character.toChars(cp))
            }
        }
    }
}
