using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using SynOS.Data;
using SynOS.Models.Entities.Operations;
using SynOS.Models.Enums;
using SynOS.Services.Assignment;
using Xunit;

namespace SynOS.Tests.Assignment
{
    public class WorkRoutingEngineTests
    {
        private SynOSDbContext GetInMemoryContext(string dbName)
        {
            var options = new DbContextOptionsBuilder<SynOSDbContext>()
                .UseInMemoryDatabase(databaseName: dbName)
                .Options;
            
            var context = new SynOSDbContext(options);
            return context;
        }

        [Fact]
        public async Task AssignAsync_CrossBranchAssignment_ShouldBeBlocked()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            using var context = GetInMemoryContext(dbName);
            
            var loggerMock = new Mock<ILogger<WorkRoutingEngine>>();
            var engine = new WorkRoutingEngine(context, loggerMock.Object);

            var branchAId = Guid.NewGuid();
            var branchBId = Guid.NewGuid();

            // Create a resource in Branch A
            var resourceA = new OperationalResource
            {
                OperationalResourceId = Guid.NewGuid(),
                UserId = Guid.NewGuid(),
                BranchId = branchAId,
                DepartmentCode = "Pathology",
                Role = "Phlebotomist",
                IsActive = true,
                IsOnline = true
            };
            
            context.OperationalResources.Add(resourceA);
            await context.SaveChangesAsync();

            var visitIdFromBranchB = Guid.NewGuid();

            // Act: Attempt to assign a Pathology visit originating from Branch B
            // The routing engine MUST strictly isolate and find NO resources for Branch B,
            // even though a perfectly matching resource (Pathology/Phlebotomist) exists in Branch A.
            var assignment = await engine.AssignAsync(WorkType.SampleCollection, visitIdFromBranchB, branchBId, "Pathology");

            // Assert
            Assert.NotNull(assignment);
            Assert.Null(assignment.AssignedResourceId); // Must be null because cross-branch is blocked
            Assert.Equal(WorkAssignmentStatus.PendingAssignment, assignment.Status);

            // Verify a valid intra-branch assignment works
            var visitIdFromBranchA = Guid.NewGuid();
            var validAssignment = await engine.AssignAsync(WorkType.SampleCollection, visitIdFromBranchA, branchAId, "Pathology");

            Assert.NotNull(validAssignment);
            Assert.Equal(resourceA.OperationalResourceId, validAssignment.AssignedResourceId);
            Assert.Equal(WorkAssignmentStatus.Assigned, validAssignment.Status);
        }
    }
}
