A. Verdict
Walk-in visits are successfully persisted because `SaveChangesAsync` is executed unconditionally in `CreateVisitAsync` before event emission; the "missing" rows are likely due to `CreatedAt` being stored in UTC while verification queries use Local Time.

B. Evidence Table
Step | File | Line | Observation
--- | --- | --- | ---
CreateVisitAsync | src/SynOS.Services/VisitService.cs | 115 | `CreatedAt = DateTime.UtcNow` (UTC Assigned)
Persistence | src/SynOS.Services/VisitService.cs | 230 | `await _context.SaveChangesAsync()` (Executed unconditionally)
Event Write | src/SynOS.Services/VisitService.cs | 243 | `WriteEventAsync` called AFTER persistence
Event Commit | src/SynOS.Services/Operational/OperationalEventWriter.cs | 42 | `SaveChangesAsync` called again for event

C. Final Elimination
❌ Persistence logic flaw
❌ DB / Context mismatch
❌ Intentional draft behavior
✅ **Timezone / Query Interpretation**

D. Fix Direction
Stop relying on `CreatedAt` (UTC) for business-day queries; strictly use `TokenDate` (Local Business Date) for all operational filtering and verification.
