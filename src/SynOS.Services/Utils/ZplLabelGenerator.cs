using SynOS.Models.DTOs;
using System.Text;

namespace SynOS.Services.Utils
{
    public static class ZplLabelGenerator
    {
        public static string GenerateLabel(ZplLabelDataDto data)
        {
            var zplBuilder = new StringBuilder();

            // ZPL for a 4x6 inch label (assuming 203 dpi)
            // 4 inches = 812 dots, 6 inches = 1218 dots
            zplBuilder.AppendLine("^XA"); // Start Format

            // Patient Name (Bold, larger font)
            zplBuilder.AppendLine("^FO50,50^A0N,50,50^FD" + Sanitize(data.PatientName) + "^FS");

            // Test Name (Bold)
            zplBuilder.AppendLine("^FO50,120^A0N,40,40^FB700,1,0,L,0^FD" + Sanitize(data.TestName) + "^FS");

            // Token Number
            zplBuilder.AppendLine("^FO50,200^A0N,35,35^FDToken: " + Sanitize(data.TokenNumber) + "^FS");

            // Tube Type
            zplBuilder.AppendLine("^FO400,200^A0N,35,35^FDTube: " + Sanitize(data.TubeType) + "^FS");

            // Barcode (Code 128)
            // ^BY3,2,100 -> Barcode width, ratio, height
            // ^BCN,,Y,N -> Code 128, no check digit, human-readable text below
            zplBuilder.AppendLine("^FO50,300^BY3,2,100^BCN,,Y,N^FD" + Sanitize(data.BarcodePayload) + "^FS");

            zplBuilder.AppendLine("^XZ"); // End Format

            return zplBuilder.ToString();
        }

        private static string Sanitize(string input)
        {
            // Basic sanitization for ZPL. Replace carets and other special characters.
            return input.Replace("^", " ").Replace("~", " ").Replace("&", " ");
        }
    }
}
