// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDnptPdcUbGMBckDwF0Fw580KzMT6Br79g",
  authDomain: "gen-lang-client-0527665513.firebaseapp.com",
  projectId: "gen-lang-client-0527665513",
  storageBucket: "gen-lang-client-0527665513.firebasestorage.app",
  messagingSenderId: "221885926112",
  appId: "1:221885926112:web:868f103682fb0f01641e85",
  measurementId: "G-KEKB8TQX32"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); // Ensure 'export' is here!