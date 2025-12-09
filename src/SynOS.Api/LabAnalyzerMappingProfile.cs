using AutoMapper;
using SynOS.Models.DTOs.LabAnalyzers;
using SynOS.Models.Entities;

namespace SynOS.Api
{
    public class LabAnalyzerMappingProfile : Profile
    {
        public LabAnalyzerMappingProfile()
        {
            CreateMap<CreateLabAnalyzerDto, LabAnalyzer>();
            CreateMap<UpdateLabAnalyzerDto, LabAnalyzer>();
            CreateMap<LabAnalyzer, LabAnalyzerSummaryDto>();
            CreateMap<LabAnalyzerResultInbox, ManualResultEnqueueResponseDto>();

            CreateMap<CreateAnalyzerTestMappingDto, LabAnalyzerTestMapping>();
            CreateMap<UpdateAnalyzerTestMappingDto, LabAnalyzerTestMapping>();
            CreateMap<LabAnalyzerTestMapping, AnalyzerTestMappingSummaryDto>()
                .ForMember(dest => dest.AnalyzerName, opt => opt.MapFrom(src => src.Analyzer.Name));
        }
    }
}
