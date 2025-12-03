using AutoMapper;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;
using SynOS.Models.DTOs.ReportTemplateDtos;
using SynOS.Models.DTOs.ReportTemplateDsl;
using System.Text.Json;
using System;
using System.Linq; // Add this using directive

namespace SynOS.Api
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            CreateMap<User, UserDto>()
                .ForMember(dest => dest.Role, opt => opt.MapFrom(src => src.UserRoles.Select(ur => ur.Role.Name).FirstOrDefault()));
            
            // ReportTemplate mappings
            CreateMap<ReportTemplate, ReportTemplateDto>()
                .ForMember(dest => dest.TemplateDsl, opt => opt.MapFrom(src => (TemplateModel?)null));

            CreateMap<CreateReportTemplateDto, ReportTemplate>()
                .ForMember(dest => dest.TemplateJson, opt => opt.MapFrom(src => src.TemplateJson));

            CreateMap<UpdateReportTemplateDto, ReportTemplate>()
                .ForMember(dest => dest.TemplateJson, opt => opt.MapFrom(src => src.TemplateJson));
        }
    }
}
