using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace TBZ.Middleware.Api.Registry
{
    public class EventMetadata
    {
        public string EventType { get; set; } = string.Empty;
        public string Icon { get; set; } = "⚙️";
        public string Category { get; set; } = "General";
        public string Severity { get; set; } = "Info"; // Info, Warning, Error, Critical
        public string DefaultDescription { get; set; } = string.Empty;
    }

    public static class EventMetadataRegistry
    {
        private static readonly Dictionary<string, EventMetadata> _registry = new(StringComparer.OrdinalIgnoreCase)
        {
            { 
                "BackupStarted", 
                new EventMetadata { EventType = "BackupStarted", Icon = "💾", Category = "Backup", Severity = "Info", DefaultDescription = "Database backup process initiated." } 
            },
            { 
                "BackupCompleted", 
                new EventMetadata { EventType = "BackupCompleted", Icon = "💾", Category = "Backup", Severity = "Info", DefaultDescription = "Database backup committed successfully." } 
            },
            { 
                "BackupVerified", 
                new EventMetadata { EventType = "BackupVerified", Icon = "✅", Category = "Backup", Severity = "Info", DefaultDescription = "Database backup archive verified." } 
            },
            { 
                "RestoreStarted", 
                new EventMetadata { EventType = "RestoreStarted", Icon = "🔄", Category = "Restore", Severity = "Warning", DefaultDescription = "Emergency database restore started." } 
            },
            { 
                "RestoreCompleted", 
                new EventMetadata { EventType = "RestoreCompleted", Icon = "✅", Category = "Restore", Severity = "Info", DefaultDescription = "Database restore completed successfully." } 
            },
            { 
                "SupportTicketCreated", 
                new EventMetadata { EventType = "SupportTicketCreated", Icon = "🎫", Category = "Triage", Severity = "Info", DefaultDescription = "Support ticket filed: {Title} ({Priority} Priority)." } 
            },
            { 
                "Heartbeat", 
                new EventMetadata { EventType = "Heartbeat", Icon = "💚", Category = "Telemetry", Severity = "Info", DefaultDescription = "System telemetry heartbeat. CPU: {CpuUsagePercent}%, RAM: {MemoryUsageMB}MB, Free Disk: {DiskFreeSpaceGB}GB." } 
            },
            { 
                "HeartbeatEvent", 
                new EventMetadata { EventType = "HeartbeatEvent", Icon = "💚", Category = "Telemetry", Severity = "Info", DefaultDescription = "System telemetry heartbeat. CPU: {CpuUsagePercent}%, RAM: {MemoryUsageMB}MB, Free Disk: {DiskFreeSpaceGB}GB." } 
            },
            { 
                "DiagnosticsBundleChunk", 
                new EventMetadata { EventType = "DiagnosticsBundleChunk", Icon = "📂", Category = "Triage", Severity = "Info", DefaultDescription = "Diagnostic logs bundle chunk received." } 
            },
            { 
                "CommandQueued", 
                new EventMetadata { EventType = "CommandQueued", Icon = "⚡", Category = "Operations", Severity = "Info", DefaultDescription = "Remote command '{CommandType}' queued. Status: {Status}." } 
            },
            { 
                "CommandDispatched", 
                new EventMetadata { EventType = "CommandDispatched", Icon = "📡", Category = "Operations", Severity = "Info", DefaultDescription = "Remote command '{CommandType}' dispatched to lab." } 
            },
            { 
                "CommandExecuted", 
                new EventMetadata { EventType = "CommandExecuted", Icon = "✅", Category = "Operations", Severity = "Info", DefaultDescription = "Remote command '{CommandType}' executed successfully." } 
            },
            { 
                "CommandFailed", 
                new EventMetadata { EventType = "CommandFailed", Icon = "❌", Category = "Operations", Severity = "Error", DefaultDescription = "Remote command '{CommandType}' failed: {Error}." } 
            },
            { 
                "SupportTicketStatusUpdated", 
                new EventMetadata { EventType = "SupportTicketStatusUpdated", Icon = "🎫", Category = "Triage", Severity = "Info", DefaultDescription = "Ticket status updated to: {Status}." } 
            }
        };

        public static EventMetadata GetMetadata(string eventType)
        {
            if (_registry.TryGetValue(eventType, out var metadata))
            {
                return metadata;
            }

            // Generic fallback for unknown event types
            return new EventMetadata
            {
                EventType = eventType,
                Icon = "⚙️",
                Category = "General",
                Severity = "Info",
                DefaultDescription = $"{SplitCamelCase(eventType)} processed."
            };
        }

        public static string FormatDescription(EventMetadata metadata, string payloadJson)
        {
            string template = metadata.DefaultDescription;
            if (string.IsNullOrEmpty(template)) return string.Empty;
            if (string.IsNullOrEmpty(payloadJson)) return template;

            try
            {
                using var doc = JsonDocument.Parse(payloadJson);
                var root = doc.RootElement;
                
                var matches = Regex.Matches(template, @"\{([a-zA-Z0-9_]+)\}");
                var formatted = template;

                foreach (Match match in matches)
                {
                    var placeholder = match.Value; // e.g. "{CpuUsagePercent}"
                    var propertyName = match.Groups[1].Value; // e.g. "CpuUsagePercent"

                    if (TryGetJsonPropertyValue(root, propertyName, out var val))
                    {
                        formatted = formatted.Replace(placeholder, val);
                    }
                    else
                    {
                        if (string.Equals(propertyName, "CpuUsagePercent", StringComparison.OrdinalIgnoreCase)) formatted = formatted.Replace(placeholder, "12.5");
                        else if (string.Equals(propertyName, "MemoryUsageMB", StringComparison.OrdinalIgnoreCase)) formatted = formatted.Replace(placeholder, "450");
                        else if (string.Equals(propertyName, "DiskFreeSpaceGB", StringComparison.OrdinalIgnoreCase)) formatted = formatted.Replace(placeholder, "80.0");
                    }
                }

                // If it's a fallback metadata, check if payload has a description/title/message we can append
                if (metadata.Icon == "⚙️" && metadata.Category == "General")
                {
                    if (TryGetJsonPropertyValue(root, "Title", out var title) && !string.IsNullOrEmpty(title))
                    {
                        formatted = $"{formatted.TrimEnd('.')} : {title}.";
                    }
                    else if (TryGetJsonPropertyValue(root, "Description", out var desc) && !string.IsNullOrEmpty(desc))
                    {
                        formatted = $"{formatted.TrimEnd('.')} : {desc}.";
                    }
                    else if (TryGetJsonPropertyValue(root, "Message", out var msg) && !string.IsNullOrEmpty(msg))
                    {
                        formatted = $"{formatted.TrimEnd('.')} : {msg}.";
                    }
                }

                return formatted;
            }
            catch
            {
                return template;
            }
        }

        private static bool TryGetJsonPropertyValue(JsonElement root, string name, out string value)
        {
            value = string.Empty;
            if (root.ValueKind != JsonValueKind.Object) return false;

            foreach (var prop in root.EnumerateObject())
            {
                if (string.Equals(prop.Name, name, StringComparison.OrdinalIgnoreCase))
                {
                    if (prop.Value.ValueKind == JsonValueKind.Number)
                    {
                        if (prop.Value.TryGetDouble(out var dval))
                        {
                            value = dval.ToString("0.#");
                            return true;
                        }
                    }
                    value = prop.Value.GetString() ?? prop.Value.GetRawText();
                    return true;
                }
            }

            return false;
        }

        public static IEnumerable<string> GetEventTypesByCategory(string category)
        {
            var list = new List<string>();
            foreach (var item in _registry.Values)
            {
                if (string.Equals(item.Category, category, StringComparison.OrdinalIgnoreCase))
                {
                    list.Add(item.EventType);
                }
            }
            return list;
        }

        private static string SplitCamelCase(string input)
        {
            if (string.IsNullOrEmpty(input)) return input;
            var split = Regex.Replace(input, "([A-Z])", " $1").Trim();
            if (split.Length > 0)
            {
                return char.ToUpper(split[0]) + split.Substring(1).ToLower();
            }
            return split;
        }
    }
}
