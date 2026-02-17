import { initializeApp } from "firebase/app";
import { getFirestore, terminate } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDnptPdcUbGMBckDwF0Fw580KzMT6Br79g",
  authDomain: "gen-lang-client-0527665513.firebaseapp.com", // Updated
  projectId: "gen-lang-client-0527665513",                // Updated
  storageBucket: "gen-lang-client-0527665513.firebasestorage.app", // Updated
  messagingSenderId: "221885926112",
  appId: "1:221885926112:web:868f103682fb0f01641e85",
  measurementId: "G-KEKB8TQX32"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore without persistence to prevent hangs
export const db = getFirestore(app);