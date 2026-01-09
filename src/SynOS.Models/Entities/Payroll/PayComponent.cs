using System;
using System.ComponentModel.DataAnnotations;
using SynOS.Models.Enums;

namespace SynOS.Models.Entities.Payroll
{
    public class PayComponent
    {
        [Key]
        public Guid PayComponentId { get; set; }
        public string? Name { get; set; }
        public PayComponentType ComponentType { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
