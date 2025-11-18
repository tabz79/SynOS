using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public interface IAppointmentService
    {
        Task<Appointment> CreateAppointmentAsync(AppointmentCreateDto appointmentDto, string idempotencyKey);
        Task<Appointment?> GetAppointmentByIdAsync(Guid id);
        Task<Appointment?> RescheduleAppointmentAsync(Guid appointmentId, DateTime newScheduledForUtc, Guid changedById);
        Task<Appointment?> CancelAppointmentAsync(Guid appointmentId, string reason, Guid cancelledById);
        Task<IEnumerable<Appointment>> GetUpcomingAppointmentsAsync(string department, DateTime dateLocal);
        Task<SameDayVisitDto> CheckSameDayVisitsAsync(Guid patientId, DateTime dateLocal);
    }
}
