using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Payroll
{
    public class PayStructureComponent
    {
        [Key]
        public Guid PayStructureComponentId { get; set; }
        public Guid PayStructureId { get; set; }
        public Guid PayComponentId { get; set; }
        [Column(TypeName = "decimal(18, 4)")]
        public decimal BaseAmount { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}