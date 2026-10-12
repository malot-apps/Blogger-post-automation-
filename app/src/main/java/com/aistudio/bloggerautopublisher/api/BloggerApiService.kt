package com.aistudio.bloggerautopublisher.api

import com.aistudio.bloggerautopublisher.model.BloggerBlog
import com.aistudio.bloggerautopublisher.model.PublishedPost
import com.aistudio.bloggerautopublisher.model.UserProfile
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID
import java.util.concurrent.TimeUnit

class BloggerApiException(message: String, val statusCode: Int = 0) : Exception(message)

object BloggerApiService {

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private val JSON_MEDIA = "application/json; charset=utf-8".toMediaType()

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

                PublishedPost(
                    id = json.getString("id"),
                    blogId = blogId,
                    title = json.optString("title", title),
                    caption = caption,
                    url = json.optString("url", "https://blogger.com"),
                    thumbnailUrl = thumbnailUrl,
                    imageUrl = imageUrl,
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
