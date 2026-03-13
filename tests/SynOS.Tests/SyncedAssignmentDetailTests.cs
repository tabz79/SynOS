using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Catalog;
using SynOS.Models.Entities.Operations;
using SynOS.Models.Enums;
using SynOS.Services.Operational;
using SynOS.Services.Security;
using Xunit;

namespace SynOS.Tests
{
    public class SyncedAssignmentDetailTests
    {
        private SynOSDbContext GetDbContext()
        {
            var options = new DbContextOptionsBuilder<SynOSDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new SynOSDbContext(options);
        }

        [Fact]
        public async Task GetAssignmentDetailAsync_ReturnsCorrectHierarchy()
        {
            // Arrange
            using var db = GetDbContext();
            var userContextMock = new Mock<IUserContext>();
            var notifierMock = new Mock<INotifier>();
            var loggerMock = new Mock<ILogger<ProcessingService>>();

            var branchId = Guid.NewGuid();
            var patientId = Guid.NewGuid();
            var visitId = Guid.NewGuid();
            var specimenId = Guid.NewGuid();
            var assignmentId = Guid.NewGuid();
            var testCode = "CBC";
            var deptCode = "HEM";

            userContextMock.Setup(u => u.CurrentBranchId).Returns(branchId);
            userContextMock.Setup(u => u.DepartmentCode).Returns(deptCode);

            // 1. Seed Patient
            var patient = new Patient
            {
                PatientId = patientId,
                FirstName = "John",
                LastName = "Doe",
                Gender = "Male",
                DateOfBirth = DateTime.Today.AddYears(-30),
                MRN = "MRN123"
            };
            db.Patients.Add(patient);

            // 2. Seed Visit
            var visit = new Visit
            {
                VisitId = visitId,
                PatientId = patientId,
                BranchId = branchId,
                Token = "T101",
                TokenDate = DateTime.Today
            };
            db.Visits.Add(visit);

            // 3. Seed Order
            var order = new Order
            {
                OrderId = Guid.NewGuid(),
                VisitId = visitId,
                TestCode = testCode,
                Department = deptCode,
                Status = OrderStatus.Active
            };
            db.Orders.Add(order);

            // 4. Seed Foreign Order (Different Dept)
            var foreignOrder = new Order
            {
                OrderId = Guid.NewGuid(),
                VisitId = visitId,
                TestCode = "GLU",
                Department = "BIO",
                Status = OrderStatus.Active
            };
            db.Orders.Add(foreignOrder);

            // 5. Seed Specimen
            var specimen = new Specimen
            {
                SpecimenId = specimenId,
                VisitId = visitId,
                AccessionNumber = "A1001",
                SpecimenTypeCode = "BLOOD"
            };
            db.Specimens.Add(specimen);

            // 6. Seed Assignment
            var assignment = new ProcessingAssignment
            {
                ProcessingAssignmentId = assignmentId,
                SpecimenId = specimenId,
                DepartmentCode = deptCode,
                BranchId = branchId,
                Status = ProcessingAssignmentStatus.Pending
            };
            db.ProcessingAssignments.Add(assignment);

            // 7. Seed Catalog
            var catalogTest = new CatalogTest
            {
                TestCode = testCode,
                TestName = "Complete Blood Count",
                DepartmentCode = deptCode,
                IsActive = true
            };
            catalogTest.Parameters.Add(new CatalogParameter { ParameterCode = "HB", ParameterName = "Hemoglobin", SortOrder = 1, DataType = "Numeric" });
            catalogTest.Parameters.Add(new CatalogParameter { ParameterCode = "WBC", ParameterName = "White Blood Cells", SortOrder = 2, DataType = "Numeric" });
            db.CatalogTests.Add(catalogTest);

            // 8. Seed Existing Result
            var result = new Result
            {
                ResultId = Guid.NewGuid(),
                OrderId = order.OrderId,
                ParameterCode = "HB",
                Value = "14.5",
                Status = "Draft"
            };
            db.Results.Add(result);

            await db.SaveChangesAsync();

            var service = new ProcessingService(db, userContextMock.Object, notifierMock.Object, loggerMock.Object);

            // Act
            var detail = await service.GetAssignmentDetailAsync(assignmentId);

            // Assert
            Assert.NotNull(detail);
            Assert.Equal(assignmentId, detail.ProcessingAssignmentId);
            Assert.Equal(deptCode, detail.DepartmentCode);
            Assert.Equal("John Doe", detail.Patient.PatientName);
            Assert.Equal("A1001", detail.Specimen.AccessionNumber);

            // Verify Filtering: Only HEM test should be returned
            Assert.Single(detail.Tests);
            Assert.Equal(testCode, detail.Tests[0].TestCode);
            Assert.Equal(order.OrderId, detail.Tests[0].OrderId);

            // Verify Parameters and Result Matching
            Assert.Equal(2, detail.Tests[0].Parameters.Count);
            
            var hbParam = detail.Tests[0].Parameters.First(p => p.ParameterCode == "HB");
            Assert.Equal("14.5", hbParam.ExistingResultValue);
            Assert.Equal("Hemoglobin", hbParam.ParameterName); // Must come from Catalog

            var wbcParam = detail.Tests[0].Parameters.First(p => p.ParameterCode == "WBC");
            Assert.Null(wbcParam.ExistingResultValue);
        }
    }
}
