using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.IMS
{
    public class TubeCreateDto
    {
        [Required]
        [StringLength(50)]
        public string Code { get; set; }

        [Required]
        [StringLength(200)]
        public string Name { get; set; }

        [Required]
        [StringLength(50)]
        public string UnitOfMeasure { get; set; }
    }

    public class TubeUpdateDto
    {
        [Required]
        [StringLength(200)]
        public string Name { get; set; }

        [Required]
        [StringLength(50)]
        public string UnitOfMeasure { get; set; }
        
        public bool IsActive { get; set; }
    }

    public class TestTubeMapDto
    {
        [Required]
        public Guid TestId { get; set; }
        
        [Required]
        public Guid TubeId { get; set; }
        
        public int QuantityPerSample { get; set; } = 1;
    }

    public class StockSeedDto
    {
        [Required]
        public Guid TubeId { get; set; }



        [Range(0, int.MaxValue)]
        public int Quantity { get; set; }

        [Range(0, int.MaxValue)]
        public int AlertQuantity { get; set; }
    }
}
