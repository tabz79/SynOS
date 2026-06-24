using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using AutoMapper;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Catalog;
using SynOS.Models.DTOs.Admin;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;

namespace SynOS.Debug
{
    class Program
    {
        static async Task Main(string[] args)
        {
            var host = Host.CreateDefaultBuilder(args)
                .ConfigureServices((hostContext, services) =>
                {
                    services.AddDbContext<SynOSDbContext>(options =>
                        options.UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;MultipleActiveResultSets=true"));
                    services.AddAutoMapper(typeof(LocalMappingProfile));
                })
                .Build();

            using var scope = host.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();
            var mapper = scope.ServiceProvider.GetRequiredService<IMapper>();

            // Get HAEMOGRAM test object from DB
            var testObj = await context.Tests
                .Include(t => t.Parameters.Where(p => p.IsActive))
                    .ThenInclude(p => p.ReferenceRanges)
                .Include(t => t.TestPricings) 
                .Include(t => t.DepartmentMaster) 
                .Include(t => t.ProfileChildren)
                    .ThenInclude(pc => pc.ChildTest)
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TestCode == "HAEMOGRAM");

            if (testObj == null)
            {
                Console.WriteLine("HAEMOGRAM not found in DB.");
                return;
            }

            var catalogParams = await context.CatalogParameters
                .Where(cp => cp.TestCode == "HAEMOGRAM")
                .AsNoTracking()
                .ToListAsync();

            // Hop 1: Value of selectedTest.defaultInterpretation immediately before Save Catalog Changes (simulating "Hello World" typed in editor)
            string typedValue = "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Hello World\"}]}]}";
            Console.WriteLine("=== HOP 1: Value of selectedTest.defaultInterpretation ===");
            Console.WriteLine(typedValue);

            // Hop 2: Construct UpdateTestDto and serialize to JSON (Simulating frontend PUT payload generation)
            var updateDto = new UpdateTestDto
            {
                TestCode = testObj.TestCode,
                TestName = testObj.TestName,
                Department = testObj.DepartmentMaster?.Name ?? "Hematology",
                ModalityId = testObj.ModalityId,
                Category = testObj.Category ?? "General",
                BasePrice = testObj.TestPricings.OrderByDescending(p => p.EffectiveFrom).FirstOrDefault()?.BasePrice ?? 500m,
                TAT_Hours = testObj.TAT_Hours,
                IsOutsourced = testObj.IsOutsourced,
                SpecimenTypeCode = testObj.SpecimenTypeCode ?? "BLOOD",
                IsProfile = testObj.IsProfile,
                ReportTemplateId = testObj.ReportTemplateId,
                DefaultInterpretation = typedValue, // Hello World is set here
                IsActive = testObj.IsActive,
                Parameters = testObj.Parameters.Select(p => {
                    var catParam = catalogParams.FirstOrDefault(cp => cp.ParameterCode == p.ParameterCode);
                    return new ParameterSaveDto
                    {
                        ParameterCode = p.ParameterCode,
                        ParameterName = p.ParameterName,
                        Unit = p.Unit,
                        DataType = p.DataType ?? "Numeric",
                        SortOrder = p.SortOrder,
                        Methodology = catParam?.Methodology,
                        Formula = catParam?.Formula,
                        IsCalculated = catParam?.IsCalculated ?? false,
                        ReferenceRange = catParam?.ReferenceRange,
                        UseMale = p.ReferenceRanges.Any(r => r.Sex == "Male" && r.AgeGroup == "ALL" && r.IsActive),
                        MaleMin = p.ReferenceRanges.Where(r => r.Sex == "Male" && r.AgeGroup == "ALL" && r.IsActive).Select(r => r.RefLow).FirstOrDefault(),
                        MaleMax = p.ReferenceRanges.Where(r => r.Sex == "Male" && r.AgeGroup == "ALL" && r.IsActive).Select(r => r.RefHigh).FirstOrDefault(),
                        UseFemale = p.ReferenceRanges.Any(r => r.Sex == "Female" && r.AgeGroup == "ALL" && r.IsActive),
                        FemaleMin = p.ReferenceRanges.Where(r => r.Sex == "Female" && r.AgeGroup == "ALL" && r.IsActive).Select(r => r.RefLow).FirstOrDefault(),
                        FemaleMax = p.ReferenceRanges.Where(r => r.Sex == "Female" && r.AgeGroup == "ALL" && r.IsActive).Select(r => r.RefHigh).FirstOrDefault(),
                        UseInfant = p.ReferenceRanges.Any(r => r.AgeGroup == "Infant" && r.IsActive),
                        InfantMin = p.ReferenceRanges.Where(r => r.AgeGroup == "Infant" && r.IsActive).Select(r => r.RefLow).FirstOrDefault(),
                        InfantMax = p.ReferenceRanges.Where(r => r.AgeGroup == "Infant" && r.IsActive).Select(r => r.RefHigh).FirstOrDefault(),
                        UseChild = p.ReferenceRanges.Any(r => r.AgeGroup == "Child" && r.IsActive),
                        ChildMin = p.ReferenceRanges.Where(r => r.AgeGroup == "Child" && r.IsActive).Select(r => r.RefLow).FirstOrDefault(),
                        ChildMax = p.ReferenceRanges.Where(r => r.AgeGroup == "Child" && r.IsActive).Select(r => r.RefHigh).FirstOrDefault(),
                        UseAdult = p.ReferenceRanges.Any(r => r.AgeGroup == "Adult" && r.IsActive),
                        AdultMin = p.ReferenceRanges.Where(r => r.AgeGroup == "Adult" && r.IsActive).Select(r => r.RefLow).FirstOrDefault(),
                        AdultMax = p.ReferenceRanges.Where(r => r.AgeGroup == "Adult" && r.IsActive).Select(r => r.RefHigh).FirstOrDefault(),
                    };
                }).ToList(),
                IncludedTestCodes = testObj.ProfileChildren.Select(pc => pc.ChildTest?.TestCode).Where(c => c != null).ToList()!
            };

            var options = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = true
            };
            string payloadJson = JsonSerializer.Serialize(updateDto, options);

            Console.WriteLine("\n=== HOP 2: Exact DefaultInterpretation inside HAEMOGRAM PUT request body ===");
            using var doc = JsonDocument.Parse(payloadJson);
            if (doc.RootElement.TryGetProperty("defaultInterpretation", out var diProp))
            {
                Console.WriteLine(diProp.GetString());
            }
            else
            {
                Console.WriteLine("defaultInterpretation property not found in serialized JSON payload!");
            }

            // Execute PUT request
            using var client = new HttpClient();
            string jwtToken = GenerateAdminToken();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwtToken);
            var content = new StringContent(payloadJson, Encoding.UTF8, "application/json");
            var response = await client.PutAsync($"http://127.0.0.1:59999/api/v1/admin/tests/{testObj.TestId}", content);

            if (!response.IsSuccessStatusCode)
            {
                Console.WriteLine($"PUT request failed with status: {response.StatusCode}");
                return;
            }

            // Hop 3: Exact value written to Tests.DefaultInterpretation in SQL after the PUT succeeds.
            // Query DB directly
            using (var newContext = new SynOSDbContext(new DbContextOptionsBuilder<SynOSDbContext>().UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;MultipleActiveResultSets=true").Options))
            {
                var dbVal = await newContext.Tests
                    .Where(t => t.TestCode == "HAEMOGRAM")
                    .Select(t => t.DefaultInterpretation)
                    .FirstOrDefaultAsync();

                Console.WriteLine("\n=== HOP 3: Exact value written to Tests.DefaultInterpretation in SQL ===");
                Console.WriteLine(dbVal ?? "NULL");
            }

            // Hop 4: Exact value returned by GET /api/v1/admin/tests/{haemogramId}
            var getResponse = await client.GetAsync($"http://127.0.0.1:59999/api/v1/admin/tests/{testObj.TestId}");
            string getBody = await getResponse.Content.ReadAsStringAsync();
            Console.WriteLine("\n=== HOP 4: Exact value returned by GET ===");
            using var getDoc = JsonDocument.Parse(getBody);
            if (getDoc.RootElement.TryGetProperty("defaultInterpretation", out var getDiProp))
            {
                Console.WriteLine(getDiProp.GetString() ?? "NULL");
            }
            else
            {
                Console.WriteLine("defaultInterpretation property not found in GET response body!");
            }

            // Hop 5: Exact value assigned back into selectedTest.defaultInterpretation after reload
            Console.WriteLine("\n=== HOP 5: Exact value mapped back to selectedTest.defaultInterpretation ===");
            if (getDoc.RootElement.TryGetProperty("defaultInterpretation", out var finalDiProp))
            {
                // normalizeDbTest simulation: dbTest.defaultInterpretation || dbTest.DefaultInterpretation || ""
                string mappedVal = finalDiProp.GetString() ?? "";
                Console.WriteLine(mappedVal);
            }
            else
            {
                Console.WriteLine("Mapping failed: defaultInterpretation missing.");
            }
        }

        private static string GenerateAdminToken()
        {
            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, "6cc795ac-c3c1-4a49-b110-a2da5e2a2fc2"),
                new(ClaimTypes.Name, "Dev Admin"),
                new(ClaimTypes.Role, "Admin")
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("REPLACE_THIS_WITH_A_REAL_SECRET_REPLACE_THIS_WITH_A_REAL_SECRET"));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: "SynOS.Api",
                audience: "SynOS.App",
                claims: claims,
                expires: DateTime.UtcNow.AddHours(1),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    class LocalMappingProfile : Profile
    {
        public LocalMappingProfile()
        {
            CreateMap<Test, TestDto>();
        }
    }
}
