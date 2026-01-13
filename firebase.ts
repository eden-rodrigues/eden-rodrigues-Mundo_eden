
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDCGFvP8JUpaYxLr1bbOT10W0k6zTsGIjI",
  authDomain: "controle-fianceiro.firebaseapp.com",
  projectId: "controle-fianceiro",
  storageBucket: "controle-fianceiro.firebasestorage.app",
  messagingSenderId: "969401107094",
  appId: "1:969401107094:web:da0e0821fbf877ea9078b7",
  measurementId: "G-2FPGLK8JDZ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
