import React, { useState, useMemo, useEffect } from 'react';
import {
  RotateCcw,
  Truck,
  Package,
  PackageCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Plus,
  Edit3,
  Calendar,
  Building2,
  FileSpreadsheet,
  FileText,
  Download,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { PurchaseOrder, TeamRole } from '../types';
import { Pagination } from './Pagination';

interface RtoTrackerTabProps {
  rtoList: PurchaseOrder[];
  allPurchaseOrders: PurchaseOrder[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenRtoModal: (po: PurchaseOrder) => void;
  onQuickTogglePicked: (po: PurchaseOrder, status: 'YES' | 'NO' | 'PENDING') => Promise<void>;
  onQuickToggleWhReceived: (po: PurchaseOrder, received: 'YES' | 'NO') => Promise<void>;
  onRevertFromRto: (po: PurchaseOrder) => Promise<void>;
  onEditPo: (po: PurchaseOrder) => void;
  onViewPoDetails?: (po: PurchaseOrder) => void;
  darkMode: boolean;
  isGrey: boolean;
  userRole: TeamRole;
}

export const RtoTrackerTab: React.FC<RtoTrackerTabProps> = ({
  rtoList,
  allPurchaseOrders,
  searchQuery,
  onSearchChange,
  onOpenRtoModal,
  onQuickTogglePicked,
  onQuickToggleWhReceived,
  onRevertFromRto,
  onEditPo,
  onViewPoDetails,
  darkMode,
  isGrey,
  userRole,
}) => {
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'PICKED' | 'RECEIVED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [isInitiateModalOpen, setIsInitiateModalOpen] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [selectedReason, setSelectedReason] = useState('Appointment Rejected / Gate Entry Denied');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterTab, searchQuery]);

  const canManage =
    userRole === 'admin' ||
    userRole === 'backoffice' ||
    userRole === 'logistics' ||
    userRole === 'warehouse';

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = rtoList.length;
    const pending = rtoList.filter((p) => (p.rtoPickedStatus || 'PENDING') === 'PENDING').length;
    const pickedInTransit = rtoList.filter(
      (p) => p.rtoPickedStatus === 'YES' && p.rtoReceivedAtWh !== 'YES'
    ).length;
    const received = rtoList.filter((p) => p.rtoReceivedAtWh === 'YES').length;
    return { total, pending, pickedInTransit, received };
  }, [rtoList]);

  // Filtered RTO list
  const filteredList = useMemo(() => {
    return rtoList.filter((po) => {
      if (filterTab === 'PENDING') {
        return (po.rtoPickedStatus || 'PENDING') === 'PENDING';
      }
      if (filterTab === 'PICKED') {
        return po.rtoPickedStatus === 'YES' && po.rtoReceivedAtWh !== 'YES';
      }
      if (filterTab === 'RECEIVED') {
        return po.rtoReceivedAtWh === 'YES';
      }
      return true;
    });
  }, [rtoList, filterTab]);

  // Non-RTO POs available for initiating RTO
  const nonRtoPos = useMemo(() => {
    return allPurchaseOrders.filter(
      (p) =>
        !p.isRto &&
        (p.status || '').toUpperCase() !== 'RTO' &&
        !(p.status || '').toUpperCase().startsWith('RTO')
    );
  }, [allPurchaseOrders]);

  const copyToClipboard = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStartInitiate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoId) return;
    const target = allPurchaseOrders.find((p) => p.id === selectedPoId);
    if (target) {
      setIsInitiateModalOpen(false);
      onOpenRtoModal({
        ...target,
        rtoReason: selectedReason,
        isRto: true,
        status: 'RTO',
        rtoPickedStatus: 'PENDING',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Summary Banner */}
      <div
        className={`p-4 sm:p-5 rounded-xl border ${
          darkMode
            ? 'bg-slate-900 border-slate-800'
            : isGrey
            ? 'bg-zinc-100 border-zinc-300'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>RTO (Return to Origin) & Reverse Logistics</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-700 dark:text-orange-300 font-mono font-bold">
                  {metrics.total} Active
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Centralized reverse logistics control for Instamart Darkstore gate rejections, missed appointment windows, packaging damages, return courier AWB tracking, and origin warehouse receipts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPoId(nonRtoPos[0]?.id || '');
                  setIsInitiateModalOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Initiate RTO for PO</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Metrics 4-Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/50">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Total RTO Shipments</span>
              <RotateCcw className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums mt-1 text-orange-600 dark:text-orange-400">
              {metrics.total}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Total reverse orders</div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/50">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Pending Hub Pickup</span>
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums mt-1 text-amber-600 dark:text-amber-400">
              {metrics.pending}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Awaiting courier pickup</div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/50">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>In Return Transit</span>
              <Truck className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums mt-1 text-blue-600 dark:text-blue-400">
              {metrics.pickedInTransit}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Picked & en route to origin</div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/50">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Received at WH</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">
              {metrics.received}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Safely returned & inwarded</div>
          </div>
        </div>
      </div>

      {/* 3. Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filterTab === 'ALL'
                ? 'bg-orange-600 text-white shadow-xs'
                : darkMode
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            All RTO ({metrics.total})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filterTab === 'PENDING'
                ? 'bg-amber-600 text-white shadow-xs'
                : darkMode
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            ⏳ Pending Pickup ({metrics.pending})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('PICKED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filterTab === 'PICKED'
                ? 'bg-blue-600 text-white shadow-xs'
                : darkMode
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            🚚 In Return Transit ({metrics.pickedInTransit})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('RECEIVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filterTab === 'RECEIVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : darkMode
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            ✓ Inwarded at WH ({metrics.received})
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search PO, Tracking, Courier, Warehouse..."
            className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 ${
              darkMode
                ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500'
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>
      </div>

      {/* 4. Table / Content Area */}
      <div
        className={`rounded-xl border overflow-hidden ${
          darkMode
            ? 'bg-slate-900 border-slate-800'
            : isGrey
            ? 'bg-zinc-100 border-zinc-300'
            : 'bg-white border-slate-200'
        }`}
      >
        {filteredList.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
              {rtoList.length === 0
                ? 'No Return to Origin (RTO) Shipments Logged Yet'
                : 'No RTO Shipments Match Your Current Filter'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              When an order is rejected at an Instamart hub gate, has a missed appointment, or needs reverse logistics back to origin, mark it as RTO to track courier pickups and warehouse inwarding.
            </p>

            {canManage && nonRtoPos.length > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPoId(nonRtoPos[0]?.id || '');
                    setIsInitiateModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Select an Existing PO to Route to RTO</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr
                    className={`border-b font-semibold ${
                      darkMode
                        ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <th className="py-3 px-4 whitespace-nowrap">PO Number & Date</th>
                    <th className="py-3 px-4 whitespace-nowrap">Warehouse Destination</th>
                    <th className="py-3 px-4 whitespace-nowrap">SKU & Total Qty</th>
                    <th className="py-3 px-4 whitespace-nowrap">RTO Reason & Remarks</th>
                    <th className="py-3 px-4 whitespace-nowrap">RTO Courier & Tracking ID</th>
                    <th className="py-3 px-4 whitespace-nowrap">Pick Date</th>
                    <th className="py-3 px-4 whitespace-nowrap text-center">RTO Picked Status</th>
                    <th className="py-3 px-4 whitespace-nowrap text-center">Origin WH Received</th>
                    <th className="py-3 px-4 whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredList
                    .slice((currentPage - 1) * 10, currentPage * 10)
                    .map((po) => {
                  const isPicked = po.rtoPickedStatus === 'YES';
                  const isPending = (po.rtoPickedStatus || 'PENDING') === 'PENDING';
                  const isWhReceived = po.rtoReceivedAtWh === 'YES';

                  return (
                    <tr
                      key={po.id}
                      className={`transition-colors ${
                        isWhReceived
                          ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                          : isPicked
                          ? 'bg-blue-500/5 hover:bg-blue-500/10'
                          : 'hover:bg-slate-500/5'
                      }`}
                    >
                      {/* PO Number & Order Date */}
                      <td className="py-3 px-4">
                        <div className="font-bold font-mono">
                          {onViewPoDetails ? (
                            <button
                              type="button"
                              onClick={() => onViewPoDetails(po)}
                              className="text-orange-600 dark:text-orange-400 hover:underline cursor-pointer text-left"
                              title="Click to view PO details"
                            >
                              {po.poNumber}
                            </button>
                          ) : (
                            <span className="text-orange-600 dark:text-orange-400">
                              {po.poNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{po.orderDate}</span>
                        </div>
                        {po.invoiceNo && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Inv: #{po.invoiceNo}
                          </div>
                        )}
                      </td>

                      {/* Warehouse Destination */}
                      <td className="py-3 px-4">
                        <div className="font-semibold flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[160px]">{po.warehouseName}</span>
                        </div>
                        {po.appointmentId && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Appt: {po.appointmentId}
                          </div>
                        )}
                      </td>

                      {/* SKU & Total Qty */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                          {po.itemName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Qty: <span className="font-bold text-slate-700 dark:text-slate-300">{po.totalQty}</span> units
                          {po.noOfBoxes > 0 && ` (${po.noOfBoxes} boxes)`}
                        </div>
                      </td>

                      {/* RTO Reason */}
                      <td className="py-3 px-4">
                        <div className="px-2 py-0.5 rounded-md inline-flex items-center gap-1 text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 max-w-[200px] truncate">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span className="truncate">{po.rtoReason || 'Appointment Rejected'}</span>
                        </div>
                        {po.rtoRemarks && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[200px] truncate" title={po.rtoRemarks}>
                            {po.rtoRemarks}
                          </div>
                        )}
                      </td>

                      {/* Courier & Tracking ID */}
                      <td className="py-3 px-4">
                        {po.rtoTrackingId ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-slate-200">
                              <span>{po.rtoTrackingId}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(po.rtoTrackingId || '', po.id)}
                                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                title="Copy Tracking ID"
                              >
                                {copiedId === po.id ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Truck className="w-3 h-3 text-blue-500" />
                              <span>{po.rtoCourierPartner || 'Courier Carrier'}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No Tracking ID</span>
                        )}
                      </td>

                      {/* Pick Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {po.rtoPickDate ? (
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {po.rtoPickDate}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Pending Date</span>
                        )}
                      </td>

                      {/* RTO Picked Status - Quick Click Buttons */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
                          <button
                            type="button"
                            disabled={!canManage}
                            onClick={() => onQuickTogglePicked(po, 'PENDING')}
                            className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                              isPending
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                            title="Mark as Awaiting Pickup"
                          >
                            Pending
                          </button>
                          <button
                            type="button"
                            disabled={!canManage}
                            onClick={() => onQuickTogglePicked(po, 'YES')}
                            className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                              isPicked
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                            title="Mark as Physically Picked"
                          >
                            ✓ Picked
                          </button>
                          <button
                            type="button"
                            disabled={!canManage}
                            onClick={() => onQuickTogglePicked(po, 'NO')}
                            className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                              po.rtoPickedStatus === 'NO'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                            title="Mark as Not Picked"
                          >
                            ✕ No
                          </button>
                        </div>
                      </td>

                      {/* Origin WH Received - Quick Click Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          disabled={!canManage}
                          onClick={() => onQuickToggleWhReceived(po, isWhReceived ? 'NO' : 'YES')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                            isWhReceived
                              ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-500'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-500 hover:text-white'
                          }`}
                          title="Click to toggle WH receipt status"
                        >
                          {isWhReceived ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Received at WH</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              <span>Still in Transit</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenRtoModal(po)}
                            className="px-2.5 py-1.5 rounded-lg border border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer hover:bg-orange-500/20"
                            title="Edit RTO tracking and return details"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit RTO</span>
                          </button>

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to remove PO ${po.poNumber} from RTO and restore it to regular In Transit tracking?`)) {
                                  onRevertFromRto(po);
                                }
                              }}
                              className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs cursor-pointer"
                              title="Revert / Remove from RTO"
                            >
                              Revert
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
            totalItems={filteredList.length}
            pageSize={10}
            onPageChange={setCurrentPage}
            darkMode={darkMode}
            itemLabel="RTO shipments"
          />
        </>
      )}
    </div>

      {/* Quick Initiate RTO Dialog */}
      {isInitiateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl p-5 space-y-4 ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <RotateCcw className="w-4 h-4" />
                <span>Initiate Return to Origin (RTO)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsInitiateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStartInitiate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Select Purchase Order to Route to RTO *
                </label>
                <select
                  value={selectedPoId}
                  onChange={(e) => setSelectedPoId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-xs ${
                    darkMode
                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                  required
                >
                  <option value="">-- Choose a Purchase Order --</option>
                  {nonRtoPos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.poNumber} — {p.warehouseName} ({p.itemName.slice(0, 30)}, Qty: {p.totalQty}) [{p.workflowStage}]
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Choose from any active PO in Entry, Logistics, or In-Transit.
                </p>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Primary Reason for RTO Rejection *
                </label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-xs ${
                    darkMode
                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="Appointment Rejected / Gate Entry Denied">
                    Appointment Rejected / Gate Entry Denied
                  </option>
                  <option value="Warehouse Gate Closed / Time Window Missed">
                    Warehouse Gate Closed / Time Window Missed
                  </option>
                  <option value="WFA Expired / Delivery Reschedule Limit Exceeded">
                    WFA Expired / Delivery Reschedule Limit Exceeded
                  </option>
                  <option value="Damaged Goods / Packaging QC Rejected">
                    Damaged Goods / Packaging QC Rejected
                  </option>
                  <option value="PO Expired before Vehicle Arrival">
                    PO Expired before Vehicle Arrival
                  </option>
                  <option value="Excess Qty / Item Mismatch at Inward Gate">
                    Excess Qty / Item Mismatch at Inward Gate
                  </option>
                  <option value="Vendor Self-Recall / Order Cancelled">
                    Vendor Self-Recall / Order Cancelled
                  </option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInitiateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedPoId}
                  className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Continue to RTO Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
