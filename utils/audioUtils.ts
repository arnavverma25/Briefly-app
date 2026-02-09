/**
 * Decodes a base64 string into a Uint8Array of bytes.
 */
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM data from Gemini into an AudioBuffer.
 * Gemini 2.5 TTS returns raw PCM (no WAV header), usually 24kHz.
 */
export async function decodeGeminiAudioData(
  base64Data: string,
  ctx: AudioContext,
  sampleRate: number = 24000
): Promise<AudioBuffer> {
  const rawBytes = decodeBase64(base64Data);
  
  // The raw data is 16-bit PCM (Int16)
  // We need to convert it to Float32 for the Web Audio API
  const dataInt16 = new Int16Array(rawBytes.buffer);
  const numChannels = 1; // Gemini TTS usually returns mono
  const frameCount = dataInt16.length / numChannels;
  
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Normalize Int16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  
  return buffer;
}

/**
 * Concatenates multiple AudioBuffers into a single AudioBuffer.
 * Assumes all buffers have the same sample rate and channel count.
 */
export function concatenateAudioBuffers(
  buffers: AudioBuffer[],
  ctx: AudioContext
): AudioBuffer {
  if (buffers.length === 0) return ctx.createBuffer(1, 1, 24000);
  
  const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
  const result = ctx.createBuffer(1, totalLength, buffers[0].sampleRate);
  
  let offset = 0;
  for (const buffer of buffers) {
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        result.copyToChannel(buffer.getChannelData(channel), channel, offset);
    }
    offset += buffer.length;
  }
  
  return result;
}