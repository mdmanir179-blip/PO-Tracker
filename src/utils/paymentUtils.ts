import { PurchaseOrder, PaymentStatus, PaymentTransaction } from '../types';
import { parseDateOnly } from '../services/notificationService';

export interface PaymentSummary {
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  isPaid: boolean;
  isPartial: boolean;
  isOverdue: boolean;
  isPending: boolean;
  effectiveStatus: PaymentStatus;
  statusLabel: string;
  progressPercent: number;
  daysElapsed: number;
  overdueDays: number;
  dueDate: string;
  hasExplicitAmount: boolean;
}

/**
 * Format currency in Indian numbering system (e.g., ₹1,25,000)
 */
export function formatINR(val: number): string {
  if (typeof val !== 'number' || isNaN(val)) return '₹0';
  return '₹' + Math.round(val).toLocaleString('en-IN');
}

/**
 * Calculate payment details, overdue status (>30 days), partition payment status, and due amounts
 */
export function calculatePaymentDetails(po: PurchaseOrder): PaymentSummary {
  const hasExplicitAmount = typeof po.totalAmount === 'number' && po.totalAmount > 0;
  
  // If not explicitly set, calculate reasonable estimate from total quantity so ledger isn't zero
  const estimatedAmount = (po.totalQty && po.totalQty > 0 ? po.totalQty : 1) * 320;
  const totalAmount = hasExplicitAmount ? po.totalAmount! : (po.totalAmount === 0 ? 0 : estimatedAmount);

  const paidAmount = Math.max(0, Number(po.paidAmount) || 0);
  const dueAmount = Math.max(0, totalAmount - paidAmount);

  // Determine base date for 30-day payment rule (orderDate or createdAt)
  const baseDate = parseDateOnly(po.orderDate) || parseDateOnly(po.appointmentDate) || new Date();
  const today = new Date();
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const diffMs = todayDateOnly.getTime() - baseDate.getTime();
  const daysElapsed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  // Calculate 30-day due date
  const dueObj = new Date(baseDate);
  dueObj.setDate(dueObj.getDate() + 30);
  const calculatedDueDate = dueObj.toISOString().slice(0, 10);
  const finalDueDate = po.paymentDueDate || calculatedDueDate;

  // Overdue condition: more than 30 days old and dueAmount > 0, and not explicitly marked 'PAID'
  const isExplicitlyPaid = po.paymentStatus === 'PAID' || (totalAmount > 0 && paidAmount >= totalAmount);
  const isOverdue = !isExplicitlyPaid && dueAmount > 0 && daysElapsed > 30;
  const overdueDays = isOverdue ? daysElapsed - 30 : 0;

  const isPartial = !isExplicitlyPaid && paidAmount > 0 && dueAmount > 0;
  const isPaid = isExplicitlyPaid;
  const isPending = !isPaid && !isPartial && !isOverdue;

  let effectiveStatus: PaymentStatus = 'PENDING';
  let statusLabel = 'Pending Payment';

  if (po.paymentStatus === 'CANCELLED') {
    effectiveStatus = 'CANCELLED';
    statusLabel = 'Cancelled';
  } else if (isPaid) {
    effectiveStatus = 'PAID';
    statusLabel = 'Fully Paid';
  } else if (isOverdue) {
    effectiveStatus = 'OVERDUE';
    statusLabel = isPartial ? `Overdue (Partial ${Math.round((paidAmount / (totalAmount || 1)) * 100)}%)` : 'Payment Overdue';
  } else if (isPartial) {
    effectiveStatus = 'PARTIAL';
    statusLabel = 'Partial Paid';
  }

  const progressPercent = totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : (isPaid ? 100 : 0);

  return {
    totalAmount,
    paidAmount,
    dueAmount,
    isPaid,
    isPartial,
    isOverdue,
    isPending,
    effectiveStatus,
    statusLabel,
    progressPercent,
    daysElapsed,
    overdueDays,
    dueDate: finalDueDate,
    hasExplicitAmount,
  };
}

/**
 * Filter and compute payment totals across an array of POs
 */
export function computePaymentLedgerMetrics(purchaseOrders: PurchaseOrder[]) {
  let totalBilled = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;
  let totalOverdueAmount = 0;
  let overdueCount = 0;
  let partialCount = 0;
  let partialDueAmount = 0;
  let fullyPaidCount = 0;
  let pendingCount = 0;

  purchaseOrders.forEach((po) => {
    const details = calculatePaymentDetails(po);
    totalBilled += details.totalAmount;
    totalCollected += details.paidAmount;
    totalOutstanding += details.dueAmount;

    if (details.isOverdue) {
      overdueCount += 1;
      totalOverdueAmount += details.dueAmount;
    }
    if (details.isPartial) {
      partialCount += 1;
      partialDueAmount += details.dueAmount;
    }
    if (details.isPaid) {
      fullyPaidCount += 1;
    }
    if (details.isPending) {
      pendingCount += 1;
    }
  });

  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  return {
    totalBilled,
    totalCollected,
    totalOutstanding,
    totalOverdueAmount,
    overdueCount,
    partialCount,
    partialDueAmount,
    fullyPaidCount,
    pendingCount,
    collectionRate,
  };
}
