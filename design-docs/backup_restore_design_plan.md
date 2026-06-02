# SynOS Backup & Restore - Future Implementation Design Spec

This document details the approved architectural design, logical groupings, API contracts, and recommended import strategies for the **SynOS Selective Backup & Restore Center**. It serves as a persistent technical blueprint to be loaded and implemented when shipping.

---

## 1. Core Architectural Pillars

### A. Logical Category Segments
To support selective backups (allowing administrators to export master catalogs independently of patient data), the database tables are categorized into four logical segments:

1. **Catalog & Test Master**
   * *Purpose:* Test dictionary, parameter boundaries, and pricing structures.
   * *Target Tables:*
     * `CatalogServiceCategory`, `CatalogProcessingDepartment`, `CatalogSpecimenType`, `CatalogTubeType`, `CatalogTest`, `CatalogParameter`, `CatalogTestNote`, `CatalogPanelMapping`
     * `Tests`, `Parameters`, `ReferenceRanges`, `PriceConfigs`
2. **Referral Doctor Network**
   * *Purpose:* Mapped healthcare clinics, reference labs, and referral commission rules.
   * *Target Tables:*
     * `ReferralPartner`, `ReferralCommissionRule`
     * `Referrers`
3. **Inventory & Consumables Catalog**
   * *Purpose:* Stock master items, authorized suppliers, and tube/test item mappings.
   * *Target Tables:*
     * `ImsTubeMaster`, `ImsConsumable`, `ImsSupplier`, `ImsTestTubeMap`, `ImsTestConsumableMap`
4. **Global System & Operating Configurations**
   * *Purpose:* Enterprise tenant settings, branch settings, printers, and turnaround limits.
   * *Target Tables:*
     * `LabProfile`, `RoleDepartmentConfig`, `DeptScopePolicy`, `Branch`, `BranchPrinter`, `TerminalPrinterConfig`

---

## 2. Archive Format Specification
* **Format:** Compressed standard `.synos.bak` ZIP package.
* **Internal Contents:** Structured, human-readable JSON files representing datasets for individual tables (e.g. `tests.json`, `partners.json`).
* **Benefits:**
  * **Database-Agnostic:** Perfect compatibility regardless of whether the target system runs on SQL Server, SQLite, or PostgreSQL.
  * **Inspectability:** Easily modified or seeded directly by developers using plain text or scripting.

---

## 3. Recommended Import & Seeding Strategies

### A. Idempotent Merge (Safe Upsert - Default Mode)
* **Strategy:** Records are resolved and matched by their unique logical identifiers (such as parameter codes, test codes, or referral partner names) instead of database-generated GUIDs.
* **Action:** If the unique identifier matches an existing record, the database updates it; if not, it inserts it.
* **Benefit:** Safely updates configuration tables while keeping historical patient invoice records, collection transactions, and results logs completely intact.

### B. Destructive Override (Total Purge Mode)
* **Strategy:** Performs a soft-deactivation (marking unlisted entities as `IsActive = false`) rather than hard SQL deletions on the target segments.
* **Benefit:** Prevents database cascade constraint failures and preserves transaction history links while cleanly seeding the updated catalog configurations.

---

## 4. API Endpoints Contract

```csharp
[ApiController]
[Route("api/v1/admin/backup")]
[Authorize(Roles = "Admin,SystemAdmin")]
public class BackupController : ControllerBase
{
    // Exports selected logical segments as a zipped .synos.bak package
    [HttpPost("export")]
    public async Task<IActionResult> Export([FromBody] List<string> segments) { ... }

    // Uploads a backup archive file and triggers restoration (Mode: "Merge" or "Override")
    [HttpPost("import")]
    public async Task<IActionResult> Import([FromForm] IFormFile file, [FromForm] string importMode = "Merge") { ... }

    // Lists the last 10 database backups from the BackupPath cron directory
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory() { ... }
}
```

---

## 5. UI Dashboard Concept Layout

```
+---------------------------------------------------------------------------------+
|                                 BACKUP & RESTORE CENTER                        |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  Select segments to export:                                                     |
|  [x] Catalog & Test Master    (320 test codes, 4 modalities)                    |
|  [x] Referral Doctor Network  (42 clinics, 3 commission models)                 |
|  [ ] Inventory Consumables    (85 consumable items, 10 suppliers)               |
|  [x] Global Configurations    (Branding settings, printer routing)              |
|                                                                                 |
|  [ Export Selected Archive (.synos.bak) ]                                      |
|                                                                                 |
|  -----------------------------------------------------------------------------  |
|                                                                                 |
|  Import Archive:                                                                |
|  +---------------------------------------------------------------------------+  |
|  | Drag and drop your .synos.bak file here or [Browse File]                   |  |
|  +---------------------------------------------------------------------------+  |
|                                                                                 |
|  Import Strategy Mode:                                                          |
|  (•) Idempotent Merge (Upsert matching codes, preserves transaction links)      |
|  ( ) Purge & Destructive Override (Overwrites existing category segments)       |
|                                                                                 |
|  [ Trigger Selective Restoration ]                                              |
+---------------------------------------------------------------------------------+
```
