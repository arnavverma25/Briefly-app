import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Article, SummaryResult, VoiceName, SpeechSegment } from "../types";

const API_KEY = process.env.API_KEY || '';

// Initialize client
const ai = new GoogleGenAI({ apiKey: API_KEY });

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateWithRetry<T>(
  operation: () => Promise<T>, 
  retries = 5, 
  baseDelay = 4000
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check for common rate limit error codes/messages in various formats
      const errorString = JSON.stringify(error);
      const isRateLimit = errorString.includes('429') || 
                          errorString.includes('RESOURCE_EXHAUSTED') || 
                          errorString.includes('Quota exceeded') ||
                          error?.status === 429;
      
      if (isRateLimit && i < retries - 1) {
        const waitTime = baseDelay * Math.pow(2, i); // Exponential: 4s, 8s, 16s, 32s...
        console.warn(`Rate limit hit (attempt ${i+1}/${retries}). Retrying in ${waitTime}ms...`);
        await delay(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * Step 1: Pre-process articles.
 * If an article is a URL, use Gemini with Google Search to read/summarize it.
 * If it's text, use as is.
 */
export const processArticles = async (articles: Article[]): Promise<string[]> => {
  if (!API_KEY) throw new Error("API Key is missing");
  
  const results: string[] = [];

  for (const article of articles) {
    if (article.type === 'text') {
      results.push(article.content);
    } else {
      // It's a URL
      try {
        const response = await generateWithRetry(() => ai.models.generateContent({
          model: 'gemini-3-flash-preview', // Good for search grounding
          contents: `Please read the article at the following URL and provide a comprehensive summary of its content, preserving key details, names, and quotes. URL: ${article.content}`,
          config: {
            tools: [{ googleSearch: {} }],
          }
        }));
        
        const text = response.text;
        if (!text) {
             results.push(`[Failed to retrieve content for URL: ${article.content}]`);
        } else {
             results.push(`[Source: ${article.content}]\nSummary: ${text}`);
        }
        
        // Safety delay to respect rate limits between complex grounding calls
        await delay(2000);
        
      } catch (error) {
        console.error(`Error processing URL ${article.content}:`, error);
        results.push(`[Error reading URL: ${article.content}]`);
      }
    }
  }

  return results;
};

/**
 * Step 2: Summarize the articles into a cohesive news script.
 */
export const generateNewsScript = async (
  articleContents: string[],
  persona: string
): Promise<SummaryResult> => {
  if (!API_KEY) throw new Error("API Key is missing");

  const combinedText = articleContents.map((a, i) => `--- ARTICLE ${i + 1} ---\n${a}`).join('\n\n');

  const prompt = `
    You are a professional news anchor with a ${persona} personality.
    
    Task:
    Read the following provided articles (some might be summaries of URLs) and write a cohesive, engaging radio-style news briefing script.
    
    Requirements:
    1. Start with a catchy hook or greeting appropriate for the persona.
    2. Seamlessly transition between topics.
    3. Keep it concise (approx. 200-300 words).
    4. Do not read the articles verbatim; summarize the key points naturally.
    5. End with a sign-off.
    
    Input Content:
    ${combinedText}
  `;

  // We ask for JSON to get a headline and the script separately
  const response = await generateWithRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          headline: { type: Type.STRING, description: "A catchy title for this news segment" },
          script: { type: Type.STRING, description: "The full spoken script for the news anchor" }
        },
        required: ["headline", "script"]
      }
    }
  }));

  const jsonText = response.text || "{}";
  try {
    const data = JSON.parse(jsonText);
    return {
      headline: data.headline || "Daily Briefing",
      script: data.script || "Could not generate script."
    };
  } catch (e) {
    console.error("JSON Parse error", e);
    // Fallback if JSON fails
    return {
      headline: "Daily Update",
      script: response.text || "Error generating summary."
    };
  }
};

/**
 * Step 3: Convert the text script to audio segments.
 * Updated: Larger chunks (4500 chars) to drastically reduce request count.
 */
export const generateSpeech = async (
  text: string,
  voiceName: VoiceName
): Promise<SpeechSegment[]> => {
  if (!API_KEY) throw new Error("API Key is missing");

  // 1. Split text into sentences/segments
  const rawSegments = text.match(/[^.!?\n]+[.!?\n]*(\s|$)/g)?.map(s => s.trim()).filter(s => s.length > 0) || [text];
  
  // 2. Group sentences to reduce API calls 
  // Target ~4500 chars per chunk. Gemini 2.5 Flash has a large context window.
  // Fewer requests = fewer 429s.
  const mergedSegments: string[] = [];
  let currentChunk = "";

  for (const seg of rawSegments) {
    if (currentChunk.length + seg.length < 4500) {
        currentChunk += (currentChunk ? " " : "") + seg;
    } else {
        if (currentChunk) mergedSegments.push(currentChunk);
        currentChunk = seg;
    }
  }
  if (currentChunk) mergedSegments.push(currentChunk);
  
  const results: SpeechSegment[] = [];

  // 3. Sequential Processing with Retry
  for (const segmentText of mergedSegments) {
      try {
            const response = await generateWithRetry(() => ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: segmentText }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                        prebuiltVoiceConfig: { voiceName }
                        }
                    }
                }
            }));

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                 results.push({
                    text: segmentText,
                    audioData: base64Audio
                });
            }
            
            // Artificial delay between chunks to let the rate limiter bucket refill
            await delay(1000);

      } catch (e) {
            console.error("Error generating speech segment:", JSON.stringify(e));
            // We do not re-throw here so partial audio is returned if one chunk fails after retries
      }
  }

  return results;
};