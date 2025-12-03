namespace SynOS.Services;

public interface IPrintService
{
    Task QueuePrintAsync(Guid reportId, string pdfUrl);
}
