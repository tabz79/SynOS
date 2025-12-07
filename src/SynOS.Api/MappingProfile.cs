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
                .ForMember(dest => dest.Role, opt => opt.MapFrom(src => src.UserRoles.Select(ur => ur.Role.Name).FirstOrDefault()))
                .ForMember(dest => dest.Designation, opt => opt.MapFrom(src => src.Designation));
            
            // ReportTemplate mappings
            CreateMap<ReportTemplate, ReportTemplateDto>()
                .ForMember(dest => dest.TemplateDsl, opt => opt.MapFrom(src => (TemplateModel?)null))
                .ForMember(dest => dest.TemplateJson, opt => opt.MapFrom(src => src.TemplateJson));

            CreateMap<CreateReportTemplateDto, ReportTemplate>()
                .ForMember(dest => dest.TemplateJson, opt => opt.MapFrom(src => src.TemplateJson));

            CreateMap<UpdateReportTemplateDto, ReportTemplate>()
                .ForMember(dest => dest.TemplateJson, opt => opt.MapFrom(src => src.TemplateJson));
            
            CreateMap<RadiologyStudy, RadiologyStudyDto>()
                .ForMember(dest => dest.OrderId, opt => opt.MapFrom(src => src.VisitTestId))
                .ForMember(dest => dest.TestName, opt => opt.MapFrom(src => src.Order.TestDefinition.Name));

            CreateMap<RadiologyStudy, RadiologyStudyQueueDto>()
                .ForMember(dest => dest.TokenNumber, opt => opt.MapFrom(src => src.Visit.Token))
                .ForMember(dest => dest.PatientName, opt => opt.MapFrom(src => $"{src.Patient.FirstName} {src.Patient.LastName}"))
                .ForMember(dest => dest.PatientAge, opt => opt.MapFrom(src => (int)((DateTime.Today - src.Patient.DateOfBirth).TotalDays / 365.25)))
                .ForMember(dest => dest.PatientGender, opt => opt.MapFrom(src => src.Patient.Gender))
                .ForMember(dest => dest.TestName, opt => opt.MapFrom(src => src.Order.TestDefinition.Name))
                .ForMember(dest => dest.AssignedToTechnicianName, opt => opt.MapFrom(src => src.Technician != null ? src.Technician.Name : null));

            CreateMap<ReportAttachment, ReportAttachmentDto>();

            CreateMap<RadiologyImage, RadiologyImageDto>();

            CreateMap<Report, RadiologyReportDto>()
                .ForMember(dest => dest.RadiologyStudyId, opt => opt.MapFrom(src => src.RadiologyReport.RadiologyStudyId))
                .ForMember(dest => dest.Findings, opt => opt.MapFrom(src => src.RadiologyReport.Findings))
                .ForMember(dest => dest.Impression, opt => opt.MapFrom(src => src.RadiologyReport.Impression))
                .ForMember(dest => dest.AdditionalNotes, opt => opt.MapFrom(src => src.RadiologyReport.AdditionalNotes))
                .ForMember(dest => dest.ReportStatus, opt => opt.MapFrom(src => src.Status))
                .ForMember(dest => dest.SignedByUserName, opt => opt.MapFrom(src => src.SignedBy != null ? src.SignedBy.Name : null))
                .ForMember(dest => dest.Attachments, opt => opt.MapFrom(src => src.Attachments));
        }
    }
}
