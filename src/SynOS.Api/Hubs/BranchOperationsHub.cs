using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;

namespace SynOS.Api.Hubs
{
    public class BranchOperationsHub : Hub
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<BranchOperationsHub> _logger;

        public BranchOperationsHub(SynOSDbContext context, ILogger<BranchOperationsHub> logger)
        {
            _context = context;
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            var sessionMode = Context.User?.FindFirst("session_mode")?.Value;
            var branchIdClaim = Context.User?.FindFirst("branch_id")?.Value;

            if (sessionMode == "oversight")
            {
                // MANDATORY HARDENING (Requirement 4): Oversight users do not join branch groups automatically
                await base.OnConnectedAsync();
                return;
            }

            if (string.IsNullOrEmpty(branchIdClaim) || !Guid.TryParse(branchIdClaim, out var branchId))
            {
                Context.Abort();
                return;
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, $"Branch-{branchId}");
            
            var departmentCode = Context.User?.FindFirst("department_code")?.Value;
            if (!string.IsNullOrEmpty(departmentCode))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"branch:{branchId}:dept:{departmentCode}");
            }

            await base.OnConnectedAsync();
        }

        /// <summary>
        /// Allows a terminal to register for specific hardware capabilities (e.g., Thermal80mm).
        /// The backend strictly enforces if the terminal is permitted to act as the Lead Printer for the branch,
        /// ensuring only authorized instances join the SignalR event group.
        /// </summary>
        /// <param name="branchId">The physical branch the terminal resides in.</param>
        /// <param name="terminalId">The unique hardware/browser footprint ID of the terminal.</param>
        /// <param name="capability">The capability requested, e.g., "Thermal80mm".</param>
        public async Task RegisterCapability(Guid branchId, string terminalId, string capability)
        {
            if (string.IsNullOrWhiteSpace(terminalId))
            {
                _logger.LogWarning("Terminal registration rejected: TerminalId is missing.");
                return;
            }

            // Backend Authorization: Ensure this terminal is designated as the Lead Printer for this branch.
            var isLead = await _context.TerminalPrinterConfigs
                .AsNoTracking()
                .AnyAsync(c => c.BranchId == branchId 
                            && c.TerminalIdentifier == terminalId 
                            && c.IsLeadPrintTerminal);

            if (isLead && (capability == "Thermal80mm" || capability == "BarcodeZebra"))
            {
                // Join the standardized capability group
                string groupName = $"Branch-{branchId}-{capability}";
                await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
                
                _logger.LogInformation("Terminal {TerminalIdentifier} authorized and added to {Capability} group for Branch {BranchId}.", terminalId, capability, branchId);
                
                // Acknowledge back to the caller
                await Clients.Caller.SendAsync("CapabilityRegistered", capability, true);
            }
            else
            {
                _logger.LogInformation("Terminal {TerminalIdentifier} attempted to register {Capability} for Branch {BranchId} but lacked Lead authorization.", terminalId, capability, branchId);
                await Clients.Caller.SendAsync("CapabilityRegistered", capability, false);
            }
        }
    }
}
