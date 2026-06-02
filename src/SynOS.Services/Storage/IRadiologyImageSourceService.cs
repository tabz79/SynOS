using System;
using System.IO;
using System.Threading.Tasks;

namespace SynOS.Services.Storage
{
    public interface IRadiologyImageSourceService
    {
        string ResolveImageId(Guid imageId);
        string GetImageWadoUrl(Guid imageId);
        Task<Stream> GetImageStreamAsync(Guid imageId);
    }
}
