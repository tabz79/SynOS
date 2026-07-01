using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;

namespace SynOS.Services.Utils
{
    public static class ReferenceRangeResolver
    {
        public static string DetermineAgeCategory(DateTime dob, DateTime referenceDate)
        {
            var timeSpan = referenceDate - dob;
            var days = timeSpan.TotalDays;

            if (days >= 0 && days <= 28)
            {
                return "Newborn";
            }

            var ageInYears = CalculateAge(dob, referenceDate);
            if (days > 28 && ageInYears < 1)
            {
                return "Infant";
            }

            if (ageInYears >= 1 && ageInYears <= 12)
            {
                return "Child";
            }

            return "Adult";
        }

        public static int CalculateAge(DateTime dob, DateTime referenceDate)
        {
            var age = referenceDate.Year - dob.Year;
            if (dob.Date > referenceDate.AddYears(-age)) age--;
            return age;
        }

        public static async Task<ReferenceRange?> ResolveRangeEntityAsync(SynOSDbContext context, string parameterCode, string gender, DateTime dob, DateTime referenceDate)
        {
            string patientAgeGroup = DetermineAgeCategory(dob, referenceDate);
            var ageInYears = CalculateAge(dob, referenceDate);

            // Fetch active ranges for the parameter
            var ranges = await context.ReferenceRanges
                .Where(r => r.Parameter.ParameterCode == parameterCode && r.IsActive)
                .ToListAsync();

            if (!ranges.Any())
            {
                return null;
            }

            // Filter by gender: matches gender or is "ALL"
            var genderMatchedRanges = ranges
                .Where(r => r.Sex == "ALL" || string.Equals(r.Sex, gender, StringComparison.OrdinalIgnoreCase))
                .ToList();

            // Find matching ranges by age bounds or category
            var matchedRanges = genderMatchedRanges.Where(r =>
            {
                // If there are explicit age bounds (numeric matching)
                if (r.AgeMin.HasValue || r.AgeMax.HasValue)
                {
                    // Newborn special case: ageMin = 0, ageMax = 0
                    if (r.AgeMin == 0 && r.AgeMax == 0)
                    {
                        return patientAgeGroup == "Newborn";
                    }
                    // Infant special case: ageMin = 0, ageMax = 1
                    if (r.AgeMin == 0 && r.AgeMax == 1)
                    {
                        return patientAgeGroup == "Infant";
                    }

                    // Otherwise, evaluate numeric bounds
                    bool minOk = !r.AgeMin.HasValue || ageInYears >= r.AgeMin.Value;
                    bool maxOk = !r.AgeMax.HasValue || ageInYears <= r.AgeMax.Value;
                    return minOk && maxOk;
                }

                // Fallback to text AgeGroup match
                return r.AgeGroup == "ALL" || string.Equals(r.AgeGroup, patientAgeGroup, StringComparison.OrdinalIgnoreCase);
            }).ToList();

            if (!matchedRanges.Any())
            {
                return null;
            }

            // Order by specificity to select the best match:
            // 1. Direct gender match is preferred over "ALL"
            // 2. Specific AgeGroup match (or specific age bounds match) is preferred over "ALL" / null bounds
            var bestRange = matchedRanges
                .OrderByDescending(r => string.Equals(r.Sex, gender, StringComparison.OrdinalIgnoreCase))
                .ThenByDescending(r => r.AgeMin.HasValue || r.AgeMax.HasValue || !string.Equals(r.AgeGroup, "ALL", StringComparison.OrdinalIgnoreCase))
                .FirstOrDefault();

            return bestRange;
        }

        public static async Task<string> ResolveRangeAsync(SynOSDbContext context, string parameterCode, string gender, DateTime dob, DateTime referenceDate)
        {
            var range = await ResolveRangeEntityAsync(context, parameterCode, gender, dob, referenceDate);

            if (range != null)
            {
                if (!string.IsNullOrEmpty(range.TextRange)) return range.TextRange;
                if (range.RefLow.HasValue && range.RefHigh.HasValue) 
                    return $"{range.RefLow.Value:#.##} - {range.RefHigh.Value:#.##}";
            }

            return string.Empty;
        }
    }
}
