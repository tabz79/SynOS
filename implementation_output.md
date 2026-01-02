### Flow B Trigger Logic Implementation

**1. `using` statements added to `src/SynOS.Services/ReportService.cs`:**
```csharp
using SynOS.Models.Entities.AR;
```

**2. Modified `SignReportAsync` method in `src/SynOS.Services/ReportService.cs`:**
```csharp
        public async Task<ReportSignatureResponseDto> SignReportAsync(Guid reportId, Guid signedByUserId)
        {
            // ... existing precondition checks ...

            // 5. Update report status
            report.Status = "Signed";
            report.CurrentVersion = newVersion;
            report.SignedByUserId = signedByUserId;
            report.SignedAt = timestamp;

            // 6. Audit log
            await _auditService.LogAsync(signedByUserId, "ReportSigned", "Report", reportId, new { NewVersion = newVersion });

            await _context.SaveChangesAsync();

            // --- FLOW B: RECEIVABLE CREATION TRIGGER ---
            var visitId = order.VisitId;
            var orderIdsForVisit = await _context.Orders
                .Where(o => o.VisitId == visitId)
                .Select(o => o.OrderId)
                .ToListAsync();

            var totalReportsForVisit = await _context.Reports
                .CountAsync(r => orderIdsForVisit.Contains(r.SourceId) && r.SourceType == "Order");

            var signedReportsForVisit = await _context.Reports
                .CountAsync(r => orderIdsForVisit.Contains(r.SourceId) && r.SourceType == "Order" && r.Status == "Signed");

            if (totalReportsForVisit > 0 && totalReportsForVisit == signedReportsForVisit)
            {
                var visit = await _context.Visits
                    .Include(v => v.Invoices)
                    .Include(v => v.ReferralPartner)
                    .FirstAsync(v => v.VisitId == visitId);

                if (visit.PaymentCollectionModel == "PartnerCollects" && visit.ReferralPartnerId.HasValue && visit.ReferralPartner != null && visit.ReferralPartner.IsActive)
                {
                    var invoice = visit.Invoices.Single(); // Fails if not exactly one invoice

                    var newReceivableFact = new ReceivableFact
                    {
                        ReceivableFactId = Guid.NewGuid(),
                        SourceVisitId = visit.VisitId,
                        ReferralPartnerId = visit.ReferralPartnerId.Value,
                        Amount = invoice.Total,
                        Currency = invoice.Currency,
                        OccurredAt = report.SignedAt.Value,
                        RecordedAt = DateTimeOffset.UtcNow
                    };

                    _context.ReceivableFacts.Add(newReceivableFact);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("ReceivableFact created for VisitId {VisitId} for partner {PartnerId}", visit.VisitId, visit.ReferralPartnerId);
                }
            }
            // --- END FLOW B ---


            // 7. Proper Fix: Generate and Save PDF, then create ReportVersion
            try
            {
                // ... existing PDF generation logic ...
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate and save PDF for Report {ReportId} after signing.", report.ReportId);
                // ...
            }
            
            // 8. Return response
            return new ReportSignatureResponseDto
            {
                ReportId = report.ReportId,
                SignedByUserId = signedByUserId,
                SignedAt = timestamp,
                SignatureHash = signatureHash,
                ReportVersion = newVersion
            };
        }
```
