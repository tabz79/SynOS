using System;
using System.ComponentModel.DataAnnotations;
using SynOS.Models.Enums;

namespace SynOS.Models.Entities.SpendEngine
{
    public sealed class SpendFact
    {
        [Key]
        public Guid SpendFactId { get; init; }
        public Guid PayeeId { get; init; }
        public decimal Amount { get; init; }
        public string Currency { get; init; }
        public string Category { get; init; } // ADDED
        public string? PayeeName { get; init; } // ADDED: For fast operational scanning
        public string? Notes { get; init; } // ADDED: Context
        public Guid? BranchId { get; init; } // ADDED: Multi-branch tracking
        public PaymentMethod PaymentMethod { get; init; }
        public string TransactionReference { get; init; }
        public DateTime OccurredAt { get; init; }
        public DateTime RecordedAt { get; init; }
        public string Account { get; init; }
        public string Channel { get; init; }
        public Guid PaymentAttemptId { get; init; }
        public Guid PayrollRunId { get; init; }
        public Guid PaymentBatchId { get; init; }

        public SpendFact() { } // EF Core requires a parameterless constructor

        public SpendFact(
            Guid spendFactId,
            Guid payeeId,
            decimal amount,
            string currency,
            string category,
            string? payeeName,
            string? notes,
            Guid? branchId,
            PaymentMethod paymentMethod,
            string transactionReference,
            DateTime occurredAt,
            DateTime recordedAt,
            string account,
            string channel,
            Guid paymentAttemptId,
            Guid payrollRunId,
            Guid paymentBatchId)
        {
            SpendFactId = spendFactId;
            PayeeId = payeeId;
            Amount = amount;
            Currency = currency;
            Category = category;
            PayeeName = payeeName;
            Notes = notes;
            BranchId = branchId;
            PaymentMethod = paymentMethod;
            TransactionReference = transactionReference;
            OccurredAt = occurredAt;
            RecordedAt = recordedAt;
            Account = account;
            Channel = channel;
            PaymentAttemptId = paymentAttemptId;
            PayrollRunId = payrollRunId;
            PaymentBatchId = paymentBatchId;
        }
    }
}
