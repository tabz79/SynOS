using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;

namespace SynOS.Api.Controllers;

[ApiController]
[Route("api/webhooks/whatsapp")]
[AllowAnonymous]
public class WhatsAppWebhookProxyController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;

    public WhatsAppWebhookProxyController(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    [HttpGet]
    public async Task<IActionResult> Verify()
    {
        var client = _httpClientFactory.CreateClient();
        var queryString = Request.QueryString.Value;
        var targetUrl = $"http://localhost:5069/api/webhooks/whatsapp{queryString}";

        var response = await client.GetAsync(targetUrl);
        var content = await response.Content.ReadAsStringAsync();

        if (response.IsSuccessStatusCode)
        {
            return Content(content, "text/plain");
        }

        return StatusCode((int)response.StatusCode, content);
    }

    [HttpPost]
    public async Task<IActionResult> ReceiveEvent()
    {
        var client = _httpClientFactory.CreateClient();
        var targetUrl = "http://localhost:5069/api/webhooks/whatsapp";

        // Read raw body
        Request.EnableBuffering();
        using var reader = new System.IO.StreamReader(Request.Body, System.Text.Encoding.UTF8, detectEncodingFromByteOrderMarks: false, leaveOpen: true);
        var body = await reader.ReadToEndAsync();
        Request.Body.Position = 0;

        var requestMessage = new HttpRequestMessage(HttpMethod.Post, targetUrl)
        {
            Content = new StringContent(body, System.Text.Encoding.UTF8, Request.ContentType ?? "application/json")
        };

        // Forward headers (like X-Hub-Signature-256)
        if (Request.Headers.TryGetValue("X-Hub-Signature-256", out var signature))
        {
            requestMessage.Headers.TryAddWithoutValidation("X-Hub-Signature-256", signature.ToString());
        }

        var response = await client.SendAsync(requestMessage);
        var responseContent = await response.Content.ReadAsStringAsync();

        return StatusCode((int)response.StatusCode, responseContent);
    }
}
