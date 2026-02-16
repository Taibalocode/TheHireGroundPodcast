import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { VideoEntry } from '../types';

const COLLECTION_NAME = "videos";

export const videoStorage = {
  // Fetch all videos from Firestore ordered by creation date
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

  // Add a new video to Firestore
  add: async (video: Omit<VideoEntry, 'id' | 'createdAt'>) => {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...video,
      createdAt: Date.now()
    });
    return docRef.id;
  },

  // Update an existing video in Firestore
  update: async (id: string, updates: Partial<VideoEntry>) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, updates);
  },

  // Delete a video from Firestore
  delete: async (id: string) => {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  }
};