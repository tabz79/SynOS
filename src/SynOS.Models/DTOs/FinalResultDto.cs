using System.Collections.Generic;

namespace SynOS.Models.DTOs
{
    public class FinalResultDto
    {
        public string ParameterCode { get; set; }
        public string Value { get; set; }
        public string? Remarks { get; set; }
    }

    public class SaveFinalResultsRequestDto
    {
        public List<FinalResultDto> Results { get; set; }
    }
}
