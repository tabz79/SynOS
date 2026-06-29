using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.RegularExpressions;
using TBZ.Middleware.Domain;

namespace TBZ.Middleware.Application.Core
{
    public class NotificationTemplateRenderer
    {
        public string RenderBody(string pattern, Dictionary<string, string> variables)
        {
            if (string.IsNullOrEmpty(pattern)) return string.Empty;

            var result = pattern;
            foreach (var kvp in variables)
            {
                result = Regex.Replace(result, "\\{" + Regex.Escape(kvp.Key) + "\\}", kvp.Value ?? string.Empty, RegexOptions.IgnoreCase);
            }
            return result;
        }

        public object[] MapPositionalParameters(NotificationTemplate template, Dictionary<string, string> variables)
        {
            if (template == null) return Array.Empty<object>();

            var mappingList = new List<string>();
            try
            {
                if (!string.IsNullOrEmpty(template.VariableMappingsJson))
                {
                    mappingList = JsonSerializer.Deserialize<List<string>>(template.VariableMappingsJson) ?? new List<string>();
                }
            }
            catch
            {
                // Fallback to empty mapping
            }

            var parameters = new List<object>();
            foreach (var variableName in mappingList)
            {
                if (variables.TryGetValue(variableName, out var val))
                {
                    parameters.Add(val ?? string.Empty);
                }
                else
                {
                    parameters.Add(string.Empty);
                }
            }

            return parameters.ToArray();
        }
    }
}
