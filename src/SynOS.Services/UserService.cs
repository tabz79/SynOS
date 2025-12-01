// File: src/SynOS.Services/UserService.cs
// Author: Gemini
// Date: 2025-11-30

using AutoMapper;
using Microsoft.AspNetCore.Http;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Services.Storage;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace SynOS.Services
{
    public class UserService : IUserService
    {
        private readonly SynOSDbContext _context;
        private readonly IFileStorageService _fileStorageService;
        private readonly IMapper _mapper;

        public UserService(SynOSDbContext context, IFileStorageService fileStorageService, IMapper mapper)
        {
            _context = context;
            _fileStorageService = fileStorageService;
            _mapper = mapper;
        }

        public async Task<UserSignatureDto> UpdateUserSignatureAsync(Guid userId, IFormFile signatureFile)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                throw new KeyNotFoundException("User not found.");
            }

            var allowedMimeTypes = new List<string> { "image/jpeg", "image/png" };
            var maxFileSize = 512 * 1024; // 512 KB

            var signatureUrl = await _fileStorageService.SaveFileAsync(signatureFile, allowedMimeTypes, maxFileSize, "signatures");

            user.SignatureImageUrl = signatureUrl;
            user.SignatureUpdatedAt = DateTimeOffset.UtcNow;

            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            return new UserSignatureDto
            {
                UserId = user.UserId,
                SignatureImageUrl = user.SignatureImageUrl,
                UpdatedAt = user.SignatureUpdatedAt
            };
        }
    }
}
