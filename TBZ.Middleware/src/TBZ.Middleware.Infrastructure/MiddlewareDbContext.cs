using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Domain;

namespace TBZ.Middleware.Infrastructure
{
    public class MiddlewareDbContext : DbContext
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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

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
        }
    }
}
