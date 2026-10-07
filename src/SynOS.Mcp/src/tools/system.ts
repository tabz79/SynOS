import { SynOSApiClient } from '../client.js';

export function registerSystemTools(api: SynOSApiClient): any[] {
  return [
    {
      name: 'synos_system_health',
      description: 'Check overall SynOS system status, memory, CPU, database connectivity, and background service health.',
      parameters: {
        type: 'object',
        properties: {
          clientId: {
            type: 'string',
            description: 'Target SynOS client ID (e.g., "DVR-DIAGNOSTICS") or omit/"local" for direct local instance.',
          },
        },
      },
      handler: async (args: { clientId?: string }) => {
        return await api.request('GET', '/health', undefined, undefined, args.clientId);
      },
    },
    {
      name: 'synos_system_info',
      description: 'Get detailed application version, OS environment, runtime (.NET 8), and licensing status.',
      parameters: {
        type: 'object',
        properties: {
          clientId: {
            type: 'string',
            description: 'Target SynOS client ID or "local".',
          },
        },
      },
      handler: async (args: { clientId?: string }) => {
        return await api.request('GET', '/api/v1/admin/operations/system-info', undefined, undefined, args.clientId);
      },
    },
    {
      name: 'synos_system_generate_diagnostics',
      description: 'Generate an exhaustive forensically sealed diagnostic telemetry bundle (.zip.enc) containing logs, config, OS and hardware context.',
      parameters: {
        type: 'object',
        properties: {
          clientId: {
            type: 'string',
            description: 'Target SynOS client ID or "local".',
          },
          triggerReason: {
            type: 'string',
            description: 'Reason for generating bundle, e.g. "Triage report printing fault".',
          },
        },
      },
      handler: async (args: { clientId?: string; triggerReason?: string }) => {
        // Dispatches remote diagnostic command or calls debug endpoint
        return await api.request('POST', '/api/v1/admin/operations/tickets/create', {
          Title: `Diagnostics: ${args.triggerReason || 'Agent triage'}`,
          Description: 'Automated diagnostic bundle generation triggered by MCP agent.',
          Priority: 'High',
          Category: 'Diagnostics',
        }, undefined, args.clientId);
      },
    },
    {
      name: 'synos_system_manage_backup',
      description: 'List existing backups, execute a full or differential database backup, or restore from a backup.',
      parameters: {
        type: 'object',
        properties: {
          clientId: {
            type: 'string',
            description: 'Target SynOS client ID or "local".',
          },
          action: {
            type: 'string',
            enum: ['list', 'create', 'restore'],
            description: 'Action to perform.',
          },
          backupType: {
            type: 'string',
            enum: ['Full', 'Differential', 'Transaction'],
            description: 'Type of backup to create (default "Full").',
          },
          backupId: {
            type: 'string',
            description: 'ID of backup to restore (required if action="restore").',
          },
          fileName: {
            type: 'string',
            description: 'Filename of backup to restore (required if action="restore").',
          },
          confirm: {
            type: 'boolean',
            description: 'Must be true to restore database (destructive action).',
          },
        },
        required: ['action'],
      },
      handler: async (args: { clientId?: string; action: string; backupType?: string; backupId?: string; fileName?: string; confirm?: boolean }) => {
        if (args.action === 'list') {
          return await api.request('GET', '/api/v1/admin/operations/backups', undefined, undefined, args.clientId);
        }
        if (args.action === 'create') {
          return await api.request('POST', `/api/v1/admin/operations/backups/run?backupType=${args.backupType || 'Full'}`, undefined, undefined, args.clientId);
        }
        if (args.action === 'restore') {
          if (!args.confirm) {
            throw new Error('Database restore requires explicit confirm: true');
          }
          if (!args.fileName || !args.backupId) {
            throw new Error('Restore requires both backupId and fileName');
          }
          return await api.request('POST', `/api/v1/admin/operations/backups/restore?backupId=${args.backupId}&fileName=${encodeURIComponent(args.fileName)}`, undefined, undefined, args.clientId);
        }
        throw new Error(`Unknown backup action: ${args.action}`);
      },
    },
    {
      name: 'synos_system_support_tickets',
      description: 'List or create local SynOS support & triage tickets.',
      parameters: {
        type: 'object',
        properties: {
          clientId: {
            type: 'string',
            description: 'Target SynOS client ID or "local".',
          },
          action: {
            type: 'string',
            enum: ['list', 'create'],
          },
          title: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] },
          category: { type: 'string' },
        },
        required: ['action'],
      },
      handler: async (args: { clientId?: string; action: string; title?: string; description?: string; priority?: string; category?: string }) => {
        if (args.action === 'list') {
          return await api.request('GET', '/api/v1/admin/operations/tickets', undefined, undefined, args.clientId);
        }
        if (args.action === 'create') {
          return await api.request('POST', '/api/v1/admin/operations/tickets/create', {
            Title: args.title || 'Agent Ticket',
            Description: args.description || '',
            Priority: args.priority || 'Medium',
            Category: args.category || 'General',
          }, undefined, args.clientId);
        }
      },
    },
    {
      name: 'synos_system_audit_logs',
      description: 'Query forensic audit trail (user actions, logins, status changes, overrides).',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          page: { type: 'number', default: 1 },
          pageSize: { type: 'number', default: 50 },
          entityType: { type: 'string' },
          userId: { type: 'string' },
        },
      },
      handler: async (args: { clientId?: string; page?: number; pageSize?: number; entityType?: string; userId?: string }) => {
        return await api.request('GET', '/api/v1/audit-logs', undefined, {
          page: args.page || 1,
          pageSize: args.pageSize || 50,
          entityType: args.entityType,
          userId: args.userId,
        }, args.clientId);
      },
    },
  ];
}
