import React, { useState } from 'react';
import { Smartphone, Monitor, CheckCircle2, Download, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AppInstallModal } from './AppInstallModal';

interface PWAInstallButtonProps {
  darkMode?: boolean;
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  darkMode = false,
  compact = false,
}) => {
  const { isInstallable, isInstalled, platformName, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) {
    return (
      <span
        className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border ${
          darkMode
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : 'border-emerald-300 bg-emerald-50 text-emerald-800'
        }`}
        title={`Running as Installed Standalone App on ${platformName}`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span className="hidden md:inline">Installed App</span>
        <span className="md:hidden">App Active</span>
      </span>
    );
  }

  const handleTrigger = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleTrigger}
        className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold border flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shadow-xs active:scale-95 ${
          isInstallable
            ? darkMode
              ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 ring-1 ring-emerald-500/30'
              : 'border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 ring-1 ring-emerald-400/30'
            : darkMode
            ? 'border-blue-500/40 bg-blue-500/15 text-blue-300 hover:bg-blue-500/25'
            : 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100'
        }`}
        title="Install Mobile App (Android / iOS) or Computer App (Windows / Mac)"
      >
        {isInstallable ? (
          <Download className="w-3.5 h-3.5 text-emerald-500 shrink-0 animate-bounce" />
        ) : (
          <>
            <Smartphone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <Monitor className="w-3.5 h-3.5 text-blue-500 hidden sm:inline shrink-0" />
          </>
        )}
        <span className="font-bold">
          {compact ? 'Get App' : 'Mobile & PC App'}
        </span>
        {isInstallable && (
          <span className="px-1 rounded bg-emerald-600 text-white text-[9px] font-extrabold uppercase">
            1-Click
          </span>
        )}
      </button>

      <AppInstallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        darkMode={darkMode}
      />
    </>
  );
};

/**
 * Bottom Floating Quick Install Banner for Mobile Users & First-Time Computer Users
 */
export const FloatingInstallBanner: React.FC<{ darkMode?: boolean }> = ({
  darkMode = false,
}) => {
  const { isInstallable, isInstalled, install, isDesktop } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  if (isInstalled || dismissed) return null;

  return (
    <>
      <div
        className={`fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-40 p-3 sm:p-3.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all ${
          darkMode
            ? 'bg-slate-900/95 border-slate-700 text-slate-100'
            : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/40'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-orange-600 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate flex items-center gap-1.5">
                <span>{isDesktop ? 'Install Computer App' : 'Install Mobile App'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-orange-500/20 text-orange-600 dark:text-orange-400">
                  Fast
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Full-screen, offline speed & instant alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={async () => {
                if (isInstallable) {
                  const done = await install();
                  if (!done) setShowModal(true);
                } else {
                  setShowModal(true);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <AppInstallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        darkMode={darkMode}
      />
    </>
  );
};
