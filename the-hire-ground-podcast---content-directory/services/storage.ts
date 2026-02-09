
import { VideoEntry } from '../types';
import { MASTER_SEED_DATA } from '../seedData';

const VIDEOS_KEY = 'hire_ground_videos';
const VIDEOS_BACKUP_KEY = 'hire_ground_videos_BAK';
const VIDEOS_SESSION_KEY = 'hire_ground_videos_SESSION';
const DRAFT_KEY = 'hire_ground_video_draft';
const LOG_KEY = 'hire_ground_activity_logs';

const migrateVideo = (v: any): VideoEntry => {
  // Handle legacy targetAudience (string) -> convert to string[]
  let audience: string[] = [];
  if (Array.isArray(v.targetAudience)) {
    audience = v.targetAudience;
  } else if (typeof v.targetAudience === 'string' && v.targetAudience.trim().length > 0) {
    audience = v.targetAudience.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
  }

  return {
    ...v,
    id: v.id || crypto.randomUUID(),
    createdAt: v.createdAt || Date.now(),
    title: v.title || 'Untitled Episode',
    youtubeId: v.youtubeId || '',
    headline: v.headline || v.description || '',
    fullDescription: v.fullDescription || (v.headline ? v.description : '') || '',
    spotifyUrl: v.spotifyUrl || undefined,
    isShort: v.isShort === 'Y' ? 'Y' : 'N',
    guestProfiles: Array.isArray(v.guestProfiles) ? v.guestProfiles : [],
    targetAudience: audience,
    topics: Array.isArray(v.topics) ? v.topics : []
  };
};

const safeParse = (sourceName: string, raw: string | null): VideoEntry[] | null => {
  if (!raw || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw.trim());
    let data: any[] = [];
    if (Array.isArray(parsed)) {
      data = parsed;
    } else if (parsed && parsed.videos && Array.isArray(parsed.videos)) {
      data = parsed.videos;
    } else {
      console.warn(`Storage Warning (${sourceName}): Valid JSON but structure is not an array or {videos: []}`);
      return null;
    }
    return data.map(migrateVideo);
  } catch (e) {
    console.error(`Storage Error (${sourceName}): Failed to parse JSON. Raw content snippet: ${raw.slice(0, 50)}...`);
    return null;
  }
};

export const videoStorage = {
  // Directly returns the bundled Master Seed from the TypeScript file.
  fetchMaster: async (): Promise<VideoEntry[]> => {
    try {
      // Use the typed constant directly. No file fetching or JSON parsing required.
      const raw: any = MASTER_SEED_DATA;
      
      // Handle the { "videos": [...] } structure or direct array
      const list = (raw && raw.videos) ? raw.videos : raw;
      
      if (!Array.isArray(list)) {
        console.error("Master Seed Data Structure:", raw);
        throw new Error("Master Seed (seedData.ts) is not a valid array or object with a 'videos' array.");
      }

      return list.map(migrateVideo);
    } catch (e: any) {
      console.error("Critical: Failed to load bundled Master Seed.", e);
      throw e; 
    }
  },

  // Legacy wrapper
  syncWithCloud: async (): Promise<{ videos: VideoEntry[], source: 'cloud' | 'cache' }> => {
    try {
      const cloudVideos = await videoStorage.fetchMaster();
      if (cloudVideos && cloudVideos.length > 0) {
        videoStorage.replaceAll(cloudVideos);
        return { videos: cloudVideos, source: 'cloud' };
      }
    } catch (e) {
      // If bundle fails, this is catastrophic, but we fallback to cache as last resort
    }
    
    const cachedVideos = videoStorage.getAll();
    return { 
      videos: cachedVideos, 
      source: 'cache' 
    };
  },

  getAll: (): VideoEntry[] => {
    const local = safeParse('Local', localStorage.getItem(VIDEOS_KEY));
    if (local && local.length > 0) return local;
    
    const session = safeParse('Session', sessionStorage.getItem(VIDEOS_SESSION_KEY));
    if (session && session.length > 0) return session;

    return [];
  },

  _save: (videos: VideoEntry[]) => {
    try {
      const json = JSON.stringify(videos);
      localStorage.setItem(VIDEOS_KEY, json);
      localStorage.setItem(VIDEOS_BACKUP_KEY, json);
      sessionStorage.setItem(VIDEOS_SESSION_KEY, json);
    } catch (e) {}
  },

  add: (video: VideoEntry): VideoEntry[] => {
    const current = videoStorage.getAll();
    const updated = [video, ...current];
    videoStorage._save(updated);
    return updated;
  },

  update: (id: string, updates: Partial<VideoEntry>): VideoEntry[] => {
    const current = videoStorage.getAll();
    const index = current.findIndex(v => v.id === id);
    if (index === -1) return current;
    current[index] = { ...current[index], ...updates };
    videoStorage._save(current);
    return current;
  },

  delete: (id: string): VideoEntry[] => {
    const current = videoStorage.getAll();
    const updated = current.filter(v => v.id !== id);
    videoStorage._save(updated);
    return updated;
  },

  replaceAll: (videos: VideoEntry[]) => {
    videoStorage._save(videos);
  },

  reset: () => {
    // Thoroughly wipe all local video-related storage
    localStorage.removeItem(VIDEOS_KEY);
    localStorage.removeItem(VIDEOS_BACKUP_KEY);
    localStorage.removeItem(DRAFT_KEY);
    sessionStorage.removeItem(VIDEOS_SESSION_KEY);
    
    // Clear whole stores to be absolutely sure
    localStorage.clear();
    sessionStorage.clear();
  }
};

export const draftStorage = {
  save: (data: any) => {
    try {
      const existing = draftStorage.get() || {};
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...existing, ...data }));
    } catch (e) {}
  },
  get: (): any | null => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  clear: () => { localStorage.removeItem(DRAFT_KEY); }
};
