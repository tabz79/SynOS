The backend now supports analyzers that send results over a TCP port (like real lab machines).

To make that feature live, you would add this to appsettings.json:

"AnalyzerIntegration": {
  "Listeners": [
    {
      "AnalyzerId": "YOUR_ANALYZER_GUID_HERE",
      "Protocol": "ASTM",
      "Port": 5500
    }
  ]
}


This tells SynOS:

“Listen on port 5500 for ASTM analyzer messages, treat them as results from THIS analyzer.”