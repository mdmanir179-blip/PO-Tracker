import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { PurchaseOrder } from '../types';

interface GrnUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrder | null;
  mode: 'INWARD_TO_GRN' | 'UPDATE_GRN_DN';
  onConfirm: (data: {
    grnNumber: string;
    hasDn: boolean;
    grnDnSummary: string;
    status: string;
  }) => Promise<void>;
  onOpenDnTrackerWithPo: (po: PurchaseOrder) => void;
  darkMode: boolean;
}

export const GrnUpdateModal: React.FC<GrnUpdateModalProps> = ({
  isOpen,
  onClose,
  po,
  mode,
  onConfirm,
  onOpenDnTrackerWithPo,
  darkMode,
}) => {
  const [grnNumber, setGrnNumber] = useState('');
  const [hasDn, setHasDn] = useState(false);
  const [grnDnSummary, setGrnDnSummary] = useState('');
  const [status, setStatus] = useState('GRN Completed');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (po) {
      setGrnNumber(po.grnNumber || `GRN-${po.poNumber.replace(/[^0-9A-Z]/gi, '').slice(-6)}`);
      setHasDn(po.hasDn || false);
      setGrnDnSummary(po.grnDnSummary || '');
      setStatus(po.workflowStage === 'GRN' ? po.status : 'GRN Completed');
    }
    setError(null);
  }, [po, isOpen]);

  if (!isOpen || !po) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grnNumber.trim()) {
      setError('GRN Number is required.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onConfirm({
        grnNumber: grnNumber.trim(),
        hasDn,
        grnDnSummary: grnDnSummary.trim(),
        status,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update GRN status.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = `w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 ${
    darkMode
      ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500'
      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className={`w-full max-w-lg rounded-xl border overflow-hidden ${
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
          <div>
            <h3 className="text-base font-bold">
              {mode === 'INWARD_TO_GRN'
                ? `Inward Success → Shift to GRN (${po.poNumber})`
                : `Update GRN & Discrepancy Note (${po.poNumber})`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Warehouse: {po.warehouseName} · Qty: {po.totalQty}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1">GRN Number *</label>
            <input
              type="text"
              required
              value={grnNumber}
              onChange={(e) => setGrnNumber(e.target.value)}
              placeholder="e.g. GRN-IM-90214"
              className={`${inputClass} font-mono`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">GRN Operational Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={inputClass}
            >
              <option value="GRN Completed">GRN Completed</option>
              <option value="GRN Partial - DN Raised">GRN Partial - DN Raised</option>
              <option value="GRN Under Reconciliation">GRN Under Reconciliation</option>
            </select>
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={hasDn}
                onChange={(e) => setHasDn(e.target.checked)}
                className="rounded border-slate-400 text-orange-600 focus:ring-orange-500"
              />
              <span>Does this GRN have a Discrepancy Note (DN)?</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              GRN Discrepancy Note (DN) Remarks / Summary
            </label>
            <textarea
              rows={3}
              value={grnDnSummary}
              onChange={(e) => setGrnDnSummary(e.target.value)}
              placeholder="If any short/damaged qty or DN exists in GRN, enter details here..."
              className={inputClass}
            />
          </div>

          {hasDn && (
            <div
              className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                darkMode
                  ? 'border-orange-500/30 bg-orange-500/10 text-orange-300'
                  : 'border-orange-200 bg-orange-50 text-orange-900'
              }`}
            >
              <span className="text-xs">
                Need to attach the official PDF/Spreadsheet & LR No in Instamart DN Tracker?
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDnTrackerWithPo(po);
                }}
                className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                + Log Full DN Report
              </button>
            </div>
          )}

          <div
            className={`flex items-center justify-end gap-3 pt-4 border-t ${
              darkMode ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-xs font-semibold border ${
                darkMode
                  ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSaving
                  ? 'Updating GRN...'
                  : mode === 'INWARD_TO_GRN'
                  ? 'Confirm Inward & Move to GRN'
                  : 'Save GRN & DN Update'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
