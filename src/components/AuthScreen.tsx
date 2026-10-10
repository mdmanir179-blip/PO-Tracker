import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Warehouse,
  Truck,
  Printer,
  Sun,
  Moon,
  Monitor,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { TeamRole, EmployeeProfile, ThemeMode } from '../types';
import { AppUser } from '../firebase';
import { BrandLogo } from './BrandLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthScreenProps {
  firebaseUser: AppUser | null;
  existingProfile: EmployeeProfile | null;
  themeMode?: ThemeMode;
  onChangeThemeMode?: (mode: ThemeMode) => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
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
  onCompleteProfile: (data: {
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
  themeMode = 'light',
  onChangeThemeMode,
  darkMode,
  onToggleDarkMode,
  onEmailSignUp,
  onEmailSignIn,
  onCompleteProfile,
  isSubmitting,
  authError,
}) => {
  const effectiveTheme: ThemeMode = themeMode || (darkMode ? 'dark' : 'light');
  const handleThemeSwitch = (target: ThemeMode) => {
    if (typeof onChangeThemeMode === 'function') {
      onChangeThemeMode(target);
    } else if (typeof onToggleDarkMode === 'function') {
      onToggleDarkMode();
    }
  };
  const [mode, setMode] = useState<'login' | 'signup'>('login');
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

  const isDark = effectiveTheme === 'dark';
  const isGrey = effectiveTheme === 'grey';

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
      await onCompleteProfile({
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
    {
      id: 'logistics',
      title: 'Logistics Team',
      icon: <Truck className="w-4 h-4" />,
    },
    {
      id: 'print',
      title: 'Print Team',
      icon: <Printer className="w-4 h-4" />,
    },
  ];

  const inputClass = `w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
    isDark
      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
      : isGrey
      ? 'bg-zinc-100 border-zinc-400 text-zinc-900 placeholder-zinc-500'
      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
  }`;

  return (
    <div
      className={`min-h-screen flex flex-col justify-between transition-colors ${
        isDark
          ? 'bg-slate-950 text-slate-100'
          : isGrey
          ? 'bg-zinc-200 text-zinc-900'
          : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Bar */}
      <header
        className={`flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b ${
          isDark
            ? 'border-slate-800 bg-slate-900/80'
            : isGrey
            ? 'border-zinc-300 bg-zinc-100'
            : 'border-slate-200 bg-white'
        }`}
      >
        <BrandLogo size="md" showSubtitle subtitleText="Supply Chain & Dispatch Control" />
        <div className="flex items-center gap-2.5">
          <PWAInstallButton darkMode={isDark} />
          <div
            className={`flex items-center p-1 rounded-lg border ${
              isDark
                ? 'border-slate-700 bg-slate-800'
                : isGrey
                ? 'border-zinc-400 bg-zinc-200'
                : 'border-slate-200 bg-slate-100'
            }`}
          >
            <button
              type="button"
              onClick={() => handleThemeSwitch('light')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                effectiveTheme === 'light'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => handleThemeSwitch('grey')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                effectiveTheme === 'grey'
                  ? 'bg-zinc-700 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <Monitor className="w-3.5 h-3.5 text-zinc-400" />
              <span>Grey</span>
            </button>
            <button
              type="button"
              onClick={() => handleThemeSwitch('dark')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                effectiveTheme === 'dark'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dark</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Portal */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div
          className={`w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 rounded-2xl border overflow-hidden shadow-lg ${
            isDark
              ? 'bg-slate-900 border-slate-800'
              : isGrey
              ? 'bg-zinc-100 border-zinc-300'
              : 'bg-white border-slate-200'
          }`}
        >
          {/* Left Column: Brand Logo + Headline */}
          <div
            className={`lg:col-span-5 p-8 sm:p-10 flex flex-col items-center justify-center text-center gap-5 border-b lg:border-b-0 lg:border-r ${
              isDark
                ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/40 border-slate-800'
                : isGrey
                ? 'bg-zinc-800 text-white border-zinc-700'
                : 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white border-slate-800'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 p-1 shadow-lg flex items-center justify-center">
              <svg
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-12 h-12"
              >
                <path d="M32 10L52 21L32 32L12 21L32 10Z" fill="#FFFFFF" />
                <path d="M12 21L32 32V54L12 43V21Z" fill="#FFEDD5" />
                <path d="M52 21L32 32V54L52 43V21Z" fill="#FED7AA" />
                <path d="M35 15L25 27H33L29 38L41 25H33L35 15Z" fill="#EA580C" />
                <circle cx="49" cy="15" r="5" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
              </svg>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-orange-400">
                Instamart OpsHub Enterprise
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug text-white max-w-sm mx-auto">
                Unified PO, In-Transit, RTO, GRN & Discrepancy Note Control
              </h1>
              <p className="text-xs text-slate-300 max-w-xs mx-auto pt-1">
                Available as Mobile App (Android / iOS) & Computer App (Windows / Mac)
              </p>
            </div>
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
                    isDark
                      ? 'bg-slate-800 border-slate-700'
                      : isGrey
                      ? 'bg-zinc-200 border-zinc-300'
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
                        ? isDark
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
                        ? isDark
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
              <div className="mb-5 p-3.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs flex items-center gap-2.5 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError || authError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Department / Team Role Selector (shown on Sign Up or when completing Profile) */}
              {(mode === 'signup' || firebaseUser) && (
                <div>
                  <label className="block text-xs font-semibold mb-2">
                    Select Department / Team <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {roleCards.map((card) => {
                      const isSelected = selectedRole === card.id;
                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => setSelectedRole(card.id)}
                          className={`p-2.5 rounded-lg border text-left transition-all flex items-center gap-2 cursor-pointer ${
                            isSelected
                              ? isDark
                                ? 'border-orange-500 bg-orange-500/10 text-white'
                                : 'border-orange-600 bg-orange-50 text-slate-900'
                              : isDark
                              ? 'border-slate-800 bg-slate-800/50 text-slate-300 hover:border-slate-700'
                              : isGrey
                              ? 'border-zinc-300 bg-zinc-200/70 text-zinc-800 hover:border-zinc-400'
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

              {/* Mandatory Name & Employee ID on Sign Up */}
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
            </form>
          </div>
        </div>
      </main>

      <footer className="py-3" />
    </div>
  );
};
