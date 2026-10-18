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

export const activeFirebaseConfig: FirebaseAppConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || rawConfig?.projectId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || rawConfig?.appId || '',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || rawConfig?.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || rawConfig?.authDomain || '',
  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_DATABASE_ID ||
    rawConfig?.firestoreDatabaseId ||
    '',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    rawConfig?.storageBucket ||
    '',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    rawConfig?.messagingSenderId ||
    '',
  measurementId: rawConfig?.measurementId || '',
  oAuthClientId: rawConfig?.oAuthClientId || '',
  recaptchaSiteKey: rawConfig?.recaptchaSiteKey || '',
};

export const fallbackFirebaseConfig: FirebaseAppConfig = activeFirebaseConfig;

export default activeFirebaseConfig;
