using System;
using System.IO;
using System.Text.Json;

namespace SynOS.RemoteBridge.Services
{
    public class BridgeConfig
    {
        public string ServerUrl { get; set; } = "https://synos.tbzlabs.in";
        public string LabId { get; set; } = "LAB001";
        public string ApiKey { get; set; } = "SYNOS_BRIDGE_SECRET_LAB001";
        public int DicomPort { get; set; } = 104;
        public int[] FallbackPorts { get; set; } = new[] { 104, 8899, 10411 };
        public string AeTitle { get; set; } = "SYNOS_BRIDGE";
        public string SpoolDir { get; set; } = "./spool";
        public bool AutoForward { get; set; } = true;
        public int WebPort { get; set; } = 5140;

        // Quick Scanner Ping test defaults
        public string ScannerIp { get; set; } = "192.168.1.100";
        public int ScannerPort { get; set; } = 104;
        public string ScannerAeTitle { get; set; } = "CT_SCANNER";

        private static readonly string ConfigPath = Path.Combine(AppContext.BaseDirectory, "bridge-config.json");
        private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

        public static BridgeConfig Load()
        {
            try
            {
                if (File.Exists(ConfigPath))
                {
                    var json = File.ReadAllText(ConfigPath);
                    var cfg = JsonSerializer.Deserialize<BridgeConfig>(json);
                    if (cfg != null) return cfg;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Config] Warning reading config file: {ex.Message}");
            }

            var defaultConfig = new BridgeConfig();
            defaultConfig.Save();
            return defaultConfig;
        }

        public void Save()
        {
            try
            {
                var json = JsonSerializer.Serialize(this, JsonOptions);
                File.WriteAllText(ConfigPath, json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Config] Error saving config file: {ex.Message}");
            }
        }
    }
}
