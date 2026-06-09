// Firebase Auth only — Firestore has been removed.
// Realtime Database is used only for lightweight peer discovery & presence.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDkISiLKl_1XuY66Y52rLoryKL8m9J7BK8",
  authDomain: "jjcodersjchatt.firebaseapp.com",
  projectId: "jjcodersjchatt",
  databaseURL: "https://jjcodersjchatt-default-rtdb.firebaseio.com",
  storageBucket: "jjcodersjchatt.firebasestorage.app",
  messagingSenderId: "306552756545",
  appId: "1:306552756545:web:f7cf551b8560b77b5ca9c0",
  measurementId: "G-HDLNBL64PV"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const rtdb = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
