using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SynOS.Models.DTOs.ReportTemplateDsl;
using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using QRCoder;

namespace SynOS.Services
{
    public class QuestPdfReportRenderer : IReportPdfRenderer
    {
        // ✅ Static ctor runs once per app lifetime and configures QuestPDF license.
        static QuestPdfReportRenderer()
        {
            QuestPDF.Settings.License = LicenseType.Community;
        }

        private T? DeserializeConfig<T>(TemplateSection section)
        {
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            if (section.Config.ValueKind != JsonValueKind.Undefined && section.Config.ValueKind != JsonValueKind.Null)
            {
                return JsonSerializer.Deserialize<T>(section.Config.GetRawText(), options);
            }

            if (section.ExtensionData != null && section.ExtensionData.Any())
            {
                var json = JsonSerializer.Serialize(section.ExtensionData);
                return JsonSerializer.Deserialize<T>(json, options);
            }

            return JsonSerializer.Deserialize<T>("{}", options);
        }

        public Task<byte[]> GeneratePdfAsync(ReportDataModel data, TemplateModel templateModel)
        {
            HeaderConfig? headerConfig = null;
            foreach (var section in templateModel.Sections)
            {
                if (section.Type == "Header")
                {
                    headerConfig = DeserializeConfig<HeaderConfig>(section);
                    break;
                }
            }

            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.DefaultTextStyle(x => x.FontSize(10));

                    // Dynamic Margins
                    float leftRightMargin = headerConfig?.LeftRightMargin ?? 12f;
                    float topMargin = headerConfig?.TopMargin ?? 12f;
                    float bottomMargin = headerConfig?.BottomMargin ?? 15f;

                    if (headerConfig?.UsePreprinted == true)
                    {
                        topMargin = headerConfig.TopMargin ?? 48f;
                    }

                    var patientInfoSectionForMargin = templateModel.Sections.FirstOrDefault(s => s.Type == "PatientInfo");
                    var isAbsoluteForMargin = false;
                    if (patientInfoSectionForMargin != null)
                    {
                        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                        var patientConfig = JsonSerializer.Deserialize<PatientInfoConfig>(
                            patientInfoSectionForMargin.Config.ValueKind != JsonValueKind.Undefined && patientInfoSectionForMargin.Config.ValueKind != JsonValueKind.Null
                                ? patientInfoSectionForMargin.Config.GetRawText() 
                                : "{}", 
                            options
                        );
                        isAbsoluteForMargin = patientConfig?.EnableAbsolutePositioning == true;
                    }

                    float pageMarginLeft = isAbsoluteForMargin ? 0f : leftRightMargin;
                    float pageMarginRight = isAbsoluteForMargin ? 0f : leftRightMargin;
                    float pageMarginTop = isAbsoluteForMargin ? 0f : topMargin;
                    float pageMarginBottom = isAbsoluteForMargin ? 0f : bottomMargin;

                    page.MarginLeft(pageMarginLeft, QuestPDF.Infrastructure.Unit.Millimetre);
                    page.MarginRight(pageMarginRight, QuestPDF.Infrastructure.Unit.Millimetre);
                    page.MarginTop(pageMarginTop, QuestPDF.Infrastructure.Unit.Millimetre);
                    page.MarginBottom(pageMarginBottom, QuestPDF.Infrastructure.Unit.Millimetre);

                    // Dynamic Background/Backdrop & Absolute Positioning Layers
                    page.Background().Layers(layers =>
                    {
                        // Layer 1: Canvas Background (Image or Solid Color)
                        layers.PrimaryLayer().Element(bgContainer =>
                        {
                            if (headerConfig?.BgType == "solid" && !string.IsNullOrWhiteSpace(headerConfig.BgColor))
                            {
                                bgContainer.Background(headerConfig.BgColor);
                            }
                            else if (headerConfig?.BgType == "image" && !string.IsNullOrWhiteSpace(headerConfig.BackgroundPath))
                            {
                                try
                                {
                                    var bgPath = headerConfig.BackgroundPath.Trim();
                                    byte[]? imageBytes = null;

                                    if (bgPath.StartsWith("data:image", StringComparison.OrdinalIgnoreCase) || (!bgPath.Contains("/") && !bgPath.Contains("\\") && bgPath.Length > 200))
                                    {
                                        var base64Data = bgPath;
                                        if (base64Data.Contains(","))
                                        {
                                            base64Data = base64Data.Split(',')[1];
                                        }
                                        imageBytes = Convert.FromBase64String(base64Data);
                                    }
                                    else
                                    {
                                        var basePath = "C:\\SynOS_Files";
                                        var wwwrootPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot");
                                        
                                        string fullPath = bgPath;
                                        if (!Path.IsPathRooted(fullPath))
                                        {
                                            if (File.Exists(Path.Combine(wwwrootPath, bgPath)))
                                            {
                                                fullPath = Path.Combine(wwwrootPath, bgPath);
                                            }
                                            else if (File.Exists(Path.Combine(basePath, bgPath)))
                                            {
                                                fullPath = Path.Combine(basePath, bgPath);
                                            }
                                        }

                                        if (File.Exists(fullPath))
                                        {
                                            imageBytes = File.ReadAllBytes(fullPath);
                                        }
                                    }

                                    if (imageBytes != null && imageBytes.Length > 0)
                                    {
                                        bgContainer.Image(imageBytes).FitArea();
                                    }
                                }
                                catch (Exception ex)
                                {
                                    // Fail-safe fallback if background image bytes are invalid
                                }
                            }
                        });

                        // Layer 2: Absolute positioned patient details (rendered directly on top of background image slots)
                        var patientInfoSection = templateModel.Sections.FirstOrDefault(s => s.Type == "PatientInfo");
                        if (patientInfoSection != null)
                        {
                            var patientConfig = DeserializeConfig<PatientInfoConfig>(patientInfoSection);
                            if (patientConfig?.EnableAbsolutePositioning == true)
                            {
                                float pY = patientConfig.PatientBlockY ?? 55f;
                                float nameX = patientConfig.PatientNameX ?? 15f;
                                float nameY = patientConfig.PatientNameY ?? pY;
                                
                                float ageSexX = patientConfig.PatientAgeSexX ?? 15f;
                                float ageSexY = patientConfig.PatientAgeSexY ?? (pY + 12f);
                                
                                float doctorX = patientConfig.RefDoctorX ?? 75f;
                                float doctorY = patientConfig.RefDoctorY ?? pY;
                                
                                float idX = patientConfig.PatientIdX ?? 75f;
                                float idY = patientConfig.PatientIdY ?? (pY + 12f);
                                
                                float billingDateX = patientConfig.BillingDateX ?? 135f;
                                float billingDateY = patientConfig.BillingDateY ?? pY;
                                
                                float reportDateX = patientConfig.ReportDateX ?? 135f;
                                float reportDateY = patientConfig.ReportDateY ?? (pY + 12f);

                                // 1. Patient Name
                                layers.Layer().PaddingLeft(nameX, QuestPDF.Infrastructure.Unit.Millimetre)
                                             .PaddingTop(nameY, QuestPDF.Infrastructure.Unit.Millimetre)
                                             .Text(data.Patient.Name).Bold().FontSize(9);

                                // 2. Age / Sex
                                var ageStr = "N/A";
                                if (!string.IsNullOrWhiteSpace(data.Patient.DateOfBirth))
                                {
                                    var dob = System.DateTime.TryParse(data.Patient.DateOfBirth, out var parsedDob) ? parsedDob : (System.DateTime?)null;
                                    if (dob.HasValue)
                                    {
                                        ageStr = $"{((System.DateTime.Today - dob.Value).TotalDays / 365.25):0} Yrs";
                                    }
                                }
                                layers.Layer().PaddingLeft(ageSexX, QuestPDF.Infrastructure.Unit.Millimetre)
                                             .PaddingTop(ageSexY, QuestPDF.Infrastructure.Unit.Millimetre)
                                             .Text($"{ageStr} / {data.Patient.Gender}").FontSize(8.5f);

                                // 3. Ref Doctor
                                layers.Layer().PaddingLeft(doctorX, QuestPDF.Infrastructure.Unit.Millimetre)
                                             .PaddingTop(doctorY, QuestPDF.Infrastructure.Unit.Millimetre)
                                             .Text(data.Metadata?.ReferenceDoctor ?? "Self / Walk-in").FontSize(8.5f);

                                // 4. Patient ID
                                layers.Layer().PaddingLeft(idX, QuestPDF.Infrastructure.Unit.Millimetre)
                                             .PaddingTop(idY, QuestPDF.Infrastructure.Unit.Millimetre)
                                             .Text(data.Patient.PatientId).FontSize(8.5f);

                                // 5. Billing Date
                                layers.Layer().PaddingLeft(billingDateX, QuestPDF.Infrastructure.Unit.Millimetre)
                                             .PaddingTop(billingDateY, QuestPDF.Infrastructure.Unit.Millimetre)
                                             .Text(data.Metadata?.BillingDateFormatted ?? "N/A").FontSize(8.5f);

                                // 6. Reporting Date
                                var reportDate = "N/A";
                                if (!string.IsNullOrWhiteSpace(data.Metadata?.GeneratedAtFormatted))
                                {
                                    reportDate = data.Metadata.GeneratedAtFormatted.Split(',')[0];
                                }
                                layers.Layer().PaddingLeft(reportDateX, QuestPDF.Infrastructure.Unit.Millimetre)
                                             .PaddingTop(reportDateY, QuestPDF.Infrastructure.Unit.Millimetre)
                                             .Text(reportDate).FontSize(8.5f);
                            }
                        }
                    });

                    page.Header().Column(headerCol =>
                    {
                        if (headerConfig != null)
                        {
                            RenderHeader(headerCol, data, headerConfig);
                        }
                    });

                    var patientInfoSectionForPadding = templateModel.Sections.FirstOrDefault(s => s.Type == "PatientInfo");
                    var paramTableSectionForPadding = templateModel.Sections.FirstOrDefault(s => s.Type == "ParameterTable");
                    var patientConfigForPadding = patientInfoSectionForPadding != null ? DeserializeConfig<PatientInfoConfig>(patientInfoSectionForPadding) : null;
                    var paramConfigForPadding = paramTableSectionForPadding != null ? DeserializeConfig<ParameterTableConfig>(paramTableSectionForPadding) : null;
                    var signatureSectionForPadding = templateModel.Sections.FirstOrDefault(s => s.Type == "SignatureBlock");
                    var isAbsoluteForPadding = patientConfigForPadding?.EnableAbsolutePositioning == true;

                    float contentPaddingLeft = isAbsoluteForPadding ? (paramConfigForPadding?.ResultsTableX ?? 15f) : 0f;
                    float contentPaddingRight = isAbsoluteForPadding ? (paramConfigForPadding?.ResultsTableX ?? 15f) : 0f;
                    float contentPaddingTop = isAbsoluteForPadding ? (headerConfig?.TopMargin ?? 12f) : 0f;
                    float contentPaddingBottom = isAbsoluteForPadding ? 0f : (headerConfig?.BottomMargin ?? 15f);

                    page.Content()
                        .PaddingLeft(contentPaddingLeft, QuestPDF.Infrastructure.Unit.Millimetre)
                        .PaddingRight(contentPaddingRight, QuestPDF.Infrastructure.Unit.Millimetre)
                        .PaddingTop(contentPaddingTop, QuestPDF.Infrastructure.Unit.Millimetre)
                        .PaddingBottom(contentPaddingBottom, QuestPDF.Infrastructure.Unit.Millimetre)
                        .Column(contentCol =>
                        {
                            if (isAbsoluteForPadding && paramConfigForPadding != null)
                            {
                                float tableY = paramConfigForPadding.TableBlockY ?? paramConfigForPadding.ResultsTableY ?? 95f;
                                float spacerHeight = Math.Max(0f, tableY - contentPaddingTop);
                                if (spacerHeight > 0f)
                                {
                                    contentCol.Item().Height(spacerHeight, QuestPDF.Infrastructure.Unit.Millimetre);
                                }
                            }

                        foreach (var section in templateModel.Sections)
                        {
                            switch (section.Type)
                            {
                                case "PatientInfo":
                                    RenderPatientInfo(contentCol, data, DeserializeConfig<PatientInfoConfig>(section));
                                    break;
                                case "ParameterTable":
                                    RenderParameterTable(contentCol, data, DeserializeConfig<ParameterTableConfig>(section));
                                    break;
                                case "Comments":
                                    RenderComments(contentCol, data, DeserializeConfig<CommentsConfig>(section));
                                    break;
                                case "Interpretation":
                                    RenderInterpretation(contentCol, data, DeserializeConfig<InterpretationConfig>(section));
                                    break;
                                case "Recommendations":
                                    RenderRecommendations(contentCol, data, DeserializeConfig<RecommendationsConfig>(section));
                                    break;
                                case "SignatureBlock":
                                    if (!isAbsoluteForPadding)
                                    {
                                        RenderSignatureBlock(contentCol, data, DeserializeConfig<SignatureBlockConfig>(section));
                                    }
                                    break;
                                case "QRCode":
                                    RenderQRCode(contentCol, data, DeserializeConfig<QRCodeConfig>(section));
                                    break;
                            }
                        }
                    });

                    page.Footer().Column(footerCol =>
                    {
                        if (isAbsoluteForPadding && signatureSectionForPadding != null)
                        {
                            var sigConfig = DeserializeConfig<SignatureBlockConfig>(signatureSectionForPadding);
                            RenderSignatureBlock(footerCol, data, sigConfig);
                            
                            float bottomMarginSpace = sigConfig?.SignatureBlockY ?? 25f;
                            footerCol.Item().Height(bottomMarginSpace, QuestPDF.Infrastructure.Unit.Millimetre);
                        }

                        foreach (var section in templateModel.Sections)
                        {
                            if (section.Type == "Footer")
                            {
                                var config = DeserializeConfig<FooterConfig>(section);
                                RenderFooter(footerCol, data, config, headerConfig);
                                break;
                            }
                        }
                    });
                });
            });

            using var stream = new MemoryStream();
            document.GeneratePdf(stream);
            return Task.FromResult(stream.ToArray());
        }

        private void RenderHeader(ColumnDescriptor column, ReportDataModel data, HeaderConfig? config)
        {
            if (config?.IncludeBranding == false)
            {
                column.Item().PaddingBottom(10);
                return;
            }

            column.Item().Row(row =>
            {
                row.RelativeItem().Column(col =>
                {
                    if (config?.IncludeHeaderName != false)
                    {
                        var labName = !string.IsNullOrWhiteSpace(config?.Title) && config.Title != "SynOS Diagnostic Lab"
                            ? config.Title 
                            : (data.Lab?.Name ?? "SynOS Diagnostic Lab");
                            
                        col.Item().Text(labName.ToUpper())
                            .FontSize(18)
                            .Bold()
                            .FontColor("#312e81");
                    }
                        
                    if (config?.IncludeHeaderSubtitle != false && data.Lab != null)
                    {
                        if (!string.IsNullOrWhiteSpace(data.Lab.Subtitle))
                        {
                            col.Item().Text(data.Lab.Subtitle)
                                .FontSize(9)
                                .SemiBold()
                                .FontColor("#71717a");
                        }
                        
                        if (!string.IsNullOrWhiteSpace(data.Lab.Address))
                        {
                            col.Item().PaddingTop(2).Text(data.Lab.Address)
                                .FontSize(8)
                                .FontColor("#52525b");
                        }
                        
                        var contactParts = new System.Collections.Generic.List<string>();
                        if (!string.IsNullOrWhiteSpace(data.Lab.Phone)) contactParts.Add($"Cell: {data.Lab.Phone}");
                        if (!string.IsNullOrWhiteSpace(data.Lab.Email)) contactParts.Add($"E-mail: {data.Lab.Email}");
                        if (!string.IsNullOrWhiteSpace(data.Lab.Website)) contactParts.Add($"Website: {data.Lab.Website}");
                        
                        if (contactParts.Count > 0)
                        {
                            col.Item().Text(string.Join("  |  ", contactParts))
                                .FontSize(8)
                                .FontColor("#52525b");
                        }
                    }
                });
            });

            if (config?.ShowHeaderDivider != false)
            {
                var dividerColor = config?.HeaderDividerColor ?? "#4f46e5";
                var dividerThickness = config?.HeaderDividerThickness ?? 2f;
                column.Item().PaddingTop(8).BorderBottom(dividerThickness).BorderColor(dividerColor);
            }
            column.Item().PaddingBottom(15);
        }

        private void RenderPatientInfo(ColumnDescriptor column, ReportDataModel data, PatientInfoConfig? config)
        {
            if (config == null) return;

            if (config.EnableAbsolutePositioning == true)
            {
                return;
            }

            column.Item().PaddingBottom(15).Border(1).BorderColor("#e4e4e7").Padding(8).Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(6);
                    columns.RelativeColumn(5);
                });

                // Row 1: Patient Name | Patient ID / ID No
                table.Cell().Row(row =>
                {
                    row.ConstantItem(85).Text("Patient Name").Bold().FontSize(8).FontColor("#4b5563");
                    row.RelativeItem().Text($": {data.Patient.Name}").Bold().FontSize(9);
                });
                table.Cell().Row(row =>
                {
                    row.ConstantItem(80).Text("ID No.").Bold().FontSize(8).FontColor("#4b5563");
                    row.RelativeItem().Text($": {data.Patient.PatientId}").Bold().FontSize(9);
                });

                // Row 2: Ref. by Dr. | Date of Billing
                table.Cell().Row(row =>
                {
                    row.ConstantItem(85).Text("Ref. by Dr.").Bold().FontSize(8).FontColor("#4b5563");
                    row.RelativeItem().Text($": {data.Metadata?.ReferenceDoctor ?? "Self / Walk-in"}").FontSize(8);
                });
                table.Cell().Row(row =>
                {
                    row.ConstantItem(80).Text("Date of Billing").Bold().FontSize(8).FontColor("#4b5563");
                    row.RelativeItem().Text($": {data.Metadata?.BillingDateFormatted ?? "N/A"}").FontSize(8);
                });

                // Row 3: Age / Sex | Date of Reporting
                table.Cell().Row(row =>
                {
                    var ageStr = "N/A";
                    if (!string.IsNullOrWhiteSpace(data.Patient.DateOfBirth))
                    {
                        var dob = System.DateTime.TryParse(data.Patient.DateOfBirth, out var parsedDob) ? parsedDob : (System.DateTime?)null;
                        if (dob.HasValue)
                        {
                            ageStr = $"{((System.DateTime.Today - dob.Value).TotalDays / 365.25):0} Yrs";
                        }
                        else
                        {
                            ageStr = data.Patient.DateOfBirth;
                        }
                    }
                    row.ConstantItem(85).Text("Age / Sex").Bold().FontSize(8).FontColor("#4b5563");
                    row.RelativeItem().Text($": {ageStr} / {data.Patient.Gender}").FontSize(8);
                });
                table.Cell().Row(row =>
                {
                    var reportDate = "N/A";
                    if (!string.IsNullOrWhiteSpace(data.Metadata?.GeneratedAtFormatted))
                    {
                        reportDate = data.Metadata.GeneratedAtFormatted.Split(',')[0];
                    }
                    row.ConstantItem(80).Text("Date of Reporting").Bold().FontSize(8).FontColor("#4b5563");
                    row.RelativeItem().Text($": {reportDate}").FontSize(8);
                });
            });
        }

        private string GetColumnHeaderName(string col)
        {
            return col switch
            {
                "Parameter" => "Parameter",
                "Value" => "Findings / Commentary",
                "Unit" => "Unit",
                "ReferenceRange" => "Reference Range",
                "Methodology" => "Methodology",
                _ => col
            };
        }

        private void RenderColumnCell(IContainer cell, ReportColumnDefinition col, ParameterResult parameter, System.Collections.Generic.List<ReportColumnDefinition> activeColumns)
        {
            var align = col.Alignment?.ToLower() ?? "left";
            IContainer contentContainer = cell;
            if (align == "center") contentContainer = cell.AlignCenter();
            else if (align == "right") contentContainer = cell.AlignRight();
            else contentContainer = cell.AlignLeft();

            switch (col.Code)
            {
                case "Parameter":
                    var pText = contentContainer.Text(parameter.Name).FontSize(9);
                    if (col.Bold) pText.Bold();
                    else pText.Medium();
                    break;
                case "Value":
                    var val = string.IsNullOrWhiteSpace(parameter.DisplayValue) ? parameter.Value : parameter.DisplayValue;
                    
                    // If "Unit" column is not active/visible, append unit to the value!
                    var isUnitColumnActive = activeColumns.Any(c => c.Code == "Unit");
                    if (!isUnitColumnActive && !string.IsNullOrEmpty(parameter.Unit))
                    {
                        val = $"{val} {parameter.Unit}";
                    }

                    var vText = contentContainer.Text(val).FontSize(9);
                    if (parameter.IsAbnormal)
                    {
                        vText.Bold();
                    }
                    else if (col.Bold)
                    {
                        vText.Bold();
                    }
                    else
                    {
                        vText.Medium();
                    }
                    break;
                case "Unit":
                    var uText = contentContainer.Text(parameter.Unit).FontSize(9);
                    if (col.Bold) uText.Bold();
                    break;
                case "ReferenceRange":
                    var rText = contentContainer.Text(parameter.ReferenceRangeText).FontSize(9);
                    if (col.Bold) rText.Bold();
                    break;
                case "Methodology":
                    var mText = contentContainer.Text(parameter.Method ?? "").FontSize(9);
                    if (col.Bold) mText.Bold();
                    break;
                default:
                    contentContainer.Text("");
                    break;
            }
        }

        private void RenderParameterTable(ColumnDescriptor column, ReportDataModel data, ParameterTableConfig? config)
        {
            if (config == null) return;

            var activeColumns = config.Columns ?? new List<ReportColumnDefinition>();
            if (activeColumns.Count == 0)
            {
                var visible = config.VisibleColumns ?? new List<string> { "Parameter", "Value", "Unit", "ReferenceRange" };
                var weights = config.ColumnWeights ?? new List<int> { 3, 2, 1, 3 };
                if (weights.Count < visible.Count) weights = visible.Select(_ => 1).ToList();

                for (int i = 0; i < visible.Count; i++)
                {
                    var colCode = visible[i];
                    var defaultTitle = colCode switch
                    {
                        "Parameter" => "Parameter",
                        "Value" => "Findings / Commentary",
                        "Unit" => "Unit",
                        "ReferenceRange" => "Reference Range",
                        "Methodology" => "Methodology",
                        _ => colCode
                    };

                    var defaultAlign = colCode switch
                    {
                        "Parameter" => "Left",
                        "Value" => "Center",
                        "Unit" => "Center",
                        "ReferenceRange" => "Right",
                        "Methodology" => "Center",
                        _ => "Left"
                    };

                    activeColumns.Add(new ReportColumnDefinition
                    {
                        Code = colCode,
                        Title = defaultTitle,
                        Weight = weights[i],
                        Alignment = defaultAlign,
                        Bold = (colCode == "Parameter")
                    });
                }
            }

            column.Item().PaddingBottom(10).Column(tableCol =>
            {
                var reportTitle = string.IsNullOrWhiteSpace(data.ReportTitle) ? "Medical Report" : data.ReportTitle;
                tableCol.Item().AlignCenter().Text(reportTitle.ToUpper()).FontSize(11).Bold().Underline();
                tableCol.Item().PaddingBottom(12);

                tableCol.Item().Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        foreach (var col in activeColumns)
                        {
                            columns.RelativeColumn(col.Weight);
                        }
                    });

                    table.Header(header =>
                    {
                        foreach (var col in activeColumns)
                        {
                            var cell = header.Cell().BorderTop(1).BorderBottom(1).PaddingVertical(3);
                            IContainer contentContainer = cell;
                            
                            var align = col.Alignment?.ToLower() ?? "left";
                            if (align == "center") contentContainer = cell.AlignCenter();
                            else if (align == "right") contentContainer = cell.AlignRight();
                            else contentContainer = cell.AlignLeft();

                            contentContainer.Text(col.Title.ToUpper()).FontSize(9).Bold();
                        }
                    });

                    foreach (var group in data.Results)
                    {
                        // Group Heading
                        if (!string.IsNullOrWhiteSpace(group.GroupName))
                        {
                            table.Cell().ColumnSpan((uint)activeColumns.Count).Background(Colors.Grey.Lighten4).PaddingVertical(2).PaddingHorizontal(5)
                                 .Text(group.GroupName).SemiBold().FontSize(11);
                        }

                        foreach (var parameter in group.Parameters)
                        {
                            foreach (var col in activeColumns)
                            {
                                var cell = table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten3).PaddingVertical(3);
                                RenderColumnCell(cell, col, parameter, activeColumns);
                            }

                            if (parameter.ShowNarrative && !string.IsNullOrWhiteSpace(parameter.Narrative))
                            {
                                var cleanText = ConvertTipTapToPlainText(parameter.Narrative);
                                if (!string.IsNullOrWhiteSpace(cleanText))
                                {
                                    table.Cell().ColumnSpan((uint)activeColumns.Count)
                                         .BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten3)
                                         .PaddingTop(1).PaddingBottom(5).PaddingHorizontal(10)
                                         .Text(cleanText).Italic().FontSize(8.5f).FontColor(Colors.Grey.Darken2);
                                }
                            }
                        }
                    }
                });
            });
        }

        private void RenderComments(ColumnDescriptor column, ReportDataModel data, CommentsConfig? config)
        {
            if (config == null || (string.IsNullOrWhiteSpace(data.Comments) && !config.VisibleIfEmpty)) return;

            column.Item().PaddingBottom(10).Column(commentsCol =>
            {
                commentsCol.Item().PaddingVertical(5).Text(ConvertTipTapToPlainText(data.Comments));
            });
        }

        private void RenderInterpretation(ColumnDescriptor column, ReportDataModel data, InterpretationConfig? config)
        {
            if (config == null || (string.IsNullOrWhiteSpace(data.Interpretation) && !config.VisibleIfEmpty)) return;
            
            column.Item().PaddingBottom(10).Column(interpCol =>
            {
                interpCol.Item().PaddingVertical(5).Text(ConvertTipTapToPlainText(data.Interpretation));
            });
        }

        private void RenderRecommendations(ColumnDescriptor column, ReportDataModel data, RecommendationsConfig? config)
        {
            if (config == null || (string.IsNullOrWhiteSpace(data.Recommendations) && !config.VisibleIfEmpty)) return;

            column.Item().PaddingBottom(10).Column(recoCol =>
            {
                recoCol.Item().Text(config.Title).FontSize(14).SemiBold();
                recoCol.Item().LineHorizontal(1);
                recoCol.Item().PaddingVertical(5).Text(data.Recommendations);
            });
        }

        private void RenderSignatureBlock(ColumnDescriptor column, ReportDataModel data, SignatureBlockConfig? config)
        {
            if (config == null || data.Signatures == null || !data.Signatures.Any()) return;

            column.Item().PaddingTop(30).Row(row =>
            {
                for (int slotIdx = 0; slotIdx < 4; slotIdx++)
                {
                    var sig = slotIdx < data.Signatures.Count ? data.Signatures[slotIdx] : null;

                    row.RelativeItem().Column(sigCol =>
                    {
                        if (sig != null)
                        {
                            if (sig.SignatureImage != null && config.ShowDigitalSignatureImage)
                            {
                                sigCol.Item().AlignCenter().Height(35).Width(90).Image(sig.SignatureImage);
                            }
                            else
                            {
                                sigCol.Item().Height(35);
                            }

                            if (config.ShowDoctorName)
                            {
                                sigCol.Item().AlignCenter().Text(sig.DoctorName).Bold().FontSize(8.5f);
                            }
                            if (config.ShowCredentials)
                            {
                                sigCol.Item().AlignCenter().Text(sig.Credentials).FontSize(7.5f).FontColor("#4b5563");
                            }

                        }
                        else
                        {
                            sigCol.Item().Height(60); // Empty slot placeholder
                        }
                    });
                }
            });
        }

        private void RenderQRCode(ColumnDescriptor column, ReportDataModel data, QRCodeConfig? config)
        {
            if (config == null || string.IsNullOrWhiteSpace(data.Verification?.QrCodeContent)) return;

            var qrGenerator = new QRCodeGenerator();
            var qrCodeData = qrGenerator.CreateQrCode(data.Verification.QrCodeContent, QRCodeGenerator.ECCLevel.Q);
            var qrCode = new PngByteQRCode(qrCodeData);
            var qrCodeImage = qrCode.GetGraphic(20);

            column.Item().PaddingTop(10).AlignLeft().Column(qrCol =>
            {
                qrCol.Item().Shrink()
                     .Height(config.Size).Width(config.Size)
                     .Image(qrCodeImage);
                qrCol.Item().Text("Scan for verification").FontSize(8);
            });
        }

        private void RenderFooter(ColumnDescriptor column, ReportDataModel data, FooterConfig? config, HeaderConfig? headerConfig)
        {
            if (config == null) return;

            column.Item().Column(footerCol =>
            {
                if (headerConfig?.BgType != "image")
                {
                    footerCol.Item().BorderTop(1).BorderColor("#e2e8f0").PaddingTop(5);
                    footerCol.Item().Row(row =>
                    {
                        row.ConstantItem(250).Text(config.LeftText).FontSize(8).AlignLeft().FontColor("#71717a");
                        row.RelativeItem().AlignRight().Text(text =>
                        {
                            text.Span("Page ").FontSize(8).FontColor("#71717a");
                            text.CurrentPageNumber().FontSize(8).FontColor("#71717a");
                            text.Span(" of ").FontSize(8).FontColor("#71717a");
                            text.TotalPages().FontSize(8).FontColor("#71717a");
                        });
                    });
                }
                else
                {
                    footerCol.Item().Row(row =>
                    {
                        row.RelativeItem().AlignRight().Text(text =>
                        {
                            text.Span("Page ").FontSize(7.5f).FontColor("#71717a");
                            text.CurrentPageNumber().FontSize(7.5f).FontColor("#71717a");
                            text.Span(" of ").FontSize(7.5f).FontColor("#71717a");
                            text.TotalPages().FontSize(7.5f).FontColor("#71717a");
                        });
                    });
                }
            });
        }

        private string ConvertTipTapToPlainText(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return string.Empty;
            if (!input.Trim().StartsWith("{") && !input.Trim().StartsWith("["))
            {
                // Strip HTML tags using regex
                return System.Text.RegularExpressions.Regex.Replace(input, "<.*?>", string.Empty);
            }

            try
            {
                using var doc = JsonDocument.Parse(input);
                var sb = new System.Text.StringBuilder();
                ExtractTextFromJson(doc.RootElement, sb);
                return sb.ToString().Trim();
            }
            catch
            {
                // Fallback: strip HTML
                return System.Text.RegularExpressions.Regex.Replace(input, "<.*?>", string.Empty);
            }
        }

        private void ExtractTextFromJson(JsonElement element, System.Text.StringBuilder sb)
        {
            if (element.ValueKind == JsonValueKind.Object)
            {
                if (element.TryGetProperty("type", out var typeProp))
                {
                    var typeVal = typeProp.GetString();
                    if (typeVal == "text" && element.TryGetProperty("text", out var textProp))
                    {
                        sb.Append(textProp.GetString());
                    }
                    else if (typeVal == "paragraph" || typeVal == "heading")
                    {
                        sb.Append("\n");
                    }
                    else if (typeVal == "listItem")
                    {
                        sb.Append("\n• ");
                    }
                }

                if (element.TryGetProperty("content", out var contentProp))
                {
                    ExtractTextFromJson(contentProp, sb);
                }
            }
            else if (element.ValueKind == JsonValueKind.Array)
            {
                foreach (var child in element.EnumerateArray())
                {
                    ExtractTextFromJson(child, sb);
                }
            }
        }
    }
}
