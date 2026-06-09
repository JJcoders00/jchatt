import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDkISiLKl_1XuY66Y52rLoryKL8m9J7BK8",
  authDomain: "jjcodersjchatt.firebaseapp.com",
  projectId: "jjcodersjchatt",
  databaseURL: "https://jjcodersjchatt-default-rtdb.firebaseio.com",
  storageBucket: "jjcodersjchatt.appspot.com", // Fixed default storage bucket format
  messagingSenderId: "306552756545",
  appId: "1:306552756545:web:f7cf551b8560b77b5ca9c0",
  measurementId: "G-HDLNBL64PV"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
