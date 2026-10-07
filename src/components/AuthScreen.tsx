import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  ShieldCheck,
  Building2,
  Warehouse,
  Sun,
  Moon,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { TeamRole, EmployeeProfile } from '../types';

interface AuthScreenProps {
  firebaseUser: User | null;
  existingProfile: EmployeeProfile | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onEmailSignUp: (data: {
    employeeName: string;
    employeeId: string;
    email: string;
    password: string;
    role: TeamRole;
  }) => Promise<void>;
  onEmailSignIn: (data: {
    email: string;
    password: string;
  }) => Promise<void>;
  onGoogleLogin: () => Promise<void>;
  onCompleteGoogleProfile: (data: {
    employeeName: string;
    employeeId: string;
    role: TeamRole;
  }) => Promise<void>;
  isSubmitting: boolean;
  authError: string | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  firebaseUser,
  existingProfile,
  darkMode,
  onToggleDarkMode,
  onEmailSignUp,
  onEmailSignIn,
  onGoogleLogin,
  onCompleteGoogleProfile,
  isSubmitting,
  authError,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(
    existingProfile ? 'login' : 'login'
  );
  const [selectedRole, setSelectedRole] = useState<TeamRole>(
    existingProfile?.role || 'backoffice'
  );
  const [employeeName, setEmployeeName] = useState(
    existingProfile?.employeeName || firebaseUser?.displayName || ''
  );
  const [employeeId, setEmployeeId] = useState(existingProfile?.employeeId || '');
  const [email, setEmail] = useState(firebaseUser?.email || '');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (firebaseUser) {
      const trimmedName = employeeName.trim();
      const trimmedId = employeeId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
      if (trimmedName.length < 2) {
        setFormError('Employee Name is mandatory (minimum 2 characters).');
        return;
      }
      if (trimmedId.length < 2) {
        setFormError('Employee ID is mandatory (letters, numbers, hyphens only).');
        return;
      }
      await onCompleteGoogleProfile({
        employeeName: trimmedName,
        employeeId: trimmedId.toUpperCase(),
        role: selectedRole,
      });
      return;
    }

    if (mode === 'signup') {
      const trimmedName = employeeName.trim();
      const trimmedId = employeeId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
      const trimmedEmail = email.trim();

      if (trimmedName.length < 2) {
        setFormError('Employee Name is mandatory (minimum 2 characters).');
        return;
      }
      if (trimmedId.length < 2) {
        setFormError('Employee ID is mandatory (e.g. EMP-101).');
        return;
      }
      if (!trimmedEmail.includes('@')) {
        setFormError('Valid Email ID is mandatory.');
        return;
      }
      if (password.length < 6) {
        setFormError('Password is mandatory (minimum 6 characters).');
        return;
      }

      await onEmailSignUp({
        employeeName: trimmedName,
        employeeId: trimmedId.toUpperCase(),
        email: trimmedEmail,
        password,
        role: selectedRole,
      });
    } else {
      const trimmedEmail = email.trim();
      if (!trimmedEmail.includes('@')) {
        setFormError('Please enter your registered Email ID.');
        return;
      }
      if (!password) {
        setFormError('Please enter your Password.');
        return;
      }
      await onEmailSignIn({
        email: trimmedEmail,
        password,
      });
    }
  };

  const roleCards: {
    id: TeamRole;
    title: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'admin',
      title: 'Admin Team',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      id: 'backoffice',
      title: 'Backoffice Team',
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      id: 'warehouse',
      title: 'Warehouse Team',
      icon: <Warehouse className="w-4 h-4" />,
    },
  ];

  const inputClass = `w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
    darkMode
      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
  }`;

  return (
    <div
      className={`min-h-screen flex flex-col justify-between transition-colors ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Bar */}
      <header
        className={`flex items-center justify-between px-6 py-4 border-b ${
          darkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
        }`}
      >
        <div className="text-lg font-bold tracking-tight">Instamart Ops Portal</div>
        <div />
        <button
          type="button"
          onClick={onToggleDarkMode}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
            darkMode
              ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
              : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </header>

      {/* Main Split Portal */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div
          className={`w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 rounded-xl border overflow-hidden ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          {/* Left Column: ONLY "Unified PO, In-Transit, GRN & Discrepancy Note Control" centered */}
          <div
            className={`lg:col-span-5 p-10 flex items-center justify-center text-center border-b lg:border-b-0 lg:border-r ${
              darkMode
                ? 'bg-slate-900/90 border-slate-800'
                : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug text-white max-w-sm mx-auto">
              Unified PO, In-Transit, GRN & Discrepancy Note Control
            </h1>
          </div>

          {/* Right Column: Login / Signup Form */}
          <div className="lg:col-span-7 p-8 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  {firebaseUser
                    ? 'Complete Employee Profile'
                    : mode === 'signup'
                    ? 'Employee Sign Up'
                    : 'Employee Log In'}
                </h2>
              </div>
              {!firebaseUser && (
                <div
                  className={`flex p-1 rounded-lg border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700'
                      : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setFormError(null);
                    }}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      mode === 'login'
                        ? darkMode
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setFormError(null);
                    }}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      mode === 'signup'
                        ? darkMode
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>

            {(authError || formError) && (
              <div className="mb-5 p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs space-y-2">
                <div className="flex items-center gap-2.5 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError || authError}</span>
                </div>
                {authError?.includes('operation-not-allowed') && (
                  <div className="pl-6 text-slate-700 dark:text-slate-300 leading-relaxed">
                    To enable Email/Password Sign-Up in Firebase: open{' '}
                    <a
                      href="https://console.firebase.google.com/project/gen-lang-client-0587051829/authentication/providers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-semibold text-orange-600 dark:text-orange-400"
                    >
                      Firebase Console → Authentication → Sign-in method
                    </a>{' '}
                    and enable <strong>Email/Password</strong>, or click <strong>Sign in with Google</strong> below.
                  </div>
                )}
                {authError?.includes('unauthorized-domain') && (
                  <div className="pl-6 text-slate-700 dark:text-slate-300 leading-relaxed">
                    Add{' '}
                    <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono font-bold">
                      {typeof window !== 'undefined' ? window.location.hostname : 'your-app.vercel.app'}
                    </code>{' '}
                    under{' '}
                    <a
                      href="https://console.firebase.google.com/project/gen-lang-client-0587051829/authentication/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-semibold text-orange-600 dark:text-orange-400"
                    >
                      Firebase Console → Authentication → Settings → Authorized domains
                    </a>
                    .
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Team Role Selector (shown on Sign Up or when completing Google Profile) */}
              {(mode === 'signup' || firebaseUser) && (
                <div>
                  <label className="block text-xs font-semibold mb-2">
                    Select Team <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {roleCards.map((card) => {
                      const isSelected = selectedRole === card.id;
                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => setSelectedRole(card.id)}
                          className={`p-3 rounded-lg border text-left transition-all flex items-center gap-2 cursor-pointer ${
                            isSelected
                              ? darkMode
                                ? 'border-orange-500 bg-orange-500/10 text-white'
                                : 'border-orange-600 bg-orange-50 text-slate-900'
                              : darkMode
                              ? 'border-slate-800 bg-slate-800/50 text-slate-300 hover:border-slate-700'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span
                            className={
                              isSelected
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-slate-400'
                            }
                          >
                            {card.icon}
                          </span>
                          <span className="text-xs font-bold">{card.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mandatory Name & Employee ID on Sign Up (or Google Profile completion) */}
              {(mode === 'signup' || firebaseUser) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">
                      Employee Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      placeholder="Enter Full Name"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">
                      Employee ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                      placeholder="e.g. EMP-1042"
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                </div>
              )}

              {/* Mandatory Email ID & Password */}
              {!firebaseUser && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">
                      Email ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>
                  {isSubmitting
                    ? 'Please wait...'
                    : firebaseUser
                    ? 'Complete Profile & Enter Portal'
                    : mode === 'signup'
                    ? 'Sign Up & Create Account'
                    : 'Log In to Portal'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {!firebaseUser && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onGoogleLogin}
                    disabled={isSubmitting}
                    className="gsi-material-button"
                  >
                    <div className="gsi-material-button-state"></div>
                    <div className="gsi-material-button-content-wrapper">
                      <div className="gsi-material-button-icon">
                        <svg
                          version="1.1"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 48 48"
                          style={{ display: 'block' }}
                        >
                          <path
                            fill="#EA4335"
                            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                          ></path>
                          <path
                            fill="#4285F4"
                            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                          ></path>
                          <path
                            fill="#FBBC05"
                            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                          ></path>
                          <path
                            fill="#34A853"
                            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                          ></path>
                          <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                      </div>
                      <span className="gsi-material-button-contents">
                        Continue with Google
                      </span>
                    </div>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </main>

      <footer className="py-3" />
    </div>
  );
};
