1. Root Cause
The audit proves that `Visit.TokenDate` (Write) and the Action Queue Query (Read) both currently rely on `System.Local` time, meaning they **should** align. The observed failure to display visits therefore indicates a mismatch in **Branch Context** (User's Branch != Visit's Branch) or a **Transaction Isolation** latency, rather than a date calculation error in the current code.

2. Exact Code Locations
   - Write: `src/SynOS.Services/VisitService.cs`, method `CreateVisitAsync` (Line 103) & `AssignOfficialTokenAsync` (Line 238).
   - Read: `src/SynOS.Api/Controllers/ActionQueueController.cs`, method `GetTodayActionQueue` (Line 32).

3. One-Line Fix Direction
   Both visit creation and Action Queue must read the business date from the same single `IBusinessDateProvider` authority to prevent architectural drift and ensure testability.
