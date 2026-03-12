using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.Admin;
using SynOS.Services;

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

        public TestMasterController(
            ITestMasterService testMasterService, 
            ICsvService csvService, 
            ICatalogImportService catalogImportService,
            ICatalogProvisioningService provisioningService,
            IMapper mapper)
        {
            _testMasterService = testMasterService;
            _csvService = csvService;
            _catalogImportService = catalogImportService;
            _provisioningService = provisioningService;
            _mapper = mapper;
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
            var test = await _testMasterService.CreateTestAsync(dto, GetCurrentUserId());
            return Ok(_mapper.Map<TestDto>(test));
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Receptionist")]
        public async Task<IActionResult> GetTests()
        {
            var tests = await _testMasterService.GetTestsAsync();
            return Ok(_mapper.Map<IReadOnlyList<TestDto>>(tests));
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Receptionist")]
        public async Task<IActionResult> GetTest(Guid id)
        {
            var test = await _testMasterService.GetTestAsync(id);
            if (test == null) return NotFound();
            return Ok(_mapper.Map<TestDto>(test));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateTest(Guid id, [FromBody] UpdateTestDto dto)
        {
            var test = await _testMasterService.UpdateTestAsync(id, dto, GetCurrentUserId());
            return Ok(_mapper.Map<TestDto>(test));
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
    }
}
