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

namespace SynOS.Tests
{
    public class PayrollWorkflowIntegrationTests
    {
        private SynOSDbContext GetDbContext()
        {
            var options = new DbContextOptionsBuilder<SynOSDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
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
                JoinDate = DateTimeOffset.UtcNow.AddMonths(-3),
                PFEnabled = true,
                PFPercentage = 12.0m,
                ESIEnabled = true,
                ESIPercentage = 0.75m,
                TDSEnabled = true,
                TDSMode = TaxCalculationMode.Percentage,
                TDSValue = 10.0m // 10% TDS
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
                AttendanceLogId = Guid.NewGuid(),
                EmployeeId = employeeId,
                ClockIn = new DateTime(2026, 5, 10, 9, 0, 0),
                ClockOut = new DateTime(2026, 5, 10, 18, 0, 0),
                Status = "Absent",
                RawStatus = "Absent"
            });
            db.AttendanceLogs.Add(new AttendanceLog
            {
                AttendanceLogId = Guid.NewGuid(),
                EmployeeId = employeeId,
                ClockIn = new DateTime(2026, 5, 15, 9, 0, 0),
                ClockOut = new DateTime(2026, 5, 15, 13, 0, 0),
                Status = "HalfDay",
                RawStatus = "HalfDay"
            });

            await db.SaveChangesAsync();

            // Instantiate components
            var calculationLogic = new PayrollCalculationLogicStub(db);
            var factWriter = new PayrollFactWriter(db);
            var workflowService = new PayrollWorkflowService(db, calculationLogic, factWriter);

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

            // PF = 12% of GrossSalary = 57097 * 0.12 = 6851.64
            Assert.Equal(6851.64m, payable.PFDeduction);

            // ESI = 0.75% of GrossSalary = 57097 * 0.0075 = 428.23
            Assert.Equal(428.23m, payable.ESIDeduction);

            // TDS = 10% of GrossSalary = 57097 * 0.10 = 5709.70
            Assert.Equal(5709.70m, payable.TDSDeduction);

            // Snapshots match
            Assert.Equal(60000m, payable.SnapshotBaseSalary);
            Assert.Equal(0.12m, payable.SnapshotPFRate);
            Assert.Equal(0.0075m, payable.SnapshotESIRate);
            Assert.Equal(TaxCalculationMode.Percentage, payable.SnapshotTDSMode);
            Assert.Equal(10.0m, payable.SnapshotTDSValue);

            // Net Payable = GrossSalary (57097) - PF (6851.64) - ESI (428.23) - TDS (5709.70) = 44107.43 -> Rounded to 44107
            Assert.Equal(44107m, payable.NetPayable);
        }
    }
}
