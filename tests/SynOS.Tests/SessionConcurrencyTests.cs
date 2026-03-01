using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SynOS.Data;
using SynOS.Models.Entities.Operations;
using SynOS.Models.Enums;
using SynOS.Services.Assignment;
using Xunit;

namespace SynOS.Tests
{
    public class SessionConcurrencyTests
    {
        private SynOSDbContext GetMemoryContext()
        {
            var options = new DbContextOptionsBuilder<SynOSDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString()) // Unique DB per test
                .Options;
            
            return new SynOSDbContext(options);
        }

        [Fact]
        public async Task OptionA_DeviceB_Login_Invalidates_DeviceA_Heartbeat()
        {
            // Arrange
            var db = GetMemoryContext();
            var logger = new Mock<ILogger<WorkRoutingEngine>>();
            var engine = new WorkRoutingEngine(db, logger.Object);

            var userId = Guid.NewGuid();
            var branchA = Guid.NewGuid();
            var branchB = Guid.NewGuid();
            
            var resource = new OperationalResource
            {
                OperationalResourceId = Guid.NewGuid(),
                UserId = userId,
                Role = "Phlebotomist",
                Department = "Pathology",
                BranchId = branchA,
                IsOnline = false,
                IsActive = false
            };
            db.OperationalResources.Add(resource);
            await db.SaveChangesAsync();

            // Act & Assert
            
            // 1. Device A Logs In (gets Session A)
            var sessionA = Guid.NewGuid();
            resource.ActiveSessionId = sessionA; // Simulated AuthService behavior
            resource.BranchId = branchA;
            await db.SaveChangesAsync();

            // Device A Goes Online
            await engine.UpdateResourceStatusAsync(userId, branchA, sessionA, isOnline: true, isActive: true);

            // Verify Device A is active at Branch A
            var currentResource = await db.OperationalResources.FindAsync(resource.OperationalResourceId);
            Assert.True(currentResource!.IsOnline);
            Assert.Equal(branchA, currentResource.BranchId);

            // 2. Device B Logs In (gets Session B) - overwrites ActiveSessionId
            var sessionB = Guid.NewGuid();
            currentResource.ActiveSessionId = sessionB; // Simulated AuthService behavior
            currentResource.BranchId = branchB;
            currentResource.IsOnline = false; // Forced offline on new login
            await db.SaveChangesAsync();

            // 3. Device A attempts Heartbeat (using old Session A)
            var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(() => 
                engine.UpdateResourceStatusAsync(userId, branchA, sessionA, isOnline: true, isActive: true));
            Assert.Equal("SessionExpiredOperationalContext", ex.Message);

            // 4. Device B goes Online (using new Session B)
            await engine.UpdateResourceStatusAsync(userId, branchB, sessionB, isOnline: true, isActive: true);

            // Verify Device B won the DB state
            var finalResource = await db.OperationalResources.FindAsync(resource.OperationalResourceId);
            Assert.True(finalResource!.IsOnline);
            Assert.Equal(branchB, finalResource.BranchId);

            // 5. Verify Routing 
            // Work for Branch A should NOT find this user
            var workA = await engine.AssignAsync(WorkType.SampleCollection, Guid.NewGuid(), branchA, "Pathology", "Phlebotomist");
            Assert.Equal(WorkAssignmentStatus.PendingAssignment, workA.Status);
            Assert.Null(workA.AssignedResourceId);

            // Work for Branch B SHOULD find this user
            var workB = await engine.AssignAsync(WorkType.SampleCollection, Guid.NewGuid(), branchB, "Pathology", "Phlebotomist");
            Assert.Equal(WorkAssignmentStatus.Assigned, workB.Status);
            Assert.Equal(finalResource.OperationalResourceId, workB.AssignedResourceId);
        }
    }
}
