import { SynOSApiClient } from '../client.js';

export function registerInventoryTools(api: SynOSApiClient): any[] {
  return [
    {
      name: 'synos_inventory_stock_levels',
      description: 'Check lab and pharmacy stock levels, current reagent volumes, and reorder status.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          itemId: { type: 'string' },
          category: { type: 'string' },
        },
      },
      handler: async (args: { clientId?: string; itemId?: string; category?: string }) => {
        return await api.request('GET', '/api/v1/inventory/items', undefined, {
          itemId: args.itemId,
          category: args.category,
        }, args.clientId);
      },
    },
    {
      name: 'synos_inventory_expiring_batches',
      description: 'Query reagents, test kits, and consumables approaching expiration within specified days.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          daysThreshold: { type: 'number', default: 30 },
        },
      },
      handler: async (args: { clientId?: string; daysThreshold?: number }) => {
        return await api.request('GET', '/api/v1/inventory/expiring-batches', undefined, {
          days: args.daysThreshold || 30,
        }, args.clientId);
      },
    },
    {
      name: 'synos_inventory_log_wastage',
      description: 'Log reagent wastage, tube breakage, or QC consumption against stock ledger.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          batchId: { type: 'string' },
          quantity: { type: 'number' },
          reason: { type: 'string' },
        },
        required: ['batchId', 'quantity', 'reason'],
      },
      handler: async (args: { clientId?: string; batchId: string; quantity: number; reason: string }) => {
        return await api.request('POST', `/api/v1/inventory/batches/${args.batchId}/wastage`, {
          quantity: args.quantity,
          reason: args.reason,
          loggedAt: new Date().toISOString(),
        }, undefined, args.clientId);
      },
    },
  ];
}
