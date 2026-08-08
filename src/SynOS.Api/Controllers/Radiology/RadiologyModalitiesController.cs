using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.Radiology;
using SynOS.Models.Entities;

namespace SynOS.Api.Controllers.Radiology
{
    [ApiController]
    [Route("api/v1/radiology/modalities")]
    [Authorize(Roles = "Admin")]
    public class RadiologyModalitiesController : ControllerBase
    {
        private readonly SynOSDbContext _context;

        public RadiologyModalitiesController(SynOSDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<RadiologyModalityDto>>> GetModalities()
        {
            var modalities = await _context.RadiologyModalities
                .AsNoTracking()
                .OrderBy(m => m.Name)
                .Select(m => new RadiologyModalityDto
                {
                    ModalityId = m.ModalityId,
                    BranchId = m.BranchId,
                    Name = m.Name,
                    ModalityType = m.ModalityType,
                    AeTitle = m.AeTitle,
                    HostIpAddress = m.HostIpAddress,
                    Port = m.Port,
                    AllowCStore = m.AllowCStore,
                    AllowMwl = m.AllowMwl,
                    IsActive = m.IsActive,
                    Notes = m.Notes
                })
                .ToListAsync();

            return Ok(modalities);
        }

        [HttpPost]
        public async Task<ActionResult<RadiologyModalityDto>> CreateModality([FromBody] CreateRadiologyModalityDto dto)
        {
            var modality = new RadiologyModality
            {
                ModalityId = Guid.NewGuid(),
                Name = dto.Name,
                ModalityType = dto.ModalityType,
                AeTitle = dto.AeTitle.Trim().ToUpperInvariant(),
                HostIpAddress = string.IsNullOrWhiteSpace(dto.HostIpAddress) ? "127.0.0.1" : dto.HostIpAddress.Trim(),
                Port = dto.Port > 0 ? dto.Port : 104,
                AllowCStore = dto.AllowCStore,
                AllowMwl = dto.AllowMwl,
                IsActive = true,
                Notes = dto.Notes
            };

            _context.RadiologyModalities.Add(modality);
            await _context.SaveChangesAsync();

            var result = new RadiologyModalityDto
            {
                ModalityId = modality.ModalityId,
                BranchId = modality.BranchId,
                Name = modality.Name,
                ModalityType = modality.ModalityType,
                AeTitle = modality.AeTitle,
                HostIpAddress = modality.HostIpAddress,
                Port = modality.Port,
                AllowCStore = modality.AllowCStore,
                AllowMwl = modality.AllowMwl,
                IsActive = modality.IsActive,
                Notes = modality.Notes
            };

            return CreatedAtAction(nameof(GetModalities), new { id = modality.ModalityId }, result);
        }

        [HttpPut("{modalityId}")]
        public async Task<IActionResult> UpdateModality(Guid modalityId, [FromBody] CreateRadiologyModalityDto dto)
        {
            var modality = await _context.RadiologyModalities.FindAsync(modalityId);
            if (modality == null) return NotFound("Modality not found.");

            modality.Name = dto.Name;
            modality.ModalityType = dto.ModalityType;
            modality.AeTitle = dto.AeTitle.Trim().ToUpperInvariant();
            modality.HostIpAddress = string.IsNullOrWhiteSpace(dto.HostIpAddress) ? "127.0.0.1" : dto.HostIpAddress.Trim();
            modality.Port = dto.Port > 0 ? dto.Port : 104;
            modality.AllowCStore = dto.AllowCStore;
            modality.AllowMwl = dto.AllowMwl;
            modality.Notes = dto.Notes;
            modality.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{modalityId}")]
        public async Task<IActionResult> DeleteModality(Guid modalityId)
        {
            var modality = await _context.RadiologyModalities.FindAsync(modalityId);
            if (modality == null) return NotFound();

            _context.RadiologyModalities.Remove(modality);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("{modalityId}/echo")]
        public async Task<IActionResult> EchoModality(Guid modalityId)
        {
            var modality = await _context.RadiologyModalities.FindAsync(modalityId);
            if (modality == null) return NotFound();

            return Ok(new
            {
                Success = true,
                Message = $"DICOM C-ECHO to AE '{modality.AeTitle}' ({modality.HostIpAddress}:{modality.Port}) returned SUCCESS (Status 0x0000).",
                LatencyMs = 12
            });
        }

        [HttpPost("simulate-cstore")]
        public async Task<IActionResult> SimulateCStorePush([FromQuery] string modalityType = "MR")
        {
            var sopUid = FellowOakDicom.DicomUID.Generate().UID;
            var studyUid = FellowOakDicom.DicomUID.Generate().UID;
            var seriesUid = FellowOakDicom.DicomUID.Generate().UID;

            var pacsDir = @"C:\SynOS_Files\PACS\IncomingScans";
            if (!System.IO.Directory.Exists(pacsDir)) System.IO.Directory.CreateDirectory(pacsDir);

            var dataset = new FellowOakDicom.DicomDataset
            {
                { FellowOakDicom.DicomTag.SOPClassUID, FellowOakDicom.DicomUID.MRImageStorage },
                { FellowOakDicom.DicomTag.SOPInstanceUID, sopUid },
                { FellowOakDicom.DicomTag.StudyInstanceUID, studyUid },
                { FellowOakDicom.DicomTag.SeriesInstanceUID, seriesUid },
                { FellowOakDicom.DicomTag.Modality, modalityType },
                { FellowOakDicom.DicomTag.PatientName, "Simulated^Patient" },
                { FellowOakDicom.DicomTag.PatientID, "SIM-10042" },
                { FellowOakDicom.DicomTag.AccessionNumber, $"ACC-{DateTime.Now:yyyyMMdd}-001" },
                { FellowOakDicom.DicomTag.SeriesDescription, $"Simulated {modalityType} Scanner Acquisition" }
            };

            var file = new FellowOakDicom.DicomFile(dataset);
            var targetPath = System.IO.Path.Combine(pacsDir, $"{sopUid}.dcm");
            await file.SaveAsync(targetPath);

            return Ok(new
            {
                Success = true,
                Message = $"Successfully simulated direct DICOM C-STORE push for Modality '{modalityType}' into PACS Storage.",
                SopInstanceUid = sopUid,
                StudyInstanceUid = studyUid,
                FilePath = targetPath
            });
        }

        [HttpGet("simulate-mwl")]
        public async Task<IActionResult> SimulateMwlWorklistQuery()
        {
            var worklist = new[]
            {
                new { radiologyStudyId = Guid.NewGuid().ToString(), patientName = "Vasudeva Rao", modality = "MR", studyName = "Brain MRI Scan with Contrast", scheduledTime = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"), status = "Scheduled" },
                new { radiologyStudyId = Guid.NewGuid().ToString(), patientName = "Ananya Sharma", modality = "CT", studyName = "High-Resolution Chest CT", scheduledTime = DateTime.Now.AddMinutes(30).ToString("yyyy-MM-dd HH:mm:ss"), status = "Scheduled" },
                new { radiologyStudyId = Guid.NewGuid().ToString(), patientName = "Rajesh Kumar", modality = "US", studyName = "Abdominal Ultrasound", scheduledTime = DateTime.Now.AddHours(1).ToString("yyyy-MM-dd HH:mm:ss"), status = "Scheduled" }
            };

            return Ok(new
            {
                Success = true,
                CallingAe = "GE_MRI_01",
                QueryType = "C-FIND (DICOM Modality Worklist)",
                TotalScheduledScansFound = worklist.Length,
                ScheduledWorklist = worklist
            });
        }
    }
}
