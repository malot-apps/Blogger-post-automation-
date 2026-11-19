package com.aistudio.bloggerautopublisher.repository

import android.content.Context
import android.content.SharedPreferences
import com.aistudio.bloggerautopublisher.model.AdsSettings
import com.aistudio.bloggerautopublisher.model.PublishedPost
import com.aistudio.bloggerautopublisher.model.UserProfile
import com.aistudio.bloggerautopublisher.template.BloggerTemplateEngine
import com.aistudio.bloggerautopublisher.util.HtmlEntityCodec
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class BloggerRepository(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences("blogger_publisher_prefs", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true }

    private val _currentUser = MutableStateFlow<UserProfile?>(loadSavedUser())
    val currentUser: StateFlow<UserProfile?> = _currentUser.asStateFlow()

    private val _accessToken = MutableStateFlow<String?>(prefs.getString("oauth_access_token", null))
    val accessToken: StateFlow<String?> = _accessToken.asStateFlow()

    private val _selectedBlogId = MutableStateFlow(prefs.getString("selected_blog_id", "").orEmpty())
    val selectedBlogId: StateFlow<String> = _selectedBlogId.asStateFlow()

    private val _adsSettings = MutableStateFlow(loadSavedAdsSettings())
    val adsSettings: StateFlow<AdsSettings> = _adsSettings.asStateFlow()

    private val _template = MutableStateFlow(loadMigratedTemplate())

    private fun isLegacyDefaultTemplate(template: String): Boolean {
        val trimmed = template.trim()
        if (trimmed.isEmpty()) return false
        if (trimmed.contains("adGatePanel") && trimmed.contains("initAdGateSystem")) {
            return false
        }
        val isPriorUnmodifiedMasterDefault =
            trimmed.contains("bn-player-heading") &&
                trimmed.contains("BUTTON_CLICK_CONFIG") &&
                trimmed.contains("initLazyAds") &&
                trimmed.contains("36d19f913897a5c30f86205584612f58") &&
                trimmed.contains("https://cheflobesofficer.com/b1b9djat?key=a45917b862f040650d5da9b0f6ceac52")
        if (isPriorUnmodifiedMasterDefault) return true

        val hasNewMarkers = trimmed.contains("bn-player-heading") ||
            trimmed.contains("BUTTON_CLICK_CONFIG") ||
            trimmed.contains("initLazyAds")
        if (hasNewMarkers) return false
        return trimmed.contains("MAIN_AD_LINK") && (
            trimmed.contains("Loading premium content...") ||
                trimmed.contains("https://cheflobesofficer.com/b1b9djat?key=a45917b862f040650d5da9b0f6ceac52")
            )
    }

    private fun loadSavedAdsSettings(): AdsSettings {
        val raw = prefs.getString("ads_settings_json", null) ?: return AdsSettings.DEFAULT
        return try {
            AdsSettings.sanitize(json.decodeFromString<AdsSettings>(raw))
        } catch (_: Exception) {
            AdsSettings.DEFAULT
        }
    }

    private fun loadMigratedTemplate(): String {
        val saved = prefs.getString("custom_template", BloggerTemplateEngine.DEFAULT_MASTER_TEMPLATE)
            ?: BloggerTemplateEngine.DEFAULT_MASTER_TEMPLATE
        if (isLegacyDefaultTemplate(saved)) {
            prefs.edit().putString("custom_template", BloggerTemplateEngine.DEFAULT_MASTER_TEMPLATE).apply()
            return BloggerTemplateEngine.DEFAULT_MASTER_TEMPLATE
        }
        val upgraded = saved
            .replace("""id="videoThumbnail" src="{{THUMBNAIL_URL}}"""", """id="videoThumbnail" src="{{IMAGE_URL}}"""")
            .replace("""CUSTOM_THUMBNAIL_URL = "{{THUMBNAIL_URL}}";""", """CUSTOM_THUMBNAIL_URL = "{{IMAGE_URL}}";""")
        var migrated = HtmlEntityCodec.repairNonAsciiHtmlEntities(
            BloggerTemplateEngine.deduplicateAdScriptsAndContainers(upgraded)
        )
        if (
            migrated.contains("<title>{{TITLE}}</title>") &&
            !migrated.contains("{{META_DESCRIPTION}}") &&
            migrated.contains("bn-player-heading")
        ) {
            migrated = Regex("<title>\\{\\{TITLE\\}\\}</title>", RegexOption.IGNORE_CASE).replaceFirst(
                migrated,
                Regex.escapeReplacement("<title>{{TITLE}}</title>\n  <meta name=\"description\" content=\"{{META_DESCRIPTION}}\" />")
            )
        }
        if (migrated != saved) {
            prefs.edit().putString("custom_template", migrated).apply()
        }
        return migrated
    }
    val template: StateFlow<String> = _template.asStateFlow()

    private val _postHistory = MutableStateFlow<List<PublishedPost>>(loadSavedPosts())
    val postHistory: StateFlow<List<PublishedPost>> = _postHistory.asStateFlow()

    private val _geminiApiKey = MutableStateFlow(prefs.getString("gemini_api_key", "").orEmpty())
    val geminiApiKey: StateFlow<String> = _geminiApiKey.asStateFlow()

    private fun loadSavedUser(): UserProfile? {
        val userJson = prefs.getString("user_profile", null) ?: return null
        return try {
            json.decodeFromString<UserProfile>(userJson)
        } catch (_: Exception) {
            null
        }
    }

    private fun loadSavedPosts(): List<PublishedPost> {
        val historyJson = prefs.getString("post_history", null) ?: return emptyList()
        return try {
            json.decodeFromString<List<PublishedPost>>(historyJson)
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun setSession(token: String, user: UserProfile) {
        val cleanToken = token.trim()
        prefs.edit()
            .putString("oauth_access_token", cleanToken)
            .putString("user_profile", json.encodeToString(user))
            .apply()
        _accessToken.value = cleanToken
        _currentUser.value = user
    }

    fun signOut() {
        prefs.edit()
            .remove("oauth_access_token")
            .remove("user_profile")
            .remove("selected_blog_id")
            .apply()
        _accessToken.value = null
        _currentUser.value = null
        _selectedBlogId.value = ""
    }

    fun saveGeminiApiKey(key: String) {
        val trimmed = key.trim()
        prefs.edit().putString("gemini_api_key", trimmed).apply()
        _geminiApiKey.value = trimmed
    }

    fun saveAdsSettings(settings: AdsSettings): AdsSettings {
        val clean = AdsSettings.sanitize(
            settings.copy(updatedAt = System.currentTimeMillis().toString())
        )
        prefs.edit().putString("ads_settings_json", json.encodeToString(clean)).apply()
        _adsSettings.value = clean
        return clean
    }

    fun resetAdsSettings(): AdsSettings {
        return saveAdsSettings(AdsSettings.DEFAULT)
    }

    fun selectBlog(blogId: String) {
        prefs.edit().putString("selected_blog_id", blogId).apply()
        _selectedBlogId.value = blogId
    }

    fun saveTemplate(newTemplate: String) {
        val cleaned = HtmlEntityCodec.repairNonAsciiHtmlEntities(
            BloggerTemplateEngine.deduplicateAdScriptsAndContainers(newTemplate)
        )
        prefs.edit().putString("custom_template", cleaned).apply()
        _template.value = cleaned
    }

    fun resetTemplate() {
        saveTemplate(BloggerTemplateEngine.DEFAULT_MASTER_TEMPLATE)
    }

    fun addPublishedPost(post: PublishedPost) {
        val current = _postHistory.value.toMutableList()
        current.add(0, post)
        prefs.edit().putString("post_history", json.encodeToString(current)).apply()
        _postHistory.value = current
    }

    fun clearHistory() {
        prefs.edit().remove("post_history").apply()
        _postHistory.value = emptyList()
    }
}
