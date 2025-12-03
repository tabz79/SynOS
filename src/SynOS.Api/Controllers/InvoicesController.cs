using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SynOS.Api;
using SynOS.Models.DTOs;
using SynOS.Services;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/invoices")]
    [Authorize(Policy = "ReceptionPolicy")]
    public class InvoicesController : ControllerBase
    {
        private readonly IInvoiceService _invoiceService;
        private readonly ILogger<InvoicesController> _logger;

        public InvoicesController(IInvoiceService invoiceService, ILogger<InvoicesController> logger)
        {
            _invoiceService = invoiceService;
            _logger = logger;
        }

        [HttpGet("{id}/print")]
        public async Task<IActionResult> GetInvoiceForPrinting(Guid id)
        {
            try
            {
                var printDto = await _invoiceService.GetInvoiceForPrintingAsync(id);
                return Ok(new ApiResponse<InvoicePrintDto>(printDto));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { code = "NOT_FOUND", message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating print data for invoice {InvoiceId}", id);
                return StatusCode(500, new { code = "INTERNAL_SERVER_ERROR", message = "An internal error occurred." });
            }
        }
    }
}
