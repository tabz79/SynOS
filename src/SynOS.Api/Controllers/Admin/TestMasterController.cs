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
    [Authorize(Roles = "Admin")]
    public class TestMasterController : ControllerBase
    {
        private readonly ITestMasterService _testMasterService;
        private readonly ICsvService _csvService;
        private readonly IMapper _mapper;

        public TestMasterController(ITestMasterService testMasterService, ICsvService csvService, IMapper mapper)
        {
            _testMasterService = testMasterService;
            _csvService = csvService;
            _mapper = mapper;
        }

        [HttpPost]
        public async Task<IActionResult> CreateTest([FromBody] CreateTestDto dto)
        {
            var test = await _testMasterService.CreateTestAsync(dto, GetCurrentUserId());
            return Ok(_mapper.Map<TestDto>(test));
        }

        [HttpGet]
        public async Task<IActionResult> GetTests()
        {
            var tests = await _testMasterService.GetTestsAsync();
            return Ok(_mapper.Map<IReadOnlyList<TestDto>>(tests));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTest(Guid id)
        {
            var test = await _testMasterService.GetTestAsync(id);
            if (test == null) return NotFound();
            return Ok(_mapper.Map<TestDto>(test));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTest(Guid id, [FromBody] UpdateTestDto dto)
        {
            var test = await _testMasterService.UpdateTestAsync(id, dto, GetCurrentUserId());
            return Ok(_mapper.Map<TestDto>(test));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTest(Guid id)
        {
            await _testMasterService.DeleteTestAsync(id, GetCurrentUserId());
            return NoContent();
        }

        [HttpGet("template-csv")]
        public async Task<IActionResult> GetTemplateCsv()
        {
            var bytes = await _csvService.GetTemplateCsvBytesAsync();
            return File(bytes, "text/csv", "test_master_template.csv");
        }

        [HttpPost("import-csv")]
        public async Task<IActionResult> ImportCsv([FromForm] CsvImportRequestDto request)
        {
            if (request.File == null || request.File.Length == 0)
                return BadRequest("No file uploaded");
                
            using var stream = request.File.OpenReadStream();
            var result = await _csvService.ImportTestsFromCsvAsync(stream, GetCurrentUserId());
            if (result.ErrorCount > 0)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet("export-csv")]
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
