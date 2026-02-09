package com.example.briefly.data

// --- Constants ---
val PERSONAS = listOf("News Anchor", "Tech Vlogger", "Storyteller", "Aristocrat", "Sports Caster")
val VOICES = listOf("Fenrir", "Puck", "Kore", "Zephyr", "Charon")

// --- App Models ---
data class Article(val id: String, var content: String, var type: String) // type: "text" or "url"

data class ScriptToken(
    val word: String,
    val startMs: Long,
    val endMs: Long
)

// --- API Models ---
data class GenerateRequest(
    val model: String? = null,
    val contents: List<Content>,
    val config: GenerationConfig? = null
)

data class Content(val parts: List<Part>)
data class Part(val text: String)

data class GenerationConfig(
    val responseMimeType: String? = null,
    val responseModalities: List<String>? = null,
    val speechConfig: SpeechConfig? = null
)

data class SpeechConfig(val voiceConfig: VoiceConfig)
data class VoiceConfig(val prebuiltVoiceConfig: PrebuiltVoiceConfig)
data class PrebuiltVoiceConfig(val voiceName: String)

data class GenerateResponse(
    val candidates: List<Candidate>?
)

data class Candidate(val content: Content?)

// Inline data for Audio
data class InlineDataPart(val inlineData: InlineData)
data class InlineData(val mimeType: String, val data: String)
