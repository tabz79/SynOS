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
        private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, (int bodyCount, int buttonCount)> _templateParamCache = 
            new System.Collections.Concurrent.ConcurrentDictionary<string, (int, int)>();

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

        private void LogRuntimeUrl(HttpClient client, string endpoint)
        {
            var resolvedUri = new Uri(client.BaseAddress!, endpoint);
            _logger.LogInformation("[RUNTIME URL DEB] client.BaseAddress: {BaseAddress}", client.BaseAddress);
            _logger.LogInformation("[RUNTIME URL DEB] _options.PhoneNumberId: {PhoneNumberId}", _options.PhoneNumberId);
            _logger.LogInformation("[RUNTIME URL DEB] endpoint: {Endpoint}", endpoint);
            _logger.LogInformation("[RUNTIME URL DEB] Fully resolved request URI: {ResolvedUri}", resolvedUri);
            _logger.LogInformation("[RUNTIME URL DEB] Loaded Config - WhatsApp:BaseUrl: {BaseUrl}", _options.BaseUrl);
            _logger.LogInformation("[RUNTIME URL DEB] Loaded Config - WhatsApp:GraphApiVersion: {GraphApiVersion}", _options.GraphApiVersion);
            _logger.LogInformation("[RUNTIME URL DEB] Loaded Config - WhatsApp:PhoneNumberId: {ConfigPhoneNumberId}", _options.PhoneNumberId);
        }

        public async Task<WhatsAppSendResult> SendTemplateAsync(string recipient, string templateName, string language, object[] parameters)
        {
            try
            {
                var client = GetClient();
                var endpoint = $"{_options.PhoneNumberId}/messages";

                var (bodyCount, buttonCount) = await GetTemplateParamCountsAsync(templateName, language);

                var componentsList = new System.Collections.Generic.List<object>();

                if (bodyCount > 0 || buttonCount > 0)
                {
                    var bodyParams = parameters.Take(bodyCount).ToArray();
                    var buttonParams = parameters.Skip(bodyCount).Take(buttonCount).ToArray();

                    if (buttonParams.Length == 0 && buttonCount > 0)
                    {
                        var urlParam = bodyParams.FirstOrDefault(p => p?.ToString()?.Contains("://") == true);
                        if (urlParam != null)
                        {
                            buttonParams = new object[] { urlParam };
                            _logger.LogInformation("[PARAM DEBUG] Auto-filled button parameters from body parameter URL: {Url}", urlParam);
                        }
                        else if (bodyParams.Length > 0)
                        {
                            buttonParams = new object[] { bodyParams.Last() };
                            _logger.LogInformation("[PARAM DEBUG] Auto-filled button parameters from last body parameter: {Val}", bodyParams.Last());
                        }
                    }

                    componentsList.Add(new
                    {
                        type = "body",
                        parameters = bodyParams.Select(p => new
                        {
                            type = "text",
                            text = p?.ToString() ?? string.Empty
                        }).ToArray()
                    });

                    if (buttonParams.Length > 0)
                    {
                        componentsList.Add(new
                        {
                            type = "button",
                            sub_type = "url",
                            index = "0",
                            parameters = buttonParams.Select(p => new
                            {
                                type = "text",
                                text = ExtractUrlSuffix(p?.ToString() ?? string.Empty)
                            }).ToArray()
                        });
                    }
                }
                else
                {
                    componentsList.Add(new
                    {
                        type = "body",
                        parameters = parameters.Select(p => new
                        {
                            type = "text",
                            text = p?.ToString() ?? string.Empty
                        }).ToArray()
                    });
                }

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
                        components = componentsList.ToArray()
                    }
                };

                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                _logger.LogInformation("Sending WhatsApp template request: {Json}", json);
                LogRuntimeUrl(client, endpoint);
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

        private async Task<(int bodyCount, int buttonCount)> GetTemplateParamCountsAsync(string templateName, string language)
        {
            var cacheKey = $"{templateName}:{language}";
            if (_templateParamCache.TryGetValue(cacheKey, out var counts))
            {
                _logger.LogInformation("[PARAM DEBUG] Cache hit for {CacheKey}: Body={Body}, Button={Button}", cacheKey, counts.bodyCount, counts.buttonCount);
                return counts;
            }

            try
            {
                var client = GetClient();
                var endpoint = $"{_options.BusinessAccountId}/message_templates?name={Uri.EscapeDataString(templateName)}";
                _logger.LogInformation("[PARAM DEBUG] Querying Meta templates endpoint: {Endpoint}", endpoint);
                var response = await client.GetAsync(endpoint);
                _logger.LogInformation("[PARAM DEBUG] Response status: {Status}", response.StatusCode);
                if (response.IsSuccessStatusCode)
                {
                    var body = await response.Content.ReadAsStringAsync();
                    _logger.LogInformation("[PARAM DEBUG] Response body: {Body}", body);
                    using var doc = JsonDocument.Parse(body);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("data", out var dataProp) && dataProp.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var item in dataProp.EnumerateArray())
                        {
                            var itemLang = item.TryGetProperty("language", out var langProp) ? langProp.GetString() : string.Empty;
                            var itemStatus = item.TryGetProperty("status", out var statusProp) ? statusProp.GetString() : string.Empty;
                            
                            _logger.LogInformation("[PARAM DEBUG] Inspecting template: Name={Name}, Lang={Lang} (expected {ExpectedLang}), Status={Status} (expected APPROVED)", 
                                item.TryGetProperty("name", out var n) ? n.GetString() : "N/A", itemLang, language, itemStatus);

                            if (itemLang == language && itemStatus == "APPROVED")
                            {
                                int bodyCount = 0;
                                int buttonCount = 0;

                                if (item.TryGetProperty("components", out var componentsProp) && componentsProp.ValueKind == JsonValueKind.Array)
                                {
                                    foreach (var comp in componentsProp.EnumerateArray())
                                    {
                                        var type = comp.TryGetProperty("type", out var typeProp) ? typeProp.GetString() : string.Empty;
                                        if (type == "BODY" && comp.TryGetProperty("text", out var textProp))
                                        {
                                            var text = textProp.GetString() ?? string.Empty;
                                            bodyCount = System.Text.RegularExpressions.Regex.Matches(text, @"\{\{\d+\}\}").Count;
                                            _logger.LogInformation("[PARAM DEBUG] Matched BODY component. Placeholders count: {Count}", bodyCount);
                                        }
                                        else if (type == "BUTTONS" && comp.TryGetProperty("buttons", out var buttonsProp) && buttonsProp.ValueKind == JsonValueKind.Array)
                                        {
                                            foreach (var btn in buttonsProp.EnumerateArray())
                                            {
                                                var btnType = btn.TryGetProperty("type", out var btnTypeProp) ? btnTypeProp.GetString() : string.Empty;
                                                if (btnType == "URL" && btn.TryGetProperty("url", out var urlProp))
                                                {
                                                    var url = urlProp.GetString() ?? string.Empty;
                                                    if (url.Contains("{{1}}"))
                                                    {
                                                        buttonCount = 1;
                                                        _logger.LogInformation("[PARAM DEBUG] Matched BUTTONS component with dynamic URL.");
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                var result = (bodyCount, buttonCount);
                                _templateParamCache[cacheKey] = result;
                                _logger.LogInformation("[PARAM DEBUG] Success. Mapped Body={Body}, Button={Button}", bodyCount, buttonCount);
                                return result;
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching template param counts from Meta for {TemplateName}", templateName);
            }

            _logger.LogInformation("[PARAM DEBUG] No matching APPROVED template found. Fallback to (0, 0)");
            return (0, 0);
        }

        private static string ExtractUrlSuffix(string value)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            if (value.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || value.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var uri = new Uri(value);
                    var path = uri.PathAndQuery;
                    if (path.StartsWith("/"))
                    {
                        path = path.Substring(1);
                    }
                    return path;
                }
                catch
                {
                    return value;
                }
            }
            return value;
        }
    }
}
