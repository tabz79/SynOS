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


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure User entity
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasIndex(e => e.Email).IsUnique();
            });

            // Configure UserRole entity as a many-to-many join table
            modelBuilder.Entity<UserRole>()
                .HasKey(ur => new { ur.UserId, ur.RoleId });

            modelBuilder.Entity<UserRole>()
                .HasOne(ur => ur.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(ur => ur.UserId);

            modelBuilder.Entity<UserRole>()
                .HasOne(ur => ur.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(ur => ur.RoleId);

            modelBuilder.Entity<RefreshToken>()
                .HasOne(rt => rt.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(rt => rt.UserId);

            modelBuilder.Entity<AuditLog>()
                .HasOne(al => al.User)
                .WithMany(u => u.AuditLogs)
                .HasForeignKey(al => al.UserId);

            // Configure Patient entity
            modelBuilder.Entity<Patient>(entity =>
            {
                entity.HasIndex(e => e.MRN).IsUnique();
                entity.HasIndex(e => e.CurrentPhoneNumber);
                entity.Property(e => e.PatientId).ValueGeneratedOnAdd();
            });

            modelBuilder.Entity<PatientPhoneHistory>(entity =>
            {
                entity.HasIndex(e => e.PhoneNumber);
                entity.HasOne(h => h.Patient)
                    .WithMany(p => p.PhoneHistory)
                    .HasForeignKey(h => h.PatientId);
            });

            modelBuilder.Entity<PatientAlias>(entity =>
            {
                entity.HasOne(a => a.Patient)
                    .WithMany(p => p.Aliases)
                    .HasForeignKey(a => a.PatientId);
            });

            modelBuilder.Entity<PatientReferrerLink>(entity =>
            {
                entity.HasIndex(e => new { e.ReferrerSystem, e.ReferrerPatientId }).IsUnique();
                entity.HasOne(r => r.Patient)
                    .WithMany(p => p.ReferrerLinks)
                    .HasForeignKey(r => r.PatientId);
            });
        }
    }
}
