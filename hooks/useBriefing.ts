import { useState } from 'react';
import { Article, GenerationState, VoiceName } from '../types';
import { processArticles, generateNewsScript, generateSpeech } from '../services/geminiService';
import { decodeGeminiAudioData, concatenateAudioBuffers } from '../utils/audioUtils';

export interface ScriptToken {
  word: string;
  start: number;
  end: number;
}

interface UseBriefingResult {
  generationState: GenerationState;
  headline: string | null;
  scriptTokens: ScriptToken[];
  generateBriefing: (articles: Article[], persona: string, voice: VoiceName) => Promise<{ buffer: AudioBuffer, ctx: AudioContext } | null>;
}

export const useBriefing = (): UseBriefingResult => {
  const [generationState, setGenerationState] = useState<GenerationState>({ status: 'idle' });
  const [headline, setHeadline] = useState<string | null>(null);
  const [scriptTokens, setScriptTokens] = useState<ScriptToken[]>([]);

  const generateBriefing = async (articles: Article[], persona: string, voice: VoiceName) => {
    setHeadline(null);
    setScriptTokens([]);

    try {
      // Step 0: Pre-process (Resolve URLs)
      setGenerationState({ status: 'fetching_content', message: 'Reading sources...' });
      const processedContents = await processArticles(articles);
      
      // Step 1: Summarize
      setGenerationState({ status: 'summarizing', message: 'Writing script...' });
      const summaryResult = await generateNewsScript(processedContents, persona);
      setHeadline(summaryResult.headline);

      // Step 2: TTS
      setGenerationState({ status: 'synthesizing', message: 'Recording audio...' });
      const speechSegments = await generateSpeech(summaryResult.script, voice);
      
      if (speechSegments.length === 0) {
        throw new Error("No speech generated.");
      }

      // Step 3: Decode & Process
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const decodedBuffers: AudioBuffer[] = [];
      const tokens: ScriptToken[] = [];
      let cumulativeTime = 0;

      for (const segment of speechSegments) {
        const buffer = await decodeGeminiAudioData(segment.audioData, ctx);
        decodedBuffers.push(buffer);

        const segmentDuration = buffer.duration;
        const words = segment.text.trim().split(/\s+/);
        
        // Weighting logic for smoother visualizer/karaoke sync
        const weightedItems = words.map(word => {
            let weight = word.length < 4 ? 0.6 : 1; 
            if (/[,;:\-]/.test(word)) weight += 0.5;
            if (/[.!?]/.test(word)) weight += 1.5;
            return { word, weight };
        });
        
        const totalWeight = weightedItems.reduce((sum, item) => sum + item.weight, 0);
        const unitTime = segmentDuration / totalWeight;
        
        let localAccumulator = 0;
        weightedItems.forEach(item => {
            const itemDuration = item.weight * unitTime;
            tokens.push({
                word: item.word,
                start: cumulativeTime + localAccumulator,
                end: cumulativeTime + localAccumulator + itemDuration
            });
            localAccumulator += itemDuration;
        });

        cumulativeTime += segmentDuration;
      }
      
      const finalBuffer = concatenateAudioBuffers(decodedBuffers, ctx);
      setScriptTokens(tokens);
      setGenerationState({ status: 'ready' });
      
      return { buffer: finalBuffer, ctx };

    } catch (err: any) {
      console.error(err);
      setGenerationState({ status: 'error', message: err.message || "Something went wrong." });
      return null;
    }
  };

  return {
    generationState,
    headline,
    scriptTokens,
    generateBriefing
  };
};