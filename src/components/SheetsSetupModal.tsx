import React, { useState } from 'react';
import { X, FileSpreadsheet, ExternalLink, RefreshCw, Plus, CheckCircle2, AlertCircle } from 'lucide-react';

interface SheetsSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSpreadsheetId: string;
  hasGoogleToken: boolean;
  onReconnectGoogle: () => Promise<void>;
  onCreateNewSheet: (title: string) => Promise<void>;
  onLinkExistingSheet: (sheetIdOrUrl: string) => Promise<void>;
  onManualSyncNow: () => Promise<void>;
  darkMode: boolean;
}

export const SheetsSetupModal: React.FC<SheetsSetupModalProps> = ({
  isOpen,
  onClose,
  currentSpreadsheetId,
  hasGoogleToken,
  onReconnectGoogle,
  onCreateNewSheet,
  onLinkExistingSheet,
  onManualSyncNow,
  darkMode,
}) => {
  const [sheetTitle, setSheetTitle] = useState('Instamart PO & DN Live Tracker');
  const [existingInput, setExistingInput] = useState(currentSpreadsheetId || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const extractSpreadsheetId = (raw: string): string => {
    const trimmed = raw.trim();
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : trimmed;
  };

  const handleCreate = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await onCreateNewSheet(sheetTitle.trim() || 'Instamart PO & DN Live Tracker');
      setMessage({
        type: 'success',
        text: 'Created new Google Spreadsheet with all 4 tabs (PO Entry, In Transit, GRN, Instamart DN Tracker) and synced all live records!',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to create Google Sheet.' });
    } finally {
      setBusy(false);
    }
  };

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = extractSpreadsheetId(existingInput);
    if (!cleanId) return;
    setBusy(true);
    setMessage(null);
    try {
      await onLinkExistingSheet(cleanId);
      setMessage({
        type: 'success',
        text: 'Linked Google Spreadsheet and synced all 4 tabs!',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to link Google Sheet.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSync = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await onManualSyncNow();
      setMessage({
        type: 'success',
        text: 'All 4 tabs synced to Google Sheets successfully!',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Sync failed.' });
    } finally {
      setBusy(false);
    }
  };

  const inputClass = `w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
    darkMode
      ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500'
      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className={`w-full max-w-xl rounded-xl border overflow-hidden ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            <div>
              <h3 className="text-base font-bold">Direct Google Sheets Integration</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time auto-update across PO Entry, In Transit, GRN & Instamart DN Tracker tabs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {message && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                message.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {!hasGoogleToken && (
            <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-2">
              <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                Google Sheets Access Token Required
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Authorize your Google session once so that every PO or DN entry automatically updates your Google Sheet.
              </p>
              <button
                type="button"
                onClick={onReconnectGoogle}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer"
              >
                Authorize Google Sheets Now
              </button>
            </div>
          )}

          {currentSpreadsheetId && (
            <div
              className={`p-4 rounded-lg border space-y-3 ${
                darkMode
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-emerald-200 bg-emerald-50/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Connected Live Spreadsheet
                </span>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${currentSpreadsheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Open in Google Sheets</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="text-xs font-mono break-all opacity-80">
                ID: {currentSpreadsheetId}
              </div>
              <button
                type="button"
                disabled={busy || !hasGoogleToken}
                onClick={handleSync}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
                <span>{busy ? 'Syncing All 4 Tabs...' : 'Force Sync All 4 Tabs Now'}</span>
              </button>
            </div>
          )}

          {/* Create New Auto-Configured Sheet */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="block text-xs font-semibold">
              Option 1: Create a New 4-Tab Google Spreadsheet Automatically
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sheetTitle}
                onChange={(e) => setSheetTitle(e.target.value)}
                placeholder="Spreadsheet Title"
                className={inputClass}
              />
              <button
                type="button"
                disabled={busy || !hasGoogleToken}
                onClick={handleCreate}
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create & Link Sheet</span>
              </button>
            </div>
          </div>

          {/* Link Existing Spreadsheet */}
          <form
            onSubmit={handleLink}
            className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800"
          >
            <label className="block text-xs font-semibold">
              Option 2: Link an Existing Google Sheet (Paste URL or Spreadsheet ID)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={existingInput}
                onChange={(e) => setExistingInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                className={`${inputClass} font-mono`}
              />
              <button
                type="submit"
                disabled={busy || !hasGoogleToken}
                className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                Link & Sync
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
