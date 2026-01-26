1. Controller Analysis
   - File: src/SynOS.Api/Controllers/ActionQueueController.cs
   - Method: GetTodayActionQueue
   - Date Passed: DateTime.Now (Server Local Time, including time component)

2. Engine Filter Evaluation
   - Filter 1 (Branch): visit.BranchId == branchId (Passes, assuming context matches DB)
   - Filter 2 (Date): visit.TokenDate >= date.Date && visit.TokenDate < date.Date.AddDays(1) (Passes IF Server Date == DB Date)
   - Filter 3 (Status): visit.Status != "Cancelled" (Passes for PendingPayment/Paid)

3. DB vs Engine Mismatch
   - Expected: 3 rows returned for 2026-01-25.
   - Actual: 0 rows (Empty List).

4. Root Cause Statement
   The Action Queue endpoint is incorrectly scoped by date because the Controller passes `DateTime.Now` (Server Time), which may differ from the `TokenDate` (Business/Lab Time) stored in the database if the server timezone (e.g., UTC) does not match the lab's operational timezone.
