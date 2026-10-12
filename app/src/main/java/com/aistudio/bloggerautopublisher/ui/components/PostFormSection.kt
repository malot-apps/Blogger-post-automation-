package com.aistudio.bloggerautopublisher.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Visibility
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aistudio.bloggerautopublisher.ui.theme.*

val POPULAR_LABEL_SUGGESTIONS = listOf(
    "News", "Viral", "Entertainment", "Photos", "Updates", "Lifestyle", "Tech", "Stories"
)

@Composable
fun PostFormSection(
    caption: String,
    onCaptionChange: (String) -> Unit,
    title: String,
    onTitleChange: (String) -> Unit,
    labels: String,
    onLabelsChange: (String) -> Unit,
    onAddLabelChip: (String) -> Unit,
    canPublish: Boolean,
    isPublishing: Boolean,
    onPreview: () -> Unit,
    onPublish: () -> Unit,
    selectedBlogName: String?
) {
    var showAdvanced by remember { mutableStateOf(false) }

    val wordCount = if (caption.trim().isNotEmpty()) caption.trim().split(Regex("\\s+")).size else 0
    val charCount = caption.length

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // 2. Caption Area Card
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(Color.White)
                .border(1.dp, Slate200, RoundedCornerShape(16.dp))
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "2. Enter Caption",
                        style = MaterialTheme.typography.titleMedium,
                        color = Slate900
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(text = "*", color = Color.Red, fontWeight = FontWeight.Bold)
                }

                Text(
                    text = "$wordCount words · $charCount chars",
                    fontSize = 11.sp,
                    color = Slate400
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            OutlinedTextField(
                value = caption,
                onValueChange = onCaptionChange,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(130.dp)
                    .testTag("caption_input"),
                placeholder = {
                    Text(
                        text = "Write what happened, descriptions, story details, or thoughts. Line breaks and paragraphs are preserved...",
                        fontSize = 13.sp,
                        color = Slate400
                    )
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = OrangePrimary,
                    unfocusedBorderColor = Slate200,
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color(0xFFF8FAFC)
                ),
                shape = RoundedCornerShape(12.dp)
            )
        }

        // Optional Details Accordion (Title, Labels)
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(Color.White)
                .border(1.dp, Slate200, RoundedCornerShape(16.dp))
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showAdvanced = !showAdvanced }
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Default.Layers, contentDescription = null, tint = OrangePrimary, modifier = Modifier.size(18.dp))
                    Text(
                        text = "Optional Post Options",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Slate900
                    )
                    if (title.isNotBlank() || labels.isNotBlank()) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(50))
                                .background(Color(0xFFFFF7ED))
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text("Customized", fontSize = 10.sp, color = OrangePrimary, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                Icon(
                    imageVector = if (showAdvanced) Icons.Default.ExpandMore else Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = Slate400
                )
            }

            AnimatedVisibility(visible = showAdvanced) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFF8FAFC))
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Optional Title Input
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Custom Post Title (Optional)", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Slate700)
                            Text("Auto-generates if empty", fontSize = 10.sp, color = Slate400)
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        OutlinedTextField(
                            value = title,
                            onValueChange = onTitleChange,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("title_input"),
                            placeholder = { Text("Leave blank to auto-create from caption", fontSize = 12.sp) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = OrangePrimary,
                                unfocusedBorderColor = Slate300
                            ),
                            shape = RoundedCornerShape(10.dp)
                        )
                    }

                    // Optional Labels Input & Quick Chips
                    Column {
                        Text("Blogger Labels / Categories (Optional)", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Slate700)
                        Spacer(modifier = Modifier.height(4.dp))
                        OutlinedTextField(
                            value = labels,
                            onValueChange = onLabelsChange,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("labels_input"),
                            placeholder = { Text("e.g. News, Viral, Entertainment", fontSize = 12.sp) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = OrangePrimary,
                                unfocusedBorderColor = Slate300
                            ),
                            shape = RoundedCornerShape(10.dp)
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        // Quick add chips
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text("Quick add:", fontSize = 11.sp, color = Slate400, modifier = Modifier.align(Alignment.CenterVertically))
                            for (tag in POPULAR_LABEL_SUGGESTIONS.take(4)) {
                                Box(
                                    modifier = Modifier
                                        .clip(CircleShape)
                                        .border(1.dp, Slate300, CircleShape)
                                        .background(Color.White)
                                        .clickable { onAddLabelChip(tag) }
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text("+$tag", fontSize = 10.sp, color = Slate700, fontWeight = FontWeight.Medium)
                                }
                            }
                        }
                    }
                }
            }
        }

        // Primary Action Buttons
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            // Preview Button
            OutlinedButton(
                onClick = onPreview,
                enabled = canPublish,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .testTag("preview_button"),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.Visibility, contentDescription = null, tint = Slate700, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Preview Blogger Post HTML", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Slate700)
            }

            // Big Orange PUBLISH TO BLOGGER Button
            Button(
                onClick = onPublish,
                enabled = canPublish && !isPublishing,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .testTag("publish_button"),
                colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
                shape = RoundedCornerShape(16.dp)
            ) {
                if (isPublishing) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    Spacer(modifier = Modifier.width(10.dp))
                    Text("Publishing to Blogger...", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                } else {
                    Icon(Icons.Default.Send, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(10.dp))
                    Text("PUBLISH TO BLOGGER", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }

            if (!selectedBlogName.isNullOrBlank()) {
                Text(
                    text = "Publishing to: $selectedBlogName",
                    fontSize = 11.sp,
                    color = Slate400,
                    modifier = Modifier.align(Alignment.CenterHorizontally)
                )
            }
        }
    }
}
