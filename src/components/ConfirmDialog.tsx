import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  darkMode: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm Action',
  onConfirm,
  onCancel,
  darkMode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className={`w-full max-w-md rounded-xl border overflow-hidden ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h4 className="text-sm font-bold">{title}</h4>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {description}
        </div>
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border ${
              darkMode
                ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
