# 🚨 Diagnostics Report: mpx-errors.txt

## 🛑 Critical Error (Must Fix Immediately)
### **Invalid Column Names in Database**
*   **Error Message:** `Microsoft.Data.SqlClient.SqlException (0x80131904): Invalid column name 'CancellationReason'. Invalid column name 'CancelledAt'.`
*   **Root Cause:** The application code (`Order` entity) has been updated with new fields, but the **Database Schema has not been updated**. The running database is missing the columns `CancellationReason` and `CancelledAt` on the `Orders` table.
*   **Impact:** All queries involving Orders (including Visit retrieval, Action Queue, etc.) are crashing with SQL exceptions. The application is effectively broken for core workflows.
*   **Solution:** You MUST apply the pending migration.
    1.  Stop the backend.
    2.  Run: `dotnet ef database update`
    3.  Restart the backend.

## ⚠️ Performance Warnings
### **Query Splitting Warning**
*   **Message:** `Compiling a query which loads related collections... no 'QuerySplittingBehavior' has been configured.`
*   **Reason:** EF Core is generating massive SQL JOINs (Cartesian Products) when loading Visits + Orders + Invoices together.
*   **Solution:** Configure `AsSplitQuery()` in the LINQ query or set global behavior to `QuerySplittingBehavior.SplitQuery` in `SynOSDbContext` configuration.

## ℹ️ Configuration Warnings
### **Analyzer TCP Listeners**
*   **Message:** `No analyzer TCP listeners configured in appsettings.json.`
*   **Reason:** The `AnalyzerIntegration` feature is enabled but `appsettings.json` has an empty list for listeners.
*   **Solution:** Safe to ignore for now if you are not testing physical analyzer connections.

### **HTTPS Redirect**
*   **Message:** `Failed to determine the https port for redirect.`
*   **Reason:** Dev environment SSL configuration issue. Safe to ignore in local dev if using HTTP.
