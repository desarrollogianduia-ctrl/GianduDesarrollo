import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";

const firebaseConfigWithDefaults = {
  ...firebaseConfig,
  measurementId: firebaseConfig.measurementId || undefined
};

let app;
try {
  app = initializeApp(firebaseConfigWithDefaults);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization failed:", error);
  // We'll throw to be caught by the global error boundary
  throw error;
}

export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
export const storage = getStorage(app, firebaseConfig.storageBucket);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    console.log("Attempting sign in with Google...");
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Sign in successful:", result.user.email);
    return result.user;
  } catch (error: any) {
    console.error("Error signing in with Google:", error);
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error("Este dominio no está autorizado en Firebase. Por favor, añade '" + window.location.hostname + "' a los dominios autorizados en la consola de Firebase.");
    }
    if (error.code === 'auth/popup-blocked') {
      throw new Error("El navegador bloqueó la ventana emergente. Por favor, permite las ventanas emergentes para este sitio.");
    }
    throw error;
  }
};
