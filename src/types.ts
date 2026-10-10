import { Timestamp } from 'firebase/firestore';

export type ThemeMode = 'light' | 'grey' | 'dark';

export type TeamRole = 'admin' | 'backoffice' | 'warehouse' | 'logistics' | 'print';


export type WorkflowStage = 'PO_ENTRY' | 'IN_TRANSIT' | 'GRN';

export interface EmployeePermissions {
  canEditPo: boolean;
  canManageCatalog: boolean;
  canManageLogistics: boolean;
  canVerifyPrint: boolean;
  canManageGrn: boolean;
  canManageDn: boolean;
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

export interface PoLineItem {
  itemId: string;
  itemName: string;
  qty: number;
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
  printVerified?: 'YES' | 'NO';
  printVerifiedBy?: string;
  workflowStage: WorkflowStage;
  inwardStatus: 'PENDING' | 'SUCCESS';
  grnNumber: string;
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
    | 'IN_TRANSIT'
    | 'RTO_TRACKER'
    | 'GRN'
    | 'DN_TRACKER'
    | 'LOGISTICS'
    | 'PRINT_TEAM'
    | 'POC_DIRECTORY'
    | 'ADMIN_IAM'
    | 'SHEETS_SYNC';
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
  | 'LOGISTICS'
  | 'PRINT_TEAM'
  | 'IN_TRANSIT'
  | 'RTO_TRACKER'
  | 'GRN'
  | 'DN_TRACKER'
  | 'POC_DIRECTORY'
  | 'ADMIN_AUDIT';
