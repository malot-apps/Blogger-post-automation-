package com.aistudio.bloggerautopublisher.util

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object TitleGenerator {

    fun generateTitleFromCaption(caption: String): String {
        val clean = caption.replace(Regex("<[^>]*>"), "").trim()
        if (clean.isBlank()) {
            val today = SimpleDateFormat("MMM d, yyyy", Locale.US).format(Date())
            return "Photo Post - $today"
        }

        val firstLine = clean.lines().firstOrNull()?.trim().orEmpty()
        val firstSentence = firstLine.split(Regex("[.!?]")).firstOrNull()?.trim()
        val candidate = if (!firstSentence.isNullOrBlank()) firstSentence else firstLine

        if (candidate.length <= 70) {
            return candidate
        }

        val words = candidate.split(Regex("\\s+"))
        if (words.size <= 10) {
            return candidate
        }

        return words.take(9).joinToString(" ") + "..."
    }
}
