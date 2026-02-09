export interface Article {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'url';
  isProcessing?: boolean;
}

export enum VoiceName {
  Puck = 'Puck',
  Charon = 'Charon',
  Kore = 'Kore',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr'
}

export interface GenerationState {
  status: 'idle' | 'fetching_content' | 'summarizing' | 'synthesizing' | 'ready' | 'error';
  message?: string;
}

export interface SummaryResult {
  script: string;
  headline: string;
}

export interface SpeechSegment {
  text: string;
  audioData: string; // base64
}