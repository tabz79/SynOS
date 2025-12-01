// File: src/SynOS.Data/SynOSDbContext.cs
// Author: Gemini
// Date: 2025-11-13

using Microsoft.EntityFrameworkCore;
using SynOS.Models.Entities;

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
        public DbSet<TestDefinition> TestDefinitions { get; set; } = null!; // New
        public DbSet<Order> Orders { get; set; } = null!;
        public DbSet<Invoice> Invoices { get; set; } = null!;
        public DbSet<Payment> Payments { get; set; } = null!;
        public DbSet<PartialPayment> PartialPayments { get; set; } = null!;
        public DbSet<VisitCancellation> VisitCancellations { get; set; } = null!;
        public DbSet<CreditNote> CreditNotes { get; set; } = null!; // New
        public DbSet<EditLock> EditLocks { get; set; } = null!;
        public DbSet<Sample> Samples { get; set; } = null!;
        public DbSet<SampleRejection> SampleRejections { get; set; } = null!;

        // DbSets for Results module
        public DbSet<Result> Results { get; set; } = null!;
        public DbSet<ResultFlag> ResultFlags { get; set; } = null!;
        public DbSet<DeltaCheckConfig> DeltaCheckConfigs { get; set; } = null!;
        public DbSet<DeltaCheckEvent> DeltaCheckEvents { get; set; } = null!;
        public DbSet<AutosaveBuffer> AutosaveBuffers { get; set; } = null!;
        public DbSet<ResultLink> ResultLinks { get; set; } = null!;

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


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User entities
            modelBuilder.Entity<User>(entity => entity.HasIndex(e => e.Email).IsUnique());
            modelBuilder.Entity<UserRole>(entity => entity.HasKey(ur => new { ur.UserId, ur.RoleId }));

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

            // Critical Values Module
            modelBuilder.Entity<CriticalRule>(entity =>
            {
                entity.HasIndex(e => e.ParameterCode).IsUnique();
            });
            
            modelBuilder.Entity<CriticalAlert>(entity =>
            {
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => e.PatientId);
            });
            
            modelBuilder.Entity<CriticalAudit>(entity =>
            {
                entity.HasOne(e => e.Alert).WithMany().HasForeignKey(e => e.AlertId).OnDelete(DeleteBehavior.Cascade);
            });

            // Report Module
            modelBuilder.Entity<Report>(entity =>
            {
                entity.HasIndex(e => e.OrderId).IsUnique();
                entity.HasOne(e => e.SignedBy).WithMany().HasForeignKey(e => e.SignedByUserId).OnDelete(DeleteBehavior.Restrict);
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
        }
    }
}
