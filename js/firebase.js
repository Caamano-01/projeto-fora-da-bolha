import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyATlni7o4e_1gTrEYxvo-_RyO79NxRC0MI",
  authDomain: "fora-da-bolha.firebaseapp.com",
  projectId: "fora-da-bolha",
  storageBucket: "fora-da-bolha.firebasestorage.com",
  messagingSenderId: "374522033401",
  appId: "1:374522033401:web:ba0337cb876fcca900de28"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
