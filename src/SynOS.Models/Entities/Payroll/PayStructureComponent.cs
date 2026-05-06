using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Payroll
{
    public class PayStructureComponent
    {
        [Key]
        public Guid PayStructureComponentId { get; set; }
        public Guid PayStructureId { get; set; }
        public Guid PayComponentId { get; set; }
        public decimal BaseAmount { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}