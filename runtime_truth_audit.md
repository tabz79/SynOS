A. Verdict
Activity events are emitted from `VisitService.CreateVisitAsync` (L243) **AFTER** `_context.SaveChangesAsync()` (L230) successfully persists the Visit; therefore, the visit **IS** persisted in the application flow.

B. Evidence Table
Step | File | Method | Line | Observation
--- | --- | --- | --- | ---
Visit Add | `src/SynOS.Services/VisitService.cs` | `CreateVisitAsync` | 127 | `_context.Visits.Add(visit)` executed.
Visit Commit | `src/SynOS.Services/VisitService.cs` | `CreateVisitAsync` | 230 | `await _context.SaveChangesAsync()` executed unconditionally.
Event Emission | `src/SynOS.Services/VisitService.cs` | `CreateVisitAsync` | 243 | `WriteEventAsync` called only after commit.
Context Check | `src/SynOS.Api/Program.cs` | `AddScoped` | - | `VisitService` and `OperationalEventWriter` share the same `SynOSDbContext` instance.

C. Final Classification
⬜ Persistence skipped by design
⬜ Wrong DbContext / database
⬜ Event pipeline detached from core state (bug)
✅ **Other (Code proves persistence)**: The codebase strictly enforces "Commit-First, Event-Second". Since the event exists and 200 OK is returned, the Visit **must** have been committed to the configured database. The inability to find it implies the verification query is running against a different database instance or the row was deleted post-creation.

D. Fix Direction
Verify the connection string in `appsettings.json` matches the Azure Data Studio connection exactly, and check for any external processes/triggers deleting rows from `Visits`.
