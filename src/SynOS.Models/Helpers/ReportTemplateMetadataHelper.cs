using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using SynOS.Models.DTOs.ReportTemplateDsl;

namespace SynOS.Models.Helpers
{
    public class SnapshotMetadataDto
    {
        public List<string>? VisibleColumns { get; set; }
        public List<int>? ColumnWeights { get; set; }
    }

    public static class ReportTemplateMetadataHelper
    {
        public static string? DeriveSnapshotMetadataJson(string? templateJson)
        {
            if (string.IsNullOrWhiteSpace(templateJson))
            {
                return null;
            }

            try
            {
                var templateModel = JsonSerializer.Deserialize<TemplateModel>(templateJson);
                var parameterTableSection = templateModel?.Sections
                    ?.FirstOrDefault(s => string.Equals(s.Type, "ParameterTable", StringComparison.OrdinalIgnoreCase));

                ParameterTableConfig? tableConfig = null;
                if (parameterTableSection != null && parameterTableSection.Config.ValueKind != JsonValueKind.Undefined && parameterTableSection.Config.ValueKind != JsonValueKind.Null)
                {
                    try
                    {
                        tableConfig = JsonSerializer.Deserialize<ParameterTableConfig>(parameterTableSection.Config.GetRawText());
                    }
                    catch { }
                }

                var dto = new SnapshotMetadataDto
                {
                    VisibleColumns = (tableConfig != null && tableConfig.VisibleColumns != null && tableConfig.VisibleColumns.Any())
                        ? tableConfig.VisibleColumns
                        : new List<string> { "Parameter", "Value", "Unit", "ReferenceRange" },
                    ColumnWeights = (tableConfig != null && tableConfig.ColumnWeights != null && tableConfig.ColumnWeights.Any())
                        ? tableConfig.ColumnWeights
                        : new List<int> { 4, 2, 2, 3 }
                };

                return JsonSerializer.Serialize(dto);
            }
            catch
            {
                return JsonSerializer.Serialize(new SnapshotMetadataDto
                {
                    VisibleColumns = new List<string> { "Parameter", "Value", "Unit", "ReferenceRange" },
                    ColumnWeights = new List<int> { 4, 2, 2, 3 }
                });
            }
        }
    }
}
