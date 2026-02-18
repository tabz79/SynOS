using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public interface ISpecimenGroupingService
    {
        /// <summary>
        /// Groups orders into proposed specimens based on Specimen Type and other rules.
        /// Does NOT generate accession numbers or save to DB.
        /// </summary>
        /// <param name="orders">The list of orders to process.</param>
        /// <returns>A list of specimen proposals.</returns>
        Task<List<SpecimenWrapper>> CreateSpecimenPlanAsync(IEnumerable<Order> orders);
    }

    public class SpecimenWrapper
    {
        public string SpecimenTypeCode { get; set; } = string.Empty;
        public List<Order> Orders { get; set; } = new List<Order>();
    }
}
