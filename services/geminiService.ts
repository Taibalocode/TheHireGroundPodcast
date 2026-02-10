
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, VideoEntry } from "../types";
import { normalizeTags, toTitleCase } from "../utils/stringUtils";

const getAiClient = () => {
  // Always obtain the API key exclusively from process.env.API_KEY as per guidelines.
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please ensure you have a valid key.");
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

  // Defined responseSchema without using the non-standard Schema type import
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
        description: "Job Profiles (e.g. Salesperson, Consultant, Finance Executive, Student).",
      },
      targetAudience: { 
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of primary audiences (e.g. Entry Level, Executive, General, Data Professionals)." 
      },
      topics: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of 1-5 main topics discussed.",
      },
    },
    required: ["guestProfiles", "topics", "headline", "isShort", "targetAudience"],
  };

  try {
    const prompt = `
      You are a content strategist for "The Hire Ground Podcast".
      Analyze the video metadata.
      
      Extract:
      1. Guest Name (if mentioned).
      2. Headline: A short, punchy summary.
      3. Full Description: Combine the existing description with any inferred guest bio or detailed context.
      4. Is it a Short?: Identify if this is a YouTube Short. Clues: URL contains '/shorts/', title includes '#shorts', or content is extremely brief (under 60s context). 
         Return 'Y' if it is a short, 'N' if it is a regular video.
      5. Job/Guest Profiles (Standardize to: Student, Salesperson, Consultant, Executive, Recruiter, etc).
      6. Target Audience (Who is this for?). Return as a list of distinct groups.
      7. Topics (Key themes).

      Input:
      URL: ${url || "N/A"}
      Title: ${title}
      Description: ${description}
      Transcript Snippet: ${transcriptSnippet || "N/A"}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.3,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini.");

    const result = JSON.parse(text) as AnalysisResult;
    
    // Normalize casing
    result.guestProfiles = normalizeTags(result.guestProfiles);
    result.topics = normalizeTags(result.topics);
    result.targetAudience = normalizeTags(result.targetAudience || []);
    result.isShort = result.isShort === 'Y' ? 'Y' : 'N';
    
    return result;
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};

export const parseBulkVideoInput = async (rawText: string): Promise<Omit<VideoEntry, 'id' | 'createdAt'>[]> => {
  const ai = getAiClient();

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        youtubeId: { type: Type.STRING },
        title: { type: Type.STRING },
        headline: { type: Type.STRING },
        fullDescription: { type: Type.STRING },
        isShort: { type: Type.STRING, enum: ["Y", "N"], description: "Y for shorts, N for videos." },
        guestName: { type: Type.STRING },
        guestProfiles: { type: Type.ARRAY, items: { type: Type.STRING } },
        targetAudience: { type: Type.ARRAY, items: { type: Type.STRING } },
        topics: { type: Type.ARRAY, items: { type: Type.STRING } },
        spotifyUrl: { type: Type.STRING }
      },
      required: ["title", "guestProfiles", "topics", "isShort", "targetAudience"]
    }
  };

  try {
    const prompt = `
      Parse this list of podcast episodes/videos.
      
      Task:
      1. Extract Title.
      2. Extract YouTube ID if a YouTube link is present.
      3. Identify if it is a YouTube Short ('Y' for Shorts, 'N' for regular videos). Look for '#shorts' or '/shorts/' links.
      4. Extract Spotify URL if a Spotify link is present.
      5. Generate a 'headline' and 'fullDescription'.
      6. Infer Guest Name, Job Profiles, Target Audience (as list), and Topics.
      
      Raw Text:
      ${rawText}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1, 
      },
    });

    const text = response.text;
    if (!text) return [];

    const results = JSON.parse(text) as (Omit<VideoEntry, 'id' | 'createdAt'> & { targetAudience?: string[] })[];
    return results.map(r => ({
      ...r,
      guestProfiles: normalizeTags(r.guestProfiles),
      topics: normalizeTags(r.topics),
      targetAudience: normalizeTags(r.targetAudience || []),
      isShort: r.isShort === 'Y' ? 'Y' : 'N'
    }));
  } catch (error) {
    console.error("Bulk Import Failed:", error);
    throw error;
  }
};

export const searchVideosWithAI = async (
  query: string,
  videos: VideoEntry[]
): Promise<string[]> => {
  const ai = getAiClient();

  const catalog = videos.map(v => ({
    id: v.id,
    title: v.title,
    headline: v.headline,
    isShort: v.isShort || 'N',
    fullDescription: v.fullDescription,
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
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const result = JSON.parse(response.text || "{}");
    return result.relevantVideoIds || [];
  } catch (error) {
    console.error("AI Search Failed:", error);
    return [];
  }
};
