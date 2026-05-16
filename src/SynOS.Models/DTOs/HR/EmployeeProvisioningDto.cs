using System;

namespace SynOS.Models.DTOs.HR
{
    public class EmployeeProvisioningDto
    {
        public Guid EmployeeId { get; set; }
        public string DisplayName { get; set; }
        public string Designation { get; set; }
        public string Department { get; set; }
        public DateTimeOffset JoinDate { get; set; }
        public bool IsActive { get; set; }
    }
}
