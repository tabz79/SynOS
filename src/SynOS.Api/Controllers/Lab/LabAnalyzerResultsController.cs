using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.LabAnalyzers;
using SynOS.Models.Enums;
using SynOS.Services;
using SynOS.Services.AnalyzerIntegration;

namespace SynOS.Api.Controllers.Lab
{
    [ApiController]
    [Route("api/v1/lab/analyzers/{analyzerId}/results")]
    [Authorize(Roles = "Admin,LabTech,Pathologist")] // Adjust roles as per your RBAC
    public class LabAnalyzerResultsController : ControllerBase
    {
        private readonly ILabAnalyzerService _labAnalyzerService;
        private readonly IAnalyzerResultMatcherService _analyzerResultMatcherService;
        private readonly IAnalyzerProtocolParserFactory _parserFactory;
        private readonly IAnalyzerResultImportService _analyzerResultImportService; // New
        private readonly IMapper _mapper;

        public LabAnalyzerResultsController(
            ILabAnalyzerService labAnalyzerService,
            IAnalyzerResultMatcherService analyzerResultMatcherService,
            IAnalyzerProtocolParserFactory parserFactory,
            IAnalyzerResultImportService analyzerResultImportService, // New
            IMapper mapper)
        {
            _labAnalyzerService = labAnalyzerService;
            _analyzerResultMatcherService = analyzerResultMatcherService;
            _parserFactory = parserFactory;
            _analyzerResultImportService = analyzerResultImportService; // New
            _mapper = mapper;
        }

        [HttpPost("manual")]
        public async Task<ActionResult<ManualResultEnqueueResponseDto>> EnqueueManualResult(
            Guid analyzerId,
            [FromBody] ManualAnalyzerResultDto dto)
        {
            var currentUserId = GetCurrentUserId();
            var inboxItem = await _labAnalyzerService.EnqueueManualResultAsync(analyzerId, dto, currentUserId);
            return Ok(_mapper.Map<ManualResultEnqueueResponseDto>(inboxItem));
        }

        [HttpPost("raw")]
        public async Task<ActionResult<ManualResultEnqueueResponseDto>> EnqueueRawResult(
            Guid analyzerId,
            [FromBody] RawMessageIngestDto dto)
        {
            var currentUserId = GetCurrentUserId(); // User initiating the raw ingest (e.g., admin testing)
            var analyzer = await _labAnalyzerService.GetAnalyzerAsync(analyzerId);
            if (analyzer == null)
            {
                return NotFound($"Analyzer with ID {analyzerId} not found.");
            }

            // Get parser based on protocol from DTO
            var parser = _parserFactory.GetParser(dto.Protocol);
            var parsedResult = parser.Parse(dto.RawMessage);
            parsedResult.AnalyzerId = analyzerId; // Set analyzer ID

            if (!string.IsNullOrEmpty(parsedResult.ErrorMessage))
            {
                // If parsing failed, enqueue with ParseError status
                var errorDto = new ManualAnalyzerResultDto
                {
                    RawMessage = parsedResult.RawMessage,
                    PatientIdentifier = parsedResult.PatientIdentifier, // Keep partial if available
                    AnalyzerTestCode = parsedResult.AnalyzerTestCode,
                    ResultValue = parsedResult.Value,
                    Units = parsedResult.Units,
                    Flags = parsedResult.Flags,
                    MeasuredAt = DateTimeOffset.UtcNow // Use current time as fallback
                };
                var errorInboxItem = await _labAnalyzerService.EnqueueManualResultAsync(analyzerId, errorDto, currentUserId, LabAnalyzerResultStatus.ParseError, parsedResult.ErrorMessage);
                return BadRequest(_mapper.Map<ManualResultEnqueueResponseDto>(errorInboxItem));
            }

            // If parsing successful, enqueue as Pending
            var manualResultDto = new ManualAnalyzerResultDto
            {
                RawMessage = parsedResult.RawMessage,
                PatientIdentifier = parsedResult.PatientIdentifier,
                AnalyzerTestCode = parsedResult.AnalyzerTestCode,
                ResultValue = parsedResult.Value,
                Units = parsedResult.Units,
                Flags = parsedResult.Flags,
                MeasuredAt = DateTimeOffset.UtcNow // Assuming measurement time is now if not in parsed result
            };

            var inboxItem = await _labAnalyzerService.EnqueueManualResultAsync(analyzerId, manualResultDto, currentUserId);
            return Ok(_mapper.Map<ManualResultEnqueueResponseDto>(inboxItem));
        }

        [HttpGet("inbox")]
        [Authorize(Roles = "Admin,LabTech,Pathologist")] // Debug/testing endpoint
        public async Task<ActionResult<IReadOnlyList<ManualResultEnqueueResponseDto>>> GetInboxItems(Guid analyzerId, [FromQuery] int limit = 50)
        {
            var inboxItems = await _labAnalyzerService.GetInboxItemsAsync(analyzerId, limit);
            return Ok(_mapper.Map<IReadOnlyList<ManualResultEnqueueResponseDto>>(inboxItems));
        }

        [HttpPost("{inboxId}/auto-match")]
        public async Task<ActionResult<ManualResultEnqueueResponseDto>> AutoMatchSpecificInboxItem(Guid analyzerId, Guid inboxId)
        {
            var currentUserId = GetCurrentUserId();
            var matchedItem = await _analyzerResultMatcherService.AutoMatchAsync(inboxId, currentUserId);
            if (matchedItem == null)
            {
                return NotFound($"Inbox item {inboxId} not found or could not be matched.");
            }
            return Ok(_mapper.Map<ManualResultEnqueueResponseDto>(matchedItem));
        }

        [HttpPost("auto-match-all")]
        public async Task<ActionResult<int>> AutoMatchAllPendingItems(Guid analyzerId)
        {
            var currentUserId = GetCurrentUserId();
            var matchedCount = await _analyzerResultMatcherService.AutoMatchAllPendingAsync(analyzerId, currentUserId);
            return Ok(matchedCount);
        }

        [HttpPost("{inboxId}/import-to-order")]
        [Authorize(Roles = "Pathologist,LabTech,Admin")] // Roles as per prompt
        public async Task<ActionResult<AnalyzerImportResultDto>> ImportSingleInboxItemToOrder(Guid analyzerId, Guid inboxId, [FromQuery] bool submitForVerification = true)
        {
            var currentUserId = GetCurrentUserId();
            var result = await _analyzerResultImportService.ImportSingleAsync(inboxId, currentUserId, submitForVerification);
            return Ok(result);
        }

        [HttpPost("import-all-matched")]
        [Authorize(Roles = "Pathologist,LabTech,Admin")] // Roles as per prompt
        public async Task<ActionResult<Dictionary<string, int>>> ImportAllMatchedItemsToOrder(Guid analyzerId, [FromQuery] bool submitForVerification = true)
        {
            var currentUserId = GetCurrentUserId();
            var importedCount = await _analyzerResultImportService.ImportAllMatchedForAnalyzerAsync(analyzerId, currentUserId, submitForVerification);
            return Ok(new Dictionary<string, int> { { "importedCount", importedCount } });
        }

        // Helper to get current user ID (assuming JWT setup)
        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return userId;
            }
            // Fallback for development or if user ID is not in claims
            return Guid.Empty; // Should ideally throw if user is authorized but ID is missing
        }
    }
}
