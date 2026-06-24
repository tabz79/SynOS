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
            if (section.Config.ValueKind != JsonValueKind.Undefined && section.Config.ValueKind != JsonValueKind.Null)
            {
                return section.Config.Deserialize<T>();
            }

            if (section.ExtensionData != null && section.ExtensionData.Any())
            {
                var json = JsonSerializer.Serialize(section.ExtensionData);
                return JsonSerializer.Deserialize<T>(json);
            }

            return JsonSerializer.Deserialize<T>("{}");
        }

        public Task<byte[]> GeneratePdfAsync(ReportDataModel data, TemplateModel templateModel)
        {
            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(1, QuestPDF.Infrastructure.Unit.Centimetre);
                    page.DefaultTextStyle(x => x.FontSize(10));

                    page.Header().Column(headerCol =>
                    {
                        foreach (var section in templateModel.Sections)
                        {
                            if (section.Type == "Header")
                            {
                                var config = DeserializeConfig<HeaderConfig>(section);
                                RenderHeader(headerCol, data, config);
                                break;
                            }
                        }
                    });

                    page.Content().Column(contentCol =>
                    {
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
                                    RenderSignatureBlock(contentCol, data, DeserializeConfig<SignatureBlockConfig>(section));
                                    break;
                                case "QRCode":
                                    RenderQRCode(contentCol, data, DeserializeConfig<QRCodeConfig>(section));
                                    break;
                            }
                        }
                    });

                    page.Footer().Column(footerCol =>
                    {
                        foreach (var section in templateModel.Sections)
                        {
                            if (section.Type == "Footer")
                            {
                                var config = DeserializeConfig<FooterConfig>(section);
                                RenderFooter(footerCol, data, config);
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
            if (config == null) return;
            column.Item().Text(config.Title).FontSize(24).Bold().AlignCenter();
            if (config.ShowLogo)
            {
                column.Item().AlignRight().Width(200).Image(Placeholders.Image(200, 50));
            }
            column.Item().BorderBottom(1).PaddingBottom(5);
            column.Item().PaddingBottom(10);
        }

        private void RenderPatientInfo(ColumnDescriptor column, ReportDataModel data, PatientInfoConfig? config)
        {
            if (config == null) return;
            column.Item().PaddingBottom(10).Column(patientInfoCol =>
            {
                patientInfoCol.Item().Text("Patient Information").FontSize(14).SemiBold();
                patientInfoCol.Item().LineHorizontal(1);
                patientInfoCol.Item().PaddingVertical(5).Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.RelativeColumn();
                        columns.RelativeColumn();
                    });

                    if (config.ShowPatientName)
                    {
                        table.Cell().Text("Name");
                        table.Cell().Text($": {data.Patient.Name}");
                    }
                    if (config.ShowPatientId)
                    {
                        table.Cell().Text("Patient ID");
                        table.Cell().Text($": {data.Patient.PatientId}");
                    }
                    if (config.ShowDateOfBirth)
                    {
                        table.Cell().Text("DOB");
                        table.Cell().Text($": {data.Patient.DateOfBirth}");
                    }
                    if (config.ShowGender)
                    {
                        table.Cell().Text("Gender");
                        table.Cell().Text($": {data.Patient.Gender}");
                    }
                    if (config.ShowContactInfo)
                    {
                        table.Cell().Text("Contact");
                        table.Cell().Text($": {data.Patient.ContactInfo}");
                    }
                });
            });
        }

        private string GetColumnHeaderName(string col)
        {
            return col switch
            {
                "Parameter" => "Parameter",
                "Value" => "Value",
                "Unit" => "Unit",
                "ReferenceRange" => "Reference Range",
                _ => col
            };
        }

        private void RenderColumnCell(IContainer cell, string col, ParameterResult parameter)
        {
            switch (col)
            {
                case "Parameter":
                    cell.AlignLeft().Text(parameter.Name);
                    break;
                case "Value":
                    var val = string.IsNullOrWhiteSpace(parameter.DisplayValue) ? parameter.Value : parameter.DisplayValue;
                    var valCell = cell.AlignCenter();
                    if (parameter.IsAbnormal)
                    {
                        valCell.Text(val).FontColor(Colors.Red.Medium).SemiBold();
                    }
                    else
                    {
                        valCell.Text(val);
                    }
                    break;
                case "Unit":
                    cell.AlignCenter().Text(parameter.Unit);
                    break;
                case "ReferenceRange":
                    cell.AlignRight().Text(parameter.ReferenceRangeText);
                    break;
                default:
                    cell.Text("");
                    break;
            }
        }

        private void RenderParameterTable(ColumnDescriptor column, ReportDataModel data, ParameterTableConfig? config)
        {
            if (config == null) return;

            var visibleColumns = config.VisibleColumns ?? new List<string> { "Parameter", "Value", "Unit", "ReferenceRange" };
            var columnWeights = config.ColumnWeights ?? new List<int> { 3, 2, 1, 3 };

            if (columnWeights.Count < visibleColumns.Count)
            {
                columnWeights = visibleColumns.Select(_ => 1).ToList();
            }

            column.Item().PaddingBottom(10).Column(tableCol =>
            {
                tableCol.Item().Text("Test Results").FontSize(14).SemiBold();
                tableCol.Item().LineHorizontal(1);
                tableCol.Item().Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        for (int i = 0; i < visibleColumns.Count; i++)
                        {
                            columns.RelativeColumn(columnWeights[i]);
                        }
                    });

                    table.Header(header =>
                    {
                        foreach (var col in visibleColumns)
                        {
                            var cell = header.Cell().BorderBottom(1);
                            IContainer contentContainer = cell;
                            if (col == "Parameter") contentContainer = cell.AlignLeft();
                            else if (col == "Value" || col == "Unit") contentContainer = cell.AlignCenter();
                            else if (col == "ReferenceRange") contentContainer = cell.AlignRight();
                            
                            contentContainer.Text(GetColumnHeaderName(col)).SemiBold();
                        }
                    });

                    foreach (var group in data.Results)
                    {
                        // Group Heading
                        if (!string.IsNullOrWhiteSpace(group.GroupName))
                        {
                            table.Cell().ColumnSpan((uint)visibleColumns.Count).Background(Colors.Grey.Lighten4).PaddingVertical(2).PaddingHorizontal(5)
                                 .Text(group.GroupName).SemiBold().FontSize(11);
                        }

                        foreach (var parameter in group.Parameters)
                        {
                            foreach (var col in visibleColumns)
                            {
                                var cell = table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten3).PaddingVertical(3);
                                RenderColumnCell(cell, col, parameter);
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
                commentsCol.Item().PaddingVertical(5).Text(data.Comments);
            });
        }

        private void RenderInterpretation(ColumnDescriptor column, ReportDataModel data, InterpretationConfig? config)
        {
            if (config == null || (string.IsNullOrWhiteSpace(data.Interpretation) && !config.VisibleIfEmpty)) return;
            
            column.Item().PaddingBottom(10).Column(interpCol =>
            {
                interpCol.Item().PaddingVertical(5).Text(data.Interpretation);
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
            if (config == null) return;

            column.Item().PaddingTop(20).AlignRight().Column(sigCol =>
            {
                if (data.Signatures != null && data.Signatures.Any())
                {
                    foreach (var sig in data.Signatures)
                    {
                        if (sig.SignatureImage != null && config.ShowDigitalSignatureImage)
                        {
                            sigCol.Item().Height(50).Width(150).Image(sig.SignatureImage);
                        }
                        if (config.ShowDoctorName)
                        {
                            sigCol.Item().Text(sig.DoctorName).SemiBold();
                        }
                        if (config.ShowCredentials)
                        {
                            sigCol.Item().Text(sig.Credentials).FontSize(9);
                        }
                        if (sig.SignedAt.HasValue)
                        {
                            sigCol.Item().Text($"Signed at: {sig.SignedAt.Value:yyyy-MM-dd HH:mm:ss 'UTC'}").FontSize(8).FontColor(Colors.Grey.Medium);
                        }
                        sigCol.Item().PaddingBottom(10);
                    }
                }
                else
                {
                    sigCol.Item().Text("Not signed").Italic().FontColor(Colors.Grey.Medium);
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

        private void RenderFooter(ColumnDescriptor column, ReportDataModel data, FooterConfig? config)
        {
            if (config == null) return;
            column.Item().BorderTop(1).PaddingTop(5).Row(row =>
            {
                row.ConstantItem(150).Text(config.LeftText).FontSize(8).AlignLeft();
                row.RelativeItem().AlignRight().Text(text =>
                {
                    text.Span("Page ").FontSize(8);
                    text.CurrentPageNumber().FontSize(8);
                    text.Span(" of ").FontSize(8);
                    text.TotalPages().FontSize(8);
                });
            });
        }
    }
}
