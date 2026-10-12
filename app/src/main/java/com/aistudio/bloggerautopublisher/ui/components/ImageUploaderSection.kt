package com.aistudio.bloggerautopublisher.ui.components

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.VideoLibrary
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.aistudio.bloggerautopublisher.ui.theme.Emerald600
import com.aistudio.bloggerautopublisher.ui.theme.OrangePrimary
import com.aistudio.bloggerautopublisher.ui.theme.OrangeSecondary
import com.aistudio.bloggerautopublisher.ui.theme.PurpleAccent
import com.aistudio.bloggerautopublisher.ui.theme.Slate200
import com.aistudio.bloggerautopublisher.ui.theme.Slate300
import com.aistudio.bloggerautopublisher.ui.theme.Slate400
import com.aistudio.bloggerautopublisher.ui.theme.Slate500
import com.aistudio.bloggerautopublisher.ui.theme.Slate700
import com.aistudio.bloggerautopublisher.ui.theme.Slate900
import com.aistudio.bloggerautopublisher.util.ImageOptimizer
import com.aistudio.bloggerautopublisher.util.ProcessedImage

@Composable
fun ImageUploaderSection(
    mainImage: ProcessedImage?,
    mainImageUrlOverride: String?,
    onMainImageSelected: (Uri) -> Unit,
    onMainImageUrlOverride: (String) -> Unit,
    onClearMainImage: () -> Unit,
    thumbnailImage: ProcessedImage?,
    thumbnailUrlOverride: String?,
    onThumbnailSelected: (Uri) -> Unit,
    onThumbnailUrlOverride: (String) -> Unit,
    onClearThumbnail: () -> Unit,
    useSeparateThumbnail: Boolean,
    onToggleSeparateThumbnail: (Boolean) -> Unit,
    isProcessing: Boolean
) {
    val context = LocalContext.current
    var showMainUrlInput by remember { mutableStateOf(false) }
    var mainUrlText by remember { mutableStateOf("") }

    var showThumbUrlInput by remember { mutableStateOf(false) }
    var thumbUrlText by remember { mutableStateOf("") }

    // Android Photo Picker
    val pickMainPhotoLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) onMainImageSelected(uri)
    }

    val pickThumbPhotoLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) onThumbnailSelected(uri)
    }

    val effectiveMainImageSrc = mainImageUrlOverride ?: mainImage?.uri?.toString()
    val effectiveThumbSrc = thumbnailUrlOverride ?: thumbnailImage?.uri?.toString()

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // 1. Main Post Image Card
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
                        text = "1. Main Post Image",
                        style = MaterialTheme.typography.titleMedium,
                        color = Slate900
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(text = "*", color = Color.Red, fontWeight = FontWeight.Bold)
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .background(Color(0xFFFFF7ED))
                        .border(1.dp, Color(0xFFFFEDD5), RoundedCornerShape(50))
                        .padding(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "{{IMAGE_URL}}",
                        color = OrangePrimary,
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (effectiveMainImageSrc != null) {
                // Image Loaded Preview Card
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFF0F172A))
                ) {
                    AsyncImage(
                        model = effectiveMainImageSrc,
                        contentDescription = "Main Post Image",
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(16f / 9f),
                        contentScale = ContentScale.Fit
                    )

                    // Top Action Overlay
                    Row(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(8.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Button(
                            onClick = {
                                pickMainPhotoLauncher.launch(
                                    PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                )
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color.Black.copy(alpha = 0.6f)),
                            shape = CircleShape,
                            modifier = Modifier.testTag("replace_photo_button")
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = "Replace", tint = Color.White, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Replace", fontSize = 11.sp, color = Color.White)
                        }

                        IconButton(
                            onClick = onClearMainImage,
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(Color.Black.copy(alpha = 0.6f))
                                .testTag("remove_photo_button")
                        ) {
                            Icon(Icons.Default.Close, contentDescription = "Remove", tint = Color.White, modifier = Modifier.size(16.dp))
                        }
                    }

                    // Bottom info bar
                    Row(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .fillMaxWidth()
                            .background(Color.Black.copy(alpha = 0.7f))
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (mainImage != null) {
                            Text(
                                text = "Auto-Optimized",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = OrangeSecondary
                            )
                            Text(
                                text = "${mainImage.width}×${mainImage.height}px",
                                fontSize = 10.sp,
                                color = Color.White
                            )
                            Text(
                                text = ImageOptimizer.formatFileSize(mainImage.sizeBytes),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Emerald600
                            )
                        } else {
                            Text(
                                text = mainImageUrlOverride.orEmpty(),
                                fontSize = 10.sp,
                                color = Color.White,
                                maxLines = 1
                            )
                        }
                    }
                }
            } else {
                // Empty Image Picker Zone
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFFF8FAFC))
                        .border(1.5.dp, Slate300, RoundedCornerShape(12.dp))
                        .padding(20.dp),
                    contentAlignment = Alignment.Center
                ) {
                    if (isProcessing) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            CircularProgressIndicator(color = OrangePrimary, modifier = Modifier.size(32.dp))
                            Text("Optimizing image...", fontSize = 12.sp, color = Slate700)
                        }
                    } else {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(46.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(Color(0xFFFFF7ED)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Image, contentDescription = null, tint = OrangePrimary, modifier = Modifier.size(26.dp))
                            }
                            Text(
                                text = "Select Photo for Blogger Post",
                                style = MaterialTheme.typography.titleMedium,
                                color = Slate900
                            )
                            Text(
                                text = "Pick from gallery or enter image URL",
                                style = MaterialTheme.typography.labelSmall,
                                color = Slate500
                            )

                            Spacer(modifier = Modifier.height(4.dp))

                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(
                                    onClick = {
                                        pickMainPhotoLauncher.launch(
                                            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                        )
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.testTag("choose_photo_button")
                                ) {
                                    Icon(Icons.Default.Image, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Choose Photo", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                }
                            }

                            if (!showMainUrlInput) {
                                TextButton(onClick = { showMainUrlInput = true }) {
                                    Icon(Icons.Default.Link, contentDescription = null, tint = Slate500, modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("or paste image URL", fontSize = 11.sp, color = Slate500)
                                }
                            } else {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(top = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    OutlinedTextField(
                                        value = mainUrlText,
                                        onValueChange = { mainUrlText = it },
                                        placeholder = { Text("https://example.com/image.jpg", fontSize = 11.sp) },
                                        singleLine = true,
                                        modifier = Modifier.weight(1f),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = OrangePrimary,
                                            unfocusedBorderColor = Slate300
                                        )
                                    )
                                    IconButton(
                                        onClick = {
                                            if (mainUrlText.isNotBlank()) {
                                                onMainImageUrlOverride(mainUrlText)
                                                showMainUrlInput = false
                                            }
                                        },
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(OrangePrimary)
                                    ) {
                                        Icon(Icons.Default.Check, contentDescription = "Apply", tint = Color.White)
                                    }
                                    IconButton(onClick = { showMainUrlInput = false }) {
                                        Icon(Icons.Default.Close, contentDescription = "Cancel", tint = Slate400)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 2. Separate Video Player Thumbnail (Optional)
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
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(Icons.Default.VideoLibrary, contentDescription = null, tint = PurpleAccent, modifier = Modifier.size(18.dp))
                    Text(
                        text = "Video Player Thumbnail",
                        style = MaterialTheme.typography.titleMedium,
                        color = Slate900
                    )
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .background(Color(0xFFFAF5FF))
                        .border(1.dp, Color(0xFFF3E8FF), RoundedCornerShape(50))
                        .padding(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "{{THUMBNAIL_URL}}",
                        color = PurpleAccent,
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            if (!useSeparateThumbnail && effectiveThumbSrc == null) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFFF8FAFC))
                        .border(1.dp, Slate200, RoundedCornerShape(12.dp))
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Auto-using Main Image",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Slate700
                        )
                        Text(
                            text = "Default: 16:9 thumbnail uses the main photo",
                            fontSize = 11.sp,
                            color = Slate400
                        )
                    }

                    OutlinedButton(
                        onClick = { onToggleSeparateThumbnail(true) },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.testTag("custom_thumbnail_button")
                    ) {
                        Text("+ Custom Thumbnail", fontSize = 11.sp, color = PurpleAccent)
                    }
                }
            } else {
                if (effectiveThumbSrc != null) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF0F172A))
                    ) {
                        AsyncImage(
                            model = effectiveThumbSrc,
                            contentDescription = "Thumbnail Preview",
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(120.dp),
                            contentScale = ContentScale.Fit
                        )

                        Row(
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(6.dp),
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Button(
                                onClick = {
                                    pickThumbPhotoLauncher.launch(
                                        PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                    )
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color.Black.copy(alpha = 0.6f)),
                                shape = CircleShape
                            ) {
                                Text("Change", fontSize = 10.sp, color = Color.White)
                            }
                            IconButton(
                                onClick = onClearThumbnail,
                                modifier = Modifier
                                    .size(28.dp)
                                    .clip(CircleShape)
                                    .background(Color.Black.copy(alpha = 0.6f))
                            ) {
                                Icon(Icons.Default.Close, contentDescription = "Clear", tint = Color.White, modifier = Modifier.size(14.dp))
                            }
                        }
                    }
                } else {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = {
                                pickThumbPhotoLauncher.launch(
                                    PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                )
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = PurpleAccent),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text("Upload Thumbnail", fontSize = 11.sp)
                        }

                        TextButton(onClick = { onToggleSeparateThumbnail(false) }) {
                            Text("Cancel", fontSize = 11.sp, color = Slate500)
                        }
                    }
                }
            }
        }
    }
}
