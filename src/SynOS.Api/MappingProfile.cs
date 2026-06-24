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
            CreateMap<CreateTestDto, Test>()
                .ForMember(dest => dest.ReportTemplateId, opt => opt.MapFrom(src => src.ReportTemplateId))
                .ForMember(dest => dest.Parameters, opt => opt.Ignore())
                .ForMember(dest => dest.ReportTitle, opt => opt.MapFrom(src => src.ReportTitle));
            CreateMap<UpdateTestDto, Test>()
                .ForMember(dest => dest.ReportTemplateId, opt => opt.MapFrom(src => src.ReportTemplateId))
                .ForMember(dest => dest.Parameters, opt => opt.Ignore())
                .ForMember(dest => dest.ReportTitle, opt => opt.MapFrom(src => src.ReportTitle));
            CreateMap<Test, TestDto>()
                .ForMember(dest => dest.ReportTemplateId, opt => opt.MapFrom(src => src.ReportTemplateId))
                .ForMember(dest => dest.Department, opt => opt.MapFrom(src => src.DepartmentMaster != null ? src.DepartmentMaster.Name : string.Empty))
                .ForMember(dest => dest.ModalityId, opt => opt.MapFrom(src => src.ModalityId))
                .ForMember(dest => dest.ModalityName, opt => opt.MapFrom(src => src.ModalityMaster != null ? src.ModalityMaster.Name : null))
                .ForMember(dest => dest.DefaultInterpretation, opt => opt.MapFrom(src => src.DefaultInterpretation))
                .ForMember(dest => dest.ReportTitle, opt => opt.MapFrom(src => src.ReportTitle))
                .ForMember(dest => dest.BasePrice, opt => opt.MapFrom(src => 
                    src.TestPricings != null && src.TestPricings.Any()
                    ? (src.TestPricings.OrderByDescending(tp => tp.EffectiveFrom).FirstOrDefault() != null
                       ? src.TestPricings.OrderByDescending(tp => tp.EffectiveFrom).FirstOrDefault()!.BasePrice
                       : 0m)
                    : 0m))
                .ForMember(dest => dest.Parameters, opt => opt.MapFrom(src => 
                    src.Parameters != null 
                    ? src.Parameters.Where(p => p.IsActive).OrderBy(p => p.SortOrder).ToList() 
                    : new List<Parameter>()))
                .ForMember(dest => dest.IncludedTestCodes, opt => opt.MapFrom(src => 
                    src.ProfileChildren != null 
                    ? src.ProfileChildren.Where(pc => pc.ChildTest != null).OrderBy(pc => pc.Sequence).Select(pc => pc.ChildTest!.TestCode).ToList() 
                    : new List<string>()));

            CreateMap<CreateParameterDto, Parameter>();
            CreateMap<UpdateParameterDto, Parameter>();
            CreateMap<Parameter, ParameterDto>()
                .ForMember(dest => dest.UseMale, opt => opt.MapFrom(src => src.ReferenceRanges != null && src.ReferenceRanges.Any(r => r.Sex == "Male" && r.AgeGroup == "ALL" && r.IsActive)))
                .ForMember(dest => dest.MaleMin, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Male" && r.AgeGroup == "ALL" && r.IsActive).Select(r => r.RefLow).FirstOrDefault() : null))
                .ForMember(dest => dest.MaleMax, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Male" && r.AgeGroup == "ALL" && r.IsActive).Select(r => r.RefHigh).FirstOrDefault() : null))
                .ForMember(dest => dest.UseFemale, opt => opt.MapFrom(src => src.ReferenceRanges != null && src.ReferenceRanges.Any(r => r.Sex == "Female" && r.AgeGroup == "ALL" && r.IsActive)))
                .ForMember(dest => dest.FemaleMin, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Female" && r.AgeGroup == "ALL" && r.IsActive).Select(r => r.RefLow).FirstOrDefault() : null))
                .ForMember(dest => dest.FemaleMax, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Female" && r.AgeGroup == "ALL" && r.IsActive).Select(r => r.RefHigh).FirstOrDefault() : null))
                .ForMember(dest => dest.UseInfant, opt => opt.MapFrom(src => src.ReferenceRanges != null && src.ReferenceRanges.Any(r => r.AgeGroup == "Infant" && r.IsActive)))
                .ForMember(dest => dest.InfantMin, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.AgeGroup == "Infant" && r.IsActive).Select(r => r.RefLow).FirstOrDefault() : null))
                .ForMember(dest => dest.InfantMax, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.AgeGroup == "Infant" && r.IsActive).Select(r => r.RefHigh).FirstOrDefault() : null))
                .ForMember(dest => dest.UseChild, opt => opt.MapFrom(src => src.ReferenceRanges != null && src.ReferenceRanges.Any(r => r.AgeGroup == "Child" && r.IsActive)))
                .ForMember(dest => dest.ChildMin, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.AgeGroup == "Child" && r.IsActive).Select(r => r.RefLow).FirstOrDefault() : null))
                .ForMember(dest => dest.ChildMax, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.AgeGroup == "Child" && r.IsActive).Select(r => r.RefHigh).FirstOrDefault() : null))
                .ForMember(dest => dest.UseAdult, opt => opt.MapFrom(src => src.ReferenceRanges != null && src.ReferenceRanges.Any(r => r.AgeGroup == "Adult" && r.IsActive)))
                .ForMember(dest => dest.AdultMin, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.AgeGroup == "Adult" && r.IsActive).Select(r => r.RefLow).FirstOrDefault() : null))
                .ForMember(dest => dest.AdultMax, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.AgeGroup == "Adult" && r.IsActive).Select(r => r.RefHigh).FirstOrDefault() : null))
                
                // Category overrides
                .ForMember(dest => dest.UseNewbornMale, opt => opt.MapFrom(src => src.ReferenceRanges != null && src.ReferenceRanges.Any(r => r.Sex == "Male" && r.AgeGroup == "Newborn" && r.IsActive)))
                .ForMember(dest => dest.NewbornMaleMin, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Male" && r.AgeGroup == "Newborn" && r.IsActive).Select(r => r.RefLow).FirstOrDefault() : null))
                .ForMember(dest => dest.NewbornMaleMax, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Male" && r.AgeGroup == "Newborn" && r.IsActive).Select(r => r.RefHigh).FirstOrDefault() : null))
                .ForMember(dest => dest.NewbornMaleText, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Male" && r.AgeGroup == "Newborn" && r.IsActive).Select(r => r.TextRange).FirstOrDefault() : null))
                
                .ForMember(dest => dest.UseNewbornFemale, opt => opt.MapFrom(src => src.ReferenceRanges != null && src.ReferenceRanges.Any(r => r.Sex == "Female" && r.AgeGroup == "Newborn" && r.IsActive)))
                .ForMember(dest => dest.NewbornFemaleMin, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Female" && r.AgeGroup == "Newborn" && r.IsActive).Select(r => r.RefLow).FirstOrDefault() : null))
                .ForMember(dest => dest.NewbornFemaleMax, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Female" && r.AgeGroup == "Newborn" && r.IsActive).Select(r => r.RefHigh).FirstOrDefault() : null))
                .ForMember(dest => dest.NewbornFemaleText, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Female" && r.AgeGroup == "Newborn" && r.IsActive).Select(r => r.TextRange).FirstOrDefault() : null))
                
                .ForMember(dest => dest.UseInfantMale, opt => opt.MapFrom(src => src.ReferenceRanges != null && src.ReferenceRanges.Any(r => r.Sex == "Male" && r.AgeGroup == "Infant" && r.IsActive)))
                .ForMember(dest => dest.InfantMaleMin, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Male" && r.AgeGroup == "Infant" && r.IsActive).Select(r => r.RefLow).FirstOrDefault() : null))
                .ForMember(dest => dest.InfantMaleMax, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Male" && r.AgeGroup == "Infant" && r.IsActive).Select(r => r.RefHigh).FirstOrDefault() : null))
                .ForMember(dest => dest.InfantMaleText, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Male" && r.AgeGroup == "Infant" && r.IsActive).Select(r => r.TextRange).FirstOrDefault() : null))
                
                .ForMember(dest => dest.UseInfantFemale, opt => opt.MapFrom(src => src.ReferenceRanges != null && src.ReferenceRanges.Any(r => r.Sex == "Female" && r.AgeGroup == "Infant" && r.IsActive)))
                .ForMember(dest => dest.InfantFemaleMin, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Female" && r.AgeGroup == "Infant" && r.IsActive).Select(r => r.RefLow).FirstOrDefault() : null))
                .ForMember(dest => dest.InfantFemaleMax, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Female" && r.AgeGroup == "Infant" && r.IsActive).Select(r => r.RefHigh).FirstOrDefault() : null))
                .ForMember(dest => dest.InfantFemaleText, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Female" && r.AgeGroup == "Infant" && r.IsActive).Select(r => r.TextRange).FirstOrDefault() : null))
                
                .ForMember(dest => dest.UseChildMale, opt => opt.MapFrom(src => src.ReferenceRanges != null && src.ReferenceRanges.Any(r => r.Sex == "Male" && r.AgeGroup == "Child" && r.IsActive)))
                .ForMember(dest => dest.ChildMaleMin, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Male" && r.AgeGroup == "Child" && r.IsActive).Select(r => r.RefLow).FirstOrDefault() : null))
                .ForMember(dest => dest.ChildMaleMax, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Male" && r.AgeGroup == "Child" && r.IsActive).Select(r => r.RefHigh).FirstOrDefault() : null))
                .ForMember(dest => dest.ChildMaleText, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Male" && r.AgeGroup == "Child" && r.IsActive).Select(r => r.TextRange).FirstOrDefault() : null))
                
                .ForMember(dest => dest.UseChildFemale, opt => opt.MapFrom(src => src.ReferenceRanges != null && src.ReferenceRanges.Any(r => r.Sex == "Female" && r.AgeGroup == "Child" && r.IsActive)))
                .ForMember(dest => dest.ChildFemaleMin, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Female" && r.AgeGroup == "Child" && r.IsActive).Select(r => r.RefLow).FirstOrDefault() : null))
                .ForMember(dest => dest.ChildFemaleMax, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Female" && r.AgeGroup == "Child" && r.IsActive).Select(r => r.RefHigh).FirstOrDefault() : null))
                .ForMember(dest => dest.ChildFemaleText, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Female" && r.AgeGroup == "Child" && r.IsActive).Select(r => r.TextRange).FirstOrDefault() : null))
                
                .ForMember(dest => dest.UseAdultMale, opt => opt.MapFrom(src => src.ReferenceRanges != null && src.ReferenceRanges.Any(r => r.Sex == "Male" && r.AgeGroup == "Adult" && r.IsActive)))
                .ForMember(dest => dest.AdultMaleMin, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Male" && r.AgeGroup == "Adult" && r.IsActive).Select(r => r.RefLow).FirstOrDefault() : null))
                .ForMember(dest => dest.AdultMaleMax, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Male" && r.AgeGroup == "Adult" && r.IsActive).Select(r => r.RefHigh).FirstOrDefault() : null))
                .ForMember(dest => dest.AdultMaleText, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Male" && r.AgeGroup == "Adult" && r.IsActive).Select(r => r.TextRange).FirstOrDefault() : null))
                
                .ForMember(dest => dest.UseAdultFemale, opt => opt.MapFrom(src => src.ReferenceRanges != null && src.ReferenceRanges.Any(r => r.Sex == "Female" && r.AgeGroup == "Adult" && r.IsActive)))
                .ForMember(dest => dest.AdultFemaleMin, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Female" && r.AgeGroup == "Adult" && r.IsActive).Select(r => r.RefLow).FirstOrDefault() : null))
                .ForMember(dest => dest.AdultFemaleMax, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Female" && r.AgeGroup == "Adult" && r.IsActive).Select(r => r.RefHigh).FirstOrDefault() : null))
                .ForMember(dest => dest.AdultFemaleText, opt => opt.MapFrom(src => src.ReferenceRanges != null ? src.ReferenceRanges.Where(r => r.Sex == "Female" && r.AgeGroup == "Adult" && r.IsActive).Select(r => r.TextRange).FirstOrDefault() : null));

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
                .ForMember(dest => dest.Role, opt => opt.MapFrom(src => src.UserRoles != null && src.UserRoles.Any() && src.UserRoles.FirstOrDefault() != null && src.UserRoles.FirstOrDefault()!.Role != null ? src.UserRoles.FirstOrDefault()!.Role!.Name : "Unknown"));

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
