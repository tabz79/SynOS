using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Payroll
{
    public class PayStructureAssignment
    {
        [Key]
        public Guid PayStructureAssignmentId { get; set; }
        public Guid EmployeeId { get; set; }
        public Guid PayStructureId { get; set; }
        public DateTime EffectiveDate { get; set; }
        public DateTime? EndDate { get; set; }
    }
}
