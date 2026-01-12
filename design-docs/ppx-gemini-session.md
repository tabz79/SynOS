✦
     1 using System;
     2 using System.Collections.Generic;
     3 using System.Linq;
     4 using System.Threading.Tasks;
     5 using Microsoft.EntityFrameworkCore;
     6 using SynOS.Data;
     7 using SynOS.Models.Entities.Leave;
     8 using SynOS.Models.Entities.Payroll;
     9 using SynOS.Models.Enums;
    10 using SynOS.Services.Leave.Exceptions;
    11
    12 namespace SynOS.Services.Leave
    13 {
    14     public class LeaveFactWriter : ILeaveFactWriter
    15     {
    16         private readonly SynOSDbContext _context;
    17
    18         public LeaveFactWriter(SynOSDbContext context)
    19         {
    20             _context = context;
    21         }
    22
    23         public async Task CreateLeaveFactAsync(LeaveFact newLeaveFact)
    24         {
    25             // Guard: Mandatory Fields (Explicit check for non-default values)
    26             if (newLeaveFact.AuthorId == Guid.Empty)
    27             {
    28                 throw new LeaveEngineViolationException("AuthorId is required and cannot be empty.");
    29             }
    30
    31             if (newLeaveFact.ApprovalTimestamp == default)
    32             {
    33                 throw new LeaveEngineViolationException("A valid ApprovalTimestamp is required.");
    34             }
    35
    36             // Guard: Finalized Payroll Period
    37             // StartTime must not fall inside any period that is already finalized
    38             var isInsideFinalizedPeriod = await _context.PayrollPeriods
    39                 .AnyAsync(pp => pp.Status == PayrollPeriodStatus.Finalized &&
    40                                 newLeaveFact.StartTime >= pp.StartDate &&
    41                                 newLeaveFact.StartTime <= pp.EndDate);
    42
    43             if (isInsideFinalizedPeriod)
    44             {
    45                 throw new LeaveEngineViolationException("Cannot record leave facts within a finalized payroll period.");
    46             }
    47
    48             // Guard: Overlap Logic (Excluding Cancelled Facts)
    49             // 1. Collect all OriginalLeaveFactIds from LeaveCancellationFacts (Unfiltered by employee)
    50             var cancelledLeaveFactIds = await _context.LeaveCancellationFacts
    51                 .Select(cf => cf.OriginalLeaveFactId)
    52                 .ToListAsync();
    53
    54             // 2. Detect overlap only against LeaveFacts whose ID is NOT in the cancelled set
    55             var hasOverlap = await _context.LeaveFacts
    56                 .AnyAsync(lf => lf.EmployeeId == newLeaveFact.EmployeeId &&
    57                                 !cancelledLeaveFactIds.Contains(lf.LeaveFactId) &&
    58                                 newLeaveFact.StartTime < lf.EndTime &&
    59                                 newLeaveFact.EndTime > lf.StartTime);
    60
    61             if (hasOverlap)
    62             {
    63                 throw new LeaveEngineViolationException("An active leave record already exists for the specified time range.");
    64             }
    65
    66             // Persistence
    67             newLeaveFact.RecordedTimestamp = DateTime.UtcNow;
    68             _context.LeaveFacts.Add(newLeaveFact);
    69             await _context.SaveChangesAsync();
    70         }
    71
    72         public async Task CancelLeaveFactAsync(Guid originalLeaveFactId, Guid authorId)
    73         {
    74             // Guard: Existence
    75             var originalFact = await _context.LeaveFacts
    76                 .AsNoTracking()
    77                 .FirstOrDefaultAsync(lf => lf.LeaveFactId == originalLeaveFactId);
    78
    79             if (originalFact == null)
    80             {
    81                 throw new LeaveEngineViolationException("The targeted LeaveFact does not exist.");
    82             }
    83
    84             // Guard: Duplicate Cancellation (Strict Idempotency)
    85             var alreadyCancelled = await _context.LeaveCancellationFacts
    86                 .AnyAsync(cf => cf.OriginalLeaveFactId == originalLeaveFactId);
    87
    88             if (alreadyCancelled)
    89             {
    90                 throw new LeaveEngineViolationException("LeaveFact has already been cancelled.");
    91             }
    92
    93             // Creation of Cancellation Fact
    94             var cancellationFact = new LeaveCancellationFact
    95             {
    96                 LeaveCancellationFactId = Guid.NewGuid(),
    97                 OriginalLeaveFactId = originalLeaveFactId,
    98                 AuthorId = authorId,
    99                 RecordedTimestamp = DateTime.UtcNow
   100             };
   101
   102             _context.LeaveCancellationFacts.Add(cancellationFact);
   103             await _context.SaveChangesAsync();
   104         }
   105     }
   106 }

> proceed with the approved plan

╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  Shell mkdir src\SynOS.Services\Leave; mkdir src\SynOS.Services\Leave\Exceptions [current working directory D:\Projects\SynOS-Synthesized-Lab-Intellige… │
│                                                                                                                                                            │
│ mkdir : An item with the specified name D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\Leave already exists.                            │
│ At line:1 char:1                                                                                                                                           │
│ + mkdir src\SynOS.Services\Leave; mkdir src\SynOS.Services\Leave\Except ...                                                                                │
│ + ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~                                                                                                                           │
│     + CategoryInfo          : ResourceExists: (D:\Projects\Syn....Services\Leave:String) [New-Item], IOException                                           │
│     + FullyQualifiedErrorId : DirectoryExist,Microsoft.PowerShell.Commands.NewItemCommand                                                                  │
│                                                                                                                                                            │
│ mkdir : An item with the specified name D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\Leave\Exceptions already exists.                 │
│ At line:1 char:33                                                                                                                                          │
│ + ... r src\SynOS.Services\Leave; mkdir src\SynOS.Services\Leave\Exceptions                                                                                │
│ +                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~                                                                                │
│     + CategoryInfo          : ResourceExists: (D:\Projects\Syn...eave\Exceptions:String) [New-Item], IOException                                           │
│     + FullyQualifiedErrorId : DirectoryExist,Microsoft.PowerShell.Commands.NewItemCommand                                                                  │
│                                                                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  ReadFolder src/SynOS.Services/Leave                                                                                                                     │
│                                                                                                                                                            │
│ Listed 1 item(s).                                                                                                                                          │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  ReadFolder src/SynOS.Services/Leave/Exceptions                                                                                                          │
│                                                                                                                                                            │
│ Listed 1 item(s).                                                                                                                                          │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  WriteFile Writing to src\...\Leave\ILeaveFactWriter.cs                                                                                                  │
│                                                                                                                                                            │
│  1 using System;                                                                                                                                           │
│  2 using System.Threading.Tasks;                                                                                                                           │
│  3 using SynOS.Models.Entities.Leave;                                                                                                                      │
│  4                                                                                                                                                         │
│  5 namespace SynOS.Services.Leave                                                                                                                          │
│  6 {                                                                                                                                                       │
│  7     public interface ILeaveFactWriter                                                                                                                   │
│  8     {                                                                                                                                                   │
│  9         Task CreateLeaveFactAsync(LeaveFact newLeaveFact);                                                                                              │
│ 10         Task CancelLeaveFactAsync(Guid originalLeaveFactId, Guid authorId);                                                                             │
│ 11     }                                                                                                                                                   │
│ 12 }                                                                                                                                                       │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  WriteFile Writing to src\...\Leave\LeaveFactWriter.cs                                                                                                   │
│                                                                                                                                                            │
│   1 using System;                                                                                                                                          │
│   2 using System.Collections.Generic;                                                                                                                      │
│   3 using System.Linq;                                                                                                                                     │
│   4 using System.Threading.Tasks;                                                                                                                          │
│   5 using Microsoft.EntityFrameworkCore;                                                                                                                   │
│   6 using SynOS.Data;                                                                                                                                      │
│   7 using SynOS.Models.Entities.Leave;                                                                                                                     │
│   8 using SynOS.Models.Entities.Payroll;                                                                                                                   │
│   9 using SynOS.Models.Enums;                                                                                                                              │
│  10 using SynOS.Services.Leave.Exceptions;                                                                                                                 │
│  11                                                                                                                                                        │
│  12 namespace SynOS.Services.Leave                                                                                                                         │
│  13 {                                                                                                                                                      │
│  14     public class LeaveFactWriter : ILeaveFactWriter                                                                                                    │
│  15     {                                                                                                                                                  │
│  16         private readonly SynOSDbContext _context;                                                                                                      │
│  17                                                                                                                                                        │
│  18         public LeaveFactWriter(SynOSDbContext context)                                                                                                 │
│  19         {                                                                                                                                              │
│  20             _context = context;                                                                                                                        │
│  21         }                                                                                                                                              │
│  22                                                                                                                                                        │
│  23         public async Task CreateLeaveFactAsync(LeaveFact newLeaveFact)                                                                                 │
│  24         {                                                                                                                                              │
│  25             // Guard: Mandatory Fields (Explicit check for non-default values)                                                                         │
│  26             if (newLeaveFact.AuthorId == Guid.Empty)                                                                                                   │
│  27             {                                                                                                                                          │
│  28                 throw new LeaveEngineViolationException("AuthorId is required and cannot be empty.");                                                  │
│  29             }                                                                                                                                          │
│  30                                                                                                                                                        │
│  31             if (newLeaveFact.ApprovalTimestamp == default)                                                                                             │
│  32             {                                                                                                                                          │
│  33                 throw new LeaveEngineViolationException("A valid ApprovalTimestamp is required.");                                                     │
│  34             }                                                                                                                                          │
│  35                                                                                                                                                        │
│  36             // Guard: Finalized Payroll Period                                                                                                         │
│  37             // StartTime must not fall inside any period that is already finalized                                                                     │
│  38             var isInsideFinalizedPeriod = await _context.PayrollPeriods                                                                                │
│  39                 .AnyAsync(pp => pp.Status == PayrollPeriodStatus.Finalized &&                                                                          │
│  40                                 newLeaveFact.StartTime >= pp.StartDate &&                                                                              │
│  41                                 newLeaveFact.StartTime <= pp.EndDate);                                                                                 │
│  42                                                                                                                                                        │
│  43             if (isInsideFinalizedPeriod)                                                                                                               │
│  44             {                                                                                                                                          │
│  45                 throw new LeaveEngineViolationException("Cannot record leave facts within a finalized payroll period.");                               │
│  46             }                                                                                                                                          │
│  47                                                                                                                                                        │
│  48             // Guard: Overlap Logic (Excluding Cancelled Facts)                                                                                        │
│  49             // 1. Collect all OriginalLeaveFactIds from LeaveCancellationFacts (Unfiltered by employee)                                                │
│  50             var cancelledLeaveFactIds = await _context.LeaveCancellationFacts                                                                          │
│  51                 .Select(cf => cf.OriginalLeaveFactId)                                                                                                  │
│  52                 .ToListAsync();                                                                                                                        │
│  53                                                                                                                                                        │
│  54             // 2. Detect overlap only against LeaveFacts whose ID is NOT in the cancelled set                                                          │
│  55             var hasOverlap = await _context.LeaveFacts                                                                                                 │
│  56                 .AnyAsync(lf => lf.EmployeeId == newLeaveFact.EmployeeId &&                                                                            │
│  57                                 !cancelledLeaveFactIds.Contains(lf.LeaveFactId) &&                                                                     │
│  58                                 newLeaveFact.StartTime < lf.EndTime &&                                                                                 │
│  59                                 newLeaveFact.EndTime > lf.StartTime);                                                                                  │
│  60                                                                                                                                                        │
│  61             if (hasOverlap)                                                                                                                            │
│  62             {                                                                                                                                          │
│  63                 throw new LeaveEngineViolationException("An active leave record already exists for the specified time range.");                        │
│  64             }                                                                                                                                          │
│  65                                                                                                                                                        │
│  66             // Persistence                                                                                                                             │
│  67             newLeaveFact.RecordedTimestamp = DateTime.UtcNow;                                                                                          │
│  68             _context.LeaveFacts.Add(newLeaveFact);                                                                                                     │
│  69             await _context.SaveChangesAsync();                                                                                                         │
│  70         }                                                                                                                                              │
│  71                                                                                                                                                        │
│  72         public async Task CancelLeaveFactAsync(Guid originalLeaveFactId, Guid authorId)                                                                │
│  73         {                                                                                                                                              │
│  74             // Guard: Existence                                                                                                                        │
│  75             var originalFact = await _context.LeaveFacts                                                                                               │
│  76                 .AsNoTracking()                                                                                                                        │
│  77                 .FirstOrDefaultAsync(lf => lf.LeaveFactId == originalLeaveFactId);                                                                     │
│  78                                                                                                                                                        │
│  79             if (originalFact == null)                                                                                                                  │
│  80             {                                                                                                                                          │
│  81                 throw new LeaveEngineViolationException("The targeted LeaveFact does not exist.");                                                     │
│  82             }                                                                                                                                          │
│  83                                                                                                                                                        │
│  84             // Guard: Duplicate Cancellation (Strict Idempotency)                                                                                      │
│  85             var alreadyCancelled = await _context.LeaveCancellationFacts                                                                               │
│  86                 .AnyAsync(cf => cf.OriginalLeaveFactId == originalLeaveFactId);                                                                        │
│  87                                                                                                                                                        │
│  88             if (alreadyCancelled)                                                                                                                      │
│  89             {                                                                                                                                          │
│  90                 throw new LeaveEngineViolationException("LeaveFact has already been cancelled.");                                                      │
│  91             }                                                                                                                                          │
│  92                                                                                                                                                        │
│  93             // Creation of Cancellation Fact                                                                                                           │
│  94             var cancellationFact = new LeaveCancellationFact                                                                                           │
│  95             {                                                                                                                                          │
│  96                 LeaveCancellationFactId = Guid.NewGuid(),                                                                                              │
│  97                 OriginalLeaveFactId = originalLeaveFactId,                                                                                             │
│  98                 AuthorId = authorId,                                                                                                                   │
│  99                 RecordedTimestamp = DateTime.UtcNow                                                                                                    │
│ 100             };                                                                                                                                         │
│ 101                                                                                                                                                        │
│ 102             _context.LeaveCancellationFacts.Add(cancellationFact);                                                                                     │
│ 103             await _context.SaveChangesAsync();                                                                                                         │
│ 104         }                                                                                                                                              │
│ 105     }                                                                                                                                                  │
│ 106 }                                                                                                                                                      │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦
     1 using System;
     2 using System.Collections.Generic;
     3 using System.Linq;
     4 using System.Threading.Tasks;
     5 using Microsoft.EntityFrameworkCore;
     6 using SynOS.Data;
     7 using SynOS.Models.Entities.Leave;
     8 using SynOS.Models.Entities.Payroll;
     9 using SynOS.Models.Enums;
    10 using SynOS.Services.Leave.Exceptions;
    11
    12 namespace SynOS.Services.Leave
    13 {
    14     public class LeaveFactWriter : ILeaveFactWriter
    15     {
    16         private readonly SynOSDbContext _context;
    17
    18         public LeaveFactWriter(SynOSDbContext context)
    19         {
    20             _context = context;
    21         }
    22
    23         public async Task CreateLeaveFactAsync(LeaveFact newLeaveFact)
    24         {
    25             // Guard: Mandatory Fields (Explicit check for non-default values)
    26             if (newLeaveFact.AuthorId == Guid.Empty)
    27             {
    28                 throw new LeaveEngineViolationException("AuthorId is required and cannot be empty.");
    29             }
    30
    31             if (newLeaveFact.ApprovalTimestamp == default)
    32             {
    33                 throw new LeaveEngineViolationException("A valid ApprovalTimestamp is required.");
    34             }
    35
    36             // Guard: Finalized Payroll Period
    37             // StartTime must not fall inside any period that is already finalized
    38             var isInsideFinalizedPeriod = await _context.PayrollPeriods
    39                 .AnyAsync(pp => pp.Status == PayrollPeriodStatus.Finalized &&
    40                                 newLeaveFact.StartTime >= pp.StartDate &&
    41                                 newLeaveFact.StartTime <= pp.EndDate);
    42
    43             if (isInsideFinalizedPeriod)
    44             {
    45                 throw new LeaveEngineViolationException("Cannot record leave facts within a finalized payroll period.");
    46             }
    47
    48             // Guard: Overlap Logic (Excluding Cancelled Facts)
    49             // 1. Collect all OriginalLeaveFactIds from LeaveCancellationFacts (Unfiltered by employee)
    50             var cancelledLeaveFactIds = await _context.LeaveCancellationFacts
    51                 .Select(cf => cf.OriginalLeaveFactId)
    52                 .ToListAsync();
    53
    54             // 2. Detect overlap only against LeaveFacts whose ID is NOT in the cancelled set
    55             var hasOverlap = await _context.LeaveFacts
    56                 .AnyAsync(lf => lf.EmployeeId == newLeaveFact.EmployeeId &&
    57                                 !cancelledLeaveFactIds.Contains(lf.LeaveFactId) &&
    58                                 newLeaveFact.StartTime < lf.EndTime &&
    59                                 newLeaveFact.EndTime > lf.StartTime);
    60
    61             if (hasOverlap)
    62             {
    63                 throw new LeaveEngineViolationException("An active leave record already exists for the specified time range.");
    64             }
    65
    66             // Persistence
    67             newLeaveFact.RecordedTimestamp = DateTime.UtcNow;
    68             _context.LeaveFacts.Add(newLeaveFact);
    69             await _context.SaveChangesAsync();
    70         }
    71
    72         public async Task CancelLeaveFactAsync(Guid originalLeaveFactId, Guid authorId)
    73         {
    74             // Guard: Existence
    75             var originalFact = await _context.LeaveFacts
    76                 .AsNoTracking()
    77                 .FirstOrDefaultAsync(lf => lf.LeaveFactId == originalLeaveFactId);
    78
    79             if (originalFact == null)
    80             {
    81                 throw new LeaveEngineViolationException("The targeted LeaveFact does not exist.");
    82             }
    83
    84             // Guard: Duplicate Cancellation (Strict Idempotency)
    85             var alreadyCancelled = await _context.LeaveCancellationFacts
    86                 .AnyAsync(cf => cf.OriginalLeaveFactId == originalLeaveFactId);
    87
    88             if (alreadyCancelled)
    89             {
    90                 throw new LeaveEngineViolationException("LeaveFact has already been cancelled.");
    91             }
    92
    93             // Creation of Cancellation Fact
    94             var cancellationFact = new LeaveCancellationFact
    95             {
    96                 LeaveCancellationFactId = Guid.NewGuid(),
    97                 OriginalLeaveFactId = originalLeaveFactId,
    98                 AuthorId = authorId,
    99                 RecordedTimestamp = DateTime.UtcNow
   100             };
   101
   102             _context.LeaveCancellationFacts.Add(cancellationFact);
   103             await _context.SaveChangesAsync();
   104         }
   105     }
   106 }

> is the task complete?

✦ The task is complete according to the approved plan.

  I have implemented:
   1. `ILeaveFactWriter.cs`: The interface defining the contract.
   2. `LeaveFactWriter.cs`: The concrete implementation with all specified guards:
       * Finalized Period Guard: Rejects leave starting in finalized payroll periods.
       * Hardened Overlap Guard: Correctly ignores cancelled facts when detecting collisions.
       * Mandatory Field Validation: Explicitly rejects empty AuthorId or default ApprovalTimestamp.
       * Strict Idempotency: CancelLeaveFactAsync now throws an exception if a cancellation already exists.

  The LeaveFactWriter.cs code provided in the previous turn is ready for audit. I am standing by for your next instruction.