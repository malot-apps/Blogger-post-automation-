package com.aistudio.bloggerautopublisher.model

import kotlinx.serialization.Serializable
import java.net.URI
import java.util.Locale

@Serializable
data class AdLinkConfig(
    val enabled: Boolean = false,
    val url: String = ""
)

@Serializable
data class BannerAdConfig(
    val enabled: Boolean = false,
    val imageUrl: String = "",
    val clickUrl: String = ""
)

@Serializable
data class AdsSettings(
    val smartLink: AdLinkConfig = DEFAULT.smartLink,
    val directLink: AdLinkConfig = DEFAULT.directLink,
    val popupAd: AdLinkConfig = DEFAULT.popupAd,
    val bannerAd: BannerAdConfig = DEFAULT.bannerAd,
    val updatedAt: String? = null
) {
    companion object {
        val DEFAULT = AdsSettings(
            smartLink = AdLinkConfig(
                enabled = true,
                url = "https://cheflobesofficer.com/b1b9djat?key=a45917b862f040650d5da9b0f6ceac52"
            ),
            directLink = AdLinkConfig(
                enabled = true,
                url = "https://www.effectivecpmnetwork.com/b1b9djat?key=a45917b862f040650d5da9b0f6ceac52"
            ),
            popupAd = AdLinkConfig(
                enabled = true,
                url = "https://pl30161573.effectivecpmnetwork.com/bc/17/d1/bc17d177bcada949929a7511850a6cf0.js"
            ),
            bannerAd = BannerAdConfig(
                enabled = false,
                imageUrl = "",
                clickUrl = ""
            )
        )

        val EMPTY = AdsSettings(
            smartLink = AdLinkConfig(enabled = false, url = ""),
            directLink = AdLinkConfig(enabled = false, url = ""),
            popupAd = AdLinkConfig(enabled = false, url = ""),
            bannerAd = BannerAdConfig(enabled = false, imageUrl = "", clickUrl = "")
        )

        fun validateUrl(raw: String?): Pair<Boolean, String> {
            val trimmed = raw?.trim().orEmpty()
            if (trimmed.isEmpty()) return Pair(true, "")
            if (Regex("[<>\"'\\s]").containsMatchIn(trimmed)) return Pair(false, "")

            val lower = trimmed.lowercase(Locale.US)
            if (lower.startsWith("javascript:") || lower.startsWith("vbscript:") ||
                lower.startsWith("data:") || lower.startsWith("file:")
            ) {
                return Pair(false, "")
            }

            return try {
                val uri = URI(trimmed)
                val scheme = uri.scheme?.lowercase(Locale.US)
                val host = uri.host
                if ((scheme != "http" && scheme != "https") || host.isNullOrBlank() || !host.contains(".") || !uri.userInfo.isNullOrEmpty()) {
                    Pair(false, "")
                } else {
                    Pair(true, uri.toString())
                }
            } catch (_: Exception) {
                Pair(false, "")
            }
        }

        fun isValidUrl(raw: String?): Boolean {
            val (ok, norm) = validateUrl(raw)
            return ok && norm.isNotEmpty()
        }

        fun sanitize(input: AdsSettings): AdsSettings {
            val (_, smartUrl) = validateUrl(input.smartLink.url)
            val (_, directUrl) = validateUrl(input.directLink.url)
            val (_, popupUrl) = validateUrl(input.popupAd.url)
            val (_, bannerImg) = validateUrl(input.bannerAd.imageUrl)
            val (_, bannerClick) = validateUrl(input.bannerAd.clickUrl)

            return AdsSettings(
                smartLink = AdLinkConfig(
                    enabled = input.smartLink.enabled && smartUrl.isNotEmpty(),
                    url = smartUrl
                ),
                directLink = AdLinkConfig(
                    enabled = input.directLink.enabled && directUrl.isNotEmpty(),
                    url = directUrl
                ),
                popupAd = AdLinkConfig(
                    enabled = input.popupAd.enabled && popupUrl.isNotEmpty(),
                    url = popupUrl
                ),
                bannerAd = BannerAdConfig(
                    enabled = input.bannerAd.enabled && bannerImg.isNotEmpty(),
                    imageUrl = bannerImg,
                    clickUrl = bannerClick
                ),
                updatedAt = input.updatedAt
            )
        }
    }
}
