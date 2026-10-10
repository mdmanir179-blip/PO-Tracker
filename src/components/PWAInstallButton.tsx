import React, { useState } from 'react';
import { Smartphone, Monitor, Download, CheckCircle2, X, Share2, ExternalLink } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  darkMode?: boolean;
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  darkMode = false,
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) {
    return (
      <span
        className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border ${
          darkMode
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : 'border-emerald-300 bg-emerald-50 text-emerald-800'
        }`}
        title="Running as Installed Mobile / Desktop App"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span>App Installed</span>
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
        className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold border flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
          darkMode
            ? 'border-blue-500/40 bg-blue-500/15 text-blue-300 hover:bg-blue-500/25'
            : 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100'
        }`}
        title="Install Mobile App (Android / iOS) or Computer App (Windows / Mac)"
      >
        <Smartphone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        <Monitor className="w-3.5 h-3.5 text-blue-500 hidden sm:inline shrink-0" />
        <span>{compact ? 'Get App' : 'Mobile / PC App'}</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">
                    Install Instamart OpsHub (Mobile & Computer App)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Use as a standalone Desktop App (Windows/Mac) or Mobile App (Android/iOS)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {isInstallable && (
                <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                      One-Click Direct App Install Ready
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                      Click the button to install Instamart OpsHub directly on your device.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await install();
                      setShowModal(false);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold whitespace-nowrap cursor-pointer"
                  >
                    Install Now
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Computer App (Windows / Mac / Chrome / Edge) */}
                <div
                  className={`p-4 rounded-xl border space-y-2 ${
                    darkMode
                      ? 'bg-slate-800/60 border-slate-700'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-orange-600 dark:text-orange-400">
                    <Monitor className="w-4 h-4 shrink-0" />
                    <span>Computer App (Windows / Mac)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                    <li>
                      Open this app in a full browser tab using the{' '}
                      <strong>Open in New Tab</strong> icon if inside preview.
                    </li>
                    <li>
                      Click the <strong>Install App</strong> icon in the right side of the address bar (Chrome / Edge).
                    </li>
                    <li>
                      It will launch as a standalone Desktop Software on your taskbar/dock.
                    </li>
                  </ol>
                </div>

                {/* Mobile App (Android & iPhone / iPad) */}
                <div
                  className={`p-4 rounded-xl border space-y-2 ${
                    darkMode
                      ? 'bg-slate-800/60 border-slate-700'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400">
                    <Smartphone className="w-4 h-4 shrink-0" />
                    <span>Mobile App (Android & iOS)</span>
                  </div>
                  {isIOS ? (
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                      <li>
                        Tap the <Share2 className="w-3.5 h-3.5 inline text-blue-500" />{' '}
                        <strong>Share</strong> button in Safari.
                      </li>
                      <li>
                        Scroll down and tap <strong>Add to Home Screen</strong>.
                      </li>
                      <li>
                        Open <strong>Instamart OpsHub</strong> from your home screen like a native mobile app.
                      </li>
                    </ol>
                  ) : (
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                      <li>
                        Open in Chrome on your Android phone and tap the{' '}
                        <strong>⋮ Menu</strong> (top right).
                      </li>
                      <li>
                        Tap <strong>Install App</strong> or <strong>Add to Home screen</strong>.
                      </li>
                      <li>
                        On iPhone/iPad Safari, tap <strong>Share → Add to Home Screen</strong>.
                      </li>
                    </ol>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-semibold hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Screen in New Browser Tab</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
