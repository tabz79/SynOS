using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Projections
{
    public class TestVolumeProjectionHandler : IProjectionHandler
    {
        public string ProjectionName => "TestVolume";

        public async Task ProjectEventAsync(StoredEvent storedEvent, MiddlewareDbContext db)
        {
            if (storedEvent.EventType != "ProcessingStarted")
            {
                return;
            }

            try
            {
                using var doc = JsonDocument.Parse(storedEvent.PayloadJson);
                var root = doc.RootElement;

                var testCode = root.TryGetProperty("TestCode", out var tcProp) ? tcProp.GetString() : null;
                var department = root.TryGetProperty("Department", out var deptProp) ? deptProp.GetString() : null;

                if (string.IsNullOrEmpty(testCode))
                {
                    return;
                }

                var dateOnly = storedEvent.OccurredAt.Date;
                var resolvedDept = department ?? "Unknown";

                var fact = db.TestVolumeFacts.Local.FirstOrDefault(f => 
                    f.LabId == storedEvent.LabId && 
                    f.Date == dateOnly && 
                    f.TestCode == testCode);

                if (fact == null)
                {
                    fact = await db.TestVolumeFacts.FirstOrDefaultAsync(f => 
                        f.LabId == storedEvent.LabId && 
                        f.Date == dateOnly && 
                        f.TestCode == testCode);
                }

                if (fact == null)
                {
                    fact = new TestVolumeFact
                    {
                        Id = Guid.NewGuid(),
                        LabId = storedEvent.LabId,
                        Date = dateOnly,
                        TestCode = testCode,
                        Department = resolvedDept,
                        VolumeCount = 1,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    db.TestVolumeFacts.Add(fact);
                }
                else
                {
                    fact.VolumeCount++;
                    fact.UpdatedAt = DateTime.UtcNow;
                }
            }
            catch
            {
                // Ignore parse errors to keep engine running safely
            }
        }
    }
}
