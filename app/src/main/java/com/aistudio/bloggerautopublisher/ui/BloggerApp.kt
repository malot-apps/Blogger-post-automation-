package com.aistudio.bloggerautopublisher.ui

import android.graphics.BitmapFactory
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.aistudio.bloggerautopublisher.ui.components.AiAssistantSection
import com.aistudio.bloggerautopublisher.ui.components.AuthCardView
import com.aistudio.bloggerautopublisher.ui.components.HeaderSection
import com.aistudio.bloggerautopublisher.ui.components.ImageUploaderSection
import com.aistudio.bloggerautopublisher.ui.components.PostFormSection
import com.aistudio.bloggerautopublisher.ui.components.PostHistoryDialog
import com.aistudio.bloggerautopublisher.ui.components.PostPreviewDialog
import com.aistudio.bloggerautopublisher.ui.components.PublishProgressDialog
import com.aistudio.bloggerautopublisher.ui.components.SetupGuideDialog
import com.aistudio.bloggerautopublisher.ui.components.SuccessScreenView
import com.aistudio.bloggerautopublisher.ui.components.TemplateSettingsDialog
import com.aistudio.bloggerautopublisher.ui.theme.*
import com.aistudio.bloggerautopublisher.util.ImageOptimizer

@Composable
fun BloggerApp(viewModel: BloggerViewModel) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    // Back handlers for dialogs
    BackHandler(enabled = uiState.isPreviewOpen) { viewModel.closePreview() }
    BackHandler(enabled = uiState.isSettingsOpen) { viewModel.closeSettings() }
    BackHandler(enabled = uiState.isHistoryOpen) { viewModel.closeHistory() }
    BackHandler(enabled = uiState.isGuideOpen) { viewModel.closeGuide() }

    val currentBlog = uiState.blogs.find { it.id == uiState.selectedBlogId } ?: uiState.blogs.firstOrNull()
    val canPublish = (uiState.mainImage != null || !uiState.mainImageUrlOverride.isNullOrBlank()) &&
        uiState.caption.trim().isNotBlank()

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = Slate50
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Header Bar
            HeaderSection(
                user = uiState.currentUser,
                blogs = uiState.blogs,
                selectedBlogId = uiState.selectedBlogId,
                onSelectBlog = { viewModel.onSelectBlog(it) },
                onRefreshBlogs = { viewModel.loadBlogs() },
                isLoadingBlogs = uiState.isLoadingBlogs,
                onOpenSettings = { viewModel.openSettings() },
                onOpenGuide = { viewModel.openGuide() },
                onOpenHistory = { viewModel.openHistory() },
                onLogout = { viewModel.signOut() }
            )

            // Main Scrollable Area
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.TopCenter
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .widthIn(max = 640.dp)
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    if (uiState.currentUser == null) {
                        AuthCardView(
                            isAuthenticating = uiState.isAuthenticating,
                            authError = uiState.authError,
                            onConnectWithToken = { viewModel.authenticateWithToken(it) }
                        )
                    } else if (uiState.publishedPost != null) {
                        SuccessScreenView(
                            post = uiState.publishedPost!!,
                            blogName = currentBlog?.name,
                            onReset = { viewModel.resetForNewPost() }
                        )
                    } else {
                        // 1. Image Uploader & Video Thumbnail
                        ImageUploaderSection(
                            mainImage = uiState.mainImage,
                            mainImageUrlOverride = uiState.mainImageUrlOverride,
                            onMainImageSelected = { uri ->
                                val bitmap = ImageOptimizer.decodeSampledBitmapFromUri(context, uri)
                                if (bitmap != null) {
                                    viewModel.onPickMainImage(context, bitmap)
                                }
                            },
                            onMainImageUrlOverride = { url -> viewModel.onSetMainImageUrl(url) },
                            onClearMainImage = { viewModel.onClearMainImage() },
                            thumbnailImage = uiState.thumbnailImage,
                            thumbnailUrlOverride = uiState.thumbnailUrlOverride,
                            onThumbnailSelected = { uri ->
                                val bitmap = ImageOptimizer.decodeSampledBitmapFromUri(context, uri)
                                if (bitmap != null) {
                                    viewModel.onPickThumbnail(context, bitmap)
                                }
                            },
                            onThumbnailUrlOverride = { url -> viewModel.onSetThumbnailUrl(url) },
                            onClearThumbnail = { viewModel.onClearThumbnail() },
                            useSeparateThumbnail = uiState.useSeparateThumbnail,
                            onToggleSeparateThumbnail = { viewModel.onToggleSeparateThumbnail(it) },
                            isProcessing = uiState.isProcessingImage
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        // 2. AI Content Assistant
                        AiAssistantSection(
                            hasMainImage = uiState.mainImage != null || !uiState.mainImageUrlOverride.isNullOrBlank(),
                            aiLanguage = uiState.aiLanguage,
                            onLanguageChange = { viewModel.setAiLanguage(it) },
                            onGenerateWithAi = {
                                val bitmap = uiState.mainImage?.uri?.let { ImageOptimizer.decodeSampledBitmapFromUri(context, it) }
                                viewModel.generateWithAi(context, bitmap)
                            },
                            isAiAnalyzing = uiState.isAiAnalyzing,
                            aiStepText = uiState.aiStepText,
                            aiAnalysis = uiState.aiAnalysis,
                            currentTitle = uiState.title,
                            onApplyTitle = { viewModel.onTitleChanged(it) },
                            isRegeneratingTitle = uiState.isRegeneratingTitle,
                            onRegenerateTitle = { viewModel.regenerateTitle() },
                            thumbnailImage = uiState.thumbnailImage,
                            isRegeneratingThumbnail = uiState.isRegeneratingThumbnail,
                            currentThumbnailStyle = uiState.currentThumbnailStyle,
                            onRegenerateThumbnail = {
                                val bitmap = uiState.mainImage?.uri?.let { ImageOptimizer.decodeSampledBitmapFromUri(context, it) }
                                viewModel.regenerateThumbnail(context, bitmap)
                            },
                            aiError = uiState.aiError
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        // 3. Caption & Publishing Form
                        PostFormSection(
                            caption = uiState.caption,
                            onCaptionChange = { viewModel.onCaptionChanged(it) },
                            title = uiState.title,
                            onTitleChange = { viewModel.onTitleChanged(it) },
                            labels = uiState.labels,
                            onLabelsChange = { viewModel.onLabelsChanged(it) },
                            onAddLabelChip = { viewModel.onAddLabel(it) },
                            canPublish = canPublish,
                            isPublishing = uiState.isPublishing,
                            onPreview = { viewModel.openPreview() },
                            onPublish = { viewModel.publishPost() },
                            selectedBlogName = currentBlog?.name
                        )

                        Spacer(modifier = Modifier.height(30.dp))
                    }
                }
            }
        }

        // Modals & Dialogs
        PostPreviewDialog(
            isOpen = uiState.isPreviewOpen,
            onClose = { viewModel.closePreview() },
            title = uiState.title,
            imageUrl = uiState.mainImageUrlOverride ?: uiState.mainImage?.uri?.toString() ?: "",
            thumbnailUrl = uiState.thumbnailUrlOverride ?: uiState.thumbnailImage?.uri?.toString(),
            caption = uiState.caption,
            template = uiState.customTemplate,
            onPublishNow = { viewModel.publishPost() },
            blogName = currentBlog?.name
        )

        PublishProgressDialog(
            isOpen = uiState.isPublishing,
            currentStep = uiState.publishStep,
            blogName = currentBlog?.name
        )

        PostHistoryDialog(
            isOpen = uiState.isHistoryOpen,
            onClose = { viewModel.closeHistory() },
            posts = uiState.postHistory,
            blogName = currentBlog?.name
        )

        TemplateSettingsDialog(
            isOpen = uiState.isSettingsOpen,
            onClose = { viewModel.closeSettings() },
            currentTemplate = uiState.customTemplate,
            currentGeminiApiKey = uiState.geminiApiKey,
            onSaveTemplate = { viewModel.saveTemplate(it) },
            onResetTemplate = { viewModel.resetTemplate() },
            onSaveGeminiApiKey = { viewModel.saveGeminiApiKey(it) }
        )

        SetupGuideDialog(
            isOpen = uiState.isGuideOpen,
            onClose = { viewModel.closeGuide() }
        )
    }
}
