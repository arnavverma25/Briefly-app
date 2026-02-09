
package com.example.briefly

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Query

// --- Data Models ---

data class GenerateRequest(
    val model: String? = null, // Used for path logic if needed, but we use path in interface
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

// --- API Interface ---

interface GeminiApi {
    @POST("v1beta/models/gemini-3-flash-preview:generateContent")
    suspend fun generateText(
        @Query("key") apiKey: String,
        @Body request: GenerateRequest
    ): GenerateResponse

    @POST("v1beta/models/gemini-2.5-flash-preview-tts:generateContent")
    suspend fun generateSpeech(
        @Query("key") apiKey: String,
        @Body request: GenerateRequest
    ): GenerateResponse
}

// --- Singleton ---

object NetworkModule {
    private const val BASE_URL = "https://generativelanguage.googleapis.com/"

    val api: GeminiApi by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(GeminiApi::class.java)
    }
}
