import { GoogleGenerativeAI } from '@google/generative-ai';
import { VideoEntry } from '../types';

// Initialize the Gemini AI client using the VITE_ prefixed environment variable
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// --- 1. AI SEMANTIC SEARCH BAR ---
export const searchVideosWithAI = async (query: string, videos: VideoEntry[]): Promise<string[]> => {
  if (!genAI) {
    console.warn("⚠️ No VITE_GEMINI_API_KEY found. Falling back to basic text search.");
    return fallbackTextSearch(query, videos);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const lightweightCatalog = videos.map(v => ({
      id: v.id,
      title: v.title,
      guest: v.guestName,
      topics: v.topics,
      audience: v.targetAudience,
      description: v.headline 
    }));

    const prompt = `
      You are an expert podcast librarian for "The Hire Ground".
      A user typed this natural language search: "${query}"
      
      STEP 1: Ignore conversational filler words (e.g., "videos about", "show me", "find episodes on", "I want to watch"). Extract only the CORE CONCEPT (e.g., "interviews", "tech jobs", "resume building").
      
      STEP 2: Analyze the following JSON catalog of episodes:
      ${JSON.stringify(lightweightCatalog)}
      
      STEP 3: Find ALL episodes that conceptually match the user's core concept. Match by topics, targetAudience, title, headline, or guest profile. 
      * Be generous! If a video is conceptually related to the core topic, include it.
      * Do NOT require exact word matches. Use your semantic understanding.
      
      CRITICAL INSTRUCTION: You must return ONLY a raw JSON array of the exact string 'id's for the matching videos. Do not include markdown formatting, backticks (\`\`\`), or any conversational text.
      Example of valid output: ["id1", "id2"]
      If absolutely no videos match the core concept, return an empty array: []
    `;

    const result = await model.generateContent(prompt);
    const textResponse = result.response.text().trim();
    
    const cleanJson = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    const matchedIds: string[] = JSON.parse(cleanJson);
    console.log(`🧠 AI Search complete. Found ${matchedIds.length} matches.`);
    
    return matchedIds;

  } catch (error) {
    console.error("Gemini AI Search failed. Falling back to text search.", error);
    return fallbackTextSearch(query, videos);
  }
};

const fallbackTextSearch = (query: string, videos: VideoEntry[]): string[] => {
  const searchTerms = query.toLowerCase().split(' ');
  return videos.filter(video => {
    const content = `${video.title} ${video.headline} ${video.guestName} ${(video.topics || []).join(' ')}`.toLowerCase();
    return searchTerms.every(term => content.includes(term));
  }).map(v => v.id);
};

// --- 2. AI MODAL FUNCTIONS (For Auto-Fill and Bulk Import) ---

export const analyzeVideoContent = async (
  input: string, 
  availableProfiles?: string[], 
  availableTopics?: string[], 
  availableAudiences?: string[]
): Promise<Partial<VideoEntry>> => {
  if (!genAI) throw new Error("Gemini API key is missing. Please check your .env.local file.");
  
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `
    You are an AI data assistant for "The Hire Ground Podcast". 
    Analyze the following text/data and extract the details into a single JSON object.
    
    Use these existing tags if they match contextually (otherwise you can create new ones):
    - Profiles: ${availableProfiles?.join(', ') || 'None provided'}
    - Topics: ${availableTopics?.join(', ') || 'None provided'}
    - Audiences: ${availableAudiences?.join(', ') || 'None provided'}

    Return ONLY a raw JSON object with these exact keys (do not use markdown blocks):
    {
      "title": "String",
      "headline": "String",
      "guestName": "String",
      "guestProfiles": ["Array of Strings"],
      "topics": ["Array of Strings"],
      "targetAudience": ["Array of Strings"],
      "youtubeId": "String (if found)",
      "isShort": "Y or N"
    }

    Data to analyze:
    ${input}
  `;

  const result = await model.generateContent(prompt);
  const textResponse = result.response.text().trim();
  const cleanJson = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
  
  return JSON.parse(cleanJson);
};

export const parseBulkVideoInput = async (
  input: string,
  availableProfiles?: string[],
  availableTopics?: string[],
  availableAudiences?: string[]
): Promise<Partial<VideoEntry>[]> => {
  if (!genAI) throw new Error("Gemini API key is missing.");

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `
    You are an AI data assistant for "The Hire Ground Podcast". 
    Analyze the following bulk data (like CSV or copy/pasted text) and extract it into a JSON array of multiple video objects.
    
    Use these existing tags if they match contextually:
    - Profiles: ${availableProfiles?.join(', ') || 'None provided'}
    - Topics: ${availableTopics?.join(', ') || 'None provided'}
    - Audiences: ${availableAudiences?.join(', ') || 'None provided'}

    Return ONLY a raw JSON array of objects with these exact keys (do not use markdown blocks):
    [
      {
        "title": "String",
        "headline": "String",
        "guestName": "String",
        "guestProfiles": ["Array of Strings"],
        "topics": ["Array of Strings"],
        "targetAudience": ["Array of Strings"],
        "youtubeId": "String (if found)",
        "isShort": "Y or N"
      }
    ]

    Data to analyze:
    ${input}
  `;

  const result = await model.generateContent(prompt);
  const textResponse = result.response.text().trim();
  const cleanJson = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
  
  return JSON.parse(cleanJson);
};