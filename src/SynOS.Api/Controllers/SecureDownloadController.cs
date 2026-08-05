using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs;
using SynOS.Services;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http; // Needed for FileStreamResult
using Microsoft.AspNetCore.Authorization; // Added for AllowAnonymous


namespace SynOS.Api.Controllers;

[ApiController]
[Route("api/v1/public/reports")]
[AllowAnonymous] // Allow public access to this controller
public class SecureDownloadController : ControllerBase
{
    private readonly IDeliveryService _deliveryService;
    private readonly IPacsService _pacsService;
    private readonly ILogger<SecureDownloadController> _logger;

    public SecureDownloadController(
        IDeliveryService deliveryService,
        IPacsService pacsService,
        ILogger<SecureDownloadController> logger)
    {
        _deliveryService = deliveryService;
        _pacsService = pacsService;
        _logger = logger;
    }

    [HttpGet("/r/{token}")]
    [HttpGet("/secure/r/{token}")]
    public async Task<IActionResult> LandingPage(string token)
    {
        var html = $@"
        <!DOCTYPE html>
        <html lang='en'>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Secure Medical Portal | SynOS</title>
            <link href='https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap' rel='stylesheet'>
            <style>
                body {{ 
                    font-family: 'Inter', sans-serif; 
                    background: #09090b; 
                    color: white; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    min-height: 100vh; 
                    margin: 0; 
                    padding: 1rem;
                    box-sizing: border-box;
                }}
                .card {{
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.08);
                    padding: 2.5rem;
                    border-radius: 2rem;
                    text-align: center;
                    max-width: 460px;
                    width: 100%;
                    backdrop-filter: blur(20px);
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
                }}
                .logo {{ 
                    color: #10b981; 
                    font-weight: 900; 
                    font-size: 1.5rem; 
                    letter-spacing: -0.05em; 
                    margin-bottom: 1.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }}
                h1 {{ font-size: 1.4rem; font-weight: 900; letter-spacing: -0.025em; margin-bottom: 0.5rem; }}
                p {{ color: #a1a1aa; font-size: 0.85rem; margin-bottom: 1.5rem; line-height: 1.5; }}
                .input-group {{ text-align: left; margin-bottom: 1.5rem; }}
                label {{ font-size: 0.65rem; font-weight: 900; text-transform: uppercase; color: #71717a; letter-spacing: 0.1em; margin-left: 0.5rem; }}
                input {{
                    width: 100%;
                    background: #18181b;
                    border: 1px solid #27272a;
                    border-radius: 1rem;
                    padding: 0.9rem;
                    color: white;
                    font-family: monospace;
                    font-size: 1.2rem;
                    margin-top: 0.5rem;
                    box-sizing: border-box;
                    text-align: center;
                    letter-spacing: 0.15em;
                }}
                input:focus {{ outline: 2px solid #10b981; border-color: transparent; }}
                .btn {{
                    width: 100%;
                    background: #10b981;
                    color: white;
                    border: none;
                    border-radius: 1rem;
                    padding: 1rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    font-size: 0.85rem;
                }}
                .btn:hover {{ background: #059669; transform: translateY(-1px); }}
                .btn-secondary {{
                    background: #27272a;
                    color: #e4e4e7;
                    margin-top: 0.75rem;
                }}
                .btn-secondary:hover {{ background: #3f3f46; }}
                .actions {{ display: none; margin-top: 1.5rem; flex-direction: column; gap: 0.75rem; }}
                .error-msg {{ color: #ef4444; font-size: 0.8rem; font-weight: 600; margin-top: 0.75rem; display: none; }}
                .footer {{ margin-top: 2rem; font-size: 0.75rem; color: #52525b; }}
            </style>
        </head>
        <body>
            <div class='card'>
                <div class='logo'>
                    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10'/></svg>
                    SynOS Medical Portal
                </div>
                <h1>Verify Access</h1>
                <p>Enter the 10-digit mobile number registered at the lab to view your results and diagnostic imaging.</p>
                
                <form id='verifyForm'>
                    <div class='input-group'>
                        <label>Registered Mobile Number</label>
                        <input type='tel' id='phone' placeholder='98XXXXXXXX' maxlength='10' required>
                    </div>
                    <button type='submit' id='submitBtn' class='btn'>Verify Identity</button>
                    <div id='errorMsg' class='error-msg'>Mobile number mismatch. Please verify and try again.</div>
                </form>

                <div id='actions' class='actions'>
                    <button id='downloadPdfBtn' class='btn'>
                        📄 View / Download Signed PDF Report
                    </button>
                    <button id='downloadZipBtn' class='btn btn-secondary'>
                        📦 Download Complete Study Archive (.zip)
                    </button>
                    <button id='viewPacsBtn' class='btn btn-secondary' style='display: none;'>
                        🔬 Launch Interactive DICOM PACS Viewer
                    </button>
                </div>

                <div class='footer'>
                    &copy; {DateTime.UtcNow.Year} SynOS Lab Intelligence • Diagnostic PACS
                </div>
            </div>

            <script>
                document.getElementById('verifyForm').onsubmit = async function(e) {{
                    e.preventDefault();
                    const phone = document.getElementById('phone').value.trim();
                    const btn = document.getElementById('submitBtn');
                    const errorMsg = document.getElementById('errorMsg');
                    const actions = document.getElementById('actions');

                    errorMsg.style.display = 'none';
                    btn.innerText = 'Verifying...';
                    btn.disabled = true;

                    try {{
                        const res = await fetch(`/api/v1/public/reports/verify-phone/{token}?phone=` + phone);
                        if (res.ok) {{
                            const data = await res.json();
                            sessionStorage.setItem('synos_public_phone', phone);
                            sessionStorage.setItem('synos_public_token', '{token}');

                            document.getElementById('verifyForm').style.display = 'none';
                            actions.style.display = 'flex';

                            document.getElementById('downloadPdfBtn').onclick = function() {{
                                window.location.href = `/api/v1/public/reports/download/{token}?phone=` + phone;
                            }};

                            document.getElementById('downloadZipBtn').onclick = function() {{
                                window.location.href = `/api/v1/public/reports/download-package/{token}?phone=` + phone;
                            }};

                            if (data.isRadiology) {{
                                const pacsBtn = document.getElementById('viewPacsBtn');
                                pacsBtn.style.display = 'flex';
                                pacsBtn.onclick = function() {{
                                    window.location.href = `/r/{token}/viewer`;
                                }};
                            }}
                        }} else {{
                            errorMsg.style.display = 'block';
                            btn.innerText = 'Verify Identity';
                            btn.disabled = false;
                        }}
                    }} catch (err) {{
                        window.location.href = `/api/v1/public/reports/download/{token}?phone=` + phone;
                    }}
                }};
            </script>
        </body>
        </html>";
        
        return Content(html, "text/html");
    }

    [HttpGet("verify-phone/{token}")]
    public async Task<IActionResult> VerifyPhone(
        string token, 
        [FromQuery] string phone,
        [FromServices] SynOS.Data.SynOSDbContext context)
    {
        if (string.IsNullOrEmpty(phone)) return BadRequest(new { error = "Phone required" });
        try
        {
            await _deliveryService.VerifyAndDownloadAsync(token, phone);
            
            var downloadLink = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
                Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.Include(context.DownloadLinks, dl => dl.Report),
                dl => dl.Token == token);

            bool isRadiology = downloadLink?.Report?.SourceType == "RadiologyStudy";
            Guid? radiologyStudyId = isRadiology ? downloadLink?.Report?.SourceId : null;

            return Ok(new { 
                valid = true,
                isRadiology = isRadiology,
                radiologyStudyId = radiologyStudyId
            });
        }
        catch (Exception ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    [HttpGet("verify/{token}")]
    [ProducesResponseType(typeof(SecureLinkVerificationDto), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> VerifyLink(string token)
    {
        var secureLinkDetails = await _deliveryService.GetSecureLinkVerificationDetailsAsync(token);
        if (!secureLinkDetails.Valid)
        {
            _logger.LogWarning("Secure link verification failed for token: {Token}", token);
            return Unauthorized(new { error = "InvalidLinkOrExpired" });
        }
        return Ok(secureLinkDetails);
    }

    [HttpGet("download/{token}")]
    [ProducesResponseType(typeof(FileStreamResult), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> DownloadReport(
        string token, 
        [FromQuery] string phone,
        [FromServices] SynOS.Data.SynOSDbContext context,
        [FromServices] Microsoft.Extensions.Configuration.IConfiguration configuration)
    {
        if (string.IsNullOrEmpty(phone))
        {
            return BadRequest(new { error = "Phone number is required." });
        }

        try
        {
            var fileStream = await _deliveryService.VerifyAndDownloadAsync(token, phone);
            var fileName = $"Report_{token}.pdf"; 
            Response.Headers.Append("X-Content-Type-Options", "nosniff");
            Response.Headers.Append("X-Frame-Options", "DENY");
            Response.Headers.Append("Content-Security-Policy", "default-src 'none'");
            return File(fileStream, "application/pdf", fileName);
        }
        catch (BadHttpRequestException ex) when (ex.StatusCode == 401)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (BadHttpRequestException ex) when (ex.StatusCode == 400 || ex.StatusCode == 404)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("download-package/{token}")]
    [ProducesResponseType(typeof(FileStreamResult), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> DownloadReportPackage(string token, [FromQuery] string phone)
    {
        if (string.IsNullOrEmpty(phone))
        {
            return BadRequest(new { error = "Phone number is required." });
        }

        try
        {
            var fileStream = await _deliveryService.DownloadReportPackageAsync(token, phone);
            var fileName = $"ReportPackage_{token}.zip"; 
            Response.Headers.Append("X-Content-Type-Options", "nosniff");
            Response.Headers.Append("X-Frame-Options", "DENY");
            Response.Headers.Append("Content-Security-Policy", "default-src 'none'");
            return File(fileStream, "application/zip", fileName);
        }
        catch (BadHttpRequestException ex) when (ex.StatusCode == 401)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (BadHttpRequestException ex) when (ex.StatusCode == 400 || ex.StatusCode == 404)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("viewer/{token}/series-tree")]
    public async Task<IActionResult> GetPublicSeriesTree(
        string token,
        [FromQuery] string phone,
        [FromServices] SynOS.Data.SynOSDbContext context)
    {
        if (string.IsNullOrEmpty(phone)) return BadRequest(new { error = "Phone required" });

        try
        {
            await _deliveryService.VerifyAndDownloadAsync(token, phone);

            var downloadLink = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
                Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.Include(context.DownloadLinks, dl => dl.Report),
                dl => dl.Token == token);

            if (downloadLink?.Report?.SourceType != "RadiologyStudy")
            {
                return BadRequest(new { error = "Not a radiology study" });
            }

            var radiologyStudyId = downloadLink.Report.SourceId;
            var request = HttpContext.Request;
            var apiBaseUrl = $"{request.Scheme}://{request.Host.ToUriComponent()}";

            var seriesTree = await _pacsService.GetSeriesTreeAsync(radiologyStudyId, Guid.Empty, apiBaseUrl);

            // Re-map instance stream URLs to use public streaming endpoint with phone authentication
            foreach (var series in seriesTree.Series)
            {
                foreach (var inst in series.Instances)
                {
                    inst.Wadouri = $"/api/v1/public/reports/viewer/{token}/instances/{inst.InstanceId}/file?phone={Uri.EscapeDataString(phone)}";
                }
            }

            return Ok(seriesTree);
        }
        catch (Exception ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    [HttpGet("viewer/{token}/instances/{instanceId:guid}/file")]
    public async Task<IActionResult> GetPublicDicomFile(
        string token,
        Guid instanceId,
        [FromQuery] string phone)
    {
        if (string.IsNullOrEmpty(phone)) return BadRequest(new { error = "Phone required" });

        try
        {
            await _deliveryService.VerifyAndDownloadAsync(token, phone);

            var (stream, contentType) = await _pacsService.GetDicomStreamAsync(instanceId, Guid.Empty);
            return File(stream, contentType, $"{instanceId}.dcm");
        }
        catch (Exception ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }
}
