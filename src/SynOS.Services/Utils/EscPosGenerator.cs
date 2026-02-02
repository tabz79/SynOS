using System.Text;
using System.Collections.Generic;
using System.Linq;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Operations;
using SynOS.Models.Enums;

namespace SynOS.Services.Utils
{
    public static class EscPosGenerator
    {
        private const string ESC = "\x1B";
        private const string GS = "\x1D";
        private const string LF = "\x0A";

        public static string GenerateTokenSlip(Visit visit, WorkAssignment? assignment = null, string labName = "SynOS Lab")
        {
            var sb = new StringBuilder();

            // Initialize printer
            sb.Append(ESC + "@");

            // Header
            sb.Append(Center(Bold(labName)));
            sb.Append(Center("================================"));
            sb.Append(LF);

            // Body
            sb.Append(Bold($"TOKEN: {visit.Token}"));
            sb.Append(LF);
            sb.Append($"ID:   {visit.Patient?.MRN}");
            sb.Append(LF);
            sb.Append($"Name: {visit.Patient?.FirstName} {visit.Patient?.LastName}");
            sb.Append(LF);
            sb.Append($"Date: {visit.CreatedAt:dd MMM yyyy, hh:mm tt}");
            sb.Append(LF);
            sb.Append($"Dept: {visit.Department}");
            sb.Append(LF);

            // Tests
            var testNames = visit.Orders.Select(o => o.Test?.TestName ?? o.TestCode).ToList(); // Corrected
            sb.Append("Tests: " + FormatTests(string.Join(", ", testNames)));
            sb.Append(LF);

            // Routing Info (NEW)
            if (assignment != null)
            {
                if (assignment.Status == WorkAssignmentStatus.PendingAssignment)
                {
                    sb.Append(Center("--------------------------------"));
                    sb.Append(Center(Bold("PLEASE WAIT")));
                    sb.Append(Center("You will be called shortly"));
                    sb.Append(Center("--------------------------------"));
                }
                else if (assignment.AssignedResource != null)
                {
                    var desk = assignment.AssignedResource.PhysicalStation ?? "Standard Queue";
                    sb.Append(LF);
                    sb.Append(Center("Proceed To:"));
                    sb.Append(Center(Bold(desk.ToUpper())));
                    sb.Append(LF);
                }
            }

            // Footer
            sb.Append(Center("================================"));
            sb.Append(Center("Powered by SynOS Core"));
            sb.Append(Center("================================"));

            // Cut paper
            sb.Append(LF + LF + LF);
            sb.Append(GS + "V" + (char)1);

            return sb.ToString();
        }

        public static string GenerateInvoiceSlip(Invoice invoice, string labName = "SynOS Lab")
        {
            var sb = new StringBuilder();

            // Initialize printer
            sb.Append(ESC + "@");

            // Header
            sb.Append(Center(Bold(labName)));
            sb.Append(Center("--- INVOICE ---"));
            sb.Append(LF);

            // Body
            sb.Append($"Invoice: {invoice.InvoiceId.ToString().Substring(0, 8)}").Append(LF);
            sb.Append($"Date: {invoice.CreatedAt:dd MMM yyyy, hh:mm tt}").Append(LF);
            sb.Append($"Patient: {invoice.Visit.Patient.FirstName} {invoice.Visit.Patient.LastName} ({invoice.Visit.Patient.MRN})").Append(LF);
            sb.Append("--------------------------------" + LF);

            // Line Items
            foreach (var order in invoice.Visit.Orders)
            {
                var name = (order.Test?.TestName ?? order.TestCode).PadRight(22); // Corrected
                var price = order.Price.ToString("F2").PadLeft(8);
                sb.Append($"{name}{price}").Append(LF);
            }
            sb.Append("--------------------------------" + LF);

            // Totals
            sb.Append($"Gross: {invoice.GrossAmount:F2}".PadLeft(32)).Append(LF);
            if (invoice.DiscountAmount > 0)
                sb.Append($"Discount: {invoice.DiscountAmount:F2}".PadLeft(32)).Append(LF);
            sb.Append($"Tax: {invoice.TaxAmount:F2}".PadLeft(32)).Append(LF);
            sb.Append(Bold($"TOTAL: {invoice.Total:F2}".PadLeft(32))).Append(LF);
            sb.Append("--------------------------------" + LF);
            
            // Footer
            sb.Append(Center("Thank you!")).Append(LF);

            // Cut paper
            sb.Append(LF + LF + LF);
            sb.Append(GS + "V" + (char)1);

            return sb.ToString();
        }

        private static string Center(string text)
        {
            return ESC + "a" + (char)1 + text + LF;
        }

        private static string Bold(string text)
        {
            return ESC + "E" + (char)1 + text + ESC + "E" + (char)0;
        }

        private static string FormatTests(string tests, int lineLength = 32)
        {
            if (tests.Length <= lineLength - 7) // "Tests: " is 7 chars
            {
                return tests;
            }

            var words = tests.Split(' ');
            var lines = new List<string>();
            var currentLine = "";

            foreach (var word in words)
            {
                if ((currentLine + word).Length > lineLength)
                {
                    lines.Add(currentLine.Trim());
                    currentLine = "";
                }
                currentLine += word + " ";
            }
            lines.Add(currentLine.Trim());

            // Join lines with proper indentation for the subsequent lines
            return string.Join(LF + "       ", lines);
        }
    }
}