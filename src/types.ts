import { Timestamp } from 'firebase/firestore';

export type TeamRole = 'admin' | 'backoffice' | 'warehouse';

export type WorkflowStage = 'PO_ENTRY' | 'IN_TRANSIT' | 'GRN';

export interface EmployeeProfile {
  uid: string;
  employeeName: string;
  employeeId: string;
  role: TeamRole;
  spreadsheetId: string;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

export interface PurchaseOrder {
  id: string;
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
  workflowStage: WorkflowStage;
  inwardStatus: 'PENDING' | 'SUCCESS';
  grnNumber: string;
  grnDnSummary: string;
  hasDn: boolean;
  orgScope: 'instamart_ops';
  createdByUid: string;
  createdByName: string;
  createdByEmpId: string;
  updatedByUid: string;
  updatedByName: string;
  updatedByEmpId: string;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
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
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

export interface ActivityLog {
  id: string;
  action: string;
  module: 'PO_ENTRY' | 'IN_TRANSIT' | 'GRN' | 'DN_TRACKER' | 'SHEETS_SYNC';
  referenceNo: string;
  details: string;
  employeeUid: string;
  employeeName: string;
  employeeId: string;
  employeeRole: TeamRole;
  orgScope: 'instamart_ops';
  createdAt?: Timestamp | Date | string;
}

export type ActiveTab = 'PO_ENTRY' | 'IN_TRANSIT' | 'GRN' | 'DN_TRACKER' | 'ADMIN_AUDIT';
