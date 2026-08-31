// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDlyfExTwL52k2HHeVVjXIXIxK2RgYqsro",
  authDomain: "fir-practice-eea6a.firebaseapp.com",
  projectId: "fir-practice-eea6a",
  storageBucket: "fir-practice-eea6a.firebasestorage.app",
  messagingSenderId: "919806636286",
  appId: "1:919806636286:web:b4a82445b8f8966651f5af"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

if (typeof window !== "undefined") {
  window.FIREBASE_APPCHECK__DEBUG_TOKEN = "AB0945F8-0885-4C31-BD24-8778E93990C0"
  
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider("6LcE0qEtAAAAAN6OX5jK74bIw17yei5J-ooBBL-Y"),
    isTokenAutoRefreshEnabled: false
  })
}

export const auth = getAuth()
export const db = getFirestore()
export default app