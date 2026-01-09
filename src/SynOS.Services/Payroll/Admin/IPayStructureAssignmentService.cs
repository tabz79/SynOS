using System;
using System.Threading.Tasks;

namespace SynOS.Services.Payroll.Admin
{
    public interface IPayStructureAssignmentService
    {
        Task<Guid> AssignStructureToEmployeeAsync(Guid employeeId, Guid payStructureId, DateTime effectiveDate);
        Task EndAssignmentForEmployeeAsync(Guid assignmentId, DateTime endDate);
    }
}
