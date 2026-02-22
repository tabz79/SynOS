using AutoMapper;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;
using SynOS.Models.DTOs.ReportTemplateDtos;
using SynOS.Models.DTOs.ReportTemplateDsl;
using System.Text.Json;
using System;
using System.Linq; // Add this using directive
using SynOS.Models.DTOs.Admin;
using SynOS.Models.Entities.Referral;
using SynOS.Models.DTOs.Admin.Referral;
using SynOS.Models.Entities.Discounts; // ADDED

namespace SynOS.Api
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            CreateMap<User, UserDto>()
                .ForMember(dest => dest.Role, opt => opt.MapFrom(src => src.UserRoles != null ? src.UserRoles.Select(ur => ur.Role != null ? ur.Role.Name : null).FirstOrDefault() : null))
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
                                .ForMember(dest => dest.TestName, opt => opt.MapFrom(src => src.Order.Test.TestName));

            CreateMap<RadiologyStudy, RadiologyStudyQueueDto>()
                .ForMember(dest => dest.TokenNumber, opt => opt.MapFrom(src => src.Visit != null ? src.Visit.Token : string.Empty))
                .ForMember(dest => dest.PatientName, opt => opt.MapFrom(src => src.Patient != null ? $"{src.Patient.FirstName} {src.Patient.LastName}" : string.Empty))
                .ForMember(dest => dest.PatientAge, opt => opt.MapFrom(src => src.Patient != null ? (int)((DateTime.Today - src.Patient.DateOfBirth).TotalDays / 365.25) : 0))
                .ForMember(dest => dest.PatientGender, opt => opt.MapFrom(src => src.Patient != null ? src.Patient.Gender : string.Empty))
                .ForMember(dest => dest.TestName, opt => opt.MapFrom(src => src.Order != null && src.Order.Test != null ? src.Order.Test.TestName : string.Empty))
                .ForMember(dest => dest.AssignedToTechnicianName, opt => opt.MapFrom(src => src.Technician != null ? src.Technician.Name : null));

            CreateMap<ReportAttachment, ReportAttachmentDto>();

            CreateMap<RadiologyImage, RadiologyImageDto>();

            CreateMap<Report, RadiologyReportDto>()
                .ForMember(dest => dest.RadiologyStudyId, opt => opt.MapFrom(src => src.RadiologyReport != null ? src.RadiologyReport.RadiologyStudyId : Guid.Empty))
                .ForMember(dest => dest.Findings, opt => opt.MapFrom(src => src.RadiologyReport != null ? src.RadiologyReport.Findings : string.Empty))
                .ForMember(dest => dest.Impression, opt => opt.MapFrom(src => src.RadiologyReport != null ? src.RadiologyReport.Impression : string.Empty))
                .ForMember(dest => dest.AdditionalNotes, opt => opt.MapFrom(src => src.RadiologyReport != null ? src.RadiologyReport.AdditionalNotes : string.Empty))
                .ForMember(dest => dest.ReportStatus, opt => opt.MapFrom(src => src.Status))
                .ForMember(dest => dest.SignedByUserName, opt => opt.MapFrom(src => src.SignedBy != null ? src.SignedBy.Name : null))
                .ForMember(dest => dest.Attachments, opt => opt.MapFrom(src => src.Attachments));

            CreateMap<ResultChangeAudit, ResultChangeAuditDto>()
                .ForMember(dest => dest.ChangedByName, opt => opt.MapFrom(src => src.ChangedByUser != null ? src.ChangedByUser.Name : "System"));
            
            // Test Master Mappings
            CreateMap<CreateTestDto, Test>();
            CreateMap<UpdateTestDto, Test>();
            CreateMap<Test, TestDto>()
                .ForMember(dest => dest.Department, opt => opt.MapFrom(src => src.DepartmentMaster != null ? src.DepartmentMaster.Name : string.Empty))
                .ForMember(dest => dest.BasePrice, opt => opt.MapFrom(src => 
                    src.TestPricings != null && src.TestPricings.Any()
                    ? src.TestPricings.OrderByDescending(tp => tp.EffectiveFrom).FirstOrDefault().BasePrice
                    : 0m));

            CreateMap<CreateParameterDto, Parameter>();
            CreateMap<UpdateParameterDto, Parameter>();
            CreateMap<Parameter, ParameterDto>();

            CreateMap<CreateReferenceRangeDto, ReferenceRange>();
            CreateMap<UpdateReferenceRangeDto, ReferenceRange>();
            CreateMap<ReferenceRange, ReferenceRangeDto>();

            CreateMap<CreatePriceConfigDto, PriceConfig>();
            CreateMap<UpdatePriceConfigDto, PriceConfig>();
            CreateMap<PriceConfig, PriceConfigDto>();

            // User Management Mappings
            CreateMap<CreateUserDto, User>();
            CreateMap<UpdateUserDto, User>();
            CreateMap<User, UserManagementDto>()
                .ForMember(dest => dest.Role, opt => opt.MapFrom(src => src.UserRoles != null && src.UserRoles.Any() && src.UserRoles.FirstOrDefault().Role != null ? src.UserRoles.FirstOrDefault().Role.Name : "Unknown"));

            CreateMap<Patient, PatientDto>();

            // Referral Mappings
            CreateMap<ReferralPartnerCreateDto, ReferralPartner>();
            CreateMap<ReferralPartnerUpdateDto, ReferralPartner>();
            CreateMap<ReferralPartner, ReferralPartnerReadDto>();

            CreateMap<ReferralCommissionRuleCreateDto, ReferralCommissionRule>();
            CreateMap<ReferralCommissionRuleUpdateDto, ReferralCommissionRule>();
            CreateMap<ReferralCommissionRule, ReferralCommissionRuleReadDto>();

            // Discount Mappings
            CreateMap<CreateDiscountDto, DiscountMaster>();
            CreateMap<UpdateDiscountDto, DiscountMaster>();
            CreateMap<DiscountMaster, DiscountDto>();
        }
    }
}
