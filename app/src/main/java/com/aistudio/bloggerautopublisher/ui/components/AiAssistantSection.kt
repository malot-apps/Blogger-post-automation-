package com.aistudio.bloggerautopublisher.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.SmartToy
import androidx.compose.material.icons.filled.TextFields
import androidx.compose.material.icons.filled.VideoLibrary
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.aistudio.bloggerautopublisher.model.AiAnalysisResult
import com.aistudio.bloggerautopublisher.model.CompositionStyle
import com.aistudio.bloggerautopublisher.ui.theme.AmberAccent
import com.aistudio.bloggerautopublisher.ui.theme.Emerald50
import com.aistudio.bloggerautopublisher.ui.theme.Emerald600
import com.aistudio.bloggerautopublisher.ui.theme.EmeraldBorder
import com.aistudio.bloggerautopublisher.ui.theme.OrangePrimary
import com.aistudio.bloggerautopublisher.ui.theme.OrangeSecondary
import com.aistudio.bloggerautopublisher.ui.theme.PurpleAccent
import com.aistudio.bloggerautopublisher.ui.theme.Slate200
import com.aistudio.bloggerautopublisher.ui.theme.Slate300
import com.aistudio.bloggerautopublisher.ui.theme.Slate400
import com.aistudio.bloggerautopublisher.ui.theme.Slate500
import com.aistudio.bloggerautopublisher.ui.theme.Slate700
import com.aistudio.bloggerautopublisher.ui.theme.Slate900
import com.aistudio.bloggerautopublisher.util.ProcessedImage

@Composable
fun AiAssistantSection(
    hasMainImage: Boolean,
    aiLanguage: String,
    onLanguageChange: (String) -> Unit,
    onGenerateWithAi: () -> Unit,
    isAiAnalyzing: Boolean,
    aiStepText: String,
    aiAnalysis: AiAnalysisResult?,
    currentTitle: String,
    onApplyTitle: (String) -> Unit,
    isRegeneratingTitle: Boolean,
    onRegenerateTitle: () -> Unit,
    thumbnailImage: ProcessedImage?,
    isRegeneratingThumbnail: Boolean,
    currentThumbnailStyle: CompositionStyle,
    onRegenerateThumbnail: () -> Unit,
    aiError: String?
) {
    val isTitleApplied = aiAnalysis != null && currentTitle == aiAnalysis.title

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // AI Controls Bar
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(Color(0xFFFFF7ED), Color(0xFFFEF3C7))
                    )
                )
                .border(1.dp, Color(0xFFFFEDD5), RoundedCornerShape(16.dp))
                .padding(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Language Selector
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Language,
                        contentDescription = "Language",
                        tint = OrangePrimary,
                        modifier = Modifier.size(16.dp)
                    )
                    Text("Language:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Slate700)

                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color.White)
                            .border(1.dp, Slate200, RoundedCornerShape(10.dp))
                            .padding(2.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (aiLanguage == "bn") OrangePrimary else Color.Transparent)
                                .clickable { onLanguageChange("bn") }
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "বাংলা",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (aiLanguage == "bn") Color.White else Slate700
                            )
                        }

                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (aiLanguage == "en") OrangePrimary else Color.Transparent)
                                .clickable { onLanguageChange("en") }
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "English",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (aiLanguage == "en") Color.White else Slate700
                            )
                        }
                    }
                }

                // Primary Generate with AI Button
                Button(
                    onClick = onGenerateWithAi,
                    enabled = hasMainImage && !isAiAnalyzing,
                    colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.testTag("generate_with_ai_button")
                ) {
                    if (isAiAnalyzing) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(14.dp), strokeWidth = 2.dp)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Analyzing...", fontSize = 12.sp)
                    } else {
                        Icon(Icons.Default.SmartToy, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("🤖 Generate with AI", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            if (aiAnalysis == null && !isAiAnalyzing) {
                Spacer(modifier = Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = AmberAccent, modifier = Modifier.size(13.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Select an image, then tap 'Generate with AI' for an SEO title & 16:9 thumbnail.",
                        fontSize = 11.sp,
                        color = Slate500
                    )
                }
            }
        }

        // Analyzing State
        if (isAiAnalyzing) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color.White)
                    .border(1.dp, Color(0xFFFFEDD5), RoundedCornerShape(16.dp))
                    .padding(20.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    CircularProgressIndicator(color = OrangePrimary, modifier = Modifier.size(36.dp))
                    Text(text = aiStepText, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Slate900)
                    Text(
                        text = "Analyzing visual elements, subject context, and creating 1200×675 composition...",
                        fontSize = 11.sp,
                        color = Slate500
                    )
                }
            }
        }

        // Generated Results Box
        if (aiAnalysis != null && !isAiAnalyzing) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color.White)
                    .border(1.dp, Color(0xFFFFEDD5), RoundedCornerShape(16.dp))
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Header Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(30.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color(0xFFFFF7ED)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = OrangePrimary, modifier = Modifier.size(18.dp))
                        }
                        Column {
                            Text("AI Generated Content", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Slate900)
                            Text("Subject: ${aiAnalysis.mainSubject}", fontSize = 11.sp, color = Slate500)
                        }
                    }

                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .background(Emerald50)
                            .border(1.dp, EmeraldBorder, RoundedCornerShape(50))
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Check, contentDescription = null, tint = Emerald600, modifier = Modifier.size(12.dp))
                            Spacer(modifier = Modifier.width(3.dp))
                            Text("Ready", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Emerald600)
                        }
                    }
                }

                // 1. AI Generated Title
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.TextFields, contentDescription = null, tint = OrangePrimary, modifier = Modifier.size(15.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("AI Generated Title", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Slate900)
                        }
                        Text(
                            text = if (aiLanguage == "bn") "বাংলা এসইও শিরোনাম" else "SEO Title",
                            fontSize = 11.sp,
                            color = Slate400
                        )
                    }

                    OutlinedTextField(
                        value = currentTitle,
                        onValueChange = onApplyTitle,
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = OrangePrimary,
                            unfocusedBorderColor = Slate300
                        ),
                        shape = RoundedCornerShape(10.dp)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Button(
                            onClick = { onApplyTitle(aiAnalysis.title) },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isTitleApplied) Emerald600 else OrangePrimary
                            ),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Icon(
                                imageVector = if (isTitleApplied) Icons.Default.DoneAll else Icons.Default.Check,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (isTitleApplied) "✓ Title in Use" else "✓ Use Title",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        OutlinedButton(
                            onClick = onRegenerateTitle,
                            enabled = !isRegeneratingTitle,
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            if (isRegeneratingTitle) {
                                CircularProgressIndicator(modifier = Modifier.size(12.dp), strokeWidth = 1.5.dp)
                            } else {
                                Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(13.dp))
                            }
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("↻ Regenerate Title", fontSize = 11.sp, color = Slate700)
                        }
                    }
                }

                // 2. AI Thumbnail Section
                if (thumbnailImage != null) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.VideoLibrary, contentDescription = null, tint = PurpleAccent, modifier = Modifier.size(15.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("AI Thumbnail (16:9)", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Slate900)
                            }
                            Text(
                                text = "(${currentThumbnailStyle.label})",
                                fontSize = 11.sp,
                                color = Slate500
                            )
                        }

                        // Thumbnail container with video play overlay
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .aspectRatio(16f / 9f)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color.Black),
                            contentAlignment = Alignment.Center
                        ) {
                            AsyncImage(
                                model = thumbnailImage.uri,
                                contentDescription = "AI Thumbnail",
                                modifier = Modifier.fillMaxWidth(),
                                contentScale = ContentScale.Crop
                            )

                            // Play Button Simulation
                            Box(
                                modifier = Modifier
                                    .size(46.dp)
                                    .clip(CircleShape)
                                    .background(Color.Black.copy(alpha = 0.5f))
                                    .border(1.dp, Color.White.copy(alpha = 0.4f), CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.PlayArrow,
                                    contentDescription = "Play button",
                                    tint = Color.White,
                                    modifier = Modifier.size(28.dp)
                                )
                            }

                            // Centered Safe Zone label
                            Box(
                                modifier = Modifier
                                    .align(Alignment.BottomStart)
                                    .padding(8.dp)
                                    .clip(RoundedCornerShape(50))
                                    .background(Color.Black.copy(alpha = 0.6f))
                                    .padding(horizontal = 8.dp, vertical = 3.dp)
                            ) {
                                Text(
                                    text = "Centered Safe Zone (Cover Fit)",
                                    color = Color.White,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }

                        // Action Buttons for Thumbnail
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Button(
                                onClick = {},
                                colors = ButtonDefaults.buttonColors(containerColor = PurpleAccent),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Icon(Icons.Default.DoneAll, contentDescription = null, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("✓ Thumbnail in Use", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }

                            OutlinedButton(
                                onClick = onRegenerateThumbnail,
                                enabled = !isRegeneratingThumbnail,
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                if (isRegeneratingThumbnail) {
                                    CircularProgressIndicator(modifier = Modifier.size(12.dp), strokeWidth = 1.5.dp)
                                } else {
                                    Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(13.dp))
                                }
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("↻ Change Style", fontSize = 11.sp, color = PurpleAccent)
                            }
                        }
                    }
                }
            }
        }
    }
}
