using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Services.Utils;

namespace SynOS.Scratch
{
    class Program
    {
        static async Task Main(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<SynOSDbContext>();
            optionsBuilder.UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;MultipleActiveResultSets=true");

            using var db = new SynOSDbContext(optionsBuilder.Options);
            
            var assignmentId = Guid.Parse("A8F09ED7-53B4-4A79-88E8-2CB6907BBC6B");

            // Execute the exact operational logic to construct the response
            var snapshot = await db.ProcessingAssignments
                .Where(a => a.ProcessingAssignmentId == assignmentId)
                .Select(a => new
                {
                    a.ProcessingAssignmentId,
                    a.BranchId,
                    a.DepartmentCode,
                    a.Status,
                    a.AssignedResourceId,
                    a.SpecimenId,
                    Specimen = new
                    {
                        a.Specimen.AccessionNumber,
                        a.Specimen.SpecimenTypeCode,
                        a.Specimen.CollectedAt,
                        a.Specimen.VisitId,
                        Visit = new
                        {
                            a.Specimen.Visit.PatientId,
                            Patient = new
                            {
                                a.Specimen.Visit.Patient.PatientId,
                                a.Specimen.Visit.Patient.MRN,
                                a.Specimen.Visit.Patient.FirstName,
                                a.Specimen.Visit.Patient.LastName,
                                a.Specimen.Visit.Patient.Gender,
                                a.Specimen.Visit.Patient.DateOfBirth,
                                a.Specimen.Visit.Patient.IsDateOfBirthKnown
                            }
                        }
                    }
                })
                .FirstOrDefaultAsync();

            if (snapshot == null)
            {
                Console.WriteLine("Snapshot null");
                return;
            }

            var visitId = snapshot.Specimen.VisitId;
            var patient = snapshot.Specimen.Visit.Patient;

            var orders = await db.Orders
                .Where(o => o.VisitId == visitId && o.Department == snapshot.DepartmentCode)
                .ToListAsync();

            var testCodes = orders.Select(o => o.TestCode).Distinct().ToList();

            var catalogTests = await db.CatalogTests
                .Include(t => t.Parameters)
                .Where(t => testCodes.Contains(t.TestCode))
                .ToListAsync();

            var orderIds = orders.Select(o => o.OrderId).ToList();

            var results = await db.Results
                .Where(r => orderIds.Contains(r.OrderId))
                .ToListAsync();

            var testDtos = new System.Collections.Generic.List<object>();
            foreach (var o in orders)
            {
                var catalogTest = catalogTests.FirstOrDefault(t => t.TestCode == o.TestCode);
                var parameterDtos = new System.Collections.Generic.List<object>();
                if (catalogTest?.Parameters != null)
                {
                    foreach (var cp in catalogTest.Parameters.Where(p => p.IsActive).OrderBy(p => p.SortOrder))
                    {
                        var resolvedRange = await ReferenceRangeResolver.ResolveRangeAsync(
                            db, 
                            cp.ParameterCode, 
                            patient.Gender, 
                            patient.DateOfBirth, 
                            snapshot.Specimen.CollectedAt ?? DateTime.UtcNow
                        );

                        // If no demographic range override is defined/found, fall back to cp.ReferenceRange
                        if (string.IsNullOrEmpty(resolvedRange))
                        {
                            resolvedRange = cp.ReferenceRange;
                        }

                        parameterDtos.Add(new 
                        {
                            ParameterCode = cp.ParameterCode,
                            ParameterName = cp.ParameterName,
                            DataType = cp.DataType,
                            Unit = cp.Unit,
                            ReferenceRange = resolvedRange,
                            SortOrder = cp.SortOrder
                        });
                    }
                }

                testDtos.Add(new 
                {
                    OrderId = o.OrderId,
                    TestCode = o.TestCode,
                    Parameters = parameterDtos
                });
            }

            var responseObj = new 
            {
                ProcessingAssignmentId = snapshot.ProcessingAssignmentId,
                Patient = new 
                {
                    MRN = patient.MRN,
                    Sex = patient.Gender,
                    DateOfBirth = patient.DateOfBirth
                },
                Tests = testDtos
            };

            var options = new JsonSerializerOptions { WriteIndented = true };
            Console.WriteLine("JSON_RESPONSE:");
            Console.WriteLine(JsonSerializer.Serialize(responseObj, options));
        }
    }
}
