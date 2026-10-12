package com.aistudio.bloggerautopublisher.ui.components

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aistudio.bloggerautopublisher.ui.theme.*

private const val GOOGLE_OAUTH_CLIENT_ID = "292753737535-83sbkub1lg14pfcf9hp2gfej139i0pc3.apps.googleusercontent.com"
private const val GOOGLE_OAUTH_REDIRECT_URI = "https://blogger-post-automation.vercel.app/__/auth/handler"
private const val GOOGLE_OAUTH_SCOPE = "https://www.googleapis.com/auth/blogger https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"

@Composable
fun AuthCardView(
    isAuthenticating: Boolean,
    authError: String?,
    onConnectWithToken: (String) -> Unit
) {
    val context = LocalContext.current
    var tokenInput by remember { mutableStateOf("") }
    var isManualTokenVisible by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp)),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Slate200)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(60.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(OrangePrimary),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Bolt,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(32.dp)
                )
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "Connect Your Blogger Account",
                    style = MaterialTheme.typography.titleLarge,
                    color = Slate900
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Authenticate with Google to manage and publish high-quality articles directly to your Blogger blogs.",
                    fontSize = 12.sp,
                    color = Slate500,
                    lineHeight = 18.sp
                )
            }

            if (!authError.isNullOrBlank()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(Red50)
                        .border(1.dp, RedBorder, RoundedCornerShape(10.dp))
                        .padding(12.dp)
                ) {
                    Text(
                        text = authError,
                        fontSize = 12.sp,
                        color = Red500
                    )
                }
            }

            // Highlights
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFFF8FAFC))
                    .border(1.dp, Slate200, RoundedCornerShape(12.dp))
                    .padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Emerald600, modifier = Modifier.size(16.dp))
                    Text("Direct Google Blogger API v3 integration", fontSize = 12.sp, color = Slate700)
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Emerald600, modifier = Modifier.size(16.dp))
                    Text("Strict user session isolation: publishes to your blogs only", fontSize = 12.sp, color = Slate700)
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.Security, contentDescription = null, tint = Emerald600, modifier = Modifier.size(16.dp))
                    Text("Tokens stored locally on device and never shared", fontSize = 12.sp, color = Slate700)
                }
            }

            // Primary Google Sign In Action
            Button(
                onClick = {
                    val oauthUrl = "https://accounts.google.com/o/oauth2/v2/auth?" +
                        "client_id=" + Uri.encode(GOOGLE_OAUTH_CLIENT_ID) +
                        "&redirect_uri=" + Uri.encode(GOOGLE_OAUTH_REDIRECT_URI) +
                        "&response_type=token" +
                        "&scope=" + Uri.encode(GOOGLE_OAUTH_SCOPE) +
                        "&prompt=select_account"

                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(oauthUrl))
                    context.startActivity(intent)
                    isManualTokenVisible = true
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .testTag("google_signin_button"),
                colors = ButtonDefaults.buttonColors(containerColor = Slate900),
                shape = RoundedCornerShape(12.dp),
                enabled = !isAuthenticating
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (isAuthenticating) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                        Text("Verifying Account...", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    } else {
                        Text("Sign In With Google OAuth", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        Icon(Icons.Default.OpenInNew, contentDescription = null, modifier = Modifier.size(16.dp))
                    }
                }
            }

            // Manual / Web Return Token Input
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = tokenInput,
                    onValueChange = { tokenInput = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Paste Google Access Token", fontSize = 12.sp) },
                    placeholder = { Text("ya29.a0...", fontSize = 11.sp, color = Slate400) },
                    singleLine = true,
                    textStyle = androidx.compose.ui.text.TextStyle(
                        fontFamily = FontFamily.Monospace,
                        fontSize = 11.sp,
                        color = Slate900
                    ),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = OrangePrimary,
                        unfocusedBorderColor = Slate300
                    ),
                    shape = RoundedCornerShape(10.dp)
                )

                if (tokenInput.isNotBlank()) {
                    Button(
                        onClick = { onConnectWithToken(tokenInput.trim()) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
                        shape = RoundedCornerShape(10.dp),
                        enabled = !isAuthenticating
                    ) {
                        Text("Connect Account with Token", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Icon(Icons.Default.Lock, contentDescription = null, tint = Slate400, modifier = Modifier.size(12.dp))
                Text("Requires blogger management scope only", fontSize = 11.sp, color = Slate400)
            }
        }
    }
}
