import { SynOSApiClient } from '../client.js';

export function registerUniversalTool(api: SynOSApiClient): any[] {
  return [
    {
      name: 'synos_api_request',
      description: 'Universal HTTP API executor capable of invoking ANY of the 506+ SynOS endpoints directly or via Cloud Relay. Enables total access to new, obscure, or unmapped endpoints across all domains.',
      parameters: {
        type: 'object',
        properties: {
          clientId: {
            type: 'string',
            description: 'Target SynOS client ID (e.g. "DVR-DIAGNOSTICS") or omit/"local" for direct local execution.',
          },
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            description: 'HTTP method to execute.',
          },
          path: {
            type: 'string',
            description: 'API endpoint route path, e.g. "/api/v1/admin/operations/system-info", "/api/v1/patients", "/api/v1/radiology/worklist".',
          },
          body: {
            type: 'object',
            description: 'Optional JSON payload for POST/PUT/PATCH requests.',
          },
          params: {
            type: 'object',
            description: 'Optional query string parameters.',
          },
          confirm: {
            type: 'boolean',
            description: 'Must be true if invoking state-altering, financial, destructive, or service-halting endpoints.',
          },
        },
        required: ['method', 'path'],
      },
      handler: async (args: {
        clientId?: string;
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
        path: string;
        body?: any;
        params?: any;
        confirm?: boolean;
      }) => {
        // High-impact safety guardrail
        const isDangerous =
          (args.method === 'DELETE') ||
          (args.path.includes('/restore') || args.path.includes('/reset') || args.path.includes('/sign') || args.path.includes('/reopen'));

        if (isDangerous && !args.confirm) {
          throw new Error(`Execution of potentially destructive or legally binding endpoint (${args.method} ${args.path}) requires explicit confirm: true.`);
        }

        return await api.request(args.method, args.path, args.body, args.params, args.clientId);
      },
    },
  ];
}
