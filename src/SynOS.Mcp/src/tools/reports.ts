import { SynOSApiClient } from '../client.js';

export function registerReportTools(api: SynOSApiClient): any[] {
  return [
    {
      name: 'synos_reports_get_context',
      description: 'Get full clinical report context, findings, impression, and signing metadata for a report.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          reportId: { type: 'string' },
        },
        required: ['reportId'],
      },
      handler: async (args: { clientId?: string; reportId: string }) => {
        return await api.request('GET', `/api/v1/reports/${args.reportId}/context`, undefined, undefined, args.clientId);
      },
    },
    {
      name: 'synos_reports_sign_off',
      description: 'Approve and digitally sign off a diagnostic report (pathology/radiology) with cryptographic SHA-256 seal. Irreversible without administrative reopening.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          reportId: { type: 'string' },
          confirm: {
            type: 'boolean',
            description: 'Must be true to authorize digital sign-off.',
          },
          remarks: { type: 'string' },
        },
        required: ['reportId', 'confirm'],
      },
      handler: async (args: { clientId?: string; reportId: string; confirm: boolean; remarks?: string }) => {
        if (!args.confirm) {
          throw new Error('Digital sign-off requires explicit confirm: true');
        }
        return await api.request('POST', `/api/v1/reports/${args.reportId}/sign`, {
          remarks: args.remarks || 'Digitally signed via MCP',
        }, undefined, args.clientId);
      },
    },
    {
      name: 'synos_reports_reopen',
      description: 'Reopen a previously signed report for mandatory clinical amendment or correction.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          reportId: { type: 'string' },
          reason: { type: 'string', description: 'Mandatory medical reason for amendment.' },
          confirm: { type: 'boolean', description: 'Must be true to reopen signed report.' },
        },
        required: ['reportId', 'reason', 'confirm'],
      },
      handler: async (args: { clientId?: string; reportId: string; reason: string; confirm: boolean }) => {
        if (!args.confirm) {
          throw new Error('Reopening signed report requires explicit confirm: true');
        }
        return await api.request('POST', `/api/v1/reports/${args.reportId}/reopen`, {
          reason: args.reason,
        }, undefined, args.clientId);
      },
    },
    {
      name: 'synos_reports_spool_print',
      description: 'Spool report PDF or thermal barcode labels directly to the on-premise Windows printer queue.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          reportId: { type: 'string' },
          printerName: { type: 'string', description: 'Target printer queue name or empty for system default.' },
          copies: { type: 'number', default: 1 },
        },
        required: ['reportId'],
      },
      handler: async (args: { clientId?: string; reportId: string; printerName?: string; copies?: number }) => {
        return await api.request('POST', `/api/v1/reports/${args.reportId}/print`, {
          printerName: args.printerName,
          copies: args.copies || 1,
        }, undefined, args.clientId);
      },
    },
    {
      name: 'synos_reports_send_whatsapp',
      description: 'Send authenticated patient report download link or notification via WhatsApp / SMS outbox.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          reportId: { type: 'string' },
          phoneNumber: { type: 'string' },
        },
        required: ['reportId'],
      },
      handler: async (args: { clientId?: string; reportId: string; phoneNumber?: string }) => {
        return await api.request('POST', `/api/v1/reports/${args.reportId}/send-delivery`, {
          phoneNumber: args.phoneNumber,
          channel: 'WhatsApp',
        }, undefined, args.clientId);
      },
    },
  ];
}
