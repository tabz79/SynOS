using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs.Dashboard.ControlTower
{
    public class ControlTowerSummaryDto
    {
        public ControlTowerCardDto Reception { get; set; } = new();
        public ControlTowerCardDto Phlebotomy { get; set; } = new();
        public ControlTowerCardDto LabWorkbench { get; set; } = new();
        public ControlTowerCardDto ReportsTyping { get; set; } = new();
        public ControlTowerCardDto Pathologist { get; set; } = new();
        public ControlTowerCardDto Delivery { get; set; } = new();
        public FinancialStripDto Financials { get; set; } = new();
    }

    public class ControlTowerCardDto
    {
        public int Count { get; set; }
        public string PrimaryText { get; set; } = string.Empty;
        public string SecondaryText { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public List<ControlTowerItemDto> Items { get; set; } = new();
    }

    public class ControlTowerItemDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Detail { get; set; } = string.Empty;
        public string StatusBadge { get; set; } = string.Empty;
        public bool HasAlert { get; set; }
    }

    public class FinancialStripDto
    {
        public int TotalTestsDone { get; set; }
        public decimal TotalCollectionSales { get; set; }
        public decimal ReferralPayouts { get; set; }
        public decimal TotalCashReceived { get; set; }
        public decimal OnlineReceived { get; set; }
        public decimal NetCashInHand { get; set; }
    }
}
