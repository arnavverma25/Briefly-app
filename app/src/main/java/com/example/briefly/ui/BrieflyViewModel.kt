package com.example.briefly.ui

import androidx.compose.runtime.*
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.briefly.BuildConfig
import com.example.briefly.audio.AudioEngine
import com.example.briefly.data.*
import com.google.gson.Gson
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class BrieflyViewModel : ViewModel() {
    // State
    var articles = mutableStateListOf(Article(java.util.UUID.randomUUID().toString(), "", "text"))
    var selectedPersona by mutableStateOf(PERSONAS[0])
    var selectedVoice by mutableStateOf("Fenrir")
    
    var isLoading by mutableStateOf(false)
    var statusMessage by mutableStateOf("")
    var errorMessage by mutableStateOf<String?>(null)
    
    var generatedHeadline by mutableStateOf<String?>(null)
    var generatedScript by mutableStateOf<String?>(null)
    
    // Player State
    var isPlayerVisible by mutableStateOf(false)
    var isPlaying by mutableStateOf(false)
    var currentProgress by mutableStateOf(0f)
    var durationMs by mutableStateOf(0L)
    var viewMode by mutableStateOf("Visualizer") // "Visualizer" or "Transcript"
    
    // Sync State
    var scriptTokens = mutableStateListOf<ScriptToken>()
    var activeTokenIndex by mutableIntStateOf(-1)
    
    private val audioEngine = AudioEngine()

    init {
        // Progress updater loop
        viewModelScope.launch {
            while (isActive) {
                if (isPlaying) {
                    val p = audioEngine.getCurrentProgress()
                    currentProgress = p
                    
                    // Update Active Token
                    val currentMs = (p * durationMs).toLong()
                    if (scriptTokens.isNotEmpty()) {
                        val index = scriptTokens.indexOfFirst { currentMs >= it.startMs && currentMs < it.endMs }
                        if (index != -1) {
                            activeTokenIndex = index
                        } else if (currentMs >= durationMs) {
                            activeTokenIndex = scriptTokens.lastIndex
                        }
                    }

                    // Simple check for end of playback
                    if (p >= 0.999f) {
                        isPlaying = false
                        currentProgress = 0f
                        activeTokenIndex = 0
                        audioEngine.seekTo(0f)
                        audioEngine.pause()
                    }
                }
                delay(30) // Update UI at ~30fps
            }
        }
    }

    private fun tokenizeScript(script: String, totalDurationMs: Long) {
        val words = script.trim().split(Regex("\\s+"))
        
        // Heuristic weighting
        val weightedItems = words.map { word ->
            var weight = if (word.length < 4) 0.6f else 1.0f
            if (word.contains(Regex("[,;:\\-]"))) weight += 0.5f
            if (word.contains(Regex("[.!?]"))) weight += 1.5f
            Pair(word, weight)
        }
        
        val totalWeight = weightedItems.sumOf { it.second.toDouble() }
        val unitTime = if (totalWeight > 0) totalDurationMs / totalWeight else 0.0
        
        var accumulator = 0.0
        val tokens = ArrayList<ScriptToken>()
        
        weightedItems.forEach { (word, weight) ->
            val duration = weight * unitTime
            val start = accumulator
            val end = accumulator + duration
            tokens.add(ScriptToken(word, start.toLong(), end.toLong()))
            accumulator += duration
        }
        
        scriptTokens.clear()
        scriptTokens.addAll(tokens)
        activeTokenIndex = -1
    }

    fun addArticle() {
        articles.add(Article(java.util.UUID.randomUUID().toString(), "", "text"))
    }

    fun removeArticle(article: Article) {
        if (articles.size > 1) articles.remove(article)
    }
    
    fun toggleArticleType(article: Article) {
        val index = articles.indexOf(article)
        if (index != -1) {
            val newType = if (article.type == "text") "url" else "text"
            articles[index] = article.copy(type = newType)
        }
    }
    
    fun updateContent(article: Article, newContent: String) {
        val index = articles.indexOf(article)
        if (index != -1) {
            articles[index] = article.copy(content = newContent)
        }
    }

    fun generateBriefing() {
        errorMessage = null
        if (BuildConfig.API_KEY.isBlank()) {
            errorMessage = "API Key is missing. Please configure it in local.properties."
            return
        }

        val validArticles = articles.filter { it.content.isNotBlank() }
        if (validArticles.isEmpty()) {
            errorMessage = "Please add at least one article."
            return
        }

        isLoading = true
        statusMessage = "Reading sources..."
        audioEngine.pause()
        isPlaying = false

        viewModelScope.launch {
            try {
                // 1. Summarize
                val combinedContent = validArticles.mapIndexed { index, article -> 
                    "Source ${index + 1} (${article.type}): ${article.content}"
                }.joinToString("\n\n")

                statusMessage = "Writing script..."
                
                val prompt = """
                    You are a professional news anchor with a $selectedPersona personality.
                    Task: Write a cohesive radio-style news briefing script based on the inputs below.
                    Return ONLY JSON format: { "headline": "Title", "script": "Full spoken text" }
                    
                    Inputs:
                    $combinedContent
                """.trimIndent()

                val textResponse = NetworkModule.api.generateText(
                    BuildConfig.API_KEY,
                    GenerateRequest(
                        contents = listOf(Content(parts = listOf(Part(prompt)))),
                        config = GenerationConfig(responseMimeType = "application/json")
                    )
                )

                val jsonString = textResponse.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text
                val gson = Gson()
                val result = gson.fromJson(jsonString, Map::class.java)
                
                generatedHeadline = result["headline"] as? String ?: "Briefing Ready"
                val script = result["script"] as? String ?: "Error parsing script."
                generatedScript = script

                // 2. Synthesize
                statusMessage = "Recording audio..."
                
                val ttsResponse = NetworkModule.api.generateSpeech(
                    BuildConfig.API_KEY,
                    GenerateRequest(
                        model = "models/gemini-2.5-flash-preview-tts",
                        contents = listOf(Content(parts = listOf(Part(script)))),
                        config = GenerationConfig(
                            responseModalities = listOf("AUDIO"),
                            speechConfig = SpeechConfig(VoiceConfig(PrebuiltVoiceConfig(selectedVoice)))
                        )
                    )
                )

                // 3. Prepare Audio
                statusMessage = "Preparing playback..."
                
                val base64 = ttsResponse.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.inlineData?.data
                
                if (base64 != null) {
                    val duration = audioEngine.prepare(base64)
                    durationMs = duration
                    tokenizeScript(script, duration)
                    currentProgress = 0f
                    
                    isLoading = false
                    isPlayerVisible = true
                    isPlaying = true
                    audioEngine.play()
                } else {
                    statusMessage = ""
                    errorMessage = "Error: No audio data received from API."
                    isLoading = false
                }
                
            } catch (e: Exception) {
                e.printStackTrace()
                statusMessage = ""
                errorMessage = "Error: ${e.message ?: "Unknown error occurred"}"
                isLoading = false
            }
        }
    }
    
    fun togglePlay() {
        if (isPlaying) {
            audioEngine.pause()
            isPlaying = false
        } else {
            audioEngine.play()
            isPlaying = true
        }
    }
    
    fun seekTo(value: Float) {
        currentProgress = value
        audioEngine.seekTo(value)
        val currentMs = (value * durationMs).toLong()
        if (scriptTokens.isNotEmpty()) {
             val index = scriptTokens.indexOfFirst { currentMs >= it.startMs && currentMs < it.endMs }
             if (index != -1) activeTokenIndex = index
        }
    }
    
    override fun onCleared() {
        super.onCleared()
        audioEngine.release()
    }
}
