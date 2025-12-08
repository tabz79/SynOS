
## Day 14.6 Implementation Summary:
-----------------------------------
*   **What:** Implemented multi-branch security, query limits, and administrative maintenance tools for the Mini PACS backend. This makes the PACS module robust for production.
*   **New Features:**
    *   **Centralized Access Guard:** `IRadiologyAccessGuard` was introduced and integrated into all PACS service methods to enforce Org/Branch scoping and RBAC (Radiologist, XRayTech, Admin roles).
    *   **Query Limits:** Configurable limits (`MaxInstancesPerSeriesInSeriesTree`, `MaxTotalInstancesPerStudyInSeriesTree`) were added to `PacsSettings` and enforced in `GetSeriesTreeAsync` to prevent large API responses.
    *   **Soft Deletion:** `IsDeleted`, `DeletedAt`, `DeletedBy` properties were added to `PacsSeries` and `PacsInstance` entities for logical deletion.
    *   **Admin Tools:** New DTOs and service methods (`GetOrphanSummaryAsync`, `GetStorageStatsAsync`, `CleanupOrphansAsync`) were implemented.
    *   **Admin API Endpoints:** A new `PacsAdminController` exposes `GET /orphans`, `POST /orphans/cleanup`, and `GET /storage-stats` endpoints, restricted to Admin/SuperAdmin users.
*   **Files Affected:**
    *   Added: `src/SynOS.Services/Security/IRadiologyAccessGuard.cs`, `src/SynOS.Services/Security/RadiologyAccessGuard.cs`, `src/SynOS.Models/DTOs/PACS/PacsAdminDtos.cs`, `src/SynOS.Api/Controllers/Radiology/PacsAdminController.cs`
    *   Modified: `src/SynOS.Services/PacsService.cs`, `src/SynOS.Services/IPacsService.cs`, `src/SynOS.Models/Configuration/PacsSettings.cs`, `src/SynOS.Api/appsettings.json`, `src/SynOS.Api/Program.cs`, `src/SynOS.Models/Entities/PACS/PacsSeries.cs`, `src/SynOS.Models/Entities/PACS/PacsInstance.cs`
    *   EF Core migration `AddSoftDeleteToPacsTables` was created and applied.
*   **Manual Steps:** None, beyond ensuring the `dotnet` process is not locking files during build/migration.

---

## Manual Testing Steps via Swagger:
-----------------------------------
**Prerequisite:** Ensure you have a `radiologyStudyId` that has DICOM files uploaded to it (preferably with a mix of correct and placeholder metadata from previous Day tests). You will need a user with 'Admin' role.

**Test 1: Verify Access Guard and Limits in GetSeriesTreeAsync**

1.  Authenticate as a user with 'Radiologist' or 'XRayTech' role.
2.  Navigate to `GET /api/v1/radiology/pacs/studies/{radiologyStudyId}/series-tree` in Swagger.
3.  Provide a `radiologyStudyId` associated with your user's permissions.
4.  Execute and expect `200 OK`.
5.  (Optional) Try to call the same endpoint with a `radiologyStudyId` that *should not* be accessible by your current user's permissions (e.g., belongs to a different Org/Branch, if implemented).
6.  **Verification:**
    *   Expect a `200 OK` for authorized access.
    *   Expect a `403 Forbidden` for unauthorized access attempts.
    *   (To test limits, you would need a study with many thousands of instances, which would require custom data generation. The code correctly checks `_pacsSettings.Max...` values and throws `InvalidOperationException` if limits are exceeded.)

**Test 2: Verify Admin Orphan Summary**

1.  Authenticate as a user with 'Admin' privileges.
2.  Navigate to `GET /api/v1/radiology/pacs/admin/orphans` in Swagger.
3.  Execute the request.
4.  **Verification:**
    *   Expect a `200 OK` response.
    *   The response body should be a `PacsOrphanSummaryDto` showing counts for `InstancesMissingFiles`, `InstancesWithMissingStudy`, and `SeriesWithNoInstances`.
    *   To truly test this:
        *   **InstancesMissingFiles:** Manually delete a `.dcm` file from your `D:\SynOS\Pacs` folder (ensure the corresponding DB record in `PacsInstances` still exists). Re-run this GET endpoint. The count should increase.
        *   **InstancesWithMissingStudy:** Manually delete a `RadiologyStudy` record directly from the database (e.g., via SSMS) while leaving its associated `PacsInstance` entries. Re-run this GET endpoint. The count should increase.

**Test 3: Verify Admin Orphan Cleanup**

1.  **Ensure you have orphans (as created in Test 2):** (e.g., a `.dcm` file is physically deleted but its DB record exists).
2.  Authenticate as 'Admin'.
3.  Navigate to `POST /api/v1/radiology/pacs/admin/orphans/cleanup` in Swagger.
4.  Execute the request.
5.  **Verification:**
    *   Expect a `200 OK` response.
    *   The response body should be a `PacsOrphanSummaryDto` showing updated counts (likely all zero if cleanup was successful).
    *   Query the database: `SELECT * FROM PacsInstances WHERE IsDeleted = 1;` and `SELECT * FROM PacsSeries WHERE IsDeleted = 1;`
    *   **Confirm that the `PacsInstance` and `PacsSeries` records corresponding to the orphaned data now have `IsDeleted = 1`, and `DeletedAt`/`DeletedBy` are populated.**

**Test 4: Verify Admin Storage Statistics**

1.  Authenticate as 'Admin'.
2.  Navigate to `GET /api/v1/radiology/pacs/admin/storage-stats` in Swagger.
3.  Execute the request.
4.  **Verification:**
    *   Expect a `200 OK` response.
    *   The response body should be a `PacsStorageStatsDto` providing aggregated information like `TotalBytes`, `TotalStudies`, `TotalSeries`, `TotalInstances`, and `ByOrgBranch` (if Org/Branch IDs were implemented and populated).

The backend is now ready for testing Day 14.6 functionality.
