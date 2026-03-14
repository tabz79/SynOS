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
using SynOS.Services;
using Xunit;

namespace SynOS.Tests
{
    public class SpecimenGroupingTests : IDisposable
    {
        private readonly SynOSDbContext _db;
        private readonly SpecimenGroupingService _service;

        public SpecimenGroupingTests()
        {
            var options = new DbContextOptionsBuilder<SynOSDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _db = new SynOSDbContext(options);

            var logger = new Mock<ILogger<SpecimenGroupingService>>();
            _service = new SpecimenGroupingService(logger.Object, _db);
        }

        [Fact]
        public async Task CreateSpecimenPlanAsync_GroupsByTubeAndSpecimen()
        {
            // Arrange
            _db.CatalogTests.AddRange(new[] {
                new CatalogTest { TestCode = "LFT", SpecimenCode = "Serum", TubeCode = "SST" },
                new CatalogTest { TestCode = "TP", SpecimenCode = "Serum", TubeCode = "SST" },
                new CatalogTest { TestCode = "CBC", SpecimenCode = "Blood", TubeCode = "EDTA" }
            });
            await _db.SaveChangesAsync();

            var orders = new List<Order> {
                new Order { OrderId = Guid.NewGuid(), TestCode = "LFT", Test = new Test { TestCode = "LFT", SpecimenTypeCode = "Serum" } },
                new Order { OrderId = Guid.NewGuid(), TestCode = "TP", Test = new Test { TestCode = "TP", SpecimenTypeCode = "Serum" } },
                new Order { OrderId = Guid.NewGuid(), TestCode = "CBC", Test = new Test { TestCode = "CBC", SpecimenTypeCode = "Blood" } }
            };

            // Act
            var plan = await _service.CreateSpecimenPlanAsync(orders);

            // Assert
            Assert.Equal(2, plan.Count);
            
            var sstGroup = plan.First(p => p.TubeCode == "SST");
            Assert.Equal(2, sstGroup.Orders.Count);
            Assert.Equal("Serum", sstGroup.SpecimenTypeCode);
            Assert.Equal(1, sstGroup.RequiredTubes);

            var edtaGroup = plan.First(p => p.TubeCode == "EDTA");
            Assert.Equal(1, edtaGroup.Orders.Count);
            Assert.Equal("Blood", edtaGroup.SpecimenTypeCode);
            Assert.Equal(1, edtaGroup.RequiredTubes);
        }

        public void Dispose()
        {
            _db.Database.EnsureDeleted();
            _db.Dispose();
        }
    }
}
