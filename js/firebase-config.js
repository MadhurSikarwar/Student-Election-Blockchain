/* js/firebase-config.js */

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBitzQncOgH4yj1E8ByD7R73ysOtIDoC30",
  authDomain: "e-vote-2025-2a49a.firebaseapp.com",
  projectId: "e-vote-2025-2a49a",
  storageBucket: "e-vote-2025-2a49a.firebasestorage.app",
  messagingSenderId: "369130572128",
  appId: "1:369130572128:web:cd3149a6bacb49cd767605"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Services
const auth = firebase.auth();
const db = firebase.firestore();

console.log("Firebase Connected Successfully");