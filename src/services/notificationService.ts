import { PurchaseOrder, AppNotification } from '../types';

/**
 * Web Audio API synthesize pleasant bell/chime sound
 * Works offline, no external audio file dependencies.
 */
export function playNotificationChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // First tone (E5 ~659Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second harmonic tone (A5 ~880Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.1);
    gain2.gain.setValueAtTime(0.18, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.65);
  } catch {
    // Audio autoplay restrictions or unsupported
  }
}

/**
 * Request HTML5 Desktop notification permission
 */
export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const res = await Notification.requestPermission();
    return res === 'granted';
  } catch {
    return false;
  }
}

/**
 * Trigger HTML5 Desktop Notification
 */
export function triggerBrowserNotification(title: string, body: string, tag?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        tag: tag || 'instamart-ops-notification',
      });
    } catch {
      // Notification failed
    }
  }
}

/**
 * Robust date parser supporting YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, etc.
 */
export function parseDateOnly(dateStr?: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  const s = dateStr.trim();

  // YYYY-MM-DD
  const ymdMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  return null;
}

/**
 * Get appointment date status compared to local today
 */
export function getAppointmentStatus(appointmentDate?: string): {
  isToday: boolean;
  isTomorrow: boolean;
  isPast: boolean;
  isUpcoming: boolean;
  daysDiff: number | null;
  formattedDate: string;
} {
  if (!appointmentDate || !appointmentDate.trim()) {
    return {
      isToday: false,
      isTomorrow: false,
      isPast: false,
      isUpcoming: false,
      daysDiff: null,
      formattedDate: '',
    };
  }

  const aptDate = parseDateOnly(appointmentDate);
  if (!aptDate) {
    return {
      isToday: false,
      isTomorrow: false,
      isPast: false,
      isUpcoming: false,
      daysDiff: null,
      formattedDate: appointmentDate,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  aptDate.setHours(0, 0, 0, 0);

  const diffMs = aptDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  return {
    isToday: diffDays === 0,
    isTomorrow: diffDays === 1,
    isPast: diffDays < 0,
    isUpcoming: diffDays > 1 && diffDays <= 3,
    daysDiff: diffDays,
    formattedDate: appointmentDate,
  };
}

/**
 * Get PO Expiry date status compared to local today
 */
export function getPoExpiryStatus(poExpiryDate?: string): {
  isExpired: boolean;
  isExpiringToday: boolean;
  isExpiringSoon: boolean;
  daysLeft: number | null;
  formattedDate: string;
} {
  if (!poExpiryDate || !poExpiryDate.trim()) {
    return {
      isExpired: false,
      isExpiringToday: false,
      isExpiringSoon: false,
      daysLeft: null,
      formattedDate: '',
    };
  }

  const expDate = parseDateOnly(poExpiryDate);
  if (!expDate) {
    return {
      isExpired: false,
      isExpiringToday: false,
      isExpiringSoon: false,
      daysLeft: null,
      formattedDate: poExpiryDate,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expDate.setHours(0, 0, 0, 0);

  const diffMs = expDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  return {
    isExpired: diffDays < 0,
    isExpiringToday: diffDays === 0,
    isExpiringSoon: diffDays > 0 && diffDays <= 7,
    daysLeft: diffDays,
    formattedDate: poExpiryDate,
  };
}

/**
 * Compute all active operations notifications across Purchase Orders
 */
export function computeNotifications(purchaseOrders: PurchaseOrder[]): AppNotification[] {
  const notifications: AppNotification[] = [];

  for (const po of purchaseOrders) {
    // Only check active POs (exclude inwarded GRN unless expired)
    const isGrn = po.workflowStage === 'GRN';

    // 1. Appointment Date Check
    if (po.appointmentDate && !isGrn) {
      const apt = getAppointmentStatus(po.appointmentDate);
      if (apt.isToday) {
        notifications.push({
          id: `apt_today_${po.id}`,
          type: 'APPOINTMENT_TODAY',
          severity: 'urgent',
          title: `📅 Appointment is TODAY (${po.appointmentDate})`,
          message: `PO #${po.poNumber} has appointment scheduled for TODAY at ${po.warehouseName}. Total Qty: ${po.totalQty}. Appointment ID: ${po.appointmentId || 'N/A'}.`,
          poId: po.id,
          poNumber: po.poNumber,
          targetStage: po.workflowStage,
          warehouseName: po.warehouseName,
          dateStr: po.appointmentDate,
          daysDiff: 0,
          appointmentId: po.appointmentId,
        });
      } else if (apt.isTomorrow) {
        notifications.push({
          id: `apt_tomorrow_${po.id}`,
          type: 'APPOINTMENT_TOMORROW',
          severity: 'info',
          title: `⏰ Appointment Scheduled for Tomorrow (${po.appointmentDate})`,
          message: `PO #${po.poNumber} appointment at ${po.warehouseName} is tomorrow. Appointment ID: ${po.appointmentId || 'N/A'}.`,
          poId: po.id,
          poNumber: po.poNumber,
          targetStage: po.workflowStage,
          warehouseName: po.warehouseName,
          dateStr: po.appointmentDate,
          daysDiff: 1,
          appointmentId: po.appointmentId,
        });
      }
    }

    // 2. PO Expiry Date Check
    if (po.poExpiryDate && !isGrn) {
      const exp = getPoExpiryStatus(po.poExpiryDate);
      if (exp.isExpired) {
        const daysAgo = Math.abs(exp.daysLeft || 0);
        notifications.push({
          id: `exp_expired_${po.id}`,
          type: 'EXPIRED',
          severity: 'critical',
          title: `🚨 PO Date Expired (${daysAgo} day${daysAgo === 1 ? '' : 's'} ago)`,
          message: `PO #${po.poNumber} expired on ${po.poExpiryDate} for warehouse ${po.warehouseName}. Revalidation or fast-track inwarding required.`,
          poId: po.id,
          poNumber: po.poNumber,
          targetStage: po.workflowStage,
          warehouseName: po.warehouseName,
          dateStr: po.poExpiryDate,
          daysDiff: exp.daysLeft || 0,
        });
      } else if (exp.isExpiringToday) {
        notifications.push({
          id: `exp_today_${po.id}`,
          type: 'EXPIRING_TODAY',
          severity: 'critical',
          title: `⚠️ PO Expires TODAY (${po.poExpiryDate})`,
          message: `PO #${po.poNumber} expires today! Immediate warehouse delivery and dispatch coordination required.`,
          poId: po.id,
          poNumber: po.poNumber,
          targetStage: po.workflowStage,
          warehouseName: po.warehouseName,
          dateStr: po.poExpiryDate,
          daysDiff: 0,
        });
      } else if (exp.isExpiringSoon && exp.daysLeft !== null && exp.daysLeft <= 5) {
        notifications.push({
          id: `exp_soon_${po.id}`,
          type: 'EXPIRING_SOON',
          severity: 'warning',
          title: `⚠️ PO Expiring Soon in ${exp.daysLeft} Day${exp.daysLeft === 1 ? '' : 's'}`,
          message: `PO #${po.poNumber} expires on ${po.poExpiryDate} at ${po.warehouseName}.`,
          poId: po.id,
          poNumber: po.poNumber,
          targetStage: po.workflowStage,
          warehouseName: po.warehouseName,
          dateStr: po.poExpiryDate,
          daysDiff: exp.daysLeft,
        });
      }
    }

    // 3. PO Payment & Overdue (Calculated from GRN Date: > 1 Month) / Partial Payment Tracking Check
    const explicitGrnDate = (po.grnDate || '').trim();
    const isGrnStage = po.workflowStage === 'GRN' || po.inwardStatus === 'SUCCESS' || Boolean(po.grnNumber && po.grnNumber.trim());
    const effectiveGrnDateStr = explicitGrnDate || (isGrnStage ? (po.appointmentDate || po.shipDate || po.orderDate || '') : '');
    const hasGrn = Boolean(effectiveGrnDateStr);

    const todayNow = new Date();
    const todayDate = new Date(todayNow.getFullYear(), todayNow.getMonth(), todayNow.getDate());
    const payBaseDate = parseDateOnly(effectiveGrnDateStr) || parseDateOnly(po.orderDate) || parseDateOnly(po.appointmentDate) || todayDate;
    const payDaysElapsed = Math.max(0, Math.floor((todayDate.getTime() - payBaseDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    const dueObj = new Date(payBaseDate);
    dueObj.setMonth(dueObj.getMonth() + 1);

    const hasExplicit = typeof po.totalAmount === 'number' && po.totalAmount > 0;
    const estVal = (po.totalQty && po.totalQty > 0 ? po.totalQty : 1) * 320;
    const totalVal = hasExplicit ? po.totalAmount! : (po.totalAmount === 0 ? 0 : estVal);
    const paidVal = Math.max(0, Number(po.paidAmount) || 0);
    const dueVal = Math.max(0, totalVal - paidVal);
    const isExplicitlyPaid = po.paymentStatus === 'PAID' || (totalVal > 0 && paidVal >= totalVal);

    if (!isExplicitlyPaid && po.paymentStatus !== 'CANCELLED' && dueVal > 0) {
      const isOverdueFromGrn = hasGrn && (todayDate.getTime() > dueObj.getTime() || payDaysElapsed > 30);
      const isOverdueFromExplicitDue = Boolean(po.paymentDueDate && parseDateOnly(po.paymentDueDate) && todayDate.getTime() > parseDateOnly(po.paymentDueDate)!.getTime());

      if (isOverdueFromGrn || isOverdueFromExplicitDue) {
        const overdueDays = Math.max(1, isOverdueFromGrn ? Math.floor((todayDate.getTime() - dueObj.getTime()) / (1000 * 60 * 60 * 24)) : (payDaysElapsed - 30));
        const isPartial = paidVal > 0;
        notifications.push({
          id: `pay_overdue_${po.id}`,
          type: 'PAYMENT_OVERDUE',
          severity: overdueDays > 14 ? 'critical' : 'urgent',
          title: `💳 Payment OVERDUE: ₹${Math.round(dueVal).toLocaleString('en-IN')} (${overdueDays}d past 1 month of GRN)`,
          message: `PO #${po.poNumber} has ${isPartial ? `partial payment (${Math.round((paidVal / (totalVal || 1)) * 100)}% paid)` : 'no payment'}! Pending Due: ₹${Math.round(dueVal).toLocaleString('en-IN')} (Total: ₹${Math.round(totalVal).toLocaleString('en-IN')}). ${hasGrn ? `GRN Date: ${effectiveGrnDateStr} (>1 month elapsed).` : `Created ${payDaysElapsed} days ago.`} Warehouse: ${po.warehouseName}.`,
          poId: po.id,
          poNumber: po.poNumber,
          targetStage: 'PAYMENTS' as any,
          warehouseName: po.warehouseName,
          dateStr: effectiveGrnDateStr || po.orderDate,
          daysDiff: -overdueDays,
        });
      } else if (paidVal > 0 && dueVal > 0) {
        notifications.push({
          id: `pay_partial_${po.id}`,
          type: 'PAYMENT_PARTIAL_DUE',
          severity: 'info',
          title: `💳 Partial Payment Pending: ₹${Math.round(dueVal).toLocaleString('en-IN')}`,
          message: `PO #${po.poNumber} partition paid (₹${Math.round(paidVal).toLocaleString('en-IN')} of ₹${Math.round(totalVal).toLocaleString('en-IN')}). Remaining balance of ₹${Math.round(dueVal).toLocaleString('en-IN')} due soon.`,
          poId: po.id,
          poNumber: po.poNumber,
          targetStage: 'PAYMENTS' as any,
          warehouseName: po.warehouseName,
          dateStr: po.orderDate,
          daysDiff: 30 - payDaysElapsed,
        });
      }
    }
  }

  // Sort order: Critical (Expired/Expiring Today) first, then Urgent (Appointment Today), then Warning, then Info
  const severityOrder: Record<string, number> = {
    critical: 1,
    urgent: 2,
    warning: 3,
    info: 4,
  };

  return notifications.sort((a, b) => {
    const sDiff = (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5);
    if (sDiff !== 0) return sDiff;
    return a.daysDiff - b.daysDiff;
  });
}
