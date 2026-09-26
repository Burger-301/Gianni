import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// As tuas credenciais do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC5RJEWOK6pkQXRz1uYvKFR-hyPy5hL3Q4",
  authDomain: "gianni-35be8.firebaseapp.com",
  databaseURL: "https://gianni-35be8-default-rtdb.firebaseio.com",
  projectId: "gianni-35be8",
  storageBucket: "gianni-35be8.firebasestorage.app",
  messagingSenderId: "490260790735",
  appId: "1:490260790735:web:30d15466c494f4a63f26ba"
};

// Inicializa o Firebase, Firestore, Storage e Auth
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
