using System.Threading.Tasks;
using SynOS.Models.DTOs.SpendEngine;

namespace SynOS.Services.SpendEngine
{
    // Spend Engine - Truth Engine
    // Write-only truth ledger for cash outflows. No logic here.
    // This is a contract only. No behavior.
    public interface ISpendService
    {
        // Defines a method to record a completed spend.
        // Method name implies "record" or "append", not calculate or process.
        // Accepts a placeholder DTO.
        // As per hard constraints:
        // - Do NOT implement the interface
        // - Do NOT add business logic
        // - Do NOT inject DbContext
        // - Do NOT reference Inventory, Cost Attribution, Revenue, IMS, or Accounting
        // - Do NOT add validation logic
        // - Do NOT add enums, status fields, or workflow concepts
        Task RecordSpendAsync(RecordSpendDto spendDto);
    }
}