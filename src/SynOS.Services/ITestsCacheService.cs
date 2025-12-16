using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public interface ITestsCacheService
    {
        Task<IReadOnlyList<Test>> GetCachedTestsAsync();
        void InvalidateTestsCache();
    }
}
