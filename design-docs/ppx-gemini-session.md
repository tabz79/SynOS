✦ I'll implement protocol-based machine feeds for lab analyzers, targeting ASTM and HL7 messages for Day 14.9. This entails creating AnalyzerIntegration      
  services: IAnalyzerProtocolParser, AnalyzerParsedResult, AstmProtocolParser, Hl7ProtocolParser, and AnalyzerProtocolParserFactory. A
  AnalyzerTcpListenerService will act as a background TCP receiver, configured via AnalyzerIntegrationSettings. I'll also add a RawMessageIngestDto and an    
  HTTP raw endpoint to LabAnalyzerResultsController for testing, storing parsed data into LabAnalyzerResultInbox with Pending or ParseError status. DI will be
  configured in Program.cs. I'm beginning with folder and file creation for AnalyzerIntegration.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  Shell mkdir src\SynOS.Services\AnalyzerIntegration [current working directory D:\Projects\SynOS-Synthesized-Lab-Intelligence] (Create a new directory … │
│                                                                                                                                                            │
│                                                                                                                                                            │
│                                                                                                                                                            │
│     Directory: D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services                                                                           │
│                                                                                                                                                            │
│                                                                                                                                                            │
│ Mode                 LastWriteTime         Length Name                                                                                                     │
│ ----                 -------------         ------ ----                                                                                                     │
│ d-----        09-12-2025  01:39 PM                AnalyzerIntegration                                                                                      │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ src\SynOS.Services\AnalyzerIntegration is ready. Now creating IAnalyzerProtocolParser.cs and AnalyzerParsedResult.cs there.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  WriteFile Writing to src\...\IAnalyzerProtocolParser.cs                                                                                                 │
│                                                                                                                                                            │
│ 1 using System;                                                                                                                                            │
│ 2                                                                                                                                                          │
│ 3 namespace SynOS.Services.AnalyzerIntegration                                                                                                             │
│ 4 {                                                                                                                                                        │
│ 5     public interface IAnalyzerProtocolParser                                                                                                             │
│ 6     {                                                                                                                                                    │
│ 7         AnalyzerParsedResult Parse(string rawMessage);                                                                                                   │
│ 8     }                                                                                                                                                    │
│ 9 }                                                                                                                                                        │
│                                                                                                                                                            │
│ ✓  WriteFile Writing to src\...\AnalyzerParsedResult.cs                                                                                                    │
│                                                                                                                                                            │
│  1 using System;                                                                                                                                           │
│  2                                                                                                                                                         │
│  3 namespace SynOS.Services.AnalyzerIntegration                                                                                                            │
│  4 {                                                                                                                                                       │
│  5     public class AnalyzerParsedResult                                                                                                                   │
│  6     {                                                                                                                                                   │
│  7         public Guid AnalyzerId { get; set; }                                                                                                            │
│  8                                                                                                                                                         │
│  9         public string? PatientIdentifier { get; set; } // MRN or Barcode                                                                                │
│ 10         public string? AnalyzerTestCode { get; set; }   // e.g. “HGB”                                                                                   │
│ 11         public string? Value { get; set; }              // numeric as string                                                                            │
│ 12         public string? Units { get; set; }                                                                                                              │
│ 13         public string? Flags { get; set; }             // H/L/Critical                                                                                  │
│ 14         public string RawMessage { get; set; } = null!; // Store original raw message                                                                   │
│ 15         public string? ErrorMessage { get; set; }      // To store parsing errors                                                                       │
│ 16     }                                                                                                                                                   │
│ 17 }                                                                                                                                                       │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ Interface and DTO are done, RawMessage and ErrorMessage added to the DTO for logging. Now, implementing AstmProtocolParser.cs and Hl7ProtocolParser.cs.     
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  WriteFile Writing to src\...\AstmProtocolParser.cs                                                                                                      │
│                                                                                                                                                            │
│ ... first 25 lines hidden ...                                                                                                                              │
│ 26                                          .ToList();                                                                                                     │
│ 27                                                                                                                                                         │
│ 28                 // Find result segment (R-segment)                                                                                                      │
│ 29                 var rSegment = segments.FirstOrDefault(s => s.StartsWith("R|"));                                                                        │
│ 30                 if (rSegment == null)                                                                                                                   │
│ 31                 {                                                                                                                                       │
│ 32                     result.ErrorMessage = "No R-segment found in ASTM message.";                                                                        │
│ 33                     _logger.LogWarning("ASTM parsing failed: {ErrorMessage}", result.ErrorMessage);                                                     │
│ 34                     return result;                                                                                                                      │
│ 35                 }                                                                                                                                       │
│ 36                                                                                                                                                         │
│ 37                 var rFields = rSegment.Split('|');                                                                                                      │
│ 38                                                                                                                                                         │
│ 39                 // Patient Identifier (from P-segment, if available)                                                                                    │
│ 40                 var pSegment = segments.FirstOrDefault(s => s.StartsWith("P|"));                                                                        │
│ 41                 if (pSegment != null)                                                                                                                   │
│ 42                 {                                                                                                                                       │
│ 43                     var pFields = pSegment.Split('|');                                                                                                  │
│ 44                     // Assuming patient identifier is in P|1|1 (patient sequence number, could be MRN)                                                  │
│ 45                     // Or P|1|||LAST^FIRST^MIDDLE. For now, let's try P|1|1                                                                             │
│ 46                     if (pFields.Length > 2)                                                                                                             │
│ 47                     {                                                                                                                                   │
│ 48                         // A common place for MRN is P|1|1 or P|3 in some variations                                                                    │
│ 49                         // For this basic implementation, let's look for Patient ID in P|3 (Patient ID segment)                                         │
│ 50                         // Example: P|1|MRN123^^^LabID                                                                                                  │
│ 51                         result.PatientIdentifier = pFields.Length > 2 ? pFields[2].Split('^').FirstOrDefault() : null;                                  │
│ 52                     }                                                                                                                                   │
│ 53                 }                                                                                                                                       │
│ 54                                                                                                                                                         │
│ 55                 // Extract result from R-segment                                                                                                        │
│ 56                 // R|1|^^^HGB|12.8|g/dL|H|                                                                                                              │
│ 57                 if (rFields.Length > 3)                                                                                                                 │
│ 58                 {                                                                                                                                       │
│ 59                     result.AnalyzerTestCode = rFields[2].Split('^').LastOrDefault(); // e.g., ^^^HGB -> HGB                                             │
│ 60                     result.Value = rFields[3];                                                                                                          │
│ 61                 }                                                                                                                                       │
│ 62                 if (rFields.Length > 4)                                                                                                                 │
│ 63                 {                                                                                                                                       │
│ 64                     result.Units = rFields[4];                                                                                                          │
│ 65                 }                                                                                                                                       │
│ 66                 if (rFields.Length > 5)                                                                                                                 │
│ 67                 {                                                                                                                                       │
│ 68                     result.Flags = rFields[5];                                                                                                          │
│ 69                 }                                                                                                                                       │
│ 70             }                                                                                                                                           │
│ 71             catch (Exception ex)                                                                                                                        │
│ 72             {                                                                                                                                           │
│ 73                 result.ErrorMessage = $"Exception during ASTM parsing: {ex.Message}";                                                                   │
│ 74                 _logger.LogError(ex, "ASTM parsing encountered an exception.");                                                                         │
│ 75             }                                                                                                                                           │
│ 76                                                                                                                                                         │
│ 77             return result;                                                                                                                              │
│ 78         }                                                                                                                                               │
│ 79     }                                                                                                                                                   │
│ 80 }                                                                                                                                                       │
│                                                                                                                                                            │
│ ✓  WriteFile Writing to src\...\Hl7ProtocolParser.cs                                                                                                       │
│                                                                                                                                                            │
│ ... first 18 lines hidden ...                                                                                                                              │
│ 19                                                                                                                                                         │
│ 20             try                                                                                                                                         │
│ 21             {                                                                                                                                           │
│ 22                 var segments = rawMessage.Split('\n', StringSplitOptions.RemoveEmptyEntries)                                                            │
│ 23                                          .Select(s => s.TrimEnd('\r')) // Remove carriage return                                                        │
│ 24                                          .ToList();                                                                                                     │
│ 25                                                                                                                                                         │
│ 26                 // Extract Patient Identifier from PID segment                                                                                          │
│ 27                 var pidSegment = segments.FirstOrDefault(s => s.StartsWith("PID|"));                                                                    │
│ 28                 if (pidSegment != null)                                                                                                                 │
│ 29                 {                                                                                                                                       │
│ 30                     var pidFields = pidSegment.Split('|');                                                                                              │
│ 31                     if (pidFields.Length > 3)                                                                                                           │
│ 32                     {                                                                                                                                   │
│ 33                         // PID|1||MRN123^^^SYN_MRN^MRN_Type|                                                                                            │
│ 34                         result.PatientIdentifier = pidFields[3].Split('^').FirstOrDefault(); // Assuming MRN is first component                         │
│ 35                     }                                                                                                                                   │
│ 36                 }                                                                                                                                       │
│ 37                                                                                                                                                         │
│ 38                 // Extract result from OBX segment                                                                                                      │
│ 39                 var obxSegment = segments.FirstOrDefault(s => s.StartsWith("OBX|"));                                                                    │
│ 40                 if (obxSegment == null)                                                                                                                 │
│ 41                 {                                                                                                                                       │
│ 42                     result.ErrorMessage = "No OBX segment found in HL7 message.";                                                                       │
│ 43                     _logger.LogWarning("HL7 parsing failed: {ErrorMessage}", result.ErrorMessage);                                                      │
│ 44                     return result;                                                                                                                      │
│ 45                 }                                                                                                                                       │
│ 46                                                                                                                                                         │
│ 47                 var obxFields = obxSegment.Split('|');                                                                                                  │
│ 48                                                                                                                                                         │
│ 49                 // OBX|1|NM|HGB^Hemoglobin||13.1|g/dL|N||                                                                                               │
│ 50                 if (obxFields.Length > 4)                                                                                                               │
│ 51                 {                                                                                                                                       │
│ 52                     result.AnalyzerTestCode = obxFields[3].Split('^').FirstOrDefault(); // OBX-3.1                                                      │
│ 53                     result.Value = obxFields[5]; // OBX-5                                                                                               │
│ 54                 }                                                                                                                                       │
│ 55                 if (obxFields.Length > 6)                                                                                                               │
│ 56                 {                                                                                                                                       │
│ 57                     result.Units = obxFields[6]; // OBX-6                                                                                               │
│ 58                 }                                                                                                                                       │
│ 59                 if (obxFields.Length > 8)                                                                                                               │
│ 60                 {                                                                                                                                       │
│ 61                     result.Flags = obxFields[8]; // OBX-8                                                                                               │
│ 62                 }                                                                                                                                       │
│ 63             }                                                                                                                                           │
│ 64             catch (Exception ex)                                                                                                                        │
│ 65             {                                                                                                                                           │
│ 66                 result.ErrorMessage = $"Exception during HL7 parsing: {ex.Message}";                                                                    │
│ 67                 _logger.LogError(ex, "HL7 parsing encountered an exception.");                                                                          │
│ 68             }                                                                                                                                           │
│ 69                                                                                                                                                         │
│ 70             return result;                                                                                                                              │
│ 71         }                                                                                                                                               │
│ 72     }                                                                                                                                                   │
│ 73 }                                                                                                                                                       │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ Okay, parsers are done. Now, to dynamically select them, I'll create IAnalyzerProtocolParserFactory.cs and AnalyzerProtocolParserFactory.cs.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  WriteFile Writing to IAnalyzerProtocolParserFactory.cs                                                                                                  │
│                                                                                                                                                            │
│ 1 using System;                                                                                                                                            │
│ 2                                                                                                                                                          │
│ 3 namespace SynOS.Services.AnalyzerIntegration                                                                                                             │
│ 4 {                                                                                                                                                        │
│ 5     public interface IAnalyzerProtocolParserFactory                                                                                                      │
│ 6     {                                                                                                                                                    │
│ 7         IAnalyzerProtocolParser GetParser(string protocolType);                                                                                          │
│ 8     }                                                                                                                                                    │
│ 9 }                                                                                                                                                        │
│                                                                                                                                                            │
│ ✓  WriteFile Writing to AnalyzerProtocolParserFactory.cs                                                                                                   │
│                                                                                                                                                            │
│  1 using System;                                                                                                                                           │
│  2 using Microsoft.Extensions.DependencyInjection; // For IServiceProvider                                                                                 │
│  3 using Microsoft.Extensions.Logging;                                                                                                                     │
│  4 using SynOS.Models.Entities;                                                                                                                            │
│  5                                                                                                                                                         │
│  6 namespace SynOS.Services.AnalyzerIntegration                                                                                                            │
│  7 {                                                                                                                                                       │
│  8     public class AnalyzerProtocolParserFactory : IAnalyzerProtocolParserFactory                                                                         │
│  9     {                                                                                                                                                   │
│ 10         private readonly IServiceProvider _serviceProvider;                                                                                             │
│ 11         private readonly ILogger<AnalyzerProtocolParserFactory> _logger;                                                                                │
│ 12                                                                                                                                                         │
│ 13         public AnalyzerProtocolParserFactory(IServiceProvider serviceProvider, ILogger<AnalyzerProtocolParserFactory> logger)                           │
│ 14         {                                                                                                                                               │
│ 15             _serviceProvider = serviceProvider;                                                                                                         │
│ 16             _logger = logger;                                                                                                                           │
│ 17         }                                                                                                                                               │
│ 18                                                                                                                                                         │
│ 19         public IAnalyzerProtocolParser GetParser(string protocolType)                                                                                   │
│ 20         {                                                                                                                                               │
│ 21             return protocolType switch                                                                                                                  │
│ 22             {                                                                                                                                           │
│ 23                 LabAnalyzerConnectionTypes.Astm => _serviceProvider.GetRequiredService<AstmProtocolParser>(),                                           │
│ 24                 LabAnalyzerConnectionTypes.Hl7 => _serviceProvider.GetRequiredService<Hl7ProtocolParser>(),                                             │
│ 25                 _ => throw new ArgumentException($"No parser registered for protocol type: {protocolType}")                                             │
│ 26             };                                                                                                                                          │
│ 27         }                                                                                                                                               │
│ 28     }                                                                                                                                                   │
│ 29 }                                                                                                                                                       │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ Okay, parser factory's done. Now, I'll create AnalyzerIntegrationSettings.cs in src/SynOS.Models/Configuration/ and RawMessageIngestDto.cs in
  src/SynOS.Models/DTOs/LabAnalyzers/.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  WriteFile Writing to ...\AnalyzerIntegrationSettings.cs                                                                                                 │
│                                                                                                                                                            │
│  1 using System;                                                                                                                                           │
│  2 using System.Collections.Generic;                                                                                                                       │
│  3                                                                                                                                                         │
│  4 namespace SynOS.Models.Configuration                                                                                                                    │
│  5 {                                                                                                                                                       │
│  6     public class AnalyzerIntegrationSettings                                                                                                            │
│  7     {                                                                                                                                                   │
│  8         public List<AnalyzerListenerConfig> Listeners { get; set; } = new List<AnalyzerListenerConfig>();                                               │
│  9     }                                                                                                                                                   │
│ 10                                                                                                                                                         │
│ 11     public class AnalyzerListenerConfig                                                                                                                 │
│ 12     {                                                                                                                                                   │
│ 13         public Guid AnalyzerId { get; set; }                                                                                                            │
│ 14         public string Protocol { get; set; } = null!; // ASTM, HL7                                                                                      │
│ 15         public int Port { get; set; }                                                                                                                   │
│ 16     }                                                                                                                                                   │
│ 17 }                                                                                                                                                       │
│                                                                                                                                                            │
│ ✓  WriteFile Writing to src\...\RawMessageIngestDto.cs                                                                                                     │
│                                                                                                                                                            │
│  1 using System.ComponentModel.DataAnnotations;                                                                                                            │
│  2                                                                                                                                                         │
│  3 namespace SynOS.Models.DTOs.LabAnalyzers                                                                                                                │
│  4 {                                                                                                                                                       │
│  5     public class RawMessageIngestDto                                                                                                                    │
│  6     {                                                                                                                                                   │
│  7         [Required]                                                                                                                                      │
│  8         public string Protocol { get; set; } = null!; // ASTM, HL7                                                                                      │
│  9                                                                                                                                                         │
│ 10         [Required]                                                                                                                                      │
│ 11         public string RawMessage { get; set; } = null!;                                                                                                 │
│ 12     }                                                                                                                                                   │
│ 13 }                                                                                                                                                       │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ Configuration and DTO done. Now, AnalyzerTcpListenerService.cs for src/SynOS.Api/BackgroundServices/.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  WriteFile Writing to s\...\AnalyzerTcpListenerService.cs                                                                                                │
│                                                                                                                                                            │
│ ... first 107 lines hidden ...                                                                                                                             │
│ 108                     {                                                                                                                                  │
│ 109                         rawMessageBuilder.Append(Encoding.ASCII.GetString(buffer, 0, bytesRead));                                                      │
│ 110                         // Acknowledge receipt (e.g., for ASTM/HL7, typically ACK/NAK)                                                                 │
│ 111                         // For a basic implementation, we might just send a generic ACK                                                                │
│ 112                         // await SendAcknowledgement(stream, config.Protocol, stoppingToken);                                                          │
│ 113                     }                                                                                                                                  │
│ 114                                                                                                                                                        │
│ 115                     var rawMessage = rawMessageBuilder.ToString();                                                                                     │
│ 116                     if (!string.IsNullOrWhiteSpace(rawMessage))                                                                                        │
│ 117                     {                                                                                                                                  │
│ 118                         await ProcessRawMessage(rawMessage, config.AnalyzerId, config.Protocol);                                                       │
│ 119                     }                                                                                                                                  │
│ 120                 }                                                                                                                                      │
│ 121                 catch (OperationCanceledException)                                                                                                     │
│ 122                 {                                                                                                                                      │
│ 123                     _logger.LogInformation("Client handling for Analyzer {AnalyzerId} cancelled.", config.AnalyzerId);                                 │
│ 124                 }                                                                                                                                      │
│ 125                 catch (Exception ex)                                                                                                                   │
│ 126                 {                                                                                                                                      │
│ 127                     _logger.LogError(ex, "Error handling client connection for Analyzer {AnalyzerId}", config.AnalyzerId);                             │
│ 128                 }                                                                                                                                      │
│ 129             }                                                                                                                                          │
│ 130         }                                                                                                                                              │
│ 131                                                                                                                                                        │
│ 132         private async Task ProcessRawMessage(string rawMessage, Guid analyzerId, string protocolType)                                                  │
│ 133         {                                                                                                                                              │
│ 134             using (var scope = _serviceProvider.CreateScope())                                                                                         │
│ 135             {                                                                                                                                          │
│ 136                 var parserFactory = scope.ServiceProvider.GetRequiredService<IAnalyzerProtocolParserFactory>();                                        │
│ 137                 var labAnalyzerService = scope.ServiceProvider.GetRequiredService<ILabAnalyzerService>();                                              │
│ 138                 var logger = scope.ServiceProvider.GetRequiredService<ILogger<AnalyzerTcpListenerService>>(); // Get specific logger for scope         │
│ 139                                                                                                                                                        │
│ 140                 AnalyzerParsedResult? parsedResult = null;                                                                                             │
│ 141                 try                                                                                                                                    │
│ 142                 {                                                                                                                                      │
│ 143                     var parser = parserFactory.GetParser(protocolType);                                                                                │
│ 144                     parsedResult = parser.Parse(rawMessage);                                                                                           │
│ 145                     parsedResult.AnalyzerId = analyzerId; // Set analyzer ID from config                                                               │
│ 146                                                                                                                                                        │
│ 147                     if (!string.IsNullOrEmpty(parsedResult.ErrorMessage))                                                                              │
│ 148                     {                                                                                                                                  │
│ 149                         logger.LogError("Parsing error for Analyzer {AnalyzerId}, Protocol {Protocol}: {ErrorMessage}", analyzerId, protocolType,      │
│     parsedResult.ErrorMessage);                                                                                                                            │
│ 150                         // Enqueue with ParseError status                                                                                              │
│ 151                         await EnqueueParsingError(analyzerId, rawMessage, parsedResult.ErrorMessage);                                                  │
│ 152                         return;                                                                                                                        │
│ 153                     }                                                                                                                                  │
│ 154                                                                                                                                                        │
│ 155                     var manualResultDto = new Models.DTOs.LabAnalyzers.ManualAnalyzerResultDto                                                         │
│ 156                     {                                                                                                                                  │
│ 157                         RawMessage = parsedResult.RawMessage,                                                                                          │
│ 158                         PatientIdentifier = parsedResult.PatientIdentifier,                                                                            │
│ 159                         AnalyzerTestCode = parsedResult.AnalyzerTestCode,                                                                              │
│ 160                         ResultValue = parsedResult.Value,                                                                                              │
│ 161                         Units = parsedResult.Units,                                                                                                    │
│ 162                         Flags = parsedResult.Flags,                                                                                                    │
│ 163                         MeasuredAt = DateTimeOffset.UtcNow // Assuming measurement time is now if not in parsed result                                 │
│ 164                     };                                                                                                                                 │
│ 165                                                                                                                                                        │
│ 166                     // Use currentUserId = Guid.Empty since it's from machine, or a specific system user ID                                            │
│ 167                     await labAnalyzerService.EnqueueManualResultAsync(analyzerId, manualResultDto, Guid.Empty);                                        │
│ 168                     logger.LogInformation("Successfully enqueued result from Analyzer {AnalyzerId}, Protocol {Protocol}. Patient: {PatientIdentifier}, │
│     Test: {TestCode}",                                                                                                                                     │
│ 169                         analyzerId, protocolType, parsedResult.PatientIdentifier, parsedResult.AnalyzerTestCode);                                      │
│ 170                 }                                                                                                                                      │
│ 171                 catch (Exception ex)                                                                                                                   │
│ 172                 {                                                                                                                                      │
│ 173                     logger.LogError(ex, "Unhandled error processing raw message from Analyzer {AnalyzerId}, Protocol {Protocol}", analyzerId,          │
│     protocolType);                                                                                                                                         │
│ 174                     await EnqueueParsingError(analyzerId, rawMessage, ex.Message);                                                                     │
│ 175                 }                                                                                                                                      │
│ 176             }                                                                                                                                          │
│ 177         }                                                                                                                                              │
│ 178                                                                                                                                                        │
│ 179         private async Task EnqueueParsingError(Guid analyzerId, string rawMessage, string errorMessage)                                                │
│ 180         {                                                                                                                                              │
│ 181             using (var scope = _serviceProvider.CreateScope())                                                                                         │
│ 182             {                                                                                                                                          │
│ 183                 var context = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();                                                              │
│ 184                 var logger = scope.ServiceProvider.GetRequiredService<ILogger<AnalyzerTcpListenerService>>();                                          │
│ 185                                                                                                                                                        │
│ 186                 try                                                                                                                                    │
│ 187                 {                                                                                                                                      │
│ 188                     var errorInboxItem = new LabAnalyzerResultInbox                                                                                    │
│ 189                     {                                                                                                                                  │
│ 190                         InboxId = Guid.NewGuid(),                                                                                                      │
│ 191                         AnalyzerId = analyzerId,                                                                                                       │
│ 192                         RawMessage = rawMessage,                                                                                                       │
│ 193                         Status = LabAnalyzerResultStatus.ParseError, // New status                                                                     │
│ 194                         ErrorMessage = errorMessage, // Store the error message                                                                        │
│ 195                         ReceivedAt = DateTimeOffset.UtcNow,                                                                                            │
│ 196                         ReceivedBy = Guid.Empty, // Machine-generated                                                                                  │
│ 197                         CreatedAt = DateTimeOffset.UtcNow,                                                                                             │
│ 198                         CreatedBy = Guid.Empty                                                                                                         │
│ 199                     };                                                                                                                                 │
│ 200                     context.LabAnalyzerResultInbox.Add(errorInboxItem);                                                                                │
│ 201                     await context.SaveChangesAsync();                                                                                                  │
│ 202                     logger.LogWarning("Raw message with parsing error enqueued to inbox for Analyzer {AnalyzerId}.", analyzerId);                      │
│ 203                 }                                                                                                                                      │
│ 204                 catch (Exception ex)                                                                                                                   │
│ 205                 {                                                                                                                                      │
│ 206                     logger.LogError(ex, "Failed to enqueue parsing error message to inbox for Analyzer {AnalyzerId}.", analyzerId);                    │
│ 207                 }                                                                                                                                      │
│ 208             }                                                                                                                                          │
│ 209         }                                                                                                                                              │
│ 210                                                                                                                                                        │
│ 211         public override async Task StopAsync(CancellationToken stoppingToken)                                                                          │
│ 212         {                                                                                                                                              │
│ 213             _logger.LogInformation("Analyzer TCP Listener Service stopping...");                                                                       │
│ 214             foreach (var listener in _listeners)                                                                                                       │
│ 215             {                                                                                                                                          │
│ 216                 listener.Stop();                                                                                                                       │
│ 217             }                                                                                                                                          │
│ 218             await base.StopAsync(stoppingToken);                                                                                                       │
│ 219             _logger.LogInformation("Analyzer TCP Listener Service stopped.");                                                                          │
│ 220         }                                                                                                                                              │
│ 221     }                                                                                                                                                  │
│ 222 }                                                                                                                                                      │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ AnalyzerTcpListenerService is done. LabAnalyzerResultInbox needs ParseError status and ErrorMessage property, so I'll update that entity.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  ReadFile src\...\LabAnalyzerResultInbox.cs                                                                                                              │
│                                                                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ Got LabAnalyzerResultInbox.cs. Adding ErrorMessage.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  Edit src\...\LabAnalyzerResultInbox.cs:         [MaxLength(500)]... =>         [MaxLength(500)]...                                                      │
│                                                                                                                                                            │
│ 49                                                                                                                                                         │
│ 50           [MaxLength(500)]                                                                                                                              │
│ 51           public string? ReviewNote { get; set; }                                                                                                       │
│ 52 +                                                                                                                                                       │
│ 53 +         [MaxLength(1000)] // Store detailed error message                                                                                             │
│ 54 +         public string? ErrorMessage { get; set; }                                                                                                     │
│ 55       }                                                                                                                                                 │
│ 56   }                                                                                                                                                     │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ LabAnalyzerResultInbox.cs and LabAnalyzerResultStatus.cs are updated. Now, I'll add the raw message ingest endpoint to LabAnalyzerResultsController.cs.     
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  ReadFile ...\LabAnalyzerResultsController.cs                                                                                                            │
│                                                                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ Right, I'll add the raw message ingest endpoint to LabAnalyzerResultsController.cs and inject IAnalyzerProtocolParserFactory.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  Edit ...\LabAnalyzerResultsController.cs: using System;... => using System;...                                                                          │
│                                                                                                                                                            │
│  6   using Microsoft.AspNetCore.Mvc;                                                                                                                       │
│  7   using SynOS.Models.DTOs.LabAnalyzers;                                                                                                                 │
│  8   using SynOS.Services;                                                                                                                                 │
│  9 + using SynOS.Services.AnalyzerIntegration; // New                                                                                                      │
│ 10                                                                                                                                                         │
│ 11   namespace SynOS.Api.Controllers.Lab                                                                                                                   │
│ 12   {                                                                                                                                                     │
│ 16       public class LabAnalyzerResultsController : ControllerBase                                                                                        │
│ 17       {                                                                                                                                                 │
│ 18           private readonly ILabAnalyzerService _labAnalyzerService;                                                                                     │
│ 18 -         private readonly IAnalyzerResultMatcherService _analyzerResultMatcherService; // New                                                          │
│ 19 +         private readonly IAnalyzerResultMatcherService _analyzerResultMatcherService;                                                                 │
│ 20 +         private readonly IAnalyzerProtocolParserFactory _parserFactory; // New                                                                        │
│ 21           private readonly IMapper _mapper;                                                                                                             │
│ 22                                                                                                                                                         │
│ 21 -         public LabAnalyzerResultsController(ILabAnalyzerService labAnalyzerService, IAnalyzerResultMatcherService analyzerResultMatcherService,       │
│    IMapper mapper)                                                                                                                                         │
│ 23 +         public LabAnalyzerResultsController(                                                                                                          │
│ 24 +             ILabAnalyzerService labAnalyzerService,                                                                                                   │
│ 25 +             IAnalyzerResultMatcherService analyzerResultMatcherService,                                                                               │
│ 26 +             IAnalyzerProtocolParserFactory parserFactory, // New                                                                                      │
│ 27 +             IMapper mapper)                                                                                                                           │
│ 28           {                                                                                                                                             │
│ 29               _labAnalyzerService = labAnalyzerService;                                                                                                 │
│ 30               _analyzerResultMatcherService = analyzerResultMatcherService;                                                                             │
│ 31 +             _parserFactory = parserFactory; // New                                                                                                    │
│ 32               _mapper = mapper;                                                                                                                         │
│ 33           }                                                                                                                                             │
│ 34                                                                                                                                                         │
│ ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ │
│ 42               return Ok(_mapper.Map<ManualResultEnqueueResponseDto>(inboxItem));                                                                        │
│ 43           }                                                                                                                                             │
│ 44                                                                                                                                                         │
│ 45 +         [HttpPost("raw")]                                                                                                                             │
│ 46 +         public async Task<ActionResult<ManualResultEnqueueResponseDto>> EnqueueRawResult(                                                             │
│ 47 +             Guid analyzerId,                                                                                                                          │
│ 48 +             [FromBody] RawMessageIngestDto dto)                                                                                                       │
│ 49 +         {                                                                                                                                             │
│ 50 +             var currentUserId = GetCurrentUserId(); // User initiating the raw ingest (e.g., admin testing)                                           │
│ 51 +             var analyzer = await _labAnalyzerService.GetAnalyzerAsync(analyzerId);                                                                    │
│ 52 +             if (analyzer == null)                                                                                                                     │
│ 53 +             {                                                                                                                                         │
│ 54 +                 return NotFound($"Analyzer with ID {analyzerId} not found.");                                                                         │
│ 55 +             }                                                                                                                                         │
│ 56 +                                                                                                                                                       │
│ 57 +             // Get parser based on protocol from DTO                                                                                                  │
│ 58 +             var parser = _parserFactory.GetParser(dto.Protocol);                                                                                      │
│ 59 +             var parsedResult = parser.Parse(dto.RawMessage);                                                                                          │
│ 60 +             parsedResult.AnalyzerId = analyzerId; // Set analyzer ID                                                                                  │
│ 61 +                                                                                                                                                       │
│ 62 +             if (!string.IsNullOrEmpty(parsedResult.ErrorMessage))                                                                                     │
│ 63 +             {                                                                                                                                         │
│ 64 +                 // If parsing failed, enqueue with ParseError status                                                                                  │
│ 65 +                 var errorDto = new ManualAnalyzerResultDto                                                                                            │
│ 66 +                 {                                                                                                                                     │
│ 67 +                     RawMessage = parsedResult.RawMessage,                                                                                             │
│ 68 +                     PatientIdentifier = parsedResult.PatientIdentifier, // Keep partial if available                                                  │
│ 69 +                     AnalyzerTestCode = parsedResult.AnalyzerTestCode,                                                                                 │
│ 70 +                     ResultValue = parsedResult.Value,                                                                                                 │
│ 71 +                     Units = parsedResult.Units,                                                                                                       │
│ 72 +                     Flags = parsedResult.Flags,                                                                                                       │
│ 73 +                     MeasuredAt = DateTimeOffset.UtcNow // Use current time as fallback                                                                │
│ 74 +                 };                                                                                                                                    │
│ 75 +                 var errorInboxItem = await _labAnalyzerService.EnqueueManualResultAsync(analyzerId, errorDto, currentUserId,                          │
│    LabAnalyzerResultStatus.ParseError, parsedResult.ErrorMessage);                                                                                         │
│ 76 +                 return BadRequest(_mapper.Map<ManualResultEnqueueResponseDto>(errorInboxItem));                                                       │
│ 77 +             }                                                                                                                                         │
│ 78 +                                                                                                                                                       │
│ 79 +             // If parsing successful, enqueue as Pending                                                                                              │
│ 80 +             var manualResultDto = new ManualAnalyzerResultDto                                                                                         │
│ 81 +             {                                                                                                                                         │
│ 82 +                 RawMessage = parsedResult.RawMessage,                                                                                                 │
│ 83 +                 PatientIdentifier = parsedResult.PatientIdentifier,                                                                                   │
│ 84 +                 AnalyzerTestCode = parsedResult.AnalyzerTestCode,                                                                                     │
│ 85 +                 ResultValue = parsedResult.Value,                                                                                                     │
│ 86 +                 Units = parsedResult.Units,                                                                                                           │
│ 87 +                 Flags = parsedResult.Flags,                                                                                                           │
│ 88 +                 MeasuredAt = DateTimeOffset.UtcNow // Assuming measurement time is now if not in parsed result                                        │
│ 89 +             };                                                                                                                                        │
│ 90 +                                                                                                                                                       │
│ 91 +             var inboxItem = await _labAnalyzerService.EnqueueManualResultAsync(analyzerId, manualResultDto, currentUserId);                           │
│ 92 +             return Ok(_mapper.Map<ManualResultEnqueueResponseDto>(inboxItem));                                                                        │
│ 93 +         }                                                                                                                                             │
│ 94 +                                                                                                                                                       │
│ 95           [HttpGet("inbox")]                                                                                                                            │
│ 96           [Authorize(Roles = "Admin,LabTech,Pathologist")] // Debug/testing endpoint                                                                    │
│ 97           public async Task<ActionResult<IReadOnlyList<ManualResultEnqueueResponseDto>>> GetInboxItems(Guid analyzerId, [FromQuery] int limit = 50)     │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ Updated LabAnalyzerResultsController.cs and introduced statusOverride and errorMessage parameters in ILabAnalyzerService and LabAnalyzerService to handle   
  parsing errors. Now modifying those service files.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  ReadFile src\...\ILabAnalyzerService.cs                                                                                                                 │
│                                                                                                                                                            │
│                                                                                                                                                            │
│ ✓  ReadFile src\...\LabAnalyzerService.cs                                                                                                                  │
│                                                                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ Got ILabAnalyzerService.cs and LabAnalyzerService.cs. Modifying EnqueueManualResultAsync in both to accept statusOverride and errorMessage.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  Edit src\...\ILabAnalyzerService.cs:         Task<LabAnalyzerResult... =>         Task<LabAnalyzerResult...                                             │
│                                                                                                                                                            │
│ 12   Task<LabAnalyzer> UpdateAnalyzerAsync(Guid analyzerId, UpdateLabAnalyzerDto dto, Guid currentUserId);                                                 │
│ 13   Task<LabAnalyzer?> GetAnalyzerAsync(Guid analyzerId);                                                                                                 │
│ 14   Task<IReadOnlyList<LabAnalyzer>> GetAnalyzersAsync();                                                                                                 │
│ 15 - Task<LabAnalyzerResultInbox> EnqueueManualResultAsync(Guid analyzerId, ManualAnalyzerResultDto dto, Guid currentUserId);                              │
│ 15 + Task<LabAnalyzerResultInbox> EnqueueManualResultAsync(Guid analyzerId, ManualAnalyzerResultDto dto, Guid currentUserId, string? statusOverride = null │
│    , string? errorMessage = null);                                                                                                                         │
│ 16                                                                                                                                                         │
│ 17   // Optional: Get inbox items (for debugging/testing as per prompt)                                                                                    │
│ 18   Task<IReadOnlyList<LabAnalyzerResultInbox>> GetInboxItemsAsync(Guid analyzerId, int limit = 50);                                                      │
│                                                                                                                                                            │
│ ✓  Edit src\...\LabAnalyzerService.cs:         public async Task<LabA... =>         public async Task<LabA...                                              │
│                                                                                                                                                            │
│  78       return await _context.LabAnalyzers.AsNoTracking().ToListAsync();                                                                                 │
│  79   }                                                                                                                                                    │
│  80                                                                                                                                                        │
│  81 - public async Task<LabAnalyzerResultInbox> EnqueueManualResultAsync(Guid analyzerId, ManualAnalyzerResultDto dto, Guid currentUserId)                 │
│  81 + public async Task<LabAnalyzerResultInbox> EnqueueManualResultAsync(Guid analyzerId, ManualAnalyzerResultDto dto, Guid currentUserId, string?         │
│     statusOverride = null, string? errorMessage = null)                                                                                                    │
│  82   {                                                                                                                                                    │
│  83       var analyzer = await _context.LabAnalyzers.FindAsync(analyzerId);                                                                                │
│  84       if (analyzer == null)                                                                                                                            │
│ ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ │
│ 102           Units = dto.Units,                                                                                                                           │
│ 103           Flags = dto.Flags,                                                                                                                           │
│ 104           MeasuredAt = dto.MeasuredAt,                                                                                                                 │
│ 105 -         Status = "Pending", // As per prompt                                                                                                         │
│ 105 +         Status = statusOverride ?? LabAnalyzerResultStatus.Pending, // Use override or default to Pending                                            │
│ 106 +         ErrorMessage = errorMessage, // Set error message if provided                                                                                │
│ 107           ReceivedAt = DateTimeOffset.UtcNow,                                                                                                          │
│ 108           ReceivedBy = currentUserId,                                                                                                                  │
│ 109           CreatedAt = DateTimeOffset.UtcNow,                                                                                                           │
│ 113       _context.LabAnalyzerResultInbox.Add(inboxItem);                                                                                                  │
│ 114       await _context.SaveChangesAsync();                                                                                                               │
│ 115                                                                                                                                                        │
│ 115 -     _logger.LogInformation("Manual result enqueued for Analyzer {AnalyzerId}: Patient {PatientIdentifier}, Test {TestCode}",                         │
│ 116 -                            analyzerId, dto.PatientIdentifier, dto.AnalyzerTestCode);                                                                 │
│ 116 +     _logger.LogInformation("Manual result enqueued for Analyzer {AnalyzerId} with status {Status}. Patient: {PatientIdentifier}, Test: {TestCode}",  │
│ 117 +                            analyzerId, inboxItem.Status, dto.PatientIdentifier, dto.AnalyzerTestCode);                                               │
│ 118       return inboxItem;                                                                                                                                │
│ 119   }                                                                                                                                                    │
│ 120                                                                                                                                                        │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ Updated ILabAnalyzerService and LabAnalyzerService with new parameters. Next, I'll update LabAnalyzerResultStatus to include ParseError.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  ReadFile src\...\LabAnalyzerResultStatus.cs                                                                                                             │
│                                                                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ Got LabAnalyzerResultStatus.cs. Adding ParseError.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  Edit src\...\LabAnalyzerResultStatus.cs:         public const string Im... =>         public const string Im...                                         │
│                                                                                                                                                            │
│  6           public const string Matched = "Matched";                                                                                                      │
│  7           public const string Rejected = "Rejected"; // For future use                                                                                  │
│  8           public const string Imported = "Imported"; // For future use                                                                                  │
│  9 +         public const string ParseError = "ParseError";                                                                                                │
│ 10       }                                                                                                                                                 │
│ 11   }                                                                                                                                                     │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ LabAnalyzerResultStatus is updated. Now, I'm setting up DI for the parser factory and parsers in Program.cs, and registering AnalyzerTcpListenerService as a
  hosted service.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  ReadFile src\SynOS.Api\Program.cs                                                                                                                       │
│                                                                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ I'll modify src/SynOS.Api/Program.cs to import Analyzer Integration namespaces, bind AnalyzerIntegrationSettings from appsettings.json, register
  AstmProtocolParser and Hl7ProtocolParser as transient services, IAnalyzerProtocolParserFactory and AnalyzerProtocolParserFactory as scoped services, and    
  finally, register AnalyzerTcpListenerService as a hosted service.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  Edit src\SynOS.Api\Program.cs: using SynOS.Models.Configurati... => using SynOS.Models.Configurati...                                                   │
│                                                                                                                                                            │
│ 21   using SynOS.Services.Stubs;                                                                                                                           │
│ 22   using SynOS.Models.Configuration;                                                                                                                     │
│ 23   using SynOS.Services.Security;                                                                                                                        │
│ 24 + using SynOS.Services.AnalyzerIntegration; // New                                                                                                      │
│ 25                                                                                                                                                         │
│ 26   var builder = WebApplication.CreateBuilder(args);                                                                                                     │
│ 27                                                                                                                                                         │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ Okay, SynOS.Services.AnalyzerIntegration is imported. Next, I'll register services and configure AnalyzerIntegrationSettings.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  Edit src\SynOS.Api\Program.cs: builder.Services.AddScoped<IAn... => builder.Services.AddScoped<IAn...                                                   │
│                                                                                                                                                            │
│ 153   builder.Services.AddScoped<IAnalyzerResultMatcherService, AnalyzerResultMatcherService>(); // New Analyzer Result Matcher Service                    │
│ 154   builder.Services.AddSingleton<IFileStorageService, LocalStorageService>();                                                                           │
│ 155                                                                                                                                                        │
│ 156 + // Register AnalyzerIntegration services                                                                                                             │
│ 157 + builder.Services.AddTransient<AstmProtocolParser>();                                                                                                 │
│ 158 + builder.Services.AddTransient<Hl7ProtocolParser>();                                                                                                  │
│ 159 + builder.Services.AddScoped<IAnalyzerProtocolParserFactory, AnalyzerProtocolParserFactory>();                                                         │
│ 160 +                                                                                                                                                      │
│ 161   // Configure settings                                                                                                                                │
│ 162   builder.Services.Configure<PacsSettings>(builder.Configuration.GetSection("Pacs"));                                                                  │
│ 163 + builder.Services.Configure<AnalyzerIntegrationSettings>(builder.Configuration.GetSection("AnalyzerIntegration")); // New                             │
│ 164                                                                                                                                                        │
│ 165   // Register Delivery Module Services                                                                                                                 │
│ 166   builder.Services.AddScoped<IDeliveryService, DeliveryService>();                                                                                     │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ Okay, registering AnalyzerTcpListenerService now.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  Edit src\SynOS.Api\Program.cs: builder.Services.AddHostedServ... => builder.Services.AddHostedServ...                                                   │
│                                                                                                                                                            │
│ 171                                                                                                                                                        │
│ 172   builder.Services.AddHostedService<NotificationWorkerService>();                                                                                      │
│ 173   builder.Services.AddHostedService<ExpiredLockCleanupService>();                                                                                      │
│ 174 + builder.Services.AddHostedService<AnalyzerTcpListenerService>(); // New TCP Listener Hosted Service                                                  │
│ 175                                                                                                                                                        │
│ 176   // Add SignalR                                                                                                                                       │
│ 177   builder.Services.AddSignalR();                                                                                                                       │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ AnalyzerTcpListenerService is registered. Code's done. I'll recommend running dotnet ef migrations add AddErrorMessageToLabAnalyzerResultInbox -p
  src/SynOS.Data -s src/SynOS.Api and dotnet ef database update -p src/SynOS.Data -s src/SynOS.Api to update the LabAnalyzerResultInbox entity for the new    
  ErrorMessage column. Now for the TLDR.
   1 {"todos":[{"description":"Create directory src/SynOS.Services/AnalyzerIntegration","status":"completed"},{"description":"Create IAnalyzerProtocolParser.c
     ,"status":"completed"},{"description":"Create AnalyzerParsedResult.cs","status":"completed"},{"description":"Implement AstmProtocolParser.cs","status":  
     "completed"},{"
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  WriteTodos Set 16 todo(s)                                                                                                                               │
│                                                                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ TLDR: Day 14.9 implemented the backend for ASTM/HL7 parsing and simulated analyzer stream. This included creating IAnalyzerProtocolParser and its
  implementations (AstmProtocolParser, Hl7ProtocolParser), a factory (IAnalyzerProtocolParserFactory) to select parsers, and a hosted TCP listener service    
  (AnalyzerTcpListenerService) for receiving data. An HTTP fallback endpoint (/api/v1/lab/analyzers/{analyzerId}/results/raw) was added for testing. The      
  LabAnalyzerResultInbox entity was updated with an ErrorMessage field and a ParseError status to handle parsing failures.

  Main files added/changed:
   * Added src/SynOS.Services/AnalyzerIntegration/IAnalyzerProtocolParser.cs
   * Added src/SynOS.Services/AnalyzerIntegration/AnalyzerParsedResult.cs
   * Added src/SynOS.Services/AnalyzerIntegration/AstmProtocolParser.cs
   * Added src/SynOS.Services/AnalyzerIntegration/Hl7ProtocolParser.cs
   * Added src/SynOS.Services/AnalyzerIntegration/IAnalyzerProtocolParserFactory.cs
   * Added src/SynOS.Services/AnalyzerIntegration/AnalyzerProtocolParserFactory.cs
   * Added src/SynOS.Models/Configuration/AnalyzerIntegrationSettings.cs
   * Added src/SynOS.Models/DTOs/LabAnalyzers/RawMessageIngestDto.cs
   * Added src/SynOS.Api/BackgroundServices/AnalyzerTcpListenerService.cs
   * Modified src/SynOS.Models/Entities/LabAnalyzerResultInbox.cs (Added ErrorMessage property)
   * Modified src/SynOS.Models/Enums/LabAnalyzerResultStatus.cs (Added ParseError status)
   * Modified src/SynOS.Services/ILabAnalyzerService.cs (Updated EnqueueManualResultAsync signature)
   * Modified src/SynOS.Services/LabAnalyzerService.cs (Updated EnqueueManualResultAsync implementation)
   * Modified src/SynOS.Api/Controllers/Lab/LabAnalyzerResultsController.cs (Added /raw endpoint, injected parser factory)
   * Modified src/SynOS.Api/Program.cs (DI registrations for parsers, factory, hosted service, and configuration)

  Manual steps for the human developer:
   1. Add AnalyzerIntegration section to your appsettings.json (or appsettings.Development.json) for the TCP listener, for example:

    1     "AnalyzerIntegration": {
    2       "Listeners": [
    3         {
    4           "AnalyzerId": "YOUR_ANALYZER_GUID_HERE",
    5           "Protocol": "ASTM",
    6           "Port": 5500
    7         },
    8         {
    9           "AnalyzerId": "ANOTHER_ANALYZER_GUID",
   10           "Protocol": "HL7",
   11           "Port": 5501
   12         }
   13       ]
   14     }
      Replace `YOUR_ANALYZER_GUID_HERE` and `ANOTHER_ANALYZER_GUID` with actual Analyzer IDs created in Day 14.7.
   2. Run the following commands from the project root to create and apply the EF Core migration for the new ErrorMessage column:

   1     dotnet ef migrations add AddErrorMessageToLabAnalyzerResultInbox -p src/SynOS.Data -s src/SynOS.Api
   2     dotnet ef database update -p src/SynOS.Data -s src/SynOS.Api
   3. Restart the backend application to ensure the hosted service picks up the configuration and starts listening.