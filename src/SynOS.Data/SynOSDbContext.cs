using SynOS.Models.Entities.AR;
using SynOS.Models.Entities.Payments;
using Microsoft.EntityFrameworkCore;
using SynOS.Models.Entities;
using SynOS.Models.Entities.IMS;
using SynOS.Models.Entities.CostAttribution;
using SynOS.Models.Entities.SpendEngine;
using SynOS.Models.Entities.Revenue;
using SynOS.Models.Entities.Referral;
using SynOS.Models.Entities.Payables;
using SynOS.Models.Entities.Discounts;
using SynOS.Models.Entities.HR;
using SynOS.Models.Entities.Payroll;
using SynOS.Models.Entities.Time;
using SynOS.Models.Entities.Leave;
using SynOS.Models.Entities.Compliance;
using SynOS.Models.Entities.Governance;
using SynOS.Models.Entities.Operations;
using SynOS.Models.ReadModels; // ADDED

namespace SynOS.Data
{
    public class SynOSDbContext : DbContext
    {
        public SynOSDbContext(DbContextOptions<SynOSDbContext> options) : base(options)
        {
        }

        // Registry Stabilization (Phase 8)
        public DbSet<DepartmentMaster> DepartmentMasters { get; set; } = null!;
        public DbSet<TestPricing> TestPricings { get; set; } = null!;
        public DbSet<ProfileMap> ProfileMaps { get; set; } = null!;

        public DbSet<BranchOperationalEvent> BranchOperationalEvents { get; set; } = null!; // ADDED
        public DbSet<UserOperationalStats> UserOperationalStats { get; set; } = null!; // ADDED: Projections
        public DbSet<BranchOperationalStats> BranchOperationalStats { get; set; } = null!; // ADDED: Projections
        public DbSet<ProcessedProjectionEvent> ProcessedProjectionEvents { get; set; } = null!; // ADDED: Idempotency

        public DbSet<ReceivableFact> ReceivableFacts { get; set; } = null!;
        public DbSet<PaymentConfirmedFact> PaymentConfirmedFacts { get; set; } = null!; // ADDED: Stage 1 Financials
        // DbSet for User entity
        public DbSet<User> Users { get; set; } = null!;
        public DbSet<SynOS.Models.Entities.Role> Roles { get; set; } = null!;
        public DbSet<UserRole> UserRoles { get; set; } = null!;
        public DbSet<UserBranchRole> UserBranchRoles { get; set; } = null!; // ADDED: Multi-branch Auth
        public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;
        public DbSet<AuditLog> AuditLogs { get; set; } = null!;
        public DbSet<Branch> Branches { get; set; } = null!; // New Branch entity

        // DbSets for Patient entities
        public DbSet<Patient> Patients { get; set; } = null!;
        public DbSet<PatientPhoneHistory> PatientPhoneHistories { get; set; } = null!;
        public DbSet<PatientAlias> PatientAliases { get; set; } = null!;
        public DbSet<PatientReferrerLink> PatientReferrerLinks { get; set; } = null!;

        // DbSets for Appointment entities
        public DbSet<Appointment> Appointments { get; set; } = null!;
        public DbSet<VisitDayGroup> VisitDayGroups { get; set; } = null!;

        // DbSets for Visit and Payment entities
        public DbSet<Visit> Visits { get; set; } = null!;
        public DbSet<TokenCounter> TokenCounters { get; set; } = null!;
        public DbSet<TestDefinition> TestDefinitions { get; set; } = null!; // Config
        public DbSet<SpecimenType> SpecimenTypes { get; set; } = null!; // Master Data

        // Core Transactional DbSets
        public DbSet<Order> Orders { get; set; } = null!;
        public DbSet<Specimen> Specimens { get; set; } = null!; // Replaces Samples
        public DbSet<AccessionSequence> AccessionSequences { get; set; } = null!; // Concurrency Control
        public DbSet<Invoice> Invoices { get; set; } = null!;
        public DbSet<Payment> Payments { get; set; } = null!;
        public DbSet<PartialPayment> PartialPayments { get; set; } = null!;
        public DbSet<VisitCancellation> VisitCancellations { get; set; } = null!;
        public DbSet<CreditNote> CreditNotes { get; set; } = null!;
        public DbSet<EditLock> EditLocks { get; set; } = null!;

        public DbSet<AccessionCounter> AccessionCounters { get; set; } = null!;

        // DbSets for Operational Assignments
        public DbSet<OperationalResource> OperationalResources { get; set; } = null!;
        public DbSet<WorkAssignment> WorkAssignments { get; set; } = null!;

        // DbSets for Results module
        public DbSet<Result> Results { get; set; } = null!;
        public DbSet<ResultFlag> ResultFlags { get; set; } = null!;
        public DbSet<DeltaCheckConfig> DeltaCheckConfigs { get; set; } = null!;
        public DbSet<DeltaCheckEvent> DeltaCheckEvents { get; set; } = null!;
        public DbSet<AutosaveBuffer> AutosaveBuffers { get; set; } = null!;
        public DbSet<ResultLink> ResultLinks { get; set; } = null!;
        public DbSet<ResultChangeAudit> ResultChangeAudits { get; set; } = null!;

        // DbSets for Test Master
        public DbSet<Test> Tests { get; set; } = null!;
        public DbSet<Parameter> Parameters { get; set; } = null!;
        public DbSet<ReferenceRange> ReferenceRanges { get; set; } = null!;
        public DbSet<PriceConfig> PriceConfigs { get; set; } = null!;
        public DbSet<DeptScopePolicy> DeptScopePolicies { get; set; } = null!;
        
        // DbSets for Radiology module
        public DbSet<RadiologyStudy> RadiologyStudies { get; set; } = null!;
        public DbSet<RadiologyImage> RadiologyImages { get; set; } = null!;
        public DbSet<RadiologyReport> RadiologyReports { get; set; } = null!;
        public DbSet<PathologyReport> PathologyReports { get; set; } = null!;
        public DbSet<ReportAttachment> ReportAttachments { get; set; } = null!;

        // DbSets for PACS module
        public DbSet<Models.Entities.PACS.PacsSeries> PacsSeries { get; set; } = null!;
        public DbSet<Models.Entities.PACS.PacsInstance> PacsInstances { get; set; } = null!;

        // DbSets for Critical Values module
        public DbSet<CriticalRule> CriticalRules { get; set; } = null!;
        public DbSet<CriticalAlert> CriticalAlerts { get; set; } = null!;
        public DbSet<CriticalContact> CriticalContacts { get; set; } = null!;
        public DbSet<CriticalAudit> CriticalAudits { get; set; } = null!;
        public DbSet<Referrer> Referrers { get; set; } = null!;
        public DbSet<Report> Reports { get; set; } = null!;
        public DbSet<ReportVersion> ReportVersions { get; set; } = null!;
        public DbSet<ReportTemplate> ReportTemplates { get; set; } = null!;
        public DbSet<ReportSignature> ReportSignatures { get; set; } = null!;

        // DbSets for Delivery Module
        public DbSet<DeliveryLog> DeliveryLogs { get; set; } = null!;
        public DbSet<DeliveryAttempt> DeliveryAttempts { get; set; } = null!;
        public DbSet<DownloadLink> DownloadLinks { get; set; } = null!;
        public DbSet<NotificationQueue> NotificationQueues { get; set; } = null!;

        // DbSets for Lab Analyzer Integration
        public DbSet<LabAnalyzer> LabAnalyzers { get; set; } = null!;
        public DbSet<LabAnalyzerResultInbox> LabAnalyzerResultInbox { get; set; } = null!;
        public DbSet<LabAnalyzerTestMapping> LabAnalyzerTestMappings { get; set; } = null!;

        // DbSets for Referral System
        public DbSet<ReferralPartner> ReferralPartners { get; set; } = null!;
        public DbSet<ReferralCommissionRule> ReferralCommissionRules { get; set; } = null!;
        public DbSet<ReferralPayableFact> ReferralPayableFacts { get; set; } = null!;
        public DbSet<ReferralDraft> ReferralDrafts { get; set; } = null!; // ADDED: Provisional Referral

        public DbSet<ImsTubeMaster> ImsTubeMasters { get; set; } = null!;
        public DbSet<ImsTubeLot> ImsTubeLots { get; set; } = null!;
        public DbSet<ImsStockMovement> ImsStockMovements { get; set; } = null!;

        // DbSets for Terminal Printing
        public DbSet<BranchPrinter> BranchPrinters { get; set; } = null!;
        public DbSet<TerminalPrinterConfig> TerminalPrinterConfigs { get; set; } = null!;
        public DbSet<ImsTestTubeMap> ImsTestTubeMaps { get; set; } = null!;
        public DbSet<ImsSupplier> ImsSuppliers { get; set; } = null!;
        public DbSet<ImsPurchaseOrder> ImsPurchaseOrders { get; set; } = null!;
        public DbSet<ImsPOItem> ImsPOItems { get; set; } = null!;
        public DbSet<ImsConsumable> ImsConsumables { get; set; } = null!;
        public DbSet<ImsConsumableLot> ImsConsumableLots { get; set; } = null!;
        public DbSet<ImsTestConsumableMap> ImsTestConsumableMaps { get; set; } = null!;
        public DbSet<ImsInventoryUsageProfile> ImsInventoryUsageProfiles { get; set; } = null!;
        public DbSet<ImsInventoryLot> ImsInventoryLots { get; set; } = null!;
        public DbSet<ImsInventoryItem> ImsInventoryItems { get; set; } = null!;

        // Cost Attribution DbSets
        public DbSet<CostAttribution_UsagePolicy> CostAttribution_UsagePolicies { get; set; } = null!;
        public DbSet<CostAttribution_UsagePolicyVersion> CostAttribution_UsagePolicyVersions { get; set; } = null!;
        public DbSet<CostAttribution_UsageFact> CostAttribution_UsageFacts { get; set; } = null!;

        // Spend Engine DbSets
        public DbSet<SpendFact> SpendFacts { get; set; }
        
        // Discount DbSets
        public DbSet<DiscountMaster> DiscountMasters { get; set; } = null!;
        public DbSet<DiscountFact> DiscountFacts { get; set; } = null!;

        // HR DbSets
        public DbSet<Employee> Employees { get; set; } = null!;

        // Payroll Engine DbSets
        public DbSet<PayComponent> PayComponents { get; set; }
        public DbSet<PayStructure> PayStructures { get; set; }
        public DbSet<PayStructureAssignment> PayStructureAssignments { get; set; }
        public DbSet<PayrollPeriod> PayrollPeriods { get; set; }
        public DbSet<PayrollRun> PayrollRuns { get; set; }
        public DbSet<PayrollAdjustment> PayrollAdjustments { get; set; }
        public DbSet<PayrollFact> PayrollFacts { get; set; }
        public DbSet<PayStructureComponent> PayStructureComponents { get; set; }

        // Time Engine DbSets
        public DbSet<TimePeriod> TimePeriods { get; set; }
        public DbSet<ClockEventFact> ClockEventFacts { get; set; }
        public DbSet<WorkSessionBoundaryFact> WorkSessionBoundaryFacts { get; set; }
        public DbSet<ManualWorkSessionAssertionFact> ManualWorkSessionAssertionFacts { get; set; }
        public DbSet<ShiftAttributionFact> ShiftAttributionFacts { get; set; }
        public DbSet<OvertimeMarkerFact> OvertimeMarkerFacts { get; set; }

        // Leave Engine DbSets
        public DbSet<LeaveFact> LeaveFacts { get; set; }
        public DbSet<LeaveCancellationFact> LeaveCancellationFacts { get; set; }

        // Revenue Engine DbSets
        public DbSet<RevenueFact> RevenueFacts { get; set; } = null!;
        public DbSet<CorrectionFact> CorrectionFacts { get; set; } = null!; // ADDED: Correction System
        public DbSet<PriceAdjustmentFact> PriceAdjustmentFacts { get; set; } = null!; // ADDED: Financial Separation
        
        // Payables DbSets
        public DbSet<PayableFact> PayableFacts { get; set; } = null!;

        // Compliance Engine DbSets
        public DbSet<StatutoryObligationFact> StatutoryObligationFacts { get; set; }

        // Governance Engine DbSets // ADDED
        public DbSet<SynOS.Models.Entities.Governance.Role> GovernanceRoles { get; set; }
        public DbSet<SynOS.Models.Entities.Governance.RoleCapability> RoleCapabilities { get; set; }
        public DbSet<SynOS.Models.Entities.Governance.Capability> Capabilities { get; set; }
        public DbSet<SynOS.Models.Entities.Governance.Assignment> Assignments { get; set; }
        public DbSet<SynOS.Models.Entities.Governance.ApprovalRule> ApprovalRules { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User entities
            modelBuilder.Entity<User>(entity => entity.HasIndex(e => e.Email).IsUnique());
            modelBuilder.Entity<UserRole>(entity => entity.HasKey(ur => new { ur.UserId, ur.RoleId }));

            // Multi-branch Auth
            modelBuilder.Entity<UserBranchRole>(entity =>
            {
                entity.HasIndex(e => new { e.UserId, e.BranchId, e.RoleId }).IsUnique();
                entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Branch).WithMany().HasForeignKey(e => e.BranchId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Role).WithMany().HasForeignKey(e => e.RoleId).OnDelete(DeleteBehavior.Restrict);
            });
            
            // Financial Facts (Precision Fixes)
            modelBuilder.Entity<PaymentConfirmedFact>(entity =>
            {
                entity.Property(e => e.Amount).HasColumnType("decimal(18, 4)");
            });

            // AuditLog
            modelBuilder.Entity<AuditLog>(entity =>
            {
                entity.HasOne(e => e.ActorUser)
                    .WithMany()
                    .HasForeignKey(e => e.ActorUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Referral System
            modelBuilder.Entity<ReferralPartner>(entity =>
            {
                entity.ToTable("ReferralPartners");
                entity.HasIndex(e => e.Name).IsUnique();
                entity.Property(e => e.PartnerType).HasConversion<string>().HasMaxLength(50);
            });

            modelBuilder.Entity<ReferralCommissionRule>(entity =>
            {
                entity.ToTable("ReferralCommissionRules");
                entity.HasIndex(e => new { e.ReferralPartnerId, e.TestId, e.EffectiveFrom }).IsUnique();
                entity.Property(e => e.CommissionType).HasConversion<string>().HasMaxLength(50);
                entity.Property(e => e.CommissionValue).HasColumnType("decimal(18, 4)");
                entity.HasOne(e => e.ReferralPartner).WithMany().HasForeignKey(e => e.ReferralPartnerId).OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Test).WithMany().HasForeignKey(e => e.TestId).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ReferralPayableFact>(entity =>
            {
                entity.ToTable("ReferralPayableFacts");
                entity.HasKey(e => e.ReferralPayableFactId);
                entity.HasIndex(e => e.SourceVisitId).IsUnique(); // ADDED: Idempotency enforcement
                entity.Property(e => e.Amount).HasColumnType("decimal(18, 4)");
            });

            modelBuilder.Entity<ReferralDraft>(entity =>
            {
                entity.ToTable("ReferralDrafts");
                entity.HasKey(e => e.ReferralDraftId);
                entity.Property(e => e.ProviderName).HasMaxLength(200).IsRequired();
                
                // One-to-One (0..1)
                entity.HasOne(e => e.Visit)
                      .WithOne(v => v.ReferralDraft)
                      .HasForeignKey<ReferralDraft>(e => e.VisitId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // Test Master
            modelBuilder.Entity<Test>(entity =>
            {
                entity.HasIndex(e => e.TestCode).IsUnique();
            });

            modelBuilder.Entity<Parameter>(entity =>
            {
                entity.HasIndex(e => new { e.TestId, e.ParameterCode }).IsUnique();
            });

            modelBuilder.Entity<ReferenceRange>(entity =>
            {
                entity.HasIndex(e => new { e.ParameterId, e.AgeGroup, e.Sex });
                entity.Property(e => e.RefLow).HasColumnType("decimal(18, 4)");
                entity.Property(e => e.RefHigh).HasColumnType("decimal(18, 4)");
                entity.Property(e => e.CriticalLow).HasColumnType("decimal(18, 4)");
                entity.Property(e => e.CriticalHigh).HasColumnType("decimal(18, 4)");
            });

            modelBuilder.Entity<PriceConfig>(entity =>
            {
                entity.HasIndex(e => e.TestId);
                entity.Property(e => e.DiscountPercent).HasColumnType("decimal(5, 2)");
                entity.Property(e => e.ReferrerRatePercent).HasColumnType("decimal(5, 2)");
            });

            modelBuilder.Entity<DeptScopePolicy>(entity =>
            {
                entity.HasIndex(e => new { e.RoleId, e.Dept }).IsUnique();
            });

            // Registry Stabilization (Phase 8)
            modelBuilder.Entity<DepartmentMaster>(entity =>
            {
                entity.HasIndex(e => e.Code).IsUnique();
            });

            modelBuilder.Entity<TestPricing>(entity =>
            {
                entity.HasIndex(e => new { e.TestId, e.EffectiveFrom }).IsUnique();
                entity.HasOne(e => e.Test)
                      .WithMany(t => t.TestPricings)
                      .HasForeignKey(e => e.TestId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<ProfileMap>(entity =>
            {
                entity.HasIndex(e => new { e.ParentTestId, e.ChildTestId }).IsUnique();

                entity.HasOne(e => e.ParentTest)
                      .WithMany(t => t.ProfileChildren)
                      .HasForeignKey(e => e.ParentTestId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.ChildTest)
                      .WithMany(t => t.ProfileParents)
                      .HasForeignKey(e => e.ChildTestId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // Patient entities
            modelBuilder.Entity<Patient>(entity => {
                entity.HasIndex(e => e.MRN).IsUnique();
                entity.HasIndex(e => e.CurrentPhoneNumber);
                entity.Property(e => e.RowVersion).IsRowVersion();
            });
            modelBuilder.Entity<PatientPhoneHistory>(entity => entity.HasIndex(e => e.PhoneNumber));
            modelBuilder.Entity<PatientReferrerLink>(entity => entity.HasIndex(e => new { e.ExternalLabCode, e.ExternalPatientId }).IsUnique());

            // Appointment entities
            modelBuilder.Entity<Appointment>(entity => {
                entity.HasIndex(e => new { e.ScheduledFor, e.Department });
                entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
                entity.Property(e => e.RowVersion).IsRowVersion();
            });
            modelBuilder.Entity<VisitDayGroup>(entity => entity.HasIndex(e => new { e.PatientId, e.Day }).IsUnique());

            // Visit and Payment entities
            modelBuilder.Entity<Visit>(entity => {
                entity.HasIndex(e => new { e.TokenDate, e.Department });
                entity.Property(e => e.RowVersion).IsRowVersion();
                entity.HasOne(v => v.Branch).WithMany().HasForeignKey(v => v.BranchId).OnDelete(DeleteBehavior.Restrict).IsRequired(false);
            });

            modelBuilder.Entity<Branch>(entity =>
            {
                entity.ToTable("Branches");
                entity.HasIndex(e => e.Name).IsUnique();
            });

            modelBuilder.Entity<TokenCounter>(entity => entity.HasIndex(e => new { e.Day, e.Department }).IsUnique());

            modelBuilder.Entity<Order>(entity => entity.HasIndex(e => e.TestCode));

            modelBuilder.Entity<Invoice>(entity => entity.HasIndex(e => e.Status));

            modelBuilder.Entity<Payment>(entity => {
                entity.HasIndex(e => e.ReceiptNo).IsUnique();
                entity.HasOne(p => p.ReceivedBy).WithMany(u => u.Payments).HasForeignKey(p => p.ReceivedByUserId).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<VisitCancellation>(entity => {
                entity.HasOne(vc => vc.CancelledBy).WithMany(u => u.VisitCancellations).HasForeignKey(vc => vc.CancelledByUserId).OnDelete(DeleteBehavior.Restrict);
            });

            // TestDefinition
            modelBuilder.Entity<TestDefinition>(entity => {
                entity.HasIndex(e => e.TestCode).IsUnique();
            });

            // EditLock
            modelBuilder.Entity<EditLock>(entity =>
            {
                entity.HasIndex(e => e.ExpiresAt);
                entity.HasIndex(e => new { e.EntityType, e.EntityId }) // Index on the two columns
                    .IsUnique() // Make it unique
                    .HasFilter("[Status] = 'Active'"); // Apply filter for only active locks
                entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            });

            // Sample and SampleRejection
            // Specimen Configuration
            modelBuilder.Entity<Specimen>(entity =>
            {
                entity.HasIndex(e => e.AccessionNumber).IsUnique(); // Enforce Uniqueness
                entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
                
                entity.HasOne(e => e.Visit)
                      .WithMany() // Visit can have many Specimens, but we don't need a navigation property on Visit yet
                      .HasForeignKey(e => e.VisitId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.SpecimenType)
                      .WithMany()
                      .HasForeignKey(e => e.SpecimenTypeCode)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // SpecimenType Configuration
            modelBuilder.Entity<SpecimenType>(entity =>
            {
                entity.HasKey(e => e.Code);
            });

            // AccessionSequence Configuration
            modelBuilder.Entity<AccessionSequence>(entity =>
            {
                entity.HasKey(e => new { e.BranchId, e.Date }); // Composite Key
                entity.Property(e => e.RowVersion).IsRowVersion();
            });



            // Operational Assignments
            modelBuilder.Entity<OperationalResource>(entity =>
            {
                entity.HasIndex(e => e.UserId).IsUnique();
                entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<WorkAssignment>(entity =>
            {
                entity.HasIndex(e => e.SourceReferenceId);
                entity.Property(e => e.WorkType).HasConversion<string>().HasMaxLength(50);
                entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);
                entity.HasOne(e => e.AssignedResource)
                      .WithMany()
                      .HasForeignKey(e => e.AssignedResourceId)
                      .OnDelete(DeleteBehavior.SetNull);
            });

            // Results Module
            modelBuilder.Entity<Result>(entity =>
            {
                entity.HasIndex(e => new { e.OrderId, e.ParameterCode }).IsUnique();
                entity.HasOne(e => e.EnteredBy).WithMany().HasForeignKey(e => e.EnteredByUserId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.VerifiedBy).WithMany().HasForeignKey(e => e.VerifiedByUserId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.SignedBy).WithMany().HasForeignKey(e => e.SignedByUserId).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<DeltaCheckConfig>(entity =>
            {
                entity.HasIndex(e => e.ParameterCode).IsUnique();
            });

            modelBuilder.Entity<DeltaCheckEvent>(entity =>
            {
                entity.Property(e => e.DeltaPercentage).HasPrecision(18, 2);
                entity.HasOne(e => e.CurrentResult).WithMany().HasForeignKey(e => e.ResultId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.PreviousResult).WithMany().HasForeignKey(e => e.PreviousResultId).OnDelete(DeleteBehavior.NoAction);
            });

            modelBuilder.Entity<AutosaveBuffer>(entity =>
            {
                entity.HasIndex(e => new { e.UserId, e.EntityType, e.EntityId }).IsUnique();
            });

            modelBuilder.Entity<ResultLink>(entity =>
            {
                entity.HasOne(e => e.FromResult).WithMany().HasForeignKey(e => e.FromResultId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ToResult).WithMany().HasForeignKey(e => e.ToResultId).OnDelete(DeleteBehavior.NoAction);
            });

            // ResultChangeAudit
            modelBuilder.Entity<ResultChangeAudit>(entity =>
            {
                entity.HasOne(e => e.Result)
                      .WithMany()
                      .HasForeignKey(e => e.ResultId)
                      .OnDelete(DeleteBehavior.Restrict); // No cascade delete

                entity.HasOne(e => e.ChangedByUser)
                      .WithMany()
                      .HasForeignKey(e => e.ChangedByUserId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.ResultId);
                entity.HasIndex(e => new { e.ResultId, e.ChangedAt }).IsDescending();
            });

            // Critical Values Module
            modelBuilder.Entity<CriticalRule>(entity =>
            {
                entity.HasIndex(e => e.ParameterCode).IsUnique();
            });
            
            modelBuilder.Entity<CriticalAlert>(entity =>
            {
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => e.PatientId);

                entity.HasOne(e => e.Patient)
                    .WithMany()
                    .HasForeignKey(e => e.PatientId)
                    .OnDelete(DeleteBehavior.NoAction);

                entity.HasOne(e => e.Visit)
                    .WithMany()
                    .HasForeignKey(e => e.VisitId)
                    .OnDelete(DeleteBehavior.NoAction);
                
                entity.HasOne(e => e.Result)
                    .WithMany()
                    .HasForeignKey(e => e.ResultId)
                    .OnDelete(DeleteBehavior.NoAction);
            });
            
            modelBuilder.Entity<CriticalAudit>(entity =>
            {
                entity.HasOne(e => e.Alert).WithMany().HasForeignKey(e => e.AlertId).OnDelete(DeleteBehavior.Cascade);
            });

            // Radiology Module
            modelBuilder.Entity<RadiologyStudy>(entity =>
            {
                entity.HasOne(e => e.Visit)
                      .WithMany()
                      .HasForeignKey(e => e.VisitId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Patient)
                      .WithMany()
                      .HasForeignKey(e => e.PatientId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Technician)
                      .WithMany()
                      .HasForeignKey(e => e.AssignedTo)
                      .OnDelete(DeleteBehavior.SetNull); // Technician can be null, or unassigned

                entity.HasOne(e => e.Creator)
                      .WithMany()
                      .HasForeignKey(e => e.CreatedBy)
                      .OnDelete(DeleteBehavior.Restrict);

                // Link RadiologyStudy.VisitTestId to Order.OrderId
                entity.HasOne(e => e.Order)
                      .WithOne()
                      .HasForeignKey<RadiologyStudy>(e => e.VisitTestId)
                      .OnDelete(DeleteBehavior.Restrict); // If order is deleted, radiology study is also deleted
            });

            modelBuilder.Entity<RadiologyImage>(entity =>
            {
                entity.HasOne(e => e.RadiologyStudy)
                      .WithMany(rs => rs.RadiologyImages)
                      // Removed .HasForeignKey(e => e.RadiologyStudyId) - EF Core infers by convention
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Uploader)
                      .WithMany()
                      .HasForeignKey(e => e.UploadedBy)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // PACS Module
            modelBuilder.Entity<Models.Entities.PACS.PacsSeries>(entity =>
            {
                entity.HasIndex(e => new { e.RadiologyStudyId, e.StudyInstanceUid, e.SeriesInstanceUid });

                entity.HasOne(e => e.RadiologyStudy)
                    .WithMany()
                    .HasForeignKey(e => e.RadiologyStudyId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasOne(e => e.Creator)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Models.Entities.PACS.PacsInstance>(entity =>
            {
                entity.HasIndex(e => new { e.SeriesId, e.SopInstanceUid });
                entity.HasIndex(e => e.RadiologyStudyId);

                entity.HasOne(e => e.PacsSeries)
                    .WithMany(s => s.PacsInstances)
                    .HasForeignKey(e => e.SeriesId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasOne(e => e.RadiologyStudy)
                    .WithMany()
                    .HasForeignKey(e => e.RadiologyStudyId)
                    .OnDelete(DeleteBehavior.NoAction);
                
                entity.HasOne(e => e.Creator)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<RadiologyReport>(entity =>
            {
                entity.HasKey(e => e.ReportId); // ReportId is PK

                entity.HasOne(e => e.Report)
                      .WithOne(r => r.RadiologyReport)
                      .HasForeignKey<RadiologyReport>(e => e.ReportId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.RadiologyStudy)
                      .WithMany()
                      // Removed .HasForeignKey(e => e.RadiologyStudyId) - EF Core infers by convention
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<PathologyReport>(entity =>
            {
                entity.HasKey(e => e.ReportId); // ReportId is PK

                entity.HasOne(e => e.Report)
                      .WithOne(r => r.PathologyReport)
                      .HasForeignKey<PathologyReport>(e => e.ReportId)
                      .OnDelete(DeleteBehavior.Cascade);
                      
                entity.HasOne(e => e.Order)
                      .WithMany()
                      .HasForeignKey(e => e.OrderId)
                      .OnDelete(DeleteBehavior.Restrict); // Keep order if pathology report deleted
            });

            modelBuilder.Entity<ReportAttachment>(entity =>
            {
                entity.HasOne(e => e.Report)
                      .WithMany(r => r.Attachments)
                      // Removed .HasForeignKey(e => e.ReportId) - EF Core infers by convention
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Report Module
            modelBuilder.Entity<Report>(entity =>
            {
                entity.HasIndex(e => new { e.SourceType, e.SourceId }).IsUnique(); // New unique index
                entity.HasOne(e => e.SignedBy).WithMany().HasForeignKey(e => e.SignedByUserId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne<Visit>().WithMany().HasForeignKey(e => e.VisitId).OnDelete(DeleteBehavior.Restrict); // FK for VisitId
                entity.HasOne<Patient>().WithMany().HasForeignKey(e => e.PatientId).OnDelete(DeleteBehavior.Restrict); // FK for PatientId
            });

            modelBuilder.Entity<ReportVersion>(entity =>
            {
                entity.HasOne(e => e.Report).WithMany(r => r.ReportVersions).HasForeignKey(e => e.ReportId).OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.SignedBy).WithMany().HasForeignKey(e => e.SignedByUserId).OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(e => new { e.ReportId, e.VersionNumber }).IsUnique();
            });

            // ReportTemplate Module
            modelBuilder.Entity<ReportTemplate>(entity =>
            {
                entity.HasIndex(e => e.Name).IsUnique();
                entity.HasIndex(e => e.Modality);
                entity.HasIndex(e => e.IsPublished);
                entity.HasIndex(e => e.IsDefault).HasFilter("[IsDefault] = 1");
                entity.HasIndex(e => e.IsDeleted).HasFilter("[IsDeleted] = 0");

                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.CreatedBy)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // ReportSignature Module
            modelBuilder.Entity<ReportSignature>(entity =>
            {
                entity.HasIndex(e => e.ReportId);
                entity.HasIndex(e => e.SignedByUserId);

                entity.HasOne(e => e.Report)
                    .WithMany() // A report can have multiple signatures over time
                    .HasForeignKey(e => e.ReportId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.SignedByUser)
                    .WithMany() // A user can sign multiple reports
                    .HasForeignKey(e => e.SignedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Delivery Module
            modelBuilder.Entity<DeliveryLog>(entity =>
            {
                entity.Property(e => e.DeliveryMethod).HasConversion<string>();
                entity.Property(e => e.Status).HasConversion<string>();
                entity.HasIndex(e => e.ReportId);
                entity.HasIndex(e => e.DeliveredAt);
                entity.HasOne(e => e.Report)
                    .WithMany()
                    .HasForeignKey(e => e.ReportId)
                    .OnDelete(DeleteBehavior.Cascade); // Adjust to Restrict if Report should not be deleted if DeliveryLogs exist
                entity.HasOne(e => e.DeliveredByUser)
                    .WithMany()
                    .HasForeignKey(e => e.DeliveredBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<DeliveryAttempt>(entity =>
            {
                entity.Property(e => e.Status).HasConversion<string>();
                entity.HasOne(e => e.DeliveryLog)
                    .WithMany(dl => dl.DeliveryAttempts)
                    .HasForeignKey(e => e.LogId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<DownloadLink>(entity =>
            {
                entity.HasIndex(e => e.Token).IsUnique();
                entity.HasIndex(e => e.ReportId);
                entity.HasOne(e => e.Report)
                    .WithMany()
                    .HasForeignKey(e => e.ReportId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<NotificationQueue>(entity =>
            {
                entity.Property(e => e.Type).HasConversion<string>();
                entity.Property(e => e.Status).HasConversion<string>();
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => e.NextRetryAt);
            });

            // Lab Analyzer Integration
            modelBuilder.Entity<LabAnalyzer>(entity =>
            {
                entity.HasIndex(e => e.OrgId);
                entity.HasIndex(e => e.BranchId);
                entity.Property(e => e.ConnectionType).HasConversion<string>().HasMaxLength(20);
            });

            modelBuilder.Entity<LabAnalyzerResultInbox>(entity =>
            {
                entity.HasOne(e => e.Analyzer)
                      .WithMany()
                      .HasForeignKey(e => e.AnalyzerId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.AnalyzerId);
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => e.PatientIdentifier);
                entity.HasIndex(e => e.VisitId);
                entity.HasIndex(e => e.OrderId);
                entity.HasIndex(e => e.ReceivedAt); // Useful for querying the inbox
                entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            });
            
            modelBuilder.Entity<LabAnalyzerTestMapping>(entity =>
            {
                entity.HasOne(e => e.Analyzer)
                      .WithMany()
                      .HasForeignKey(e => e.AnalyzerId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.AnalyzerId);
                entity.HasIndex(e => e.AnalyzerTestCode);
                entity.HasIndex(e => e.SynosTestCode);
                entity.HasIndex(e => e.IsEnabled);
                entity.HasIndex(e => new { e.AnalyzerId, e.AnalyzerTestCode }).IsUnique(); // Ensure unique mapping per analyzer
                
                // Configure precision for decimal properties
                entity.Property(e => e.RefLowOverride).HasPrecision(18, 4);
                entity.Property(e => e.RefHighOverride).HasPrecision(18, 4);
            });

            modelBuilder.Entity<ImsTubeMaster>(entity =>
            {
                entity.ToTable("IMS_TubeMasters");
                entity.HasIndex(e => e.Code).IsUnique();
            });

            modelBuilder.Entity<ImsTubeLot>(entity =>
            {
                entity.ToTable("IMS_TubeLots");
                entity.HasIndex(e => new { e.TubeId, e.BranchId, e.LotNumber }).IsUnique();
                entity.HasOne(e => e.Tube).WithMany().HasForeignKey(e => e.TubeId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Branch).WithMany().HasForeignKey(e => e.BranchId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.POItem).WithMany().HasForeignKey(e => e.POItemId).OnDelete(DeleteBehavior.Restrict).IsRequired(false);
            });

            modelBuilder.Entity<ImsSupplier>(entity =>
            {
                entity.ToTable("IMS_Suppliers");
                entity.HasIndex(e => e.Name).IsUnique();
            });

            modelBuilder.Entity<ImsPurchaseOrder>(entity =>
            {
                entity.ToTable("IMS_PurchaseOrders");
                entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
                entity.HasOne(e => e.Supplier).WithMany().HasForeignKey(e => e.SupplierId).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ImsPOItem>(entity =>
            {
                entity.ToTable("IMS_POItems");
                entity.HasOne(e => e.PurchaseOrder).WithMany(po => po.POItems).HasForeignKey(e => e.POId).OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Tube).WithMany().HasForeignKey(e => e.TubeId).OnDelete(DeleteBehavior.Restrict);
            });
            
            modelBuilder.Entity<ImsStockMovement>(entity =>
            {
                entity.ToTable("IMS_StockMovements");
                entity.Property(e => e.MovementType).HasConversion<string>().HasMaxLength(20);
                entity.Property(e => e.ReferenceType).HasConversion<string>().HasMaxLength(50);
                entity.Property(e => e.ReasonCode).HasConversion<string>().HasMaxLength(50);
                entity.HasIndex(e => e.ReferenceId);
                
                // Additive relationships for the dual-support model
                entity.HasOne(e => e.Tube).WithMany().HasForeignKey(e => e.TubeId).OnDelete(DeleteBehavior.Restrict).IsRequired(false);
                entity.HasOne(e => e.TubeLot).WithMany().HasForeignKey(e => e.TubeLotId).OnDelete(DeleteBehavior.Restrict).IsRequired(false);
                entity.HasOne(e => e.Consumable).WithMany().HasForeignKey(e => e.ConsumableId).OnDelete(DeleteBehavior.Restrict).IsRequired(false);
                entity.HasOne(e => e.ConsumableLot).WithMany().HasForeignKey(e => e.ConsumableLotId).OnDelete(DeleteBehavior.Restrict).IsRequired(false);
                entity.HasOne(e => e.RecordedByUser).WithMany().HasForeignKey(e => e.RecordedByUserId).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ImsTestTubeMap>(entity =>
            {
                entity.ToTable("IMS_TestTubeMaps");
                entity.HasIndex(e => new { e.TestId, e.TubeId }).IsUnique();
                entity.HasOne(e => e.Test).WithMany().HasForeignKey(e => e.TestId).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ImsConsumable>(entity =>
            {
                entity.ToTable("IMS_Consumables");
                entity.HasIndex(e => e.Code).IsUnique();
                entity.HasIndex(e => e.LegacyTubeId);
                entity.Property(e => e.Category).HasConversion<string>().HasMaxLength(50);
            });

            modelBuilder.Entity<ImsConsumableLot>(entity =>
            {
                entity.ToTable("IMS_ConsumableLots");
                entity.HasIndex(e => e.LegacyTubeLotId);
                entity.HasOne(e => e.Consumable).WithMany().HasForeignKey(e => e.ConsumableId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Branch).WithMany().HasForeignKey(e => e.BranchId).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ImsTestConsumableMap>(entity =>
            {
                entity.ToTable("IMS_TestConsumableMaps");
                entity.HasIndex(e => new { e.TestId, e.ConsumableId, e.UsageType }).IsUnique();
                entity.Property(e => e.UsageType).HasConversion<string>().HasMaxLength(50);
                entity.HasOne(e => e.Test).WithMany().HasForeignKey(e => e.TestId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Consumable).WithMany().HasForeignKey(e => e.ConsumableId).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ImsConsumable>()
                .HasOne(c => c.UsageProfile)
                .WithOne(p => p.Consumable)
                .HasForeignKey<ImsInventoryUsageProfile>(p => p.ConsumableId);

            modelBuilder.Entity<ImsInventoryLot>(entity =>
            {
                entity.HasIndex(e => new { e.ItemId, e.BranchId, e.BatchNumber }).IsUnique();
                entity.HasOne(e => e.Item).WithMany().HasForeignKey(e => e.ItemId).OnDelete(DeleteBehavior.Restrict).IsRequired(false);
                entity.HasOne(e => e.Branch).WithMany().HasForeignKey(e => e.BranchId).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ImsInventoryItem>(entity =>
            {
                entity.ToTable("IMS_InventoryItems");
                entity.HasIndex(e => e.ItemCode).IsUnique();
            });

            // Cost Attribution Configuration
            modelBuilder.Entity<CostAttribution_UsagePolicy>(entity =>
            {
                entity.ToTable("CostAttribution_UsagePolicies");
                entity.HasIndex(e => new { e.TestId, e.InventoryItemId }).IsUnique();
                entity.HasOne(e => e.Test).WithMany().HasForeignKey(e => e.TestId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.InventoryItem).WithMany().HasForeignKey(e => e.InventoryItemId).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<CostAttribution_UsagePolicyVersion>(entity =>
            {
                entity.ToTable("CostAttribution_UsagePolicyVersions");
                entity.HasIndex(e => new { e.UsagePolicyId, e.BranchId, e.EffectiveFrom }).IsUnique();
                entity.Property(e => e.Quantity).HasColumnType("decimal(18, 4)");
                entity.Property(e => e.Unit).HasMaxLength(50);
                entity.HasOne(e => e.UsagePolicy).WithMany().HasForeignKey(e => e.UsagePolicyId).OnDelete(DeleteBehavior.Cascade); // Cascade delete versions if policy deleted
                entity.HasOne(e => e.Branch).WithMany().HasForeignKey(e => e.BranchId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.CreatedByUser).WithMany().HasForeignKey(e => e.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<CostAttribution_UsageFact>(entity =>
            {
                entity.ToTable("CostAttribution_UsageFacts");
                entity.HasIndex(e => new { e.SourceEventId, e.SourceEventType, e.InventoryItemId }).IsUnique();
                entity.HasIndex(e => e.TestId);
                entity.HasIndex(e => e.InventoryItemId);
                entity.HasIndex(e => e.OccurredAt);
                entity.Property(e => e.SourceEventType).HasConversion<string>().HasMaxLength(50);
            });

            // Discount Configuration
            modelBuilder.Entity<DiscountMaster>(entity =>
            {
                entity.ToTable("DiscountMasters");
                entity.Property(e => e.MaxLimit).HasColumnType("decimal(18, 4)");
            });

            // Payroll Engine Configuration
            modelBuilder.Entity<PayrollAdjustment>(entity =>
            {
                entity.ToTable("PayrollAdjustments");
                entity.Property(e => e.Amount).HasColumnType("decimal(18, 4)");
            });

            modelBuilder.Entity<PayrollFact>(entity =>
            {
                entity.ToTable("PayrollFacts");
                entity.Property(e => e.Amount).HasColumnType("decimal(18, 4)");
            });

            // Spend Engine Configuration
            modelBuilder.Entity<SpendFact>(entity =>
            {
                entity.ToTable("SpendFacts");
                entity.HasKey(e => e.SpendFactId);
                entity.HasIndex(e => e.TransactionReference).IsUnique();

                entity.Property(e => e.Amount).HasColumnType("decimal(18, 4)").IsRequired();
                entity.Property(e => e.Currency).HasMaxLength(10).IsRequired();
                entity.Property(e => e.OccurredAt).IsRequired();
                entity.Property(e => e.RecordedAt).IsRequired();
                entity.Property(e => e.Account).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Channel).HasMaxLength(100).IsRequired();
            });

            // Revenue Engine Configuration
            modelBuilder.Entity<RevenueFact>(entity =>
            {
                entity.ToTable("RevenueFacts");
                entity.HasKey(e => e.RevenueFactId);

                // Optional unique index for idempotency on external transaction IDs
                entity.HasIndex(e => e.ExternalTransactionId).IsUnique().HasFilter("[ExternalTransactionId] IS NOT NULL");

                // INVARIANT: SourceReferenceId (PaymentId) must be unique per type.
                entity.HasIndex(e => new { e.SourceType, e.SourceReferenceId }).IsUnique();

                entity.Property(e => e.Amount).HasColumnType("decimal(18, 4)").IsRequired();
                entity.Property(e => e.Currency).HasMaxLength(10).IsRequired();
                entity.Property(e => e.Direction).HasConversion<string>().HasMaxLength(20).IsRequired();
                entity.Property(e => e.SourceType).HasConversion<string>().HasMaxLength(50).IsRequired();
                entity.Property(e => e.PaymentMode).HasConversion<string>().HasMaxLength(50).IsRequired();
                entity.Property(e => e.SourceReferenceId).HasMaxLength(200).IsRequired();

                // No navigation properties or foreign keys are defined, keeping this a pure fact table.
            });

            // Payables Configuration
            modelBuilder.Entity<PayableFact>(entity =>
            {
                entity.ToTable("PayableFacts", "Payables");

                entity.HasKey(e => e.PayableFactId);

                entity.Property(e => e.AmountOwed)
                      .HasColumnType("decimal(18,4)")
                      .IsRequired();

                entity.Property(e => e.Currency)
                      .HasMaxLength(3)
                      .IsRequired();

                entity.Property(e => e.Status)
                      .HasMaxLength(20)
                      .IsRequired();

                entity.Property(e => e.OccurredAt).IsRequired();
                entity.Property(e => e.RecordedAt).IsRequired();

                entity.Property(e => e.SourcePaymentId).IsRequired();
                entity.HasIndex(e => e.SourcePaymentId);

                // Intentionally no foreign keys (append-only ledger)
            });
			
			// Accounts Receivable (Flow B)
modelBuilder.Entity<ReceivableFact>(entity =>
{
    entity.ToTable("ReceivableFacts", "AR");

    entity.HasKey(e => e.ReceivableFactId);

    entity.HasIndex(e => e.SourceVisitId)
          .IsUnique();

    entity.HasIndex(e => e.ReferralPartnerId);

    entity.Property(e => e.Amount)
          .HasColumnType("decimal(18,4)")
          .IsRequired();

    entity.Property(e => e.Currency)
          .HasMaxLength(3)
          .IsRequired();

    entity.Property(e => e.OccurredAt)
          .IsRequired();

    entity.Property(e => e.RecordedAt)
          .IsRequired();
});

            // Payment Confirmed Fact (Stage 1 Financials) // ADDED PHASE 5
            modelBuilder.Entity<PaymentConfirmedFact>(entity =>
            {
                entity.ToTable("PaymentConfirmedFacts");
                entity.HasKey(e => e.PaymentId);
                
                entity.Property(e => e.Amount).HasColumnType("decimal(18, 4)").IsRequired();
                entity.Property(e => e.Direction).HasConversion<string>().HasMaxLength(20).IsRequired(); // FIX: Enum to String
                entity.Property(e => e.Channel).HasMaxLength(50);
                
                entity.HasIndex(e => e.ReferenceId); // Lookup by Visit/Invoice
                entity.HasIndex(e => e.OccurredAt);
            });

            // Compliance Engine Configuration // ADDED
            modelBuilder.Entity<StatutoryObligationFact>(entity =>
            {
                entity.ToTable("StatutoryObligationFacts");
                entity.HasKey(e => e.StatutoryObligationFactId);
                entity.Property(e => e.Amount).HasColumnType("decimal(18, 4)").IsRequired();
                entity.Property(e => e.Currency).HasMaxLength(10).IsRequired();
                entity.Property(e => e.AuthorityType).HasConversion<string>().HasMaxLength(50);
                entity.Property(e => e.ObligationType).HasConversion<string>().HasMaxLength(50);
                entity.Property(e => e.SourceType).HasConversion<string>().HasMaxLength(50);
                entity.HasIndex(e => e.SourceFactId); // Index for lookup
            });

            // Operational Read Model Configuration // ADDED
            modelBuilder.Entity<BranchOperationalEvent>(entity =>
            {
                entity.ToTable("BranchOperationalEvents");
                entity.HasKey(e => e.EventId);
                entity.Property(e => e.EventType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.BranchId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.OccurredAt).IsRequired();
                entity.HasIndex(e => e.BranchId); // Filter by Branch
                entity.HasIndex(e => e.OccurredAt); // Sort/Filter by Time
            });

            // Governance Engine Configuration // ADDED
            modelBuilder.Entity<SynOS.Models.Entities.Governance.RoleCapability>(entity =>
            {
                entity.ToTable("Governance_RoleCapabilities");
                entity.HasKey(e => e.RoleCapabilityId);
                entity.HasIndex(e => new { e.RoleId, e.CapabilityId }).IsUnique();
            });

            modelBuilder.Entity<SynOS.Models.Entities.Governance.Role>(entity =>
            {
                entity.ToTable("Governance_Roles");
                entity.HasKey(e => e.RoleId);
            });

            modelBuilder.Entity<SynOS.Models.Entities.Governance.Capability>(entity =>
            {
                entity.ToTable("Governance_Capabilities");
                entity.HasKey(e => e.CapabilityId);
            });

            modelBuilder.Entity<SynOS.Models.Entities.Governance.Assignment>(entity =>
            {
                entity.ToTable("Governance_Assignments");
                entity.HasKey(e => e.AssignmentId);
                entity.HasIndex(e => new { e.UserId, e.RoleId });
            });

            modelBuilder.Entity<SynOS.Models.Entities.Governance.ApprovalRule>(entity =>
            {
                entity.ToTable("Governance_ApprovalRules");
                entity.HasKey(e => e.ApprovalRuleId);
                entity.Property(e => e.ThresholdAmount).HasColumnType("decimal(18, 4)");
            });

            // Operational Counters Projection (Read Models)
            modelBuilder.Entity<UserOperationalStats>(entity =>
            {
                entity.ToTable("UserOperationalStats");
                // Composite Key: User + Branch + Date
                entity.HasKey(x => new { x.UserId, x.BranchId, x.Date });
                
                // Index for performant querying
                entity.HasIndex(x => new { x.UserId, x.BranchId, x.Date });
                
                entity.Property(e => e.PaymentsTotal).HasColumnType("decimal(18, 2)");
            });

            modelBuilder.Entity<BranchOperationalStats>(entity =>
            {
                entity.ToTable("BranchOperationalStats");
                // Composite Key: Branch + Date
                entity.HasKey(x => new { x.BranchId, x.Date });
                
                entity.HasIndex(x => new { x.BranchId, x.Date });
            });

            modelBuilder.Entity<ProcessedProjectionEvent>(entity =>
            {
                entity.ToTable("ProcessedProjectionEvents");
                // Composite Key: Event + Projection Name
                entity.HasKey(x => new { x.EventId, x.ProjectionName });
                
                entity.HasIndex(x => x.EventId);
            });
        }
    }
}