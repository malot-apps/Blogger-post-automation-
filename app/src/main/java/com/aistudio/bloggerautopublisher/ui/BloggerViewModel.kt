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

        // Auto sign-in demo session on launch so the user can immediately test all features
        if (repository.currentUser.value == null) {
            repository.signInDemoUser()
        }
    }

    fun signIn() {
        repository.signInDemoUser()
    }

    fun signOut() {
        repository.signOut()
        _uiState.update {
            it.copy(
                blogs = emptyList(),
                selectedBlogId = "",
                publishedPost = null
            )
        }
    }

    fun loadBlogs() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingBlogs = true, blogsError = null) }
            try {
                val blogs = BloggerApiService.fetchUserBlogs("demo_token")
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
                        blogsError = e.message ?: "Failed to load blogs"
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
                val analysis = GeminiApiService.analyzeImage(
                    imageBase64 = _uiState.value.mainImage?.base64Data,
                    language = _uiState.value.aiLanguage
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
                val newTitle = GeminiApiService.regenerateTitle(
                    language = _uiState.value.aiLanguage,
                    previousTitles = _uiState.value.previousTitles
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

            // Step 4: Finalizing live post
            try {
                val published = BloggerApiService.publishPost(
                    accessToken = "demo_token",
                    blogId = state.selectedBlogId.ifEmpty { "blog_daily_stories_101" },
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
