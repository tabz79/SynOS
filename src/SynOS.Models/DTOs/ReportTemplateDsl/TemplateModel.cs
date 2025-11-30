using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SynOS.Models.DTOs.ReportTemplateDsl
{
    public class TemplateModel
    {
        [JsonPropertyName("meta")]
        public TemplateMeta Meta { get; set; } = new();

        [JsonPropertyName("sections")]
        public List<TemplateSection> Sections { get; set; } = new();
    }

    public class TemplateMeta
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("modality")]
        public string Modality { get; set; } = string.Empty;

        [JsonPropertyName("layout")]
        public string Layout { get; set; } = string.Empty;

        [JsonPropertyName("pageSize")]
        public string PageSize { get; set; } = string.Empty;

        [JsonPropertyName("orientation")]
        public string Orientation { get; set; } = string.Empty;
    }

    public class TemplateSection
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;

        [JsonPropertyName("config")]
        public JsonElement Config { get; set; }
    }
}
