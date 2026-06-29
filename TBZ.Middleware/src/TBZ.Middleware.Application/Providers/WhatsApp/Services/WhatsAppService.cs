using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TBZ.Middleware.Application.Configuration;
using TBZ.Middleware.Application.DTOs;
using TBZ.Middleware.Application.Interfaces;

namespace TBZ.Middleware.Application.Providers.WhatsApp.Services
{
    public class WhatsAppService : IWhatsAppService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<WhatsAppService> _logger;
        private readonly WhatsAppOptions _options;

        public WhatsAppService(
            IHttpClientFactory httpClientFactory,
            IOptions<WhatsAppOptions> options,
            ILogger<WhatsAppService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _options = options.Value;
        }

        private HttpClient GetClient()
        {
            var client = _httpClientFactory.CreateClient("WhatsAppClient");
            return client;
        }

        public async Task<WhatsAppSendResult> SendTemplateAsync(string recipient, string templateName, string language, object[] parameters)
        {
            try
            {
                var client = GetClient();
                var endpoint = $"{_options.PhoneNumberId}/messages";

                var payload = new
                {
                    messaging_product = "whatsapp",
                    recipient_type = "individual",
                    to = recipient,
                    type = "template",
                    template = new
                    {
                        name = templateName,
                        language = new
                        {
                            code = language
                        },
                        components = new object[]
                        {
                            new
                            {
                                type = "body",
                                parameters = parameters.Select(p => new
                                {
                                    type = "text",
                                    text = p?.ToString() ?? string.Empty
                                }).ToArray()
                            }
                        }
                    }
                };

                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                _logger.LogInformation("Sending WhatsApp template request: {Json}", json);
                var response = await client.PostAsync(endpoint, content);
                var responseBody = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("WhatsApp template response: {Status} {Body}", response.StatusCode, responseBody);

                if (response.IsSuccessStatusCode)
                {
                    using var doc = JsonDocument.Parse(responseBody);
                    var root = doc.RootElement;
                    var messageId = root.TryGetProperty("messages", out var msgProp) && msgProp.ValueKind == JsonValueKind.Array && msgProp.GetArrayLength() > 0
                        ? msgProp[0].TryGetProperty("id", out var idProp) ? idProp.GetString() : null
                        : null;

                    return new WhatsAppSendResult
                    {
                        Success = true,
                        MessageId = messageId,
                        RawResponse = responseBody
                    };
                }

                return new WhatsAppSendResult
                {
                    Success = false,
                    ErrorMessage = $"HTTP {response.StatusCode}: {responseBody}",
                    RawResponse = responseBody
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "WhatsApp template dispatch threw an exception.");
                return new WhatsAppSendResult
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        public async Task<WhatsAppSendResult> SendTextAsync(string recipient, string text)
        {
            try
            {
                var client = GetClient();
                var endpoint = $"{_options.PhoneNumberId}/messages";

                var payload = new
                {
                    messaging_product = "whatsapp",
                    recipient_type = "individual",
                    to = recipient,
                    type = "text",
                    text = new
                    {
                        preview_url = false,
                        body = text
                    }
                };

                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                _logger.LogInformation("Sending WhatsApp text request: {Json}", json);
                var response = await client.PostAsync(endpoint, content);
                var responseBody = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("WhatsApp text response: {Status} {Body}", response.StatusCode, responseBody);

                if (response.IsSuccessStatusCode)
                {
                    using var doc = JsonDocument.Parse(responseBody);
                    var root = doc.RootElement;
                    var messageId = root.TryGetProperty("messages", out var msgProp) && msgProp.ValueKind == JsonValueKind.Array && msgProp.GetArrayLength() > 0
                        ? msgProp[0].TryGetProperty("id", out var idProp) ? idProp.GetString() : null
                        : null;

                    return new WhatsAppSendResult
                    {
                        Success = true,
                        MessageId = messageId,
                        RawResponse = responseBody
                    };
                }

                return new WhatsAppSendResult
                {
                    Success = false,
                    ErrorMessage = $"HTTP {response.StatusCode}: {responseBody}",
                    RawResponse = responseBody
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "WhatsApp text dispatch threw an exception.");
                return new WhatsAppSendResult
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        public async Task<bool> MarkMessageAsReadAsync(string messageId)
        {
            try
            {
                var client = GetClient();
                var endpoint = $"{_options.PhoneNumberId}/messages";

                var payload = new
                {
                    messaging_product = "whatsapp",
                    status = "read",
                    message_id = messageId
                };

                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await client.PostAsync(endpoint, content);
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to mark message {MessageId} as read.", messageId);
                return false;
            }
        }

        public async Task<string> UploadMediaAsync(byte[] mediaBytes, string fileName, string mimeType)
        {
            try
            {
                var client = GetClient();
                var endpoint = $"{_options.PhoneNumberId}/media";

                using var form = new MultipartFormDataContent();
                var fileContent = new ByteArrayContent(mediaBytes);
                fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse(mimeType);
                form.Add(fileContent, "file", fileName);
                form.Add(new StringContent("whatsapp"), "messaging_product");

                var response = await client.PostAsync(endpoint, form);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    using var doc = JsonDocument.Parse(responseBody);
                    if (doc.RootElement.TryGetProperty("id", out var idProp))
                    {
                        return idProp.GetString() ?? string.Empty;
                    }
                }
                throw new InvalidOperationException($"Media upload failed. Status: {response.StatusCode}. Response: {responseBody}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Media upload threw an exception.");
                throw;
            }
        }

        public async Task<WhatsAppSendResult> SendDocumentAsync(string recipient, string mediaId, string fileName, string? caption = null)
        {
            try
            {
                var client = GetClient();
                var endpoint = $"{_options.PhoneNumberId}/messages";

                var payload = new
                {
                    messaging_product = "whatsapp",
                    recipient_type = "individual",
                    to = recipient,
                    type = "document",
                    document = new
                    {
                        id = mediaId,
                        filename = fileName,
                        caption = caption
                    }
                };

                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await client.PostAsync(endpoint, content);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    using var doc = JsonDocument.Parse(responseBody);
                    var messageId = doc.RootElement.GetProperty("messages")[0].GetProperty("id").GetString();
                    return new WhatsAppSendResult { Success = true, MessageId = messageId, RawResponse = responseBody };
                }
                return new WhatsAppSendResult { Success = false, ErrorMessage = responseBody, RawResponse = responseBody };
            }
            catch (Exception ex)
            {
                return new WhatsAppSendResult { Success = false, ErrorMessage = ex.Message };
            }
        }

        public async Task<WhatsAppSendResult> SendImageAsync(string recipient, string mediaId, string? caption = null)
        {
            try
            {
                var client = GetClient();
                var endpoint = $"{_options.PhoneNumberId}/messages";

                var payload = new
                {
                    messaging_product = "whatsapp",
                    recipient_type = "individual",
                    to = recipient,
                    type = "image",
                    image = new
                    {
                        id = mediaId,
                        caption = caption
                    }
                };

                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await client.PostAsync(endpoint, content);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    using var doc = JsonDocument.Parse(responseBody);
                    var messageId = doc.RootElement.GetProperty("messages")[0].GetProperty("id").GetString();
                    return new WhatsAppSendResult { Success = true, MessageId = messageId, RawResponse = responseBody };
                }
                return new WhatsAppSendResult { Success = false, ErrorMessage = responseBody, RawResponse = responseBody };
            }
            catch (Exception ex)
            {
                return new WhatsAppSendResult { Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}
