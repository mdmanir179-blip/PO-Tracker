import React from 'react';
import { X, RotateCcw, Truck, Save, AlertCircle, Building2, Calendar, FileText } from 'lucide-react';
import { PurchaseOrder } from '../types';

export interface RtoFormState {
  rtoPickedStatus: 'YES' | 'NO' | 'PENDING';
  rtoTrackingId: string;
  rtoCourierPartner: string;
  rtoPickDate: string;
  rtoReceivedAtWh: 'YES' | 'NO';
  rtoReason: string;
  rtoRemarks: string;
}

interface RtoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => Promise<void>;
  po: PurchaseOrder | null;
  form: RtoFormState;
  onChange: (updates: Partial<RtoFormState>) => void;
  darkMode: boolean;
  isGrey: boolean;
}

export const COMMON_RTO_REASONS = [
  'Appointment Rejected / Gate Entry Denied',
  'Warehouse Gate Closed / Time Window Missed',
  'WFA Expired / Delivery Reschedule Limit Exceeded',
  'Damaged Goods / Packaging QC Rejected',
  'PO Expired before Vehicle Arrival',
  'Excess Qty / Item Mismatch at Inward Gate',
  'Vendor Self-Recall / Order Cancelled',
  'Darkstore Overstocked / Inward Paused',
];

export const RtoModal: React.FC<RtoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  po,
  form,
  onChange,
  darkMode,
  isGrey,
}) => {
  if (!isOpen || !po) return null;

  const inputClass = `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
    darkMode
      ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500'
      : isGrey
      ? 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
  }`;

  const labelClass = `block text-xs font-semibold mb-1 ${
    darkMode ? 'text-slate-300' : 'text-slate-700'
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden my-auto ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : isGrey
            ? 'bg-zinc-100 border-zinc-300 text-zinc-900'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-orange-600/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-600 dark:text-orange-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>RTO (Return to Origin) Details</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-300">
                  PO: {po.poNumber}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage reverse logistics, courier tracking, and return receipt at origin warehouse.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PO Quick Info Card */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="font-semibold">Warehouse:</span>
            <span className="text-slate-600 dark:text-slate-300">{po.warehouseName}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="font-semibold">Item & Qty:</span>
            <span className="text-slate-600 dark:text-slate-300 font-mono">
              {po.itemName} ({po.totalQty} units)
            </span>
          </div>
          {po.invoiceNo && (
            <div className="text-slate-500 dark:text-slate-400 font-mono">
              Inv: #{po.invoiceNo}
            </div>
          )}
        </div>

        {/* Modal Form */}
        <form onSubmit={onSave} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. RTO Picked Status */}
            <div>
              <label className={labelClass}>1. RTO Picked Status *</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['PENDING', 'YES', 'NO'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onChange({ rtoPickedStatus: status })}
                    className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      form.rtoPickedStatus === status
                        ? status === 'YES'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : status === 'PENDING'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {status === 'YES' ? '✓ Picked (YES)' : status === 'PENDING' ? '⏳ Pending' : '✕ Not Picked (NO)'}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Mark YES once the carrier or vehicle physically takes possession from the hub.
              </p>
            </div>

            {/* 2. Received Back at Origin Warehouse */}
            <div>
              <label className={labelClass}>2. Received Back at Origin WH *</label>
              <div className="grid grid-cols-2 gap-2">
                {(['NO', 'YES'] as const).map((rec) => (
                  <button
                    key={rec}
                    type="button"
                    onClick={() => onChange({ rtoReceivedAtWh: rec })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      form.rtoReceivedAtWh === rec
                        ? rec === 'YES'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {rec === 'YES' ? '📦 Yes, Inwarded at WH' : '🚚 No, Still in Transit'}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Mark YES when goods have safely returned to your vendor origin warehouse.
              </p>
            </div>

            {/* 3. RTO Courier / Transport Partner */}
            <div>
              <label className={labelClass}>3. RTO Courier / Return Partner</label>
              <input
                type="text"
                value={form.rtoCourierPartner}
                onChange={(e) => onChange({ rtoCourierPartner: e.target.value })}
                placeholder="e.g. Delhivery, Bluedart, Shadowfax, In-House Van..."
                className={inputClass}
              />
            </div>

            {/* 4. RTO Tracking / AWB ID */}
            <div>
              <label className={labelClass}>4. RTO Tracking / Reverse AWB ID</label>
              <input
                type="text"
                value={form.rtoTrackingId}
                onChange={(e) => onChange({ rtoTrackingId: e.target.value })}
                placeholder="Enter reverse tracking number or AWB..."
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* 5. RTO Pick Date */}
            <div>
              <label className={labelClass}>5. RTO Pick Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={form.rtoPickDate}
                  onChange={(e) => onChange({ rtoPickDate: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            {/* 6. RTO Reason Dropdown */}
            <div>
              <label className={labelClass}>6. Reason for RTO *</label>
              <select
                value={form.rtoReason}
                onChange={(e) => onChange({ rtoReason: e.target.value })}
                className={inputClass}
              >
                {COMMON_RTO_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
                <option value="Other / Custom Reason">Other / Custom Reason</option>
              </select>
            </div>
          </div>

          {/* Custom Reason input if "Other" is selected or user wants to customize */}
          <div>
            <label className={labelClass}>Custom Reason / Detailed Explanation</label>
            <input
              type="text"
              value={form.rtoReason}
              onChange={(e) => onChange({ rtoReason: e.target.value })}
              placeholder="Specify the exact reason for return to origin..."
              className={inputClass}
            />
          </div>

          {/* 7. Remarks & Driver/Logistics Notes */}
          <div>
            <label className={labelClass}>7. Additional Remarks & Return Vehicle Notes</label>
            <textarea
              rows={3}
              value={form.rtoRemarks}
              onChange={(e) => onChange({ rtoRemarks: e.target.value })}
              placeholder="Enter gate rejection details, contact person at darkstore, return driver phone, or damage notes..."
              className={inputClass}
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save RTO Tracking Details</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
