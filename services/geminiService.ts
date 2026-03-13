import { GoogleGenerativeAI } from '@google/generative-ai';
import { VideoEntry } from '../types';

// Initialize the Gemini AI client using the VITE_ prefixed environment variable
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const searchVideosWithAI = async (query: string, videos: VideoEntry[]): Promise<string[]> => {
  // 1. Fallback if the API key isn't set up correctly
  if (!genAI) {
    console.warn("⚠️ No VITE_GEMINI_API_KEY found. Falling back to basic text search.");
    return fallbackTextSearch(query, videos);
  }

  try {
    // 2. Load the ultra-fast Gemini 1.5 Flash model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 3. Create a lightweight catalog so we don't send massive transcripts (saves tokens/money)
    const lightweightCatalog = videos.map(v => ({
      id: v.id,
      title: v.title,
      guest: v.guestName,
      topics: v.topics,
      audience: v.targetAudience,
      description: v.headline // Using headline instead of fullDescription to save space
    }));

    // 4. Give the AI strict instructions
    const prompt = `
      You are an intelligent search assistant for a podcast directory called "The Hire Ground".
      A user is searching for: "${query}"
      
      Here is the JSON catalog of available podcast episodes:
      ${JSON.stringify(lightweightCatalog)}
      
      Analyze the search query and find the episodes that best match the user's intent. They might use synonyms, concepts, or specific names.
      
      CRITICAL INSTRUCTION: You must return ONLY a raw JSON array of the exact string 'id's for the matching videos. Do not include markdown formatting, backticks (\`\`\`), or any conversational text.
      Example of valid output: ["id1", "id2"]
      If no videos match, return an empty array: []
    `;

    // 5. Ask Gemini!
    const result = await model.generateContent(prompt);
    const textResponse = result.response.text().trim();
    
    // 6. Clean up the response just in case the AI wraps it in markdown (```json ... ```)
    const cleanJson = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    // Parse the JSON array of IDs and return it to App.tsx
    const matchedIds: string[] = JSON.parse(cleanJson);
    console.log(`🧠 AI Search complete. Found ${matchedIds.length} matches.`);
    
    return matchedIds;

  } catch (error) {
    console.error("Gemini AI Search failed. Falling back to text search.", error);
    return fallbackTextSearch(query, videos);
  }
};

// Helper function for the basic text search fallback
const fallbackTextSearch = (query: string, videos: VideoEntry[]): string[] => {
  const searchTerms = query.toLowerCase().split(' ');
  return videos.filter(video => {
    const content = `${video.title} ${video.headline} ${video.guestName} ${(video.topics || []).join(' ')}`.toLowerCase();
    return searchTerms.every(term => content.includes(term));
  }).map(v => v.id);
};