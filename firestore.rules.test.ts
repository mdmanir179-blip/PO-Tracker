/**
 * Firestore Security Rules Test Specification (Dirty Dozen Verification)
 */
export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'create' | 'update' | 'delete' | 'get' | 'list';
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  { id: 1, name: 'Unverified Admin Email Spoof', collection: 'employees', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 2, name: 'Self-Assigned Admin Escalation', collection: 'employees', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
  { id: 3, name: 'Shadow Field Injection on PO Create', collection: 'purchase_orders', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 4, name: 'Identity Spoofing on PO Create', collection: 'purchase_orders', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 5, name: 'In-Transit Lock Bypass by Backoffice Employee', collection: 'purchase_orders', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
  { id: 6, name: 'Immortal Field Mutation on PO Update', collection: 'purchase_orders', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
  { id: 7, name: 'Forged Client Timestamp on DN Create', collection: 'dn_records', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 8, name: 'ID Poisoning Attack', collection: 'purchase_orders', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 9, name: 'Value Poisoning / Oversized Comment', collection: 'purchase_orders', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
  { id: 10, name: 'DN Update by Unverified User', collection: 'dn_records', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
  { id: 11, name: 'Activity Log Tampering (Update/Delete)', collection: 'activity_logs', operation: 'delete', expectedResult: 'PERMISSION_DENIED' },
  { id: 12, name: 'Unscoped List Scraping', collection: 'purchase_orders', operation: 'list', expectedResult: 'PERMISSION_DENIED' },
];
