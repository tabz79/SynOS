using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Application.Interfaces;

namespace TBZ.Middleware.Infrastructure
{
    public class MiddlewareDbContext : DbContext, INotificationDbContext
    {
        public MiddlewareDbContext(DbContextOptions<MiddlewareDbContext> options) : base(options)
        {
        }

        public DbSet<StoredEvent> StoredEvents => Set<StoredEvent>();
        public DbSet<Lab> Labs => Set<Lab>();
        public DbSet<DeliveryQueueItem> DeliveryQueueItems => Set<DeliveryQueueItem>();
        public DbSet<ProjectionCheckpoint> ProjectionCheckpoints => Set<ProjectionCheckpoint>();
        public DbSet<DailyOperationsFact> DailyOperationsFacts => Set<DailyOperationsFact>();
        public DbSet<TestVolumeFact> TestVolumeFacts => Set<TestVolumeFact>();
        public DbSet<WorkflowFact> WorkflowFacts => Set<WorkflowFact>();
        public DbSet<DeliveryFact> DeliveryFacts => Set<DeliveryFact>();
        public DbSet<PatientDemographicFact> PatientDemographicFacts => Set<PatientDemographicFact>();
        public DbSet<DoctorReferralFact> DoctorReferralFacts => Set<DoctorReferralFact>();
        public DbSet<ReferralPartnerFact> ReferralPartnerFacts => Set<ReferralPartnerFact>();
        public DbSet<TrendFact> TrendFacts => Set<TrendFact>();
        public DbSet<ReferralConversionFact> ReferralConversionFacts => Set<ReferralConversionFact>();
        public DbSet<BusinessSourceFact> BusinessSourceFacts => Set<BusinessSourceFact>();
        public DbSet<PatientIntelligenceFact> PatientIntelligenceFacts => Set<PatientIntelligenceFact>();
        public DbSet<PatientVisitFact> PatientVisitFacts => Set<PatientVisitFact>();
        public DbSet<NotificationMessage> NotificationMessages => Set<NotificationMessage>();
        public DbSet<NotificationOutbox> NotificationOutboxes => Set<NotificationOutbox>();
        public DbSet<NotificationTemplate> NotificationTemplates => Set<NotificationTemplate>();
        public DbSet<NotificationWebhookEvent> NotificationWebhookEvents => Set<NotificationWebhookEvent>();
        public DbSet<NotificationInbox> NotificationInboxes => Set<NotificationInbox>();
        public DbSet<SupportTicket> SupportTickets => Set<SupportTicket>();
        public DbSet<SupportCase> SupportCases => Set<SupportCase>();
        public DbSet<KnownIssue> KnownIssues => Set<KnownIssue>();
        public DbSet<HealthSnapshot> HealthSnapshots => Set<HealthSnapshot>();
        public DbSet<CommandDirective> CommandDirectives => Set<CommandDirective>();
        public DbSet<DiagnosticsBundle> DiagnosticsBundles => Set<DiagnosticsBundle>();
        public DbSet<Release> Releases => Set<Release>();
        public DbSet<ReleasePackage> ReleasePackages => Set<ReleasePackage>();
        public DbSet<Deployment> Deployments => Set<Deployment>();
        public DbSet<DeploymentEvent> DeploymentEvents => Set<DeploymentEvent>();
        public DbSet<DeploymentPolicy> DeploymentPolicies => Set<DeploymentPolicy>();
        public DbSet<MiddlewareSetting> MiddlewareSettings => Set<MiddlewareSetting>();


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure all Guid properties to be stored as lowercase strings in SQLite to avoid casing mismatch errors
            if (Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite")
            {
                foreach (var entityType in modelBuilder.Model.GetEntityTypes())
                {
                    foreach (var property in entityType.GetProperties())
                    {
                        if (property.ClrType == typeof(Guid))
                        {
                            property.SetValueConverter(new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<Guid, string>(
                                v => v.ToString().ToLowerInvariant(),
                                v => Guid.Parse(v)));
                        }
                        else if (property.ClrType == typeof(Guid?))
                        {
                            property.SetValueConverter(new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<Guid?, string>(
                                v => v.HasValue ? v.Value.ToString().ToLowerInvariant() : string.Empty,
                                v => string.IsNullOrEmpty(v) ? (Guid?)null : Guid.Parse(v)));
                        }
                    }
                }
            }

            modelBuilder.Entity<StoredEvent>(entity =>
            {
                entity.ToTable("StoredEvents");
                entity.HasKey(e => e.Sequence); // Key is Sequence

                // Enforce UNIQUE constraints
                entity.HasIndex(e => e.Id).IsUnique();
                entity.HasIndex(e => e.EventId).IsUnique();

                // SQLite auto-increment for Sequence
                entity.Property(e => e.Sequence).ValueGeneratedOnAdd();

                entity.Property(e => e.LabId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.BranchId).HasMaxLength(50);
                entity.Property(e => e.EventType).IsRequired().HasMaxLength(100);
                entity.Property(e => e.AggregateType).IsRequired().HasMaxLength(100).HasDefaultValue("");
                entity.Property(e => e.AggregateId).IsRequired().HasMaxLength(100).HasDefaultValue("");
                entity.Property(e => e.PayloadJson).IsRequired();
            });

            modelBuilder.Entity<Lab>(entity =>
            {
                entity.ToTable("Labs");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.LabCode).IsRequired().HasMaxLength(50);
                entity.Property(e => e.LabName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.ApiKeyHash).IsRequired().HasMaxLength(256);
                entity.Property(e => e.Status).IsRequired().HasMaxLength(20);
                entity.Property(e => e.LicenseType).IsRequired().HasMaxLength(50).HasDefaultValue("Professional");
                entity.Property(e => e.MaximumBranches).HasDefaultValue(1);
                entity.Property(e => e.BranchCount).HasDefaultValue(0);
                entity.Property(e => e.ContactPerson).HasMaxLength(100);
                entity.Property(e => e.Email).HasMaxLength(100);
                entity.Property(e => e.Phone).HasMaxLength(50);
                entity.Property(e => e.EnabledFeatures)
                    .HasConversion(
                        v => System.Text.Json.JsonSerializer.Serialize(v ?? new System.Collections.Generic.List<string>(), (System.Text.Json.JsonSerializerOptions)null!),
                        v => ParseEnabledFeatures(v),
                        new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<System.Collections.Generic.List<string>>(
                            (c1, c2) => c1 != null && c2 != null ? c1.SequenceEqual(c2) : c1 == c2,
                            c => c.Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode())),
                            c => c.ToList()
                        )
                    );
            });

            modelBuilder.Entity<DeliveryQueueItem>(entity =>
            {
                entity.ToTable("DeliveryQueueItems");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.LabId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Phone).IsRequired().HasMaxLength(30);
                entity.Property(e => e.MessageType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.PayloadJson).IsRequired();
                entity.Property(e => e.Status).IsRequired().HasMaxLength(20);
            });

            modelBuilder.Entity<ProjectionCheckpoint>(entity =>
            {
                entity.ToTable("ProjectionCheckpoints");
                entity.HasKey(e => e.ProjectionName);
                entity.Property(e => e.ProjectionName).HasMaxLength(100);
            });

            modelBuilder.Entity<DailyOperationsFact>(entity =>
            {
                entity.ToTable("DailyOperationsFacts");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.LabId).IsRequired().HasMaxLength(50);
                entity.HasIndex(e => new { e.LabId, e.Date }).IsUnique();
            });

            modelBuilder.Entity<TestVolumeFact>(entity =>
            {
                entity.ToTable("TestVolumeFacts");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.LabId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.TestCode).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Department).IsRequired().HasMaxLength(100);
                entity.HasIndex(e => new { e.LabId, e.Date, e.TestCode }).IsUnique();
            });

            modelBuilder.Entity<WorkflowFact>(entity =>
            {
                entity.ToTable("WorkflowFacts");
                entity.HasKey(e => e.VisitId);
                entity.Property(e => e.LabId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.BranchId).HasMaxLength(50);
            });

            modelBuilder.Entity<DeliveryFact>(entity =>
            {
                entity.ToTable("DeliveryFacts");
                entity.HasKey(e => e.ReportId);
                entity.Property(e => e.DeliveryMethod).HasMaxLength(50);
                entity.Property(e => e.Status).IsRequired().HasMaxLength(20);
            });

            modelBuilder.Entity<PatientDemographicFact>(entity =>
            {
                entity.ToTable("PatientDemographicFacts");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.LabId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.AgeGroup).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Gender).IsRequired().HasMaxLength(20);
                entity.Property(e => e.PatientLocation).IsRequired().HasMaxLength(100);
                entity.Property(e => e.PatientPincode).IsRequired().HasMaxLength(20);
                entity.HasIndex(e => new { e.LabId, e.Date, e.AgeGroup, e.Gender, e.PatientLocation, e.PatientPincode }).IsUnique();
            });

            modelBuilder.Entity<DoctorReferralFact>(entity =>
            {
                entity.ToTable("DoctorReferralFacts");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.LabId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.DoctorId).IsRequired().HasMaxLength(100);
                entity.Property(e => e.DoctorName).IsRequired().HasMaxLength(200);
                entity.HasIndex(e => new { e.LabId, e.Date, e.DoctorId }).IsUnique();
            });

            modelBuilder.Entity<ReferralPartnerFact>(entity =>
            {
                entity.ToTable("ReferralPartnerFacts");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.LabId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.ReferralPartnerId).IsRequired().HasMaxLength(100);
                entity.Property(e => e.ReferralPartnerName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.ReferralPartnerLocation).IsRequired().HasMaxLength(200);
                entity.HasIndex(e => new { e.LabId, e.Date, e.ReferralPartnerId }).IsUnique();
            });

            modelBuilder.Entity<TrendFact>(entity =>
            {
                entity.ToTable("TrendFacts");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.LabId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.EntityType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.EntityKey).IsRequired().HasMaxLength(200);
                entity.HasIndex(e => new { e.LabId, e.Date, e.EntityType, e.EntityKey }).IsUnique();
            });

            modelBuilder.Entity<ReferralConversionFact>(entity =>
            {
                entity.ToTable("ReferralConversionFacts");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.LabId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.ReferralPartnerId).IsRequired().HasMaxLength(100);
                entity.HasIndex(e => new { e.LabId, e.Date, e.ReferralPartnerId }).IsUnique();
            });

            modelBuilder.Entity<BusinessSourceFact>(entity =>
            {
                entity.ToTable("BusinessSourceFacts");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.LabId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.SourceType).HasConversion<string>().IsRequired().HasMaxLength(50);
                entity.Property(e => e.SourceId).IsRequired().HasMaxLength(100);
                entity.Property(e => e.SourceName).IsRequired().HasMaxLength(200);
                entity.HasIndex(e => new { e.LabId, e.Date, e.SourceType, e.SourceId, e.IsFirstVisit }).IsUnique();
            });

            modelBuilder.Entity<PatientIntelligenceFact>(entity =>
            {
                entity.ToTable("PatientIntelligenceFacts");
                entity.HasKey(e => e.PatientId);
                entity.Property(e => e.LabId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.MRN).IsRequired().HasMaxLength(100);
                entity.Property(e => e.PatientName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Gender).IsRequired().HasMaxLength(50);
                entity.Property(e => e.MobileNumber).IsRequired().HasMaxLength(50);
                entity.Property(e => e.ReferringDoctorOrPartner).IsRequired().HasMaxLength(200);
                entity.Property(e => e.LastVisitedBranchId).IsRequired().HasMaxLength(50);
            });

            modelBuilder.Entity<PatientVisitFact>(entity =>
            {
                entity.ToTable("PatientVisitFacts");
                entity.HasKey(e => e.VisitId);
                entity.Property(e => e.LabId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Token).IsRequired().HasMaxLength(100);
                entity.Property(e => e.ReferringDoctorOrPartner).IsRequired().HasMaxLength(200);
                entity.Property(e => e.TestsJson).IsRequired();
            });

             modelBuilder.Entity<NotificationMessage>(entity =>
            {
                entity.ToTable("NotificationMessages");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.LabId).IsRequired().HasMaxLength(50).HasDefaultValue("LAB001");
                entity.Property(e => e.Channel).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Recipient).IsRequired().HasMaxLength(100);
                entity.Property(e => e.TemplateName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.MessageId).HasMaxLength(150);
                entity.HasIndex(e => e.MessageId);
            });

            modelBuilder.Entity<NotificationOutbox>(entity =>
            {
                entity.ToTable("NotificationOutboxes");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.LabId).IsRequired().HasMaxLength(50).HasDefaultValue("LAB001");
                entity.Property(e => e.Status)
                      .HasConversion<string>()
                      .IsRequired()
                      .HasMaxLength(20);
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => new { e.Status, e.NextRetry, e.LockedUntil });
                entity.HasOne(e => e.NotificationMessage)
                      .WithMany()
                      .HasForeignKey(e => e.NotificationMessageId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<NotificationTemplate>(entity =>
            {
                entity.ToTable("NotificationTemplates");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.TemplateName).IsRequired().HasMaxLength(100);
                entity.HasIndex(e => new { e.TemplateName, e.Version, e.Language }).IsUnique();
            });

            modelBuilder.Entity<NotificationWebhookEvent>(entity =>
            {
                entity.ToTable("NotificationWebhookEvents");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.MessageId).HasMaxLength(150);
                entity.HasIndex(e => e.MessageId);
            });

            modelBuilder.Entity<NotificationInbox>(entity =>
            {
                entity.ToTable("NotificationInboxes");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Sender).IsRequired().HasMaxLength(100);
                entity.Property(e => e.MessageId).HasMaxLength(150);
                entity.Property(e => e.Channel).IsRequired().HasMaxLength(50);
                entity.HasIndex(e => e.MessageId);
            });

            modelBuilder.Entity<SupportTicket>(entity =>
            {
                entity.ToTable("SupportTickets");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.LabId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
                entity.Property(e => e.StatusMessage).HasMaxLength(500);
            });

            modelBuilder.Entity<SupportCase>(entity =>
            {
                entity.ToTable("SupportCases");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.CaseNumber).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
            });

            modelBuilder.Entity<KnownIssue>(entity =>
            {
                entity.ToTable("KnownIssues");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            });

            modelBuilder.Entity<HealthSnapshot>(entity =>
            {
                entity.ToTable("HealthSnapshots");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.LabId).IsRequired().HasMaxLength(50);
            });

            modelBuilder.Entity<CommandDirective>(entity =>
            {
                entity.ToTable("CommandDirectives");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.LabId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.CommandType).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
            });

            modelBuilder.Entity<DiagnosticsBundle>(entity =>
            {
                entity.ToTable("DiagnosticsBundles");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.LabId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
            });

            modelBuilder.Entity<Release>(entity =>
            {
                entity.ToTable("Releases");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Version).IsUnique();
                entity.Property(e => e.Version).IsRequired().HasMaxLength(50);
                entity.Property(e => e.RolloutRing).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
            });

            modelBuilder.Entity<ReleasePackage>(entity =>
            {
                entity.ToTable("ReleasePackages");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.TargetArchitecture).IsRequired().HasMaxLength(50);
                entity.Property(e => e.PackageFileName).IsRequired().HasMaxLength(250);
                entity.Property(e => e.ChecksumSha256).IsRequired().HasMaxLength(100);
            });

            modelBuilder.Entity<Deployment>(entity =>
            {
                entity.ToTable("Deployments");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.LabId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
            });

            modelBuilder.Entity<DeploymentEvent>(entity =>
            {
                entity.ToTable("DeploymentEvents");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.EventType).IsRequired().HasMaxLength(100);
            });

            modelBuilder.Entity<DeploymentPolicy>(entity =>
            {
                entity.ToTable("DeploymentPolicies");
                entity.HasKey(e => e.Id);
            });
        }

        private static System.Collections.Generic.List<string> ParseEnabledFeatures(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return new System.Collections.Generic.List<string>();
            }

            value = value.Trim();
            if (value.StartsWith("[") && value.EndsWith("]"))
            {
                try
                {
                    return System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.List<string>>(value, (System.Text.Json.JsonSerializerOptions)null!) ?? new System.Collections.Generic.List<string>();
                }
                catch
                {
                    // Fall through to parse as comma-separated if JSON deserialization fails
                }
            }

            return value.Split(new[] { ',' }, System.StringSplitOptions.RemoveEmptyEntries)
                        .Select(s => s.Trim())
                        .ToList();
        }
    }
}
