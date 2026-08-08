using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.LabAnalyzers;
using SynOS.Services;

namespace SynOS.Api.Controllers.Lab
{
    [ApiController]
    [Route("api/v1/lab/analyzers")]
    [Authorize(Roles = "Admin")] // All analyzer management is Admin-only
    public class LabAnalyzersController : ControllerBase
    {
        private readonly ILabAnalyzerService _labAnalyzerService;
        private readonly IMapper _mapper;

        public LabAnalyzersController(ILabAnalyzerService labAnalyzerService, IMapper mapper)
        {
            _labAnalyzerService = labAnalyzerService;
            _mapper = mapper;
        }

        [HttpPost]
        public async Task<ActionResult<LabAnalyzerSummaryDto>> CreateAnalyzer([FromBody] CreateLabAnalyzerDto dto)
        {
            var currentUserId = GetCurrentUserId(); // Implement this method to get user ID from claims
            var analyzer = await _labAnalyzerService.CreateAnalyzerAsync(dto, currentUserId);
            return Ok(_mapper.Map<LabAnalyzerSummaryDto>(analyzer));
        }

        [HttpPut("{analyzerId}")]
        public async Task<ActionResult<LabAnalyzerSummaryDto>> UpdateAnalyzer(Guid analyzerId, [FromBody] UpdateLabAnalyzerDto dto)
        {
            var currentUserId = GetCurrentUserId();
            var updatedAnalyzer = await _labAnalyzerService.UpdateAnalyzerAsync(analyzerId, dto, currentUserId);
            return Ok(_mapper.Map<LabAnalyzerSummaryDto>(updatedAnalyzer));
        }

        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<LabAnalyzerSummaryDto>>> GetAnalyzers()
        {
            var analyzers = await _labAnalyzerService.GetAnalyzersAsync();
            return Ok(_mapper.Map<IReadOnlyList<LabAnalyzerSummaryDto>>(analyzers));
        }

        [HttpGet("{analyzerId}")]
        public async Task<ActionResult<LabAnalyzerSummaryDto>> GetAnalyzer(Guid analyzerId)
        {
            var analyzer = await _labAnalyzerService.GetAnalyzerAsync(analyzerId);
            if (analyzer == null)
            {
                return NotFound();
            }
            return Ok(_mapper.Map<LabAnalyzerSummaryDto>(analyzer));
        }

        [HttpDelete("{analyzerId}")]
        public async Task<IActionResult> DeleteAnalyzer(Guid analyzerId)
        {
            var currentUserId = GetCurrentUserId();
            var success = await _labAnalyzerService.DeleteAnalyzerAsync(analyzerId, currentUserId);
            if (!success) return NotFound();
            return NoContent();
        }

        [HttpGet("{analyzerId}/listener")]
        public async Task<ActionResult<SynOS.Models.Entities.AnalyzerListener>> GetListener(Guid analyzerId)
        {
            var listener = await _labAnalyzerService.GetAnalyzerListenerAsync(analyzerId);
            if (listener == null)
            {
                return Ok(new SynOS.Models.Entities.AnalyzerListener { AnalyzerId = analyzerId, Protocol = "ASTM", ConnectionMode = "TcpServer", Port = 5000, SerialPortName = "COM1", BaudRate = 9600, DataBits = 8, Parity = "None", StopBits = "One", Handshake = "None", WorklistMode = "Unidirectional", IsActive = true });
            }
            return Ok(listener);
        }

        [HttpPost("{analyzerId}/listener")]
        public async Task<ActionResult<SynOS.Models.Entities.AnalyzerListener>> SaveListener(Guid analyzerId, [FromBody] SynOS.Models.Entities.AnalyzerListener listenerConfig)
        {
            var saved = await _labAnalyzerService.SaveAnalyzerListenerAsync(analyzerId, listenerConfig);
            return Ok(saved);
        }

        [HttpPost("simulate")]
        public async Task<IActionResult> SimulateAnalyzerPacket([FromQuery] string protocol = "ASTM")
        {
            var currentUserId = GetCurrentUserId();
            var analyzers = await _labAnalyzerService.GetAnalyzersAsync();
            var targetAnalyzer = analyzers.FirstOrDefault() ?? await _labAnalyzerService.CreateAnalyzerAsync(new CreateLabAnalyzerDto
            {
                Name = "Sysmex XN-550 Simulator",
                Manufacturer = "Sysmex",
                Model = "XN-550",
                ConnectionType = "ASTM"
            }, currentUserId);

            var sampleId = $"BAR-{new Random().Next(10000, 99999)}";
            var rawAstm = $"1H|\\^&|||Sysmex^XN-550||||||P|1|{DateTime.Now:yyyyMMdd}\rP|1||{sampleId}||Patient^Test||M\rO|1|{sampleId}||^^^WBC\\^^^RBC\\^^^HGB\\^^^PLT|R\rR|1|^^^WBC|7.8|10^3/uL|4.0-10.0|N||F\rR|2|^^^HGB|14.5|g/dL|12.0-16.0|N||F\rR|3|^^^RBC|4.9|10^6/uL|4.5-5.5|N||F\rR|4|^^^PLT|265|10^3/uL|150-450|N||F\rL|1|N\r";

            var dto = new ManualAnalyzerResultDto
            {
                RawMessage = rawAstm,
                PatientIdentifier = sampleId,
                AnalyzerTestCode = "WBC",
                ResultValue = "7.8",
                Units = "10^3/uL",
                Flags = "N"
            };

            var inboxItem = await _labAnalyzerService.EnqueueManualResultAsync(targetAnalyzer.AnalyzerId, dto, currentUserId);

            return Ok(new
            {
                Success = true,
                Message = $"Simulated packet from '{targetAnalyzer.Name}' ingested successfully into Lab Inbox.",
                SampleId = sampleId,
                InboxId = inboxItem.InboxId,
                RawPacket = rawAstm
            });
        }

        // Helper to get current user ID (assuming JWT setup)
        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
            if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return userId;
            }
            return Guid.Empty;
        }
    }
}
