✦ I will start by addressing Issue 1: Removing Generic Event Emission.

  First, I'll modify IOperationsEngine to remove RecordEventAsync.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  Edit src\...\IOperationsEngine.cs:         // Read Ports (Truth)... =>         // Read Ports (Truth)...                                                 │
│                                                                                                                                                            │
│ 10   // Read Ports (Truth)                                                                                                                                 │
│ 11   Task<TodaysSummaryDto> GetDailyFulfillmentStatsAsync(Guid branchId);                                                                                  │
│ 12                                                                                                                                                         │
│ 13 - // Write Ports (State Transitions & Events)                                                                                                           │
│ 14 - Task RecordEventAsync(string eventType, Guid branchId, Guid entityId, string token, string description, Guid actorId);                                │
│ 15 -                                                                                                                                                       │
│ 13   // Sample Lifecycle Write Authority                                                                                                                   │
│ 14   Task RecordSampleCollectedAsync(Guid sampleId, Guid branchId, Guid actorId);                                                                          │
│ 15   Task RecordSampleRejectedAsync(Guid sampleId, Guid branchId, Guid actorId, string reason, bool requiresRecollection = false);                         │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ Now I will modify OperationsEngine.cs to handle both Issue 1 (Internalize Event Emission) and Issue 2 (Fail-Fast Branch Integrity).

  Changes:
   1. Remove public RecordEventAsync.
   2. Add private helper EmitEventAsync taking BranchEventType.
   3. Update RecordSampleCollectedAsync and RecordSampleRejectedAsync to:
       * Call EmitEventAsync.
       * Implement strict null checks for sample.Order and sample.Order.Visit.

  Executing changes.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  ReadFile src\...\OperationsEngine.cs                                                                                                                    │
│                                                                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ I'll rewrite the entire file to incorporate the fixes cleanly.

  Fixes:
   1. Remove `RecordEventAsync` from public. (It was already removed from interface, now removing method or making private). I will make it private helper    
      EmitEventAsync.
   2. Strict Branch/Data Integrity Checks. Replace:
   1     if (sample.Order?.Visit?.BranchId != null && sample.Order.Visit.BranchId != branchId)
      with:

   1     if (sample.Order == null || sample.Order.Visit == null)
   2         throw new InvalidOperationException($"Data Corruption: Sample {sampleId} is orphaned (missing Order or Visit).");
   3
   4     if (sample.Order.Visit.BranchId != branchId)
   5         throw new UnauthorizedAccessException("Sample does not belong to this branch.");

  Refactoring OperationsEngine.cs.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  WriteFile Writing to src\...\OperationsEngine.cs                                                                                                        │
│                                                                                                                                                            │
│ ... first 29 lines hidden ...                                                                                                                              │
│  97 -                 return;                                                                                                                              │
│  98 -             }                                                                                                                                        │
│  99 -                                                                                                                                                      │
│  92               await _eventWriter.WriteEventAsync(                                                                                                      │
│  93                   eventType,                                                                                                                           │
│  94                   branchId.ToString(),                                                                                                                 │
│  95                   entityId.ToString(),                                                                                                                 │
│  96                   token,                                                                                                                               │
│  97                   description,                                                                                                                         │
│ ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ │
│ 106 -                 "User", // Standardize actor type                                                                                                    │
│  98 +                 "User",                                                                                                                              │
│  99                   actorId.ToString()                                                                                                                   │
│ 100               );                                                                                                                                       │
│ 101           }                                                                                                                                            │
│ ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ │
│ 109                                                                                                                                                        │
│ 110               if (sample == null) throw new KeyNotFoundException($"Sample {sampleId} not found");                                                      │
│ 111                                                                                                                                                        │
│ ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ │
│ 120 -             // Security Check: Branch Scope                                                                                                          │
│ 121 -             // Note: If Order or Visit is null, data integrity is broken, but we check what we can.                                                  │
│ 122 -             if (sample.Order?.Visit?.BranchId != null && sample.Order.Visit.BranchId != branchId)                                                    │
│ 123 -                 throw new UnauthorizedAccessException("Sample does not belong to this branch.");                                                     │
│ 112 +             // Issue 2 Fix: Fail Fast on Data Corruption                                                                                             │
│ 113 +             if (sample.Order == null || sample.Order.Visit == null)                                                                                  │
│ 114 +             {                                                                                                                                        │
│ 115 +                 throw new InvalidOperationException($"Data Corruption: Sample {sampleId} is orphaned (missing Order or Visit links).");              │
│ 116 +             }                                                                                                                                        │
│ 117                                                                                                                                                        │
│ ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ │
│ 125 -             // Invariant: Cannot collect twice or if rejected (unless recollecting, which might be a new sample ID in some models, but if same ID,   │
│     status check is key)                                                                                                                                   │
│ 118 +             // Issue 2 Fix: Strict Branch Check                                                                                                      │
│ 119 +             if (sample.Order.Visit.BranchId != branchId)                                                                                             │
│ 120 +             {                                                                                                                                        │
│ 121 +                 throw new UnauthorizedAccessException($"Sample {sampleId} belongs to branch {sample.Order.Visit.BranchId}, access denied for context │
│     branch {branchId}.");                                                                                                                                  │
│ 122 +             }                                                                                                                                        │
│ 123 +                                                                                                                                                      │
│ 124 +             // Invariant: Cannot collect twice                                                                                                       │
│ 125               if (sample.Status != SampleStatus.Pending && sample.Status != SampleStatus.Recollect)                                                    │
│ 126               {                                                                                                                                        │
│ 127                   throw new InvalidOperationException($"Cannot collect sample in state {sample.Status}");                                              │
│ ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ │
│ 140               // Persist                                                                                                                               │
│ 141               await _context.SaveChangesAsync();                                                                                                       │
│ 142                                                                                                                                                        │
│ 144 -             // Emit Event                                                                                                                            │
│ 145 -             var visitId = sample.Order?.VisitId.ToString() ?? "Unknown";                                                                             │
│ 146 -             await _eventWriter.WriteEventAsync(                                                                                                      │
│ 143 +             // Emit Event (Issue 1 Fix: Internal emission only)                                                                                      │
│ 144 +             await EmitEventAsync(                                                                                                                    │
│ 145                   BranchEventType.SAMPLE_COLLECTED,                                                                                                    │
│ 148 -                 branchId.ToString(),                                                                                                                 │
│ 149 -                 visitId,                                                                                                                             │
│ 150 -                 sample.Barcode, // Using Barcode as token                                                                                            │
│ 146 +                 branchId,                                                                                                                            │
│ 147 +                 sample.Order.VisitId,                                                                                                                │
│ 148 +                 sample.Barcode,                                                                                                                      │
│ 149                   $"Sample {sample.Barcode} collected",                                                                                                │
│ 152 -                 "User",                                                                                                                              │
│ 153 -                 actorId.ToString()                                                                                                                   │
│ 150 +                 actorId                                                                                                                              │
│ 151               );                                                                                                                                       │
│ 152           }                                                                                                                                            │
│ 153                                                                                                                                                        │
│ ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ │
│ 160                                                                                                                                                        │
│ 161               if (sample == null) throw new KeyNotFoundException($"Sample {sampleId} not found");                                                      │
│ 162                                                                                                                                                        │
│ 166 -             if (sample.Order?.Visit?.BranchId != null && sample.Order.Visit.BranchId != branchId)                                                    │
│ 167 -                 throw new UnauthorizedAccessException("Sample does not belong to this branch.");                                                     │
│ 163 +             // Issue 2 Fix: Fail Fast on Data Corruption                                                                                             │
│ 164 +             if (sample.Order == null || sample.Order.Visit == null)                                                                                  │
│ 165 +             {                                                                                                                                        │
│ 166 +                 throw new InvalidOperationException($"Data Corruption: Sample {sampleId} is orphaned (missing Order or Visit links).");              │
│ 167 +             }                                                                                                                                        │
│ 168                                                                                                                                                        │
│ 169 +             // Issue 2 Fix: Strict Branch Check                                                                                                      │
│ 170 +             if (sample.Order.Visit.BranchId != branchId)                                                                                             │
│ 171 +             {                                                                                                                                        │
│ 172 +                 throw new UnauthorizedAccessException($"Sample {sampleId} belongs to branch {sample.Order.Visit.BranchId}, access denied for context │
│     branch {branchId}.");                                                                                                                                  │
│ 173 +             }                                                                                                                                        │
│ 174 +                                                                                                                                                      │
│ 175               // Update State                                                                                                                          │
│ 176               sample.Status = requiresRecollection ? SampleStatus.Recollect : SampleStatus.Rejected;                                                   │
│ 177               sample.IsRejected = true;                                                                                                                │
│ ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ │
│ 189                                                                                                                                                        │
│ 190               await _context.SaveChangesAsync();                                                                                                       │
│ 191                                                                                                                                                        │
│ 186 -             var visitId = sample.Order?.VisitId.ToString() ?? "Unknown";                                                                             │
│ 187 -             await _eventWriter.WriteEventAsync(                                                                                                      │
│ 192 +             // Emit Event (Issue 1 Fix: Internal emission only)                                                                                      │
│ 193 +             await EmitEventAsync(                                                                                                                    │
│ 194                   BranchEventType.SAMPLE_REJECTED,                                                                                                     │
│ 189 -                 branchId.ToString(),                                                                                                                 │
│ 190 -                 visitId,                                                                                                                             │
│ 195 +                 branchId,                                                                                                                            │
│ 196 +                 sample.Order.VisitId,                                                                                                                │
│ 197                   sample.Barcode,                                                                                                                      │
│ 198                   $"Sample rejected: {reason} (Recollect: {requiresRecollection})",                                                                    │
│ 193 -                 "User",                                                                                                                              │
│ 194 -                 actorId.ToString()                                                                                                                   │
│ 199 +                 actorId                                                                                                                              │
│ 200               );                                                                                                                                       │
│ 201           }                                                                                                                                            │
│ 202       }                                                                                                                                                │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ I also need to verify that RecordEventAsync was removed from the interface IOperationsEngine in the earlier step.
  Checking IOperationsEngine.cs.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  ReadFile src\...\IOperationsEngine.cs                                                                                                                   │
│                                                                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ It is removed.

  Final Build Verification.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  Shell dotnet build [current working directory D:\Projects\SynOS-Synthesized-Lab-Intelligence] (Final verification build for Operations Engine Audit Fi… │
│                                                                                                                                                            │
│ ... first 67 lines hidden ...                                                                                                                              │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\RadiologyService.cs(396,48): warning CS8601: Possible null reference assi                │
│ gnment. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\SynOS.Services.csproj]                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\RadiologyService.cs(496,28): warning CS8601: Possible null reference assi                │
│ gnment. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\SynOS.Services.csproj]                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\RadiologyService.cs(497,34): warning CS8601: Possible null reference assi                │
│ gnment. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\SynOS.Services.csproj]                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\RadiologyService.cs(498,35): warning CS8601: Possible null reference assi                │
│ gnment. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\SynOS.Services.csproj]                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\RadiologyService.cs(502,35): warning CS8601: Possible null reference assi                │
│ gnment. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\SynOS.Services.csproj]                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\RadiologyService.cs(517,21): warning CS8600: Converting null literal or p                │
│ ossible null value to non-nullable type. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\SynOS.Services.csproj]                         │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\RadiologyService.cs(524,79): warning CS8604: Possible null reference argu                │
│ ment for parameter 'templateModel' in 'Task<byte[]> IReportPdfRenderer.GeneratePdfAsync(ReportDataModel data, TemplateModel templateModel)'                │
│ . [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\SynOS.Services.csproj]                                                                │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\AuditService.cs(46,38): warning CA2017: Number of parameters supplied in                 │
│ the logging message template do not match the number of named placeholders (https://learn.microsoft.com/dotnet/fundamentals/code-analysis/q                │
│ uality-rules/ca2017) [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\SynOS.Services.csproj]                                             │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\Admin\CsvImportRequestDto.cs(9,26): warning CS8618: Non-nullable p                │
│ roperty 'File' must contain a non-null value when exiting constructor. Consider adding the 'required' modifier or declaring the property as                │
│  nullable. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                                                 │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\MappingProfile.cs(20,100): warning CS8602: Dereference of a possibly null refe                │
│ rence. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                                                     │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\MappingProfile.cs(51,85): warning CS8602: Dereference of a possibly null refer                │
│ ence. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                                                      │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\MappingProfile.cs(52,77): warning CS8602: Dereference of a possibly null refer                │
│ ence. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                                                      │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\MappingProfile.cs(53,79): warning CS8602: Dereference of a possibly null refer                │
│ ence. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                                                      │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\MappingProfile.cs(54,84): warning CS8602: Dereference of a possibly null refer                │
│ ence. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                                                      │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\MappingProfile.cs(83,73): warning CS8602: Dereference of a possibly null refer                │
│ ence. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                                                      │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\MappingProfile.cs(83,73): warning CS8602: Dereference of a possibly null refer                │
│ ence. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                                                      │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\Radiology\PacsController.cs(32,37): warning CS8604: Possible null                 │
│ reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\                │
│ SynOS.Api.csproj]                                                                                                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\Radiology\PacsController.cs(45,37): warning CS8604: Possible null                 │
│ reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\                │
│ SynOS.Api.csproj]                                                                                                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\Radiology\PacsController.cs(59,37): warning CS8604: Possible null                 │
│ reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\                │
│ SynOS.Api.csproj]                                                                                                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\Radiology\PacsController.cs(68,37): warning CS8604: Possible null                 │
│ reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\                │
│ SynOS.Api.csproj]                                                                                                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\Radiology\PacsAdminController.cs(25,37): warning CS8604: Possible                 │
│ null reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS                │
│ .Api\SynOS.Api.csproj]                                                                                                                                     │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\Radiology\PacsAdminController.cs(33,37): warning CS8604: Possible                 │
│ null reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS                │
│ .Api\SynOS.Api.csproj]                                                                                                                                     │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\Radiology\PacsAdminController.cs(41,37): warning CS8604: Possible                 │
│ null reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS                │
│ .Api\SynOS.Api.csproj]                                                                                                                                     │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\RadiologyReportsController.cs(40,37): warning CS8604: Possible nul                │
│ l reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Ap                │
│ i\SynOS.Api.csproj]                                                                                                                                        │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\RadiologyReportsController.cs(48,37): warning CS8604: Possible nul                │
│ l reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Ap                │
│ i\SynOS.Api.csproj]                                                                                                                                        │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\RadiologyController.cs(30,37): warning CS8604: Possible null refer                │
│ ence argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS                │
│ .Api.csproj]                                                                                                                                               │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\RadiologyController.cs(47,37): warning CS8604: Possible null refer                │
│ ence argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS                │
│ .Api.csproj]                                                                                                                                               │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\RadiologyController.cs(61,37): warning CS8604: Possible null refer                │
│ ence argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS                │
│ .Api.csproj]                                                                                                                                               │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\RadiologyController.cs(92,37): warning CS8604: Possible null refer                │
│ ence argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS                │
│ .Api.csproj]                                                                                                                                               │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\RadiologyController.cs(101,37): warning CS8604: Possible null refe                │
│ rence argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynO                │
│ S.Api.csproj]                                                                                                                                              │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\IMSStockOperationController.cs(27,37): warning CS8604: Possible nu                │
│ ll reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.A                │
│ pi\SynOS.Api.csproj]                                                                                                                                       │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\IMSStockOperationController.cs(36,37): warning CS8604: Possible nu                │
│ ll reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.A                │
│ pi\SynOS.Api.csproj]                                                                                                                                       │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\IMSPurchasingController.cs(127,41): warning CS8604: Possible null                 │
│ reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\                │
│ SynOS.Api.csproj]                                                                                                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\IMSWastageController.cs(42,110): warning CS8629: Nullable value ty                │
│ pe may be null. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                                            │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\SecureDownloadController.cs(61,13): warning ASP0019: Use IHeaderDi                │
│ ctionary.Append or the indexer to append or set headers. IDictionary.Add will throw an ArgumentException when attempting to add a duplicate                │
│  key. (https://aka.ms/aspnet/analyzers) [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                    │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\SecureDownloadController.cs(62,13): warning ASP0019: Use IHeaderDi                │
│ ctionary.Append or the indexer to append or set headers. IDictionary.Add will throw an ArgumentException when attempting to add a duplicate                │
│  key. (https://aka.ms/aspnet/analyzers) [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                    │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\SecureDownloadController.cs(63,13): warning ASP0019: Use IHeaderDi                │
│ ctionary.Append or the indexer to append or set headers. IDictionary.Add will throw an ArgumentException when attempting to add a duplicate                │
│  key. (https://aka.ms/aspnet/analyzers) [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                    │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\SecureDownloadController.cs(94,13): warning ASP0019: Use IHeaderDi                │
│ ctionary.Append or the indexer to append or set headers. IDictionary.Add will throw an ArgumentException when attempting to add a duplicate                │
│  key. (https://aka.ms/aspnet/analyzers) [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                    │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\SecureDownloadController.cs(95,13): warning ASP0019: Use IHeaderDi                │
│ ctionary.Append or the indexer to append or set headers. IDictionary.Add will throw an ArgumentException when attempting to add a duplicate                │
│  key. (https://aka.ms/aspnet/analyzers) [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                    │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\SecureDownloadController.cs(96,13): warning ASP0019: Use IHeaderDi                │
│ ctionary.Append or the indexer to append or set headers. IDictionary.Add will throw an ArgumentException when attempting to add a duplicate                │
│  key. (https://aka.ms/aspnet/analyzers) [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                    │
│     210 Warning(s)                                                                                                                                         │
│     0 Error(s)                                                                                                                                             │
│                                                                                                                                                            │
│ Time Elapsed 00:00:26.42                                                                                                                                   │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ Build Succeeded.

  Operations Engine Cleanup Complete (Issues 1 & 2):

   1. Generic Event Emission Sealed: RecordEventAsync is removed from IOperationsEngine. It is now a private helper EmitEventAsync inside OperationsEngine.cs,
      accepting only strong BranchEventType.
   2. Branch Integrity Enforced: RecordSampleCollectedAsync and RecordSampleRejectedAsync now explicitly check sample.Order and sample.Order.Visit for nulls  
      and throw InvalidOperationException (Fail Fast) instead of proceeding with potential null-reference or security bypass. They also strictly enforce      
      branch matching.

  The Engine is now tighter and safer.