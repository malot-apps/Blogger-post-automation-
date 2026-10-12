package com.aistudio.bloggerautopublisher.model

import kotlinx.serialization.Serializable

@Serializable
data class FocalPoint(
    val xPercent: Float = 50f,
    val yPercent: Float = 50f,
    val recommendedZoom: Float = 1.05f
)

@Serializable
data class AiAnalysisResult(
    val title: String,
    val summary: String,
    val mainSubject: String,
    val context: String,
    val focalPoint: FocalPoint = FocalPoint(),
    val suggestedBadge: String? = null
)

enum class CompositionStyle(val id: String, val label: String, val description: String) {
    CINEMATIC_FOCUS(
        "cinematic_focus",
        "Cinematic Focus",
        "Perfect 16:9 framing centered on the main subject with soft edge vignette."
    ),
    DRAMATIC_CLOSE(
        "dramatic_close",
        "Dramatic Close-Up",
        "Tighter framing focusing on the core action with bottom depth gradient."
    ),
    RULE_OF_THIRDS(
        "rule_of_thirds",
        "Rule of Thirds",
        "Editorial framing aligning the subject along natural visual guidelines."
    ),
    VIVID_EDITORIAL(
        "vivid_editorial",
        "Vivid Cover",
        "High-clarity vibrant contrast designed to grab attention on mobile feeds."
    )
}
