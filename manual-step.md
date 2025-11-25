# Manual Steps for SynOS Backend Development

This document consolidates all manual actions required during the development process. Please follow these steps carefully.

---

## 1. Stop the API before building (Critical for preventing file lock errors)

If you encounter errors like:
`The process cannot access the file '...' because it is being used by another process.`
This means your SynOS API is still running in the background and locking essential files.

**Action:** Go to the terminal window where you ran `dotnet run` (or `dotnet watch run`) and press `Ctrl + C` to stop the API process. Ensure the process is terminated before attempting to build or run any `dotnet ef` commands.

---

## 2. Frontend Package Installation (After Day 7 Backend Work)

The Day 7 "Barcodes + Samples Module" included backend features for real-time updates via SignalR. If you plan to build the frontend later, you'll need the client-side library.

**Action:** Navigate to your `web/` directory and install the SignalR client library:
```shell
cd web
npm install @microsoft/signalr
cd ../src/SynOS.Api # (or wherever you manage your backend)
```

---

## 3. Correcting the `AddSamplesAndRejectionsTables` Migration (Day 7/10 Migration Issue - **CRITICAL FIX**)

A previous build error was caused by C# business logic accidentally being pasted into this migration file, leading to syntax errors. This step replaces the corrupted file with the **correct, clean migration commands only**.

**Action:**
1.  **Open this file:**
    `src/SynOS.Data/migrations/20251121125941_AddSamplesAndRejectionsTables.cs`
2.  **Delete all the code** currently inside that file.
3.  **Copy and paste the entire code block below** into that blank file.
4.  **Save the file.**

```csharp
using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.migrations
{
    /// <inheritdoc />
    public partial class AddSamplesAndRejectionsTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (
                    SELECT 1
                    FROM sys.indexes
                    WHERE name = 'IX_EditLocks_EntityType_EntityId_Status'
                      AND object_id = OBJECT_ID('[dbo].[EditLocks]')
                )
                DROP INDEX [IX_EditLocks_EntityType_EntityId_Status] ON [dbo].[EditLocks];
            ");

            migrationBuilder.AddColumn<int>(
                name: "DefaultTubeType",
                table: "TestDefinitions",
                type: "int",
                maxLength: 20,
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Samples",
                columns: table => new
                {
                    SampleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TubeType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Barcode = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    CollectedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CollectedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IsRejected = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Samples", x => x.SampleId);
                    table.ForeignKey(
                        name: "FK_Samples_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "OrderId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Samples_Users_CollectedByUserId",
                        column: x => x.CollectedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "SampleRejections",
                columns: table => new
                {
                    RejectionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SampleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    RequiresRecollection = table.Column<bool>(type: "bit", nullable: false),
                    NewSampleId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RejectedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RejectedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SampleRejections", x => x.RejectionId);
                    table.ForeignKey(
                        name: "FK_SampleRejections_Samples_NewSampleId",
                        column: x => x.NewSampleId,
                        principalTable: "Samples",
                        principalColumn: "SampleId");
                    migrationBuilder.ForeignKey(
                        name: "FK_SampleRejections_Samples_SampleId",
                        column: x => x.SampleId,
                        principalTable: "Samples",
                        principalColumn: "SampleId",
                        onDelete: ReferentialAction.Restrict);
                    migrationBuilder.ForeignKey(
                        name: "FK_SampleRejections_Users_RejectedByUserId",
                        column: x => x.RejectedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EditLocks_EntityType_EntityId",
                table: "EditLocks",
                columns: new[] { "EntityType", "EntityId" },
                unique: true,
                filter: "[Status] = 'Active'");

            migrationBuilder.CreateIndex(
                name: "IX_SampleRejections_NewSampleId",
                table: "SampleRejections",
                column: "NewSampleId");

            migrationBuilder.CreateIndex(
                name: "IX_SampleRejections_RejectedByUserId",
                table: "SampleRejections",
                column: "RejectedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SampleRejections_SampleId",
                table: "SampleRejections",
                column: "SampleId");

            migrationBuilder.CreateIndex(
                name: "IX_Samples_Barcode",
                table: "Samples",
                column: "Barcode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Samples_CollectedByUserId",
                table: "Samples",
                column: "CollectedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Samples_OrderId",
                table: "Samples",
                column: "OrderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SampleRejections");

            migrationBuilder.DropTable(
                name: "Samples");

            migrationBuilder.DropIndex(
                name: "IX_EditLocks_EntityType_EntityId",
                table: "EditLocks");

            migrationBuilder.DropColumn(
                name: "DefaultTubeType",
                table: "TestDefinitions");

            migrationBuilder.CreateIndex(
                name: "IX_EditLocks_EntityType_EntityId_Status",
                table: "EditLocks",
                columns: new[] { "EntityType", "EntityId", "Status" },
                unique: true,
                filter: "[Status] = 0");
        }
    }
}
```

---

## 4. Fixing Day 11 Build Error (`CriticalValueService.cs` and `Visit.cs`)

You encountered build errors (`CS1061`) related to incorrect property access in `CriticalValueService.cs` (e.g., `Visit.ReferrerId` and `TestDefinition.CriticalRule` were being accessed incorrectly). This fix involves adding a missing property to the `Visit` entity and then correcting queries in `CriticalValueService` to correctly traverse object relationships.

**Action:**

1.  **Open this file:**
    `src/SynOS.Models/Entities/Visit.cs`
2.  **Delete all the code** currently inside that file.
3.  **Copy and paste the entire code block below** into that blank file.
4.  **Save the file.**

```csharp
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class Visit
    {
        [Key]
        public Guid VisitId { get; set; }

        [Required]
        public Guid PatientId { get; set; }

        [ForeignKey("PatientId")]
        public Patient? Patient { get; set; }

        public Guid? ReferrerId { get; set; }
        [ForeignKey("ReferrerId")]
        public virtual Referrer? Referrer { get; set; }

        [Required]
        [StringLength(12)] // Increased length for new token format
        public string Token { get; set; } = string.Empty;

        [Required]
        public DateTime TokenDate { get; set; } // Lab local date

        [Required]
        [StringLength(50)]
        public string Department { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Status { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Timestamp]
        public byte[]? RowVersion { get; set; }

        public ICollection<Order> Orders { get; set; } = new List<Order>();
        public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    }
}
```

5.  **Open this file:**
    `src/SynOS.Services/CriticalValueService.cs`
6.  **Delete all the code** currently inside that file.
7.  **Copy and paste the entire code block below** into that blank file.
8.  **Save the file.**

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public class CriticalValueService : ICriticalValueService
    {
        private readonly SynOSDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly ILogger<CriticalValueService> _logger;

        public CriticalValueService(SynOSDbContext context, INotificationService notificationService, ILogger<CriticalValueService> logger)
        {
            _context = context;
            _notificationService = notificationService;
            _logger = logger;
        }

        public async Task CheckAndCreateCriticalAlertAsync(Guid resultId)
        {
            var result = await _context.Results
                .Include(r => r.Order.Visit.Patient)
                .Include(r => r.Order.Visit.Referrer) // Include Referrer
                .Include(r => r.Order.TestDefinition)
                .FirstOrDefaultAsync(r => r.ResultId == resultId);

            if (result == null || !decimal.TryParse(result.Value, out var numericValue)) return;

            var rule = await _context.CriticalRules.FirstOrDefaultAsync(r => r.ParameterCode == result.ParameterCode && r.IsActive);
            if (rule == null) return;

            string? criticalThreshold = null;
            if (rule.CriticalLow.HasValue && numericValue < rule.CriticalLow.Value) criticalThreshold = "CriticalLow";
            if (rule.CriticalHigh.HasValue && numericValue > rule.CriticalHigh.Value) criticalThreshold = "CriticalHigh";

            if (criticalThreshold != null)
            {
                var alert = new CriticalAlert
                {
                    AlertId = Guid.NewGuid(),
                    ResultId = result.ResultId,
                    ParameterCode = result.ParameterCode,
                    ParameterName = result.Order.TestDefinition.Name,
                    Value = numericValue,
                    CriticalThreshold = criticalThreshold,
                    PatientId = result.Order.Visit.PatientId,
                    VisitId = result.Order.VisitId,
                    ReferrerId = result.Order.Visit.ReferrerId,
                    Status = "Pending"
                };

                _context.CriticalAlerts.Add(alert);
                await _context.SaveChangesAsync();

                // Call NotifyReferrer with the created alert's ID and rule
                await NotifyReferrerAsync(alert.AlertId, rule);
            }
        }

        public async Task AcknowledgeAlertAsync(Guid alertId, Guid userId, AcknowledgeAlertRequestDto ackDto)
        {
            var alert = await _context.CriticalAlerts.FindAsync(alertId);
            if (alert == null) throw new KeyNotFoundException("Alert not found.");
            if (alert.Status == "Acknowledged") throw new InvalidOperationException("Alert already acknowledged.");

            alert.Status = "Acknowledged";
            alert.AcknowledgedAt = DateTimeOffset.UtcNow;
            alert.AcknowledgedByUserId = userId;
            alert.AckMethod = ackDto.Method;
            alert.AckNotes = ackDto.Notes;

            _context.CriticalAudits.Add(new CriticalAudit { AlertId = alertId, Action = "Acknowledged", ActedByUserId = userId, Details = ackDto.Notes });

            await _context.SaveChangesAsync();
        }

        public async Task EscalateAlertAsync(Guid alertId)
        {
            var alert = await _context.CriticalAlerts.FindAsync(alertId);
            if (alert == null || alert.Status == "Acknowledged") return;

            alert.Status = "Escalated";
            alert.EscalatedAt = DateTimeOffset.UtcNow;

            _context.CriticalAudits.Add(new CriticalAudit { AlertId = alertId, Action = "Escalated" });
            await _context.SaveChangesAsync();
            
            // In a real system, you would find escalation contacts and notify them here.
            _logger.LogWarning("Critical Alert {AlertId} has been escalated.", alertId);
        }

        public async Task CheckAndEscalatePendingAlertsAsync()
        {
            // Fetch alerts that have been Notified but not Acknowledged or Escalated, and whose escalation time has passed
            var pendingAlerts = await _context.CriticalAlerts
                .Where(a => a.Status == "Notified" && a.NotifiedAt.HasValue)
                .ToListAsync();

            foreach (var alert in pendingAlerts)
            {
                // Load the rule for this alert's parameter code
                var rule = await _context.CriticalRules.FirstOrDefaultAsync(r => r.ParameterCode == alert.ParameterCode);
                if (rule == null)
                {
                    _logger.LogWarning("Critical rule not found for parameter {ParameterCode} of alert {AlertId}. Skipping escalation check.", alert.ParameterCode, alert.AlertId);
                    continue;
                }

                if (alert.NotifiedAt.Value.AddMinutes(rule.EscalationMinutes) < DateTimeOffset.UtcNow)
                {
                    await EscalateAlertAsync(alert.AlertId);
                }
            }
        }

        public async Task<IEnumerable<CriticalAlertSummaryDto>> GetAlertsByStatusAsync(string status, int limit)
        {
            return await _context.CriticalAlerts
                .Include(a => a.Patient)
                .Include(a => a.Referrer)
                .Include(a => a.Result) // Include Result to get Unit
                .Where(a => a.Status == status)
                .OrderByDescending(a => a.TriggeredAt)
                .Take(limit)
                .Select(a => new CriticalAlertSummaryDto
                {
                    AlertId = a.AlertId,
                    PatientName = $"{a.Patient.FirstName} {a.Patient.LastName}",
                    Mrn = a.Patient.MRN,
                    ParameterCode = a.ParameterCode,
                    ParameterName = a.ParameterName,
                    Value = a.Value,
                    CriticalThreshold = a.CriticalThreshold,
                    TriggeredAt = a.TriggeredAt,
                    Status = a.Status,
                    ReferrerName = a.Referrer != null ? a.Referrer.ProviderName : "N/A",
                    Unit = a.Result.Unit // Assuming Unit is on Result
                }).ToListAsync();
        }

        public async Task<CriticalAlertDetailDto?> GetAlertDetailsAsync(Guid alertId)
        {
            var alert = await _context.CriticalAlerts
                .Include(a => a.Patient)
                .Include(a => a.Visit)
                .Include(a => a.Referrer)
                .Include(a => a.Result) // Include Result to get Unit
                .FirstOrDefaultAsync(a => a.AlertId == alertId);

            if (alert == null) return null;

            var auditTrail = await _context.CriticalAudits
                .Where(au => au.AlertId == alertId)
                .OrderBy(au => au.ActedAt)
                .Select(au => new AuditDto { ActedAt = au.ActedAt, Action = au.Action, Details = au.Details })
                .ToListAsync();
            
            return new CriticalAlertDetailDto
            {
                Alert = new AlertDetailsDto 
                {
                    AlertId = alert.AlertId,
                    ResultId = alert.ResultId,
                    ParameterCode = alert.ParameterCode,
                    ParameterName = alert.ParameterName,
                    Value = alert.Value,
                    Unit = alert.Result?.Unit ?? "N/A", // Get unit from Result
                    CriticalThreshold = alert.CriticalThreshold,
                    Patient = new PatientSummaryDto { PatientId = alert.PatientId, Name = $"{alert.Patient.FirstName} {alert.Patient.LastName}", Mrn = alert.Patient.MRN },
                    Visit = new VisitSummaryDto { Id = alert.VisitId, Token = alert.Visit.Token },
                    Referrer = alert.Referrer != null ? new ReferrerSummaryDto { Id = alert.Referrer.ReferrerId, Name = alert.Referrer.ProviderName } : null,
                    TriggeredAt = alert.TriggeredAt,
                    NotifiedAt = alert.NotifiedAt,
                    AcknowledgedAt = alert.AcknowledgedAt,
                    Status = alert.Status
                },
                Audit = auditTrail
            };
        }

        private async Task NotifyReferrerAsync(Guid alertId, CriticalRule rule)
        {
            var alert = await _context.CriticalAlerts
                .Include(a => a.Patient)
                .Include(a => a.Visit)
                .Include(a => a.Referrer) // Include Referrer
                .FirstOrDefaultAsync(a => a.AlertId == alertId);
            
            if (alert == null) return;
            
            var contacts = await _context.CriticalContacts
                .Where(c => c.ReferrerId == alert.ReferrerId && c.IsActive).OrderBy(c => c.Priority).ToListAsync();
            
            if (!contacts.Any())
            {
                _logger.LogWarning("No critical contacts found for referrer {ReferrerId} of alert {AlertId}", alert.ReferrerId, alert.AlertId);
                return;
            }

            var primaryContact = contacts.First();
            var notifiedTo = new List<string>();
            var message = $"CRITICAL: {alert.Patient.FirstName} {alert.Patient.LastName} ({alert.Patient.MRN}) - {alert.ParameterName}: {alert.Value} (Critical: {alert.CriticalThreshold}). Contact lab ASAP. Token: {alert.Visit.Token}";

            if (rule.NotificationChannels.Contains("SMS") && !string.IsNullOrEmpty(primaryContact.Phone))
            {
                await _notificationService.SendSmsAsync(primaryContact.Phone, message);
                notifiedTo.Add($"SMS to {primaryContact.Phone}");
            }
            if (rule.NotificationChannels.Contains("EMAIL") && !string.IsNullOrEmpty(primaryContact.Email))
            {
                await _notificationService.SendEmailAsync(primaryContact.Email, $"CRITICAL LAB RESULT - {alert.Patient.FirstName}", message);
                notifiedTo.Add($"Email to {primaryContact.Email}");
            }
            // ... add other channels like WhatsApp ...

            alert.Status = "Notified";
            alert.NotifiedAt = DateTimeOffset.UtcNow;
            alert.NotifiedTo = string.Join(", ", notifiedTo);
            _context.CriticalAudits.Add(new CriticalAudit { AlertId = alertId, Action = "NotificationSent", Details = alert.NotifiedTo });

            await _context.SaveChangesAsync();
        }
    }
}