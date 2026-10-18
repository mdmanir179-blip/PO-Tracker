import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, ArrowRight, ShieldAlert, FileText, Check } from 'lucide-react';
import { PurchaseOrder } from '../types';
import { formatINR } from '../utils/paymentUtils';

export interface GrnUpdateSubmitData {
  grnNumber: string;
  grnDate: string;
  hasDn: boolean;
  dnQty: number;
  dnAmount: number;
  acceptedQty: number;
  originalAmount: number;
  netPayableAmount: number;
  grnDnSummary: string;
  status: string;
  dnReason?: string;
  autoCreateDnRecord?: boolean;
}

interface GrnUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrder | null;
  mode: 'INWARD_TO_GRN' | 'UPDATE_GRN_DN';
  onConfirm: (data: GrnUpdateSubmitData) => Promise<void>;
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
  const [grnDate, setGrnDate] = useState('');
  const [hasDn, setHasDn] = useState(false);
  const [dnReason, setDnReason] = useState('Transit Damage / Broken Packaging');
  const [grnDnSummary, setGrnDnSummary] = useState('');
  const [status, setStatus] = useState('GRN Completed');
  const [autoCreateDnRecord, setAutoCreateDnRecord] = useState(true);

  // Financial & Quantity Decrement State
  const [originalAmount, setOriginalAmount] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [dnQty, setDnQty] = useState<number>(0);
  const [dnAmount, setDnAmount] = useState<number>(0);
  const [isManualDnAmount, setIsManualDnAmount] = useState(false);

  // Per-line item DN state if lineItems exist
  const [itemDnQuantities, setItemDnQuantities] = useState<Record<number, number>>({});

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (po) {
      setGrnNumber(po.grnNumber || `GRN-${po.poNumber.replace(/[^0-9A-Z]/gi, '').slice(-6)}`);
      setGrnDate(po.grnDate || po.appointmentDate || po.shipDate || new Date().toISOString().slice(0, 10));
      const initialHasDn = po.hasDn || false;
      setHasDn(initialHasDn);
      setGrnDnSummary(po.grnDnSummary || '');
      setStatus(
        po.workflowStage === 'GRN'
          ? po.status
          : initialHasDn
          ? 'GRN Partial - DN Raised'
          : 'GRN Completed'
      );

      const totalQty = po.totalQty > 0 ? po.totalQty : 1;
      const initialOriginal =
        typeof po.originalAmount === 'number' && po.originalAmount > 0
          ? po.originalAmount
          : typeof po.totalAmount === 'number' && po.totalAmount > 0
          ? (po.hasDn && typeof po.dnAmount === 'number' && po.dnAmount > 0 ? po.totalAmount + po.dnAmount : po.totalAmount)
          : totalQty * 320;

      setOriginalAmount(initialOriginal);
      const computedUnitPrice = Math.round((initialOriginal / totalQty) * 100) / 100;
      setUnitPrice(computedUnitPrice);

      const initialDnQty = typeof po.dnQty === 'number' ? po.dnQty : 0;
      setDnQty(initialDnQty);

      const initialDeduction =
        typeof po.dnAmount === 'number' && po.dnAmount > 0
          ? po.dnAmount
          : Math.round(initialDnQty * computedUnitPrice);
      setDnAmount(initialDeduction);
      setIsManualDnAmount(false);

      // Line items breakdown
      const initialLineDn: Record<number, number> = {};
      if (Array.isArray(po.lineItems) && po.lineItems.length > 0) {
        po.lineItems.forEach((_, idx) => {
          initialLineDn[idx] = 0;
        });
      }
      setItemDnQuantities(initialLineDn);
    }
    setError(null);
  }, [po, isOpen]);

  if (!isOpen || !po) return null;

  const totalQty = po.totalQty > 0 ? po.totalQty : 1;
  const hasLineItems = Array.isArray(po.lineItems) && po.lineItems.length > 0;

  // Compute accepted qty & net payable
  const effectiveDnQty = hasDn ? Math.min(totalQty, Math.max(0, dnQty)) : 0;
  const acceptedQty = Math.max(0, totalQty - effectiveDnQty);

  const effectiveDnAmount = hasDn ? Math.min(originalAmount, Math.max(0, dnAmount)) : 0;
  const netPayableAmount = Math.max(0, originalAmount - effectiveDnAmount);

  // Handle total DN Qty change
  const handleDnQtyChange = (val: number) => {
    const cleanQty = Math.min(totalQty, Math.max(0, val));
    setDnQty(cleanQty);
    if (!isManualDnAmount) {
      setDnAmount(Math.round(cleanQty * unitPrice));
    }
  };

  // Handle per-line item change
  const handleLineItemDnChange = (idx: number, lineMaxQty: number, val: number) => {
    const cleanVal = Math.min(lineMaxQty, Math.max(0, val));
    const nextMap = { ...itemDnQuantities, [idx]: cleanVal };
    setItemDnQuantities(nextMap);

    const sum = Object.values(nextMap).reduce((a, b) => a + b, 0);
    setDnQty(sum);
    if (!isManualDnAmount) {
      setDnAmount(Math.round(sum * unitPrice));
    }
  };

  const handleToggleHasDn = (checked: boolean) => {
    setHasDn(checked);
    if (checked) {
      if (status === 'GRN Completed') {
        setStatus('GRN Partial - DN Raised');
      }
      if (dnQty === 0) {
        const defaultShortage = 1;
        setDnQty(defaultShortage);
        setDnAmount(Math.round(defaultShortage * unitPrice));
      }
    } else {
      setStatus('GRN Completed');
      setDnQty(0);
      setDnAmount(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grnNumber.trim()) {
      setError('GRN Number is required.');
      return;
    }
    if (hasDn && effectiveDnQty <= 0) {
      setError('Please specify the Discrepancy Note (DN) quantity greater than 0.');
      return;
    }

    setIsSaving(true);
    setError(null);

    // Auto-draft remarks if blank
    let finalSummary = grnDnSummary.trim();
    if (hasDn && !finalSummary) {
      finalSummary = `DN Discrepancy: ${effectiveDnQty} pcs reduced (-${formatINR(
        effectiveDnAmount
      )}) [Reason: ${dnReason}]. Accepted GRN Inward: ${acceptedQty} pcs (${formatINR(
        netPayableAmount
      )}). Synced to DN Tracker.`;
    }

    try {
      await onConfirm({
        grnNumber: grnNumber.trim(),
        grnDate: grnDate.trim() || new Date().toISOString().slice(0, 10),
        hasDn,
        dnQty: effectiveDnQty,
        dnAmount: effectiveDnAmount,
        acceptedQty,
        originalAmount,
        netPayableAmount,
        grnDnSummary: finalSummary,
        status,
        dnReason,
        autoCreateDnRecord,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl my-6 overflow-hidden ${
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
              <span>
                {mode === 'INWARD_TO_GRN'
                  ? `Inward Success → Shift to GRN`
                  : `Update GRN & Discrepancy Note (DN)`}
              </span>
              <span className="px-2 py-0.5 rounded font-mono text-xs bg-orange-500/15 text-orange-600 dark:text-orange-400">
                {po.poNumber}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Warehouse: <span className="font-semibold">{po.warehouseName}</span> · Shipped Quantity:{' '}
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {po.totalQty} units
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* GRN Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">GRN Number *</label>
              <input
                type="text"
                required
                value={grnNumber}
                onChange={(e) => setGrnNumber(e.target.value)}
                placeholder="e.g. GRN-IM-90214"
                className={`${inputClass} font-mono font-bold text-emerald-600 dark:text-emerald-400`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                GRN Inward Date * <span className="text-[11px] font-normal text-slate-400">(Payment Maturity Base)</span>
              </label>
              <input
                type="date"
                required
                value={grnDate}
                onChange={(e) => setGrnDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">GRN Operational Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={inputClass}
            >
              <option value="GRN Completed">GRN Completed (Clean Inward)</option>
              <option value="GRN Partial - DN Raised">GRN Partial - DN Raised (Discrepancy / Deducted)</option>
              <option value="GRN Under Reconciliation">GRN Under Reconciliation</option>
            </select>
          </div>

          {/* Discrepancy Note (DN) Section */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              hasDn
                ? darkMode
                  ? 'bg-amber-950/20 border-amber-500/40'
                  : 'bg-amber-50/70 border-amber-300'
                : darkMode
                ? 'bg-slate-950/50 border-slate-800'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 text-xs font-bold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasDn}
                  onChange={(e) => handleToggleHasDn(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-400 text-orange-600 focus:ring-orange-500 cursor-pointer"
                />
                <span className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                  <ShieldAlert className={`w-4 h-4 ${hasDn ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span>Does any product have a Discrepancy Note (DN) / Shortage / Damage?</span>
                </span>
              </label>
              {hasDn && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  DN Deduct Mode Active
                </span>
              )}
            </div>

            {hasDn && (
              <div className="mt-4 pt-4 border-t border-amber-200/50 dark:border-amber-900/50 space-y-4">
                {/* Reason Selection */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Discrepancy / Rejection Reason *
                  </label>
                  <select
                    value={dnReason}
                    onChange={(e) => setDnReason(e.target.value)}
                    className={inputClass}
                  >
                    <option value="Transit Damage / Broken Packaging">Transit Damage / Broken Packaging</option>
                    <option value="Physical Shortage / Item Missing at Inward">Physical Shortage / Item Missing at Inward</option>
                    <option value="Expiry / Near Expiry Date Rejection">Expiry / Near Expiry Date Rejection</option>
                    <option value="Quality Defect / Seal Tampered">Quality Defect / Seal Tampered</option>
                    <option value="Wrong SKU / Barcode Mismatch">Wrong SKU / Barcode Mismatch</option>
                    <option value="Other Warehouse Discrepancy">Other Warehouse Discrepancy</option>
                  </select>
                </div>

                {/* Line Items or Product Discrepancy Quantity */}
                {hasLineItems ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Specify DN Quantity by Product Line Items:
                    </label>
                    <div className="border rounded-lg overflow-hidden dark:border-slate-800">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          <tr>
                            <th className="py-2 px-3">Product SKU & Name</th>
                            <th className="py-2 px-2 text-right">Shipped Qty</th>
                            <th className="py-2 px-2 text-right">DN Discrepancy Qty</th>
                            <th className="py-2 px-3 text-right">Accepted GRN Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {po.lineItems!.map((item, idx) => {
                            const lineDn = itemDnQuantities[idx] || 0;
                            const lineAccepted = Math.max(0, item.qty - lineDn);
                            return (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="py-2 px-3">
                                  <div className="font-mono text-[10px] text-orange-600 dark:text-orange-400 font-semibold">
                                    {item.itemId || 'N/A'}
                                  </div>
                                  <div className="font-medium text-xs truncate max-w-[200px]">
                                    {item.itemName}
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-right font-mono font-bold">
                                  {item.qty}
                                </td>
                                <td className="py-2 px-2 text-right">
                                  <input
                                    type="number"
                                    min="0"
                                    max={item.qty}
                                    value={lineDn}
                                    onChange={(e) =>
                                      handleLineItemDnChange(idx, item.qty, parseInt(e.target.value) || 0)
                                    }
                                    className="w-20 px-2 py-1 rounded border text-right font-mono text-xs font-bold text-red-600 dark:text-red-400 border-red-300 dark:border-red-900 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-red-500"
                                  />
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  {lineAccepted}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/60 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Product Item</span>
                      <div className="font-mono font-semibold text-xs text-orange-600 dark:text-orange-400 truncate">
                        {po.itemId}
                      </div>
                      <div className="font-medium text-xs truncate">{po.itemName}</div>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Total Shipped Qty</span>
                      <div className="font-mono font-bold text-sm text-slate-800 dark:text-slate-100">
                        {po.totalQty} units
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-red-600 dark:text-red-400 block mb-0.5">
                        DN Discrepancy Qty *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={po.totalQty}
                        value={dnQty}
                        onChange={(e) => handleDnQtyChange(parseInt(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 rounded-lg border font-mono font-bold text-xs text-red-600 dark:text-red-400 border-red-300 dark:border-red-900 bg-white dark:bg-slate-900 focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                  </div>
                )}

                {/* Price Decrement & Net Payment Adjustment */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                      Original PO Price (₹)
                    </label>
                    <input
                      type="number"
                      value={originalAmount}
                      onChange={(e) => {
                        const val = Math.max(0, parseFloat(e.target.value) || 0);
                        setOriginalAmount(val);
                        const newUnit = Math.round((val / totalQty) * 100) / 100;
                        setUnitPrice(newUnit);
                        if (!isManualDnAmount) {
                          setDnAmount(Math.round(effectiveDnQty * newUnit));
                        }
                      }}
                      className={`${inputClass} font-mono font-semibold`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-[11px] font-bold text-red-600 dark:text-red-400">
                        DN Price Decreased (-₹)
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        (@{formatINR(unitPrice)}/pc)
                      </span>
                    </div>
                    <input
                      type="number"
                      value={dnAmount}
                      onChange={(e) => {
                        setIsManualDnAmount(true);
                        setDnAmount(Math.max(0, parseFloat(e.target.value) || 0));
                      }}
                      className={`${inputClass} font-mono font-bold text-red-600 dark:text-red-400 border-red-300 dark:border-red-800`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
                      Net GRN &amp; Payable (₹)
                    </label>
                    <div className="h-9 px-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-center font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      {formatINR(netPayableAmount)}
                    </div>
                  </div>
                </div>

                {/* 3-Step Flow Reconciliation Preview Card */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs ${
                    darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-amber-200'
                  }`}
                >
                  <div className="flex-1 space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      1. Shipped / Invoiced
                    </span>
                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {totalQty} pcs · {formatINR(originalAmount)}
                    </div>
                  </div>

                  <div className="hidden md:flex items-center text-slate-400">
                    <ArrowRight className="w-4 h-4" />
                  </div>

                  <div className="flex-1 space-y-0.5 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block">
                      2. DN Decreased (Deducted)
                    </span>
                    <div className="font-mono font-bold text-red-600 dark:text-red-400">
                      -{effectiveDnQty} pcs · -{formatINR(effectiveDnAmount)}
                    </div>
                  </div>

                  <div className="hidden md:flex items-center text-slate-400">
                    <ArrowRight className="w-4 h-4" />
                  </div>

                  <div className="flex-1 space-y-0.5 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                      3. Accepted GRN &amp; Payment
                    </span>
                    <div className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                      {acceptedQty} pcs · {formatINR(netPayableAmount)}
                    </div>
                  </div>
                </div>

                {/* Sync to DN Tracker Toggle */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-orange-900 dark:text-orange-300">
                    <input
                      type="checkbox"
                      checked={autoCreateDnRecord}
                      onChange={(e) => setAutoCreateDnRecord(e.target.checked)}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span>Automatically record this product in Instamart DN Tracker with GRN Number</span>
                  </label>
                  <span className="text-[10px] text-orange-500 font-mono font-semibold">
                    DN-{grnNumber || po.poNumber}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold mb-1">
              GRN Discrepancy &amp; Inward Remarks
            </label>
            <textarea
              rows={2}
              value={grnDnSummary}
              onChange={(e) => setGrnDnSummary(e.target.value)}
              placeholder={
                hasDn
                  ? `e.g. ${effectiveDnQty} pcs damaged in transit. Decreased ${formatINR(
                      effectiveDnAmount
                    )} from payable amount. Accepted ${acceptedQty} pcs.`
                  : 'Enter GRN Inward verification remarks or warehouse condition...'
              }
              className={inputClass}
            />
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
              className="px-5 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-900/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSaving
                  ? 'Processing GRN & DN Sync...'
                  : mode === 'INWARD_TO_GRN'
                  ? 'Confirm Inward & Shift to GRN'
                  : 'Save GRN & DN Updates'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
