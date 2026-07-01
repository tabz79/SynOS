using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.Admin;
using SynOS.Services;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using SynOS.Models.Entities.Catalog;
using SynOS.Services.Catalog;

namespace SynOS.Api.Controllers.Admin
{
    [ApiController]
    [Route("api/v1/admin/tests")]
    public class TestMasterController : ControllerBase
    {
        private readonly ITestMasterService _testMasterService;
        private readonly ICsvService _csvService;
        private readonly ICatalogImportService _catalogImportService;
        private readonly ICatalogProvisioningService _provisioningService;
        private readonly IMapper _mapper;
        private readonly SynOS.Data.SynOSDbContext _context;

        public TestMasterController(
            ITestMasterService testMasterService, 
            ICsvService csvService, 
            ICatalogImportService catalogImportService,
            ICatalogProvisioningService provisioningService,
            IMapper mapper,
            SynOS.Data.SynOSDbContext context)
        {
            _testMasterService = testMasterService;
            _csvService = csvService;
            _catalogImportService = catalogImportService;
            _provisioningService = provisioningService;
            _mapper = mapper;
            _context = context;
        }

        [HttpPost("catalog/import")]
        [Authorize(Roles = "Admin")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> ImportCatalog([FromForm] CatalogImportRequestDto request)
        {
            if (request.File == null || request.File.Length == 0)
                return BadRequest("No file uploaded");

            var result = await _catalogImportService.ImportCatalogAsync(request.File, GetCurrentUserId(), request.ValidateOnly ?? false, default);
            if (!result.Success)
            {
                return BadRequest(result);
            }

            // After import, generate a preview dry-run
            var preview = await _provisioningService.ProvisionAsync(dryRun: true);
            return Ok(new { ImportResult = result, PreviewImpact = preview });
        }

        [HttpPost("catalog/provision")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ProvisionCatalog([FromBody] ProvisionRequestDto request)
        {
            var result = await _provisioningService.ProvisionAsync(dryRun: false, expectedVersionHash: request.VersionHash);
            
            if (result.Status == "Conflict") return Conflict(result);
            if (result.Status == "Locked") return StatusCode(423, result);
            if (result.Status == "Failed") return StatusCode(500, result);
            
            return Ok(result);
        }

        public class ProvisionRequestDto
        {
            public string VersionHash { get; set; } = string.Empty;
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateTest([FromBody] CreateTestDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.TestCode))
            {
                return BadRequest(new { Message = "Test code is required." });
            }

            var conflictingTest = await _context.Tests.FirstOrDefaultAsync(t => t.TestCode.ToUpper() == dto.TestCode.Trim().ToUpper());
            if (conflictingTest != null)
            {
                if (!conflictingTest.IsActive)
                {
                    // Dynamically rename the soft-deleted test to free up the code
                    var suffix = $"_DEL_{DateTime.UtcNow.Ticks}";
                    var maxLen = 50 - suffix.Length;
                    var originalCode = conflictingTest.TestCode;
                    if (originalCode.Length > maxLen)
                    {
                        originalCode = originalCode.Substring(0, maxLen);
                    }
                    
                    var newCode = originalCode + suffix;
                    
                    conflictingTest.TestCode = newCode;
                    conflictingTest.UpdatedAt = DateTimeOffset.UtcNow;

                    var catalogTest = await _context.CatalogTests.FirstOrDefaultAsync(ct => ct.TestCode == dto.TestCode.Trim());
                    if (catalogTest != null)
                    {
                        var catalogParams = await _context.CatalogParameters.Where(cp => cp.TestCode == catalogTest.TestCode).ToListAsync();

                        var newCatalogTest = new CatalogTest
                        {
                            TestCode = newCode,
                            TestName = catalogTest.TestName,
                            DepartmentCode = catalogTest.DepartmentCode,
                            SpecimenCode = catalogTest.SpecimenCode,
                            TubeCode = catalogTest.TubeCode,
                            Price = catalogTest.Price,
                            IsPanel = catalogTest.IsPanel,
                            IsActive = false,
                            CreatedBy = catalogTest.CreatedBy,
                            UpdatedBy = GetCurrentUserId(),
                            CreatedAt = catalogTest.CreatedAt,
                            UpdatedAt = DateTimeOffset.UtcNow
                        };

                        var newParams = catalogParams.Select(cp => new CatalogParameter
                        {
                            Id = Guid.NewGuid(),
                            TestCode = newCode,
                            ParameterCode = cp.ParameterCode,
                            ParameterName = cp.ParameterName,
                            DataType = cp.DataType,
                            Unit = cp.Unit,
                            ReferenceRange = cp.ReferenceRange,
                            SortOrder = cp.SortOrder,
                            Methodology = cp.Methodology,
                            Formula = cp.Formula,
                            IsCalculated = cp.IsCalculated,
                            IsActive = false,
                            CreatedBy = cp.CreatedBy,
                            UpdatedBy = GetCurrentUserId(),
                            CreatedAt = cp.CreatedAt,
                            UpdatedAt = DateTimeOffset.UtcNow
                        }).ToList();

                        var catalogPanelMappings = await _context.CatalogPanelMappings
                            .Where(m => m.PanelTestCode == catalogTest.TestCode || m.ChildTestCode == catalogTest.TestCode)
                            .ToListAsync();
                        _context.CatalogPanelMappings.RemoveRange(catalogPanelMappings);

                        _context.CatalogParameters.RemoveRange(catalogParams);
                        _context.CatalogTests.Remove(catalogTest);
                        await _context.SaveChangesAsync();

                        _context.CatalogTests.Add(newCatalogTest);
                        _context.CatalogParameters.AddRange(newParams);
                    }
                    await _context.SaveChangesAsync();
                }
                else
                {
                    return BadRequest(new { Message = $"Test code '{dto.TestCode}' already exists." });
                }
            }

            var test = await _testMasterService.CreateTestAsync(dto, GetCurrentUserId());
            var testDto = _mapper.Map<TestDto>(test);
            var enriched = await EnrichTestDtoAsync(testDto);
            return Ok(enriched);
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Receptionist")]
        public async Task<IActionResult> GetTests()
        {
            var tests = await _testMasterService.GetTestsAsync();
            var dtos = _mapper.Map<IReadOnlyList<TestDto>>(tests).ToList();
            var enriched = await EnrichTestDtosAsync(dtos);
            return Ok(enriched);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Receptionist")]
        public async Task<IActionResult> GetTest(Guid id)
        {
            var test = await _testMasterService.GetTestAsync(id);
            if (test == null) return NotFound();
            var dto = _mapper.Map<TestDto>(test);
            var enriched = await EnrichTestDtoAsync(dto);
            return Ok(enriched);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateTest(Guid id, [FromBody] UpdateTestDto dto)
        {
            if (dto.TestCode != null)
            {
                if (string.IsNullOrWhiteSpace(dto.TestCode))
                {
                    return BadRequest(new { Message = "Test code cannot be empty." });
                }

                var exists = await _context.Tests.AnyAsync(t => t.TestId != id && t.TestCode.ToUpper() == dto.TestCode.Trim().ToUpper());
                if (exists)
                {
                    return BadRequest(new { Message = $"Test code '{dto.TestCode}' already exists." });
                }
            }

            var test = await _testMasterService.UpdateTestAsync(id, dto, GetCurrentUserId());
            var testDto = _mapper.Map<TestDto>(test);
            var enriched = await EnrichTestDtoAsync(testDto);
            return Ok(enriched);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteTest(Guid id)
        {
            await _testMasterService.DeleteTestAsync(id, GetCurrentUserId());
            return NoContent();
        }

        [HttpGet("template-csv")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetTemplateCsv()
        {
            var bytes = await _csvService.GetTemplateCsvBytesAsync();
            return File(bytes, "text/csv", "test_master_template.csv");
        }

        [HttpGet("catalog/template")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetCatalogTemplate()
        {
            var path = "d:\\Projects\\SynOS-Synthesized-Lab-Intelligence\\SynOS_Catalog_Master_Template_VERIFIED.xlsx";
            if (!System.IO.File.Exists(path))
            {
                return NotFound("Template file not found");
            }
            var bytes = await System.IO.File.ReadAllBytesAsync(path);
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "SynOS_Catalog_Master_Template.xlsx");
        }

        [HttpPost("import-csv")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ImportCsv([FromForm] CsvImportRequestDto request)
        {
            if (request.File == null || request.File.Length == 0)
                return BadRequest("No file uploaded");
                
            var extension = System.IO.Path.GetExtension(request.File.FileName).ToLowerInvariant();
            using var stream = request.File.OpenReadStream();
            
            CsvImportResultDto result;
            if (extension == ".xlsx")
            {
                result = await _csvService.ImportTestsFromExcelAsync(stream, GetCurrentUserId());
            }
            else
            {
                result = await _csvService.ImportTestsFromCsvAsync(stream, GetCurrentUserId());
            }

            if (result.ErrorCount > 0)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpPost("import-interpretation")]
        [Authorize(Roles = "Admin")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> ImportInterpretation([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded");

            try
            {
                var extension = System.IO.Path.GetExtension(file.FileName).ToLowerInvariant();
                string content = "";

                using var stream = file.OpenReadStream();

                if (extension == ".txt")
                {
                    content = DocumentParser.ParseTxt(stream);
                }
                else if (extension == ".docx")
                {
                    content = DocumentParser.ParseDocx(stream);
                }
                else if (extension == ".rtf")
                {
                    content = DocumentParser.ParseRtf(stream);
                }
                else
                {
                    return BadRequest("Unsupported file extension. Only .txt, .rtf, and .docx files are supported.");
                }

                return Ok(new { Content = content });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = $"Failed to parse document: {ex.Message}" });
            }
        }

        [HttpGet("export-csv")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ExportCsv()
        {
            var bytes = await _csvService.ExportTestsToCsvAsync();
            return File(bytes, "text/csv", "tests_export.csv");
        }
        
        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return userId;
            }
            return Guid.Empty;
        }

        private async Task<List<TestDto>> EnrichTestDtosAsync(List<TestDto> dtos)
        {
            if (dtos == null || !dtos.Any()) return dtos ?? new List<TestDto>();

            var testCodes = dtos.Select(d => d.TestCode).ToList();
            var catalogParams = await _context.CatalogParameters
                .Where(cp => testCodes.Contains(cp.TestCode))
                .ToListAsync();

            var catalogTests = await _context.CatalogTests
                .Where(ct => testCodes.Contains(ct.TestCode))
                .ToListAsync();

            foreach (var dto in dtos)
            {
                var catTest = catalogTests.FirstOrDefault(ct => ct.TestCode == dto.TestCode);
                if (catTest != null)
                {
                    dto.IsProfile = catTest.IsPanel;
                }

                if (dto.IsProfile)
                {
                    var childMappings = await _context.CatalogPanelMappings
                        .Where(m => m.PanelTestCode == dto.TestCode)
                        .OrderBy(m => m.SortOrder)
                        .Select(m => m.ChildTestCode)
                        .ToListAsync();
                    dto.IncludedTestCodes = childMappings;
                }

                foreach (var paramDto in dto.Parameters)
                {
                    var catParam = catalogParams.FirstOrDefault(cp => cp.TestCode == dto.TestCode && cp.ParameterCode == paramDto.ParameterCode);
                    if (catParam != null)
                    {
                        paramDto.Methodology = catParam.Methodology;
                        paramDto.Formula = catParam.Formula;
                        paramDto.IsCalculated = catParam.IsCalculated || !string.IsNullOrWhiteSpace(catParam.Formula);
                        paramDto.ReferenceRange = catParam.ReferenceRange;
                        paramDto.NarrativeTemplate = catParam.NarrativeTemplate;
                        paramDto.ShowNarrative = catParam.ShowNarrative;
                    }
                }
            }

            return dtos;
        }

        private async Task<TestDto> EnrichTestDtoAsync(TestDto dto)
        {
            var enriched = await EnrichTestDtosAsync(new List<TestDto> { dto });
            return enriched[0];
        }
    }
}
