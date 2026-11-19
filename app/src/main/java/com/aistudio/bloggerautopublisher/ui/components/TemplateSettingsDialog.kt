package com.aistudio.bloggerautopublisher.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Restore
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.TabRowDefaults.SecondaryIndicator
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.aistudio.bloggerautopublisher.model.AdLinkConfig
import com.aistudio.bloggerautopublisher.model.AdsSettings
import com.aistudio.bloggerautopublisher.model.BannerAdConfig
import com.aistudio.bloggerautopublisher.template.BloggerTemplateEngine
import com.aistudio.bloggerautopublisher.ui.theme.*
import com.aistudio.bloggerautopublisher.util.HtmlEntityCodec

@Composable
fun TemplateSettingsDialog(
    isOpen: Boolean,
    onClose: () -> Unit,
    currentTemplate: String,
    currentAdsSettings: AdsSettings = AdsSettings.DEFAULT,
    currentGeminiApiKey: String = "",
    onSaveTemplate: (String) -> Unit,
    onResetTemplate: () -> Unit,
    onSaveAdsSettings: (AdsSettings) -> Unit = {},
    onResetAdsSettings: () -> Unit = {},
    onSaveGeminiApiKey: (String) -> Unit = {}
) {
    if (!isOpen) return

    var selectedTabIndex by remember { mutableIntStateOf(0) }
    var templateText by remember(currentTemplate) { mutableStateOf(currentTemplate) }
    var apiKeyText by remember(currentGeminiApiKey) { mutableStateOf(currentGeminiApiKey) }
    var isApiKeyVisible by remember { mutableStateOf(false) }

    var smartEnabled by remember(currentAdsSettings) { mutableStateOf(currentAdsSettings.smartLink.enabled) }
    var smartUrl by remember(currentAdsSettings) { mutableStateOf(currentAdsSettings.smartLink.url) }
    var directEnabled by remember(currentAdsSettings) { mutableStateOf(currentAdsSettings.directLink.enabled) }
    var directUrl by remember(currentAdsSettings) { mutableStateOf(currentAdsSettings.directLink.url) }
    var popupEnabled by remember(currentAdsSettings) { mutableStateOf(currentAdsSettings.popupAd.enabled) }
    var popupUrl by remember(currentAdsSettings) { mutableStateOf(currentAdsSettings.popupAd.url) }
    var bannerEnabled by remember(currentAdsSettings) { mutableStateOf(currentAdsSettings.bannerAd.enabled) }
    var bannerImgUrl by remember(currentAdsSettings) { mutableStateOf(currentAdsSettings.bannerAd.imageUrl) }
    var bannerClickUrl by remember(currentAdsSettings) { mutableStateOf(currentAdsSettings.bannerAd.clickUrl) }
    var adsValidationError by remember { mutableStateOf<String?>(null) }

    fun validateAdsDraft(): String? {
        val (sOk, sNorm) = AdsSettings.validateUrl(smartUrl)
        if (!sOk) return "Smart Link URL must start with https:// or http://"
        if (smartEnabled && sNorm.isEmpty()) return "Smart Link is enabled but empty"

        val (dOk, dNorm) = AdsSettings.validateUrl(directUrl)
        if (!dOk) return "Direct Link URL must start with https:// or http://"
        if (directEnabled && dNorm.isEmpty()) return "Direct Link is enabled but empty"

        val (pOk, pNorm) = AdsSettings.validateUrl(popupUrl)
        if (!pOk) return "Pop-up Ad URL must start with https:// or http://"
        if (popupEnabled && pNorm.isEmpty()) return "Pop-up Ad is enabled but empty"

        val (biOk, biNorm) = AdsSettings.validateUrl(bannerImgUrl)
        if (!biOk) return "Banner Image URL must start with https:// or http://"
        if (bannerEnabled && biNorm.isEmpty()) return "Banner Ad is enabled but Banner Image URL is empty"

        val (bcOk, _) = AdsSettings.validateUrl(bannerClickUrl)
        if (!bcOk) return "Banner Click URL must start with https:// or http://"

        return null
    }

    fun buildAdsDraft(): AdsSettings {
        return AdsSettings.sanitize(
            AdsSettings(
                smartLink = AdLinkConfig(enabled = smartEnabled, url = smartUrl),
                directLink = AdLinkConfig(enabled = directEnabled, url = directUrl),
                popupAd = AdLinkConfig(enabled = popupEnabled, url = popupUrl),
                bannerAd = BannerAdConfig(enabled = bannerEnabled, imageUrl = bannerImgUrl, clickUrl = bannerClickUrl)
            )
        )
    }

    Dialog(
        onDismissRequest = onClose,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .fillMaxHeight(0.86f)
                .clip(RoundedCornerShape(20.dp)),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFF8FAFC))
                        .border(1.dp, Slate200)
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.Tune, contentDescription = null, tint = OrangePrimary)
                        Column {
                            Text("Publisher Settings", style = MaterialTheme.typography.titleMedium, color = Slate900)
                            Text("Template, Separate Ads & Gemini AI key", fontSize = 11.sp, color = Slate500)
                        }
                    }

                    IconButton(onClick = onClose) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Slate400)
                    }
                }

                // Tabs: Master Template | Ads Settings | Gemini AI Key
                TabRow(
                    selectedTabIndex = selectedTabIndex,
                    containerColor = Color.White,
                    contentColor = OrangePrimary,
                    indicator = { tabPositions ->
                        SecondaryIndicator(
                            modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTabIndex]),
                            color = OrangePrimary
                        )
                    }
                ) {
                    Tab(
                        selected = selectedTabIndex == 0,
                        onClick = { selectedTabIndex = 0 },
                        text = {
                            Text(
                                "Template",
                                fontSize = 12.sp,
                                fontWeight = if (selectedTabIndex == 0) FontWeight.Bold else FontWeight.Normal,
                                color = if (selectedTabIndex == 0) OrangePrimary else Slate700
                            )
                        }
                    )
                    Tab(
                        selected = selectedTabIndex == 1,
                        onClick = { selectedTabIndex = 1 },
                        text = {
                            Text(
                                "Ads Settings",
                                fontSize = 12.sp,
                                fontWeight = if (selectedTabIndex == 1) FontWeight.Bold else FontWeight.Normal,
                                color = if (selectedTabIndex == 1) OrangePrimary else Slate700
                            )
                        }
                    )
                    Tab(
                        selected = selectedTabIndex == 2,
                        onClick = { selectedTabIndex = 2 },
                        text = {
                            Text(
                                "Gemini Key",
                                fontSize = 12.sp,
                                fontWeight = if (selectedTabIndex == 2) FontWeight.Bold else FontWeight.Normal,
                                color = if (selectedTabIndex == 2) OrangePrimary else Slate700
                            )
                        }
                    )
                }

                // Body based on active tab
                when (selectedTabIndex) {
                    0 -> {
                        // TAB 0: Master Template Editor
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            // Variable Tags
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(Color(0xFFF1F5F9))
                                    .padding(10.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Dynamic Variables:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Slate700)
                                    Text("Tap to append", fontSize = 10.sp, color = Slate400)
                                }

                                Spacer(modifier = Modifier.height(6.dp))

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .horizontalScroll(rememberScrollState()),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    for (tag in listOf("{{IMAGE_URL}}", "{{CAPTION}}", "{{TITLE}}", "{{META_DESCRIPTION}}", "{{PUBLISHED_DATE}}")) {
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(6.dp))
                                                .background(Color.White)
                                                .border(1.dp, Slate200, RoundedCornerShape(6.dp))
                                                .clickable { templateText += " $tag" }
                                                .padding(horizontal = 6.dp, vertical = 3.dp)
                                        ) {
                                            Text(
                                                text = tag,
                                                fontSize = 10.sp,
                                                fontFamily = FontFamily.Monospace,
                                                fontWeight = FontWeight.SemiBold,
                                                color = OrangePrimary
                                            )
                                        }
                                    }
                                }
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Code, contentDescription = null, tint = Slate500, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Master HTML & Script Content", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Slate700)
                                }

                                TextButton(
                                    onClick = {
                                        onResetTemplate()
                                        templateText = BloggerTemplateEngine.DEFAULT_MASTER_TEMPLATE
                                    }
                                ) {
                                    Icon(Icons.Default.Restore, contentDescription = null, modifier = Modifier.size(14.dp), tint = OrangePrimary)
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Default", fontSize = 11.sp, color = OrangePrimary)
                                }
                            }

                            OutlinedTextField(
                                value = templateText,
                                onValueChange = { templateText = it },
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxWidth(),
                                textStyle = androidx.compose.ui.text.TextStyle(
                                    fontFamily = FontFamily.Monospace,
                                    fontSize = 11.sp,
                                    color = Color(0xFF0F172A)
                                ),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = OrangePrimary,
                                    unfocusedBorderColor = Slate200,
                                    focusedContainerColor = Color(0xFFF8FAFC),
                                    unfocusedContainerColor = Color(0xFFF8FAFC)
                                ),
                                shape = RoundedCornerShape(10.dp)
                            )
                        }
                    }

                    1 -> {
                        // TAB 1: Separate Ads Settings
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxWidth()
                                .verticalScroll(rememberScrollState())
                                .padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Separate Ads Settings", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Slate900)
                                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    TextButton(
                                        onClick = {
                                            adsValidationError = null
                                            val d = AdsSettings.DEFAULT
                                            smartEnabled = d.smartLink.enabled
                                            smartUrl = d.smartLink.url
                                            directEnabled = d.directLink.enabled
                                            directUrl = d.directLink.url
                                            popupEnabled = d.popupAd.enabled
                                            popupUrl = d.popupAd.url
                                            bannerEnabled = d.bannerAd.enabled
                                            bannerImgUrl = d.bannerAd.imageUrl
                                            bannerClickUrl = d.bannerAd.clickUrl
                                            onResetAdsSettings()
                                        }
                                    ) {
                                        Text("Defaults", fontSize = 11.sp, color = OrangePrimary)
                                    }
                                    TextButton(
                                        onClick = {
                                            adsValidationError = null
                                            smartEnabled = false; smartUrl = ""
                                            directEnabled = false; directUrl = ""
                                            popupEnabled = false; popupUrl = ""
                                            bannerEnabled = false; bannerImgUrl = ""; bannerClickUrl = ""
                                        }
                                    ) {
                                        Text("Clear All", fontSize = 11.sp, color = Color(0xFFDC2626))
                                    }
                                }
                            }

                            if (adsValidationError != null) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(Color(0xFFFEF2F2))
                                        .border(1.dp, Color(0xFFFECACA), RoundedCornerShape(10.dp))
                                        .padding(10.dp)
                                ) {
                                    Text(adsValidationError!!, fontSize = 11.sp, color = Color(0xFFB91C1C))
                                }
                            }

                            AdUrlSettingCard(
                                title = "Smart Link URL (Play Now)",
                                subtitle = "Opens once on user tap of #btn1",
                                enabled = smartEnabled,
                                onToggle = {
                                    adsValidationError = null
                                    smartEnabled = it
                                },
                                urlValue = smartUrl,
                                onUrlChange = {
                                    adsValidationError = null
                                    smartUrl = it
                                    if (it.isBlank()) smartEnabled = false
                                },
                                placeholder = "https://example.com/smartlink?key=...",
                                onClear = {
                                    adsValidationError = null
                                    smartEnabled = false
                                    smartUrl = ""
                                }
                            )

                            AdUrlSettingCard(
                                title = "Direct Link URL (Watch Now)",
                                subtitle = "Opens on user tap of #btn2",
                                enabled = directEnabled,
                                onToggle = {
                                    adsValidationError = null
                                    directEnabled = it
                                },
                                urlValue = directUrl,
                                onUrlChange = {
                                    adsValidationError = null
                                    directUrl = it
                                    if (it.isBlank()) directEnabled = false
                                },
                                placeholder = "https://example.com/directlink?key=...",
                                onClear = {
                                    adsValidationError = null
                                    directEnabled = false
                                    directUrl = ""
                                }
                            )

                            AdUrlSettingCard(
                                title = "Pop-up Ad URL",
                                subtitle = "Ad script .js or click-triggered destination URL",
                                enabled = popupEnabled,
                                onToggle = {
                                    adsValidationError = null
                                    popupEnabled = it
                                },
                                urlValue = popupUrl,
                                onUrlChange = {
                                    adsValidationError = null
                                    popupUrl = it
                                    if (it.isBlank()) popupEnabled = false
                                },
                                placeholder = "https://cdn.example.com/popunder.js",
                                onClear = {
                                    adsValidationError = null
                                    popupEnabled = false
                                    popupUrl = ""
                                }
                            )

                            // Banner Image + Banner Click URL
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(Color(0xFFF8FAFC))
                                    .border(1.dp, Slate200, RoundedCornerShape(12.dp))
                                    .padding(10.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text("Banner Ad (Bottom Slot)", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Slate900)
                                        Text("Main Image remains primary Blogger thumbnail", fontSize = 10.sp, color = Slate500)
                                    }
                                    Switch(
                                        checked = bannerEnabled,
                                        onCheckedChange = {
                                            adsValidationError = null
                                            bannerEnabled = it
                                        },
                                        colors = SwitchDefaults.colors(
                                            checkedThumbColor = Color.White,
                                            checkedTrackColor = OrangePrimary
                                        )
                                    )
                                }
                                OutlinedTextField(
                                    value = bannerImgUrl,
                                    onValueChange = {
                                        adsValidationError = null
                                        bannerImgUrl = it
                                        if (it.isBlank()) bannerEnabled = false
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    label = { Text("Banner Image URL", fontSize = 10.sp) },
                                    placeholder = { Text("https://cdn.example.com/banner.jpg", fontSize = 11.sp, color = Slate400) },
                                    singleLine = true,
                                    trailingIcon = {
                                        if (bannerImgUrl.isNotBlank()) {
                                            IconButton(onClick = { bannerEnabled = false; bannerImgUrl = ""; bannerClickUrl = "" }) {
                                                Icon(Icons.Default.Delete, contentDescription = "Clear Banner", tint = Slate400, modifier = Modifier.size(16.dp))
                                            }
                                        }
                                    },
                                    textStyle = androidx.compose.ui.text.TextStyle(fontFamily = FontFamily.Monospace, fontSize = 11.sp, color = Slate900),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = OrangePrimary,
                                        unfocusedBorderColor = Slate200,
                                        focusedContainerColor = Color.White,
                                        unfocusedContainerColor = Color.White
                                    ),
                                    shape = RoundedCornerShape(8.dp)
                                )
                                OutlinedTextField(
                                    value = bannerClickUrl,
                                    onValueChange = {
                                        adsValidationError = null
                                        bannerClickUrl = it
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    label = { Text("Banner Click URL (Optional)", fontSize = 10.sp) },
                                    placeholder = { Text("https://sponsor-destination.com/offer", fontSize = 11.sp, color = Slate400) },
                                    singleLine = true,
                                    textStyle = androidx.compose.ui.text.TextStyle(fontFamily = FontFamily.Monospace, fontSize = 11.sp, color = Slate900),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = OrangePrimary,
                                        unfocusedBorderColor = Slate200,
                                        focusedContainerColor = Color.White,
                                        unfocusedContainerColor = Color.White
                                    ),
                                    shape = RoundedCornerShape(8.dp)
                                )
                            }
                        }
                    }

                    else -> {
                        // TAB 2: Gemini AI Key Configuration
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Key, contentDescription = null, tint = OrangePrimary, modifier = Modifier.size(20.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Personal Google Gemini API Key", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Slate900)
                            }

                            Text(
                                text = "Enter your Google Gemini API key to power AI content analysis, catchy SEO headline generation, and responsive 16:9 thumbnail composition. Your key is stored locally in your device and never exposed.",
                                fontSize = 12.sp,
                                color = Slate500,
                                lineHeight = 18.sp
                            )

                            OutlinedTextField(
                                value = apiKeyText,
                                onValueChange = { apiKeyText = it },
                                modifier = Modifier.fillMaxWidth(),
                                placeholder = { Text("AIzaSy...", fontSize = 12.sp, color = Slate400) },
                                singleLine = true,
                                visualTransformation = if (isApiKeyVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                trailingIcon = {
                                    IconButton(onClick = { isApiKeyVisible = !isApiKeyVisible }) {
                                        Icon(
                                            imageVector = if (isApiKeyVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                            contentDescription = if (isApiKeyVisible) "Hide key" else "Show key",
                                            tint = Slate500
                                        )
                                    }
                                },
                                textStyle = androidx.compose.ui.text.TextStyle(
                                    fontFamily = FontFamily.Monospace,
                                    fontSize = 12.sp,
                                    color = Color(0xFF0F172A)
                                ),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = OrangePrimary,
                                    unfocusedBorderColor = Slate200,
                                    focusedContainerColor = Color(0xFFF8FAFC),
                                    unfocusedContainerColor = Color(0xFFF8FAFC)
                                ),
                                shape = RoundedCornerShape(10.dp)
                            )

                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(Color(0xFFFFF7ED))
                                    .border(1.dp, Color(0xFFFFEDD5), RoundedCornerShape(10.dp))
                                    .padding(12.dp)
                            ) {
                                Text(
                                    text = "Note: You can generate a free Gemini API key anytime at Google AI Studio (aistudio.google.com). Each user securely brings and uses their own key.",
                                    fontSize = 11.sp,
                                    color = Color(0xFF9A3412)
                                )
                            }
                        }
                    }
                }

                // Footer
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.White)
                        .border(1.dp, Slate200)
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedButton(onClick = onClose) {
                        Text("Cancel", fontSize = 12.sp, color = Slate700)
                    }

                    Button(
                        onClick = {
                            val err = validateAdsDraft()
                            if (err != null) {
                                adsValidationError = err
                                selectedTabIndex = 1
                                return@Button
                            }
                            onSaveTemplate(HtmlEntityCodec.repairNonAsciiHtmlEntities(templateText))
                            onSaveAdsSettings(buildAdsDraft())
                            onSaveGeminiApiKey(apiKeyText)
                            onClose()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(
                            "Save Settings",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AdUrlSettingCard(
    title: String,
    subtitle: String,
    enabled: Boolean,
    onToggle: (Boolean) -> Unit,
    urlValue: String,
    onUrlChange: (String) -> Unit,
    placeholder: String,
    onClear: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFFF8FAFC))
            .border(1.dp, Slate200, RoundedCornerShape(12.dp))
            .padding(10.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Slate900)
                Text(subtitle, fontSize = 10.sp, color = Slate500)
            }
            Switch(
                checked = enabled,
                onCheckedChange = onToggle,
                colors = SwitchDefaults.colors(
                    checkedThumbColor = Color.White,
                    checkedTrackColor = OrangePrimary
                )
            )
        }
        OutlinedTextField(
            value = urlValue,
            onValueChange = onUrlChange,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text(placeholder, fontSize = 11.sp, color = Slate400) },
            singleLine = true,
            trailingIcon = {
                if (urlValue.isNotBlank()) {
                    IconButton(onClick = onClear) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = "Delete $title",
                            tint = Slate400,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            },
            textStyle = androidx.compose.ui.text.TextStyle(
                fontFamily = FontFamily.Monospace,
                fontSize = 11.sp,
                color = Slate900
            ),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = OrangePrimary,
                unfocusedBorderColor = Slate200,
                focusedContainerColor = Color.White,
                unfocusedContainerColor = Color.White
            ),
            shape = RoundedCornerShape(8.dp)
        )
    }
}

