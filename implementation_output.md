### Output for PayrollFact Idempotency Patch

**1. `SynOSDbContext.cs` Diff**

```diff
--- a/src/SynOS.Data/SynOSDbContext.cs
+++ b/src/SynOS.Data/SynOSDbContext.cs
@@ -428,6 +428,7 @@
             {
                 entity.ToTable("PayrollFacts");
                 entity.HasKey(e => e.PayrollFactId);
+                entity.HasIndex(e => new { e.PayrollRunId, e.EmployeeId, e.PayComponentId }).IsUnique();
             });
             modelBuilder.Entity<PayStructureComponent>(entity =>
             {
```

**2. `AddUniqueConstraintToPayrollFacts` Migration File**

File: `src/SynOS.Data/Migrations/20260110124032_AddUniqueConstraintToPayrollFacts.cs`
```csharp
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueConstraintToPayrollFacts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_PayrollFacts_PayrollRunId_EmployeeId_PayComponentId",
                table: "PayrollFacts",
                columns: new[] { "PayrollRunId", "EmployeeId", "PayComponentId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PayrollFacts_PayrollRunId_EmployeeId_PayComponentId",
                table: "PayrollFacts");
        }
    }
}
```

**3. Updated `PayrollFactWriter.cs` Implementation**

File: `src/SynOS.Services/Payroll/Facts/PayrollFactWriter.cs`
```csharp
using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.Payroll;
using SynOS.Models.Entities.Payroll;
using SynOS.Models.Enums;
using SynOS.Services.Payroll.Exceptions;

namespace SynOS.Services.Payroll.Facts
{
    public class PayrollFactWriter : IPayrollFactWriter
    {
        private readonly SynOSDbContext _context;

        public PayrollFactWriter(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task WriteFactsAsync(PayrollRun payrollRun, PayrollCalculationResult calculationResult)
        {
            // State Guard
            if (payrollRun.Status != PayrollRunStatus.Calculated)
            {
                throw new PayrollFactWriteViolationException("Facts can only be written for a run in the 'Calculated' state.");
            }

            // Result Guard
            if (calculationResult == null || !calculationResult.ProvisionalResults.Any())
            {
                throw new PayrollFactWriteViolationException("Cannot write facts for an empty or null calculation result.");
            }

            // Validation Error Guard
            if (calculationResult.ValidationErrors.Any())
            {
                throw new PayrollFactWriteViolationException("Cannot write facts for a calculation result that contains validation errors.");
            }

            // Duplicate Fact Guard
            var existingFacts = await _context.PayrollFacts
                .AsNoTracking()
                .AnyAsync(f => f.PayrollRunId == payrollRun.PayrollRunId);
            if (existingFacts)
            {
                throw new PayrollFactWriteViolationException($"Facts for PayrollRunId '{payrollRun.PayrollRunId}' have already been written.");
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                foreach (var provisionalResult in calculationResult.ProvisionalResults)
                {
                    var fact = new PayrollFact
                    {
                        PayrollFactId = Guid.NewGuid(),
                        PayrollRunId = payrollRun.PayrollRunId,
                        PayrollPeriodId = payrollRun.PayrollPeriodId, // Correctly populated
                        EmployeeId = provisionalResult.EmployeeId,
                        PayComponentId = provisionalResult.PayComponentId,
                        Amount = provisionalResult.Amount
                    };
                    _context.PayrollFacts.Add(fact);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (DbUpdateException ex)
            {
                // Any persistence error is treated as a fatal violation of truth-writing.
                // This avoids provider-specific error code inspection.
                throw new PayrollFactWriteViolationException("A database persistence error occurred, indicating a potential duplicate write or data conflict. The transaction was rolled back.", ex);
            }
        }
    }
}
```