import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Calendar,
  Building2,
  Package,
  Truck,
  Boxes,
  CreditCard,
  RotateCcw,
  PackageCheck,
  FileText,
  FileSpreadsheet,
  Edit3,
  ExternalLink,
  Clock,
  AlertTriangle,
  CheckCircle2,
  User,
  ShieldAlert,
} from 'lucide-react';
import { PurchaseOrder } from '../types';
import { formatINR } from '../utils/paymentUtils';
import { exportSinglePoToPdf, exportSinglePoToExcel } from '../services/exportService';

interface PoDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrder | null;
  onEditPo?: (po: PurchaseOrder) => void;
  darkMode: boolean;
  canEdit?: boolean;
}

export const PoDetailsModal: React.FC<PoDetailsModalProps> = ({
  isOpen,
  onClose,
  po,
  onEditPo,
  darkMode,
  canEdit = false,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !po) return null;

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Compile full line items: either lineItems array or fallback to primary item
  const displayItems =
    Array.isArray(po.lineItems) && po.lineItems.length > 0
      ? po.lineItems
      : [
          {
            itemId: po.itemId,
            itemName: po.itemName,
            qty: po.totalQty,
            boxDimensions: po.boxDimensions,
            noOfBoxes: po.noOfBoxes,
          },
        ];

  const isRto =
    po.isRto === true ||
    po.workflowStage === 'RTO' ||
    (po.status || '').toUpperCase().startsWith('RTO');

  const isGrn =
    po.workflowStage === 'GRN' ||
    po.inwardStatus === 'SUCCESS' ||
    Boolean(po.grnNumber && po.grnNumber.trim());

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border my-auto overflow-hidden transition-all ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 border-b flex flex-wrap items-center justify-between gap-3 ${
            darkMode
              ? 'bg-slate-950/70 border-slate-800'
              : 'bg-gradient-to-r from-orange-50 via-slate-50 to-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600/15 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-sm shrink-0 border border-orange-500/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-base sm:text-lg font-extrabold tracking-tight text-orange-600 dark:text-orange-400">
                  {po.poNumber}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(po.poNumber, 'poNumber')}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="Copy PO Number"
                >
                  {copiedField === 'poNumber' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Workflow Stage badge */}
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isRto
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      : isGrn
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : po.workflowStage === 'IN_TRANSIT'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                  }`}
                >
                  {isRto
                    ? 'RTO Return'
                    : isGrn
                    ? '03. GRN Inward'
                    : po.workflowStage === 'IN_TRANSIT'
                    ? '02. In Transit'
                    : '01. PO Entry'}
                </span>

                {/* Pickup Status badge */}
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    po.pickupStatus === 'YES'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-500/15 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Pickup: {po.pickupStatus === 'YES' ? 'YES (Dispatched)' : 'NO (Pending)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Detailed Purchase Order, Product SKU breakdown, Box Dimensions & Logistics Overview
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && onEditPo && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditPo(po);
                }}
                className="px-3 py-1.5 rounded-lg border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Full PO</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* Top Key Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Card 1: Order & Expiry */}
            <div
              className={`p-3 rounded-xl border ${
                darkMode
                  ? 'bg-slate-950/50 border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 text-slate-500 font-medium mb-1">
                <Calendar className="w-3.5 h-3.5 text-orange-500" />
                <span>Dates & Timeline</span>
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Order Date:</span>
                  <span className="font-mono font-bold">{po.orderDate || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">PO Expiry:</span>
                  <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                    {po.poExpiryDate || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ship Date:</span>
                  <span className="font-mono">{po.shipDate || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Warehouse Destination */}
            <div
              className={`p-3 rounded-xl border ${
                darkMode
                  ? 'bg-slate-950/50 border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 text-slate-500 font-medium mb-1">
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Warehouse Facility</span>
              </div>
              <div className="space-y-0.5">
                <div className="font-bold truncate text-slate-800 dark:text-slate-200" title={po.warehouseName}>
                  {po.warehouseName}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Appt Date:</span>
                  <span className="font-mono font-medium">{po.appointmentDate || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Appt ID:</span>
                  <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    {po.appointmentId || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Logistics & Packaging */}
            <div
              className={`p-3 rounded-xl border ${
                darkMode
                  ? 'bg-slate-950/50 border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 text-slate-500 font-medium mb-1">
                <Boxes className="w-3.5 h-3.5 text-amber-500" />
                <span>Boxes & Dimensions</span>
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Boxes:</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {po.noOfBoxes} Boxes
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Box Size:</span>
                  <span className="font-mono truncate max-w-[120px]" title={po.boxDimensions || 'N/A'}>
                    {po.boxDimensions || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Carrier / Portal:</span>
                  <span className="truncate max-w-[120px] font-medium">{po.logisticsPortal || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Card 4: Financial & Invoice */}
            <div
              className={`p-3 rounded-xl border ${
                darkMode
                  ? 'bg-slate-950/50 border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 text-slate-500 font-medium mb-1">
                <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                <span>Value & Payment</span>
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Net Amount:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatINR(po.totalAmount ?? (po.totalQty * 320))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice No:</span>
                  <span className="font-mono">{po.invoiceNo || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment:</span>
                  <span className="font-semibold">{po.paymentStatus || 'PENDING'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Products & Line Items with Individual Box Dimensions */}
          <div
            className={`rounded-xl border overflow-hidden ${
              darkMode
                ? 'bg-slate-950/40 border-slate-800'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-500" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Products &amp; Line Items Breakdown ({displayItems.length} SKUs · Total Qty: {po.totalQty})
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">
                Item ID: <strong className="font-mono text-orange-600 dark:text-orange-400">{po.itemId}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr
                    className={`border-b font-semibold ${
                      darkMode
                        ? 'bg-slate-950/80 border-slate-800 text-slate-400'
                        : 'bg-slate-100/70 border-slate-200 text-slate-600'
                    }`}
                  >
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Product SKU / Item ID</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3 text-right">Order Qty</th>
                    <th className="py-2.5 px-3">Box Dimensions (L x W x H)</th>
                    <th className="py-2.5 px-3 text-center">Boxes</th>
                    <th className="py-2.5 px-3 text-center">Packing Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {displayItems.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                        {item.itemId}
                      </td>
                      <td className="py-2.5 px-3 font-medium min-w-[200px]">
                        {item.itemName}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                        {item.qty}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                        {Array.isArray(item.boxes) && item.boxes.length > 0 ? (
                          <div className="space-y-1">
                            {item.boxes.map((box, bIdx) => (
                              <div
                                key={box.id || bIdx}
                                className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20 text-[11px] flex items-center justify-between gap-2"
                              >
                                <span>
                                  Box {bIdx + 1}
                                  {box.boxCount > 1 ? ` (×${box.boxCount})` : ''}:{' '}
                                  {box.boxDimensions || 'N/A'}
                                </span>
                                {box.chargeableWeightKg > 0 && (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                    {box.chargeableWeightKg.toFixed(2)} kg
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : item.boxDimensions ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                            {item.boxDimensions}
                          </span>
                        ) : po.boxDimensions ? (
                          <span className="text-slate-500 italic">
                            Default: {po.boxDimensions}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not set</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        <div>{item.noOfBoxes || (displayItems.length === 1 ? po.noOfBoxes : '-')}</div>
                        {item.boxWeight && (
                          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {item.boxWeight}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            po.pickupStatus === 'YES' || item.packedStatus === 'PACKED'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {po.pickupStatus === 'YES'
                            ? 'DISPATCHED'
                            : item.packedStatus === 'PACKED'
                            ? 'PACKED'
                            : 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Dispatch, PUC, ASN & Carrier Details */}
          <div
            className={`p-4 rounded-xl border ${
              darkMode
                ? 'bg-slate-950/40 border-slate-800'
                : 'bg-slate-50/60 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-3 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
              <Truck className="w-4 h-4 text-emerald-500" />
              <span>Logistics, Dispatch &amp; Tracking Codes</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Pickup Tracking ID / LR:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 select-all">
                  {po.pickupTrackingId || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">PUC Number:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 select-all">
                  {po.puc || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">ASN Number:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 select-all">
                  {po.asn || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Clear Bag No:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 select-all">
                  {po.clearBagNo || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Sales Order (SO):</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {po.so || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Logistics Status:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {po.logisticsStatus || (po.pickupStatus === 'YES' ? 'IN_TRANSIT' : 'PENDING_PICKUP')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Print Verification:</span>
                <span className="font-semibold">
                  {po.printVerified === 'YES' ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      Verified ({po.printVerifiedBy || 'Print Team'})
                    </span>
                  ) : (
                    <span className="text-slate-400">Pending</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Pickup Timestamp:</span>
                <span className="text-slate-600 dark:text-slate-300">
                  {po.pickupMarkedAt || (po.pickupStatus === 'YES' ? 'Marked Picked Up' : 'Not picked up yet')}
                </span>
              </div>
            </div>

            {po.comment && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block text-[11px] mb-0.5">Remarks / Comments:</span>
                <p className="text-slate-700 dark:text-slate-300 italic">{po.comment}</p>
              </div>
            )}
          </div>

          {/* Section: GRN Details (if present) */}
          {po.grnNumber && (
            <div
              className={`p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 ${
                darkMode ? 'text-emerald-300' : 'text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-2">
                <PackageCheck className="w-4 h-4 text-emerald-500" />
                <span>GRN Goods Receipt Note Details</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">GRN Number:</span>
                  <span className="font-mono font-bold">{po.grnNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">GRN Date:</span>
                  <span className="font-mono">{po.grnDate || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Accepted Qty:</span>
                  <span className="font-mono font-bold text-emerald-600">{po.acceptedQty ?? po.totalQty}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Discrepancy (DN):</span>
                  <span className="font-mono font-bold text-rose-600">
                    {po.hasDn ? `${po.dnQty} pcs (-${formatINR(po.dnAmount || 0)})` : 'None'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Section: RTO Details (if present) */}
          {isRto && (
            <div
              className={`p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 ${
                darkMode ? 'text-rose-300' : 'text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-2">
                <RotateCcw className="w-4 h-4 text-rose-500" />
                <span>Return to Origin (RTO) Tracking Details</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">RTO Tracking ID:</span>
                  <span className="font-mono font-bold">{po.rtoTrackingId || 'Pending'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Reverse Courier:</span>
                  <span>{po.rtoCourierPartner || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">RTO Reason:</span>
                  <span className="font-medium text-rose-600 dark:text-rose-400">{po.rtoReason || 'Rejected'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Received at Origin WH:</span>
                  <span className="font-bold">{po.rtoReceivedAtWh || 'NO'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Section: Audit & Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              <span>Created by: {po.createdByName || 'N/A'} (ID: {po.createdByEmpId || '-'})</span>
            </div>
            <div>
              <span>Last updated by: {po.updatedByName || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className={`p-4 border-t flex flex-wrap items-center justify-between gap-3 ${
            darkMode
              ? 'bg-slate-950/80 border-slate-800'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportSinglePoToPdf(po)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              <span>Export PDF</span>
            </button>
            <button
              type="button"
              onClick={() => exportSinglePoToExcel(po)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span>Export Excel</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && onEditPo && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditPo(po);
                }}
                className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Full PO</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
