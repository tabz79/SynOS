using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.Reception;
using SynOS.Models.Entities;
using SynOS.Services.Reception;
using Xunit;

namespace SynOS.Tests
{
    public class ReceptionPatientServiceTests
    {
        private SynOSDbContext GetDbContext()
        {
            var options = new DbContextOptionsBuilder<SynOSDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            return new SynOSDbContext(options);
        }

        [Fact]
        public async Task RegisterPatient_Throws_When_Phone_Missing_And_Not_NoMobile()
        {
            using var db = GetDbContext();
            var service = new ReceptionPatientService(db);

            var req = new IntakeRegisterPatientRequest
            {
                Name = "John Doe",
                Phone = "",
                HasNoMobile = false
            };

            await Assert.ThrowsAsync<ArgumentException>(() => service.RegisterPatientAsync(req));
        }

        [Fact]
        public async Task RegisterPatient_Succeeds_When_HasNoMobile_Is_True()
        {
            using var db = GetDbContext();
            var service = new ReceptionPatientService(db);

            var req = new IntakeRegisterPatientRequest
            {
                Name = "Ramesh Senior",
                Phone = null,
                HasNoMobile = true,
                NoMobileReason = "Elderly / Senior",
                Gender = "Male",
                Dob = new DateTime(1955, 5, 10),
                IsDateOfBirthKnown = true
            };

            var res = await service.RegisterPatientAsync(req);

            Assert.NotNull(res);
            Assert.NotEmpty(res.MRN);
            Assert.NotEqual(Guid.Empty, res.PatientId);

            var created = await db.Patients.FindAsync(res.PatientId);
            Assert.NotNull(created);
            Assert.Equal("Ramesh Senior", created.DisplayName);
            Assert.Equal(string.Empty, created.CurrentPhoneNumber);
            Assert.Empty(created.PhoneHistory);
        }

        [Fact]
        public async Task FuzzyMatch_Finds_And_Scores_Matching_Patients()
        {
            using var db = GetDbContext();
            
            // Seed patients
            var p1 = new Patient
            {
                PatientId = Guid.NewGuid(),
                MRN = "A00010",
                DisplayName = "Ramesh Kumar",
                FirstName = "Ramesh",
                LastName = "Kumar",
                Gender = "Male",
                DateOfBirth = DateTime.UtcNow.AddYears(-45),
                CurrentPhoneNumber = "", // No phone
                CreatedAt = DateTime.UtcNow.AddDays(-10)
            };
            var p2 = new Patient
            {
                PatientId = Guid.NewGuid(),
                MRN = "A00011",
                DisplayName = "Suresh Patel",
                FirstName = "Suresh",
                LastName = "Patel",
                Gender = "Male",
                DateOfBirth = DateTime.UtcNow.AddYears(-30),
                CurrentPhoneNumber = "9876543210",
                CreatedAt = DateTime.UtcNow.AddDays(-5)
            };

            db.Patients.AddRange(p1, p2);
            await db.SaveChangesAsync();

            var service = new ReceptionPatientService(db);

            var matches = (await service.FindFuzzyMatchesAsync("Ramesh Kumar", "Male", 45, null)).ToList();

            Assert.NotEmpty(matches);
            Assert.Equal("A00010", matches[0].MRN);
            Assert.True(matches[0].HasNoMobile);
            Assert.True(matches[0].MatchScore >= 50);
        }
    }
}
