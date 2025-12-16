using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public class AuditService : IAuditService
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<AuditService> _logger;

        public AuditService(SynOSDbContext context, ILogger<AuditService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task LogAsync(Guid? actorUserId, string action, string resourceType, Guid? resourceId, object payload)
        {
            // Harden the service: Audit failures should not crash core workflows.
            if (actorUserId.HasValue && actorUserId.Value != Guid.Empty)
            {
                var userExists = await _context.Users.AnyAsync(u => u.UserId == actorUserId.Value);
                if (!userExists)
                {
                    _logger.LogWarning("Audit log actor with UserId {ActorUserId} not found in Users table. The audit log will be saved with a null ActorUserId.", actorUserId.Value);
                    actorUserId = null; // Set to null to prevent FK violation
                }
            }
            else
            {
                actorUserId = null; // Ensure Guid.Empty is also treated as null
            }
            
            string serializedPayload;
            try
            {
                serializedPayload = JsonSerializer.Serialize(payload, new JsonSerializerOptions { ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to serialize audit log payload for action {Action}.");
                serializedPayload = "{\"error\":\"Payload serialization failed.\"}";
            }

            var auditLog = new AuditLog
            {
                AuditId = Guid.NewGuid(),
                ActorUserId = actorUserId,
                Action = action,
                ResourceType = resourceType,
                ResourceId = resourceId,
                Payload = serializedPayload,
                CreatedAt = DateTimeOffset.UtcNow
            };

            try
            {
                _context.AuditLogs.Add(auditLog);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save audit log to the database. Action: {Action}, Resource: {ResourceType}, ResourceId: {ResourceId}", action, resourceType, resourceId);
                // Do not re-throw, as audit failure should not stop the parent operation.
            }
        }
    }
}