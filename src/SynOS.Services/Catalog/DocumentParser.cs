using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Text;
using System.Xml;

namespace SynOS.Services.Catalog
{
    public static class DocumentParser
    {
        private static readonly HashSet<string> SkipGroups = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "header", "footer", "headerl", "headerr", "headerf", "footerl", "footerr", "footerf"
        };

        public static string ParseTxt(Stream stream)
        {
            using var reader = new StreamReader(stream, Encoding.UTF8);
            return CleanNarrative(reader.ReadToEnd());
        }

        public static string ParseDocx(Stream stream)
        {
            using var archive = new ZipArchive(stream, ZipArchiveMode.Read);
            var entry = archive.GetEntry("word/document.xml");
            if (entry == null) return "";

            using var entryStream = entry.Open();
            var xmlDoc = new XmlDocument();
            xmlDoc.Load(entryStream);

            var nsmgr = new XmlNamespaceManager(xmlDoc.NameTable);
            nsmgr.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main");

            var paragraphs = xmlDoc.SelectNodes("//w:p", nsmgr);
            if (paragraphs == null) return "";

            var sb = new StringBuilder();
            foreach (XmlNode p in paragraphs)
            {
                var textNodes = p.SelectNodes(".//w:t", nsmgr);
                if (textNodes != null)
                {
                    foreach (XmlNode t in textNodes)
                    {
                        sb.Append(t.InnerText);
                    }
                }
                sb.AppendLine();
            }

            return CleanNarrative(sb.ToString());
        }

        public static string ParseRtf(Stream stream)
        {
            using var reader = new StreamReader(stream, Encoding.ASCII);
            var rtf = reader.ReadToEnd();
            return CleanNarrative(ExtractTextFromRtf(rtf));
        }

        private static string ExtractTextFromRtf(string rtf)
        {
            var sb = new StringBuilder();
            var skipStack = new Stack<bool>();
            bool currentSkip = false;
            
            int i = 0;
            int len = rtf.Length;
            
            while (i < len)
            {
                char c = rtf[i];
                
                if (c == '{')
                {
                    skipStack.Push(currentSkip);
                    i++;
                }
                else if (c == '}')
                {
                    if (skipStack.Count > 0)
                    {
                        currentSkip = skipStack.Pop();
                    }
                    else
                    {
                        currentSkip = false;
                    }
                    i++;
                }
                else if (c == '\\')
                {
                    i++; // Skip backslash
                    if (i >= len) break;
                    
                    // Read control word
                    var tagBuilder = new StringBuilder();
                    while (i < len && char.IsLetter(rtf[i]))
                    {
                        tagBuilder.Append(rtf[i]);
                        i++;
                    }
                    
                    string tag = tagBuilder.ToString();
                    
                    // Skip optional numeric parameter
                    if (i < len && (rtf[i] == '-' || char.IsDigit(rtf[i])))
                    {
                        while (i < len && (rtf[i] == '-' || char.IsDigit(rtf[i])))
                        {
                            i++;
                        }
                    }
                    
                    // Skip optional space after control word
                    if (i < len && char.IsWhiteSpace(rtf[i]))
                    {
                        i++;
                    }
                    
                    // Check if this tag demands skipping the group
                    if (SkipGroups.Contains(tag))
                    {
                        currentSkip = true;
                    }
                    else if (tag.Equals("par", StringComparison.OrdinalIgnoreCase) || tag.Equals("line", StringComparison.OrdinalIgnoreCase))
                    {
                        if (!currentSkip)
                        {
                            sb.AppendLine();
                        }
                    }
                    else if (tag.Equals("tab", StringComparison.OrdinalIgnoreCase))
                    {
                        if (!currentSkip)
                        {
                            sb.Append("\t");
                        }
                    }
                }
                else
                {
                    if (!currentSkip)
                    {
                        sb.Append(c);
                    }
                    i++;
                }
            }
            
            return sb.ToString();
        }

        private static string CleanNarrative(string text)
        {
            if (string.IsNullOrEmpty(text)) return "";

            // Split into lines
            var lines = text.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
            
            // OBVIOUS HEADERS & FOOTERS STRIPPING
            var cleanLines = new List<string>();
            
            var headerTerms = new[] { "patient", "mrn", "age", "gender", "sex", "date", "doctor", "referred", "hospital", "clinic", "accession", "specimen" };
            var footerTerms = new[] { "signature", "pathologist", "radiologist", "technician", "verified", "reviewed", "page " };

            foreach (var line in lines)
            {
                var trimmed = line.Trim();
                if (string.IsNullOrEmpty(trimmed))
                {
                    cleanLines.Add(line);
                    continue;
                }

                var lower = trimmed.ToLowerInvariant();
                bool isHeader = false;
                bool isFooter = false;

                // Check for obvious metadata headers
                foreach (var term in headerTerms)
                {
                    if (lower.Contains(term) && (lower.Contains(":") || lower.Contains("name") || lower.Contains("details")))
                    {
                        isHeader = true;
                        break;
                    }
                }

                // Check for obvious signature/pathologist footers
                foreach (var term in footerTerms)
                {
                    if (lower.Contains(term))
                    {
                        isFooter = true;
                        break;
                    }
                }

                if (!isHeader && !isFooter)
                {
                    cleanLines.Add(line);
                }
            }

            return string.Join("\n", cleanLines).Trim();
        }
    }
}
