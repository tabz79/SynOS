using System.Text.Json;
using Microsoft.Extensions.Primitives;
using Yarp.ReverseProxy.Configuration;

namespace SynOS.Gateway;

public class DynamicConfigProvider : IProxyConfigProvider
{
    private volatile CustomMemoryConfig _config;
    private readonly string _configFilePath;
    private readonly ILogger<DynamicConfigProvider> _logger;

    public DynamicConfigProvider(ILogger<DynamicConfigProvider> logger)
    {
        _logger = logger;
        
        var baseDir = "C:\\SynOS_Files";
        if (!Directory.Exists(baseDir))
        {
            try { Directory.CreateDirectory(baseDir); } catch { baseDir = AppContext.BaseDirectory; }
        }
        _configFilePath = Path.Combine(baseDir, "gateway-slot.json");

        int initialPort = LoadSavedPort();
        _config = CreateConfig(initialPort);
        _logger.LogInformation("[Gateway] Initialized upstream target port to {Port}", initialPort);
    }

    public int ActivePort => _config.ActivePort;

    public IProxyConfig GetConfig() => _config;

    public void SwitchPort(int newPort)
    {
        if (newPort <= 0 || newPort > 65535)
        {
            throw new ArgumentOutOfRangeException(nameof(newPort), "Invalid port number");
        }

        if (_config.ActivePort == newPort)
        {
            _logger.LogInformation("[Gateway] Switch requested for port {Port}, which is already active.", newPort);
            return;
        }

        _logger.LogInformation("[Gateway] Switching upstream target from {OldPort} to {NewPort}...", _config.ActivePort, newPort);
        
        var oldConfig = _config;
        _config = CreateConfig(newPort);
        SavePort(newPort);

        // Signal YARP to reload configuration
        oldConfig.SignalChange();
        _logger.LogInformation("[Gateway] Hot-swap complete! Upstream traffic is now routing to port {NewPort}", newPort);
    }

    private int LoadSavedPort()
    {
        try
        {
            if (File.Exists(_configFilePath))
            {
                var json = File.ReadAllText(_configFilePath);
                var doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("activePort", out var portProp) && portProp.TryGetInt32(out var port) && port > 0)
                {
                    return port;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[Gateway] Failed to read saved slot configuration from {Path}. Using default port 59998.", _configFilePath);
        }

        return 59998; // Default active slot A port
    }

    private void SavePort(int port)
    {
        try
        {
            var json = JsonSerializer.Serialize(new { activePort = port, updatedAt = DateTime.UtcNow });
            File.WriteAllText(_configFilePath, json);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[Gateway] Failed to persist active slot configuration to {Path}", _configFilePath);
        }
    }

    private CustomMemoryConfig CreateConfig(int port)
    {
        var route = new RouteConfig
        {
            RouteId = "synos-all-traffic",
            ClusterId = "synos-cluster",
            Match = new RouteMatch
            {
                Path = "{**catch-all}"
            }
        };

        var cluster = new ClusterConfig
        {
            ClusterId = "synos-cluster",
            Destinations = new Dictionary<string, DestinationConfig>(StringComparer.OrdinalIgnoreCase)
            {
                {
                    "active-slot",
                    new DestinationConfig
                    {
                        Address = $"http://127.0.0.1:{port}"
                    }
                }
            },
            HttpRequest = new Yarp.ReverseProxy.Forwarder.ForwarderRequestConfig
            {
                ActivityTimeout = TimeSpan.FromSeconds(300)
            }
        };

        return new CustomMemoryConfig(port, new[] { route }, new[] { cluster });
    }

    private class CustomMemoryConfig : IProxyConfig
    {
        private readonly CancellationTokenSource _cts = new();

        public CustomMemoryConfig(int activePort, IReadOnlyList<RouteConfig> routes, IReadOnlyList<ClusterConfig> clusters)
        {
            ActivePort = activePort;
            Routes = routes;
            Clusters = clusters;
            ChangeToken = new CancellationChangeToken(_cts.Token);
        }

        public int ActivePort { get; }
        public IReadOnlyList<RouteConfig> Routes { get; }
        public IReadOnlyList<ClusterConfig> Clusters { get; }
        public IChangeToken ChangeToken { get; }

        public void SignalChange()
        {
            _cts.Cancel();
        }
    }
}
