import { collection, getDocs, setDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { VideoEntry } from '../types';
import { MASTER_SEED_DATA } from '../seedData';

const COLLECTION_NAME = "videos";
const LOGS_COLLECTION = "activity_logs"; // The home for your permanent logs

export const videoStorage = {
  // --- 1. VIDEO MANAGEMENT ---
  getAll: async (): Promise<VideoEntry[]> => {
    try {
      const vidsRef = collection(db, COLLECTION_NAME);
      const q = query(vidsRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as VideoEntry));
    } catch (error) {
      console.error("Error fetching videos from Firestore:", error);
      return [];
    }
  },

  syncWithCloud: async (): Promise<{ videos: VideoEntry[], source: 'cloud' | 'local' }> => {
    const videos = await videoStorage.getAll();
    return { videos, source: 'cloud' };
  },

  add: async (video: VideoEntry): Promise<VideoEntry[]> => {
    const docRef = doc(db, COLLECTION_NAME, video.id);
    await setDoc(docRef, { ...video });
    return await videoStorage.getAll();
  },

  update: async (id: string, updates: Partial<VideoEntry>): Promise<VideoEntry[]> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, updates);
    return await videoStorage.getAll();
  },

  delete: async (id: string): Promise<VideoEntry[]> => {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    return await videoStorage.getAll();
  },

  reset: async (): Promise<void> => {
    try {
      const vidsRef = collection(db, COLLECTION_NAME);
      const querySnapshot = await getDocs(vidsRef);
      const batch = writeBatch(db);
      
      querySnapshot.forEach((document) => {
        batch.delete(doc(db, COLLECTION_NAME, document.id));
      });
      
      if (MASTER_SEED_DATA && MASTER_SEED_DATA.videos) {
        const seedVideos = MASTER_SEED_DATA.videos as any[];
        seedVideos.forEach((videoItem) => {
          const video = videoItem as VideoEntry;
          const docRef = doc(db, COLLECTION_NAME, video.id);
          batch.set(docRef, video);
        });
      }
      
      await batch.commit();
      console.log("Firestore successfully reset to seed data.");
    } catch (error) {
      console.error("Error resetting Firestore:", error);
      throw error;
    }
  },

  searchWithAI: async (query: string): Promise<VideoEntry[]> => {
    const allVideos = await videoStorage.getAll();
    const searchTerms = query.toLowerCase().split(' ');
    return allVideos.filter(video => {
      const content = `${video.title} ${video.headline} ${video.guestName} ${video.topics.join(' ')}`.toLowerCase();
      return searchTerms.every(term => content.includes(term));
    });
  },

  // --- 2. PERMANENT ACTIVITY LOGGING ---
  
  // This pushes a log entry to the cloud so you don't lose it on refresh
  saveLog: async (log: any) => {
    try {
      // Use crypto.randomUUID() so each log has a unique ID in Firestore
      const docRef = doc(db, LOGS_COLLECTION, crypto.randomUUID());
      await setDoc(docRef, log);
    } catch (e) {
      console.error("Cloud Logger Error:", e);
    }
  },

  // This pulls the full history back down when the app loads
  getAllLogs: async (): Promise<any[]> => {
    try {
      const q = query(
        collection(db, LOGS_COLLECTION), 
        orderBy("timestamp", "desc") // This ensures newest actions appear at the top
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data());
    } catch (e) {
      console.error("Failed to pull cloud logs:", e);
      return [];
    }
  }
};