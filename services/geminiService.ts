import { GoogleGenerativeAI, SchemaType, Schema } from '@google/generative-ai';
import { VideoEntry } from '../types';

// Initialize the Gemini AI client using the VITE_ prefixed environment variable
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Helper function for the basic text search fallback
const fallbackTextSearch = (query: string, videos: VideoEntry[]): string[] => {
  const searchTerms = query.toLowerCase().split(' ');
  return videos.filter(video => {
    const content = `${video.title} ${video.headline} ${video.guestName} ${(video.topics || []).join(' ')}`.toLowerCase();
    return searchTerms.every(term => content.includes(term));
  }).map(v => v.id);
};

// --- 1. AI SEMANTIC SEARCH BAR ---
export const searchVideosWithAI = async (query: string, videos: VideoEntry[]): Promise<string[]> => {
  if (!genAI) {
    console.warn("⚠️ No API Key found! Forcing basic text search.");
    return fallbackTextSearch(query, videos);
  }

  try {
    const catalogData = JSON.stringify(videos.map(v => ({
      id: v.id,
      title: v.title,
      headline: v.headline,
      isShort: v.isShort || 'N',
      fullDescription: v.fullDescription,
      profiles: v.guestProfiles.join(', '),
      audience: v.targetAudience.join(', '),
      topics: v.topics.join(', ')
    })));

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", 
    });

    // 1. EXPLICITLY TYPE THE SCHEMA TO SATISFY TYPESCRIPT
    const responseSchema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        relevantVideoIds: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "List of video IDs that best match the user's intent.",
        },
      },
    };

    // 2. PASS THE TYPED SCHEMA INTO THE CONFIG
    const generationConfig = {
      temperature: 0.4,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    };

    const exactPrompt = `
      User Query: "${query}"

      You are a helpful assistant for a career advice video directory.
      Select the best videos/shorts from the catalog below that answer the user's question.
      Return ONLY the IDs of relevant videos.

      Catalog:
      ${catalogData}
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: exactPrompt }] }],
      generationConfig,
    });

    const parsedResult = JSON.parse(result.response.text() || "{}");
    console.log(`🧠 AI Studio Search complete. Found ${parsedResult.relevantVideoIds?.length || 0} matches.`);
    
    return parsedResult.relevantVideoIds || [];

  } catch (error) {
    console.error("🚨 AI Studio Code Crashed:", error);
    return fallbackTextSearch(query, videos);
  }
};
// --- 2. AI MODAL FUNCTIONS (Auto-Fill & Bulk Import) ---

export const analyzeVideoContent = async (
  input: string, 
  availableProfiles?: string[], 
  availableTopics?: string[], 
  availableAudiences?: string[]
): Promise<Partial<VideoEntry>> => {
  if (!genAI) throw new Error("Gemini API key is missing. Please check your .env.local file.");
  
  const schema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
      title: { type: SchemaType.STRING },
      headline: { type: SchemaType.STRING, description: "A short, catchy 1-sentence summary" },
      fullDescription: { type: SchemaType.STRING },
      guestName: { type: SchemaType.STRING },
      isShort: { type: SchemaType.STRING, description: "Y or N" },
      guestProfiles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      targetAudience: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      topics: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      youtubeId: { type: SchemaType.STRING }
    },
    required: ["title", "headline", "isShort"]
  };

  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json", responseSchema: schema }
  });

  const prompt = `
    Analyze this video data and extract the details.
    
    Use these existing tags if they match contextually:
    - Profiles: ${availableProfiles?.join(', ') || 'None provided'}
    - Topics: ${availableTopics?.join(', ') || 'None provided'}
    - Audiences: ${availableAudiences?.join(', ') || 'None provided'}

    Data:
    ${input}
  `;

  const response = await model.generateContent(prompt);
  return JSON.parse(response.response.text());
};

export const parseBulkVideoInput = async (
  input: string,
  availableProfiles?: string[],
  availableTopics?: string[],
  availableAudiences?: string[]
): Promise<Partial<VideoEntry>[]> => {
  if (!genAI) throw new Error("Gemini API key is missing.");

  const schema: Schema = {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING },
        headline: { type: SchemaType.STRING },
        guestName: { type: SchemaType.STRING },
        isShort: { type: SchemaType.STRING },
        youtubeId: { type: SchemaType.STRING },
        spotifyUrl: { type: SchemaType.STRING },
        guestProfiles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        targetAudience: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        topics: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
      },
      required: ["title"]
    }
  };

  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json", responseSchema: schema }
  });

  const prompt = `
    Parse this list of podcast episodes/videos.
    
    Use these existing tags if they match contextually:
    - Profiles: ${availableProfiles?.join(', ') || 'None provided'}
    - Topics: ${availableTopics?.join(', ') || 'None provided'}
    - Audiences: ${availableAudiences?.join(', ') || 'None provided'}

    Raw Text:
    ${input}
  `;

  const response = await model.generateContent(prompt);
  return JSON.parse(response.response.text());
};