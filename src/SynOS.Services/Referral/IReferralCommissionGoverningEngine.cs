using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Referral;
using SynOS.Models.Enums.Referral;

namespace SynOS.Services.Referral
{
    public class CommissionOrderEvaluation
    {
        public Guid OrderId { get; set; }
        public Guid TestId { get; set; }
        public string TestCode { get; set; } = string.Empty;
        public string TestName { get; set; } = string.Empty;
        public decimal TestPrice { get; set; }
        public decimal Discount { get; set; }
        public bool IsOutsourced { get; set; }
        public bool HasLearnedRule { get; set; }
        public CommissionType? CommissionType { get; set; }
        public decimal CommissionValue { get; set; }
        public decimal CalculatedCommission { get; set; }
        public string ResolutionReason { get; set; } = string.Empty;
    }

    public class CommissionVisitEvaluationResult
    {
        public Guid VisitId { get; set; }
        public Guid ReferralPartnerId { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public bool IsFullyResolved { get; set; }
        public int UnmappedTestCount { get; set; }
        public decimal TotalGrossBilling { get; set; }
        public decimal TotalCommissionRecognized { get; set; }
        public List<CommissionOrderEvaluation> OrderEvaluations { get; set; } = new();
    }

    public interface IReferralCommissionGoverningEngine
    {
        /// <summary>
        /// Authoritatively evaluates each order in a visit against strict doctor-test rate cards.
        /// If any test lacks a learned rate, IsFullyResolved is false and unmapped tests are identified.
        /// </summary>
        Task<CommissionVisitEvaluationResult> EvaluateVisitAsync(Guid visitId);

        /// <summary>
        /// Central checkout / billing recognition entry point.
        /// If fully resolved, writes or updates ReferralPayableFact (or ReceivableFact for PartnerCollects).
        /// If unmapped tests exist, holds payable in suspense and routes to Rate Queue.
        /// </summary>
        Task<CommissionVisitEvaluationResult> ProcessBillingRecognitionAsync(Guid visitId);

        /// <summary>
        /// Atomically recalculates unsettled visits for a partner after new test rate cards are committed.
        /// </summary>
        Task<int> RecalculatePartnerPendingVisitsAsync(Guid partnerId);
    }
}
