import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDXNf4qTVLkRFT6X5UxOSmRhe8GF0fb3U8",
  authDomain: "lmsproject123456.firebaseapp.com",
  projectId: "lmsproject123456",
  storageBucket: "lmsproject123456.firebasestorage.app",
  messagingSenderId: "223199365215",
  appId: "1:223199365215:web:c18cc3c4bab321352633ea",
  measurementId: "G-MPDWV8PR80"
};


const razorpayKey = "your_razorpay_key"; 

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
