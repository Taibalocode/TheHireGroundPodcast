import { initializeApp } from "firebase/app";
import { getFirestore, terminate } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDnptPdcUbGMBckDwF0Fw580KzMT6Br79g",
  authDomain: "thehiregroundpodcast.firebaseapp.com",
  projectId: "thehiregroundpodcast",
  storageBucket: "thehiregroundpodcast.firebasestorage.app",
  messagingSenderId: "221885926112",
  appId: "1:221885926112:web:868f103682fb0f01641e85"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore without persistence to prevent hangs
export const db = getFirestore(app);