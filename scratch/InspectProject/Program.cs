using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.ReportTemplateDsl;

namespace SynOS.Scratch
{
    class Program
    {
        static void Main(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<SynOSDbContext>();
            optionsBuilder.UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;MultipleActiveResultSets=true");

            using var context = new SynOSDbContext(optionsBuilder.Options);

            var reportId = Guid.Parse("ABEBD532-3CEC-42C6-AD9D-F8C1B940D67B");
            Console.WriteLine($"Inspecting report {reportId}...");

            var report = context.Reports.FirstOrDefault(r => r.ReportId == reportId);
            if (report == null)
            {
                Console.WriteLine("Report not found!");
                return;
            }

            var order = context.Orders.FirstOrDefault(o => o.OrderId == report.SourceId);
            if (order == null)
            {
                Console.WriteLine("Order not found!");
                return;
            }

            Console.WriteLine($"Order Department/Modality: '{order.Department}'");

            var template = context.ReportTemplates.FirstOrDefault(t => t.Modality == order.Department && t.IsDefault)
                        ?? context.ReportTemplates.FirstOrDefault(t => t.IsDefault);

            if (template == null)
            {
                Console.WriteLine("No default template found in database!");
                return;
            }

            Console.WriteLine($"Matched Template ID: {template.TemplateId}");
            Console.WriteLine($"Matched Template Modality: '{template.Modality}'");
            Console.WriteLine($"Matched Template Name: '{template.Name}'");
            Console.WriteLine("Template JSON:");
            Console.WriteLine(template.TemplateJson);
            Console.WriteLine("--------------------------------------------------");

            try
            {
                var templateModel = JsonSerializer.Deserialize<TemplateModel>(template.TemplateJson);
                Console.WriteLine($"Successfully deserialized TemplateModel. Sections count: {templateModel?.Sections?.Count ?? 0}");
                if (templateModel?.Sections != null)
                {
                    foreach (var section in templateModel.Sections)
                    {
                        Console.WriteLine($"Section Type: '{section.Type}'");
                        Console.WriteLine($"  - Config ValueKind: {(section.Config.ValueKind == JsonValueKind.Undefined ? "Undefined" : section.Config.ValueKind.ToString())}");
                        Console.WriteLine($"  - ExtensionData keys: {(section.ExtensionData != null ? string.Join(", ", section.ExtensionData.Keys) : "null")}");

                        try
                        {
                            var config = DeserializeConfig<object>(section);
                            Console.WriteLine($"    -> Deserialized successfully to object.");
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"    -> Deserialization failed: {ex.Message}");
                            Console.WriteLine(ex.StackTrace);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to parse or inspect template: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
            }
        }

        private static T? DeserializeConfig<T>(TemplateSection section)
        {
            try
            {
                if (section.Config.ValueKind != JsonValueKind.Undefined && section.Config.ValueKind != JsonValueKind.Null)
                {
                    return section.Config.Deserialize<T>();
                }
            }
            catch (InvalidOperationException ex)
            {
                Console.WriteLine($"      [ValueKind check failed with InvalidOperationException: {ex.Message}]");
            }

            if (section.ExtensionData != null && section.ExtensionData.Any())
            {
                var json = JsonSerializer.Serialize(section.ExtensionData);
                return JsonSerializer.Deserialize<T>(json);
            }

            return JsonSerializer.Deserialize<T>("{}");
        }
    }
}
