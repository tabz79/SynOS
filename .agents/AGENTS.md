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
