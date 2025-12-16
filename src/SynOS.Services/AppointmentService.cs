using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public class AppointmentService : IAppointmentService
    {
        private readonly SynOSDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IAuditService _auditService; // Injected

        public AppointmentService(SynOSDbContext context, IConfiguration configuration, IAuditService auditService)
        {
            _context = context;
            _configuration = configuration;
            _auditService = auditService; // Assigned
        }

        public async Task<Appointment> CreateAppointmentAsync(AppointmentCreateDto appointmentDto, string idempotencyKey, Guid actorUserId)
        {
            // In a real implementation, you would check a cache or database table for the idempotencyKey
            // to prevent duplicate processing. For this exercise, we'll assume it's handled.

            var scheduledForUtc = appointmentDto.ScheduledFor.ToUniversalTime();

            // Validate if the time is in the future
            if (scheduledForUtc <= DateTime.UtcNow)
            {
                throw new ArgumentException("Appointment must be scheduled for a future time.");
            }

            // Check for slot collision (simplified: assumes one appointment per 30-min slot per department)
            var slotEnd = scheduledForUtc.AddMinutes(30);
            var existingAppointment = await _context.Appointments
                .AnyAsync(a => a.Department == appointmentDto.Department &&
                               a.Status == AppointmentStatus.Booked &&
                               a.ScheduledFor >= scheduledForUtc && a.ScheduledFor < slotEnd);

            if (existingAppointment)
            {
                throw new InvalidOperationException("SLOT_FULL");
            }

            var appointment = new Appointment
            {
                AppointmentId = Guid.NewGuid(),
                PatientId = appointmentDto.PatientId,
                ScheduledFor = scheduledForUtc,
                Department = appointmentDto.Department,
                Notes = appointmentDto.Notes,
                Status = AppointmentStatus.Booked
            };

            // Handle same-day visit grouping
            var localDate = scheduledForUtc.Date; // Simplified; should use a proper timezone conversion
            var visitGroup = await _context.VisitDayGroups
                .FirstOrDefaultAsync(g => g.PatientId == appointmentDto.PatientId && g.Day == localDate);

            if (visitGroup == null)
            {
                visitGroup = new VisitDayGroup
                {
                    GroupId = Guid.NewGuid(),
                    PatientId = appointmentDto.PatientId,
                    Day = localDate,
                    VisitCount = 1,
                    PrimaryVisitId = appointment.AppointmentId
                };
                _context.VisitDayGroups.Add(visitGroup);
            }
            else
            {
                visitGroup.VisitCount++;
            }

            _context.Appointments.Add(appointment);
            await _context.SaveChangesAsync();
            
            await _auditService.LogAsync(actorUserId, "CreateAppointment", "Appointment", appointment.AppointmentId, appointment);

            return appointment;
        }

        public async Task<Appointment?> RescheduleAppointmentAsync(Guid appointmentId, DateTime newScheduledForUtc, Guid changedById)
        {
            var appointment = await _context.Appointments.FindAsync(appointmentId);
            if (appointment == null) return null;

            var oldScheduledFor = appointment.ScheduledFor;
            appointment.ScheduledFor = newScheduledForUtc;
            appointment.UpdatedAt = DateTime.UtcNow;

            await _auditService.LogAsync(changedById, "RescheduleAppointment", "Appointment", appointmentId, new { OldScheduledFor = oldScheduledFor, NewScheduledFor = newScheduledForUtc });

            await _context.SaveChangesAsync();
            return appointment;
        }

        public async Task<Appointment?> CancelAppointmentAsync(Guid appointmentId, string reason, Guid cancelledById)
        {
            var appointment = await _context.Appointments.FindAsync(appointmentId);
            if (appointment == null) return null;

            appointment.Status = AppointmentStatus.Cancelled;
            appointment.UpdatedAt = DateTime.UtcNow;

            await _auditService.LogAsync(cancelledById, "CancelAppointment", "Appointment", appointmentId, new { Reason = reason, OldStatus = AppointmentStatus.Booked, NewStatus = AppointmentStatus.Cancelled });

            await _context.SaveChangesAsync();
            return appointment;
        }

        public async Task<Appointment?> GetAppointmentByIdAsync(Guid id)
        {
            return await _context.Appointments.FindAsync(id);
        }

        public async Task<IEnumerable<Appointment>> GetUpcomingAppointmentsAsync(string department, DateTime dateLocal)
        {
            var startDate = dateLocal.Date;
            var endDate = startDate.AddDays(1);

            return await _context.Appointments
                .Where(a => a.Department == department &&
                            a.ScheduledFor >= startDate && a.ScheduledFor < endDate &&
                            a.Status == AppointmentStatus.Booked)
                .OrderBy(a => a.ScheduledFor)
                .ToListAsync();
        }

        public async Task<SameDayVisitDto> CheckSameDayVisitsAsync(Guid patientId, DateTime dateLocal)
        {
            var startDate = dateLocal.Date;
            var endDate = startDate.AddDays(1);

            var sameDayAppointments = await _context.Appointments
                .Where(a => a.PatientId == patientId &&
                            a.ScheduledFor >= startDate && a.ScheduledFor < endDate)
                .ToListAsync();

            if (sameDayAppointments.Count <= 1)
            {
                return new SameDayVisitDto { HasSameDayVisits = false };
            }

            return new SameDayVisitDto
            {
                HasSameDayVisits = true,
                SuggestCombineBilling = true, // Simplified logic
                Visits = sameDayAppointments.Select(a => new SameDayVisitDetailsDto
                {
                    AppointmentId = a.AppointmentId,
                    ScheduledFor = a.ScheduledFor,
                    Department = a.Department
                })
            };
        }
    }
}
