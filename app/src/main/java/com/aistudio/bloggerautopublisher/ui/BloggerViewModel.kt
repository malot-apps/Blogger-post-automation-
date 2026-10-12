package com.aistudio.bloggerautopublisher.ui

import android.content.Context
import android.graphics.Bitmap
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aistudio.bloggerautopublisher.api.BloggerApiService
import com.aistudio.bloggerautopublisher.api.GeminiApiService
import com.aistudio.bloggerautopublisher.model.CompositionStyle
import com.aistudio.bloggerautopublisher.model.PublishedPost
import com.aistudio.bloggerautopublisher.repository.BloggerRepository
import com.aistudio.bloggerautopublisher.template.BloggerTemplateEngine
import com.aistudio.bloggerautopublisher.util.ImageOptimizer
import com.aistudio.bloggerautopublisher.util.TitleGenerator
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class BloggerViewModel(
    private val repository: BloggerRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(BloggerUiState())
    val uiState: StateFlow<BloggerUiState> = _uiState.asStateFlow()

    init {
        // Collect repository state flows
        viewModelScope.launch {
            repository.currentUser.collect { user ->
                _uiState.update { it.copy(currentUser = user) }
                if (user != null) {
                    loadBlogs()
                }
            }
        }
        viewModelScope.launch {
            repository.selectedBlogId.collect { blogId ->
                _uiState.update { it.copy(selectedBlogId = blogId) }
            }
        }
        viewModelScope.launch {
            repository.template.collect { tmpl ->
                _uiState.update { it.copy(customTemplate = tmpl) }
            }
        }
        viewModelScope.launch {
            repository.postHistory.collect { history ->
                _uiState.update { it.copy(postHistory = history) }
            }
        }
        viewModelScope.launch {
            repository.geminiApiKey.collect { key ->
                _uiState.update { it.copy(geminiApiKey = key) }
            }
        }

        // Load blogs if user is already signed in with a saved token
        if (repository.currentUser.value != null && !repository.accessToken.value.isNullOrBlank()) {
            loadBlogs()
        }
    }

    fun authenticateWithToken(token: String) {
        val cleanToken = token.trim()
        if (cleanToken.isBlank()) {
            _uiState.update { it.copy(authError = "Please enter or paste a valid Google OAuth token.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isAuthenticating = true, authError = null) }
            try {
                val profile = BloggerApiService.fetchUserProfile(cleanToken)
                repository.setSession(cleanToken, profile)
                _uiState.update {
                    it.copy(
                        currentUser = profile,
                        isAuthenticating = false,
                        authError = null
                    )
                }
                loadBlogs()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isAuthenticating = false,
                        authError = e.message ?: "Authentication failed. Please verify your Google OAuth token."
                    )
                }
            }
        }
    }

    fun signOut() {
        repository.signOut()
        _uiState.update {
            it.copy(
                currentUser = null,
                blogs = emptyList(),
                selectedBlogId = "",
                publishedPost = null,
                authError = null
            )
        }
    }

    fun loadBlogs() {
        val token = repository.accessToken.value
        if (token.isNullOrBlank()) {
            _uiState.update { it.copy(blogs = emptyList(), selectedBlogId = "") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingBlogs = true, blogsError = null) }
            try {
                val blogs = BloggerApiService.fetchUserBlogs(token)
                val preferredBlogId = if (_uiState.value.selectedBlogId.isNotEmpty() && blogs.any { it.id == _uiState.value.selectedBlogId }) {
                    _uiState.value.selectedBlogId
                } else {
                    blogs.firstOrNull()?.id.orEmpty()
                }
                repository.selectBlog(preferredBlogId)
                _uiState.update {
                    it.copy(
                        blogs = blogs,
                        selectedBlogId = preferredBlogId,
                        isLoadingBlogs = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoadingBlogs = false,
                        blogsError = e.message ?: "Failed to load blogs from Blogger"
                    )
                }
            }
        }
    }

    fun onSelectBlog(blogId: String) {
        repository.selectBlog(blogId)
        _uiState.update { it.copy(selectedBlogId = blogId) }
    }

    fun onPickMainImage(context: Context, bitmap: Bitmap) {
        viewModelScope.launch {
            _uiState.update { it.copy(isProcessingImage = true) }
            val processed = ImageOptimizer.optimizeAndSave(context, bitmap)
            _uiState.update {
                it.copy(
                    mainImage = processed,
                    mainImageUrlOverride = null,
                    isProcessingImage = false
                )
            }
        }
    }

    fun onSetMainImageUrl(url: String) {
        _uiState.update {
            it.copy(
                mainImageUrlOverride = url.trim(),
                mainImage = null
            )
        }
    }

    fun onClearMainImage() {
        _uiState.update {
            it.copy(
                mainImage = null,
                mainImageUrlOverride = null,
                aiAnalysis = null
            )
        }
    }

    fun onPickThumbnail(context: Context, bitmap: Bitmap) {
        viewModelScope.launch {
            val processed = ImageOptimizer.optimizeAndSave(context, bitmap)
            _uiState.update {
                it.copy(
                    thumbnailImage = processed,
                    thumbnailUrlOverride = null,
                    useSeparateThumbnail = true
                )
            }
        }
    }

    fun onSetThumbnailUrl(url: String) {
        _uiState.update {
            it.copy(
                thumbnailUrlOverride = url.trim(),
                thumbnailImage = null,
                useSeparateThumbnail = true
            )
        }
    }

    fun onClearThumbnail() {
        _uiState.update {
            it.copy(
                thumbnailImage = null,
                thumbnailUrlOverride = null,
                useSeparateThumbnail = false
            )
        }
    }

    fun onToggleSeparateThumbnail(useSeparate: Boolean) {
        _uiState.update { it.copy(useSeparateThumbnail = useSeparate) }
    }

    fun onCaptionChanged(caption: String) {
        _uiState.update { it.copy(caption = caption) }
    }

    fun onTitleChanged(title: String) {
        _uiState.update { it.copy(title = title) }
    }

    fun onLabelsChanged(labels: String) {
        _uiState.update { it.copy(labels = labels) }
    }

    fun onAddLabel(tag: String) {
        val current = _uiState.value.labels
        val tags = current.split(",").map { it.trim() }.filter { it.isNotEmpty() }
        if (!tags.contains(tag)) {
            val updated = if (tags.isNotEmpty()) "$current, $tag" else tag
            _uiState.update { it.copy(labels = updated) }
        }
    }

    fun setAiLanguage(lang: String) {
        _uiState.update { it.copy(aiLanguage = lang) }
    }

    fun generateWithAi(context: Context, sourceBitmap: Bitmap?) {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isAiAnalyzing = true,
                    aiError = null,
                    aiStepText = if (it.aiLanguage == "bn") "ছবি ও বিষয়বস্তু বিশ্লেষণ করা হচ্ছে..." else "Understanding image & subject..."
                )
            }

            try {
                val userKey = _uiState.value.geminiApiKey.trim().ifEmpty { null }
                val analysis = GeminiApiService.analyzeImage(
                    imageBase64 = _uiState.value.mainImage?.base64Data,
                    language = _uiState.value.aiLanguage,
                    apiKey = userKey
                )

                // Generate 16:9 thumbnail if bitmap is available
                if (sourceBitmap != null) {
                    val composedThumb = ImageOptimizer.compose16x9Thumbnail(
                        context = context,
                        sourceBitmap = sourceBitmap,
                        focalPoint = analysis.focalPoint,
                        style = CompositionStyle.CINEMATIC_FOCUS
                    )
                    _uiState.update {
                        it.copy(
                            thumbnailImage = composedThumb,
                            useSeparateThumbnail = true
                        )
                    }
                }

                _uiState.update {
                    it.copy(
                        aiAnalysis = analysis,
                        title = analysis.title,
                        previousTitles = listOf(analysis.title),
                        isAiAnalyzing = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isAiAnalyzing = false,
                        aiError = e.message ?: "AI generation failed"
                    )
                }
            }
        }
    }

    fun regenerateTitle() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRegeneratingTitle = true, aiError = null) }
            try {
                val userKey = _uiState.value.geminiApiKey.trim().ifEmpty { null }
                val newTitle = GeminiApiService.regenerateTitle(
                    language = _uiState.value.aiLanguage,
                    previousTitles = _uiState.value.previousTitles,
                    apiKey = userKey
                )
                _uiState.update {
                    it.copy(
                        title = newTitle,
                        previousTitles = it.previousTitles + newTitle,
                        isRegeneratingTitle = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isRegeneratingTitle = false,
                        aiError = e.message ?: "Failed to regenerate title"
                    )
                }
            }
        }
    }

    fun regenerateThumbnail(context: Context, sourceBitmap: Bitmap?) {
        if (sourceBitmap == null) return
        viewModelScope.launch {
            _uiState.update { it.copy(isRegeneratingThumbnail = true) }
            try {
                val styles = CompositionStyle.entries
                val nextIndex = (styles.indexOf(_uiState.value.currentThumbnailStyle) + 1) % styles.size
                val nextStyle = styles[nextIndex]

                val thumb = ImageOptimizer.compose16x9Thumbnail(
                    context = context,
                    sourceBitmap = sourceBitmap,
                    focalPoint = _uiState.value.aiAnalysis?.focalPoint ?: com.aistudio.bloggerautopublisher.model.FocalPoint(),
                    style = nextStyle
                )
                _uiState.update {
                    it.copy(
                        thumbnailImage = thumb,
                        currentThumbnailStyle = nextStyle,
                        useSeparateThumbnail = true,
                        isRegeneratingThumbnail = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isRegeneratingThumbnail = false) }
            }
        }
    }

    fun openPreview() {
        _uiState.update { it.copy(isPreviewOpen = true) }
    }

    fun closePreview() {
        _uiState.update { it.copy(isPreviewOpen = false) }
    }

    fun openSettings() {
        _uiState.update { it.copy(isSettingsOpen = true) }
    }

    fun closeSettings() {
        _uiState.update { it.copy(isSettingsOpen = false) }
    }

    fun saveTemplate(newTemplate: String) {
        repository.saveTemplate(newTemplate)
    }

    fun resetTemplate() {
        repository.resetTemplate()
    }

    fun saveGeminiApiKey(key: String) {
        repository.saveGeminiApiKey(key)
    }

    fun openHistory() {
        _uiState.update { it.copy(isHistoryOpen = true) }
    }

    fun closeHistory() {
        _uiState.update { it.copy(isHistoryOpen = false) }
    }

    fun openGuide() {
        _uiState.update { it.copy(isGuideOpen = true) }
    }

    fun closeGuide() {
        _uiState.update { it.copy(isGuideOpen = false) }
    }

    fun publishPost() {
        val state = _uiState.value
        val effectiveTitle = if (state.title.isNotBlank()) {
            state.title
        } else {
            TitleGenerator.generateTitleFromCaption(state.caption)
        }

        val effectiveImageUrl = state.mainImageUrlOverride
            ?: state.mainImage?.uri?.toString()
            ?: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&q=80"

        val effectiveThumbUrl = state.thumbnailUrlOverride
            ?: state.thumbnailImage?.uri?.toString()
            ?: effectiveImageUrl

        val postHtml = BloggerTemplateEngine.renderTemplate(
            template = state.customTemplate,
            title = effectiveTitle,
            imageUrl = effectiveImageUrl,
            thumbnailUrl = effectiveThumbUrl,
            caption = state.caption
        )

        val labelsList = state.labels.split(",").map { it.trim() }.filter { it.isNotEmpty() }

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isPublishing = true,
                    publishStep = 1,
                    publishError = null
                )
            }

            // Step 1: Optimizing image
            delay(500)
            _uiState.update { it.copy(publishStep = 2) }

            // Step 2: Formatting Blogger Template
            delay(500)
            _uiState.update { it.copy(publishStep = 3) }

            // Step 3: Connecting to Blogger API v3
            delay(600)
            _uiState.update { it.copy(publishStep = 4) }

            // Step 4: Finalizing live post via real Blogger API v3
            try {
                val token = repository.accessToken.value
                if (token.isNullOrBlank()) {
                    throw Exception("Google OAuth access token is required. Please sign in with Google.")
                }
                if (state.selectedBlogId.isBlank()) {
                    throw Exception("Please select a Blogger destination blog first.")
                }

                val published = BloggerApiService.publishPost(
                    accessToken = token,
                    blogId = state.selectedBlogId,
                    title = effectiveTitle,
                    content = postHtml,
                    labels = labelsList,
                    imageUrl = effectiveImageUrl,
                    thumbnailUrl = effectiveThumbUrl,
                    caption = state.caption
                )

                repository.addPublishedPost(published)
                _uiState.update {
                    it.copy(
                        isPublishing = false,
                        publishedPost = published,
                        isPreviewOpen = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isPublishing = false,
                        publishError = e.message ?: "Failed to publish to Blogger"
                    )
                }
            }
        }
    }

    fun resetForNewPost() {
        _uiState.update {
            it.copy(
                publishedPost = null,
                mainImage = null,
                mainImageUrlOverride = null,
                thumbnailImage = null,
                thumbnailUrlOverride = null,
                useSeparateThumbnail = false,
                caption = "",
                title = "",
                labels = "",
                aiAnalysis = null,
                publishError = null
            )
        }
    }
}
