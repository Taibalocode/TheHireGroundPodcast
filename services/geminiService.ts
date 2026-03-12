import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, VideoEntry } from "../types";

const getAiClient = () => {
  // Always obtain the API key exclusively from process.env.API_KEY
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please ensure you have a valid key in .env.local");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const analyzeVideoContent = async (
  title: string,
  description: string,
  transcriptSnippet?: string,
  url?: string
): Promise<AnalysisResult> => {
  const ai = getAiClient();

  const schema = {
    type: Type.OBJECT,
    properties: {
      guestName: { type: Type.STRING, description: "Name of the guest (e.g. Jane Doe), or empty if solo." },
      headline: { type: Type.STRING, description: "A short, catchy 1-sentence summary of the episode (max 150 chars)." },
      fullDescription: { type: Type.STRING, description: "A detailed description including guest bio, key takeaways, and playlist info." },
      isShort: { type: Type.STRING, enum: ["Y", "N"], description: "Whether the content is a YouTube Short (Y if true, N if regular video). ALWAYS return Y or N." },
      guestProfiles: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of roles or titles representing the guest (e.g. CEO, Data Engineer). Max 3."
      },
      targetAudience: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Who this video is for (e.g. Students, Mid-Career, Technologists)."
      },
      topics: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Key topics discussed (e.g. Interviewing, Leadership, Artificial Intelligence). Max 5."
      }
    }
  };

  const prompt = `
    Analyze the following podcast/video details and extract structured metadata to help categorize it in our directory.
    
    Title: ${title}
    Description: ${description}
    ${transcriptSnippet ? `Transcript Snippet: ${transcriptSnippet}` : ''}
    ${url ? `URL: ${url}` : ''}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash", // FIX 1: Using the stable, public model
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  // FIX 2: response.text is a property, not a function
  const resultText = response.text;
  
  if (!resultText) {
    throw new Error("Failed to generate content");
  }

  return JSON.parse(resultText) as AnalysisResult;
};

export const parseBulkVideoInput = async (bulkText: string): Promise<any[]> => {
  const ai = getAiClient();

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        youtubeId: { type: Type.STRING, description: "Extract the 11-character YouTube video ID if a URL is present." },
        title: { type: Type.STRING, description: "The title of the video/episode." },
        guestName: { type: Type.STRING, description: "Name of the guest, if applicable." },
        guestProfiles: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Inferred professional roles (e.g., Software Engineer)." },
        topics: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Inferred topics." },
        isShort: { type: Type.STRING, enum: ["Y", "N"], description: "Y if it looks like a YouTube Short URL, otherwise N." }
      }
    }
  };

  const prompt = `
    You are a data extraction assistant. The user has provided a raw list of video titles, URLs, or notes.
    Extract the individual videos and return them as a structured JSON array.
    
    Raw Input:
    ${bulkText}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash", // FIX 1
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  // FIX 2
  const resultText = response.text;
  if (!resultText) return [];
  
  return JSON.parse(resultText);
};

export const searchVideosWithAI = async (
  query: string,
  videos: VideoEntry[]
): Promise<string[]> => {
  const ai = getAiClient();

  // Strip down the data so we don't overload the AI's context window
  const catalog = videos.map(v => ({
    id: v.id,
    title: v.title,
    headline: v.headline,
    isShort: v.isShort || 'N',
    profiles: v.guestProfiles.join(', '),
    audience: v.targetAudience.join(', '),
    topics: v.topics.join(', ')
  }));

  const schema = {
    type: Type.OBJECT,
    properties: {
      relevantVideoIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of video IDs that best match the user's intent.",
      },
    },
  };

  try {
    const prompt = `
      User Query: "${query}"

      You are a helpful assistant for a career advice video directory.
      Select the best videos/shorts from the catalog below that answer the user's question.
      Return ONLY the IDs of relevant videos.

      Catalog:
      ${JSON.stringify(catalog)}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash", // FIX 1
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    // FIX 2
    const resultText = response.text;
    if (!resultText) return [];

    const result = JSON.parse(resultText);
    return result.relevantVideoIds || [];
    
  } catch (error) {
    console.error("AI Catalog Search Failed:", error);
    throw error;
  }
};