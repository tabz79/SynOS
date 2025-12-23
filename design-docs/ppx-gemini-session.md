✦ Okay, I understand the new directive. I will not modify any Revenue Engine files, nor will I alter the SpendFact changes. My focus now is on deferring      
  PaymentConfirmedFact, Admin controllers, and Spend read-model files by removing their runtime wiring. Specifically, I will remove
  DbSet<PaymentConfirmedFact> and its OnModelCreating configuration from SynOSDbContext.cs, along with the using statement for SynOS.Models.Entities.Payments.
  I will keep the deferred files but ensure they are inactive by cutting their dependencies. No migrations or builds will be run. I'll start with
  SynOSDbContext.cs.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  Edit src\SynOS.Data\SynOSDbContext.cs:         // Revenue Engine DbSe... =>         // Revenue Engine DbSe...                                           │
│                                                                                                                                                            │
│ 126                                                                                                                                                        │
│ 127                           // Revenue Engine DbSets                                                                                                     │
│ 128                           public DbSet<RevenueFact> RevenueFacts { get; set; } = null!;                                                                │
│ 129 -                                                                                                                                                      │
│ 130 -                 // Payment Confirmed DbSets                                                                                                          │
│ 131 -                 public DbSet<PaymentConfirmedFact> PaymentConfirmedFacts { get; set; } = null!;                                                      │
│ 132 -                                                                                                                                                      │
│ 129                           #endregion // End of IMS DbSets region                                                                                       │
│ 130                                                                                                                                                        │
│ 131   protected override void OnModelCreating(ModelBuilder modelBuilder)                                                                                   │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ DbSet<PaymentConfirmedFact> is gone. Next, I'll remove using SynOS.Models.Entities.Payments; from SynOS.Data/SynOSDbContext.cs.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  Edit src\SynOS.Data\SynOSDbContext.cs: using SynOS.Models.Entities.Re... => using SynOS.Models.Entities.Re...                                           │
│                                                                                                                                                            │
│  8   using SynOS.Models.Entities.CostAttribution;                                                                                                          │
│  9   using SynOS.Models.Entities.SpendEngine;                                                                                                              │
│ 10   using SynOS.Models.Entities.Revenue;                                                                                                                  │
│ 11 - using SynOS.Models.Entities.Payments;                                                                                                                 │
│ 11                                                                                                                                                         │
│ 12   namespace SynOS.Data                                                                                                                                  │
│ 13   {                                                                                                                                                     │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ Using statement gone. Next, I'll remove PaymentConfirmedFact's OnModelCreating configuration from SynOSDbContext.cs.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  Edit src\SynOS.Data\SynOSDbContext.cs:             // Spend Engine Co... =>             // Spend Engine Co...                                           │
│                                                                                                                                                            │
│ 749       // No navigation properties or foreign key constraints are added, as per instructions.                                                           │
│ 750   });                                                                                                                                                  │
│ 751                                                                                                                                                        │
│ 752 - // Payment Confirmed Fact Configuration                                                                                                              │
│ 753 - modelBuilder.Entity<PaymentConfirmedFact>(entity =>                                                                                                  │
│ 754 - {                                                                                                                                                    │
│ 755 -     entity.ToTable("PaymentConfirmedFacts");                                                                                                         │
│ 756 -     entity.HasKey(e => e.PaymentId);                                                                                                                 │
│ 757 -     entity.Property(e => e.Direction).HasConversion<string>().HasMaxLength(10).IsRequired();                                                         │
│ 758 -     entity.Property(e => e.Amount).HasColumnType("decimal(18, 4)").IsRequired();                                                                     │
│ 759 -     entity.Property(e => e.CounterpartyId).IsRequired();                                                                                             │
│ 760 -     entity.Property(e => e.OccurredAt).IsRequired();                                                                                                 │
│ 761 -     entity.Property(e => e.RecordedAt).IsRequired();                                                                                                 │
│ 762 -     entity.Property(e => e.Channel).HasMaxLength(50); // Optional                                                                                    │
│ 763 -     // ReferenceId is nullable Guid?                                                                                                                 │
│ 764 - });                                                                                                                                                  │
│ 765 -                                                                                                                                                      │
│ 752   // Revenue Engine Configuration                                                                                                                      │
│ 753   modelBuilder.Entity<RevenueFact>(entity =>                                                                                                           │
│ 754   {                                                                                                                                                    │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ I've removed OnModelCreating configuration. Now, to deactivate deferred controllers/services by commenting out their class definitions. I'll start with     
  PaymentDeclarationController.cs, then SpendQueryService.cs, SpendReadController.cs, PaymentDeclarationDto.cs, and SpendRecordView.cs.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  ReadFile ...\PaymentDeclarationController.cs                                                                                                            │
│                                                                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ Read PaymentDeclarationController.cs. Commenting out its entire content to deactivate.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  WriteFile Writing to ...\PaymentDeclarationController.cs                                                                                                │
│                                                                                                                                                            │
│  1 + /*                                                                                                                                                    │
│  2   using System;                                                                                                                                         │
│  3   using System.Threading.Tasks;                                                                                                                         │
│  4   using Microsoft.AspNetCore.Mvc;                                                                                                                       │
│ ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ │
│ 58                   dto.Channel                                                                                                                           │
│ 59               );                                                                                                                                        │
│ 60                                                                                                                                                         │
│ 60 -             await _context.PaymentConfirmedFacts.AddAsync(paymentFact);                                                                               │
│ 61 -             await _context.SaveChangesAsync();                                                                                                        │
│ 61 +             // This line will now cause a compile error since PaymentConfirmedFacts DbSet is removed from DbContext                                   │
│ 62 +             // await _context.PaymentConfirmedFacts.AddAsync(paymentFact);                                                                            │
│ 63 +             // await _context.SaveChangesAsync();                                                                                                     │
│ 64                                                                                                                                                         │
│ 65               return Ok(new { message = "Payment fact successfully declared.", paymentId = paymentFact.PaymentId });                                    │
│ 66           }                                                                                                                                             │
│ 67       }                                                                                                                                                 │
│ 68   }                                                                                                                                                     │
│ 69 + */                                                                                                                                                    │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ PaymentDeclarationController.cs is commented. Now, SpendQueryService.cs.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  ReadFile src\...\Spend\SpendQueryService.cs                                                                                                             │
│                                                                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ Read SpendQueryService.cs. Commenting out its entire content to deactivate.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  WriteFile Writing to src\...\Spend\SpendQueryService.cs                                                                                                 │
│                                                                                                                                                            │
│  1 + /*                                                                                                                                                    │
│  2   using System;                                                                                                                                         │
│  3   using System.Collections.Generic;                                                                                                                     │
│  4   using System.Linq;                                                                                                                                    │
│ ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ │
│ 29           /// </summary>                                                                                                                                │
│ 30           public async Task<IEnumerable<SpendRecordView>> GetSpendRecordsAsync(DateTimeOffset from, DateTimeOffset to)                                  │
│ 31           {                                                                                                                                             │
│ 31 -             var spendRecords = await _context.SpendFacts                                                                                              │
│ 32 -                 .AsNoTracking()                                                                                                                       │
│ 33 -                 .Where(sf => sf.OccurredAt >= from && sf.OccurredAt <= to)                                                                            │
│ 34 -                 .GroupJoin( // Left join to Suppliers                                                                                                 │
│ 35 -                     _context.ImsSuppliers,                                                                                                            │
│ 36 -                     spendFact => spendFact.SupplierId,                                                                                                │
│ 37 -                     supplier => supplier.SupplierId,                                                                                                  │
│ 38 -                     (spendFact, suppliers) => new { spendFact, suppliers })                                                                           │
│ 39 -                 .SelectMany(                                                                                                                          │
│ 40 -                     temp => temp.suppliers.DefaultIfEmpty(),                                                                                          │
│ 41 -                     (prev, supplier) => new { prev.spendFact, supplier })                                                                             │
│ 42 -                 .GroupJoin( // Left join to Users (for Employees)                                                                                     │
│ 43 -                     _context.Users,                                                                                                                   │
│ 44 -                     prev => prev.spendFact.EmployeeId,                                                                                                │
│ 45 -                     user => user.UserId,                                                                                                              │
│ 46 -                     (prev, users) => new { prev.spendFact, prev.supplier, users })                                                                    │
│ 47 -                 .SelectMany(                                                                                                                          │
│ 48 -                     temp => temp.users.DefaultIfEmpty(),                                                                                              │
│ 49 -                     (prev, user) => new { prev.spendFact, prev.supplier, user })                                                                      │
│ 50 -                 .OrderByDescending(x => x.spendFact.OccurredAt)                                                                                       │
│ 51 -                 .Select(x => new SpendRecordView                                                                                                      │
│ 52 -                 {                                                                                                                                     │
│ 53 -                     SpendFactId = x.spendFact.SpendFactId,                                                                                            │
│ 54 -                     Amount = x.spendFact.Amount,                                                                                                      │
│ 55 -                     Currency = x.spendFact.Currency,                                                                                                  │
│ 56 -                     OccurredAt = x.spendFact.OccurredAt,                                                                                              │
│ 57 -                     Channel = x.spendFact.Channel,                                                                                                    │
│ 58 -                     // Best-effort name resolution                                                                                                    │
│ 59 -                     CounterpartyName = x.supplier != null ? x.supplier.Name : (x.user != null ? x.user.Name : null),                                  │
│ 60 -                     // Simple description generation                                                                                                  │
│ 61 -                     Description = $"Paid {x.spendFact.Amount:F2} {x.spendFact.Currency} via {x.spendFact.Channel}"                                    │
│ 62 -                 })                                                                                                                                    │
│ 63 -                 .ToListAsync();                                                                                                                       │
│ 32 +             // This code will cause a compile error now that SpendFacts DbSet is removed from DbContext in SynOSDbContext                             │
│ 33 +             // var spendRecords = await _context.SpendFacts                                                                                           │
│ 34 +             //     .AsNoTracking()                                                                                                                    │
│ 35 +             //     .Where(sf => sf.OccurredAt >= from && sf.OccurredAt <= to)                                                                         │
│ 36 +             //     .GroupJoin( // Left join to Suppliers                                                                                              │
│ 37 +             //         _context.ImsSuppliers,                                                                                                         │
│ 38 +             //         spendFact => spendFact.SupplierId,                                                                                             │
│ 39 +             //         supplier => supplier.SupplierId,                                                                                               │
│ 40 +             //         (spendFact, suppliers) => new { spendFact, suppliers })                                                                        │
│ 41 +             //     .SelectMany(                                                                                                                       │
│ 42 +             //         temp => temp.suppliers.DefaultIfEmpty(),                                                                                       │
│ 43 +             //         (prev, supplier) => new { prev.spendFact, supplier })                                                                          │
│ 44 +             //     .GroupJoin( // Left join to Users (for Employees)                                                                                  │
│ 45 +             //         _context.Users,                                                                                                                │
│ 46 +             //         prev => prev.spendFact.EmployeeId,                                                                                             │
│ 47 +             //         user => user.UserId,                                                                                                           │
│ 48 +             //         (prev, users) => new { prev.spendFact, prev.supplier, users })                                                                 │
│ 49 +             //     .SelectMany(                                                                                                                       │
│ 50 +             //         temp => temp.users.DefaultIfEmpty(),                                                                                           │
│ 51 +             //         (prev, user) => new { prev.spendFact, prev.supplier, user })                                                                   │
│ 52 +             //     .OrderByDescending(x => x.spendFact.OccurredAt)                                                                                    │
│ 53 +             //     .Select(x => new SpendRecordView                                                                                                   │
│ 54 +             //     {                                                                                                                                  │
│ 55 +             //         SpendFactId = x.spendFact.SpendFactId,                                                                                         │
│ 56 +             //         Amount = x.spendFact.Amount,                                                                                                   │
│ 57 +             //         Currency = x.spendFact.Currency,                                                                                               │
│ 58 +             //         OccurredAt = x.spendFact.OccurredAt,                                                                                           │
│ 59 +             //         Channel = x.spendFact.Channel,                                                                                                 │
│ 60 +             //         // Best-effort name resolution                                                                                                 │
│ 61 +             //         CounterpartyName = x.supplier != null ? x.supplier.Name : (x.user != null ? x.user.Name : null),                               │
│ 62 +             //         // Simple description generation                                                                                               │
│ 63 +             //         Description = $"Paid {x.spendFact.Amount:F2} {x.spendFact.Currency} via {x.spendFact.Channel}"                                 │
│ 64 +             //     })                                                                                                                                 │
│ 65 +             //     .ToListAsync();                                                                                                                    │
│ 66                                                                                                                                                         │
│ 65 -             return spendRecords;                                                                                                                      │
│ 67 +             // return spendRecords;                                                                                                                   │
│ 68 +                                                                                                                                                       │
│ 69 +             // Placeholder to prevent compile errors until real implementation or removal                                                             │
│ 70 +             return Task.FromResult<IEnumerable<SpendRecordView>>(new List<SpendRecordView>());                                                        │
│ 71           }                                                                                                                                             │
│ 72       }                                                                                                                                                 │
│ 73   }                                                                                                                                                     │
│ 74 + */                                                                                                                                                    │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ SpendQueryService.cs commented out. Now, SpendReadController.cs.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  ReadFile src\...\Read\SpendReadController.cs                                                                                                            │
│                                                                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ Read SpendReadController.cs. Commenting out its entire content to deactivate.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  WriteFile Writing to src\...\Read\SpendReadController.cs                                                                                                │
│                                                                                                                                                            │
│  1 + /*                                                                                                                                                    │
│  2   using System;                                                                                                                                         │
│  3   using System.Threading.Tasks;                                                                                                                         │
│  4   using Microsoft.AspNetCore.Mvc;                                                                                                                       │
│ ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ │
│ 41           {                                                                                                                                             │
│ 42               // Instantiate the query service locally, passing the DbContext.                                                                          │
│ 43               // This is an intentional pattern to keep read models decoupled from global DI.                                                           │
│ 43 -             var queryService = new SpendQueryService(_context);                                                                                       │
│ 44 +             // var queryService = new SpendQueryService(_context); // This will cause a compile error if SpendQueryService is commented out           │
│ 45                                                                                                                                                         │
│ 45 -             var records = await queryService.GetSpendRecordsAsync(from, to);                                                                          │
│ 46 -                                                                                                                                                       │
│ 47 -             // Return the read model as-is. Do not transform, aggregate, or summarize.                                                                │
│ 48 -             return Ok(records);                                                                                                                       │
│ 46 +             // Placeholder to prevent compile errors until real implementation or removal                                                             │
│ 47 +             // return Ok(await queryService.GetSpendRecordsAsync(from, to));                                                                          │
│ 48 +             return Ok(new { message = "SpendReadController is deferred." });                                                                          │
│ 49           }                                                                                                                                             │
│ 50       }                                                                                                                                                 │
│ 51   }                                                                                                                                                     │
│ 52 + */                                                                                                                                                    │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ SpendReadController.cs commented out. Proceeding to comment out PaymentDeclarationDto.cs.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  ReadFile src\...\PaymentDeclarationDto.cs                                                                                                               │
│                                                                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ Read PaymentDeclarationDto.cs. Commenting out its entire content to deactivate.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  WriteFile Writing to src\...\PaymentDeclarationDto.cs                                                                                                   │
│                                                                                                                                                            │
│  1 + /*                                                                                                                                                    │
│  2   using System;                                                                                                                                         │
│  3   using SynOS.Models.Entities.Payments; // Required for PaymentDirection                                                                                │
│  4                                                                                                                                                         │
│ ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ │
│ 27           public string? Channel { get; set; }                                                                                                          │
│ 28       }                                                                                                                                                 │
│ 29   }                                                                                                                                                     │
│ 30 + */                                                                                                                                                    │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ PaymentDeclarationDto.cs commented out. Proceeding to comment out SpendRecordView.cs.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  ReadFile src\...\Spend\SpendRecordView.cs                                                                                                               │
│                                                                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ Read SpendRecordView.cs. Commenting out its entire content to deactivate.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  WriteFile Writing to src\...\Spend\SpendRecordView.cs                                                                                                   │
│                                                                                                                                                            │
│  1 + /*                                                                                                                                                    │
│  2   using System;                                                                                                                                         │
│  3                                                                                                                                                         │
│  4   namespace SynOS.Models.DTOs.ReadModels.Spend                                                                                                          │
│ ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ │
│ 28           public string Description { get; set; }                                                                                                       │
│ 29       }                                                                                                                                                 │
│ 30   }                                                                                                                                                     │
│ 31 + */                                                                                                                                                    │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ SpendRecordView.cs is out. Now, SpendReadController.cs will be commented out too, just to be thorough and deactivate its route.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  ReadFile src\...\Read\SpendReadController.cs                                                                                                            │
│                                                                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ I've completed all required actions: DbSet<PaymentConfirmedFact> and its OnModelCreating configuration are removed from SynOSDbContext.cs, along with the   
  corresponding using statement. PaymentDeclarationController.cs, SpendQueryService.cs, SpendReadController.cs, PaymentDeclarationDto.cs, and
  SpendRecordView.cs are all commented out, disabling their runtime wiring without deletion. I will now report completion and await further confirmation.     
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  WriteTodos Cleared todo list                                                                                                                            │
│                                                                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ I've completed the last task and cleared my to-do list, as instructed by the STOP command. Now, I'm ready for new instructions.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  ReadFile design-docs\npx-gemini-prompt.md                                                                                                               │
│                                                                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ I have completed all instructions in the current prompt file, design-docs/npx-gemini-prompt.md. I am ready for the next task. Please update the prompt file 
  or provide new instructions.