using System;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SynOS.Data; // Added
using SynOS.Models.Configuration;
using SynOS.Models.Entities;
using SynOS.Models.Enums;
using SynOS.Services;
using SynOS.Services.AnalyzerIntegration;

namespace SynOS.Api.BackgroundServices
{
    public class AnalyzerTcpListenerService : BackgroundService
    {
        private readonly ILogger<AnalyzerTcpListenerService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly AnalyzerIntegrationSettings _settings;
        private readonly List<TcpListener> _listeners = new List<TcpListener>();

        public AnalyzerTcpListenerService(
            ILogger<AnalyzerTcpListenerService> logger,
            IServiceProvider serviceProvider,
            IOptions<AnalyzerIntegrationSettings> settings)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _settings = settings.Value;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Analyzer TCP Listener Service starting...");

            if (!_settings.Listeners.Any())
            {
                _logger.LogWarning("No analyzer TCP listeners configured in appsettings.json.");
                return;
            }

            foreach (var config in _settings.Listeners)
            {
                try
                {
                    var listener = new TcpListener(IPAddress.Any, config.Port);
                    listener.Start();
                    _listeners.Add(listener);
                    _logger.LogInformation("Listening for {Protocol} on port {Port} for Analyzer {AnalyzerId}",
                        config.Protocol, config.Port, config.AnalyzerId);

                    _ = Task.Run(() => ListenForConnections(listener, config, stoppingToken), stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to start listener for {Protocol} on port {Port} for Analyzer {AnalyzerId}",
                        config.Protocol, config.Port, config.AnalyzerId);
                }
            }

            await Task.Delay(Timeout.Infinite, stoppingToken); // Keep service running
        }

        private async Task ListenForConnections(TcpListener listener, AnalyzerListenerConfig config, CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var client = await listener.AcceptTcpClientAsync(stoppingToken);
                    _logger.LogInformation("Client connected from {RemoteEndPoint} for Analyzer {AnalyzerId}",
                        client.Client.RemoteEndPoint, config.AnalyzerId);

                    _ = Task.Run(() => HandleClientAsync(client, config, stoppingToken), stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    // Listener was stopped
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error accepting client connection for Analyzer {AnalyzerId}", config.AnalyzerId);
                }
            }
        }

        private async Task HandleClientAsync(TcpClient client, AnalyzerListenerConfig config, CancellationToken stoppingToken)
        {
            using (client)
            {
                var stream = client.GetStream();
                var buffer = new byte[4096];
                var rawMessageBuilder = new StringBuilder();

                try
                {
                    int bytesRead;
                    // Read until client disconnects or specific end-of-message character (e.g., EOT for ASTM, segment terminator for HL7)
                    // For simplicity, we'll read until no more bytes or a timeout.
                    // Real-world scenarios would need more sophisticated protocol-specific framing.
                    while ((bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length, stoppingToken)) != 0)
                    {
                        rawMessageBuilder.Append(Encoding.ASCII.GetString(buffer, 0, bytesRead));
                        // Acknowledge receipt (e.g., for ASTM/HL7, typically ACK/NAK)
                        // For a basic implementation, we might just send a generic ACK
                        // await SendAcknowledgement(stream, config.Protocol, stoppingToken);
                    }

                    var rawMessage = rawMessageBuilder.ToString();
                    if (!string.IsNullOrWhiteSpace(rawMessage))
                    {
                        await ProcessRawMessage(rawMessage, config.AnalyzerId, config.Protocol);
                    }
                }
                catch (OperationCanceledException)
                {
                    _logger.LogInformation("Client handling for Analyzer {AnalyzerId} cancelled.", config.AnalyzerId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error handling client connection for Analyzer {AnalyzerId}", config.AnalyzerId);
                }
            }
        }

        private async Task ProcessRawMessage(string rawMessage, Guid analyzerId, string protocolType)
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var parserFactory = scope.ServiceProvider.GetRequiredService<IAnalyzerProtocolParserFactory>();
                var labAnalyzerService = scope.ServiceProvider.GetRequiredService<ILabAnalyzerService>();
                var logger = scope.ServiceProvider.GetRequiredService<ILogger<AnalyzerTcpListenerService>>(); // Get specific logger for scope

                AnalyzerParsedResult? parsedResult = null;
                try
                {
                    var parser = parserFactory.GetParser(protocolType);
                    parsedResult = parser.Parse(rawMessage);
                    parsedResult.AnalyzerId = analyzerId; // Set analyzer ID from config

                    if (!string.IsNullOrEmpty(parsedResult.ErrorMessage))
                    {
                        logger.LogError("Parsing error for Analyzer {AnalyzerId}, Protocol {Protocol}: {ErrorMessage}", analyzerId, protocolType, parsedResult.ErrorMessage);
                        // Enqueue with ParseError status
                        await EnqueueParsingError(analyzerId, rawMessage, parsedResult.ErrorMessage);
                        return;
                    }

                    var manualResultDto = new Models.DTOs.LabAnalyzers.ManualAnalyzerResultDto
                    {
                        RawMessage = parsedResult.RawMessage,
                        PatientIdentifier = parsedResult.PatientIdentifier,
                        AnalyzerTestCode = parsedResult.AnalyzerTestCode,
                        ResultValue = parsedResult.Value,
                        Units = parsedResult.Units,
                        Flags = parsedResult.Flags,
                        MeasuredAt = DateTimeOffset.UtcNow // Assuming measurement time is now if not in parsed result
                    };

                    // Use currentUserId = Guid.Empty since it's from machine, or a specific system user ID
                    await labAnalyzerService.EnqueueManualResultAsync(analyzerId, manualResultDto, Guid.Empty); 
                    logger.LogInformation("Successfully enqueued result from Analyzer {AnalyzerId}, Protocol {Protocol}. Patient: {PatientIdentifier}, Test: {TestCode}",
                        analyzerId, protocolType, parsedResult.PatientIdentifier, parsedResult.AnalyzerTestCode);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Unhandled error processing raw message from Analyzer {AnalyzerId}, Protocol {Protocol}", analyzerId, protocolType);
                    await EnqueueParsingError(analyzerId, rawMessage, ex.Message);
                }
            }
        }

        private async Task EnqueueParsingError(Guid analyzerId, string rawMessage, string errorMessage)
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();
                var logger = scope.ServiceProvider.GetRequiredService<ILogger<AnalyzerTcpListenerService>>();

                try
                {
                    var errorInboxItem = new LabAnalyzerResultInbox
                    {
                        InboxId = Guid.NewGuid(),
                        AnalyzerId = analyzerId,
                        RawMessage = rawMessage,
                        Status = LabAnalyzerResultStatus.ParseError, // New status
                        ErrorMessage = errorMessage, // Store the error message
                        ReceivedAt = DateTimeOffset.UtcNow,
                        ReceivedBy = Guid.Empty, // Machine-generated
                        CreatedAt = DateTimeOffset.UtcNow,
                        CreatedBy = Guid.Empty
                    };
                    context.LabAnalyzerResultInbox.Add(errorInboxItem);
                    await context.SaveChangesAsync();
                    logger.LogWarning("Raw message with parsing error enqueued to inbox for Analyzer {AnalyzerId}.", analyzerId);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Failed to enqueue parsing error message to inbox for Analyzer {AnalyzerId}.", analyzerId);
                }
            }
        }

        public override async Task StopAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Analyzer TCP Listener Service stopping...");
            foreach (var listener in _listeners)
            {
                listener.Stop();
            }
            await base.StopAsync(stoppingToken);
            _logger.LogInformation("Analyzer TCP Listener Service stopped.");
        }
    }
}
