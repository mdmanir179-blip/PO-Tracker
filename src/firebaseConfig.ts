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

export const fallbackFirebaseConfig: FirebaseAppConfig = {
  projectId: 'gen-lang-client-0587051829',
  appId: '1:21671194916:web:6d27b4a615585ab52303b1',
  apiKey: 'AIzaSyAMPVmS-NMxw4CISRt-ZeuwV_DZ3qGVeWI',
  authDomain: 'gen-lang-client-0587051829.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-a612aaae-af1e-4a75-bda0-603b17722021',
  storageBucket: 'gen-lang-client-0587051829.firebasestorage.app',
  messagingSenderId: '21671194916',
  measurementId: '',
  oAuthClientId: '21671194916-ose80q3tstsfss4go1q4bt2eqn59vge6.apps.googleusercontent.com',
  recaptchaSiteKey: '',
};

export const activeFirebaseConfig: FirebaseAppConfig = {
  ...fallbackFirebaseConfig,
  ...(rawConfig || {}),
  // Allow overriding via Vercel/Vite environment variables if set in project settings
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || rawConfig?.apiKey || fallbackFirebaseConfig.apiKey,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || rawConfig?.projectId || fallbackFirebaseConfig.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || rawConfig?.appId || fallbackFirebaseConfig.appId,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || rawConfig?.authDomain || fallbackFirebaseConfig.authDomain,
  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_DATABASE_ID ||
    rawConfig?.firestoreDatabaseId ||
    fallbackFirebaseConfig.firestoreDatabaseId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    rawConfig?.storageBucket ||
    fallbackFirebaseConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    rawConfig?.messagingSenderId ||
    fallbackFirebaseConfig.messagingSenderId,
};

export default activeFirebaseConfig;
