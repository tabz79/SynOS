using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Enums;
using SynOS.Models.Events;
using SynOS.Services;
using SynOS.Services.Inventory;
using SynOS.Services.Operational;
using SynOS.Services.Referral;
using SynOS.Services.Revenue;
using SynOS.Services.Security;
using SynOS.Services.Time;
using Xunit;

namespace SynOS.Tests
{
    public class VisitTokenInvariantTests
    {
        private SynOSDbContext GetDbContext()
        {
            var options = new DbContextOptionsBuilder<SynOSDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            return new SynOSDbContext(options);
        }

        private VisitService CreateService(SynOSDbContext db, Guid branchId)
        {
            var loggerMock = new Mock<ILogger<VisitService>>();
            var testsCacheMock = new Mock<ITestsCacheService>();
            var auditMock = new Mock<IAuditService>();
            var eventWriterMock = new Mock<IOperationalEventWriter>();
            var userContextMock = new Mock<IUserContext>();
            userContextMock.Setup(u => u.CurrentBranchId).Returns(branchId);

            var referralMock = new Mock<IReferralFinancialService>();
            var factWriterMock = new Mock<IRevenueFactWriter>();
            var revenueEngineMock = new Mock<IRevenueEngine>();
            var labTimeMock = new Mock<ILabTimeProvider>();
            labTimeMock.Setup(t => t.GetLabToday()).Returns(new DateTime(2026, 11, 6));

            var lifecycleMock = new Mock<IVisitLifecyclePolicy>();
            var outboxMock = new Mock<IMiddlewareOutboxService>();
            var imsMock = new Mock<IImsConsumptionService>();

            return new VisitService(
                db,
                loggerMock.Object,
                testsCacheMock.Object,
                auditMock.Object,
                eventWriterMock.Object,
                userContextMock.Object,
                referralMock.Object,
                factWriterMock.Object,
                revenueEngineMock.Object,
                labTimeMock.Object,
                lifecycleMock.Object,
                outboxMock.Object,
                imsMock.Object
            );
        }

        [Fact]
        public async Task AssignOfficialTokenAsync_ThrowsInvalidOperationException_WhenVisitInDraftStatus()
        {
            // 🏛️ ENTERPRISE ARCHITECTURAL INVARIANT TEST:
            // Official tokens (e.g. MAI-001) MUST NEVER be assigned while a visit is in Draft status.
            using var db = GetDbContext();
            var branchId = Guid.NewGuid();
            var service = CreateService(db, branchId);

            var visitId = Guid.NewGuid();
            var actorUserId = Guid.NewGuid();

            var draftVisit = new Visit
            {
                VisitId = visitId,
                Token = "D-1A2B3C4D5E6F",
                Status = VisitStatus.Draft,
                Department = "Pathology",
                BranchId = branchId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.Visits.Add(draftVisit);
            await db.SaveChangesAsync();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.AssignOfficialTokenAsync(visitId, actorUserId));

            Assert.Contains("ENTERPRISE ARCHITECTURAL INVARIANT VIOLATION", ex.Message);
            Assert.Contains("Draft", ex.Message);

            // Verify visit still holds ephemeral token in DB
            var dbVisit = await db.Visits.FindAsync(visitId);
            Assert.NotNull(dbVisit);
            Assert.Equal("D-1A2B3C4D5E6F", dbVisit.Token);
            Assert.Equal(VisitStatus.Draft, dbVisit.Status);
        }

        [Fact]
        public async Task AssignOfficialTokenAsync_Succeeds_WhenVisitStatusIsPaid()
        {
            // 🏛️ Completed checkout allows official daily token assignment
            using var db = GetDbContext();
            var branchId = Guid.NewGuid();
            var branch = new Branch
            {
                BranchId = branchId,
                Name = "Main Lab",
                Code = "MAI",
                IsActive = true
            };
            db.Branches.Add(branch);

            var service = CreateService(db, branchId);

            var visitId = Guid.NewGuid();
            var actorUserId = Guid.NewGuid();

            var completedVisit = new Visit
            {
                VisitId = visitId,
                Token = "D-1A2B3C4D5E6F",
                Status = VisitStatus.Paid,
                Department = "Pathology",
                BranchId = branchId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.Visits.Add(completedVisit);
            await db.SaveChangesAsync();

            // Act
            var assignedToken = await service.AssignOfficialTokenAsync(visitId, actorUserId);

            // Assert
            Assert.StartsWith("MAI-", assignedToken);

            var dbVisit = await db.Visits.FindAsync(visitId);
            Assert.NotNull(dbVisit);
            Assert.Equal(assignedToken, dbVisit.Token);
            Assert.Equal(VisitStatus.Paid, dbVisit.Status);
        }

        [Fact]
        public async Task AssignOfficialTokenAsync_IsIdempotent_WhenVisitAlreadyHasOfficialToken()
        {
            // 🏛️ If already promoted, returns existing token without burning a new one
            using var db = GetDbContext();
            var branchId = Guid.NewGuid();
            var service = CreateService(db, branchId);

            var visitId = Guid.NewGuid();
            var actorUserId = Guid.NewGuid();

            var existingVisit = new Visit
            {
                VisitId = visitId,
                Token = "MAI-007",
                Status = VisitStatus.Paid,
                Department = "Pathology",
                BranchId = branchId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.Visits.Add(existingVisit);
            await db.SaveChangesAsync();

            // Act
            var token = await service.AssignOfficialTokenAsync(visitId, actorUserId);

            // Assert
            Assert.Equal("MAI-007", token);
        }
    }
}
