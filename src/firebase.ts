import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface LocalAccountRecord {
  uid: string;
  email: string;
  passwordHash: string;
  displayName: string;
}

const LOCAL_ACCOUNTS_KEY = 'instamart_accounts_v1';
const LOCAL_SESSION_KEY = 'instamart_active_session_v1';

let authListeners: Array<(user: AppUser | null) => void> = [];

function notifyListeners(user: AppUser | null) {
  authListeners.forEach((cb) => cb(user));
}

function getLocalAccounts(): LocalAccountRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAccounts(accounts: LocalAccountRecord[]) {
  localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function getActiveSessionUser(): AppUser | null {
  if (auth.currentUser) {
    return {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      displayName: auth.currentUser.displayName,
    };
  }
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: boolean | string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const active = getActiveSessionUser();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || active?.uid || null,
      email: auth.currentUser?.email || active?.email || null,
      emailVerified: auth.currentUser?.emailVerified ?? true,
      isAnonymous: auth.currentUser?.isAnonymous ?? false,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const initAuth = (
  onAuthChange: (user: AppUser | null) => void
) => {
  authListeners.push(onAuthChange);

  const unsubFirebase = onAuthStateChanged(auth, (fbUser: User | null) => {
    if (fbUser) {
      const mapped: AppUser = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
      };
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(mapped));
      onAuthChange(mapped);
    } else {
      const localSession = getActiveSessionUser();
      onAuthChange(localSession);
    }
  });

  return () => {
    authListeners = authListeners.filter((fn) => fn !== onAuthChange);
    unsubFirebase();
  };
};

export const emailSignUp = async (
  email: string,
  password: string,
  displayName: string
): Promise<AppUser> => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = displayName.trim();

  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    if (cleanName) {
      await updateProfile(cred.user, { displayName: cleanName });
    }
    const appUser: AppUser = {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cleanName || cred.user.displayName,
    };
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(appUser));
    notifyListeners(appUser);
    return appUser;
  } catch (err: any) {
    const code = String(err?.code || err?.message || '');
    // Fallback if domain is not allowlisted on Vercel or Email/Password provider isn't toggled yet
    if (
      code.includes('unauthorized-domain') ||
      code.includes('operation-not-allowed') ||
      code.includes('configuration-not-found')
    ) {
      const accounts = getLocalAccounts();
      const exists = accounts.find((a) => a.email === cleanEmail);
      if (exists) {
        throw new Error('This Email ID is already registered. Please Log In.');
      }
      const uid = `emp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newAcc: LocalAccountRecord = {
        uid,
        email: cleanEmail,
        passwordHash: btoa(unescape(encodeURIComponent(password))),
        displayName: cleanName,
      };
      saveLocalAccounts([...accounts, newAcc]);
      const appUser: AppUser = {
        uid,
        email: cleanEmail,
        displayName: cleanName,
      };
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(appUser));
      notifyListeners(appUser);
      return appUser;
    }
    throw err;
  }
};

export const emailSignIn = async (
  email: string,
  password: string
): Promise<AppUser> => {
  const cleanEmail = email.trim().toLowerCase();

  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const appUser: AppUser = {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName,
    };
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(appUser));
    notifyListeners(appUser);
    return appUser;
  } catch (err: any) {
    const code = String(err?.code || err?.message || '');
    if (
      code.includes('unauthorized-domain') ||
      code.includes('operation-not-allowed') ||
      code.includes('configuration-not-found') ||
      code.includes('invalid-credential') ||
      code.includes('user-not-found')
    ) {
      const accounts = getLocalAccounts();
      const encoded = btoa(unescape(encodeURIComponent(password)));
      const found = accounts.find(
        (a) => a.email === cleanEmail && a.passwordHash === encoded
      );
      if (found) {
        const appUser: AppUser = {
          uid: found.uid,
          email: found.email,
          displayName: found.displayName,
        };
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(appUser));
        notifyListeners(appUser);
        return appUser;
      }
      if (
        code.includes('unauthorized-domain') ||
        code.includes('operation-not-allowed') ||
        code.includes('configuration-not-found')
      ) {
        throw new Error('Account not found on this device. Please Sign Up first.');
      }
    }
    throw new Error('Invalid Email ID or Password.');
  }
};

export const logout = async () => {
  localStorage.removeItem(LOCAL_SESSION_KEY);
  try {
    await auth.signOut();
  } catch {
    // ignore
  }
  notifyListeners(null);
};
