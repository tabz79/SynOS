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
        }
    }
}
