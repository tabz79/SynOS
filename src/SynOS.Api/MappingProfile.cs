// File: src/SynOS.Api/MappingProfile.cs
// Author: Gemini
// Date: 2025-11-13

using AutoMapper;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;

namespace SynOS.Api
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            CreateMap<User, UserDto>();
            // TODO: Add other mappings as DTOs and Entities are created
        }
    }
}
