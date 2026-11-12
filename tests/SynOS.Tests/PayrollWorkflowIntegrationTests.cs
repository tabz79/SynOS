using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.HR;
using SynOS.Models.Entities.Payroll;
using SynOS.Models.Entities.Payables;
using SynOS.Models.Enums;
using SynOS.Services.Payroll.Calculation;
using SynOS.Services.Payroll.Facts;
using SynOS.Services.Payroll.Orchestration;
using Xunit;
using Moq;
using SynOS.Models.Entities.Time;

namespace SynOS.Tests
{
    public class PayrollWorkflowIntegrationTests
    {
        private SynOSDbContext GetDbContext()
        {
            var options = new DbContextOptionsBuilder<SynOSDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            return new SynOSDbContext(options);
        }

        [Fact]
        public async Task EndToEndPayrollWorkflow_CalculatesAndFinalizesSuccessfully()
        {
            // Arrange
            using var db = GetDbContext();
            
            // 1. Seed an active employee with custom statutory rates and base salary
            var employeeId = Guid.NewGuid();
            var employee = new Employee
            {
                EmployeeId = employeeId,
                FirstName = "Jane",
                LastName = "Doe",
                Email = "jane.doe@synos.com",
                IsActive = true,
                EmploymentType = EmploymentType.FullTime,
                SalaryType = SalaryType.Fixed,
                BaseSalary = 60000m,
                JoinDate = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero),
                PFEnabled = true,
                PFPercentage = 12.0m,
                ESIEnabled = true,
                ESIPercentage = 0.75m,
                TDSEnabled = true,
                TDSMode = TaxCalculationMode.Percentage,
                TDSValue = 10.0m, // 10% TDS
                JobTitle = "Technician"
            };
            db.Employees.Add(employee);

            // 2. Seed a payroll period
            var periodId = Guid.NewGuid();
            var startDate = new DateTime(2026, 5, 1);
            var endDate = new DateTime(2026, 5, 31);
            var period = new PayrollPeriod
            {
                PayrollPeriodId = periodId,
                StartDate = startDate,
                EndDate = endDate,
                Status = PayrollPeriodStatus.Open
            };
            db.PayrollPeriods.Add(period);

            // 3. Seed some attendance exceptions to check LOP Days Count proration
            // Let's add: 1 Unpaid Leave (Absent) = 1.0 day LOP, 1 HalfDay = 0.5 day LOP. Total LOP = 1.5 days.
            db.AttendanceLogs.Add(new AttendanceLog
            {
                AttendanceId = Guid.NewGuid(),
                EmployeeId = employeeId,
                ClockIn = new DateTime(2026, 5, 10, 9, 0, 0),
                ClockOut = new DateTime(2026, 5, 10, 18, 0, 0),
                Status = "Absent"
            });
            db.AttendanceLogs.Add(new AttendanceLog
            {
                AttendanceId = Guid.NewGuid(),
                EmployeeId = employeeId,
                ClockIn = new DateTime(2026, 5, 15, 9, 0, 0),
                ClockOut = new DateTime(2026, 5, 15, 13, 0, 0),
                Status = "HalfDay"
            });

            await db.SaveChangesAsync();

            // Instantiate components
            var calculationLogic = new PayrollCalculationLogicStub(db);
            var factWriter = new PayrollFactWriter(db);
            var spendFactWriterMock = new Mock<SynOS.Services.SpendEngine.ISpendFactWriter>();
            var userServiceMock = new Mock<SynOS.Services.IUserService>();
            var workflowService = new PayrollWorkflowService(db, calculationLogic, factWriter, spendFactWriterMock.Object, userServiceMock.Object);

            // Act - Step 1: Start Run
            var run = await workflowService.StartPayrollRunAsync(periodId);
            Assert.NotNull(run);
            Assert.Equal(PayrollRunStatus.Draft, run.Status);

            // Act - Step 2: Calculate
            await workflowService.ExecuteCalculationAsync(run.PayrollRunId);
            
            // Reload run to verify calculated status and results
            var calculatedRun = await db.PayrollRuns.FindAsync(run.PayrollRunId);
            Assert.NotNull(calculatedRun);
            Assert.Equal(PayrollRunStatus.Calculated, calculatedRun.Status);
            Assert.False(string.IsNullOrWhiteSpace(calculatedRun.ProvisionalResultData));

            // Act - Step 3: Finalize
            // This tests that our nested transaction / double transaction fix in PayrollFactWriter works!
            await workflowService.FinalizePayrollRunAsync(calculatedRun.PayrollRunId);

            // Assert
            var finalizedRun = await db.PayrollRuns.FindAsync(run.PayrollRunId);
            Assert.NotNull(finalizedRun);
            Assert.Equal(PayrollRunStatus.Finalized, finalizedRun.Status);
            
            // Check that the payroll period is finalized
            var finalizedPeriod = await db.PayrollPeriods.FindAsync(periodId);
            Assert.NotNull(finalizedPeriod);
            Assert.Equal(PayrollPeriodStatus.Finalized, finalizedPeriod.Status);

            // Verify written facts
            var facts = await db.PayrollFacts
                .Where(f => f.PayrollRunId == run.PayrollRunId)
                .ToListAsync();
            Assert.NotEmpty(facts);
            Assert.Contains(facts, f => f.EmployeeId == employeeId);

            // Verify generated payables
            var payables = await db.EmployeePayables
                .Where(p => p.PayrollRunId == run.PayrollRunId)
                .ToListAsync();
            Assert.Single(payables);

            var payable = payables.First();
            Assert.Equal(employeeId, payable.EmployeeId);
            
            // Total days in May 2026 = 31.
            // Active days = 31.
            // Unpaid days = 1.5.
            // Proration ratio = (31 - 1.5) / 31 = 29.5 / 31 = 0.9516129
            // Base Salary = 60000.
            // Prorated Base = 60000 * 29.5 / 31 = 57096.77
            // Nearest Rupee = 57097 (stored in GrossSalary)
            Assert.Equal(57097m, payable.GrossSalary);
            Assert.Equal(1.5m, payable.LopDaysCount);

            // PF: Statutory wage ceiling applies (₹15,000 ceiling, 12% = 1,800)
            Assert.Equal(1800m, payable.PFDeduction);

            // ESI: Gross salary (57,097) > 21,000 threshold, so employee is exempt from ESI
            Assert.Equal(0m, payable.ESIDeduction);

            // TDS = 10% of GrossSalary = 57097 * 0.10 = 5709.70
            Assert.Equal(5709.70m, payable.TDSDeduction);

            // Snapshots match
            Assert.Equal(60000m, payable.SnapshotBaseSalary);
            Assert.Equal(0.12m, payable.SnapshotPFRate);
            Assert.Equal(0m, payable.SnapshotESIRate); // Exempt
            Assert.Equal(TaxCalculationMode.Percentage, payable.SnapshotTDSMode);
            Assert.Equal(10.0m, payable.SnapshotTDSValue);

            // Net Payable = GrossSalary (57097) - PF (1800) - ESI (0) - TDS (5709.70) = 49587.30 -> Rounded to 49587
            Assert.Equal(49587m, payable.NetPayable);
        }

        [Fact]
        public async Task PayrollWorkflow_EnforcesZeroFloorAndSplitsExcessAdvances()
        {
            // Arrange: Employee with 20,000 base salary and a 35,000 advance
            using var db = GetDbContext();
            var employeeId = Guid.NewGuid();
            var employee = new Employee
            {
                EmployeeId = employeeId,
                FirstName = "Ramesh",
                LastName = "Kumar",
                Email = "ramesh@synos.com",
                IsActive = true,
                BaseSalary = 20000m,
                JoinDate = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero),
                PFEnabled = false,
                ESIEnabled = false,
                TDSEnabled = false,
                JobTitle = "Lab Assistant"
            };
            db.Employees.Add(employee);

            var periodId = Guid.NewGuid();
            var period = new PayrollPeriod
            {
                PayrollPeriodId = periodId,
                StartDate = new DateTime(2026, 6, 1),
                EndDate = new DateTime(2026, 6, 30),
                Status = PayrollPeriodStatus.Open
            };
            db.PayrollPeriods.Add(period);

            var advanceId = Guid.NewGuid();
            var advance = new SalaryAdvance
            {
                AdvanceId = advanceId,
                EmployeeId = employeeId,
                Amount = 35000m,
                Status = "Approved",
                Reason = "Emergency Loan",
                IssuedAt = DateTime.UtcNow
            };
            db.SalaryAdvances.Add(advance);
            await db.SaveChangesAsync();

            var calculationLogic = new PayrollCalculationLogicStub(db);
            var factWriter = new PayrollFactWriter(db);
            var spendFactWriterMock = new Mock<SynOS.Services.SpendEngine.ISpendFactWriter>();
            var userServiceMock = new Mock<SynOS.Services.IUserService>();
            var workflowService = new PayrollWorkflowService(db, calculationLogic, factWriter, spendFactWriterMock.Object, userServiceMock.Object);

            // Act
            var run = await workflowService.StartPayrollRunAsync(periodId);
            await workflowService.ExecuteCalculationAsync(run.PayrollRunId);
            await workflowService.FinalizePayrollRunAsync(run.PayrollRunId);

            // Assert: Net salary MUST NOT be negative (floor of 0)
            var payable = await db.EmployeePayables.FirstOrDefaultAsync(p => p.EmployeeId == employeeId);
            Assert.NotNull(payable);
            Assert.Equal(20000m, payable.GrossSalary);
            Assert.Equal(20000m, payable.OtherDeductions); // Deducted 20,000 advance this cycle
            Assert.Equal(0m, payable.NetPayable); // Zero floor respected!

            // Assert: Original advance adjusted to 20,000, remainder of 15,000 carried forward as Approved
            var originalAdv = await db.SalaryAdvances.FindAsync(advanceId);
            Assert.NotNull(originalAdv);
            Assert.Equal("Adjusted", originalAdv.Status);
            Assert.Equal(20000m, originalAdv.Amount);

            var remainderAdv = await db.SalaryAdvances.FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.Status == "Approved");
            Assert.NotNull(remainderAdv);
            Assert.Equal(15000m, remainderAdv.Amount);
        }

        [Fact]
        public async Task PayrollWorkflow_ReopenFinalizedRun_ReversesPayablesAndResetsAdvances()
        {
            // Arrange
            using var db = GetDbContext();
            var employeeId = Guid.NewGuid();
            var employee = new Employee
            {
                EmployeeId = employeeId,
                FirstName = "Suresh",
                LastName = "Reddy",
                Email = "suresh@synos.com",
                IsActive = true,
                BaseSalary = 25000m,
                JoinDate = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero),
                PFEnabled = false,
                ESIEnabled = false,
                TDSEnabled = false,
                JobTitle = "Phlebotomist"
            };
            db.Employees.Add(employee);

            var periodId = Guid.NewGuid();
            var period = new PayrollPeriod
            {
                PayrollPeriodId = periodId,
                StartDate = new DateTime(2026, 7, 1),
                EndDate = new DateTime(2026, 7, 31),
                Status = PayrollPeriodStatus.Open
            };
            db.PayrollPeriods.Add(period);

            var advanceId = Guid.NewGuid();
            var advance = new SalaryAdvance
            {
                AdvanceId = advanceId,
                EmployeeId = employeeId,
                Amount = 5000m,
                Status = "Approved",
                Reason = "Festival Advance",
                IssuedAt = DateTime.UtcNow
            };
            db.SalaryAdvances.Add(advance);
            await db.SaveChangesAsync();

            var calculationLogic = new PayrollCalculationLogicStub(db);
            var factWriter = new PayrollFactWriter(db);
            var spendFactWriterMock = new Mock<SynOS.Services.SpendEngine.ISpendFactWriter>();
            var userServiceMock = new Mock<SynOS.Services.IUserService>();
            var workflowService = new PayrollWorkflowService(db, calculationLogic, factWriter, spendFactWriterMock.Object, userServiceMock.Object);

            var run = await workflowService.StartPayrollRunAsync(periodId);
            await workflowService.ExecuteCalculationAsync(run.PayrollRunId);
            await workflowService.FinalizePayrollRunAsync(run.PayrollRunId);

            // Verify finalized state
            Assert.Single(await db.EmployeePayables.ToListAsync());
            var advBeforeReopen = await db.SalaryAdvances.FindAsync(advanceId);
            Assert.Equal("Adjusted", advBeforeReopen.Status);

            // Act: Reopen the run (since no payables are settled)
            await workflowService.ReopenOrVoidFinalizedRunAsync(run.PayrollRunId);

            // Assert: Run is back to Calculated, Period back to Locked, Payables and Facts removed, Advance back to Approved
            var reopenedRun = await db.PayrollRuns.FindAsync(run.PayrollRunId);
            Assert.Equal(PayrollRunStatus.Calculated, reopenedRun.Status);

            var reopenedPeriod = await db.PayrollPeriods.FindAsync(periodId);
            Assert.Equal(PayrollPeriodStatus.Locked, reopenedPeriod.Status);

            Assert.Empty(await db.EmployeePayables.ToListAsync());
            Assert.Empty(await db.PayrollFacts.ToListAsync());

            var advAfterReopen = await db.SalaryAdvances.FindAsync(advanceId);
            Assert.Equal("Approved", advAfterReopen.Status);
            Assert.Null(advAfterReopen.AdjustedInPayrollRunId);
        }

        [Fact]
        public async Task PayrollWorkflow_ReopenFinalizedRun_FailsWhenPayableIsSettled()
        {
            // Arrange
            using var db = GetDbContext();
            var employeeId = Guid.NewGuid();
            var employee = new Employee
            {
                EmployeeId = employeeId,
                FirstName = "Anita",
                LastName = "Sharma",
                Email = "anita@synos.com",
                IsActive = true,
                BaseSalary = 30000m,
                JoinDate = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero),
                JobTitle = "Biochemist"
            };
            db.Employees.Add(employee);

            var periodId = Guid.NewGuid();
            var period = new PayrollPeriod
            {
                PayrollPeriodId = periodId,
                StartDate = new DateTime(2026, 8, 1),
                EndDate = new DateTime(2026, 8, 31),
                Status = PayrollPeriodStatus.Open
            };
            db.PayrollPeriods.Add(period);
            await db.SaveChangesAsync();

            var calculationLogic = new PayrollCalculationLogicStub(db);
            var factWriter = new PayrollFactWriter(db);
            var spendFactWriterMock = new Mock<SynOS.Services.SpendEngine.ISpendFactWriter>();
            var userServiceMock = new Mock<SynOS.Services.IUserService>();
            var workflowService = new PayrollWorkflowService(db, calculationLogic, factWriter, spendFactWriterMock.Object, userServiceMock.Object);

            var run = await workflowService.StartPayrollRunAsync(periodId);
            await workflowService.ExecuteCalculationAsync(run.PayrollRunId);
            await workflowService.FinalizePayrollRunAsync(run.PayrollRunId);

            // Simulate that one payable was settled
            var payable = await db.EmployeePayables.FirstAsync();
            payable.AmountPaid = payable.NetPayable;
            payable.Status = "Settled";
            await db.SaveChangesAsync();

            // Act & Assert: Should throw exception preventing reopening of settled run
            await Assert.ThrowsAsync<SynOS.Services.Payroll.Orchestration.Exceptions.PayrollOrchestrationException>(async () =>
            {
                await workflowService.ReopenOrVoidFinalizedRunAsync(run.PayrollRunId);
            });
        }
    }
}
