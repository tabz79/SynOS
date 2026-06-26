using System.Collections.Generic;

namespace TBZ.Middleware.Api.DTOs
{
    public class TestVolumeSummaryDto
    {
        public string LabId { get; set; } = string.Empty;
        public List<TestVolumeItemDto> TopTests { get; set; } = new();
        public List<DepartmentVolumeDto> DepartmentVolumes { get; set; } = new();
    }

    public class TestVolumeItemDto
    {
        public string TestCode { get; set; } = string.Empty;
        public int VolumeCount { get; set; }
    }

    public class DepartmentVolumeDto
    {
        public string Department { get; set; } = string.Empty;
        public int VolumeCount { get; set; }
    }
}
