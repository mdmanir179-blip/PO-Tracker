import React, { useState, useEffect } from 'react';
import { X, Save, Truck, AlertCircle } from 'lucide-react';
import { PurchaseOrder, TeamRole } from '../types';

export interface PoFormValues {
  poNumber: string;
  orderDate: string;
  warehouseName: string;
  itemId: string;
  itemName: string;
  totalQty: number;
  invoiceNo: string;
  shipDate: string;
  appointmentId: string;
  appointmentDate: string;
  so: string;
  status: string;
  noOfBoxes: number;
  boxDimensions: string;
  logisticsPortal: string;
  pickupTrackingId: string;
  puc: string;
  asn: string;
  clearBagNo: string;
  comment: string;
  pickupStatus: 'YES' | 'NO';
}

interface PoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: PoFormValues) => Promise<void>;
  initialPo: PurchaseOrder | null;
  darkMode: boolean;
  userRole: TeamRole;
}

const DEFAULT_VALUES: PoFormValues = {
  poNumber: '',
  orderDate: new Date().toISOString().slice(0, 10),
  warehouseName: '',
  itemId: '',
  itemName: '',
  totalQty: 0,
  invoiceNo: '',
  shipDate: '',
  appointmentId: '',
  appointmentDate: '',
  so: '',
  status: 'Scheduled',
  noOfBoxes: 0,
  boxDimensions: '',
  logisticsPortal: '',
  pickupTrackingId: '',
  puc: '',
  asn: '',
  clearBagNo: '',
  comment: '',
  pickupStatus: 'NO',
};

export const PoFormModal: React.FC<PoFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPo,
  darkMode,
  userRole,
}) => {
  const [values, setValues] = useState<PoFormValues>(DEFAULT_VALUES);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPo) {
      setValues({
        poNumber: initialPo.poNumber,
        orderDate: initialPo.orderDate,
        warehouseName: initialPo.warehouseName,
        itemId: initialPo.itemId,
        itemName: initialPo.itemName,
        totalQty: initialPo.totalQty,
        invoiceNo: initialPo.invoiceNo,
        shipDate: initialPo.shipDate,
        appointmentId: initialPo.appointmentId,
        appointmentDate: initialPo.appointmentDate,
        so: initialPo.so,
        status: initialPo.status,
        noOfBoxes: initialPo.noOfBoxes,
        boxDimensions: initialPo.boxDimensions,
        logisticsPortal: initialPo.logisticsPortal,
        pickupTrackingId: initialPo.pickupTrackingId,
        puc: initialPo.puc,
        asn: initialPo.asn,
        clearBagNo: initialPo.clearBagNo,
        comment: initialPo.comment,
        pickupStatus: initialPo.pickupStatus,
      });
    } else {
      setValues({
        ...DEFAULT_VALUES,
        orderDate: new Date().toISOString().slice(0, 10),
      });
    }
    setError(null);
  }, [initialPo, isOpen]);

  if (!isOpen) return null;

  const isLockedInTransit =
    initialPo?.workflowStage === 'IN_TRANSIT' && userRole !== 'admin';

  const handleChange = (
    field: keyof PoFormValues,
    val: string | number
  ) => {
    setValues((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedInTransit) {
      setError('In-Transit records are locked for standard employees. Only Admin can edit.');
      return;
    }
    if (!values.poNumber.trim() || !values.warehouseName.trim() || !values.itemId.trim() || !values.itemName.trim()) {
      setError('PO Number, Warehouse Name, Item ID, and Item Name are required.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(values);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save PO record.');
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
        className={`w-full max-w-4xl rounded-xl border overflow-hidden my-8 ${
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
              {initialPo
                ? `Edit Purchase Order — ${initialPo.poNumber}`
                : 'New Instamart PO Entry (21 Point Checklist)'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Setting Pickup Status to YES automatically shifts this PO to the In-Transit tab.
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {values.pickupStatus === 'YES' && (
            <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2.5">
              <Truck className="w-4 h-4 shrink-0" />
              <span>
                <strong>Pickup Status is set to YES:</strong> Saving will immediately shift this entire PO record to the <strong>In Transit</strong> tab. Standard employees will no longer be able to edit its fields (Admin only).
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. PO Number */}
            <div>
              <label className={labelClass}>1. PO Number *</label>
              <input
                type="text"
                required
                disabled={isLockedInTransit}
                value={values.poNumber}
                onChange={(e) => handleChange('poNumber', e.target.value)}
                placeholder="e.g. PO-IM-88412"
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* 2. Order Date */}
            <div>
              <label className={labelClass}>2. Order Date *</label>
              <input
                type="date"
                required
                disabled={isLockedInTransit}
                value={values.orderDate}
                onChange={(e) => handleChange('orderDate', e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* 3. Warehouse Name */}
            <div>
              <label className={labelClass}>3. Warehouse Name *</label>
              <input
                type="text"
                required
                disabled={isLockedInTransit}
                value={values.warehouseName}
                onChange={(e) => handleChange('warehouseName', e.target.value)}
                placeholder="e.g. BLR-Whitefield-Hub1"
                className={inputClass}
              />
            </div>

            {/* 4. Item ID */}
            <div>
              <label className={labelClass}>4. Item ID *</label>
              <input
                type="text"
                required
                disabled={isLockedInTransit}
                value={values.itemId}
                onChange={(e) => handleChange('itemId', e.target.value)}
                placeholder="e.g. SKU-99201"
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* 5. Item Name */}
            <div className="sm:col-span-2">
              <label className={labelClass}>5. Item Name *</label>
              <input
                type="text"
                required
                disabled={isLockedInTransit}
                value={values.itemName}
                onChange={(e) => handleChange('itemName', e.target.value)}
                placeholder="e.g. Organic Cold Pressed Almond Oil 500ml"
                className={inputClass}
              />
            </div>

            {/* 6. Total Qty */}
            <div>
              <label className={labelClass}>6. Total Qty *</label>
              <input
                type="number"
                min={0}
                required
                disabled={isLockedInTransit}
                value={values.totalQty}
                onChange={(e) => handleChange('totalQty', Number(e.target.value))}
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* 7. Invoice No. */}
            <div>
              <label className={labelClass}>7. Invoice No.</label>
              <input
                type="text"
                disabled={isLockedInTransit}
                value={values.invoiceNo}
                onChange={(e) => handleChange('invoiceNo', e.target.value)}
                placeholder="e.g. INV/26-27/1094"
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* 8. Ship Date */}
            <div>
              <label className={labelClass}>8. Ship Date</label>
              <input
                type="date"
                disabled={isLockedInTransit}
                value={values.shipDate}
                onChange={(e) => handleChange('shipDate', e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* 9. Appointment ID */}
            <div>
              <label className={labelClass}>9. Appointment ID</label>
              <input
                type="text"
                disabled={isLockedInTransit}
                value={values.appointmentId}
                onChange={(e) => handleChange('appointmentId', e.target.value)}
                placeholder="e.g. APT-77410"
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* 10. Appointment Date */}
            <div>
              <label className={labelClass}>10. Appointment Date</label>
              <input
                type="date"
                disabled={isLockedInTransit}
                value={values.appointmentDate}
                onChange={(e) => handleChange('appointmentDate', e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* 11. SO */}
            <div>
              <label className={labelClass}>11. SO (Sales Order)</label>
              <input
                type="text"
                disabled={isLockedInTransit}
                value={values.so}
                onChange={(e) => handleChange('so', e.target.value)}
                placeholder="e.g. SO-55192"
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* 12. Status */}
            <div>
              <label className={labelClass}>12. Status</label>
              <select
                disabled={isLockedInTransit}
                value={values.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className={inputClass}
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Packed">Packed</option>
                <option value="Ready for Dispatch">Ready for Dispatch</option>
                <option value="Dispatched">Dispatched</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>

            {/* 13. No. of Boxes */}
            <div>
              <label className={labelClass}>13. No. of Boxes</label>
              <input
                type="number"
                min={0}
                disabled={isLockedInTransit}
                value={values.noOfBoxes}
                onChange={(e) => handleChange('noOfBoxes', Number(e.target.value))}
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* 14. Box Dimensions */}
            <div>
              <label className={labelClass}>14. Box Dimensions</label>
              <input
                type="text"
                disabled={isLockedInTransit}
                value={values.boxDimensions}
                onChange={(e) => handleChange('boxDimensions', e.target.value)}
                placeholder="e.g. 45x30x30 cm"
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* 15. Logistics Portal */}
            <div>
              <label className={labelClass}>15. Logistics Portal</label>
              <input
                type="text"
                disabled={isLockedInTransit}
                value={values.logisticsPortal}
                onChange={(e) => handleChange('logisticsPortal', e.target.value)}
                placeholder="e.g. Delhivery B2B / BlueDart"
                className={inputClass}
              />
            </div>

            {/* 16. Pickup Tracking ID */}
            <div>
              <label className={labelClass}>16. Pickup Tracking ID</label>
              <input
                type="text"
                disabled={isLockedInTransit}
                value={values.pickupTrackingId}
                onChange={(e) => handleChange('pickupTrackingId', e.target.value)}
                placeholder="e.g. TRK-88291044"
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* 17. PUC */}
            <div>
              <label className={labelClass}>17. PUC</label>
              <input
                type="text"
                disabled={isLockedInTransit}
                value={values.puc}
                onChange={(e) => handleChange('puc', e.target.value)}
                placeholder="e.g. PUC-4091"
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* 18. ASN */}
            <div>
              <label className={labelClass}>18. ASN</label>
              <input
                type="text"
                disabled={isLockedInTransit}
                value={values.asn}
                onChange={(e) => handleChange('asn', e.target.value)}
                placeholder="e.g. ASN-900231"
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* 19. Clear Bag No. */}
            <div>
              <label className={labelClass}>19. Clear Bag No.</label>
              <input
                type="text"
                disabled={isLockedInTransit}
                value={values.clearBagNo}
                onChange={(e) => handleChange('clearBagNo', e.target.value)}
                placeholder="e.g. CB-7721"
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* 21. Pickup Status : YES / NO */}
            <div>
              <label className={labelClass}>21. Pickup Status (YES / NO) *</label>
              <select
                disabled={isLockedInTransit}
                value={values.pickupStatus}
                onChange={(e) =>
                  handleChange('pickupStatus', e.target.value as 'YES' | 'NO')
                }
                className={`${inputClass} font-bold ${
                  values.pickupStatus === 'YES'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                <option value="NO">NO (Keep in PO Entry)</option>
                <option value="YES">YES (Shift to In Transit)</option>
              </select>
            </div>

            {/* 20. Comment */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelClass}>20. Comment</label>
              <input
                type="text"
                disabled={isLockedInTransit}
                value={values.comment}
                onChange={(e) => handleChange('comment', e.target.value)}
                placeholder="Enter dispatch remarks, vehicle details, or special instructions..."
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
              disabled={isSaving || isLockedInTransit}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSaving
                  ? 'Saving & Syncing...'
                  : values.pickupStatus === 'YES'
                  ? 'Save & Shift to In Transit'
                  : 'Save PO Entry'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
