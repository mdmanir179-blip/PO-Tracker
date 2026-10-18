import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle2, Clock, Calendar, Truck, RotateCcw, ShieldAlert, ArrowRight } from 'lucide-react';
import { PurchaseOrder } from '../types';

export interface LogisticsAttemptSubmitData {
  logisticsStatus: string;
  attemptFailed: boolean;
  attemptFailReason: string;
  attemptFailDate: string;
  attemptCount: number;
  attemptFailRemarks: string;
  rescheduledApptDate: string;
  status: string;
}

interface LogisticsAttemptModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrder | null;
  onConfirm: (data: LogisticsAttemptSubmitData) => Promise<void>;
  darkMode: boolean;
}

const COMMON_FAIL_REASONS = [
  'Warehouse Gate Closed / Entry Denied',
  'Warehouse Slot Full / Hub Refused Inward',
  'Driver Arrived Late / Missed Slot Window',
  'Documentation / ASN / PUC Mismatch',
  'Vehicle Breakdown / Transshipment Delay',
  'Packaging Condition / Outer Box Seal Rejection',
  'Appointment Window Not Assigned / WFA Expired',
  'Other Logistics Delay',
];

export const LogisticsAttemptModal: React.FC<LogisticsAttemptModalProps> = ({
  isOpen,
  onClose,
  po,
  onConfirm,
  darkMode,
}) => {
  const [logisticsStatus, setLogisticsStatus] = useState<'ATTEMPT_FAILED' | 'APPOINTMENT_MISSED' | 'RESCHEDULED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'PENDING_PICKUP'>('ATTEMPT_FAILED');
  const [attemptFailReason, setAttemptFailReason] = useState(COMMON_FAIL_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [attemptFailDate, setAttemptFailDate] = useState('');
  const [attemptCount, setAttemptCount] = useState<number>(1);
  const [rescheduledApptDate, setRescheduledApptDate] = useState('');
  const [attemptFailRemarks, setAttemptFailRemarks] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (po) {
      const isFailed = Boolean(po.attemptFailed || po.logisticsStatus === 'ATTEMPT_FAILED' || po.logisticsStatus === 'APPOINTMENT_MISSED');
      const initialStatus = po.logisticsStatus
        ? (po.logisticsStatus as any)
        : isFailed
        ? 'ATTEMPT_FAILED'
        : 'ATTEMPT_FAILED';

      setLogisticsStatus(initialStatus);
      const existingReason = po.attemptFailReason || COMMON_FAIL_REASONS[0];
      if (COMMON_FAIL_REASONS.includes(existingReason)) {
        setAttemptFailReason(existingReason);
        setCustomReason('');
      } else {
        setAttemptFailReason('Other Logistics Delay');
        setCustomReason(existingReason);
      }

      setAttemptFailDate(po.attemptFailDate || po.appointmentDate || new Date().toISOString().slice(0, 10));
      setAttemptCount(po.attemptCount ? po.attemptCount : (isFailed ? 1 : 1));
      setRescheduledApptDate(po.rescheduledApptDate || '');
      setAttemptFailRemarks(po.attemptFailRemarks || '');
    }
    setError(null);
  }, [po, isOpen]);

  if (!isOpen || !po) return null;

  const isFailOrMiss = logisticsStatus === 'ATTEMPT_FAILED' || logisticsStatus === 'APPOINTMENT_MISSED';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const finalReason =
      attemptFailReason === 'Other Logistics Delay' && customReason.trim()
        ? customReason.trim()
        : attemptFailReason;

    // Derived operational status
    let updatedStatus = po.status;
    if (logisticsStatus === 'ATTEMPT_FAILED') {
      updatedStatus = `Attempt ${attemptCount} Failed - ${finalReason.slice(0, 25)}`;
    } else if (logisticsStatus === 'APPOINTMENT_MISSED') {
      updatedStatus = `Appointment Missed (${attemptFailDate || 'Slot Expired'})`;
    } else if (logisticsStatus === 'RESCHEDULED') {
      updatedStatus = `Re-Attempt Scheduled: ${rescheduledApptDate || 'Pending Date'}`;
    } else if (logisticsStatus === 'OUT_FOR_DELIVERY') {
      updatedStatus = 'Out for Delivery / At Hub Gate';
    } else if (logisticsStatus === 'IN_TRANSIT') {
      updatedStatus = 'In Transit';
    }

    try {
      await onConfirm({
        logisticsStatus,
        attemptFailed: isFailOrMiss,
        attemptFailReason: isFailOrMiss ? finalReason.slice(0, 200) : '',
        attemptFailDate: isFailOrMiss ? attemptFailDate.slice(0, 30) : '',
        attemptCount: isFailOrMiss ? Math.max(1, attemptCount) : 0,
        attemptFailRemarks: attemptFailRemarks.trim().slice(0, 500),
        rescheduledApptDate: rescheduledApptDate.slice(0, 30),
        status: updatedStatus.slice(0, 60),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update logistics status.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearFailure = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onConfirm({
        logisticsStatus: po.workflowStage === 'IN_TRANSIT' ? 'IN_TRANSIT' : 'PICKUP_SCHEDULED',
        attemptFailed: false,
        attemptFailReason: '',
        attemptFailDate: '',
        attemptCount: 0,
        attemptFailRemarks: '',
        rescheduledApptDate: '',
        status: po.workflowStage === 'IN_TRANSIT' ? 'In Transit' : 'Scheduled',
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to clear attempt failure.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div
        className={`w-full max-w-xl rounded-2xl border shadow-2xl my-6 overflow-hidden ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            darkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Truck className="w-5 h-5 text-orange-500" />
              <span>Update Logistics Status &amp; Delivery Attempt</span>
              <span className="px-2 py-0.5 rounded font-mono text-xs bg-orange-500/15 text-orange-600 dark:text-orange-400">
                {po.poNumber}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Warehouse: <span className="font-semibold">{po.warehouseName}</span> · Appointment:{' '}
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {po.appointmentDate || 'Not set'}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Action Radio Buttons for Status */}
          <div>
            <label className="block text-xs font-bold mb-2 text-slate-700 dark:text-slate-300">
              Select Logistics Operational State *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  logisticsStatus === 'ATTEMPT_FAILED'
                    ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="logisticsStatus"
                  value="ATTEMPT_FAILED"
                  checked={logisticsStatus === 'ATTEMPT_FAILED'}
                  onChange={() => setLogisticsStatus('ATTEMPT_FAILED')}
                  className="mt-0.5 text-red-600 focus:ring-red-500"
                />
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    <span>Delivery Attempt Failed</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                    Vehicle reached hub but entry was refused, slot full, or gate closed.
                  </p>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  logisticsStatus === 'APPOINTMENT_MISSED'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="logisticsStatus"
                  value="APPOINTMENT_MISSED"
                  checked={logisticsStatus === 'APPOINTMENT_MISSED'}
                  onChange={() => setLogisticsStatus('APPOINTMENT_MISSED')}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Appointment Date Missed</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                    Driver or transporter missed the allocated appointment slot window.
                  </p>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  logisticsStatus === 'RESCHEDULED'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="logisticsStatus"
                  value="RESCHEDULED"
                  checked={logisticsStatus === 'RESCHEDULED'}
                  onChange={() => setLogisticsStatus('RESCHEDULED')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <span>Re-Attempt Scheduled</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                    A new delivery slot or appointment date has been scheduled.
                  </p>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  logisticsStatus === 'IN_TRANSIT'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="logisticsStatus"
                  value="IN_TRANSIT"
                  checked={logisticsStatus === 'IN_TRANSIT'}
                  onChange={() => setLogisticsStatus('IN_TRANSIT')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>In Transit (Normal Dispatch)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                    Active transit progressing normally towards destination hub.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Conditional Detail Inputs for Attempt Fail / Appointment Missed */}
          {isFailOrMiss && (
            <div
              className={`p-4 rounded-xl border space-y-3.5 ${
                logisticsStatus === 'ATTEMPT_FAILED'
                  ? darkMode
                    ? 'bg-red-950/20 border-red-500/40'
                    : 'bg-red-50/70 border-red-300'
                  : darkMode
                  ? 'bg-amber-950/20 border-amber-500/40'
                  : 'bg-amber-50/70 border-amber-300'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>
                  {logisticsStatus === 'ATTEMPT_FAILED'
                    ? 'Delivery Failure Record Details'
                    : 'Missed Appointment Record Details'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1">
                    Primary Reason *
                  </label>
                  <select
                    value={attemptFailReason}
                    onChange={(e) => setAttemptFailReason(e.target.value)}
                    className={inputClass}
                  >
                    {COMMON_FAIL_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold mb-1">
                    Failure / Miss Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={attemptFailDate}
                    onChange={(e) => setAttemptFailDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {attemptFailReason === 'Other Logistics Delay' && (
                <div>
                  <label className="block text-[11px] font-semibold mb-1">
                    Describe Custom Reason *
                  </label>
                  <input
                    type="text"
                    required
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter specific gate rejection or delivery issue..."
                    className={inputClass}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1">
                    Attempt Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={attemptCount}
                    onChange={(e) => setAttemptCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className={`${inputClass} font-mono font-bold`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold mb-1">
                    Next Rescheduled Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={rescheduledApptDate}
                    onChange={(e) => setRescheduledApptDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">
                  Transporter / Driver Remarks / Resolution Note
                </label>
                <textarea
                  rows={2}
                  value={attemptFailRemarks}
                  onChange={(e) => setAttemptFailRemarks(e.target.value)}
                  placeholder="e.g. Driver arrived at 14:15, gate entry was closed. Contacted hub POC, advised to re-attempt tomorrow 10:00 AM."
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Conditional Input for Rescheduled */}
          {logisticsStatus === 'RESCHEDULED' && (
            <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Rescheduled Delivery / Appointment Details</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1">
                    New Rescheduled Appointment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={rescheduledApptDate}
                    onChange={(e) => setRescheduledApptDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1">
                    Attempt Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={attemptCount}
                    onChange={(e) => setAttemptCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className={`${inputClass} font-mono font-bold`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Live Preview Card */}
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Row Badge Preview
              </span>
              <div className="mt-1 flex items-center gap-2">
                {isFailOrMiss ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/40">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    <span>
                      {logisticsStatus === 'ATTEMPT_FAILED'
                        ? `ATTEMPT ${attemptCount} FAILED`
                        : 'APPOINTMENT MISSED'}
                    </span>
                  </span>
                ) : logisticsStatus === 'RESCHEDULED' ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                    <Calendar className="w-3 h-3 text-blue-500" />
                    <span>Re-Attempt: {rescheduledApptDate || 'Scheduled'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <Truck className="w-3 h-3 text-emerald-500" />
                    <span>In Transit (Normal)</span>
                  </span>
                )}
                {isFailOrMiss && (
                  <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
                    {attemptFailReason}
                  </span>
                )}
              </div>
            </div>

            {po.attemptFailed && (
              <button
                type="button"
                onClick={handleClearFailure}
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer flex items-center gap-1"
                title="Reset failure and restore normal in transit state"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear Failure</span>
              </button>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div
            className={`flex items-center justify-end gap-3 pt-4 border-t ${
              darkMode ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
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
              className={`px-5 py-2.5 rounded-lg text-xs font-bold text-white flex items-center gap-2 cursor-pointer shadow-md ${
                isFailOrMiss
                  ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSaving
                  ? 'Updating Status...'
                  : isFailOrMiss
                  ? 'Save Failure & Mark Row'
                  : 'Save Logistics Status'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
