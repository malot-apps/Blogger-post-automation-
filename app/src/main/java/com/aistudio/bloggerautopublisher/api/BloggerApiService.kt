package com.aistudio.bloggerautopublisher.api

import com.aistudio.bloggerautopublisher.model.BloggerBlog
import com.aistudio.bloggerautopublisher.model.PublishedPost
import com.aistudio.bloggerautopublisher.model.UserProfile
import com.aistudio.bloggerautopublisher.util.MainImageSelector
import com.aistudio.bloggerautopublisher.util.ThumbnailCandidate
import com.aistudio.bloggerautopublisher.util.ThumbnailCandidateRole
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.InetAddress
import java.net.URI
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID
import java.util.concurrent.TimeUnit

class BloggerApiException(message: String, val statusCode: Int = 0) : Exception(message)

data class ImageVerificationResult(
    val isValid: Boolean,
    val verifiedUrl: String? = null,
    val contentType: String? = null,
    val contentLength: Long? = null,
    val error: String? = null
)

data class HostedImageUploadResult(
    val success: Boolean,
    val verified: Boolean,
    val imageUrl: String? = null,
    val contentType: String? = null,
    val error: String? = null
)

object BloggerApiService {

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    // Dedicated client with manual redirect checks to prevent SSRF bypasses on HTTP redirects
    private val verifierClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .followRedirects(false)
        .followSslRedirects(false)
        .build()

    private val JSON_MEDIA = "application/json; charset=utf-8".toMediaType()

    private val BLOCKED_HOST_SUFFIXES = listOf(
        ".local", ".internal", ".lan", ".corp", ".home",
        ".test", ".example", ".invalid", ".localhost"
    )

    private fun isPrivateOrInternalAddress(addr: InetAddress): Boolean {
        if (addr.isAnyLocalAddress || addr.isLoopbackAddress || addr.isLinkLocalAddress ||
            addr.isSiteLocalAddress || addr.isMulticastAddress
        ) {
            return true
        }
        val raw = addr.address
        if (raw.size == 4) {
            val b0 = raw[0].toInt() and 0xFF
            val b1 = raw[1].toInt() and 0xFF
            if (b0 == 0 || b0 == 10 || b0 == 127) return true
            if (b0 == 169 && b1 == 254) return true
            if (b0 == 172 && b1 in 16..31) return true
            if (b0 == 192 && b1 == 168) return true
            if (b0 == 100 && b1 in 64..127) return true
        } else if (raw.size == 16) {
            val firstByte = raw[0].toInt() and 0xFF
            val secondByte = raw[1].toInt() and 0xFF
            if ((firstByte and 0xFE) == 0xFC) return true // fc00::/7 Unique Local
            if (firstByte == 0xFE && (secondByte and 0xC0) == 0x80) return true // fe80::/10 Link-Local
        }
        return false
    }

    private fun validateUrlForSsrf(urlString: String): Pair<Boolean, String?> {
        val uri = try {
            URI(urlString)
        } catch (_: Exception) {
            return false to "Malformed or invalid absolute URL."
        }

        val scheme = uri.scheme?.lowercase(Locale.US)
        if (scheme != "https") {
            return false to "Insecure protocol '$scheme'. Only HTTPS is permitted."
        }
        if (!uri.userInfo.isNullOrBlank()) {
            return false to "URLs containing embedded credentials are not allowed."
        }
        val host = uri.host?.lowercase(Locale.US).orEmpty()
        if (host.isBlank() || host == "localhost" || host == "0.0.0.0" || host == "127.0.0.1" || host == "::1") {
            return false to "Rejected internal/local hostname: '$host'."
        }
        if (BLOCKED_HOST_SUFFIXES.any { host.endsWith(it) }) {
            return false to "Rejected private domain suffix for '$host'."
        }
        return try {
            val resolved = InetAddress.getAllByName(host)
            val privateAddr = resolved.firstOrNull { isPrivateOrInternalAddress(it) }
            if (privateAddr != null) {
                false to "Security violation: Hostname '$host' resolves to private/internal IP '${privateAddr.hostAddress}'."
            } else {
                true to null
            }
        } catch (e: Exception) {
            false to "Unable to resolve host '$host': ${e.message ?: "DNS lookup failed"}"
        }
    }

    /**
     * Verifies a public image URL server/client-side before publishing:
     * enforces HTTPS + SSRF protection, checks HTTP 2xx reachability (HEAD with ranged GET fallback),
     * and validates image MIME type (JPG, JPEG, PNG, WebP, GIF, AVIF; blocks SVG & non-images).
     */
    suspend fun verifyPublicImageUrl(
        urlString: String,
        maxRedirects: Int = 3,
        allowSvg: Boolean = false
    ): ImageVerificationResult = withContext(Dispatchers.IO) {
        val syntax = MainImageSelector.validateImageUrlSyntax(
            urlString,
            allowDataUri = false,
            allowHttpUpgrade = true
        )
        if (!syntax.valid || syntax.normalizedUrl.isNullOrBlank()) {
            return@withContext ImageVerificationResult(
                isValid = false,
                error = syntax.reason ?: "Unverified or unsupported image URL."
            )
        }

        var currentUrl = syntax.normalizedUrl

        for (redirect in 0..maxRedirects) {
            val (safe, ssrfError) = validateUrlForSsrf(currentUrl)
            if (!safe) {
                return@withContext ImageVerificationResult(isValid = false, error = ssrfError ?: "SSRF check failed.")
            }

            try {
                var headRequest = Request.Builder()
                    .url(currentUrl)
                    .header("User-Agent", "BloggerPublisher-ImageVerifier/1.0")
                    .header("Accept", "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8")
                    .head()
                    .build()

                var response = try {
                    verifierClient.newCall(headRequest).execute()
                } catch (_: IOException) {
                    val getReq = Request.Builder()
                        .url(currentUrl)
                        .header("User-Agent", "BloggerPublisher-ImageVerifier/1.0")
                        .header("Range", "bytes=0-1024")
                        .header("Accept", "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8")
                        .get()
                        .build()
                    verifierClient.newCall(getReq).execute()
                }

                if (response.code in listOf(400, 403, 405, 501)) {
                    response.close()
                    val getReq = Request.Builder()
                        .url(currentUrl)
                        .header("User-Agent", "BloggerPublisher-ImageVerifier/1.0")
                        .header("Range", "bytes=0-1024")
                        .header("Accept", "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8")
                        .get()
                        .build()
                    response = verifierClient.newCall(getReq).execute()
                }

                response.use { res ->
                    if (res.code in listOf(301, 302, 303, 307, 308)) {
                        val location = res.header("Location")
                        if (location.isNullOrBlank()) {
                            return@withContext ImageVerificationResult(
                                isValid = false,
                                error = "Redirect HTTP ${res.code} missing Location header."
                            )
                        }
                        currentUrl = URI(currentUrl).resolve(location).toString()
                        if (currentUrl.startsWith("http://", ignoreCase = true)) {
                            currentUrl = "https://${currentUrl.substring(7)}"
                        }
                        return@use
                    }

                    if (res.code !in 200..299) {
                        return@withContext ImageVerificationResult(
                            isValid = false,
                            error = "Remote server returned HTTP ${res.code}. Image is not publicly reachable."
                        )
                    }

                    val rawContentType = res.header("Content-Type").orEmpty()
                    val rawBaseMime = rawContentType.substringBefore(';').trim().lowercase(Locale.US)
                    val normalizedMime = MainImageSelector.normalizeImageMimeType(rawBaseMime)

                    if (!allowSvg && rawBaseMime == "image/svg+xml") {
                        return@withContext ImageVerificationResult(
                            isValid = false,
                            contentType = rawBaseMime,
                            error = "SVG images cannot be used as Blogger post thumbnails. Use JPG, JPEG, PNG, or WebP."
                        )
                    }

                    val isImageMime = MainImageSelector.isSupportedImageMimeType(normalizedMime) ||
                        (allowSvg && rawBaseMime == "image/svg+xml") ||
                        (rawBaseMime.startsWith("image/") && rawBaseMime != "image/svg+xml") ||
                        rawBaseMime == "application/octet-stream"

                    if (!isImageMime) {
                        return@withContext ImageVerificationResult(
                            isValid = false,
                            contentType = normalizedMime.ifEmpty { rawBaseMime },
                            error = "Invalid Content-Type '$rawContentType'. Expected JPG, JPEG, PNG, or WebP image MIME type."
                        )
                    }

                    val rawLength = res.header("Content-Length")?.toLongOrNull()
                    if (rawLength != null && rawLength == 0L) {
                        return@withContext ImageVerificationResult(
                            isValid = false,
                            error = "Remote image returned empty body (0 bytes)."
                        )
                    }

                    return@withContext ImageVerificationResult(
                        isValid = true,
                        verifiedUrl = currentUrl,
                        contentType = normalizedMime.ifEmpty { rawBaseMime },
                        contentLength = rawLength
                    )
                }
            } catch (e: Exception) {
                return@withContext ImageVerificationResult(
                    isValid = false,
                    error = "Verification failed: ${e.message ?: "Network error"}"
                )
            }
        }

        ImageVerificationResult(isValid = false, error = "Exceeded maximum redirect limit ($maxRedirects).")
    }

    private fun normalizeExtractedCdnUrl(raw: String): String {
        val trimmed = raw.trim()
        return when {
            trimmed.startsWith("//") -> "https:$trimmed"
            trimmed.startsWith("http://", ignoreCase = true) -> "https://${trimmed.substring(7)}"
            else -> trimmed
        }
    }

    private fun extractBloggerImageUrls(json: JSONObject): List<String> {
        val urls = mutableListOf<String>()

        val imagesArr = json.optJSONArray("images")
        if (imagesArr != null) {
            for (i in 0 until imagesArr.length()) {
                val url = imagesArr.optJSONObject(i)?.optString("url").orEmpty()
                val normalized = normalizeExtractedCdnUrl(url)
                if (normalized.startsWith("https://") && !urls.contains(normalized)) {
                    urls.add(normalized)
                }
            }
        }

        val contentHtml = json.optString("content")
        if (contentHtml.isNotBlank()) {
            val imgRx = Regex("<img[^>]+src=[\"']((?:https?:)?//[^\"']+)[\"']", RegexOption.IGNORE_CASE)
            for (match in imgRx.findAll(contentHtml)) {
                val normalized = normalizeExtractedCdnUrl(match.groupValues[1])
                if (normalized.startsWith("https://") && !urls.contains(normalized)) {
                    urls.add(normalized)
                }
            }
        }

        return urls
    }

    /**
     * Uploads a local base64 / data URI image as a Blogger draft asset to obtain a public
     * Google CDN URL (*.blogger.googleusercontent.com / *.bp.blogspot.com), then verifies it.
     */
    suspend fun uploadImageToBloggerHost(
        accessToken: String?,
        hostBlogId: String,
        imageBase64OrDataUrl: String,
        mimeType: String = "image/jpeg",
        fileName: String = "main-post-image.jpg"
    ): HostedImageUploadResult = withContext(Dispatchers.IO) {
        if (accessToken.isNullOrBlank()) {
            return@withContext HostedImageUploadResult(
                success = false,
                verified = false,
                error = "Google OAuth token is required to upload image to Blogger."
            )
        }
        if (hostBlogId.isBlank()) {
            return@withContext HostedImageUploadResult(
                success = false,
                verified = false,
                error = "No Blogger blog ID specified to host image."
            )
        }

        var cleanBase64 = imageBase64OrDataUrl.trim()
        var effectiveMime = MainImageSelector.normalizeImageMimeType(mimeType).ifEmpty { "image/jpeg" }
        val dataUriMatch = Regex("^data:([^;]+);base64,(.+)$", RegexOption.IGNORE_CASE).find(cleanBase64)
        if (dataUriMatch != null) {
            effectiveMime = MainImageSelector.normalizeImageMimeType(dataUriMatch.groupValues[1])
            cleanBase64 = dataUriMatch.groupValues[2]
        }

        if (!MainImageSelector.isSupportedImageMimeType(effectiveMime)) {
            return@withContext HostedImageUploadResult(
                success = false,
                verified = false,
                error = "Unsupported image MIME type '$effectiveMime'. Allowed: JPG, JPEG, PNG, WebP, GIF, AVIF."
            )
        }

        val estimatedBytes = (cleanBase64.length * 3L) / 4L
        if (estimatedBytes > 20L * 1024L * 1024L) {
            return@withContext HostedImageUploadResult(
                success = false,
                verified = false,
                error = "Image exceeds maximum 20MB limit."
            )
        }

        val fullDataUrl = "data:$effectiveMime;base64,$cleanBase64"
        val encodedName = try {
            URLEncoder.encode(fileName, "UTF-8")
        } catch (_: Exception) {
            "main-post-image"
        }
        val assetHtml = """<div class="separator" style="clear: both; text-align: center;"><a href="$fullDataUrl" style="margin-left: 1em; margin-right: 1em;"><img border="0" data-original-name="$encodedName" src="$fullDataUrl" /></a></div>"""

        val apiUrl = "https://www.googleapis.com/blogger/v3/blogs/${hostBlogId.trim()}/posts?isDraft=true"
        val payload = JSONObject().apply {
            put("kind", "blogger#post")
            put("title", "[IMAGE-HOST-ASSET] $fileName")
            put("content", assetHtml)
            put("labels", JSONArray(listOf("image-host-media")))
        }

        val request = Request.Builder()
            .url(apiUrl)
            .header("Authorization", "Bearer $accessToken")
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .post(payload.toString().toRequestBody(JSON_MEDIA))
            .build()

        try {
            client.newCall(request).execute().use { response ->
                val body = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    val apiErr = parseGoogleApiError(response.code, body, "Blogger image upload failed")
                    return@withContext HostedImageUploadResult(
                        success = false,
                        verified = false,
                        error = apiErr.message ?: "Blogger rejected image upload (${response.code})"
                    )
                }

                val json = JSONObject(body)
                val extracted = extractBloggerImageUrls(json)
                if (extracted.isEmpty()) {
                    return@withContext HostedImageUploadResult(
                        success = false,
                        verified = false,
                        error = "Blogger processed the image upload but did not return a public Google CDN URL."
                    )
                }

                val ranked = MainImageSelector.rankMainThumbnailCandidates(
                    extracted.map { ThumbnailCandidate(src = it, role = ThumbnailCandidateRole.OG_IMAGE) }
                ).ifEmpty { extracted }

                for (candidate in ranked) {
                    val verification = verifyPublicImageUrl(candidate)
                    if (verification.isValid && !verification.verifiedUrl.isNullOrBlank()) {
                        return@withContext HostedImageUploadResult(
                            success = true,
                            verified = true,
                            imageUrl = verification.verifiedUrl,
                            contentType = verification.contentType
                        )
                    }
                }

                return@withContext HostedImageUploadResult(
                    success = false,
                    verified = false,
                    imageUrl = ranked.firstOrNull(),
                    error = "Uploaded image CDN URL failed public accessibility verification."
                )
            }
        } catch (e: IOException) {
            return@withContext HostedImageUploadResult(
                success = false,
                verified = false,
                error = "Network error uploading image to Blogger CDN: ${e.message}"
            )
        }
    }

    suspend fun fetchUserProfile(accessToken: String): UserProfile = withContext(Dispatchers.IO) {
        if (accessToken.isBlank()) {
            throw BloggerApiException("Google OAuth token is required.", 401)
        }

        val request = Request.Builder()
            .url("https://www.googleapis.com/oauth2/v3/userinfo")
            .header("Authorization", "Bearer $accessToken")
            .header("Accept", "application/json")
            .get()
            .build()

        try {
            client.newCall(request).execute().use { response ->
                val body = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    throw parseGoogleApiError(response.code, body, "Failed to authenticate Google user")
                }

                val json = JSONObject(body)
                UserProfile(
                    userId = json.optString("sub", UUID.randomUUID().toString()),
                    email = json.optString("email", ""),
                    displayName = json.optString("name", "Blogger Creator"),
                    photoUrl = json.optString("picture").ifBlank { null }
                )
            }
        } catch (e: IOException) {
            throw BloggerApiException("Network connection error: ${e.message}")
        }
    }

    suspend fun fetchUserBlogs(accessToken: String?): List<BloggerBlog> = withContext(Dispatchers.IO) {
        if (accessToken.isNullOrBlank()) {
            throw BloggerApiException("Google OAuth token is missing. Please sign in with Google to view your Blogger blogs.", 401)
        }

        val request = Request.Builder()
            .url("https://www.googleapis.com/blogger/v3/users/self/blogs")
            .header("Authorization", "Bearer $accessToken")
            .header("Accept", "application/json")
            .get()
            .build()

        try {
            client.newCall(request).execute().use { response ->
                val body = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    throw parseGoogleApiError(response.code, body, "Failed to fetch Blogger blogs")
                }

                val json = JSONObject(body)
                val items = json.optJSONArray("items") ?: JSONArray()
                val list = mutableListOf<BloggerBlog>()
                for (i in 0 until items.length()) {
                    val obj = items.getJSONObject(i)
                    val postsObj = obj.optJSONObject("posts")
                    list.add(
                        BloggerBlog(
                            id = obj.getString("id"),
                            name = obj.getString("name"),
                            description = obj.optString("description"),
                            url = obj.getString("url"),
                            published = obj.optString("published"),
                            updated = obj.optString("updated"),
                            totalPosts = postsObj?.optInt("totalItems", 0) ?: 0
                        )
                    )
                }
                list
            }
        } catch (e: IOException) {
            throw BloggerApiException("Network connection error: ${e.message}")
        }
    }

    suspend fun publishPost(
        accessToken: String?,
        blogId: String,
        title: String,
        content: String,
        labels: List<String> = emptyList(),
        isDraft: Boolean = false,
        imageUrl: String? = null,
        thumbnailUrl: String? = null,
        caption: String? = null
    ): PublishedPost = withContext(Dispatchers.IO) {
        if (accessToken.isNullOrBlank()) {
            throw BloggerApiException("Google OAuth token is missing. Please sign in with Google to publish.", 401)
        }

        if (blogId.isBlank()) {
            throw BloggerApiException("No Blogger destination blog selected.", 400)
        }

        val url = "https://www.googleapis.com/blogger/v3/blogs/$blogId/posts?isDraft=$isDraft"
        val payload = JSONObject().apply {
            put("kind", "blogger#post")
            put("title", title)
            put("content", content)
            if (labels.isNotEmpty()) {
                put("labels", JSONArray(labels))
            }
        }

        val request = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $accessToken")
            .header("Content-Type", "application/json")
            .post(payload.toString().toRequestBody(JSON_MEDIA))
            .build()

        try {
            client.newCall(request).execute().use { response ->
                val body = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    throw parseGoogleApiError(response.code, body, "Failed to publish Blogger post")
                }

                val json = JSONObject(body)
                val now = json.optString("published", SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(Date()))
                val labelsArr = json.optJSONArray("labels")
                val labelsList = mutableListOf<String>()
                if (labelsArr != null) {
                    for (i in 0 until labelsArr.length()) {
                        labelsList.add(labelsArr.getString(i))
                    }
                }

                val apiCandidates = extractBloggerImageUrls(json)
                    .map { ThumbnailCandidate(src = it, role = ThumbnailCandidateRole.METADATA) }

                val resolvedMainImageUrl = MainImageSelector.selectMainThumbnailImage(
                    listOfNotNull(
                        imageUrl?.takeIf { it.isNotBlank() }?.let {
                            ThumbnailCandidate(src = it, role = ThumbnailCandidateRole.OG_IMAGE)
                        },
                        thumbnailUrl?.takeIf { it.isNotBlank() }?.let {
                            ThumbnailCandidate(src = it, role = ThumbnailCandidateRole.METADATA)
                        }
                    ) + apiCandidates
                )
                    ?: MainImageSelector.selectMainThumbnailImageFromHtml(json.optString("content"))
                    ?: MainImageSelector.selectMainThumbnailImageFromHtml(content)
                    ?: imageUrl?.takeUnless { MainImageSelector.isDisallowedNonThumbnailFormat(it) }
                    ?: thumbnailUrl?.takeUnless { MainImageSelector.isDisallowedNonThumbnailFormat(it) }

                PublishedPost(
                    id = json.getString("id"),
                    blogId = blogId,
                    title = json.optString("title", title),
                    caption = caption,
                    url = json.optString("url", "https://blogger.com"),
                    thumbnailUrl = resolvedMainImageUrl,
                    imageUrl = resolvedMainImageUrl,
                    labels = if (labelsList.isNotEmpty()) labelsList.joinToString(", ") else null,
                    publishedAt = now
                )
            }
        } catch (e: IOException) {
            throw BloggerApiException("Network connection error: ${e.message}")
        }
    }

    private fun parseGoogleApiError(status: Int, errorBody: String, defaultAction: String): BloggerApiException {
        var message = ""
        var reason = ""
        try {
            val json = JSONObject(errorBody)
            val errObj = json.optJSONObject("error")
            if (errObj != null) {
                message = errObj.optString("message")
                val errors = errObj.optJSONArray("errors")
                if (errors != null && errors.length() > 0) {
                    reason = errors.getJSONObject(0).optString("reason")
                }
            }
        } catch (_: Exception) {}

        return when {
            reason == "accessNotConfigured" || reason == "SERVICE_DISABLED" ||
                message.contains("Blogger API has not been used", ignoreCase = true) ||
                message.contains("is disabled", ignoreCase = true) -> {
                BloggerApiException("Blogger API disabled: Enable Blogger API v3 in Google Cloud Console.", status)
            }
            status == 401 || reason == "authError" || reason == "invalid_grant" -> {
                BloggerApiException("Session expired: Please connect your Google account again.", status)
            }
            reason == "insufficientPermissions" || (status == 403 && message.contains("insufficient", ignoreCase = true)) -> {
                BloggerApiException("Insufficient permissions: Grant Blogger management permission to your account.", status)
            }
            reason == "rateLimitExceeded" || reason == "dailyLimitExceeded" -> {
                BloggerApiException("Blogger API quota exceeded: Please try again shortly.", status)
            }
            status == 404 || reason == "notFound" -> {
                BloggerApiException("Blog not found: The selected Blogger blog was not found or deleted.", status)
            }
            status == 403 -> {
                BloggerApiException("Access denied (${if (message.isNotBlank()) message else "403 Forbidden"}).", status)
            }
            message.isNotBlank() -> BloggerApiException(message, status)
            else -> BloggerApiException("$defaultAction ($status)", status)
        }
    }
}
