package com.briefly.audio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AudioEngine {
    private var audioTrack: AudioTrack? = null
    
    // Gemini 2.5 TTS typically returns 24kHz mono PCM
    private val SAMPLE_RATE = 24000 
    private var audioDataSize = 0
    
    suspend fun prepare(base64String: String): Long = withContext(Dispatchers.Default) {
        release()
        try {
            val audioData = Base64.decode(base64String, Base64.DEFAULT)
            audioDataSize = audioData.size

            val minBufferSize = AudioTrack.getMinBufferSize(
                SAMPLE_RATE,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            )

            val bufferSize = maxOf(minBufferSize, audioData.size)

            audioTrack = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(SAMPLE_RATE)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                .setBufferSizeInBytes(bufferSize)
                .setTransferMode(AudioTrack.MODE_STATIC)
                .build()

            // Write data to static buffer
            audioTrack?.write(audioData, 0, audioData.size)
            
            // Calculate duration in ms
            // 16bit = 2 bytes per sample, Mono = 1 channel
            // frames = size / 2
            val frames = audioData.size / 2
            val durationMs = (frames.toDouble() / SAMPLE_RATE * 1000).toLong()
            
            return@withContext durationMs
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext 0L
        }
    }

    fun play() {
        audioTrack?.play()
    }

    fun pause() {
        if (audioTrack?.playState == AudioTrack.PLAYSTATE_PLAYING) {
            audioTrack?.pause()
        }
    }
    
    fun seekTo(progress: Float) {
        val track = audioTrack ?: return
        if (audioDataSize == 0) return
        
        val frames = audioDataSize / 2
        val targetFrame = (frames * progress.coerceIn(0f, 1f)).toInt()
        
        // For static tracks, it is recommended to pause before setting position
        val wasPlaying = track.playState == AudioTrack.PLAYSTATE_PLAYING
        if (wasPlaying) track.pause()
        
        try {
            track.playbackHeadPosition = targetFrame
        } catch (e: Exception) {
            e.printStackTrace()
        }
        
        if (wasPlaying) track.play()
    }

    fun getCurrentProgress(): Float {
        val track = audioTrack ?: return 0f
        if (audioDataSize == 0) return 0f
        
        val totalFrames = audioDataSize / 2
        val current = track.playbackHeadPosition
        
        return (current.toFloat() / totalFrames).coerceIn(0f, 1f)
    }

    fun release() {
        try {
            if (audioTrack?.playState == AudioTrack.PLAYSTATE_PLAYING) {
                audioTrack?.stop()
            }
            audioTrack?.release()
            audioTrack = null
            audioDataSize = 0
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
