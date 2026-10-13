import React, { useState } from 'react';
import {
  Smartphone,
  Monitor,
  Download,
  CheckCircle2,
  X,
  Share2,
  ExternalLink,
  Laptop,
  Copy,
  Check,
  Zap,
  Bell,
  WifiOff,
  Maximize2,
  Sparkles,
  Command,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AppInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

export const AppInstallModal: React.FC<AppInstallModalProps> = ({
  isOpen,
  onClose,
  darkMode = false,
}) => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isDesktop,
    platformName,
    isInIframe,
    install,
  } = usePWAInstall();

  const [activeTab, setActiveTab] = useState<'desktop' | 'mobile'>(
    isDesktop ? 'desktop' : 'mobile'
  );
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleDirectInstall = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden my-auto transition-all ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-linear-to-r from-orange-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">
                  Install Instamart OpsHub App
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-600 dark:text-orange-400">
                  PWA Software
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Computer Desktop App (Windows/Mac) & Mobile App (Android/iOS)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status / Direct Install Banner */}
        <div className="p-4 sm:p-6 space-y-5 text-xs">
          {isInstalled ? (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <div className="font-bold text-sm">App Already Installed!</div>
                <div className="text-xs opacity-90">
                  You are running Instamart OpsHub as an installed standalone application on {platformName}.
                </div>
              </div>
            </div>
          ) : isInstallable ? (
            <div className="p-4 rounded-xl border border-emerald-500/40 bg-linear-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <div className="font-extrabold text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>1-Click Direct Installation Available</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                  Your browser supports direct installation as a native desktop or mobile software.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDirectInstall}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all shrink-0 active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Install Software Now</span>
              </button>
            </div>
          ) : isInIframe ? (
            <div className="p-3.5 rounded-xl border border-blue-500/40 bg-blue-500/10 text-blue-900 dark:text-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold">Running inside AI Studio Preview Frame</div>
                <div className="opacity-90">
                  For browser address bar installation on Chrome/Edge or Mobile Safari, open in a full window tab.
                </div>
              </div>
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-1.5 shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in New Tab</span>
              </a>
            </div>
          ) : null}

          {/* Key Advantages Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-800/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <Maximize2 className="w-4 h-4 text-orange-500 mb-1.5" />
              <div className="font-bold text-[11px]">Full Screen Mode</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Zero browser URL bars</div>
            </div>
            <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-800/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <Zap className="w-4 h-4 text-amber-500 mb-1.5" />
              <div className="font-bold text-[11px]">Instant Loading</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Pre-cached Service Worker</div>
            </div>
            <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-800/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <Bell className="w-4 h-4 text-red-500 mb-1.5" />
              <div className="font-bold text-[11px]">Date Expiry Alerts</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Instant appointment chimes</div>
            </div>
            <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-800/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <WifiOff className="w-4 h-4 text-blue-500 mb-1.5" />
              <div className="font-bold text-[11px]">Offline Readiness</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Local asset caching</div>
            </div>
          </div>

          {/* Platform Tabs: Computer App vs Mobile App */}
          <div>
            <div className={`flex rounded-xl p-1 border mb-4 ${darkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-100'}`}>
              <button
                type="button"
                onClick={() => setActiveTab('desktop')}
                className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'desktop'
                    ? darkMode
                      ? 'bg-slate-800 text-orange-400 shadow-xs'
                      : 'bg-white text-orange-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>Computer App (Windows / Mac / PC)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('mobile')}
                className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'mobile'
                    ? darkMode
                      ? 'bg-slate-800 text-orange-400 shadow-xs'
                      : 'bg-white text-orange-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Mobile App (Android / iPhone)</span>
              </button>
            </div>

            {/* Tab 1: Computer Desktop App */}
            {activeTab === 'desktop' && (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2 font-bold text-sm text-orange-600 dark:text-orange-400 mb-2">
                    <Laptop className="w-4 h-4" />
                    <span>How to Install on Computer (Windows 10/11 & macOS)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                    <li>
                      Open this application in <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, or <strong>Brave</strong>.
                    </li>
                    <li>
                      Look at the right side of the top browser URL address bar: you will see an <strong>Install icon</strong> (an icon shaped like a screen with a down-arrow).
                    </li>
                    <li>
                      Click <strong>"Install Instamart OpsHub"</strong> or select <strong>Menu (⋮) → Cast, save and share → Install page as app</strong>.
                    </li>
                    <li>
                      Instamart OpsHub will open in its own separate, borderless desktop window and place an icon on your <strong>Desktop & Taskbar / Mac Dock</strong>.
                    </li>
                  </ol>
                </div>

                <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${darkMode ? 'bg-slate-800/20 border-slate-800' : 'bg-orange-50/50 border-orange-200/50'}`}>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs">
                    <Command className="w-4 h-4 text-orange-500" />
                    <span>Quick Computer Keyboard Shortcuts:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Ctrl+K / ⌘K</span> (Search), <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Esc</span> (Close)
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied URL!' : 'Copy App Link'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Mobile App */}
            {activeTab === 'mobile' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Android Card */}
                  <div className={`p-4 rounded-xl border space-y-2 ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                      <Smartphone className="w-4 h-4" />
                      <span>Android (Chrome Browser)</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-700 dark:text-slate-300 text-xs">
                      <li>Open the link in <strong>Chrome</strong> on Android.</li>
                      <li>Tap the <strong>three dots (⋮)</strong> menu in the top right corner.</li>
                      <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                      <li>The app icon will appear on your Android home screen and app drawer.</li>
                    </ol>
                  </div>

                  {/* iOS Card */}
                  <div className={`p-4 rounded-xl border space-y-2 ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
                      <Share2 className="w-4 h-4" />
                      <span>iPhone & iPad (Safari)</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-700 dark:text-slate-300 text-xs">
                      <li>Open the link in <strong>Apple Safari</strong>.</li>
                      <li>Tap the <strong>Share</strong> button (box with up-arrow at the bottom).</li>
                      <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                      <li>Tap <strong>"Add"</strong> in top right. Launches like a native iOS app!</li>
                    </ol>
                  </div>
                </div>

                {/* Open on Phone helper */}
                <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${darkMode ? 'bg-slate-800/20 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      Using a Computer right now?
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs">
                      Copy the URL to send via WhatsApp / Email, or open on your mobile browser.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer text-xs shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied URL!' : 'Copy Mobile Link'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-semibold hover:underline text-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in Full Browser Tab</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
