package com.aistudio.bloggerautopublisher.ui

import android.net.Uri
import com.aistudio.bloggerautopublisher.model.AiAnalysisResult
import com.aistudio.bloggerautopublisher.model.BloggerBlog
import com.aistudio.bloggerautopublisher.model.CompositionStyle
import com.aistudio.bloggerautopublisher.model.PublishedPost
import com.aistudio.bloggerautopublisher.model.UserProfile
import com.aistudio.bloggerautopublisher.util.ProcessedImage

data class BloggerUiState(
    // Auth & Blogs
    val currentUser: UserProfile? = null,
    val blogs: List<BloggerBlog> = emptyList(),
    val selectedBlogId: String = "",
    val isLoadingBlogs: Boolean = false,
    val blogsError: String? = null,

    // Main Image
    val mainImage: ProcessedImage? = null,
    val mainImageUrlOverride: String? = null,

    // Separate Video Thumbnail / Cover Image
    val thumbnailImage: ProcessedImage? = null,
    val thumbnailUrlOverride: String? = null,
    val useSeparateThumbnail: Boolean = false,

    // Processing Image
    val isProcessingImage: Boolean = false,

    // Post Content Form
    val caption: String = "",
    val title: String = "",
    val labels: String = "",

    // AI Content Assistant
    val aiLanguage: String = "bn", // 'bn' or 'en'
    val isAiAnalyzing: Boolean = false,
    val aiStepText: String = "",
    val aiAnalysis: AiAnalysisResult? = null,
    val isRegeneratingTitle: Boolean = false,
    val isRegeneratingThumbnail: Boolean = false,
    val currentThumbnailStyle: CompositionStyle = CompositionStyle.CINEMATIC_FOCUS,
    val previousTitles: List<String> = emptyList(),
    val aiError: String? = null,

    // Master Template
    val customTemplate: String = "",

    // Dialogs / Modals
    val isPreviewOpen: Boolean = false,
    val isSettingsOpen: Boolean = false,
    val isGuideOpen: Boolean = false,
    val isHistoryOpen: Boolean = false,

    // Published History
    val postHistory: List<PublishedPost> = emptyList(),
    val isLoadingHistory: Boolean = false,

    // Publishing Flow
    val isPublishing: Boolean = false,
    val publishStep: Int = 1,
    val publishedPost: PublishedPost? = null,
    val publishError: String? = null
)
