import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Plus,
  Edit3,
  Calendar,
  Building2,
  ChevronRight,
  ExternalLink,
  History,
  X,
  Save,
  Check,
} from 'lucide-react';
import { PurchaseOrder, PaymentStatus, PaymentTransaction, TeamRole } from '../types';
import { calculatePaymentDetails, computePaymentLedgerMetrics, formatINR } from '../utils/paymentUtils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PaymentTrackerTabProps {
  purchaseOrders: PurchaseOrder[];
  onUpdatePayment: (
    poId: string,
    updates: {
      totalAmount?: number;
      paidAmount: number;
      paymentStatus: PaymentStatus;
      paymentNotes?: string;
      newTransaction?: Omit<PaymentTransaction, 'id' | 'createdAt'>;
    }
  ) => Promise<void>;
  onEditPo: (po: PurchaseOrder) => void;
  darkMode: boolean;
  isGrey: boolean;
  userRole: TeamRole;
}

export const PaymentTrackerTab: React.FC<PaymentTrackerTabProps> = ({
  purchaseOrders,
  onUpdatePayment,
  onEditPo,
  darkMode,
  isGrey,
  userRole,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERDUE' | 'PARTIAL' | 'PENDING' | 'PAID'>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'OVERDUE_DESC' | 'DUE_DESC' | 'AMOUNT_DESC' | 'DATE_DESC'>('OVERDUE_DESC');

  // Payment Recording Modal State
  const [activePaymentPo, setActivePaymentPo] = useState<PurchaseOrder | null>(null);
  const [paymentFormAmount, setPaymentFormAmount] = useState<number>(0);
  const [paymentFormMethod, setPaymentFormMethod] = useState<PaymentTransaction['paymentMethod']>('BANK_TRANSFER');
  const [paymentFormRef, setPaymentFormRef] = useState('');
  const [paymentFormDate, setPaymentFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentFormNotes, setPaymentFormNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Quick Amount Edit Modal State
  const [editingAmountPo, setEditingAmountPo] = useState<PurchaseOrder | null>(null);
  const [editTotalAmountValue, setEditTotalAmountValue] = useState<number>(0);

  // Payment History Modal State
  const [historyPo, setHistoryPo] = useState<PurchaseOrder | null>(null);

  // Compute Overall Metrics
  const metrics = useMemo(() => computePaymentLedgerMetrics(purchaseOrders), [purchaseOrders]);

  // Unique Warehouses for Filter
  const warehouses = useMemo(() => {
    const set = new Set<string>();
    purchaseOrders.forEach((po) => {
      if (po.warehouseName?.trim()) set.add(po.warehouseName.trim());
    });
    return Array.from(set).sort();
  }, [purchaseOrders]);

  // Enriched POs with financial details
  const enrichedPos = useMemo(() => {
    return purchaseOrders.map((po) => {
      const details = calculatePaymentDetails(po);
      return {
        po,
        details,
      };
    });
  }, [purchaseOrders]);

  // Filtered and Sorted POs
  const filteredPos = useMemo(() => {
    return enrichedPos
      .filter(({ po, details }) => {
        // Status filter
        if (statusFilter === 'OVERDUE' && !details.isOverdue) return false;
        if (statusFilter === 'PARTIAL' && !details.isPartial) return false;
        if (statusFilter === 'PENDING' && !details.isPending) return false;
        if (statusFilter === 'PAID' && !details.isPaid) return false;

        // Warehouse filter
        if (warehouseFilter !== 'ALL' && po.warehouseName !== warehouseFilter) return false;

        // Search
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchPo = po.poNumber.toLowerCase().includes(q);
          const matchInv = (po.invoiceNo || '').toLowerCase().includes(q);
          const matchWh = (po.warehouseName || '').toLowerCase().includes(q);
          const matchItem = (po.itemName || '').toLowerCase().includes(q) || (po.itemId || '').toLowerCase().includes(q);
          if (!matchPo && !matchInv && !matchWh && !matchItem) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'OVERDUE_DESC') {
          if (a.details.isOverdue && !b.details.isOverdue) return -1;
          if (!a.details.isOverdue && b.details.isOverdue) return 1;
          return b.details.overdueDays - a.details.overdueDays;
        }
        if (sortBy === 'DUE_DESC') {
          return b.details.dueAmount - a.details.dueAmount;
        }
        if (sortBy === 'AMOUNT_DESC') {
          return b.details.totalAmount - a.details.totalAmount;
        }
        if (sortBy === 'DATE_DESC') {
          return (b.po.orderDate || '').localeCompare(a.po.orderDate || '');
        }
        return 0;
      });
  }, [enrichedPos, statusFilter, warehouseFilter, searchTerm, sortBy]);

  // Open Payment Modal
  const handleOpenPaymentModal = (po: PurchaseOrder) => {
    const details = calculatePaymentDetails(po);
    setActivePaymentPo(po);
    setPaymentFormAmount(details.dueAmount); // default to remaining due
    setPaymentFormMethod('BANK_TRANSFER');
    setPaymentFormRef('');
    setPaymentFormDate(new Date().toISOString().slice(0, 10));
    setPaymentFormNotes('');
  };

  // Submit Payment Record
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaymentPo) return;

    const details = calculatePaymentDetails(activePaymentPo);
    const addAmount = Number(paymentFormAmount) || 0;
    if (addAmount <= 0) return;

    setIsSubmittingPayment(true);
    try {
      const newPaidTotal = details.paidAmount + addAmount;
      const isNowFullyPaid = newPaidTotal >= details.totalAmount && details.totalAmount > 0;
      const newStatus: PaymentStatus = isNowFullyPaid ? 'PAID' : 'PARTIAL';

      await onUpdatePayment(activePaymentPo.id, {
        totalAmount: details.totalAmount,
        paidAmount: newPaidTotal,
        paymentStatus: newStatus,
        paymentNotes: paymentFormNotes.trim(),
        newTransaction: {
          amount: addAmount,
          date: paymentFormDate,
          paymentMethod: paymentFormMethod,
          referenceNo: paymentFormRef.trim() || undefined,
          notes: paymentFormNotes.trim() || undefined,
        },
      });

      setActivePaymentPo(null);
    } catch (err) {
      console.error('Payment record failed:', err);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Quick Status Change from Dropdown
  const handleQuickStatusChange = async (po: PurchaseOrder, newStatus: PaymentStatus) => {
    const details = calculatePaymentDetails(po);
    let newPaid = details.paidAmount;

    if (newStatus === 'PAID') {
      newPaid = details.totalAmount;
    } else if (newStatus === 'PENDING') {
      newPaid = 0;
    }

    await onUpdatePayment(po.id, {
      totalAmount: details.totalAmount,
      paidAmount: newPaid,
      paymentStatus: newStatus,
    });
  };

  // Save edited Total PO amount
  const handleSaveTotalAmount = async () => {
    if (!editingAmountPo) return;
    const details = calculatePaymentDetails(editingAmountPo);
    const newTotal = Number(editTotalAmountValue) || 0;
    const isNowPaid = details.paidAmount >= newTotal && newTotal > 0;

    await onUpdatePayment(editingAmountPo.id, {
      totalAmount: newTotal,
      paidAmount: details.paidAmount,
      paymentStatus: isNowPaid ? 'PAID' : details.paidAmount > 0 ? 'PARTIAL' : 'PENDING',
    });

    setEditingAmountPo(null);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredPos.map(({ po, details }) => ({
      'PO Number': po.poNumber,
      'Order Date': po.orderDate,
      'Payment Due Date': details.dueDate,
      'Days Elapsed': details.daysElapsed,
      'Overdue (>30 Days)': details.isOverdue ? `YES (${details.overdueDays} days overdue)` : 'NO',
      'Warehouse': po.warehouseName,
      'Invoice No': po.invoiceNo || 'N/A',
      'Ordered Qty': po.totalQty,
      'Total PO Value (INR)': details.totalAmount,
      'Paid Amount (INR)': details.paidAmount,
      'Outstanding Due (INR)': details.dueAmount,
      'Paid %': `${details.progressPercent}%`,
      'Payment Status': details.statusLabel,
      'Workflow Stage': po.workflowStage,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'PO Payments Ledger');
    XLSX.writeFile(wb, `Instamart_PO_Payments_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export to PDF
  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFontSize(14);
    doc.text('Instamart PO Financials & Payment Ledger', 40, 36);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      `Generated: ${new Date().toLocaleString()} · Total Billed: ${formatINR(metrics.totalBilled)} · Total Paid: ${formatINR(metrics.totalCollected)} · Overdue (>30 Days): ${formatINR(metrics.totalOverdueAmount)} (${metrics.overdueCount} POs)`,
      40,
      52
    );

    autoTable(doc, {
      startY: 65,
      head: [
        [
          'PO Number',
          'Order Date',
          'Warehouse',
          'Invoice No',
          'Total Value',
          'Paid Amount',
          'Pending Due',
          'Overdue Status',
          'Status',
        ],
      ],
      body: filteredPos.map(({ po, details }) => [
        po.poNumber,
        po.orderDate,
        po.warehouseName,
        po.invoiceNo || 'N/A',
        formatINR(details.totalAmount),
        formatINR(details.paidAmount),
        formatINR(details.dueAmount),
        details.isOverdue ? `🚨 ${details.overdueDays}d Overdue` : 'Within Term',
        details.statusLabel,
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    });

    doc.save(`Instamart_PO_Payments_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Header & Quick Export Controls */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          darkMode ? 'bg-slate-900 border-slate-800' : isGrey ? 'bg-zinc-100 border-zinc-300' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                PO Payments & Financial Tracker
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400">
                {purchaseOrders.length} POs Tracked
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Automated 1-month payment term tracking from GRN Date · Partition/Partial payments · Instant Overdue Alerts & Financial Ledger
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              darkMode
                ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Export Excel</span>
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              darkMode
                ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4 text-red-500" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* 2. Critical Overdue Notice Banner (if any POs > 30 days overdue) */}
      {metrics.overdueCount > 0 && (
        <div className="p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500 text-white shrink-0 animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2">
                <span>Immediate Payment Action Required:</span>
                <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[11px] font-mono">
                  {metrics.overdueCount} POs OVERDUE (&gt;30 Days)
                </span>
              </div>
              <p className="text-xs mt-0.5 opacity-90">
                Total Overdue Amount: <strong>{formatINR(metrics.totalOverdueAmount)}</strong>. Suppliers/Vendors require prompt payment follow-up or clearance.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('OVERDUE')}
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold whitespace-nowrap self-start sm:self-auto transition-colors cursor-pointer"
          >
            Filter Overdue POs ({metrics.overdueCount})
          </button>
        </div>
      )}

      {/* 3. Financial KPI Metrics Strip */}
      <div
        className={`grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 p-4 rounded-2xl border ${
          darkMode ? 'bg-slate-900 border-slate-800' : isGrey ? 'bg-zinc-100 border-zinc-300' : 'bg-white border-slate-200'
        }`}
      >
        {/* Metric 1: Total Billed */}
        <div className="pr-3 border-r border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Invoiced Amount</div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {formatINR(metrics.totalBilled)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across {purchaseOrders.length} POs</div>
        </div>

        {/* Metric 2: Total Paid / Collected */}
        <div className="pr-3 sm:border-r border-slate-200 dark:border-slate-800">
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Total Paid / Cleared</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {formatINR(metrics.totalCollected)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {metrics.collectionRate}% Recovered · {metrics.fullyPaidCount} Fully Paid
          </div>
        </div>

        {/* Metric 3: Total Outstanding Balance */}
        <div className="pr-3 border-r border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Pending Due</div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {formatINR(metrics.totalOutstanding)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {metrics.pendingCount} Pending + {metrics.partialCount} Partial
          </div>
        </div>

        {/* Metric 4: Overdue Liability (> 30 Days) */}
        <div className="pr-3 lg:border-r border-slate-200 dark:border-slate-800">
          <div className="text-xs text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Overdue (&gt;30 Days)</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-red-600 dark:text-red-400 mt-1">
            {formatINR(metrics.totalOverdueAmount)}
          </div>
          <div className="text-[11px] text-red-500 font-medium mt-0.5">
            {metrics.overdueCount} POs Exceeded 30-Day Term
          </div>
        </div>

        {/* Metric 5: Partition / Partial Pay POs */}
        <div className="col-span-2 lg:col-span-1">
          <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Partial (Partition) Pay</div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-purple-600 dark:text-purple-400 mt-1">
            {formatINR(metrics.partialDueAmount)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {metrics.partialCount} POs in Installment Plans
          </div>
        </div>
      </div>

      {/* 4. Search & Filter Bar */}
      <div
        className={`p-3.5 sm:p-4 rounded-2xl border space-y-3 ${
          darkMode ? 'bg-slate-900 border-slate-800' : isGrey ? 'bg-zinc-100 border-zinc-300' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search PO number, invoice, warehouse, SKU item..."
              className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border transition-colors outline-hidden ${
                darkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-orange-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-orange-500'
              }`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Warehouse Filter */}
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs border font-medium outline-hidden cursor-pointer ${
                darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-700'
              }`}
            >
              <option value="ALL">All Warehouses ({warehouses.length})</option>
              {warehouses.map((wh) => (
                <option key={wh} value={wh}>
                  {wh}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={`px-3 py-2 rounded-xl text-xs border font-medium outline-hidden cursor-pointer ${
                darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-700'
              }`}
            >
              <option value="OVERDUE_DESC">Sort: Most Overdue First</option>
              <option value="DUE_DESC">Sort: Highest Due Amount</option>
              <option value="AMOUNT_DESC">Sort: Highest Total Value</option>
              <option value="DATE_DESC">Sort: Recent Order Date</option>
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            All POs ({purchaseOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('OVERDUE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'OVERDUE'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Overdue &gt;1 Mo ({metrics.overdueCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PARTIAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'PARTIAL'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Partial Paid ({metrics.partialCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Unpaid ({metrics.pendingCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PAID')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'PAID'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Fully Paid ({metrics.fullyPaidCount})</span>
          </button>
        </div>
      </div>

      {/* 5. PO Payments Data Table & Cards */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          darkMode ? 'bg-slate-900 border-slate-800' : isGrey ? 'bg-zinc-100 border-zinc-300' : 'bg-white border-slate-200'
        }`}
      >
        {filteredPos.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold">No Purchase Orders Found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No PO records match your filter criteria. Try clearing search or selecting a different status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr
                  className={`border-b ${
                    darkMode
                      ? 'bg-slate-950/70 border-slate-800 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <th className="py-3 px-4 font-bold">PO Number &amp; Age</th>
                  <th className="py-3 px-4 font-bold">Warehouse / Hub</th>
                  <th className="py-3 px-4 font-bold">Total PO Value (₹)</th>
                  <th className="py-3 px-4 font-bold">Paid Amount (₹)</th>
                  <th className="py-3 px-4 font-bold">Outstanding Due (₹)</th>
                  <th className="py-3 px-4 font-bold">Payment Status</th>
                  <th className="py-3 px-4 font-bold">Term / Aging</th>
                  <th className="py-3 px-4 font-bold text-right">Payment Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-sans">
                {filteredPos.map(({ po, details }) => {
                  const hasHistory = Array.isArray(po.paymentHistory) && po.paymentHistory.length > 0;

                  return (
                    <tr
                      key={po.id}
                      className={`transition-colors ${
                        details.isOverdue
                          ? darkMode
                            ? 'bg-red-950/20 hover:bg-red-950/30'
                            : 'bg-red-50/60 hover:bg-red-100/50'
                          : darkMode
                          ? 'hover:bg-slate-800/40'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* PO Number & Order Date */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onEditPo(po)}
                            className="font-mono font-bold text-orange-600 dark:text-orange-400 hover:underline text-xs"
                          >
                            {po.poNumber}
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Order: {po.orderDate} · {details.daysElapsed}d ago
                        </div>
                        {po.invoiceNo && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            Inv: {po.invoiceNo}
                          </div>
                        )}
                      </td>

                      {/* Warehouse / Hub */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">
                          {po.warehouseName}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                          {po.itemName} ({po.totalQty} units)
                        </div>
                      </td>

                      {/* Total PO Value */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{formatINR(details.totalAmount)}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAmountPo(po);
                              setEditTotalAmountValue(details.totalAmount);
                            }}
                            title="Edit PO Amount"
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                        {!details.hasExplicitAmount && (
                          <span className="text-[9px] font-normal text-amber-500 uppercase tracking-wide block">
                            (Estimated by Qty)
                          </span>
                        )}
                      </td>

                      {/* Paid Amount & Progress Bar */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatINR(details.paidAmount)}
                        </div>
                        <div className="w-24 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              details.isPaid
                                ? 'bg-emerald-500'
                                : details.isOverdue
                                ? 'bg-red-500'
                                : 'bg-orange-500'
                            }`}
                            style={{ width: `${details.progressPercent}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {details.progressPercent}% Cleared
                        </div>
                      </td>

                      {/* Outstanding Due / Overdue Amount */}
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {details.dueAmount > 0 ? (
                          <span
                            className={
                              details.isOverdue
                                ? 'text-red-600 dark:text-red-400 text-sm font-extrabold'
                                : 'text-amber-600 dark:text-amber-400'
                            }
                          >
                            {formatINR(details.dueAmount)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 text-xs">
                            ₹0 (Settled)
                          </span>
                        )}
                        {details.isOverdue && (
                          <div className="text-[10px] font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wide">
                            🚨 Overdue Due!
                          </div>
                        )}
                      </td>

                      {/* Payment Status Badge */}
                      <td className="py-3.5 px-4">
                        {details.isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Fully Paid</span>
                          </span>
                        ) : details.isOverdue ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-red-600 text-white shadow-xs">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>OVERDUE</span>
                            </span>
                            <div className="text-[10px] text-red-600 dark:text-red-400 font-bold">
                              {details.overdueDays} days past term
                            </div>
                          </div>
                        ) : details.isPartial ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>Partition Paid</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      {/* Term & Aging */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {details.hasGrn && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            GRN: {details.grnDate}
                          </div>
                        )}
                        <div className="text-slate-700 dark:text-slate-300 font-semibold">
                          Due: {details.dueDate}
                        </div>
                        <div
                          className={`text-[11px] font-medium ${
                            details.isOverdue
                              ? 'text-red-600 dark:text-red-400 font-bold'
                              : 'text-slate-400'
                          }`}
                        >
                          {details.isOverdue
                            ? `Overdue: ${details.overdueDays}d past 1 month`
                            : details.hasGrn
                            ? `${Math.max(0, 30 - details.daysElapsed)}d left in 1-mo term`
                            : 'Pending GRN'}
                        </div>
                      </td>

                      {/* Payment Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Record Payment Button */}
                          {details.dueAmount > 0 && (
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentModal(po)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Pay</span>
                            </button>
                          )}

                          {/* Quick Status Dropdown */}
                          <select
                            value={po.paymentStatus || (details.isPaid ? 'PAID' : details.isPartial ? 'PARTIAL' : 'PENDING')}
                            onChange={(e) => handleQuickStatusChange(po, e.target.value as PaymentStatus)}
                            className={`px-2 py-1.5 rounded-lg text-xs font-semibold border outline-hidden cursor-pointer ${
                              darkMode
                                ? 'bg-slate-950 border-slate-700 text-slate-200'
                                : 'bg-white border-slate-300 text-slate-700'
                            }`}
                          >
                            <option value="PENDING">Pending</option>
                            <option value="PARTIAL">Partial</option>
                            <option value="PAID">Paid</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>

                          {/* View Payment History */}
                          {hasHistory && (
                            <button
                              type="button"
                              onClick={() => setHistoryPo(po)}
                              title="View Payment Installments & History"
                              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                            >
                              <History className="w-4 h-4 text-purple-500" />
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
        )}
      </div>

      {/* 6. Record Payment Modal (Partition / Full Pay) */}
      {activePaymentPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div
              className={`p-4 border-b flex items-center justify-between ${
                darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Record Payment</h3>
                  <p className="text-[11px] text-slate-400 font-mono">PO: {activePaymentPo.poNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePaymentPo(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitPayment} className="p-5 space-y-4">
              {/* Financial Summary Card */}
              {(() => {
                const det = calculatePaymentDetails(activePaymentPo);
                const nextPaid = det.paidAmount + (Number(paymentFormAmount) || 0);
                const nextDue = Math.max(0, det.totalAmount - nextPaid);

                return (
                  <div
                    className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                      darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Total PO Value:</span>
                      <strong className="font-mono text-slate-900 dark:text-white">
                        {formatINR(det.totalAmount)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Already Paid:</span>
                      <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                        {formatINR(det.paidAmount)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Current Outstanding Due:</span>
                      <strong className="font-mono text-red-600 dark:text-red-400">
                        {formatINR(det.dueAmount)}
                      </strong>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between font-bold">
                      <span className="text-slate-700 dark:text-slate-300">Remaining After This Payment:</span>
                      <span className={`font-mono ${nextDue === 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {formatINR(nextDue)} {nextDue === 0 ? '(Fully Paid!)' : ''}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Payment Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min={1}
                    required
                    value={paymentFormAmount || ''}
                    onChange={(e) => setPaymentFormAmount(Number(e.target.value))}
                    className={`w-full pl-7 pr-3 py-2 rounded-xl text-xs border font-mono font-bold text-emerald-600 dark:text-emerald-400 outline-hidden ${
                      darkMode ? 'bg-slate-950 border-slate-800 focus:border-emerald-500' : 'bg-white border-slate-300 focus:border-emerald-500'
                    }`}
                  />
                </div>

                {/* Quick partition preset buttons */}
                {(() => {
                  const det = calculatePaymentDetails(activePaymentPo);
                  return (
                    <div className="flex items-center gap-1.5 mt-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setPaymentFormAmount(det.dueAmount)}
                        className="px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer"
                      >
                        Full Due ({formatINR(det.dueAmount)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentFormAmount(Math.round(det.dueAmount / 2))}
                        className="px-2 py-0.5 rounded border border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold cursor-pointer"
                      >
                        50% Partition ({formatINR(Math.round(det.dueAmount / 2))})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentFormAmount(Math.round(det.dueAmount / 4))}
                        className="px-2 py-0.5 rounded border border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold cursor-pointer"
                      >
                        25%
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentFormMethod}
                  onChange={(e) => setPaymentFormMethod(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border font-medium outline-hidden cursor-pointer ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                  <option value="OTHER">Other Reference</option>
                </select>
              </div>

              {/* Transaction Ref / UTR */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    UTR / Cheque / Ref No.
                  </label>
                  <input
                    type="text"
                    value={paymentFormRef}
                    onChange={(e) => setPaymentFormRef(e.target.value)}
                    placeholder="e.g. UTR-992140"
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-mono outline-hidden ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentFormDate}
                    onChange={(e) => setPaymentFormDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-mono outline-hidden ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Notes / Remarks
                </label>
                <input
                  type="text"
                  value={paymentFormNotes}
                  onChange={(e) => setPaymentFormNotes(e.target.value)}
                  placeholder="e.g. 1st installment paid via HDFC Bank"
                  className={`w-full px-3 py-2 rounded-xl text-xs border outline-hidden ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActivePaymentPo(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmittingPayment ? 'Saving...' : 'Confirm & Save Payment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Quick Edit Total Amount Modal */}
      {editingAmountPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            className={`w-full max-w-sm rounded-2xl border shadow-2xl p-5 space-y-4 ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Edit Total PO Value (₹)</h3>
              <button
                type="button"
                onClick={() => setEditingAmountPo(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Enter Invoice / Total Billing Amount for <strong>{editingAmountPo.poNumber}</strong>:
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min={0}
                  value={editTotalAmountValue}
                  onChange={(e) => setEditTotalAmountValue(Number(e.target.value))}
                  className={`w-full pl-7 pr-3 py-2 rounded-xl text-xs border font-mono font-bold text-slate-900 dark:text-white outline-hidden ${
                    darkMode ? 'bg-slate-950 border-slate-800 focus:border-orange-500' : 'bg-white border-slate-300 focus:border-orange-500'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingAmountPo(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTotalAmount}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white cursor-pointer"
              >
                Save Amount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Payment History Modal */}
      {historyPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div
              className={`p-4 border-b flex items-center justify-between ${
                darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-500" />
                <h3 className="text-sm font-bold">Payment History &amp; Partition Installments</h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryPo(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              <div className="text-xs text-slate-500 flex items-center justify-between">
                <span>PO: <strong>{historyPo.poNumber}</strong></span>
                <span>Total Paid: <strong className="text-emerald-500">{formatINR(historyPo.paidAmount || 0)}</strong></span>
              </div>

              {Array.isArray(historyPo.paymentHistory) && historyPo.paymentHistory.length > 0 ? (
                <div className="space-y-2">
                  {historyPo.paymentHistory.map((tx, idx) => (
                    <div
                      key={tx.id || idx}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                        darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="font-mono text-emerald-600 dark:text-emerald-400">
                            +{formatINR(tx.amount)}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-200 dark:bg-slate-800">
                            {tx.paymentMethod}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Date: {tx.date} {tx.referenceNo ? `· Ref: ${tx.referenceNo}` : ''}
                        </div>
                        {tx.notes && <p className="text-[11px] text-slate-500 mt-0.5">{tx.notes}</p>}
                      </div>
                      {tx.recordedByName && (
                        <div className="text-[10px] text-slate-400 font-mono text-right">
                          by {tx.recordedByName}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No installment logs found for this PO.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
