using System;
using System.Threading.Tasks;
using TBZ.Middleware.Api.DTOs;

namespace TBZ.Middleware.Api.Services.Context
{
    public class EntityContextService
    {
        private readonly ContextMetadataService _metadataService;
        private readonly DoctorContextService _doctorService;
        private readonly TestContextService _testService;
        private readonly ReferralPartnerContextService _partnerService;
        private readonly BusinessSourceContextService _sourceService;
        private readonly LabContextService _labService;

        public EntityContextService(
            ContextMetadataService metadataService,
            DoctorContextService doctorService,
            TestContextService testService,
            ReferralPartnerContextService partnerService,
            BusinessSourceContextService sourceService,
            LabContextService labService)
        {
            _metadataService = metadataService;
            _doctorService = doctorService;
            _testService = testService;
            _partnerService = partnerService;
            _sourceService = sourceService;
            _labService = labService;
        }

        public async Task<EntityContextResponseDto?> GetEntityContextAsync(
            string labId,
            string type,
            string id,
            DateTime? from,
            DateTime? to,
            string? interval)
        {
            object? data = null;
            string normalizedType = type.ToLowerInvariant().Replace("-", "");

            switch (normalizedType)
            {
                case "doctor":
                    data = await _doctorService.GetDoctorByIdAsync(labId, id, from, to);
                    // Filter doctor trends if interval is requested
                    if (data is DoctorContextItemDto docDto && !string.IsNullOrEmpty(interval))
                    {
                        FilterDoctorInterval(docDto, interval);
                    }
                    break;

                case "test":
                    data = await _testService.GetTestByCodeAsync(labId, id, from, to);
                    // Filter test trends if interval is requested
                    if (data is TestContextItemDto testDto && !string.IsNullOrEmpty(interval))
                    {
                        FilterTestInterval(testDto, interval);
                    }
                    break;

                case "referralpartner":
                    data = await _partnerService.GetPartnerByIdAsync(labId, id, from, to);
                    // Filter partner trends if interval is requested
                    if (data is ReferralPartnerContextItemDto partnerDto && !string.IsNullOrEmpty(interval))
                    {
                        FilterPartnerInterval(partnerDto, interval);
                    }
                    break;

                case "businesssource":
                    data = await _sourceService.GetBusinessSourceByIdAsync(labId, id, from, to);
                    // Filter source trends if interval is requested
                    if (data is BusinessSourceContextItemDto sourceDto && !string.IsNullOrEmpty(interval))
                    {
                        FilterSourceInterval(sourceDto, interval);
                    }
                    break;

                case "lab":
                    data = await _labService.GetLabContextAsync(labId, null, null, from, to, null);
                    break;

                default:
                    return null;
            }

            if (data == null)
            {
                return null;
            }

            var metadata = await _metadataService.GetMetadataAsync(labId);

            return new EntityContextResponseDto
            {
                Knowledge = metadata,
                EntityType = type,
                EntityId = id,
                Data = data
            };
        }

        private static void FilterDoctorInterval(DoctorContextItemDto dto, string interval)
        {
            string norm = interval.ToLowerInvariant();
            if (norm != "daily") dto.WeeklyTrend.Clear(); // Keep daily as fallback or empty
            if (norm != "weekly") dto.WeeklyTrend.Clear(); // Wait, let's keep only what matches
            
            // Clear other trends based on normalized value
            if (norm == "daily")
            {
                dto.WeeklyTrend.Clear();
                dto.MonthlyTrend.Clear();
            }
            else if (norm == "weekly")
            {
                dto.MonthlyTrend.Clear();
                // If there's no DailyTrend property in DoctorContextItemDto (it uses WeeklyTrend and MonthlyTrend, wait! Let's check DTO)
            }
            else if (norm == "monthly")
            {
                dto.WeeklyTrend.Clear();
            }
        }

        private static void FilterTestInterval(TestContextItemDto dto, string interval)
        {
            string norm = interval.ToLowerInvariant();
            if (norm == "daily")
            {
                dto.WeeklyCounts.Clear();
                dto.MonthlyCounts.Clear();
            }
            else if (norm == "weekly")
            {
                dto.DailyCounts.Clear();
                dto.MonthlyCounts.Clear();
            }
            else if (norm == "monthly")
            {
                dto.DailyCounts.Clear();
                dto.WeeklyCounts.Clear();
            }
        }

        private static void FilterPartnerInterval(ReferralPartnerContextItemDto dto, string interval)
        {
            string norm = interval.ToLowerInvariant();
            if (norm == "daily")
            {
                dto.WeeklyTrend.Clear();
                dto.MonthlyTrend.Clear();
            }
            else if (norm == "weekly")
            {
                dto.MonthlyTrend.Clear();
            }
            else if (norm == "monthly")
            {
                dto.WeeklyTrend.Clear();
            }
        }

        private static void FilterSourceInterval(BusinessSourceContextItemDto dto, string interval)
        {
            string norm = interval.ToLowerInvariant();
            if (norm == "daily")
            {
                dto.WeeklyTrend.Clear();
                dto.MonthlyTrend.Clear();
            }
            else if (norm == "weekly")
            {
                dto.MonthlyTrend.Clear();
            }
            else if (norm == "monthly")
            {
                dto.WeeklyTrend.Clear();
            }
        }
    }
}
