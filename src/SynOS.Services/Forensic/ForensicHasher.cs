using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace SynOS.Services.Forensic
{
    /// <summary>
    /// GPT-5 Rule: Indestructible Forensic Data Hasher (V3 Spec)
    /// Guarantees clinical truth through deterministic canonical JSON payloads.
    /// </summary>
    public static class ForensicHasher
    {
        public static string GenerateHash(ForensicPayload payload)
        {
            var canonicalJson = ToCanonicalJson(payload);
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(canonicalJson));
            return Convert.ToHexString(bytes).ToLowerInvariant();
        }

        private static string ToCanonicalJson(object obj)
        {
            var options = new JsonSerializerOptions
            {
                WriteIndented = false,
                DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.Never
            };

            // Recursively convert everything to SortedDictionary to force key order
            var sortedObj = PrepareForCanonicalization(obj);
            return JsonSerializer.Serialize(sortedObj, options);
        }

        private static object? PrepareForCanonicalization(object? obj)
        {
            if (obj == null) return null;

            var type = obj.GetType();

            if (type.IsPrimitive || obj is string || obj is Guid || obj is DateTimeOffset || obj is DateTime || obj is decimal)
            {
                return obj;
            }

            if (obj is System.Collections.IEnumerable enumerable)
            {
                var list = new List<object?>();
                foreach (var item in enumerable)
                {
                    list.Add(PrepareForCanonicalization(item));
                }
                return list;
            }

            var sortedDict = new SortedDictionary<string, object?>(StringComparer.Ordinal);
            var properties = type.GetProperties();

            foreach (var prop in properties)
            {
                var value = prop.GetValue(obj);
                sortedDict[prop.Name] = PrepareForCanonicalization(value);
            }

            return sortedDict;
        }

        public static string NormalizeText(string? text)
        {
            if (string.IsNullOrWhiteSpace(text)) return "<<EMPTY>>";
            // GPT-5 Normalization: Trim + Collapse Spaces + \n only
            var normalized = text.Trim().Replace("\r\n", "\n").Replace("\r", "\n");
            return Regex.Replace(normalized, @"[ \t]+", " ");
        }
    }

    public class ForensicPayload
    {
        public AncillaryData Ancillary { get; set; } = new();
        public DiagnosticData Diagnostics { get; set; } = new();
        public LineageData Lineage { get; set; } = new();
        public List<ForensicResult> Results { get; set; } = new();
    }

    public class AncillaryData
    {
        public string LabId { get; set; } = string.Empty;
        public string Mrn { get; set; } = string.Empty;
        public string PatientId { get; set; } = string.Empty;
    }

    public class DiagnosticData
    {
        public string Interpretation { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
    }

    public class LineageData
    {
        public int ReportVersion { get; set; }
    }

    public class ForensicResult
    {
        public string ResultId { get; set; } = string.Empty;
        public string TestCode { get; set; } = string.Empty;
        public string ParameterCode { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty; // Strict Byte Truth
        public string Unit { get; set; } = string.Empty;
        public string Range { get; set; } = string.Empty;
        public string Flag { get; set; } = string.Empty;
        public string Method { get; set; } = string.Empty;
    }
}
