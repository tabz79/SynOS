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

        public static async Task<string> ResolveRangeAsync(SynOSDbContext context, string parameterCode, string gender, DateTime dob, DateTime referenceDate)
        {
            string patientAgeGroup = DetermineAgeCategory(dob, referenceDate);

            var range = await context.ReferenceRanges
                .Where(r => r.Parameter.ParameterCode == parameterCode && r.IsActive &&
                           (r.Sex == "ALL" || r.Sex == gender) &&
                           (r.AgeGroup == "ALL" || r.AgeGroup == patientAgeGroup))
                .OrderByDescending(r => r.Sex == gender)
                .ThenByDescending(r => r.AgeGroup == patientAgeGroup)
                .FirstOrDefaultAsync();

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
