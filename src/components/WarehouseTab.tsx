import React, { useState, useMemo, useEffect } from 'react';
import {
  Boxes,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Edit3,
  Calendar,
  Building2,
  FileSpreadsheet,
  FileText,
  Download,
  AlertTriangle,
  ArrowRight,
  Check,
  X,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Scale,
} from 'lucide-react';
import {
  PurchaseOrder,
  PoLineItem,
  ProductBoxEntry,
  TeamRole,
  WarehouseStatus,
  compareLastAddedFirst,
} from '../types';
import { Pagination } from './Pagination';

function createBoxId(): string {
  return `box_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Parses dimension strings like "40x30x20", "40 x 30 x 20 cm", "40*30*20"
 */
export function parseBoxDimensions(
  dimStr?: string
): { l: number; w: number; h: number } | null {
  if (!dimStr || typeof dimStr !== 'string') return null;
  const match = dimStr
    .trim()
    .match(/(\d+(?:\.\d+)?)\s*[xX*×]\s*(\d+(?:\.\d+)?)\s*[xX*×]\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const l = parseFloat(match[1]);
  const w = parseFloat(match[2]);
  const h = parseFloat(match[3]);
  if (!Number.isFinite(l) || !Number.isFinite(w) || !Number.isFinite(h) || l <= 0 || w <= 0 || h <= 0) {
    return null;
  }
  return { l, w, h };
}

/**
 * Standard courier volumetric weight in kg: (L x W x H cm) / 5000
 */
export function calculateVolumetricWeightKg(dimStr?: string): number {
  const parsed = parseBoxDimensions(dimStr);
  if (!parsed) return 0;
  return Number(((parsed.l * parsed.w * parsed.h) / 5000).toFixed(2));
}

export function computeBoxEntry(entry: Partial<ProductBoxEntry>): ProductBoxEntry {
  const boxCount = Math.max(1, Math.floor(Number(entry.boxCount) || 1));
  const actualWeightKg = Math.max(0, Number(entry.actualWeightKg) || 0);
  const boxDimensions = String(entry.boxDimensions || '').slice(0, 60);
  const volumetricWeightKg = calculateVolumetricWeightKg(boxDimensions);
  const perBoxEffective = Math.max(actualWeightKg, volumetricWeightKg);
  const chargeableWeightKg = Number((perBoxEffective * boxCount).toFixed(2));

  return {
    id: entry.id || createBoxId(),
    boxDimensions,
    boxCount,
    actualWeightKg: Number(actualWeightKg.toFixed(2)),
    volumetricWeightKg,
    chargeableWeightKg,
  };
}

export function computeLineItemBoxSummary(item: PoLineItem): {
  boxes: ProductBoxEntry[];
  totalBoxes: number;
  totalActualKg: number;
  totalVolumetricKg: number;
  totalChargeableKg: number;
  dimSummary: string;
} {
  const rawBoxes =
    Array.isArray(item.boxes) && item.boxes.length > 0
      ? item.boxes
      : [
          computeBoxEntry({
            boxDimensions: item.boxDimensions || '',
            boxCount: item.noOfBoxes || 1,
            actualWeightKg: item.boxWeight
              ? (parseFloat(String(item.boxWeight).replace(/[^\d.]/g, '')) || 0) /
                Math.max(1, item.noOfBoxes || 1)
              : 0,
          }),
        ];

  const boxes = rawBoxes.map(computeBoxEntry);
  const totalBoxes = boxes.reduce((sum, b) => sum + b.boxCount, 0);
  const totalActualKg = Number(
    boxes.reduce((sum, b) => sum + b.actualWeightKg * b.boxCount, 0).toFixed(2)
  );
  const totalVolumetricKg = Number(
    boxes.reduce((sum, b) => sum + b.volumetricWeightKg * b.boxCount, 0).toFixed(2)
  );
  const totalChargeableKg = Number(
    boxes.reduce((sum, b) => sum + b.chargeableWeightKg, 0).toFixed(2)
  );

  const nonEmptyDims = boxes
    .filter((b) => b.boxDimensions.trim().length > 0)
    .map((b) =>
      b.boxCount > 1 ? `${b.boxDimensions.trim()} (x${b.boxCount})` : b.boxDimensions.trim()
    );
  const dimSummary =
    nonEmptyDims.length > 0
      ? nonEmptyDims.join(', ').slice(0, 100)
      : (item.boxDimensions || '').trim().slice(0, 100);

  return {
    boxes,
    totalBoxes,
    totalActualKg,
    totalVolumetricKg,
    totalChargeableKg,
    dimSummary,
  };
}

export interface WarehouseBoxUpdatePayload {
  poId: string;
  poNumber?: string;
  noOfBoxes: number;
  boxDimensions: string;
  lineItems: PoLineItem[];
  markReady?: boolean;
}

export interface WarehousePickupPayload {
  poId: string;
  poNumber?: string;
  pickupStatus: 'YES' | 'NO';
  pickupTrackingId?: string;
  logisticsPortal?: string;
  puc?: string;
  asn?: string;
  pickupDate?: string;
  comment?: string;
}

interface WarehouseTabProps {
  purchaseOrders: PurchaseOrder[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onUpdateBoxDimensions: (payload: WarehouseBoxUpdatePayload) => Promise<void>;
  onMarkPickup: (payload: WarehousePickupPayload) => Promise<void>;
  onWarehouseStatusChange: (po: PurchaseOrder, status: WarehouseStatus) => Promise<void>;
  onMarkPackagingReady?: (po: PurchaseOrder) => Promise<void>;
  onDeletePo?: (po: PurchaseOrder) => void;
  onViewPoDetails: (po: PurchaseOrder) => void;
  onEditPo?: (po: PurchaseOrder) => void;
  darkMode: boolean;
  isGrey: boolean;
  userRole: TeamRole;
  isAdmin?: boolean;
}

export const WarehouseTab: React.FC<WarehouseTabProps> = ({
  purchaseOrders,
  searchQuery,
  onSearchChange,
  onUpdateBoxDimensions,
  onMarkPickup,
  onWarehouseStatusChange,
  onMarkPackagingReady,
  onDeletePo,
  onViewPoDetails,
  onEditPo,
  darkMode,
  isGrey,
  userRole,
  isAdmin = false,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL_ACTIVE' | 'PENDING' | 'PROCESSING' | 'READY_FOR_DISPATCH' | 'PICKED_UP'>('ALL_ACTIVE');
  
  // Modal state for editing individual product box dimensions & multi-box weights
  const [editingBoxPo, setEditingBoxPo] = useState<PurchaseOrder | null>(null);
  const [masterBoxCount, setMasterBoxCount] = useState<number>(1);
  const [masterBoxDim, setMasterBoxDim] = useState<string>('');
  const [isMasterDimManual, setIsMasterDimManual] = useState<boolean>(false);
  const [lineItemsState, setLineItemsState] = useState<PoLineItem[]>([]);
  const [isSavingBox, setIsSavingBox] = useState(false);

  // Modal state for marking shipment pickup
  const [pickupTargetPo, setPickupTargetPo] = useState<PurchaseOrder | null>(null);
  const [pickupCarrier, setPickupCarrier] = useState('');
  const [pickupTrackingId, setPickupTrackingId] = useState('');
  const [pickupPuc, setPickupPuc] = useState('');
  const [pickupAsn, setPickupAsn] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupRemarks, setPickupRemarks] = useState('');
  const [isSavingPickup, setIsSavingPickup] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  // Active warehouse orders (Orders currently in Warehouse stage awaiting packaging/dispatch)
  const activeWarehouseOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (po.workflowStage === 'GRN' || po.workflowStage === 'RTO' || po.isRto) return false;
      if (po.pickupStatus === 'YES' || po.workflowStage === 'IN_TRANSIT') return false;
      if (po.workflowStage === 'PO_ENTRY') return false;
      if (po.workflowStage === 'PRINT_LOGISTICS') return false;
      return po.workflowStage === 'WAREHOUSE';
    });
  }, [purchaseOrders]);

  // Historical picked up orders (transferred to Logistics Team)
  const pickedUpOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (po.workflowStage === 'GRN' || po.workflowStage === 'RTO' || po.isRto) return false;
      return (
        po.warehouseStatus === 'PICKED_UP' ||
        po.pickupStatus === 'YES' ||
        po.workflowStage === 'IN_TRANSIT'
      );
    });
  }, [purchaseOrders]);

  // Compute metrics for Warehouse 4-state workflow
  const metrics = useMemo(() => {
    const totalActive = activeWarehouseOrders.length;
    const pending = activeWarehouseOrders.filter(
      (po) => !po.warehouseStatus || po.warehouseStatus === 'PENDING'
    ).length;
    const processing = activeWarehouseOrders.filter(
      (po) => po.warehouseStatus === 'PROCESSING'
    ).length;
    const readyForDispatch = activeWarehouseOrders.filter(
      (po) => po.warehouseStatus === 'READY_FOR_DISPATCH' || po.packagingStatus === 'READY'
    ).length;
    const pickedUp = pickedUpOrders.length;
    return { totalActive, pending, processing, readyForDispatch, pickedUp };
  }, [activeWarehouseOrders, pickedUpOrders]);

  // Filtered by search and status, sorted chronologically by shipment & appointment date
  const filteredOrders = useMemo(() => {
    let sourceList: PurchaseOrder[];
    if (statusFilter === 'PICKED_UP') {
      sourceList = pickedUpOrders;
    } else if (statusFilter === 'PENDING') {
      sourceList = activeWarehouseOrders.filter(
        (po) => !po.warehouseStatus || po.warehouseStatus === 'PENDING'
      );
    } else if (statusFilter === 'PROCESSING') {
      sourceList = activeWarehouseOrders.filter(
        (po) => po.warehouseStatus === 'PROCESSING'
      );
    } else if (statusFilter === 'READY_FOR_DISPATCH') {
      sourceList = activeWarehouseOrders.filter(
        (po) => po.warehouseStatus === 'READY_FOR_DISPATCH' || po.packagingStatus === 'READY'
      );
    } else {
      sourceList = activeWarehouseOrders;
    }

    return sourceList
      .filter((po) => {
        // Search query
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;

        const itemsMatch = (po.lineItems || []).some(
          (li) =>
            li.itemId.toLowerCase().includes(q) ||
            li.itemName.toLowerCase().includes(q) ||
            (li.boxDimensions || '').toLowerCase().includes(q)
        );

        return (
          po.poNumber.toLowerCase().includes(q) ||
          po.warehouseName.toLowerCase().includes(q) ||
          po.itemId.toLowerCase().includes(q) ||
          po.itemName.toLowerCase().includes(q) ||
          (po.boxDimensions || '').toLowerCase().includes(q) ||
          (po.pickupTrackingId || '').toLowerCase().includes(q) ||
          (po.puc || '').toLowerCase().includes(q) ||
          (po.asn || '').toLowerCase().includes(q) ||
          itemsMatch
        );
      })
      .sort(compareLastAddedFirst);
  }, [activeWarehouseOrders, pickedUpOrders, statusFilter, searchQuery]);

  // Recalculate per-product & overall master totals whenever boxes change
  const syncLineItemsAndTotals = (
    items: PoLineItem[],
    overrideManualMasterDim: boolean = false
  ) => {
    const normalizedItems: PoLineItem[] = items.map((item) => {
      const summary = computeLineItemBoxSummary(item);
      return {
        itemId: item.itemId,
        itemName: item.itemName,
        qty: Number(item.qty) || 0,
        boxDimensions: summary.dimSummary,
        noOfBoxes: summary.totalBoxes,
        boxWeight: summary.totalChargeableKg > 0 ? `${summary.totalChargeableKg.toFixed(2)} kg` : '',
        boxes: summary.boxes,
        packedStatus: item.packedStatus || 'PENDING',
      };
    });

    const totalBoxes = normalizedItems.reduce((sum, it) => sum + (it.noOfBoxes || 1), 0);
    setLineItemsState(normalizedItems);
    setMasterBoxCount(Math.max(1, totalBoxes));

    if (!isMasterDimManual || overrideManualMasterDim) {
      const allDims = normalizedItems
        .map((it) => it.boxDimensions || '')
        .filter((d) => d.trim().length > 0);
      if (allDims.length > 0) {
        const uniqueSummary = Array.from(new Set(allDims)).join(' | ').slice(0, 100);
        setMasterBoxDim(uniqueSummary);
      }
    }
  };

  // Shipment-wide auto-calculated weight metrics for the open modal
  const modalWeightTotals = useMemo(() => {
    let totalBoxes = 0;
    let totalActualKg = 0;
    let totalVolumetricKg = 0;
    let totalChargeableKg = 0;

    for (const item of lineItemsState) {
      const s = computeLineItemBoxSummary(item);
      totalBoxes += s.totalBoxes;
      totalActualKg += s.totalActualKg;
      totalVolumetricKg += s.totalVolumetricKg;
      totalChargeableKg += s.totalChargeableKg;
    }

    return {
      totalBoxes,
      totalActualKg: Number(totalActualKg.toFixed(2)),
      totalVolumetricKg: Number(totalVolumetricKg.toFixed(2)),
      totalChargeableKg: Number(totalChargeableKg.toFixed(2)),
    };
  }, [lineItemsState]);

  // Open Edit Box Dimensions Modal
  const handleOpenBoxModal = (po: PurchaseOrder) => {
    setEditingBoxPo(po);
    setIsMasterDimManual(false);

    const baseItems: PoLineItem[] =
      Array.isArray(po.lineItems) && po.lineItems.length > 0
        ? po.lineItems
        : [
            {
              itemId: po.itemId,
              itemName: po.itemName,
              qty: po.totalQty,
              boxDimensions: po.boxDimensions || '',
              noOfBoxes: po.noOfBoxes || 1,
              packedStatus: 'PENDING',
            },
          ];

    const initialized: PoLineItem[] = baseItems.map((item) => {
      const summary = computeLineItemBoxSummary({
        ...item,
        boxDimensions: item.boxDimensions || po.boxDimensions || '',
        noOfBoxes: item.noOfBoxes || (baseItems.length === 1 ? po.noOfBoxes || 1 : 1),
      });
      return {
        itemId: item.itemId,
        itemName: item.itemName,
        qty: Number(item.qty) || 0,
        boxDimensions: summary.dimSummary,
        noOfBoxes: summary.totalBoxes,
        boxWeight: summary.totalChargeableKg > 0 ? `${summary.totalChargeableKg.toFixed(2)} kg` : '',
        boxes: summary.boxes,
        packedStatus: item.packedStatus || 'PENDING',
      };
    });

    const totalBoxes = initialized.reduce((sum, it) => sum + (it.noOfBoxes || 1), 0);
    setLineItemsState(initialized);
    setMasterBoxCount(po.noOfBoxes || totalBoxes || 1);
    setMasterBoxDim(po.boxDimensions || '');
  };

  // Add another box for a specific product
  const handleAddBoxToProduct = (itemIdx: number) => {
    const updated = lineItemsState.map((item, idx) => {
      if (idx !== itemIdx) return item;
      const existingBoxes = computeLineItemBoxSummary(item).boxes;
      const newBox = computeBoxEntry({
        id: createBoxId(),
        boxDimensions: '',
        boxCount: 1,
        actualWeightKg: 0,
      });
      return {
        ...item,
        boxes: [...existingBoxes, newBox],
      };
    });
    syncLineItemsAndTotals(updated);
  };

  // Remove a box from a specific product
  const handleRemoveBoxFromProduct = (itemIdx: number, boxIdx: number) => {
    const updated = lineItemsState.map((item, idx) => {
      if (idx !== itemIdx) return item;
      const existingBoxes = computeLineItemBoxSummary(item).boxes;
      if (existingBoxes.length <= 1) return item;
      return {
        ...item,
        boxes: existingBoxes.filter((_, bIdx) => bIdx !== boxIdx),
      };
    });
    syncLineItemsAndTotals(updated);
  };

  // Update a specific box field on a product
  const handleUpdateProductBox = (
    itemIdx: number,
    boxIdx: number,
    patch: Partial<ProductBoxEntry>
  ) => {
    const updated = lineItemsState.map((item, idx) => {
      if (idx !== itemIdx) return item;
      const existingBoxes = computeLineItemBoxSummary(item).boxes;
      const nextBoxes = existingBoxes.map((box, bIdx) =>
        bIdx === boxIdx ? computeBoxEntry({ ...box, ...patch }) : box
      );
      return {
        ...item,
        boxes: nextBoxes,
      };
    });
    syncLineItemsAndTotals(updated);
  };

  // Submit Box Dimensions & Calculated Weights
  const handleSaveBoxDimensions = async (e?: React.FormEvent, markReady: boolean = false) => {
    if (e) e.preventDefault();
    if (!editingBoxPo) return;
    setIsSavingBox(true);
    try {
      const sanitizedLineItems: PoLineItem[] = lineItemsState.map((item) => {
        const summary = computeLineItemBoxSummary(item);
        return {
          itemId: String(item.itemId || '').slice(0, 60),
          itemName: String(item.itemName || '').slice(0, 200),
          qty: Number(item.qty) || 0,
          boxDimensions: summary.dimSummary.slice(0, 100),
          noOfBoxes: summary.totalBoxes,
          boxWeight: summary.totalChargeableKg > 0 ? `${summary.totalChargeableKg.toFixed(2)} kg` : '',
          boxes: summary.boxes.map((b) => ({
            id: b.id,
            boxDimensions: b.boxDimensions.trim().slice(0, 60),
            boxCount: b.boxCount,
            actualWeightKg: b.actualWeightKg,
            volumetricWeightKg: b.volumetricWeightKg,
            chargeableWeightKg: b.chargeableWeightKg,
          })),
          packedStatus: item.packedStatus || 'PENDING',
        };
      });

      const autoDimFallback = sanitizedLineItems
        .map((it) => it.boxDimensions || '')
        .filter(Boolean)
        .join(' | ');
      const finalMasterDim = (masterBoxDim.trim() || autoDimFallback || 'Standard Box').slice(
        0,
        100
      );

      await onUpdateBoxDimensions({
        poId: editingBoxPo.id,
        poNumber: editingBoxPo.poNumber,
        noOfBoxes: Math.max(1, Number(masterBoxCount) || modalWeightTotals.totalBoxes || 1),
        boxDimensions: finalMasterDim,
        lineItems: sanitizedLineItems,
        markReady,
      });
      setEditingBoxPo(null);
    } catch (err) {
      console.error('Failed to save box dimensions:', err);
    } finally {
      setIsSavingBox(false);
    }
  };

  // Open Pickup Modal
  const handleOpenPickupModal = (po: PurchaseOrder) => {
    setPickupTargetPo(po);
    setPickupCarrier(po.logisticsPortal || 'Smartr Logistics');
    setPickupTrackingId(po.pickupTrackingId || '');
    setPickupPuc(po.puc || '');
    setPickupAsn(po.asn || '');
    setPickupDate(new Date().toISOString().slice(0, 16));
    setPickupRemarks(po.comment || '');
  };

  // Submit Pickup
  const handleConfirmPickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupTargetPo) return;
    setIsSavingPickup(true);
    try {
      await onMarkPickup({
        poId: pickupTargetPo.id,
        pickupStatus: 'YES',
        pickupTrackingId: pickupTrackingId.trim(),
        logisticsPortal: pickupCarrier.trim(),
        puc: pickupPuc.trim(),
        asn: pickupAsn.trim(),
        pickupDate,
        comment: pickupRemarks.trim(),
      });
      setPickupTargetPo(null);
    } catch (err) {
      console.error('Failed to mark pickup:', err);
    } finally {
      setIsSavingPickup(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Workspace Header Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
            statusFilter === 'ALL_ACTIVE'
              ? 'border-orange-500/80 bg-orange-500/10'
              : darkMode
              ? 'bg-slate-900 border-slate-800 hover:border-orange-500/40'
              : 'bg-white border-slate-200 hover:border-orange-300'
          }`}
          onClick={() => setStatusFilter('ALL_ACTIVE')}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">Active Warehouse</span>
            <Boxes className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xl font-bold font-mono">{metrics.totalActive}</div>
          <span className="text-[10px] text-slate-400">Total in WH Queue</span>
        </div>

        <div
          className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
            statusFilter === 'PENDING'
              ? 'border-amber-500/80 bg-amber-500/10'
              : darkMode
              ? 'bg-slate-900 border-slate-800 hover:border-amber-500/40'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
          onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL_ACTIVE' : 'PENDING')}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
            <span className="text-[11px] font-semibold">Pending</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {metrics.pending}
          </div>
          <span className="text-[10px] text-slate-400">Awaiting packaging</span>
        </div>

        <div
          className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
            statusFilter === 'PROCESSING'
              ? 'border-blue-500/80 bg-blue-500/10'
              : darkMode
              ? 'bg-slate-900 border-slate-800 hover:border-blue-500/40'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
          onClick={() => setStatusFilter(statusFilter === 'PROCESSING' ? 'ALL_ACTIVE' : 'PROCESSING')}
        >
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
            <span className="text-[11px] font-semibold">Processing</span>
            <Boxes className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
            {metrics.processing}
          </div>
          <span className="text-[10px] text-slate-400">Box packing in progress</span>
        </div>

        <div
          className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
            statusFilter === 'READY_FOR_DISPATCH'
              ? 'border-purple-500/80 bg-purple-500/10'
              : darkMode
              ? 'bg-slate-900 border-slate-800 hover:border-purple-500/40'
              : 'bg-white border-slate-200 hover:border-purple-300'
          }`}
          onClick={() => setStatusFilter(statusFilter === 'READY_FOR_DISPATCH' ? 'ALL_ACTIVE' : 'READY_FOR_DISPATCH')}
        >
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-1">
            <span className="text-[11px] font-semibold">Ready for Dispatch</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
            {metrics.readyForDispatch}
          </div>
          <span className="text-[10px] text-slate-400">Packed &amp; staged</span>
        </div>

        <div
          className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
            statusFilter === 'PICKED_UP'
              ? 'border-emerald-500/80 bg-emerald-500/10'
              : darkMode
              ? 'bg-slate-900 border-slate-800 hover:border-emerald-500/40'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
          onClick={() => setStatusFilter(statusFilter === 'PICKED_UP' ? 'ALL_ACTIVE' : 'PICKED_UP')}
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="text-[11px] font-semibold">Picked Up</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {metrics.pickedUp}
          </div>
          <span className="text-[10px] text-slate-400">Moved to Logistics</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div
        className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
          darkMode
            ? 'bg-slate-900 border-slate-800'
            : isGrey
            ? 'bg-zinc-100 border-zinc-300'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL_ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              statusFilter === 'ALL_ACTIVE'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All Active ({metrics.totalActive})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Pending ({metrics.pending})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PROCESSING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              statusFilter === 'PROCESSING'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Processing ({metrics.processing})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('READY_FOR_DISPATCH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              statusFilter === 'READY_FOR_DISPATCH'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Ready for Dispatch ({metrics.readyForDispatch})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PICKED_UP')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              statusFilter === 'PICKED_UP'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Picked Up ({metrics.pickedUp})
          </button>
        </div>

        <div className="relative min-w-[220px] flex-1 sm:flex-initial">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search PO, SKU, Product, Dimensions, Courier..."
            className={`w-full pl-9 pr-3 py-1.5 rounded-lg text-xs border outline-none transition-colors ${
              darkMode
                ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-orange-500'
                : 'bg-white border-slate-300 text-slate-900 focus:border-orange-500'
            }`}
          />
        </div>
      </div>

      {/* Main Warehouse Table */}
      <div
        className={`rounded-xl border overflow-hidden ${
          darkMode
            ? 'bg-slate-900 border-slate-800'
            : isGrey
            ? 'bg-zinc-100 border-zinc-300'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-orange-500" />
            <h2 className="font-bold text-sm">
              Warehouse Packaging &amp; Handover Hub ({filteredOrders.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">
            Click PO Number to view full PO details
          </span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Boxes className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
            <div className="text-sm font-semibold">No Orders Match Current Filter</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No purchase orders currently require packaging or pickup under the selected status.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr
                  className={`border-b font-semibold ${
                    darkMode
                      ? 'bg-slate-950/70 border-slate-800 text-slate-400'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <th className="py-3 px-4 whitespace-nowrap">PO Number &amp; Dates</th>
                  <th className="py-3 px-4 whitespace-nowrap">Destination Facility</th>
                  <th className="py-3 px-4 whitespace-nowrap">Product Breakdown &amp; Box Dims</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Total Boxes</th>
                  <th className="py-3 px-4 whitespace-nowrap">Master Box Dimensions</th>
                  <th className="py-3 px-4 whitespace-nowrap">Carrier &amp; PUC / ASN</th>
                  <th className="py-3 px-4 whitespace-nowrap">Warehouse Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Warehouse Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredOrders
                  .slice((currentPage - 1) * 10, currentPage * 10)
                  .map((po) => {
                  const lineItems =
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

                  const hasOverallDims = Boolean(po.boxDimensions && po.boxDimensions.trim());
                  const isPickedUp = po.pickupStatus === 'YES';

                  return (
                    <tr
                      key={po.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* PO Number & Dates */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onViewPoDetails(po)}
                          className="font-mono font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer block text-left text-xs"
                          title="Click to view full PO details"
                        >
                          {po.poNumber}
                        </button>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Ord: {po.orderDate}
                        </div>
                        {po.poExpiryDate && (
                          <div className="text-[10px] font-mono text-rose-500 mt-0.5">
                            Exp: {po.poExpiryDate}
                          </div>
                        )}
                      </td>

                      {/* Destination Facility */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {po.warehouseName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Appt: {po.appointmentDate || 'N/A'}
                        </div>
                      </td>

                      {/* Separate Products Breakdown with Multi-Box & Weight Summary */}
                      <td className="py-3 px-4 min-w-[320px]">
                        <div className="space-y-1.5">
                          {lineItems.map((item, idx) => {
                            const itemSummary = computeLineItemBoxSummary(item);
                            const hasMultipleBoxes =
                              Array.isArray(item.boxes) && item.boxes.length > 0;
                            return (
                              <div
                                key={idx}
                                className={`p-2 rounded-lg border text-[11px] ${
                                  darkMode
                                    ? 'bg-slate-950/60 border-slate-800/80'
                                    : 'bg-slate-50/80 border-slate-200/80'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                                    {item.itemId}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                      Qty: {item.qty}
                                    </span>
                                    {itemSummary.totalChargeableKg > 0 && (
                                      <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px]">
                                        {itemSummary.totalChargeableKg.toFixed(2)} kg
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[280px]">
                                  {item.itemName}
                                </div>
                                {hasMultipleBoxes ? (
                                  <div className="mt-1.5 space-y-1">
                                    {itemSummary.boxes.map((box, bIdx) => (
                                      <div
                                        key={box.id || bIdx}
                                        className="flex items-center justify-between gap-2 text-[10px] font-mono bg-amber-500/10 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded"
                                      >
                                        <span>
                                          Box {bIdx + 1}
                                          {box.boxCount > 1 ? ` (×${box.boxCount})` : ''}:{' '}
                                          {box.boxDimensions || 'Dim not set'}
                                        </span>
                                        {box.chargeableWeightKg > 0 && (
                                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                            {box.chargeableWeightKg.toFixed(2)} kg
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between gap-2 mt-1 text-[10px]">
                                    <span className="text-slate-500">Box Dim:</span>
                                    <span className="font-mono font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                      {item.boxDimensions || po.boxDimensions || 'Not specified'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* Total Boxes & Total Weight */}
                      <td className="py-3 px-4 text-center whitespace-nowrap font-mono font-bold text-amber-600 dark:text-amber-400">
                        <div>{po.noOfBoxes || 1} Box(es)</div>
                        {(() => {
                          const poTotalWt = lineItems.reduce(
                            (sum, li) => sum + computeLineItemBoxSummary(li).totalChargeableKg,
                            0
                          );
                          return poTotalWt > 0 ? (
                            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                              {poTotalWt.toFixed(2)} kg
                            </div>
                          ) : null;
                        })()}
                      </td>

                      {/* Master Box Dimensions */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        {hasOverallDims ? (
                          <span className="px-2 py-1 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-[11px] border border-amber-500/30">
                            {po.boxDimensions}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
                            Dimensions Required
                          </span>
                        )}
                      </td>

                      {/* Carrier & PUC / ASN */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium">{po.logisticsPortal || 'Logistics Pending'}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {po.pickupTrackingId ? `LR: ${po.pickupTrackingId}` : 'No Tracking ID'}
                        </div>
                        {(po.puc || po.asn) && (
                          <div className="text-[10px] font-mono text-slate-400">
                            {po.puc ? `PUC: ${po.puc}` : ''} {po.asn ? `ASN: ${po.asn}` : ''}
                          </div>
                        )}
                      </td>

                      {/* Warehouse Status Dropdown */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <select
                            value={po.warehouseStatus || 'PENDING'}
                            onChange={(e) =>
                              onWarehouseStatusChange(
                                po,
                                e.target.value as WarehouseStatus
                              )
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors shadow-xs ${
                              (po.warehouseStatus || 'PENDING') === 'PENDING'
                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                                : po.warehouseStatus === 'PROCESSING'
                                ? 'bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300'
                                : po.warehouseStatus === 'READY_FOR_DISPATCH'
                                ? 'bg-purple-500/15 border-purple-500/40 text-purple-700 dark:text-purple-300'
                                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                            }`}
                            title="Warehouse Status: Select 'Picked Up' to immediately move order to Logistics Team"
                          >
                            <option
                              value="PENDING"
                              className="bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 font-semibold"
                            >
                              ⏳ Pending
                            </option>
                            <option
                              value="PROCESSING"
                              className="bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-semibold"
                            >
                              ⚙️ Processing
                            </option>
                            <option
                              value="READY_FOR_DISPATCH"
                              className="bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 font-semibold"
                            >
                              📦 Ready for Dispatch
                            </option>
                            <option
                              value="PICKED_UP"
                              className="bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold"
                            >
                              🚚 Picked Up (Move to Logistics)
                            </option>
                          </select>
                          {(po.pickupStatus === 'YES' || po.warehouseStatus === 'PICKED_UP') && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              ✓ Moved to Logistics
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Warehouse Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Update Box Dimensions button */}
                          <button
                            type="button"
                            onClick={() => handleOpenBoxModal(po)}
                            className="px-2.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                            title="Update dimensions for individual products and total boxes"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Box Dims</span>
                          </button>

                          {/* Mark Packaging Ready & Move to Print/Logistics button */}
                          {onMarkPackagingReady && !isPickedUp && po.packagingStatus !== 'READY' && (
                            <button
                              type="button"
                              onClick={() => onMarkPackagingReady(po)}
                              className="px-2.5 py-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                              title="Mark packaging complete and move PO to Print Team and Logistics Team"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Mark Ready</span>
                            </button>
                          )}

                          {/* Mark Shipment Pickup button */}
                          {!isPickedUp ? (
                            <button
                              type="button"
                              onClick={() => handleOpenPickupModal(po)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                              title="Mark shipment picked up from warehouse"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Mark Picked Up</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenPickupModal(po)}
                              className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium cursor-pointer"
                              title="Update Pickup Logistics Details"
                            >
                              Edit Handover
                            </button>
                          )}

                          {/* Admin Delete PO Button */}
                          {isAdmin && onDeletePo && (
                            <button
                              type="button"
                              onClick={() => onDeletePo(po)}
                              className="p-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
                              title="Admin: Delete Purchase Order"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredOrders.length}
            pageSize={10}
            onPageChange={setCurrentPage}
            darkMode={darkMode}
            itemLabel="warehouse orders"
          />
        </>
      )}
      </div>

      {/* MODAL 1: Multi-Box Packaging & Automatic Weight Calculator */}
      {editingBoxPo && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto"
          onClick={() => setEditingBoxPo(null)}
        >
          <div
            className={`w-full max-w-3xl rounded-2xl shadow-2xl border overflow-hidden my-auto ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-orange-500" />
                <div>
                  <h3 className="font-bold text-sm">
                    Update Box Dimensions &amp; Auto Weight — PO: {editingBoxPo.poNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add multiple boxes per product (+ Add Box). Volumetric &amp; total shipment weight calculate automatically.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBoxPo(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBoxDimensions} className="p-4 sm:p-5 space-y-4 text-xs">
              {/* Master / Overall Package Settings + Live Weight Summary */}
              <div
                className={`p-3.5 rounded-xl border space-y-3 ${
                  darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Overall Master Shipment Summary
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500">
                    Volumetric Formula: (L × W × H cm) ÷ 5000
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">
                      Total Boxes for Shipment (Auto-summed) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={masterBoxCount}
                      onChange={(e) => setMasterBoxCount(Math.max(1, parseInt(e.target.value) || 1))}
                      required
                      className={`w-full px-3 py-1.5 rounded-lg border font-mono outline-none ${
                        darkMode
                          ? 'bg-slate-900 border-slate-700 text-slate-100'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">
                      Master Box Dimensions Summary (Max 100 chars)
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      value={masterBoxDim}
                      onChange={(e) => {
                        setIsMasterDimManual(true);
                        setMasterBoxDim(e.target.value);
                      }}
                      placeholder="Auto-filled from product boxes (e.g. 40x30x20 cm)"
                      className={`w-full px-3 py-1.5 rounded-lg border font-mono outline-none ${
                        darkMode
                          ? 'bg-slate-900 border-slate-700 text-slate-100'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Auto-Calculated Shipment Weight Summary Bar */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div
                    className={`p-2 rounded-lg border ${
                      darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="text-[10px] text-slate-500 font-semibold">Actual Weight</div>
                    <div className="text-sm font-bold font-mono text-slate-700 dark:text-slate-200">
                      {modalWeightTotals.totalActualKg.toFixed(2)} kg
                    </div>
                  </div>
                  <div
                    className={`p-2 rounded-lg border ${
                      darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="text-[10px] text-slate-500 font-semibold">Volumetric Weight</div>
                    <div className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
                      {modalWeightTotals.totalVolumetricKg.toFixed(2)} kg
                    </div>
                  </div>
                  <div className="p-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10">
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                      <Scale className="w-3 h-3" />
                      <span>Total Chargeable Wt</span>
                    </div>
                    <div className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                      {modalWeightTotals.totalChargeableKg.toFixed(2)} kg
                    </div>
                  </div>
                </div>
              </div>

              {/* Individual Product Line Items with Multiple Boxes */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Product Packaging &amp; Multi-Box Weight Calculator
                </h4>

                <div className="space-y-3 max-h-[42vh] overflow-y-auto pr-1">
                  {lineItemsState.map((item, idx) => {
                    const summary = computeLineItemBoxSummary(item);
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border space-y-3 ${
                          darkMode
                            ? 'bg-slate-950/40 border-slate-800'
                            : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        {/* Product Header + Add Box Button */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                                {item.itemId}
                              </span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {item.itemName}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                              <span>
                                Order Qty: <strong className="font-mono">{item.qty} units</strong>
                              </span>
                              <span>·</span>
                              <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                                {summary.totalBoxes} Box(es)
                              </span>
                              <span>·</span>
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                Product Wt: {summary.totalChargeableKg.toFixed(2)} kg
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddBoxToProduct(idx)}
                            className="px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Box</span>
                          </button>
                        </div>

                        {/* Multiple Boxes List for this Product */}
                        <div className="space-y-2">
                          {summary.boxes.map((box, bIdx) => (
                            <div
                              key={box.id || bIdx}
                              className={`p-2.5 rounded-lg border grid grid-cols-1 sm:grid-cols-12 gap-2 items-end ${
                                darkMode
                                  ? 'bg-slate-900/90 border-slate-800'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="sm:col-span-1 flex items-center justify-between sm:justify-center h-full pb-1">
                                <span className="px-2 py-0.5 rounded bg-orange-500/15 text-orange-600 dark:text-orange-400 font-mono font-bold text-[11px]">
                                  #{bIdx + 1}
                                </span>
                                {summary.boxes.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBoxFromProduct(idx, bIdx)}
                                    className="sm:hidden p-1 text-red-500 hover:bg-red-500/10 rounded cursor-pointer"
                                    title="Remove Box"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              <div className="sm:col-span-4">
                                <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                                  Dimensions (L × W × H cm)
                                </label>
                                <input
                                  type="text"
                                  value={box.boxDimensions}
                                  onChange={(e) =>
                                    handleUpdateProductBox(idx, bIdx, {
                                      boxDimensions: e.target.value,
                                    })
                                  }
                                  placeholder="e.g. 40x30x20"
                                  className={`w-full px-2.5 py-1 rounded-lg border font-mono text-xs outline-none ${
                                    darkMode
                                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                                      : 'bg-white border-slate-300 text-slate-900'
                                  }`}
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                                  Box Qty
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  value={box.boxCount}
                                  onChange={(e) =>
                                    handleUpdateProductBox(idx, bIdx, {
                                      boxCount: Math.max(1, parseInt(e.target.value) || 1),
                                    })
                                  }
                                  className={`w-full px-2 py-1 rounded-lg border font-mono text-xs text-center outline-none ${
                                    darkMode
                                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                                      : 'bg-white border-slate-300 text-slate-900'
                                  }`}
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                                  Actual Wt (kg/box)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={box.actualWeightKg === 0 ? '' : box.actualWeightKg}
                                  onChange={(e) =>
                                    handleUpdateProductBox(idx, bIdx, {
                                      actualWeightKg: Math.max(0, parseFloat(e.target.value) || 0),
                                    })
                                  }
                                  placeholder="0.00"
                                  className={`w-full px-2 py-1 rounded-lg border font-mono text-xs outline-none ${
                                    darkMode
                                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                                      : 'bg-white border-slate-300 text-slate-900'
                                  }`}
                                />
                              </div>

                              <div className="sm:col-span-2 flex flex-col justify-center text-right font-mono pb-0.5">
                                <span className="text-[10px] text-blue-600 dark:text-blue-400">
                                  Vol: {box.volumetricWeightKg.toFixed(2)} kg
                                </span>
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                  Tot: {box.chargeableWeightKg.toFixed(2)} kg
                                </span>
                              </div>

                              <div className="hidden sm:flex sm:col-span-1 justify-end pb-1">
                                {summary.boxes.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBoxFromProduct(idx, bIdx)}
                                    className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                                    title="Remove Box"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBoxPo(null)}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingBox}
                  onClick={(e) => handleSaveBoxDimensions(e, false)}
                  className="px-3.5 py-2 rounded-lg border border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingBox ? 'Saving...' : 'Save Boxes & Weights'}</span>
                </button>
                <button
                  type="button"
                  disabled={isSavingBox}
                  onClick={(e) => handleSaveBoxDimensions(e, true)}
                  className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Save dimensions and immediately move to Print and Logistics teams"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSavingBox ? 'Processing...' : '✓ Save & Move to Print/Logistics'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Mark Shipment Picked Up from Warehouse */}
      {pickupTargetPo && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto"
          onClick={() => setPickupTargetPo(null)}
        >
          <div
            className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden my-auto ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-emerald-500/10">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm text-emerald-700 dark:text-emerald-300">
                    Confirm Warehouse Shipment Pickup
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    PO {pickupTargetPo.poNumber} · Destination: {pickupTargetPo.warehouseName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPickupTargetPo(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPickup} className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Shipment Handover to Transporter:</span> Marking this shipment as Picked Up will record the pickup timestamp, update Pickup Status = YES, and shift the order into the <strong>02. In Transit</strong> tracking pipeline.
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">
                  Logistics Carrier / Transporter *
                </label>
                <input
                  type="text"
                  value={pickupCarrier}
                  onChange={(e) => setPickupCarrier(e.target.value)}
                  placeholder="e.g. Smartr, Delhivery, Shadowfax, Dedicated Van"
                  required
                  className={`w-full px-3 py-1.5 rounded-lg border outline-none ${
                    darkMode
                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">
                    Pickup Tracking ID / LR Number *
                  </label>
                  <input
                    type="text"
                    value={pickupTrackingId}
                    onChange={(e) => setPickupTrackingId(e.target.value)}
                    placeholder="e.g. LR-98234789"
                    required
                    className={`w-full px-3 py-1.5 rounded-lg border font-mono outline-none ${
                      darkMode
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">
                    Pickup Date &amp; Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    required
                    className={`w-full px-3 py-1.5 rounded-lg border font-mono outline-none ${
                      darkMode
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">
                    PUC Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={pickupPuc}
                    onChange={(e) => setPickupPuc(e.target.value)}
                    placeholder="e.g. PUC-4029"
                    className={`w-full px-3 py-1.5 rounded-lg border font-mono outline-none ${
                      darkMode
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">
                    ASN Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={pickupAsn}
                    onChange={(e) => setPickupAsn(e.target.value)}
                    placeholder="e.g. ASN-8839"
                    className={`w-full px-3 py-1.5 rounded-lg border font-mono outline-none ${
                      darkMode
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">
                  Warehouse Handover Remarks (Optional)
                </label>
                <textarea
                  value={pickupRemarks}
                  onChange={(e) => setPickupRemarks(e.target.value)}
                  placeholder="e.g. Handed 4 boxes to driver with invoice & seal intact."
                  rows={2}
                  className={`w-full px-3 py-1.5 rounded-lg border outline-none ${
                    darkMode
                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPickupTargetPo(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPickup}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isSavingPickup ? 'Marking Handover...' : 'Confirm Shipment Picked Up'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
