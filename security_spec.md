# TAFFIC-PRAHARI Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Identity Isolation**: A citizen user can only create and read their own `/users/{userId}` and `/userProfiles/{userId}` documents; PII (`email`, `mobileNumber`) is never readable by other citizens.
2. **No Self-Privilege Escalation**: Citizens creating `/users/{userId}` must strictly have `role == "citizen"` and cannot modify `role` on update. Only the bootstrapped root admin or verified admins in `/admins/{uid}` have administrative privileges.
3. **Complaint Ownership & Confidentiality**: Citizens can only `get` or `list` `/trafficReports` where `reporterId == request.auth.uid`. Citizens can only create complaints with `status == "Submitted"`, `reporterId == request.auth.uid`, and server timestamp `createdAt == request.time`.
4. **Master Gate on Evidence & Status History**: Subcollections `/trafficReports/{reportId}/evidence/{evidenceId}` and `/trafficReports/{reportId}/statusHistory/{historyId}` require the parent `trafficReports/{reportId}` to exist and match ownership or admin status.
5. **Admin-Only Official Status Transitions**: Only verified administrators (`isAdmin()`) may update a report's `status` or `adminRemarks`, and append admin entries to `statusHistory` and `adminActivityLogs`.
6. **Immutable Audit Logs**: `/adminActivityLogs` records are append-only for admins; updates and deletes are strictly denied.
7. **Verified Vehicle Privacy**: `/vehicleReportSummaries/{plateNumber}` disallows collection listing by citizens (`allow list: if isAdmin()`) and only allows `get` if the user owns a verified `/registeredVehicles/{uid}_{plateNumber}` record or is an admin.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Self-Admin Escalation**: `POST /users/{uid}` with `{ uid, fullName: "Mallory", role: "admin", createdAt, updatedAt }` -> Denied (`role != "citizen"`).
2. **Role Tampering on Update**: `PATCH /users/{uid}` changing `role` from `"citizen"` to `"admin"` -> Denied (`affectedKeys().hasOnly(['fullName', 'updatedAt'])`).
3. **Cross-User PII Read**: Authenticated citizen B attempts `GET /userProfiles/{citizenA_uid}` -> Denied (`!isOwner && !isAdmin`).
4. **Complainant Identity Spoofing**: Citizen A creates `/trafficReports/{id}` with `reporterId: citizenB_uid` -> Denied (`reporterId != request.auth.uid`).
5. **Pre-Verified Status Injection**: Citizen A creates `/trafficReports/{id}` with `status: "Verified"` -> Denied (`status != "Submitted"`).
6. **Shadow Ghost Field Injection**: Citizen A creates `/trafficReports/{id}` with extra field `isPriorityVerified: true` -> Denied (`hasOnly(...)`).
7. **Citizen Tampering with Status**: Citizen A updates own report to `status: "Resolved"` -> Denied (only `isAdmin()` can update report status).
8. **Terminal State Mutation**: Citizen attempts update on report where `status == "Resolved"` -> Denied (terminal lock).
9. **Timestamp Forgery**: Client sends `createdAt: "2020-01-01T00:00:00Z"` instead of server timestamp -> Denied (`createdAt != request.time`).
10. **ID Poisoning**: Client writes document with 500-character ID or invalid characters `../admin` -> Denied (`!isValidId()`).
11. **Unverified Admin Email Spoof**: User with `email: "2000014064@karnavatiuniversity.edu.in"` and `email_verified: false` attempts admin read -> Denied (`email_verified == true` required).
12. **Blanket Report Scraping**: Citizen attempts `LIST /trafficReports` without `where('reporterId', '==', uid)` -> Denied (`resource.data.reporterId == request.auth.uid` enforced in `allow list`).
