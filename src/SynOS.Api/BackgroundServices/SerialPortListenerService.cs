using System;
using System.Collections.Concurrent;
using System.IO.Ports;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Services;
using SynOS.Services.AnalyzerIntegration;

namespace SynOS.Api.BackgroundServices
{
    public class SerialPortListenerService : BackgroundService
    {
        private readonly ILogger<SerialPortListenerService> _logger;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ConcurrentDictionary<Guid, SerialPort> _activePorts = new();

        public SerialPortListenerService(
            ILogger<SerialPortListenerService> logger,
            IServiceScopeFactory scopeFactory)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Serial Port Listener Service (RS-232 ASTM/HL7) starting...");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await SyncSerialListenersAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error syncing serial port listeners.");
                }

                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            }

            CloseAllPorts();
            _logger.LogInformation("Serial Port Listener Service stopped.");
        }

        private async Task SyncSerialListenersAsync(CancellationToken stoppingToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();

            var serialConfigs = context.AnalyzerListeners
                .Where(l => l.IsActive && l.ConnectionMode == "SerialCom" && !string.IsNullOrEmpty(l.SerialPortName))
                .ToList();

            var activeIds = serialConfigs.Select(c => c.AnalyzerId).ToHashSet();

            // Close ports no longer active
            foreach (var key in _activePorts.Keys.ToList())
            {
                if (!activeIds.Contains(key))
                {
                    if (_activePorts.TryRemove(key, out var port))
                    {
                        try
                        {
                            if (port.IsOpen) port.Close();
                            port.Dispose();
                            _logger.LogInformation("Closed serial port for Analyzer {AnalyzerId}", key);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error closing serial port for Analyzer {AnalyzerId}", key);
                        }
                    }
                }
            }

            // Open or maintain active ports
            foreach (var config in serialConfigs)
            {
                if (stoppingToken.IsCancellationRequested) break;

                if (!_activePorts.ContainsKey(config.AnalyzerId))
                {
                    try
                    {
                        var parity = Enum.TryParse<Parity>(config.Parity, true, out var p) ? p : Parity.None;
                        var stopBits = Enum.TryParse<StopBits>(config.StopBits, true, out var sb) ? sb : StopBits.One;
                        var handshake = Enum.TryParse<Handshake>(config.Handshake, true, out var hs) ? hs : Handshake.None;

                        var port = new SerialPort(
                            config.SerialPortName!,
                            config.BaudRate > 0 ? config.BaudRate : 9600,
                            parity,
                            config.DataBits > 0 ? config.DataBits : 8,
                            stopBits)
                        {
                            Handshake = handshake,
                            ReadTimeout = 5000,
                            WriteTimeout = 5000
                        };

                        var buffer = new StringBuilder();

                        port.DataReceived += (s, e) =>
                        {
                            try
                            {
                                var sp = (SerialPort)s!;
                                var inData = sp.ReadExisting();
                                buffer.Append(inData);

                                var raw = buffer.ToString();
                                // Check for framing end tokens (CRLF / ETX 0x03 / EOT 0x04)
                                if (raw.Contains('\r') || raw.Contains('\n') || raw.Contains('\x03') || raw.Contains('\x04'))
                                {
                                    buffer.Clear();
                                    _ = ProcessRawMessageAsync(raw, config.AnalyzerId, config.Protocol);
                                }
                            }
                            catch (Exception rxEx)
                            {
                                _logger.LogError(rxEx, "Error reading data from serial port {PortName}", config.SerialPortName);
                            }
                        };

                        port.Open();
                        _activePorts[config.AnalyzerId] = port;
                        _logger.LogInformation("Successfully opened RS-232 Serial Port {PortName} (Baud: {Baud}) for Analyzer {AnalyzerId}",
                            config.SerialPortName, config.BaudRate, config.AnalyzerId);
                    }
                    catch (Exception openEx)
                    {
                        _logger.LogWarning("Failed to open RS-232 Serial Port {PortName} for Analyzer {AnalyzerId}: {Message}",
                            config.SerialPortName, config.AnalyzerId, openEx.Message);
                    }
                }
            }
        }

        private async Task ProcessRawMessageAsync(string rawMessage, Guid analyzerId, string protocolType)
        {
            if (string.IsNullOrWhiteSpace(rawMessage)) return;

            using var scope = _scopeFactory.CreateScope();
            var parserFactory = scope.ServiceProvider.GetRequiredService<IAnalyzerProtocolParserFactory>();
            var labAnalyzerService = scope.ServiceProvider.GetRequiredService<ILabAnalyzerService>();

            try
            {
                var parser = parserFactory.GetParser(protocolType);
                var parsedResult = parser.Parse(rawMessage);
                if (parsedResult != null && string.IsNullOrEmpty(parsedResult.ErrorMessage))
                {
                    parsedResult.AnalyzerId = analyzerId;
                    var manualResultDto = new Models.DTOs.LabAnalyzers.ManualAnalyzerResultDto
                    {
                        RawMessage = rawMessage,
                        PatientIdentifier = parsedResult.PatientIdentifier,
                        AnalyzerTestCode = parsedResult.AnalyzerTestCode,
                        ResultValue = parsedResult.Value,
                        Units = parsedResult.Units,
                        Flags = parsedResult.Flags
                    };
                    await labAnalyzerService.EnqueueManualResultAsync(analyzerId, manualResultDto, Guid.Empty);
                    _logger.LogInformation("RS-232 Serial Ingest: Enqueued result from Analyzer {AnalyzerId}. Patient: {PatientIdentifier}, Test: {TestCode}",
                        analyzerId, parsedResult.PatientIdentifier, parsedResult.AnalyzerTestCode);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing RS-232 raw message from Analyzer {AnalyzerId}", analyzerId);
            }
        }

        private void CloseAllPorts()
        {
            foreach (var kvp in _activePorts)
            {
                try
                {
                    if (kvp.Value.IsOpen) kvp.Value.Close();
                    kvp.Value.Dispose();
                }
                catch { }
            }
            _activePorts.Clear();
        }
    }
}
