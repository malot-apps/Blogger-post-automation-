package com.aistudio.bloggerautopublisher.repository

import android.content.Context
import android.content.SharedPreferences
import com.aistudio.bloggerautopublisher.model.PublishedPost
import com.aistudio.bloggerautopublisher.model.UserProfile
import com.aistudio.bloggerautopublisher.template.BloggerTemplateEngine
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

    private val _template = MutableStateFlow(
        prefs.getString("custom_template", BloggerTemplateEngine.DEFAULT_MASTER_TEMPLATE)
            ?: BloggerTemplateEngine.DEFAULT_MASTER_TEMPLATE
    )
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

    fun selectBlog(blogId: String) {
        prefs.edit().putString("selected_blog_id", blogId).apply()
        _selectedBlogId.value = blogId
    }

    fun saveTemplate(newTemplate: String) {
        prefs.edit().putString("custom_template", newTemplate).apply()
        _template.value = newTemplate
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
