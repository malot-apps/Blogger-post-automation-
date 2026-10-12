package com.aistudio.bloggerautopublisher.api

import com.aistudio.bloggerautopublisher.model.AiAnalysisResult
import com.aistudio.bloggerautopublisher.model.FocalPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

object GeminiApiService {

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private val JSON_MEDIA = "application/json; charset=utf-8".toMediaType()

    suspend fun analyzeImage(
        imageBase64: String?,
        language: String = "bn",
        apiKey: String? = null
    ): AiAnalysisResult = withContext(Dispatchers.IO) {
        val cleanKey = apiKey?.trim().orEmpty()
        if (cleanKey.isBlank()) {
            throw BloggerApiException("Google Gemini API key required. Tap Settings (gear icon) to provide your Gemini API key.", 400)
        }

        if (imageBase64.isNullOrBlank()) {
            throw BloggerApiException("Please choose or capture an image before generating with AI.", 400)
        }

        val isBengali = language == "bn"
        val prompt = "Analyze this image for a Google Blogger article. In ${if (isBengali) "Bengali (বাংলা)" else "English"}, provide: " +
            "1. An SEO-optimized, catchy title (under 70 chars). " +
            "2. A brief summary. " +
            "3. Main subject. " +
            "4. Context. " +
            "5. Focal point x and y percentage (0-100) for centered 16:9 thumbnail cropping. " +
            "Return strictly valid JSON with keys: title, summary, mainSubject, context, focalXPercent, focalYPercent."

        val url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$cleanKey"
        val contents = JSONArray().apply {
            put(JSONObject().apply {
                put("parts", JSONArray().apply {
                    put(JSONObject().apply {
                        put("inline_data", JSONObject().apply {
                            put("mime_type", "image/jpeg")
                            put("data", imageBase64)
                        })
                    })
                    put(JSONObject().apply {
                        put("text", prompt)
                    })
                })
            })
        }

        val payload = JSONObject().apply {
            put("contents", contents)
            put("generationConfig", JSONObject().apply {
                put("response_mime_type", "application/json")
            })
        }

        val request = Request.Builder()
            .url(url)
            .post(payload.toString().toRequestBody(JSON_MEDIA))
            .build()

        try {
            client.newCall(request).execute().use { response ->
                val body = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    val errMsg = try {
                        val errObj = JSONObject(body).optJSONObject("error")
                        errObj?.optString("message") ?: "Gemini API error (${response.code})"
                    } catch (_: Exception) {
                        "Gemini API error (${response.code})"
                    }
                    throw BloggerApiException(errMsg, response.code)
                }

                val resJson = JSONObject(body)
                val candidates = resJson.optJSONArray("candidates")
                if (candidates == null || candidates.length() == 0) {
                    throw BloggerApiException("Gemini model returned empty response.", 500)
                }

                val text = candidates.getJSONObject(0)
                    .getJSONObject("content")
                    .getJSONArray("parts")
                    .getJSONObject(0)
                    .getString("text")

                val parsed = JSONObject(text)
                AiAnalysisResult(
                    title = parsed.optString("title", if (isBengali) "ছবিটির বিশেষ বিবরণ" else "Featured Photo Story"),
                    summary = parsed.optString("summary", "Image analyzed with Gemini AI"),
                    mainSubject = parsed.optString("mainSubject", "Subject"),
                    context = parsed.optString("context", "Visual framing"),
                    focalPoint = FocalPoint(
                        xPercent = parsed.optDouble("focalXPercent", 50.0).toFloat().coerceIn(10f, 90f),
                        yPercent = parsed.optDouble("focalYPercent", 45.0).toFloat().coerceIn(10f, 90f),
                        recommendedZoom = 1.08f
                    ),
                    suggestedBadge = if (isBengali) "বিশেষ" else "Trending"
                )
            }
        } catch (e: IOException) {
            throw BloggerApiException("Network connection error connecting to Gemini API: ${e.message}")
        }
    }

    suspend fun regenerateTitle(
        language: String = "bn",
        previousTitles: List<String> = emptyList(),
        apiKey: String? = null
    ): String = withContext(Dispatchers.IO) {
        val cleanKey = apiKey?.trim().orEmpty()
        if (cleanKey.isBlank()) {
            throw BloggerApiException("Google Gemini API key required. Tap Settings (gear icon) to provide your Gemini API key.", 400)
        }

        val isBengali = language == "bn"
        val prompt = "Generate a single catchy, viral SEO title (under 70 chars) for a Blogger post in ${if (isBengali) "Bengali (বাংলা)" else "English"}. " +
            "Do not repeat any of these titles: ${previousTitles.joinToString(" | ")}. " +
            "Return only the title text as a plain string, nothing else."

        val url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$cleanKey"
        val contents = JSONArray().apply {
            put(JSONObject().apply {
                put("parts", JSONArray().apply {
                    put(JSONObject().apply {
                        put("text", prompt)
                    })
                })
            })
        }

        val payload = JSONObject().apply {
            put("contents", contents)
        }

        val request = Request.Builder()
            .url(url)
            .post(payload.toString().toRequestBody(JSON_MEDIA))
            .build()

        try {
            client.newCall(request).execute().use { response ->
                val body = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    val errMsg = try {
                        val errObj = JSONObject(body).optJSONObject("error")
                        errObj?.optString("message") ?: "Gemini API error (${response.code})"
                    } catch (_: Exception) {
                        "Gemini API error (${response.code})"
                    }
                    throw BloggerApiException(errMsg, response.code)
                }

                val resJson = JSONObject(body)
                val candidates = resJson.optJSONArray("candidates")
                if (candidates != null && candidates.length() > 0) {
                    val rawText = candidates.getJSONObject(0)
                        .getJSONObject("content")
                        .getJSONArray("parts")
                        .getJSONObject(0)
                        .getString("text")
                        .trim()
                        .trim('"', '\'')
                    if (rawText.isNotBlank()) {
                        return@withContext rawText
                    }
                }
                throw BloggerApiException("Could not generate alternative title from Gemini.", 500)
            }
        } catch (e: IOException) {
            throw BloggerApiException("Network connection error: ${e.message}")
        }
    }
}
