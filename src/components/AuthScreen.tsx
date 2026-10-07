import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { ShieldCheck, Building2, Warehouse, Sun, Moon, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { TeamRole, EmployeeProfile } from '../types';

interface AuthScreenProps {
  firebaseUser: User | null;
  existingProfile: EmployeeProfile | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onGoogleLogin: () => Promise<void>;
  onCompleteSignupOrProfile: (data: {
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
  onGoogleLogin,
  onCompleteSignupOrProfile,
  isSubmitting,
  authError,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(existingProfile ? 'login' : 'signup');
  const [selectedRole, setSelectedRole] = useState<TeamRole>(
    existingProfile?.role || 'backoffice'
  );
  const [employeeName, setEmployeeName] = useState(
    existingProfile?.employeeName || firebaseUser?.displayName || ''
  );
  const [employeeId, setEmployeeId] = useState(existingProfile?.employeeId || '');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

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

    await onCompleteSignupOrProfile({
      employeeName: trimmedName,
      employeeId: trimmedId.toUpperCase(),
      role: selectedRole,
    });
  };

  const roleCards: {
    id: TeamRole;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'admin',
      title: 'Admin Team',
      subtitle: 'Full PO, In-Transit override, GRN, DN & Employee Activity Audit',
      icon: <ShieldCheck className="w-5 h-5" />,
    },
    {
      id: 'backoffice',
      title: 'Backoffice Team',
      subtitle: 'New PO Entry, Pickup scheduling, GRN & DN Tracker updates',
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      id: 'warehouse',
      title: 'Warehouse Team',
      subtitle: 'Dispatch pickup verification, Inward GRN & DN Report filing',
      icon: <Warehouse className="w-5 h-5" />,
    },
  ];

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
        <div className="hidden md:flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
          <span>Purchase Order Pipeline</span>
          <span>·</span>
          <span>In-Transit Lock</span>
          <span>·</span>
          <span>GRN & DN Tracker</span>
          <span>·</span>
          <span>Live Google Sheets Sync</span>
        </div>
        <button
          type="button"
          onClick={onToggleDarkMode}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
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
          {/* Left Column: Operational Overview */}
          <div
            className={`lg:col-span-5 p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r ${
              darkMode
                ? 'bg-slate-900/90 border-slate-800'
                : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            <div className="space-y-6">
              <div className="text-xs font-medium text-orange-400 tracking-wide">
                Swiggy Instamart Supply Chain Suite
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight text-white">
                Unified PO, In-Transit, GRN & Discrepancy Note Control
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Real-time two-way workflow designed for Admin, Backoffice, and Warehouse teams with instant Google Sheets synchronization.
              </p>

              <div className="space-y-4 pt-2 border-t border-slate-800 text-xs text-slate-300">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">01. Automated In-Transit Shift:</span> Setting Pickup Status to YES immediately shifts the PO to In-Transit and locks edits for standard employees while keeping Admin override active.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">02. Automatic GRN & DN Flow:</span> Successful inwarding moves POs directly to GRN where Discrepancy Notes and LR numbers are tracked.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">03. Mandatory Employee Audit:</span> Every entry or update logs the Employee Name, Employee ID, and Team Role for Admin visibility.
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 text-xs text-slate-400">
              Supports live Google Sheets tabs · Excel (.xlsx) · CSV · PDF Export
            </div>
          </div>

          {/* Right Column: Login / Signup Form */}
          <div className="lg:col-span-7 p-8 flex flex-col justify-center">
            {/* Mode Switcher */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  {firebaseUser
                    ? 'Complete Employee Registration & Team Role'
                    : mode === 'signup'
                    ? 'Team Sign Up & Employee ID Registration'
                    : 'Employee Sign In'}
                </h2>
                <p
                  className={`text-xs mt-1 ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Select your department (Admin, Backoffice, or Warehouse) and verify your mandatory Employee ID.
                </p>
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
                    onClick={() => setMode('login')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
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
                    onClick={() => setMode('signup')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
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
              <div className="mb-5 p-3.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError || authError}</span>
              </div>
            )}

            {/* Step 1: Select Team Role */}
            <div className="space-y-3 mb-6">
              <label className="block text-xs font-semibold">
                Select Team Access Portal <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {roleCards.map((card) => {
                  const isSelected = selectedRole === card.id;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setSelectedRole(card.id)}
                      className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? darkMode
                            ? 'border-orange-500 bg-orange-500/10 text-white'
                            : 'border-orange-600 bg-orange-50/70 text-slate-900'
                          : darkMode
                          ? 'border-slate-800 bg-slate-800/50 text-slate-300 hover:border-slate-700'
                          : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={
                            isSelected
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-slate-400'
                          }
                        >
                          {card.icon}
                        </span>
                        <span className="text-[11px] font-mono font-medium">
                          {isSelected ? 'Selected' : ''}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-bold">{card.title}</div>
                        <div
                          className={`text-[11px] mt-1 leading-snug ${
                            darkMode ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          {card.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Mandatory Employee Name & Employee ID */}
            <form onSubmit={handleSubmitProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Employee Name (Mandatory) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="e.g. Rahul Chatterjee"
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Employee ID (Mandatory) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                    placeholder="e.g. EMP-IM-1042"
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              <p
                className={`text-xs ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Your Employee Name and Employee ID are automatically stamped on every PO, In-Transit shift, GRN, and DN update and displayed in the Admin Audit View.
              </p>

              {!firebaseUser ? (
                <div className="pt-2 space-y-3">
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
                        {isSubmitting
                          ? 'Authenticating with Google...'
                          : mode === 'signup'
                          ? 'Sign Up & Verify with Google Workspace'
                          : 'Sign In with Google Workspace'}
                      </span>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="pt-2 space-y-3">
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                      darkMode
                        ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                        : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>
                      Authenticated Google Account: <strong>{firebaseUser.email}</strong>
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>
                      {isSubmitting
                        ? 'Saving Employee Profile...'
                        : `Enter Portal as ${selectedRole.toUpperCase()} (${
                            employeeId || 'EMP-ID'
                          })`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </main>

      <footer
        className={`px-6 py-4 text-center text-xs border-t ${
          darkMode
            ? 'border-slate-900 text-slate-500'
            : 'border-slate-200 text-slate-500'
        }`}
      >
        Instamart Supply Chain & PO Management System · Role-Based Access Control (Admin · Backoffice · Warehouse)
      </footer>
    </div>
  );
};
