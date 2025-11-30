using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SynOS.Models.DTOs.ReportTemplateDsl;
using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;

namespace SynOS.Services
{
    public class QuestPdfReportRenderer : IReportPdfRenderer
    {
        // ✅ Static ctor runs once per app lifetime and configures QuestPDF license.
        static QuestPdfReportRenderer()
        {
            QuestPDF.Settings.License = LicenseType.Community;
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
                                var config = section.Config.Deserialize<HeaderConfig>();
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
                                    RenderPatientInfo(contentCol, data, section.Config.Deserialize<PatientInfoConfig>());
                                    break;
                                case "ParameterTable":
                                    RenderParameterTable(contentCol, data, section.Config.Deserialize<ParameterTableConfig>());
                                    break;
                                case "Comments":
                                    RenderComments(contentCol, data, section.Config.Deserialize<CommentsConfig>());
                                    break;
                                case "Interpretation":
                                    RenderInterpretation(contentCol, data, section.Config.Deserialize<InterpretationConfig>());
                                    break;
                                case "Recommendations":
                                    RenderRecommendations(contentCol, data, section.Config.Deserialize<RecommendationsConfig>());
                                    break;
                                case "SignatureBlock":
                                    RenderSignatureBlock(contentCol, data, section.Config.Deserialize<SignatureBlockConfig>());
                                    break;
                                case "QRCode":
                                    RenderQRCode(contentCol, data, section.Config.Deserialize<QRCodeConfig>());
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
                                var config = section.Config.Deserialize<FooterConfig>();
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

        private void RenderParameterTable(ColumnDescriptor column, ReportDataModel data, ParameterTableConfig? config)
        {
            if (config == null) return;
            column.Item().PaddingBottom(10).Column(tableCol =>
            {
                tableCol.Item().Text("Test Results").FontSize(14).SemiBold();
                tableCol.Item().LineHorizontal(1);
                tableCol.Item().Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.RelativeColumn(3);
                        columns.RelativeColumn(2);
                        columns.RelativeColumn(1);
                        columns.RelativeColumn(3);
                    });

                    table.Header(header =>
                    {
                        header.Cell().BorderBottom(1).Text("Parameter").SemiBold();
                        header.Cell().BorderBottom(1).Text("Value").SemiBold();
                        header.Cell().BorderBottom(1).Text("Unit").SemiBold();
                        header.Cell().BorderBottom(1).Text("Reference Range").SemiBold();
                    });

                    foreach (var parameter in data.Parameters)
                    {
                        table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten3).PaddingVertical(3).Text(parameter.Name);
                        table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten3).PaddingVertical(3)
                              .Text(parameter.Value).FontColor(parameter.IsCritical && config.HighlightCriticalValues ? Colors.Red.Medium : Colors.Black);
                        table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten3).PaddingVertical(3).Text(parameter.Unit);
                        table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten3).PaddingVertical(3).Text(parameter.ReferenceRange);
                    }
                });
            });
        }

        private void RenderComments(ColumnDescriptor column, ReportDataModel data, CommentsConfig? config)
        {
            if (config == null || (string.IsNullOrWhiteSpace(data.Comments) && !config.VisibleIfEmpty)) return;

            column.Item().PaddingBottom(10).Column(commentsCol =>
            {
                commentsCol.Item().Text(config.Title).FontSize(14).SemiBold();
                commentsCol.Item().LineHorizontal(1);
                commentsCol.Item().PaddingVertical(5).Text(data.Comments);
            });
        }

        private void RenderInterpretation(ColumnDescriptor column, ReportDataModel data, InterpretationConfig? config)
        {
            if (config == null || (string.IsNullOrWhiteSpace(data.Interpretation) && !config.VisibleIfEmpty)) return;
            
            column.Item().PaddingBottom(10).Column(interpCol =>
            {
                interpCol.Item().Text(config.Title).FontSize(14).SemiBold();
                interpCol.Item().LineHorizontal(1);
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
                if (config.ShowDigitalSignatureImage && data.Signature.SignatureImage != null)
                {
                    sigCol.Item().Height(50).Width(150).Image(data.Signature.SignatureImage);
                }
                if (config.ShowDoctorName) 
                    sigCol.Item().Text(data.Signature.DoctorName).SemiBold();
                if (config.ShowCredentials) 
                    sigCol.Item().Text(data.Signature.Credentials);
            });
        }

        private void RenderQRCode(ColumnDescriptor column, ReportDataModel data, QRCodeConfig? config)
        {
            if (config == null || string.IsNullOrWhiteSpace(data.VerificationQrCodeContent)) return;

            column.Item().PaddingTop(10).AlignLeft().Column(qrCol =>
            {
                qrCol.Item().Shrink()
                     .Height(config.Size).Width(config.Size)
                     .Image(Placeholders.Image(config.Size, config.Size));
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
