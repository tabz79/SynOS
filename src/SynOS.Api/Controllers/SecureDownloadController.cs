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
    private readonly ILogger<SecureDownloadController> _logger;

    public SecureDownloadController(IDeliveryService deliveryService, ILogger<SecureDownloadController> logger)
    {
        _deliveryService = deliveryService;
        _logger = logger;
    }

    [HttpGet("/r/{token}")]
    [HttpGet("/secure/r/{token}")]
    public async Task<IActionResult> LandingPage(string token)
    {
        // Simple HTML landing page (Premium look with Dual PACS + PDF Actions)
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
                    max-width: 440px;
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
                    <button id='viewPacsBtn' class='btn btn-secondary'>
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
                            document.getElementById('verifyForm').style.display = 'none';
                            actions.style.display = 'flex';

                            document.getElementById('downloadPdfBtn').onclick = function() {{
                                window.location.href = `/api/v1/public/reports/download/{token}?phone=` + phone;
                            }};

                            document.getElementById('viewPacsBtn').onclick = function() {{
                                window.location.href = `/pacs?token={token}&phone=` + phone;
                            }};
                        }} else {{
                            errorMsg.style.display = 'block';
                            btn.innerText = 'Verify Identity';
                            btn.disabled = false;
                        }}
                    }} catch (err) {{
                        // Fallback directly to pdf download if verify fails offline
                        window.location.href = `/api/v1/public/reports/download/{token}?phone=` + phone;
                    }}
                }};
            </script>
        </body>
        </html>";
        
        return Content(html, "text/html");
    }

    [HttpGet("verify-phone/{token}")]
    public async Task<IActionResult> VerifyPhone(string token, [FromQuery] string phone)
    {
        if (string.IsNullOrEmpty(phone)) return BadRequest(new { error = "Phone required" });
        try
        {
            await _deliveryService.VerifyAndDownloadAsync(token, phone);
            return Ok(new { valid = true });
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
        
        if (!secureLinkDetails.Valid) // Check the Valid property of the DTO
        {
            _logger.LogWarning("Secure link verification failed for token: {Token} (Invalid or Expired)", token);
            // Return 401 if invalid/expired, otherwise 404 if not found (though service handles not found by returning Valid = false)
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
            _logger.LogWarning("Download attempt for token {Token} failed: phone query parameter is missing.", token);
            return BadRequest(new { error = "Phone number is required." });
        }

        try
        {
            var fileStream = await _deliveryService.VerifyAndDownloadAsync(token, phone);
            
            // Diagnostics
            string absolutePath = "Unknown";
            long fileSize = 0;
            string fileHash = "Unknown";
            try
            {
                var downloadLink = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
                    Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.Include(
                        Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.Include(
                            context.DownloadLinks, dl => dl.Report), 
                        r => r.Report.ReportVersions),
                    dl => dl.Token == token);

                if (downloadLink != null)
                {
                    var latestReportVersion = downloadLink.Report.ReportVersions.OrderByDescending(rv => rv.VersionNumber).FirstOrDefault();
                    string? relativePath = latestReportVersion?.PdfPath ?? downloadLink.Report.PdfUrl;
                    if (!string.IsNullOrEmpty(relativePath))
                    {
                        var basePath = configuration["FileStorage:BasePath"] ?? "C:\\SynOS_Files";
                        absolutePath = System.IO.Path.Combine(basePath, relativePath);
                        if (System.IO.File.Exists(absolutePath))
                        {
                            var fileBytes = await System.IO.File.ReadAllBytesAsync(absolutePath);
                            fileSize = fileBytes.Length;
                            using var sha256 = System.Security.Cryptography.SHA256.Create();
                            var hashBytes = sha256.ComputeHash(fileBytes);
                            fileHash = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to compute diagnostics for token {Token}", token);
            }

            _logger.LogInformation("DOWNLOAD REPORT DIAGNOSTIC TRACE - Path: {AbsolutePath}, Size: {Size} bytes, SHA256: {Hash}", absolutePath, fileSize, fileHash);

            var fileName = $"Report_{token}.pdf"; 
            Response.Headers.Append("X-Content-Type-Options", "nosniff");
            Response.Headers.Append("X-Frame-Options", "DENY");
            Response.Headers.Append("Content-Security-Policy", "default-src 'none'");
            return File(fileStream, "application/pdf", fileName);
        }
        catch (BadHttpRequestException ex) when (ex.StatusCode == 401)
        {
            _logger.LogWarning("Secure download failed for token {Token} (phone mismatch/invalid): {Message}", token, ex.Message);
            return Unauthorized(new { error = ex.Message });
        }
        catch (BadHttpRequestException ex) when (ex.StatusCode == 400 || ex.StatusCode == 404)
        {
            _logger.LogWarning("Secure download failed for token {Token} (bad request/not found): {Message}", token, ex.Message);
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
            _logger.LogWarning("Download package attempt for token {Token} failed: phone query parameter is missing.", token);
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
            _logger.LogWarning("Secure download package failed for token {Token} (phone mismatch/invalid): {Message}", token, ex.Message);
            return Unauthorized(new { error = ex.Message });
        }
        catch (BadHttpRequestException ex) when (ex.StatusCode == 400 || ex.StatusCode == 404)
        {
            _logger.LogWarning("Secure download package failed for token {Token} (bad request/not found): {Message}", token, ex.Message);
            return BadRequest(new { error = ex.Message });
        }
    }
}
