using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Payroll
{
    public class PayStructure
    {
        [Key]
        public Guid PayStructureId { get; set; }
        public string? Name { get; set; }
        public string? Description { get; set; }
    }
}
