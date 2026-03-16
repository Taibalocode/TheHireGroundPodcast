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
// --- 1. AI SEMANTIC SEARCH BAR ---
export const searchVideosWithAI = async (query: string, videos: VideoEntry[]): Promise<string[]> => {
  if (!genAI) {
    console.warn("⚠️ No VITE_GEMINI_API_KEY found. Falling back to basic text search.");
    return fallbackTextSearch(query, videos);
  }

  try {
    // EXACT AI STUDIO CATALOG MAPPING
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

    // EXACT AI STUDIO SCHEMA
    const schema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        relevantVideoIds: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "List of video IDs that best match the user's intent.",
        },
      },
    };

    // SWITCHED TO 'PRO' MODEL FOR DEEPER SEMANTIC REASONING
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro", 
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    // EXACT AI STUDIO PROMPT
    const prompt = `
      User Query: "${query}"

      You are a helpful assistant for a career advice video directory.
      Select the best videos/shorts from the catalog below that answer the user's question.
      Return ONLY the IDs of relevant videos.

      Catalog:
      ${JSON.stringify(catalog)}
    `;

    const response = await model.generateContent(prompt);
    const result = JSON.parse(response.response.text() || "{}");
    
    console.log(`🧠 AI Search complete. Found ${result.relevantVideoIds?.length || 0} matches.`);
    return result.relevantVideoIds || [];

  } catch (error) {
    console.error("AI Search Failed. Falling back to text search.", error);
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
      headline: { type: SchemaType.STRING },
      fullDescription: { type: SchemaType.STRING },
      guestName: { type: SchemaType.STRING },
      isShort: { type: SchemaType.STRING },
      guestProfiles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      targetAudience: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      topics: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      youtubeId: { type: SchemaType.STRING }
    },
    required: ["title", "headline", "isShort"]
  }; // 👈 Add "as const" here as const; // 👈 Add "as const" here
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
  };// 👈 Add "as const" here

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