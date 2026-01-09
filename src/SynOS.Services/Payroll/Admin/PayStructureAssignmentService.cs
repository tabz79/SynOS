using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.HR;
using SynOS.Models.Entities.Payroll;

namespace SynOS.Services.Payroll.Admin
{
    public class PayStructureAssignmentService : IPayStructureAssignmentService
    {
        private readonly SynOSDbContext _context;

        public PayStructureAssignmentService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<Guid> AssignStructureToEmployeeAsync(Guid employeeId, Guid payStructureId, DateTime effectiveDate)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            // Reject if effectiveDate is earlier than today
            if (effectiveDate.Date < DateTime.UtcNow.Date)
            {
                throw new InvalidOperationException("The effective date cannot be in the past.");
            }

            // Validate Employee exists and is active
            var employee = await _context.Employees
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);
            if (employee == null || !employee.IsActive)
            {
                throw new InvalidOperationException($"Active employee with ID '{employeeId}' not found.");
            }

            // Validate PayStructure exists
            var payStructure = await _context.PayStructures
                .AsNoTracking()
                .AnyAsync(ps => ps.PayStructureId == payStructureId);
            if (!payStructure)
            {
                throw new KeyNotFoundException($"PayStructure with ID '{payStructureId}' not found.");
            }

            // Reject if employee already has an active assignment
            var existingActiveAssignment = await _context.PayStructureAssignments
                .AsNoTracking()
                .FirstOrDefaultAsync(psa => psa.EmployeeId == employeeId && psa.EndDate == null);
            if (existingActiveAssignment != null)
            {
                throw new InvalidOperationException($"Employee with ID '{employeeId}' already has an active pay structure assignment. End the existing assignment before creating a new one.");
            }

            var newAssignment = new PayStructureAssignment
            {
                PayStructureAssignmentId = Guid.NewGuid(),
                EmployeeId = employeeId,
                PayStructureId = payStructureId,
                EffectiveDate = effectiveDate,
                EndDate = null // New assignments are active
            };

            _context.PayStructureAssignments.Add(newAssignment);
            await _context.SaveChangesAsync();

            await transaction.CommitAsync();

            return newAssignment.PayStructureAssignmentId;
        }

        public async Task EndAssignmentForEmployeeAsync(Guid assignmentId, DateTime endDate)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            var assignment = await _context.PayStructureAssignments.FindAsync(assignmentId);

            // Reject if assignment does not exist
            if (assignment == null)
            {
                throw new KeyNotFoundException($"PayStructureAssignment with ID '{assignmentId}' not found.");
            }

            // Reject if assignment is already end-dated
            if (assignment.EndDate != null)
            {
                throw new InvalidOperationException("This pay structure assignment has already been end-dated.");
            }

            // Employee Status Decision: Reject if employee is inactive.
            // This prevents modification of assignments for already-offboarded employees.
            var employee = await _context.Employees.FindAsync(assignment.EmployeeId);
            if (employee == null || !employee.IsActive)
            {
                throw new InvalidOperationException($"Cannot end assignment for an inactive or non-existent employee (ID: {assignment.EmployeeId}).");
            }

            // Harden EndDate Guards
            if (endDate.Date < assignment.EffectiveDate.Date || endDate.Date < DateTime.UtcNow.Date)
            {
                throw new InvalidOperationException("The end date cannot be earlier than the assignment's effective date or today's date.");
            }

            // Set EndDate explicitly and save
            assignment.EndDate = endDate;
            await _context.SaveChangesAsync();

            await transaction.CommitAsync();
        }
    }
}
