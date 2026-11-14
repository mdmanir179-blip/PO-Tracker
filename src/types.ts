import { Timestamp, FieldValue } from 'firebase/firestore';

export type ThemeMode = 'light' | 'grey' | 'dark';

export type TeamRole = 'admin' | 'backoffice' | 'warehouse' | 'logistics' | 'print';


export type WorkflowStage =
  | 'PO_ENTRY'
  | 'WAREHOUSE'
  | 'PRINT_LOGISTICS'
  | 'IN_TRANSIT'
  | 'GRN'
  | 'RTO';

export type WarehouseStatus = 'PENDING' | 'PROCESSING' | 'READY_FOR_DISPATCH' | 'PICKED_UP';

export interface EmployeePermissions {
  canEditPo: boolean;
  canManageCatalog: boolean;
  canManageLogistics: boolean;
  canVerifyPrint: boolean;
  canManageGrn: boolean;
  canManageDn: boolean;
  canManageWarehouse?: boolean;
}

export interface EmployeeProfile {
  uid: string;
  employeeName: string;
  employeeId: string;
  email?: string;
  role: TeamRole;
  accessStatus?: 'APPROVED' | 'RESTRICTED';
  permissions?: EmployeePermissions;
  spreadsheetId: string;
  isOnline?: boolean;
  lastActiveAt?: Timestamp | Date | string;
  orgScope?: 'instamart_ops';
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

export interface ProductCatalogItem {
  id: string;
  itemId: string;
  itemName: string;
  orgScope: 'instamart_ops';
  updatedByName: string;
  updatedAt?: Timestamp | Date | string;
}

export interface ProductBoxEntry {
  id: string;
  boxDimensions: string;
  boxCount: number;
  actualWeightKg: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
}

export interface PoLineItem {
  itemId: string;
  itemName: string;
  qty: number;
  boxDimensions?: string;
  noOfBoxes?: number;
  boxWeight?: string;
  boxes?: ProductBoxEntry[];
  packedStatus?: 'PENDING' | 'PACKED';
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  orderDate: string;
  poExpiryDate?: string;
  warehouseName: string;
  itemId: string;
  itemName: string;
  totalQty: number;
  lineItems?: PoLineItem[];
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
  pickupDate?: string;
  pickupMarkedAt?: string;
  printVerified?: 'YES' | 'NO';
  printVerifiedBy?: string;
  isConfirmed?: boolean;
  packagingStatus?: 'PENDING' | 'READY';
  warehouseStatus?: WarehouseStatus;
  dcVerified?: boolean;
  invoiceVerified?: boolean;
  poCopyVerified?: boolean;
  confirmedByName?: string;
  confirmedByEmpId?: string;
  workflowStage: WorkflowStage;
  inwardStatus: 'PENDING' | 'SUCCESS';
  grnNumber: string;
  grnDate?: string;
  grnDnSummary: string;
  hasDn: boolean;
  // RTO Management System Fields
  isRto?: boolean;
  rtoPickedStatus?: 'YES' | 'NO' | 'PENDING';
  rtoTrackingId?: string;
  rtoCourierPartner?: string;
  rtoPickDate?: string;
  rtoReceivedAtWh?: 'YES' | 'NO';
  rtoReason?: string;
  rtoRemarks?: string;
  // Financials & Payment Tracking Fields
  totalAmount?: number;
  originalAmount?: number;
  dnQty?: number;
  dnAmount?: number;
  acceptedQty?: number;
  paidAmount?: number;
  paymentStatus?: PaymentStatus;
  paymentDueDate?: string;
  paymentHistory?: PaymentTransaction[];
  paymentNotes?: string;
  // Logistics Attempt Tracking & Status Fields
  logisticsStatus?: string;
  attemptFailed?: boolean;
  attemptFailReason?: string;
  attemptFailDate?: string;
  attemptCount?: number;
  attemptFailRemarks?: string;
  rescheduledApptDate?: string;
  orgScope: 'instamart_ops';
  createdByUid: string;
  createdByName: string;
  createdByEmpId: string;
  updatedByUid: string;
  updatedByName: string;
  updatedByEmpId: string;
  createdAt?: Timestamp | Date | string | FieldValue;
  updatedAt?: Timestamp | Date | string | FieldValue;
}

export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface PaymentTransaction {
  id: string;
  amount: number;
  date: string;
  paymentMethod: 'BANK_TRANSFER' | 'CHEQUE' | 'UPI' | 'NEFT_RTGS' | 'CASH' | 'OTHER';
  referenceNo?: string;
  notes?: string;
  recordedByUid?: string;
  recordedByName?: string;
  createdAt?: Timestamp | Date | string | FieldValue;
}

export interface DnRecord {
  id: string;
  dnDate: string;
  dnNumber: string;
  facilityName: string;
  parentPoDetails: string;
  dnSkuIdItemName: string;
  dnQty: number;
  whPocDetails: string;
  dnReason?: string;
  carrierName?: string;
  carrierTrackingId?: string;
  lrNo: string;
  reportFileName: string;
  reportFileType: string;
  reportFileSize: number;
  reportFileDataUrl: string;
  orgScope: 'instamart_ops';
  createdByUid: string;
  createdByName: string;
  createdByEmpId: string;
  updatedByUid: string;
  updatedByName: string;
  updatedByEmpId: string;
  createdAt?: Timestamp | Date | string | FieldValue;
  updatedAt?: Timestamp | Date | string | FieldValue;
}

export interface PocContact {
  id: string;
  facilityName: string;
  pocName: string;
  designation: string;
  contactNumber: string;
  emailId: string;
  cityOrHub: string;
  orgScope: 'instamart_ops';
  updatedByName: string;
  updatedAt?: Timestamp | Date | string;
}

export interface ActivityLog {
  id: string;
  action: string;
  module:
    | 'PO_ENTRY'
    | 'WAREHOUSE'
    | 'IN_TRANSIT'
    | 'RTO_TRACKER'
    | 'GRN'
    | 'DN_TRACKER'
    | 'LOGISTICS'
    | 'PRINT_TEAM'
    | 'POC_DIRECTORY'
    | 'ADMIN_IAM'
    | 'SHEETS_SYNC'
    | 'PAYMENT_TRACKER';
  referenceNo: string;
  details: string;
  employeeUid: string;
  employeeName: string;
  employeeId: string;
  employeeRole: TeamRole;
  orgScope: 'instamart_ops';
  createdAt?: Timestamp | Date | string;
}

export type ActiveTab =
  | 'DASHBOARD'
  | 'PO_ENTRY'
  | 'WAREHOUSE'
  | 'PAYMENTS'
  | 'LOGISTICS'
  | 'PRINT_TEAM'
  | 'IN_TRANSIT'
  | 'RTO_TRACKER'
  | 'GRN'
  | 'DN_TRACKER'
  | 'POC_DIRECTORY'
  | 'ADMIN_AUDIT';

export type NotificationType =
  | 'EXPIRED'
  | 'EXPIRING_TODAY'
  | 'EXPIRING_SOON'
  | 'APPOINTMENT_TODAY'
  | 'APPOINTMENT_TOMORROW'
  | 'SHIPMENT_TODAY'
  | 'SHIPMENT_TOMORROW'
  | 'SHIPMENT_OVERDUE'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_PARTIAL_DUE';

export interface AppNotification {
  id: string;
  type: NotificationType;
  severity: 'critical' | 'urgent' | 'warning' | 'info';
  title: string;
  message: string;
  poId: string;
  poNumber: string;
  targetStage: WorkflowStage;
  warehouseName: string;
  dateStr: string;
  daysDiff: number;
  appointmentId?: string;
}

export const getRecordTimestamp = (record: any): number => {
  if (!record) return 0;
  if (record.createdAt) {
    if (typeof record.createdAt.toMillis === 'function') {
      return record.createdAt.toMillis();
    }
    if (typeof record.createdAt.seconds === 'number') {
      return record.createdAt.seconds * 1000 + (record.createdAt.nanoseconds || 0) / 1000000;
    }
    if (typeof record.createdAt === 'string') {
      const parsed = Date.parse(record.createdAt);
      if (!isNaN(parsed)) return parsed;
    }
  }
  if (record.updatedAt) {
    if (typeof record.updatedAt.toMillis === 'function') {
      return record.updatedAt.toMillis();
    }
    if (typeof record.updatedAt.seconds === 'number') {
      return record.updatedAt.seconds * 1000 + (record.updatedAt.nanoseconds || 0) / 1000000;
    }
    if (typeof record.updatedAt === 'string') {
      const parsed = Date.parse(record.updatedAt);
      if (!isNaN(parsed)) return parsed;
    }
  }
  if (record.timestamp) {
    if (typeof record.timestamp.toMillis === 'function') {
      return record.timestamp.toMillis();
    }
    if (typeof record.timestamp.seconds === 'number') {
      return record.timestamp.seconds * 1000;
    }
    if (typeof record.timestamp === 'string') {
      const parsed = Date.parse(record.timestamp);
      if (!isNaN(parsed)) return parsed;
    }
  }
  if (record.orderDate && typeof record.orderDate === 'string') {
    const parsed = Date.parse(record.orderDate);
    if (!isNaN(parsed)) return parsed;
  }
  if (record.dnDate && typeof record.dnDate === 'string') {
    const parsed = Date.parse(record.dnDate);
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
};

// Compare helper: Newest / Last added first (Descending order)
export const compareLastAddedFirst = <T extends any>(a: T, b: T): number => {
  const timeA = getRecordTimestamp(a);
  const timeB = getRecordTimestamp(b);
  if (timeA !== timeB) {
    return timeB - timeA; // Descending: newer timestamp first
  }
  const anyA = a as any;
  const anyB = b as any;
  const dateA = anyA?.orderDate || anyA?.shipDate || anyA?.appointmentDate || anyA?.dnDate || '';
  const dateB = anyB?.orderDate || anyB?.shipDate || anyB?.appointmentDate || anyB?.dnDate || '';
  if (dateA && dateB && dateA !== dateB) {
    return dateB.localeCompare(dateA);
  }
  const idA = anyA?.poNumber || anyA?.dnNumber || anyA?.id || '';
  const idB = anyB?.poNumber || anyB?.dnNumber || anyB?.id || '';
  return idB.localeCompare(idA);
};
