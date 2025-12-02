using Microsoft.Extensions.Logging;

namespace SynOS.Services.Stubs;

public class StubPrintService : IPrintService
{
    private readonly ILogger<StubPrintService> _logger;

    public StubPrintService(ILogger<StubPrintService> logger)
    {
        _logger = logger;
    }

    public Task QueuePrintAsync(Guid reportId, string pdfUrl)
    {
        _logger.LogInformation("STUB: Queuing print for Report {ReportId} from URL: {PdfUrl}", reportId, pdfUrl);
        return Task.CompletedTask;
    }
}
