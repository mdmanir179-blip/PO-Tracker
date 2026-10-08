import React, { useState, useEffect } from 'react';
import { X, Save, Truck, AlertCircle, Sparkles, Plus, Trash2 } from 'lucide-react';
import {
  PurchaseOrder,
  TeamRole,
  ProductCatalogItem,
  PoLineItem,
} from '../types';
import {
  DEFAULT_PRODUCT_CATALOG,
  lookupProductNameByItemId,
} from '../constants/productCatalog';

export interface PoFormValues {
  poNumber: string;
  orderDate: string;
  poExpiryDate: string;
  warehouseName: string;
  itemId: string;
  itemName: string;
  totalQty: number;
  lineItems: PoLineItem[];
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
  catalogItems: ProductCatalogItem[];
  existingPos: PurchaseOrder[];
}

const DEFAULT_VALUES: PoFormValues = {
  poNumber: '',
  orderDate: new Date().toISOString().slice(0, 10),
  poExpiryDate: '',
  warehouseName: '',
  itemId: '',
  itemName: '',
  totalQty: 0,
  lineItems: [{ itemId: '', itemName: '', qty: 1 }],
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
  catalogItems,
  existingPos,
}) => {
  const [values, setValues] = useState<PoFormValues>(DEFAULT_VALUES);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoMatchedRows, setAutoMatchedRows] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (initialPo) {
      const existingLines: PoLineItem[] =
        Array.isArray(initialPo.lineItems) && initialPo.lineItems.length > 0
          ? initialPo.lineItems.map((li) => ({
              itemId: li.itemId || '',
              itemName: li.itemName || '',
              qty: Number(li.qty) || 0,
            }))
          : [
              {
                itemId: initialPo.itemId || '',
                itemName: initialPo.itemName || '',
                qty: Number(initialPo.totalQty) || 0,
              },
            ];

      setValues({
        poNumber: initialPo.poNumber,
        orderDate: initialPo.orderDate,
        poExpiryDate: initialPo.poExpiryDate || '',
        warehouseName: initialPo.warehouseName,
        itemId: initialPo.itemId,
        itemName: initialPo.itemName,
        totalQty: initialPo.totalQty,
        lineItems: existingLines,
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
        lineItems: [{ itemId: '', itemName: '', qty: 1 }],
      });
    }
    setAutoMatchedRows({});
    setError(null);
  }, [initialPo, isOpen]);

  if (!isOpen) return null;

  const isLockedInTransit =
    initialPo?.workflowStage === 'IN_TRANSIT' && userRole !== 'admin';

  const recomputeSummary = (lines: PoLineItem[]) => {
    const valid = lines.filter((l) => l.itemId.trim() || l.itemName.trim());
    const sumQty = lines.reduce((acc, l) => acc + (Number(l.qty) || 0), 0);
    const summaryItemId =
      valid.length <= 1
        ? (valid[0]?.itemId || '').trim()
        : `${valid[0].itemId.trim()} (+${valid.length - 1} more)`.slice(0, 60);
    const summaryItemName =
      valid.length <= 1
        ? (valid[0]?.itemName || '').trim()
        : valid
            .map((v) => `${v.itemName.trim()} (${v.qty})`)
            .join(', ')
            .slice(0, 200);

    return {
      itemId: summaryItemId,
      itemName: summaryItemName,
      totalQty: sumQty,
    };
  };

  const handleChange = (
    field: keyof PoFormValues,
    val: string | number
  ) => {
    setValues((prev) => ({ ...prev, [field]: val }));
  };

  const handleLineItemIdChange = (index: number, newItemId: string) => {
    const matchedName = lookupProductNameByItemId(
      newItemId,
      catalogItems,
      existingPos
    );

    setValues((prev) => {
      const updatedLines = prev.lineItems.map((line, i) => {
        if (i !== index) return line;
        return {
          ...line,
          itemId: newItemId,
          itemName: matchedName ? matchedName : line.itemName,
        };
      });
      const summary = recomputeSummary(updatedLines);
      return {
        ...prev,
        lineItems: updatedLines,
        ...summary,
      };
    });

    setAutoMatchedRows((prev) => ({
      ...prev,
      [index]: Boolean(matchedName),
    }));
  };

  const handleLineItemFieldChange = (
    index: number,
    field: 'itemName' | 'qty',
    val: string | number
  ) => {
    setValues((prev) => {
      const updatedLines = prev.lineItems.map((line, i) => {
        if (i !== index) return line;
        return {
          ...line,
          [field]: field === 'qty' ? Number(val) || 0 : String(val),
        };
      });
      const summary = recomputeSummary(updatedLines);
      return {
        ...prev,
        lineItems: updatedLines,
        ...summary,
      };
    });
    if (field === 'itemName') {
      setAutoMatchedRows((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleAddLineItem = () => {
    setValues((prev) => {
      const updatedLines = [
        ...prev.lineItems,
        { itemId: '', itemName: '', qty: 1 },
      ];
      return {
        ...prev,
        lineItems: updatedLines,
        ...recomputeSummary(updatedLines),
      };
    });
  };

  const handleRemoveLineItem = (index: number) => {
    if (values.lineItems.length <= 1) return;
    setValues((prev) => {
      const updatedLines = prev.lineItems.filter((_, i) => i !== index);
      return {
        ...prev,
        lineItems: updatedLines,
        ...recomputeSummary(updatedLines),
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedInTransit) {
      setError('In-Transit records are locked for standard employees. Only Admin can edit.');
      return;
    }

    const cleanedLines = values.lineItems
      .map((l) => ({
        itemId: l.itemId.trim(),
        itemName: l.itemName.trim(),
        qty: Number(l.qty) || 0,
      }))
      .filter((l) => l.itemId && l.itemName);

    if (!values.poNumber.trim() || !values.warehouseName.trim()) {
      setError('PO Number and Warehouse Name are required.');
      return;
    }

    if (cleanedLines.length === 0) {
      setError('Please enter at least 1 valid Product Item ID and Item Name.');
      return;
    }

    const summary = recomputeSummary(cleanedLines);

    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        ...values,
        lineItems: cleanedLines,
        itemId: summary.itemId,
        itemName: summary.itemName,
        totalQty: summary.totalQty,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save PO record.');
    } finally {
      setIsSaving(false);
    }
  };

  // Build suggestions list for Item ID datalist
  const allCatalogSuggestions = React.useMemo(() => {
    const map = new Map<string, string>();
    DEFAULT_PRODUCT_CATALOG.forEach((d) => map.set(d.itemId, d.itemName));
    existingPos.forEach((p) => {
      if (Array.isArray(p.lineItems)) {
        p.lineItems.forEach((li) => {
          if (li.itemId && li.itemName) {
            map.set(li.itemId.toUpperCase(), li.itemName);
          }
        });
      } else if (p.itemId && p.itemName) {
        map.set(p.itemId.toUpperCase(), p.itemName);
      }
    });
    catalogItems.forEach((c) => {
      if (c.itemId && c.itemName) {
        map.set(c.itemId.toUpperCase(), c.itemName);
      }
    });
    return Array.from(map.entries()).map(([itemId, itemName]) => ({
      itemId,
      itemName,
    }));
  }, [catalogItems, existingPos]);

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
        className={`w-full max-w-5xl rounded-xl border overflow-hidden my-8 ${
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
                : 'New Instamart PO Entry (Multi-Item & Expiry Enabled)'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Add multiple items under a single PO · Entering an Item ID auto-fills the Product Name · Pickup Status YES shifts PO to In-Transit.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
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

          <datalist id="instamart-sku-catalog">
            {allCatalogSuggestions.map((s) => (
              <option key={s.itemId} value={s.itemId}>
                {s.itemName}
              </option>
            ))}
          </datalist>

          {/* PO Header Fields */}
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

            {/* 2B. PO Expiry Date */}
            <div>
              <label className={labelClass}>PO Expiry Date</label>
              <input
                type="date"
                disabled={isLockedInTransit}
                value={values.poExpiryDate}
                onChange={(e) => handleChange('poExpiryDate', e.target.value)}
                className={`${inputClass} font-mono border-orange-500/40`}
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
          </div>

          {/* 4, 5, 6: Multi-Item Product Section */}
          <div
            className={`p-4 rounded-xl border space-y-3 ${
              darkMode
                ? 'bg-slate-950/60 border-slate-800'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  4, 5 & 6. PO Product Items ({values.lineItems.length}{' '}
                  {values.lineItems.length === 1 ? 'Item' : 'Items'} · Total Qty:{' '}
                  <span className="font-mono">{values.totalQty}</span>)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Type an Item ID (e.g. SKU-1001, SKU-1002) to auto-fill Product Name, or click "+ Add Another Item to PO" for multi-item POs.
                </p>
              </div>
              {!isLockedInTransit && (
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Another Item to PO</span>
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {values.lineItems.map((line, idx) => (
                <div
                  key={idx}
                  className={`grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-3 rounded-lg border ${
                    darkMode
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="sm:col-span-3">
                    <label className={labelClass}>
                      Item #{idx + 1} — Item ID *
                    </label>
                    <input
                      type="text"
                      list="instamart-sku-catalog"
                      required
                      disabled={isLockedInTransit}
                      value={line.itemId}
                      onChange={(e) => handleLineItemIdChange(idx, e.target.value)}
                      placeholder="e.g. SKU-1001"
                      className={`${inputClass} font-mono`}
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold">
                        Item Name (Auto-fills from Item ID) *
                      </label>
                      {autoMatchedRows[idx] && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Auto-filled
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      disabled={isLockedInTransit}
                      value={line.itemName}
                      onChange={(e) =>
                        handleLineItemFieldChange(idx, 'itemName', e.target.value)
                      }
                      placeholder="Product Name auto-fills or enter new product"
                      className={inputClass}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass}>Item Qty *</label>
                    <input
                      type="number"
                      min={1}
                      required
                      disabled={isLockedInTransit}
                      value={line.qty}
                      onChange={(e) =>
                        handleLineItemFieldChange(idx, 'qty', Number(e.target.value))
                      }
                      className={`${inputClass} font-mono`}
                    />
                  </div>

                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      disabled={isLockedInTransit || values.lineItems.length <= 1}
                      onClick={() => handleRemoveLineItem(idx)}
                      title="Remove Item Row"
                      className={`p-2 rounded-lg border transition-colors ${
                        values.lineItems.length <= 1 || isLockedInTransit
                          ? 'opacity-30 cursor-not-allowed border-slate-300 dark:border-slate-800 text-slate-400'
                          : 'border-red-500/30 text-red-500 hover:bg-red-500/10 cursor-pointer'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 6. Total Qty (Auto-calculated from items) */}
            <div>
              <label className={labelClass}>6. Total PO Qty (Auto-Sum) *</label>
              <input
                type="number"
                readOnly
                value={values.totalQty}
                className={`${inputClass} font-mono font-bold bg-slate-100 dark:bg-slate-950`}
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
              <label className={labelClass}>15. Logistics Partner / Portal</label>
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
            <div className="sm:col-span-2 lg:col-span-4">
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
              className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
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
                  ? 'Saving...'
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
