import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Save, AlertCircle } from 'lucide-react';
import { DnRecord, PurchaseOrder } from '../types';

export interface DnFormValues {
  dnDate: string;
  dnNumber: string;
  facilityName: string;
  parentPoDetails: string;
  dnSkuIdItemName: string;
  dnQty: number;
  whPocDetails: string;
  lrNo: string;
  reportFileName: string;
  reportFileType: string;
  reportFileSize: number;
  reportFileDataUrl: string;
}

interface DnFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: DnFormValues) => Promise<void>;
  initialDn: DnRecord | null;
  prefillFromPo: PurchaseOrder | null;
  darkMode: boolean;
}

const DEFAULT_DN: DnFormValues = {
  dnDate: new Date().toISOString().slice(0, 10),
  dnNumber: '',
  facilityName: '',
  parentPoDetails: '',
  dnSkuIdItemName: '',
  dnQty: 0,
  whPocDetails: '',
  lrNo: '',
  reportFileName: '',
  reportFileType: '',
  reportFileSize: 0,
  reportFileDataUrl: '',
};

export const DnFormModal: React.FC<DnFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDn,
  prefillFromPo,
  darkMode,
}) => {
  const [values, setValues] = useState<DnFormValues>(DEFAULT_DN);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialDn) {
      setValues({
        dnDate: initialDn.dnDate,
        dnNumber: initialDn.dnNumber,
        facilityName: initialDn.facilityName,
        parentPoDetails: initialDn.parentPoDetails,
        dnSkuIdItemName: initialDn.dnSkuIdItemName,
        dnQty: initialDn.dnQty,
        whPocDetails: initialDn.whPocDetails,
        lrNo: initialDn.lrNo,
        reportFileName: initialDn.reportFileName,
        reportFileType: initialDn.reportFileType,
        reportFileSize: initialDn.reportFileSize,
        reportFileDataUrl: initialDn.reportFileDataUrl,
      });
    } else if (prefillFromPo) {
      setValues({
        ...DEFAULT_DN,
        dnDate: new Date().toISOString().slice(0, 10),
        facilityName: prefillFromPo.warehouseName,
        parentPoDetails: `${prefillFromPo.poNumber} | Inv: ${prefillFromPo.invoiceNo || 'N/A'} | GRN: ${prefillFromPo.grnNumber || 'Pending'}`,
        dnSkuIdItemName: `${prefillFromPo.itemId} | ${prefillFromPo.itemName}`,
      });
    } else {
      setValues({
        ...DEFAULT_DN,
        dnDate: new Date().toISOString().slice(0, 10),
      });
    }
    setError(null);
  }, [initialDn, prefillFromPo, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxBytes) {
      setError('File size exceeds 10 MB limit. Please upload a PDF or spreadsheet under 10 MB.');
      return;
    }

    const validExt = /\.(pdf|xlsx|xls|csv)$/i.test(file.name);
    if (!validExt) {
      setError('Unsupported file format. Please upload 1 supported file: PDF or spreadsheet (.pdf, .xlsx, .xls, .csv).');
      return;
    }

    setError(null);

    // If file is under 500KB, store full data URL for instant download; otherwise store compact metadata summary
    if (file.size <= 500 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = typeof reader.result === 'string' ? reader.result : '';
        setValues((prev) => ({
          ...prev,
          reportFileName: file.name,
          reportFileType: file.type || 'application/octet-stream',
          reportFileSize: file.size,
          reportFileDataUrl: resultStr.slice(0, 740000),
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setValues((prev) => ({
        ...prev,
        reportFileName: file.name,
        reportFileType: file.type || 'application/octet-stream',
        reportFileSize: file.size,
        reportFileDataUrl: `LARGE_FILE_VERIFIED:${file.name}:${file.size}`,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.dnNumber.trim() || !values.facilityName.trim() || !values.parentPoDetails.trim() || !values.dnSkuIdItemName.trim()) {
      setError('DN Number, Facility Name, Parent PO Details, and DN SKU ID | Item Name are required.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(values);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save DN Tracker entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = `w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 ${
    darkMode
      ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500'
      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
  }`;

  const labelClass = `block text-xs font-semibold mb-1 ${
    darkMode ? 'text-slate-300' : 'text-slate-700'
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div
        className={`w-full max-w-2xl rounded-xl border overflow-hidden my-8 ${
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
              {initialDn
                ? `Update Instamart DN — ${initialDn.dnNumber}`
                : 'Instamart DN Tracker — Log Discrepancy Note'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Editable by Warehouse, Backoffice, and Admin teams · Supports Excel (.xlsx), PDF, and CSV export/import
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* DN Date */}
            <div>
              <label className={labelClass}>DN Date *</label>
              <input
                type="date"
                required
                value={values.dnDate}
                onChange={(e) => setValues({ ...values, dnDate: e.target.value })}
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* DN Number */}
            <div>
              <label className={labelClass}>DN Number *</label>
              <input
                type="text"
                required
                value={values.dnNumber}
                onChange={(e) => setValues({ ...values, dnNumber: e.target.value })}
                placeholder="e.g. DN-IM-2026-089"
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* Facility Name */}
            <div>
              <label className={labelClass}>Facility Name *</label>
              <input
                type="text"
                required
                value={values.facilityName}
                onChange={(e) => setValues({ ...values, facilityName: e.target.value })}
                placeholder="e.g. BLR-Whitefield-Hub1"
                className={inputClass}
              />
            </div>

            {/* Parent PO Details */}
            <div>
              <label className={labelClass}>Parent PO Details *</label>
              <input
                type="text"
                required
                value={values.parentPoDetails}
                onChange={(e) => setValues({ ...values, parentPoDetails: e.target.value })}
                placeholder="e.g. PO-IM-88412 | Inv: INV/1094"
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* DN SKU ID | Item Name */}
            <div className="sm:col-span-2">
              <label className={labelClass}>DN SKU ID | Item Name *</label>
              <input
                type="text"
                required
                value={values.dnSkuIdItemName}
                onChange={(e) => setValues({ ...values, dnSkuIdItemName: e.target.value })}
                placeholder="e.g. SKU-99201 | Organic Cold Pressed Almond Oil 500ml"
                className={inputClass}
              />
            </div>

            {/* DN QTY */}
            <div>
              <label className={labelClass}>DN QTY *</label>
              <input
                type="number"
                min={0}
                required
                value={values.dnQty}
                onChange={(e) => setValues({ ...values, dnQty: Number(e.target.value) })}
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* LR No */}
            <div>
              <label className={labelClass}>LR No *</label>
              <input
                type="text"
                required
                value={values.lrNo}
                onChange={(e) => setValues({ ...values, lrNo: e.target.value })}
                placeholder="e.g. LR-9081223"
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* WH POC Name / Contact Details */}
            <div className="sm:col-span-2">
              <label className={labelClass}>WH POC Name / Contact Details *</label>
              <input
                type="text"
                required
                value={values.whPocDetails}
                onChange={(e) => setValues({ ...values, whPocDetails: e.target.value })}
                placeholder="e.g. Vikram Singh · +91 9876543210"
                className={inputClass}
              />
            </div>
          </div>

          <div
            className={`flex items-center justify-end gap-3 pt-4 border-t ${
              darkMode ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-colors ${
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
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving DN Record...' : 'Save DN Tracker Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
