# Instamart PO & DN Tracker — Security Specification

## 1. Data Invariants

1. **Authentication & Verification Invariant**: All writes to `/employees`, `/purchase_orders`, `/dn_records`, and `/activity_logs` require an authenticated user (`request.auth != null`) with a verified email (`request.auth.token.email_verified == true`).
2. **Employee Directory & Role Invariant**: Every operational user must have a valid document at `/employees/{uid}` where `uid == request.auth.uid`, `employeeName` (2..100 chars), `employeeId` (2..50 chars matching `^[a-zA-Z0-9_\-]+$`), and `role` in `['admin', 'backoffice', 'warehouse']`. Only the bootstrapped admin (`bizdev06.tbc@gmail.com` with `email_verified == true`) or an existing admin in `/admins/{uid}` may assign `role == 'admin'`. Non-admins cannot escalate their role to `'admin'`.
3. **In-Transit Lock Invariant (Requirement 4)**: Once a Purchase Order in `/purchase_orders/{poId}` has `pickupStatus == 'YES'` or `workflowStage == 'IN_TRANSIT'`, standard employees (`backoffice` / `warehouse`) are strictly blocked from editing general PO details; only `isAdmin()` can edit arbitrary fields in `IN_TRANSIT`, except for the controlled transition to `GRN` (`inwardStatus == 'SUCCESS'` and `workflowStage == 'GRN'`).
4. **Temporal & Identity Integrity Invariant**: All `createdAt` and `updatedAt` timestamps must match `request.time`. On creation, `createdByUid` and `updatedByUid` must equal `request.auth.uid`. On update, `updatedByUid` must equal `request.auth.uid` and `createdByUid` / `createdAt` are immutable.
5. **Query Enforcer Invariant**: All `list` operations on `/purchase_orders`, `/dn_records`, and `/activity_logs` must explicitly filter by `resource.data.orgScope == 'instamart_ops'` and require an authenticated user.

## 2. The "Dirty Dozen" Payloads

1. **Unverified Admin Email Spoof**: Attempting a write where `request.auth.token.email == 'bizdev06.tbc@gmail.com'` but `email_verified == false`.
2. **Self-Assigned Admin Escalation**: A non-admin user creating or updating `/employees/{uid}` with `role: 'admin'`.
3. **Shadow Field Injection on PO Create**: Creating a `/purchase_orders/{poId}` document with an extra unauthorized field `isApproved: true`.
4. **Identity Spoofing on PO Create**: Creating `/purchase_orders/{poId}` where `createdByUid` is set to another user's UID instead of `request.auth.uid`.
5. **In-Transit Lock Bypass by Backoffice Employee**: Updating `totalQty` or `invoiceNo` on a PO whose existing `workflowStage` is `'IN_TRANSIT'` as a non-admin (`backoffice`) user.
6. **Immortal Field Mutation on PO Update**: Updating `createdAt` or `createdByUid` during a `/purchase_orders/{poId}` update.
7. **Forged Client Timestamp**: Creating a `/dn_records/{dnId}` document with a hardcoded past/future `createdAt` instead of `request.time`.
8. **ID Poisoning Attack**: Creating a document with a 300-character or special-character document ID that violates `isValidId(id)`.
9. **Value Poisoning / Oversized Payload**: Sending a 10,000-character `comment` on a PO or a 2MB string in `dnNumber`.
10. **DN Update by Unauthorized Anonymous / Unregistered User**: Updating `/dn_records/{dnId}` without a valid registered employee profile or verified email.
11. **Activity Log Tampering (Update/Delete)**: Attempting to update or delete an existing `/activity_logs/{logId}` audit record.
12. **Unscoped List Scraping**: Querying `/purchase_orders` without constraining `resource.data.orgScope == 'instamart_ops'`.
