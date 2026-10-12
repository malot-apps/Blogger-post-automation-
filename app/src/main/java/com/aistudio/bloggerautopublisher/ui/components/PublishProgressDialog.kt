package com.aistudio.bloggerautopublisher.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.aistudio.bloggerautopublisher.ui.theme.Emerald600
import com.aistudio.bloggerautopublisher.ui.theme.OrangePrimary
import com.aistudio.bloggerautopublisher.ui.theme.Slate200
import com.aistudio.bloggerautopublisher.ui.theme.Slate400
import com.aistudio.bloggerautopublisher.ui.theme.Slate500
import com.aistudio.bloggerautopublisher.ui.theme.Slate700
import com.aistudio.bloggerautopublisher.ui.theme.Slate900

data class StepItem(val id: Int, val title: String, val desc: String)

val STEPS = listOf(
    StepItem(1, "Optimizing Image & Media", "Ensuring fast mobile loading"),
    StepItem(2, "Formatting Blogger Template", "Applying variables and HTML styling"),
    StepItem(3, "Connecting to Blogger API v3", "Authorizing with secure token"),
    StepItem(4, "Publishing Live Post", "Finalizing live article URL")
)

@Composable
fun PublishProgressDialog(
    isOpen: Boolean,
    currentStep: Int,
    blogName: String?
) {
    if (!isOpen) return

    Dialog(onDismissRequest = {}) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .clip(RoundedCornerShape(24.dp)),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Spinner Badge
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(OrangePrimary.copy(alpha = 0.12f)),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(
                        color = OrangePrimary,
                        modifier = Modifier.size(30.dp),
                        strokeWidth = 3.dp
                    )
                }

                Text(
                    text = "Publishing to Blogger",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Slate900
                )

                if (!blogName.isNullOrBlank()) {
                    Text(
                        text = blogName,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = OrangePrimary
                    )
                }

                // Steps list card
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color(0xFFF8FAFC))
                        .border(1.dp, Slate200, RoundedCornerShape(14.dp))
                        .padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    STEPS.forEach { step ->
                        val isDone = currentStep > step.id
                        val isCurrent = currentStep == step.id

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            if (isDone) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = Emerald600,
                                    modifier = Modifier.size(18.dp)
                                )
                            } else if (isCurrent) {
                                CircularProgressIndicator(
                                    color = OrangePrimary,
                                    modifier = Modifier.size(16.dp),
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Box(
                                    modifier = Modifier
                                        .size(18.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFFE2E8F0)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = "${step.id}",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Slate500
                                    )
                                }
                            }

                            Column {
                                Text(
                                    text = step.title,
                                    fontSize = 12.sp,
                                    fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.SemiBold,
                                    color = if (isCurrent) Slate900 else if (isDone) Slate700 else Slate400
                                )
                                Text(
                                    text = step.desc,
                                    fontSize = 10.sp,
                                    color = Slate500
                                )
                            }
                        }
                    }
                }

                Text(
                    text = "Please keep the app open while publishing...",
                    fontSize = 11.sp,
                    color = Slate400
                )
            }
        }
    }
}
