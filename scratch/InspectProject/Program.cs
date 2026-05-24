using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;

var optionsBuilder = new DbContextOptionsBuilder<SynOSDbContext>();
optionsBuilder.UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;MultipleActiveResultSets=true");

using var context = new SynOSDbContext(optionsBuilder.Options);

var tests = context.Tests
    .Include(t => t.ProfileChildren)
    .ToList();

var testCodesToVerify = new[] { "LIPID", "CBC", "EHP01" };

Console.WriteLine("---------------------------------------------");
Console.WriteLine("VERIFYING SPECIMEN CONFIGURATION VALIDATION");
Console.WriteLine("---------------------------------------------");

foreach (var code in testCodesToVerify)
{
    var test = tests.FirstOrDefault(t => t.TestCode.Equals(code, StringComparison.OrdinalIgnoreCase));
    if (test == null)
    {
        Console.WriteLine($"[ERROR] Test {code} not found in database.");
        continue;
    }

    Console.WriteLine($"Found Test: {test.TestCode}");
    Console.WriteLine($"  - Name: {test.TestName}");
    Console.WriteLine($"  - SpecimenTypeCode: '{test.SpecimenTypeCode}'");
    Console.WriteLine($"  - IsProfile: {test.IsProfile}");
    Console.WriteLine($"  - ProfileChildren Count: {test.ProfileChildren?.Count ?? 0}");

    // Simulate validation rule
    bool wouldThrow = false;
    string errorMessage = "";

    if (string.IsNullOrEmpty(test.SpecimenTypeCode))
    {
        if (!test.IsProfile || (test.ProfileChildren != null && !test.ProfileChildren.Any()))
        {
            wouldThrow = true;
            errorMessage = $"Specimen type not configured for test {test.TestCode}";
        }
    }

    if (wouldThrow)
    {
        Console.WriteLine($"  - [VALIDATION FAILED] Would throw: {errorMessage}");
    }
    else
    {
        Console.WriteLine("  - [VALIDATION PASSED] Ready for reception booking without 409 conflict!");
    }
    Console.WriteLine();
}
Console.WriteLine("---------------------------------------------");
