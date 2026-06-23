using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace SynOS.Debug
{
    class Runner
    {
        static async Task Main(string[] args)
        {
            try
            {
                using var client = new HttpClient();
                
                // Get Dev Token
                var loginResponse = await client.PostAsync("http://localhost:5000/dev-login?userId=6cc795ac-c3c1-4a49-b110-a2da5e2a2fc2&name=Admin&roles=Admin", null);
                var loginContent = await loginResponse.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(loginContent);
                var token = doc.RootElement.GetProperty("token").GetString();
                Console.WriteLine("Got Admin Token: " + token.Substring(0, 10) + "...");
                
                client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                
                // Get tests to locate HAEMOGLOBIN
                var getResponse = await client.GetAsync("http://localhost:5000/api/v1/admin/tests");
                var getContent = await getResponse.Content.ReadAsStringAsync();
                using var testsDoc = JsonDocument.Parse(getContent);
                
                JsonElement hbTest = default;
                foreach (var test in testsDoc.RootElement.EnumerateArray())
                {
                    if (test.GetProperty("testCode").GetString() == "HAEMOGLOBIN")
                    {
                        hbTest = test;
                        break;
                    }
                }
                
                if (hbTest.ValueKind == JsonValueKind.Undefined)
                {
                    Console.WriteLine("Test HAEMOGLOBIN not found!");
                    return;
                }
                
                var testId = hbTest.GetProperty("testId").GetString();
                Console.WriteLine($"Found HAEMOGLOBIN testId: {testId}");
                
                // Construct update request body
                var updateDto = new
                {
                    testCode = "HAEMOGLOBIN",
                    testName = hbTest.GetProperty("testName").GetString(),
                    department = hbTest.GetProperty("department").GetString(),
                    category = hbTest.TryGetProperty("category", out var cat) ? cat.GetString() : null,
                    basePrice = hbTest.GetProperty("basePrice").GetDecimal(),
                    tatHours = hbTest.GetProperty("taT_Hours").GetInt32(),
                    isOutsourced = hbTest.GetProperty("isOutsourced").GetBoolean(),
                    specimenTypeCode = hbTest.TryGetProperty("specimenTypeCode", out var spec) ? spec.GetString() : null,
                    isProfile = hbTest.GetProperty("isProfile").GetBoolean(),
                    modalityId = hbTest.TryGetProperty("modalityId", out var mod) && mod.ValueKind != JsonValueKind.Null ? mod.GetString() : null,
                    reportTemplateId = hbTest.TryGetProperty("reportTemplateId", out var temp) && temp.ValueKind != JsonValueKind.Null ? temp.GetString() : null,
                    isActive = hbTest.GetProperty("isActive").GetBoolean(),
                    parameters = new[]
                    {
                        new
                        {
                            parameterCode = "HAEMOGLOBIN",
                            parameterName = "Haemoglobin",
                            unit = "g/dL",
                            dataType = "Numeric",
                            sortOrder = 1,
                            referenceRange = "13.0 - 18.0",
                            useNewbornMale = true,
                            newbornMaleMin = 6.0m,
                            newbornMaleMax = 6.8m,
                            useNewbornFemale = true,
                            newbornFemaleMin = 5.2m,
                            newbornFemaleMax = 6.5m,
                            useAdultMale = true,
                            adultMaleMin = 13.0m,
                            adultMaleMax = 18.0m,
                            useAdultFemale = true,
                            adultFemaleMin = 12.0m,
                            adultFemaleMax = 15.5m
                        }
                    }
                };
                
                var updateJson = JsonSerializer.Serialize(updateDto);
                var content = new StringContent(updateJson, Encoding.UTF8, "application/json");
                
                var putResponse = await client.PutAsync($"http://localhost:5000/api/v1/admin/tests/{testId}", content);
                var putContent = await putResponse.Content.ReadAsStringAsync();
                
                Console.WriteLine($"PUT Response status: {putResponse.StatusCode}");
                if (!putResponse.IsSuccessStatusCode)
                {
                    Console.WriteLine($"Response: {putContent}");
                }
                else
                {
                    Console.WriteLine("HAEMOGLOBIN test overrides successfully updated via API!");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
            }
        }
    }
}
