
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCEDRhEz-lSLrhU5VxnQkJcWGE2aepjHAY",
  authDomain: "twiller-30472.firebaseapp.com",
  projectId: "twiller-30472",
  storageBucket: "twiller-30472.firebasestorage.app",
  messagingSenderId: "502435833021",
  appId: "1:502435833021:web:8719903e4a07db668743d4",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export default app;