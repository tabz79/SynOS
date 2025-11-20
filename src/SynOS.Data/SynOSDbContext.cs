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
        }
    }
}
