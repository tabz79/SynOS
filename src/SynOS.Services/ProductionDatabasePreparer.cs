using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Catalog;
using SynOS.Models.Entities.HR;
using SynOS.Models.Entities.IMS;
using SynOS.Models.Entities.Operations;
using SynOS.Models.Entities.Governance;
using SynOS.Models.Entities.PACS;
using SynOS.Models.Entities.Payables;
using SynOS.Models.Entities.Time;
using SynOS.Models.Entities.Leave;

namespace SynOS.Services
{
    public class ProductionDatabasePreparer
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<ProductionDatabasePreparer> _logger;

        public enum EntityCategory
        {
            Transactional,
            MasterData,
            SystemInternal
        }

        public ProductionDatabasePreparer(SynOSDbContext context, ILogger<ProductionDatabasePreparer> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task PrepareDatabaseAsync(bool isDryRun)
        {
            _logger.LogInformation("ProductionDatabasePreparer: Database preparation started.");

            // 1. Classify and validate all EF entities
            var entityTypes = _context.Model.GetEntityTypes();
            var unclassified = new List<string>();
            var transactionalTypes = new List<Type>();
            var masterDataTypes = new List<Type>();
            var systemInternalTypes = new List<Type>();

            foreach (var entityType in entityTypes)
            {
                var type = entityType.ClrType;
                if (type == null) continue;

                var category = ClassifyEntity(type);
                if (category == null)
                {
                    unclassified.Add(type.FullName ?? type.Name);
                }
                else if (category == EntityCategory.Transactional)
                {
                    transactionalTypes.Add(type);
                }
                else if (category == EntityCategory.MasterData)
                {
                    masterDataTypes.Add(type);
                }
                else if (category == EntityCategory.SystemInternal)
                {
                    systemInternalTypes.Add(type);
                }
            }

            if (unclassified.Any())
            {
                _logger.LogError("ERROR: Unclassified entity detected during database preparation check:\n\n{Entities}\n", string.Join("\n", unclassified));
                throw new InvalidOperationException($"Refusing to prepare database. Unclassified entities detected: {string.Join(", ", unclassified)}");
            }

            _logger.LogInformation("ProductionDatabasePreparer: Schema validation completed. {Count} transactional entities identified.", transactionalTypes.Count);

            // 2. Execution Phase (Dynamic SQL)
            using var dbTransaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation("ProductionDatabasePreparer: Disabling foreign key constraints...");
                await _context.Database.ExecuteSqlRawAsync("EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'");

                _logger.LogInformation("ProductionDatabasePreparer: Executing bulk deletions...");
                foreach (var type in transactionalTypes)
                {
                    var entityType = _context.Model.FindEntityType(type);
                    var tableName = entityType?.GetTableName();
                    var schema = entityType?.GetSchema() ?? "dbo";

                    if (!string.IsNullOrEmpty(tableName))
                    {
                        await _context.Database.ExecuteSqlRawAsync($"DELETE FROM [{schema}].[{tableName}]");
                    }
                }

                _logger.LogInformation("ProductionDatabasePreparer: Reseeding identity counters...");
                foreach (var type in transactionalTypes)
                {
                    var entityType = _context.Model.FindEntityType(type);
                    var tableName = entityType?.GetTableName();
                    var schema = entityType?.GetSchema() ?? "dbo";

                    if (!string.IsNullOrEmpty(tableName))
                    {
                        var hasIdentity = entityType.GetProperties().Any(p => p.ValueGenerated == Microsoft.EntityFrameworkCore.Metadata.ValueGenerated.OnAdd);
                        if (hasIdentity)
                        {
                            try
                            {
                                await _context.Database.ExecuteSqlRawAsync($"DBCC CHECKIDENT ('[{schema}].[{tableName}]', RESEED, 0)");
                            }
                            catch
                            {
                                // Fail-safe for keyless/composite identity tables without identity seeds in SQL Server
                            }
                        }
                    }
                }

                _logger.LogInformation("ProductionDatabasePreparer: Re-enabling foreign key constraints...");
                await _context.Database.ExecuteSqlRawAsync("EXEC sp_MSforeachtable 'ALTER TABLE ? CHECK CONSTRAINT ALL'");

                // 3. Verification Phase
                _logger.LogInformation("ProductionDatabasePreparer: Starting post-purge verification checks...");

                var patientsCount = await _context.Patients.CountAsync();
                var visitsCount = await _context.Visits.CountAsync();
                var reportsCount = await _context.Reports.CountAsync();
                var resultsCount = await _context.Results.CountAsync();
                var invoicesCount = await _context.Invoices.CountAsync();

                if (patientsCount > 0 || visitsCount > 0 || reportsCount > 0 || resultsCount > 0 || invoicesCount > 0)
                {
                    throw new InvalidOperationException($"Purged table verification failed. Records detected: Patients: {patientsCount}, Visits: {visitsCount}, Reports: {reportsCount}, Results: {resultsCount}, Invoices: {invoicesCount}");
                }

                var testsCount = await _context.Tests.CountAsync();
                var departmentsCount = await _context.DepartmentMasters.CountAsync();
                var rangesCount = await _context.ReferenceRanges.CountAsync();
                var templatesCount = await _context.ReportTemplates.CountAsync();
                var usersCount = await _context.Users.CountAsync();
                var rolesCount = await _context.Roles.CountAsync();

                if (testsCount == 0 || departmentsCount == 0 || rangesCount == 0 || templatesCount == 0 || usersCount == 0 || rolesCount == 0)
                {
                    throw new InvalidOperationException($"Master config verification failed. Empty master counts detected: Tests: {testsCount}, Departments: {departmentsCount}, Ranges: {rangesCount}, Templates: {templatesCount}, Users: {usersCount}, Roles: {rolesCount}");
                }

                // 4. Commit/Rollback Handover
                if (isDryRun)
                {
                    _logger.LogInformation("[DRY RUN] Verification successful. Rolling back all database mutations...");
                    await dbTransaction.RollbackAsync();
                    _logger.LogInformation("[DRY RUN] Database rollback complete. Production database preparation test passed successfully.");
                }
                else
                {
                    _logger.LogInformation("ProductionDatabasePreparer: Verification successful. Committing changes...");
                    await dbTransaction.CommitAsync();
                    _logger.LogInformation("\nProduction database verified.\nREADY FOR BACKUP\n");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ProductionDatabasePreparer ERROR: Database preparation failed. Rolling back transaction.");
                await dbTransaction.RollbackAsync();
                throw;
            }
        }

        public static EntityCategory? ClassifyEntity(Type type)
        {
            var name = type.Name;
            var ns = type.Namespace ?? "";

            // 1. System/Internal entities
            if (ns.Contains("Governance") ||
                name == "User" || name == "Role" || name == "UserRole" || name == "UserBranchRole" ||
                name == "Workspace" || name == "UserWorkspaceAccess" ||
                name == "Branch" || name == "Employee" || 
                name == "AccessionCounter" || name == "TokenCounter" ||
                name == "OperationalResource" || name == "DeltaCheckConfig" ||
                name == "OverheadExpense" ||
                name.StartsWith("CatalogProvisioning"))
            {
                return EntityCategory.SystemInternal;
            }

            // 2. Master Data / Configuration entities
            if (ns.Contains("Catalog") ||
                name.StartsWith("Catalog") ||
                (name.StartsWith("Ims") && (name.Contains("Master") || name.Contains("Supplier") || name.Contains("Map") || name.Contains("Profile") || name.Contains("Item") || name.Contains("Consumable") || name.Contains("Lot"))) ||
                name == "DepartmentMaster" || name == "ModalityMaster" || name == "TestPricing" || name == "ProfileMap" || name == "PriceConfig" ||
                name == "Test" || name == "Parameter" || name == "ReferenceRange" || name == "DeptScopePolicy" ||
                name == "TestDefinition" || name == "SpecimenType" || 
                name == "CriticalRule" || name == "CriticalAlert" || name == "CriticalContact" || name == "CriticalAudit" ||
                name == "Referrer" || name == "ReportTemplate" || name == "LabProfile" || name == "RoleDepartmentConfig" ||
                name == "LabAnalyzer" || name == "LabAnalyzerTestMapping" || name == "AnalyzerListener" ||
                name == "ReferralPartner" || name == "ReferralCommissionRule" ||
                name == "BranchPrinter" || name == "TerminalPrinterConfig" ||
                name.StartsWith("CostAttribution_UsagePolicy") ||
                name == "DiscountMaster" ||
                name.StartsWith("PayComponent") || name == "PayStructure" || name == "PayStructureAssignment" || name == "PayrollPeriod" || name == "PayStructureComponent" ||
                name == "StatutoryConfig" || name == "WorkforcePolicy" ||
                name == "ReferenceLab" || name == "ReferenceLabRateRule" ||
                name == "ParameterMaster" || name == "DerivedParameterRule" || name == "AnalyzerParameterMap" || name.StartsWith("Range") ||
                name == "MedicalMacro" || name == "TimePeriod")
            {
                return EntityCategory.MasterData;
            }

            // 3. Transactional entities
            if (ns.Contains("ReadModels") ||
                name.EndsWith("Payable") ||
                name == "LeaveRequest" ||
                name == "Patient" || name == "PatientPhoneHistory" || name == "PatientAlias" || name == "PatientReferrerLink" ||
                name == "Appointment" || name == "VisitDayGroup" || name == "Visit" || name == "VisitCancellation" ||
                name == "Order" || name == "Specimen" || name == "Invoice" || name == "Payment" || name == "PartialPayment" || name == "CreditNote" ||
                name == "Result" || name == "ResultFlag" || name == "ResultLink" || name == "ResultChangeAudit" || name == "DeltaCheckEvent" || name == "AutosaveBuffer" ||
                name.StartsWith("Radiology") || name == "PathologyReport" ||
                name == "Report" || name == "ReportVersion" || name == "ReportSnapshot" || name == "ReportSignature" || name == "ReportAttachment" || name == "ReportInterpretation" ||
                name == "DeliveryLog" || name == "DeliveryAttempt" || name == "NotificationQueue" || name == "DownloadLink" ||
                name == "WorkAssignment" || name == "WorkAssignmentAccession" || name == "ProcessingAssignment" ||
                name == "AuditLog" || name == "RefreshToken" || name == "EditLock" ||
                name.EndsWith("Fact") ||
                name == "SalaryAdvance" || name == "PayrollRun" || name == "PayrollAdjustment" ||
                name == "AttendanceLog" ||
                name == "SupportTicket" ||
                name == "ProcessedProjectionEvent" || name == "OutboxEvent" || name == "BranchOperationalEvent" ||
                name == "LabAnalyzerResultInbox" ||
                name == "ReferralApprovalLog" || name == "ReferralDraft" ||
                name.StartsWith("ImsStock") || name == "ImsPurchaseOrder" || name == "ImsPOItem" ||
                name == "PacsSeries" || name == "PacsInstance")
            {
                return EntityCategory.Transactional;
            }

            return null;
        }
    }
}
