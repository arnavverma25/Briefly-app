import { useState, useRef, useEffect, useCallback } from 'react';

export const useAudioPlayer = () => {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);

  // Initialize with a new buffer and context
  const loadAudio = useCallback((buffer: AudioBuffer, ctx: AudioContext) => {
    stopAudio();
    audioContextRef.current = ctx;
    setAudioBuffer(buffer);
    setDuration(buffer.duration);
    
    // Setup Analyzer
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;
  }, []);

  const playAudio = useCallback(async () => {
    if (!audioBuffer || !audioContextRef.current) return;
    const ctx = audioContextRef.current;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    
    // Connect nodes
    if (analyserRef.current) {
      source.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);
    } else {
      source.connect(ctx.destination);
    }

    sourceNodeRef.current = source;
    
    // Calculate start time
    const offset = pauseTimeRef.current % audioBuffer.duration;
    startTimeRef.current = ctx.currentTime - offset;
    
    source.start(0, offset);
    setIsPlaying(true);

    source.onended = () => {
      // Check if we actually reached the end or if it was stopped manually
      // We add a small buffer (0.1s) because float precision can be tricky
      if (ctx.currentTime - startTimeRef.current >= audioBuffer.duration - 0.1) {
        setIsPlaying(false);
        pauseTimeRef.current = 0;
        setCurrentTime(0);
      }
    };
  }, [audioBuffer]);

  const pauseAudio = useCallback(() => {
    if (sourceNodeRef.current && audioContextRef.current) {
      try {
          sourceNodeRef.current.stop();
      } catch (e) {
          // Ignore errors if already stopped
      }
      pauseTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current;
      setIsPlaying(false);
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) { }
    }
    setIsPlaying(false);
    pauseTimeRef.current = 0;
    setCurrentTime(0);
  }, []);

  const seek = useCallback((time: number) => {
    if (!audioBuffer) return;
    const wasPlaying = isPlaying;
    if (wasPlaying) stopAudio(); // Stop current source
    
    pauseTimeRef.current = time;
    setCurrentTime(time);
    
    if (wasPlaying) playAudio();
  }, [audioBuffer, isPlaying, playAudio, stopAudio]);

  const togglePlay = useCallback(() => {
    if (isPlaying) pauseAudio();
    else playAudio();
  }, [isPlaying, pauseAudio, playAudio]);

  // Update progress bar
  useEffect(() => {
    let rafId: number;
    const updateProgress = () => {
      if (isPlaying && audioContextRef.current) {
        const time = audioContextRef.current.currentTime - startTimeRef.current;
        const cur = Math.min(time, duration);
        setCurrentTime(cur);
        rafId = requestAnimationFrame(updateProgress);
      }
    };

    if (isPlaying) {
      updateProgress();
    } else {
      cancelAnimationFrame(rafId!);
    }
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, duration]);

  return {
    isPlaying,
    currentTime,
    duration,
    analyser: analyserRef.current,
    loadAudio,
    play: playAudio,
    pause: pauseAudio,
    stop: stopAudio,
    toggle: togglePlay,
    seek
  };
};