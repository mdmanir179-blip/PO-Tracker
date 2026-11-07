import rawConfig from '../firebase-applet-config.json';

export interface FirebaseAppConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
}

const hardcodedFallback: FirebaseAppConfig = {
  projectId: "gen-lang-client-0587051829",
  appId: "1:21671194916:web:6d27b4a615585ab52303b1",
  apiKey: "AIzaSyAMPVmS-NMxw4CISRt-ZeuwV_DZ3qGVeWI",
  authDomain: "gen-lang-client-0587051829.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-a612aaae-af1e-4a75-bda0-603b17722021",
  storageBucket: "gen-lang-client-0587051829.firebasestorage.app",
  messagingSenderId: "21671194916",
  measurementId: "",
  oAuthClientId: "21671194916-ose80q3tstsfss4go1q4bt2eqn59vge6.apps.googleusercontent.com",
  recaptchaSiteKey: "",
};

export const activeFirebaseConfig: FirebaseAppConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || rawConfig?.projectId || hardcodedFallback.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || rawConfig?.appId || hardcodedFallback.appId,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || rawConfig?.apiKey || hardcodedFallback.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || rawConfig?.authDomain || hardcodedFallback.authDomain,
  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_DATABASE_ID ||
    rawConfig?.firestoreDatabaseId ||
    hardcodedFallback.firestoreDatabaseId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    rawConfig?.storageBucket ||
    hardcodedFallback.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    rawConfig?.messagingSenderId ||
    hardcodedFallback.messagingSenderId,
  measurementId: rawConfig?.measurementId || hardcodedFallback.measurementId || '',
  oAuthClientId: rawConfig?.oAuthClientId || hardcodedFallback.oAuthClientId || '',
  recaptchaSiteKey: rawConfig?.recaptchaSiteKey || hardcodedFallback.recaptchaSiteKey || '',
};

export const fallbackFirebaseConfig: FirebaseAppConfig = activeFirebaseConfig;

export default activeFirebaseConfig;
