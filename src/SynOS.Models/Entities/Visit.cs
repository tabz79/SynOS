using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class Visit
    {
        [Key]
        public Guid VisitId { get; set; }

        [Required]
        public Guid PatientId { get; set; }

        [ForeignKey("PatientId")]
        public Patient Patient { get; set; }

        [Required]
        [MaxLength(10)]
        public string Token { get; set; }

        [Required]
        public DateTime TokenDate { get; set; }

        [Required]
        [MaxLength(50)]
        public string Department { get; set; }

        [Required]
        [MaxLength(50)]
        public string Status { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Timestamp]
        public uint RowVersion { get; set; }

        public ICollection<Order> Orders { get; set; }
        public ICollection<Invoice> Invoices { get; set; }
    }
}
