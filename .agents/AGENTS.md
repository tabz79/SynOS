# SynOS Development Guidelines & Regression Prevention

## ⚠️ CRITICAL RULES (MUST NEVER BE BROKEN)

### Rule 1: Initial Setup & License Activation Pipeline (Hurdle 1 - ALL CLEARED & VERIFIED WORKING)
* **Goal:** Allow administrator setup, SQL instance creation, and cloud license key validation without timeout or connection failures.
* **Implementation Details:**
  * `SetupController.cs` connects to `master` database on local/named SQL Server instances (e.g. `.\SYNOS`), creates `SynOSDb-1`, runs EF Core migrations, applies manual schema adjustments (v7, v8, v9), and seeds initial roles.
  * Grants `db_owner` database role to `NT AUTHORITY\SYSTEM`.
  * Cloud activation endpoint calls `/api/v1/setup/test-middleware` using `SocketsHttpHandler` configured with an IPv4-first `ConnectCallback` (`System.Net.Sockets.AddressFamily.InterNetwork`) to bypass 15-21 second timeouts on dual-stack hosts (e.g. `cloud.tbzlabs.in`) when local networks have disabled/unconfigured IPv6 routing.
  * Uses standard .NET HTTP client connection handling (no artificial 5-second timeout overrides).
  * Creates custom administrator account (e.g. `munnassk`) in `Users` table with BCrypt hashed password and initializes `TBZSynOSService`.
* **Verification Check on Code Edits:**
  * Do NOT re-introduce artificial short timeouts (e.g. `TimeSpan.FromSeconds(5)`) on activation endpoints in `SetupController.cs` or `SettingsController.cs`.
  * Maintain the IPv4 `SocketsHttpHandler` callback on outbound cloud activation `HttpClient` instances.

---

### Rule 2: Active Session Credential Preservation & Database Restore Pipeline (Hurdle 2 - ALL CLEARED & VERIFIED WORKING)
* **Goal:** When an administrator restores a database backup, the restore must succeed, foreign key constraint errors must be prevented, and the active user must NOT be locked out.
* **Implementation Details:**
  * `OperationsController.cs` resolves the active user ID using `User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value`. The `"sub"` fallback is mandatory because ASP.NET Core JWT authentication without inbound claim remapping puts the subject GUID into the `"sub"` claim.
  * Before restoring the SQL Server `.bak` file, `BackupService.cs` caches the restoring user's record, roles (`UserRole`), branch assignments (`UserBranchRole`), workspace access (`UserWorkspaceAccess`), employee record (`Employee`), and a dictionary of role IDs mapped to role names (`roleIdToNameMap`).
  * `NT AUTHORITY\SYSTEM` service account has the `sysadmin` server role in SQL Server (configured via `$isLocalServer` in `scripts/configure-settings.ps1`), enabling `RESTORE VERIFYONLY` and `RESTORE DATABASE WITH REPLACE` commands to execute without permission errors.
  * `C:\SynOS_Files` grants NTFS permissions to `Everyone` so that the database engine can write to backup staging paths.
  * After the SQL restore completes and EF Core migrations finish, `BackupService.cs` maps role GUIDs by role name (`restoredRolesMap`) to match the target database schema, avoiding `FK_UserBranchRoles_Roles_RoleId` constraint violations. The cached user details are then safely merged/inserted back into the restored database context.
* **Verification Check on Code Edits:**
  * Always preserve `User.FindFirst("sub")?.Value` claim extraction in `OperationsController.cs`.
  * Keep `BackupService.cs` role name mapping and user preservation block intact post-restore.
  * Ensure `scripts/configure-settings.ps1` identifies named instances as local using `$isLocalServer` (`.\*`, `localhost\*`, `127.0.0.1\*`).

---

### Rule 3: Operational Data Reset Pipeline (Hurdle 3 - ALL CLEARED & VERIFIED WORKING)
* **Goal:** Safely purge transactional data (visits, reports, bills, phlebotomy, samples) while retaining static masters, users, settings, and templates.
* **Implementation Details:**
  * `UserContext.cs` resolves `CurrentUserId` using `ClaimTypes.NameIdentifier` with a mandatory fallback to `"sub"`.
  * `SettingsController.cs` (`ResetOperationalData`) verifies the active user using `CurrentUserId` (with a secondary fallback to username claims `"username"` or `ClaimTypes.Name`) and validates the administrator password hash using `BCrypt.Net.BCrypt.Verify`.
  * Automatically creates an emergency database backup before purging operational records via `_databasePreparer.PrepareDatabaseAsync(isDryRun: false)`.
* **Verification Check on Code Edits:**
  * Do NOT remove the `"sub"` fallback in `UserContext.cs` or the username claim fallback in `SettingsController.cs`.

---

### Rule 4: Uninstaller & Packaging Stability
* **Goal:** Ensure smooth uninstallation and packaging without hung processes or hidden dialogs.
* **Implementation Details:**
  * `SynOS_Setup.iss` configures `UninstallForm.FormStyle := fsStayOnTop` so that the custom data decommission dialog form is rendered in the foreground on Windows.
* **Verification Check on Code Edits:**
  * Keep `fsStayOnTop` enabled on `UninstallForm` in `SynOS_Setup.iss`.

---

### Rule 5: Canonical Total Patient Intake (Walk-Ins) Metric Invariant
* **Goal:** Ensure the top-left executive KPI (`Walk-Ins (Paid/Credit)`) always represents the true physical front-door patient intake across all desks in the branch for the calendar day.
* **Implementation Details:**
  * In `InvoiceService.cs` (`GetDailyRevenueStatsAsync`), `totalIntakeWalkIns` counts all confirmed visits with non-draft tokens (`Token != null && !Token.StartsWith("D-")`), `Status != VisitStatus.Draft`, and `Status != VisitStatus.Cancelled`.
  * **PROHIBITION:** NEVER subtract or filter out Corporate B2B (Prepaid) or Credit visits from `WalkInsToday`. Physical patients are always walk-ins regardless of financial payer model.
  * In `ReceptionScreen.jsx`, `effectiveWalkIns` retains double-layered fallback resilience: if `summary.walkInsToday` is 0 but confirmed tokens exist in `todayNonDraftQueue`, it seamlessly renders the active queue count.

---

### Rule 6: Action Queue Payment Semantics & Corporate B2B Protection Invariant
* **Goal:** Prevent future coding agents or feature edits from polluting or hijacking the Action Queue payment classification.
* **Implementation Details:**
  * In `ReceptionScreen.jsx`, the payment column enforces a canonical 6-state hierarchy: `DRAFT` -> `PREPAID` -> `OVERPAID` -> `PARTIAL DUE` -> `FULL DUE` -> `PAID`.
  * `isOverpaid` MUST be scoped with `!isPrepaid && !isDraft` to strictly apply only to retail direct desk collections where money taken exceeds the bill.
  * Corporate B2B Prepaid visits MUST remain rendered as `PREPAID` with the partner doctor/hospital name as subtext, never corrupted with `OVERPAID` or `Refund Due` notices.

---

### Rule 7: Finance Hub 8-Tab Truth Engine & Cash Drawer Parity Invariant
* **Goal:** Ensure complete, unbreakable parity between `Collection History` and `Cash Drawer Shift Ledgers`, preventing zero-transaction wipes or cross-branch leakage across all 8 Finance tabs (`Bills & Collections`, `Due Bills`, `Pending Receivables`, `Visit Corrections`, `Cancellations & Refunds`, `Due Change & Patient Refunds`, `Collection History`, `Cash Drawer Ledgers`).
* **Implementation Details:**
  * In `FinanceBillsController.cs` (`GetMyCashDrawerLedger`), cashier attribution MUST NOT rely solely on `p.ReceivedByUserId == effectiveUserId`. It MUST observe the canonical 4-tier attribution hierarchy (`p.ReceivedByUserId == effectiveUserId || p.Invoice.Visit.AssignedReceptionistId == effectiveUserId || p.Invoice.Visit.CreatedByUserId == effectiveUserId`), matching `EconomicsIntelligenceService.cs`.
  * Never filter by a blind single-branch user fallback (e.g. `ubr.BranchId`). If no branch is explicitly passed or `All Branches` is active, never drop visits with null or alternate branch IDs.
  * Any edit touching `dbo.Payments` (voids, cancellations, prepaid switches) MUST emit or reverse the corresponding fact in `dbo.RevenueFacts`.
  * Before completing any task touching finance, the agent must verify all 8 Finance tabs remain functional with zero regressions.

---

### Rule 8: Branch Switching Architecture: Admin Oversight vs Multi-Branch Staff Invariant
* **Goal:** Prevent accidental branch cross-contamination and enforce strict role boundaries between executive multi-branch audit and front-line facility operations.
* **Implementation Details:**
  * **Admin Users:** Possess global cross-facility oversight. Admins can switch branches on the fly directly inside the Finance Filter Bar (`All Branches` consolidated view or single branch dropdown in `StandardFilterBar.jsx`) without altering their terminal's global operating facility.
  * **Non-Admin Multi-Branch Users (Receptionists, Phlebotomists, Lab Techs):** Strictly restricted from in-page consolidated multi-branch switching in the Finance Hub (`{showBranches && isAdmin && ...}`). They are bound to one active facility at a time. Staff with multi-branch access must switch their working facility globally from the top navigation bar (`SystemBar.jsx`), which updates their active facility context for the entire application session.


