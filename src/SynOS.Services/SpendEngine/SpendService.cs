using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs.SpendEngine;

namespace SynOS.Services.SpendEngine
{
    // Spend Engine - Truth Engine
    // Write-only truth ledger for cash outflows. No logic here.
    // This is a structural shell only, with no behavior.
    public class SpendService : ISpendService
    {
        public Task RecordSpendAsync(RecordSpendDto spendDto)
        {
            // As per instructions, method body must either be empty or throw NotImplementedException.
            throw new NotImplementedException();
        }
    }
}