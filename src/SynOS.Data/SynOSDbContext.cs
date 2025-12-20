// File: src/SynOS.Data/SynOSDbContext.cs
// Author: Gemini
// Date: 2025-11-13

using Microsoft.EntityFrameworkCore;
using SynOS.Models.Entities;
using SynOS.Models.Entities.IMS;
using SynOS.Models.Entities.CostAttribution;

namespace SynOS.Data
{
    public class SynOSDbContext : DbContext
    {
        public SynOSDbContext(DbContextOptions<SynOSDbContext> options) : base(options)
        {
        }

        // DbSet for User entity
        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Role> Roles { get; set; } = null!;
        public DbSet<UserRole> UserRoles { get; set; } = null!;
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
        public DbSet<TestDefinition> TestDefinitions { get; set; } = null!; // Obsolete, but kept for now
        public DbSet<Order> Orders { get; set; } = null!;
        public DbSet<Invoice> Invoices { get; set; } = null!;
        public DbSet<Payment> Payments { get; set; } = null!;
        public DbSet<PartialPayment> PartialPayments { get; set; } = null!;
        public DbSet<VisitCancellation> VisitCancellations { get; set; } = null!;
        public DbSet<CreditNote> CreditNotes { get; set; } = null!;
        public DbSet<EditLock> EditLocks { get; set; } = null!;
        public DbSet<Sample> Samples { get; set; } = null!;
        public DbSet<SampleRejection> SampleRejections { get; set; } = null!;
        public DbSet<AccessionCounter> AccessionCounters { get; set; } = null!;

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

        #region IMS DbSets
        public DbSet<ImsTubeMaster> ImsTubeMasters { get; set; } = null!;
        public DbSet<ImsTubeLot> ImsTubeLots { get; set; } = null!;
        public DbSet<ImsStockMovement> ImsStockMovements { get; set; } = null!;
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
        public DbSet<SynOS.Models.Entities.CostAttribution.CostAttribution_UsagePolicy> CostAttribution_UsagePolicies { get; set; } = null!;
        public DbSet<SynOS.Models.Entities.CostAttribution.CostAttribution_UsagePolicyVersion> CostAttribution_UsagePolicyVersions { get; set; } = null!;
        public DbSet<SynOS.Models.Entities.CostAttribution.CostAttribution_UsageFact> CostAttribution_UsageFacts { get; set; } = null!;

        #endregion

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User entities
            modelBuilder.Entity<User>(entity => entity.HasIndex(e => e.Email).IsUnique());
            modelBuilder.Entity<UserRole>(entity => entity.HasKey(ur => new { ur.UserId, ur.RoleId }));
            
            // AuditLog
            modelBuilder.Entity<AuditLog>(entity =>
            {
                entity.HasOne(e => e.ActorUser)
                    .WithMany()
                    .HasForeignKey(e => e.ActorUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Test Master
            modelBuilder.Entity<Test>(entity =>
            {
                entity.HasIndex(e => e.TestCode).IsUnique();
                entity.Property(e => e.BasePrice).HasColumnType("decimal(10, 2)");
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
            modelBuilder.Entity<Sample>(entity =>
            {
                entity.Property(e => e.TubeType).HasConversion<string>().HasMaxLength(20);
                entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
                entity.HasIndex(e => e.Barcode).IsUnique();
            });

            modelBuilder.Entity<SampleRejection>(entity =>
            {
                entity.HasOne(sr => sr.Sample)
                      .WithMany(s => s.Rejections)
                      .HasForeignKey(sr => sr.SampleId)
                      .OnDelete(DeleteBehavior.Restrict);
                
                entity.HasOne(sr => sr.NewSample)
                      .WithMany()
                      .HasForeignKey(sr => sr.NewSampleId)
                      .OnDelete(DeleteBehavior.NoAction); // Avoid multiple cascade paths

                entity.HasOne(sr => sr.RejectedBy)
                      .WithMany()
                      .HasForeignKey(sr => sr.RejectedByUserId)
                      .OnDelete(DeleteBehavior.Restrict);
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

            #region IMS Configuration
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
            modelBuilder.Entity<SynOS.Models.Entities.CostAttribution.CostAttribution_UsagePolicy>(entity =>
            {
                entity.ToTable("CostAttribution_UsagePolicies");
                entity.HasIndex(e => new { e.TestId, e.InventoryItemId }).IsUnique();
                entity.HasOne(e => e.Test).WithMany().HasForeignKey(e => e.TestId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.InventoryItem).WithMany().HasForeignKey(e => e.InventoryItemId).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<SynOS.Models.Entities.CostAttribution.CostAttribution_UsagePolicyVersion>(entity =>
            {
                entity.ToTable("CostAttribution_UsagePolicyVersions");
                entity.HasIndex(e => new { e.UsagePolicyId, e.BranchId, e.EffectiveFrom }).IsUnique();
                entity.Property(e => e.Quantity).HasColumnType("decimal(18, 4)");
                entity.Property(e => e.Unit).HasMaxLength(50);
                entity.HasOne(e => e.UsagePolicy).WithMany().HasForeignKey(e => e.UsagePolicyId).OnDelete(DeleteBehavior.Cascade); // Cascade delete versions if policy deleted
                entity.HasOne(e => e.Branch).WithMany().HasForeignKey(e => e.BranchId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.CreatedByUser).WithMany().HasForeignKey(e => e.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<SynOS.Models.Entities.CostAttribution.CostAttribution_UsageFact>(entity =>
            {
                entity.ToTable("CostAttribution_UsageFacts");
                entity.HasIndex(e => new { e.SourceEventId, e.SourceEventType, e.InventoryItemId }).IsUnique();
                entity.HasIndex(e => e.TestId);
                entity.HasIndex(e => e.InventoryItemId);
                entity.HasIndex(e => e.OccurredAt);
                entity.Property(e => e.SourceEventType).HasConversion<string>().HasMaxLength(50);
            });

            #endregion
        }
    }
}