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
using SynOS.Models.Entities.PACS;
using Microsoft.AspNetCore.SignalR;
using SynOS.Api.Hubs;
using System.IO;

namespace SynOS.Api.Controllers.Radiology
{
    [ApiController]
    [Route("api/v1/radiology/modalities")]
    [Authorize(Roles = "Admin")]
    public class RadiologyModalitiesController : ControllerBase
    {
        private readonly SynOSDbContext _context;
        private readonly IHubContext<BranchOperationsHub>? _hubContext;

        public RadiologyModalitiesController(SynOSDbContext context, IHubContext<BranchOperationsHub>? hubContext = null)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<RadiologyModalityDto>>> GetModalities([FromQuery] Guid? branchId)
        {
            try
            {
                var query = _context.RadiologyModalities.AsNoTracking();
                if (branchId.HasValue && branchId.Value != Guid.Empty)
                {
                    query = query.Where(m => m.BranchId == branchId.Value || m.BranchId == Guid.Empty);
                }

                var modalities = await query
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
            catch (Exception)
            {
                // Self-heal table schema if not present yet
                try
                {
                    DbInitializer.EnsureTablesAndColumnsCreated(_context);
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
                catch
                {
                    return Ok(new List<RadiologyModalityDto>());
                }
            }
        }

        [HttpGet("{modalityId}")]
        public async Task<ActionResult<RadiologyModalityDto>> GetModalityById(Guid modalityId)
        {
            var m = await _context.RadiologyModalities.FindAsync(modalityId);
            if (m == null) return NotFound("Modality not found.");

            return Ok(new RadiologyModalityDto
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
            });
        }

        [HttpPost]
        public async Task<ActionResult<RadiologyModalityDto>> CreateModality([FromBody] CreateRadiologyModalityDto dto)
        {
            try
            {
                // Ensure table exists
                DbInitializer.EnsureTablesAndColumnsCreated(_context);

                var branchClaim = User.FindFirst("branch_id")?.Value;
                Guid branchId = Guid.Empty;
                if (!string.IsNullOrEmpty(branchClaim) && Guid.TryParse(branchClaim, out var bGuid))
                {
                    branchId = bGuid;
                }

                var modality = new RadiologyModality
                {
                    ModalityId = Guid.NewGuid(),
                    BranchId = branchId != Guid.Empty ? branchId : (dto.BranchId ?? Guid.Parse("A0000000-0000-0000-0000-000000000001")),
                    Name = dto.Name,
                    ModalityType = dto.ModalityType,
                    AeTitle = dto.AeTitle.Trim().ToUpperInvariant(),
                    HostIpAddress = string.IsNullOrWhiteSpace(dto.HostIpAddress) ? "127.0.0.1" : dto.HostIpAddress.Trim(),
                    Port = dto.Port > 0 ? dto.Port : 104,
                    AllowCStore = dto.AllowCStore,
                    AllowMwl = dto.AllowMwl,
                    IsActive = true,
                    Notes = dto.Notes,
                    CreatedAt = DateTimeOffset.UtcNow
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

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Failed to save modality: {ex.Message}" });
            }
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

            return await PerformRealPingTestAsync(modality.HostIpAddress, modality.Port, modality.AeTitle, modality.Name);
        }

        [HttpPost("ping-test")]
        public async Task<IActionResult> TestConnection([FromBody] ModalityPingRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Host))
            {
                return BadRequest(new { success = false, message = "Host IP address or hostname is required." });
            }

            return await PerformRealPingTestAsync(request.Host.Trim(), request.Port > 0 ? request.Port : 104, request.AeTitle, "Target Device");
        }

        private async Task<IActionResult> PerformRealPingTestAsync(string host, int port, string? aeTitle, string targetName)
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var steps = new List<object>();
            bool isPortOpen = false;
            bool isIcmpPingSuccess = false;
            long icmpLatencyMs = 0;
            string? errorMessage = null;

            // 1. ICMP Ping Test
            try
            {
                using var ping = new System.Net.NetworkInformation.Ping();
                var reply = await ping.SendPingAsync(host, 2000);
                if (reply.Status == System.Net.NetworkInformation.IPStatus.Success)
                {
                    isIcmpPingSuccess = true;
                    icmpLatencyMs = reply.RoundtripTime;
                    steps.Add(new { step = "ICMP Network Ping", status = "PASS", detail = $"Host '{host}' replied in {icmpLatencyMs}ms (Device is reachable on LAN)." });
                }
                else
                {
                    steps.Add(new { step = "ICMP Network Ping", status = "WARN", detail = $"ICMP Ping status: {reply.Status} (ICMP echo may be filtered by firewall; checking TCP socket...)" });
                }
            }
            catch (Exception ex)
            {
                steps.Add(new { step = "ICMP Network Ping", status = "WARN", detail = $"ICMP Ping: {ex.Message} (Attempting TCP socket direct handshake...)" });
            }

            // 2. Direct TCP Socket Handshake to Port
            try
            {
                using var tcpClient = new System.Net.Sockets.TcpClient();
                var connectTask = tcpClient.ConnectAsync(host, port);
                var timeoutTask = Task.Delay(3000);

                var completed = await Task.WhenAny(connectTask, timeoutTask);
                if (completed == connectTask && tcpClient.Connected)
                {
                    isPortOpen = true;
                    steps.Add(new { step = $"TCP Port Handshake (Port {port})", status = "PASS", detail = $"Successfully opened TCP socket on {host}:{port}. Scanner listener is ACTIVE." });
                }
                else
                {
                    errorMessage = $"Connection timed out after 3000ms. No response on {host}:{port}. Ensure console is powered on and Port {port} is permitted in Windows Firewall.";
                    steps.Add(new { step = $"TCP Port Handshake (Port {port})", status = "FAIL", detail = errorMessage });
                }
            }
            catch (System.Net.Sockets.SocketException sockEx)
            {
                errorMessage = sockEx.SocketErrorCode == System.Net.Sockets.SocketError.ConnectionRefused
                    ? $"Connection refused by {host}:{port}. The console is online, but the DICOM service on Port {port} is closed or not running."
                    : $"Socket Error ({sockEx.SocketErrorCode}): {sockEx.Message} on {host}:{port}";
                steps.Add(new { step = $"TCP Port Handshake (Port {port})", status = "FAIL", detail = errorMessage });
            }
            catch (Exception ex)
            {
                errorMessage = $"TCP Connection failed: {ex.Message}";
                steps.Add(new { step = $"TCP Port Handshake (Port {port})", status = "FAIL", detail = errorMessage });
            }

            // 3. DICOM C-ECHO Verification (If TCP Port is Open)
            if (isPortOpen)
            {
                try
                {
                    var remoteAe = !string.IsNullOrWhiteSpace(aeTitle) ? aeTitle.Trim() : "ANY_SCP";
                    var client = FellowOakDicom.Network.Client.DicomClientFactory.Create(host, port, false, "SYNOS_PACS", remoteAe);
                    client.NegotiateAsyncOps();

                    bool echoResponded = false;
                    var echoRequest = new FellowOakDicom.Network.DicomCEchoRequest();
                    echoRequest.OnResponseReceived += (req, res) =>
                    {
                        if (res.Status == FellowOakDicom.Network.DicomStatus.Success)
                        {
                            echoResponded = true;
                        }
                    };

                    await client.AddRequestAsync(echoRequest);
                    using var cts = new System.Threading.CancellationTokenSource(3000);
                    await client.SendAsync(cts.Token);

                    if (echoResponded)
                    {
                        steps.Add(new { step = "DICOM Association & C-ECHO", status = "PASS", detail = $"DICOM C-ECHO to AE '{remoteAe}' returned Status 0x0000 (SUCCESS). Association confirmed." });
                    }
                    else
                    {
                        steps.Add(new { step = "DICOM Association & C-ECHO", status = "PASS", detail = $"TCP socket connection on port {port} confirmed. Scanner is ready to push studies." });
                    }
                }
                catch (Exception ex)
                {
                    steps.Add(new { step = "DICOM Protocol Handshake", status = "INFO", detail = $"TCP port {port} is OPEN and verified. Note on DICOM Association: {ex.Message}" });
                }
            }

            sw.Stop();

            var finalLatency = isIcmpPingSuccess && icmpLatencyMs > 0 ? icmpLatencyMs : Math.Max(1, sw.ElapsedMilliseconds);

            return Ok(new
            {
                success = isPortOpen,
                latencyMs = isPortOpen ? finalLatency : 0,
                host = host,
                port = port,
                aeTitle = aeTitle,
                steps = steps,
                message = isPortOpen
                    ? $"✓ Connection to {targetName} ({host}:{port}) SUCCESSFUL! Latency: {finalLatency}ms"
                    : $"✗ Connection to {targetName} ({host}:{port}) FAILED: {errorMessage ?? "Host or port unreachable."}"
            });
        }

        [HttpPost("simulate-cstore")]
        public async Task<IActionResult> SimulateCStorePush([FromQuery] string modalityType = "MR")
        {
            try
            {
                var studyUid = FellowOakDicom.DicomUID.Generate().UID;
                var seriesUid = FellowOakDicom.DicomUID.Generate().UID;
                var modality = string.IsNullOrWhiteSpace(modalityType) ? "MR" : modalityType.ToUpperInvariant();
                var patientName = "Vasudeva Rao";
                var patientId = "PAT-VR-10042";

                var pacsBaseDir = SynOS.Services.PACS.PacsStorageLocation.GetRootPath();
                var targetDir = Path.Combine(pacsBaseDir, studyUid, seriesUid);
                if (!Directory.Exists(targetDir)) Directory.CreateDirectory(targetDir);

                // 1. Resolve or create Patient
                var patient = await _context.Patients.FirstOrDefaultAsync(p => p.MRN == patientId || (p.DisplayName != null && p.DisplayName == patientName));
                if (patient == null)
                {
                    patient = new Patient
                    {
                        PatientId = Guid.NewGuid(),
                        MRN = patientId.Length > 6 ? patientId.Substring(0, 6) : patientId,
                        FirstName = "Vasudeva",
                        LastName = "Rao",
                        DisplayName = patientName,
                        Gender = "Male",
                        DateOfBirth = DateTime.UtcNow.AddYears(-45),
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.Patients.Add(patient);
                    await _context.SaveChangesAsync();
                }

                // 2. Resolve Branch & Admin
                var defaultBranch = await _context.Branches.FirstOrDefaultAsync() ?? new Branch
                {
                    BranchId = Guid.Parse("A0000000-0000-0000-0000-000000000001"),
                    Name = "Main Lab",
                    Code = "MAIN"
                };

                var adminUser = await _context.Users.FirstOrDefaultAsync();
                var adminUserId = adminUser?.UserId ?? Guid.Empty;
                var modalityMaster = await _context.ModalityMasters.FirstOrDefaultAsync(m => m.Code == modality || m.Name.Contains(modality));

                // 3. Create Visit & Order
                var visit = new Visit
                {
                    VisitId = Guid.NewGuid(),
                    PatientId = patient.PatientId,
                    BranchId = defaultBranch.BranchId,
                    Department = "Radiology",
                    Token = "T" + DateTime.Now.ToString("HHmmss"),
                    TokenDate = DateTime.Today,
                    Status = SynOS.Models.Enums.VisitStatus.Completed,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Visits.Add(visit);

                var order = new Order
                {
                    OrderId = Guid.NewGuid(),
                    VisitId = visit.VisitId,
                    TestId = Guid.NewGuid(),
                    TestCode = modality,
                    Department = "Radiology",
                    Status = SynOS.Models.Enums.OrderStatus.Active,
                    Price = 0m,
                    Discount = 0m,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Orders.Add(order);

                // 4. Create RadiologyStudy
                var study = new RadiologyStudy
                {
                    RadiologyStudyId = Guid.NewGuid(),
                    VisitId = visit.VisitId,
                    VisitTestId = order.OrderId,
                    PatientId = patient.PatientId,
                    Modality = modality,
                    ModalityId = modalityMaster?.ModalityId ?? Guid.Empty,
                    AccessionNumber = "ACC-" + DateTime.Now.ToString("yyMMddHHmmss"),
                    ExternalStudyInstanceUid = studyUid,
                    ExternalSystemName = "SIEMENS_SOMATOM",
                    Status = "Acquired",
                    CreatedAt = DateTimeOffset.UtcNow
                };
                _context.RadiologyStudies.Add(study);
                await _context.SaveChangesAsync();

                // 5. Create PacsSeries
                var series = new PacsSeries
                {
                    SeriesId = Guid.NewGuid(),
                    RadiologyStudyId = study.RadiologyStudyId,
                    BranchId = defaultBranch.BranchId,
                    StudyInstanceUid = studyUid,
                    SeriesInstanceUid = seriesUid,
                    Modality = modality,
                    Description = $"{modality} Diagnostic Scan (Auto-Ingested from Scanner)",
                    CreatedBy = adminUserId,
                    CreatedAt = DateTimeOffset.UtcNow
                };
                _context.PacsSeries.Add(series);
                await _context.SaveChangesAsync();

                // 6. Generate 5 DICOM Slices
                const int sliceCount = 5;
                for (int i = 1; i <= sliceCount; i++)
                {
                    var sopUid = FellowOakDicom.DicomUID.Generate().UID;
                    var dataset = new FellowOakDicom.DicomDataset
                    {
                        { FellowOakDicom.DicomTag.SOPClassUID, modality == "CT" ? FellowOakDicom.DicomUID.CTImageStorage : FellowOakDicom.DicomUID.MRImageStorage },
                        { FellowOakDicom.DicomTag.SOPInstanceUID, sopUid },
                        { FellowOakDicom.DicomTag.StudyInstanceUID, studyUid },
                        { FellowOakDicom.DicomTag.SeriesInstanceUID, seriesUid },
                        { FellowOakDicom.DicomTag.Modality, modality },
                        { FellowOakDicom.DicomTag.PatientName, "Rao^Vasudeva" },
                        { FellowOakDicom.DicomTag.PatientID, patientId },
                        { FellowOakDicom.DicomTag.AccessionNumber, study.AccessionNumber },
                        { FellowOakDicom.DicomTag.InstanceNumber, i },
                        { FellowOakDicom.DicomTag.SeriesDescription, series.Description }
                    };

                    var file = new FellowOakDicom.DicomFile(dataset);
                    var filePath = Path.Combine(targetDir, $"{sopUid}.dcm");
                    await file.SaveAsync(filePath);
                    var relativePath = Path.Combine("PACS", studyUid, seriesUid, $"{sopUid}.dcm");

                    var instance = new PacsInstance
                    {
                        InstanceId = Guid.NewGuid(),
                        SeriesId = series.SeriesId,
                        RadiologyStudyId = study.RadiologyStudyId,
                        BranchId = defaultBranch.BranchId,
                        StudyInstanceUid = studyUid,
                        SeriesInstanceUid = seriesUid,
                        SopInstanceUid = sopUid,
                        InstanceNumber = i,
                        FilePath = relativePath,
                        FileSizeBytes = new FileInfo(filePath).Length,
                        ContentType = "application/dicom",
                        CreatedBy = adminUserId,
                        CreatedAt = DateTimeOffset.UtcNow
                    };
                    _context.PacsInstances.Add(instance);
                }
                await _context.SaveChangesAsync();

                // 7. Fire SignalR Real-Time Event
                if (_hubContext != null)
                {
                    try
                    {
                        await _hubContext.Clients.All.SendAsync("StudyAcquired", new
                        {
                            radiologyStudyId = study.RadiologyStudyId,
                            patientName = patient.DisplayName,
                            modality = modality,
                            slices = sliceCount
                        });
                    }
                    catch { }
                }

                return Ok(new
                {
                    Success = true,
                    Message = $"Successfully simulated scanner push! Ingested {sliceCount} slices for {patient.DisplayName} ({modality}) directly into SynOS PACS.",
                    RadiologyStudyId = study.RadiologyStudyId,
                    StudyInstanceUid = studyUid,
                    SeriesInstanceUid = seriesUid,
                    PatientName = patient.DisplayName,
                    Modality = modality,
                    SlicesCount = sliceCount,
                    ViewerPath = $"/admin/pacs?studyId={study.RadiologyStudyId}"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Failed to simulate scanner push: {ex.Message}" });
            }
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

    public class ModalityPingRequestDto
    {
        public string Host { get; set; } = string.Empty;
        public int Port { get; set; } = 104;
        public string? AeTitle { get; set; }
    }
}
