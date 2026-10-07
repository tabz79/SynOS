import { SynOSApiClient } from '../client.js';

export function registerFinanceTools(api: SynOSApiClient): any[] {
  return [
    {
      name: 'synos_finance_get_invoice',
      description: 'Get full details of a billing invoice including items, discounts, tax, and payments.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          invoiceId: { type: 'string' },
        },
        required: ['invoiceId'],
      },
      handler: async (args: { clientId?: string; invoiceId: string }) => {
        return await api.request('GET', `/api/v1/invoices/${args.invoiceId}`, undefined, undefined, args.clientId);
      },
    },
    {
      name: 'synos_finance_record_payment',
      description: 'Record an in-person, cash, UPI, card, or insurance settlement payment against a visit invoice.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          invoiceId: { type: 'string' },
          amount: { type: 'number' },
          mode: { type: 'string', enum: ['Cash', 'UPI', 'CreditCard', 'DebitCard', 'Insurance', 'Cheque'] },
          reference: { type: 'string', description: 'Transaction ID or UPI reference' },
        },
        required: ['invoiceId', 'amount', 'mode'],
      },
      handler: async (args: { clientId?: string; invoiceId: string; amount: number; mode: string; reference?: string }) => {
        return await api.request('POST', `/api/v1/invoices/${args.invoiceId}/payments`, {
          amount: args.amount,
          paymentMode: args.mode,
          transactionReference: args.reference,
          paidAt: new Date().toISOString(),
        }, undefined, args.clientId);
      },
    },
    {
      name: 'synos_finance_daily_summary',
      description: 'Retrieve financial collections, total billed, discounts, and outstanding receivables for a specific date or date range.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          startDate: { type: 'string', description: 'YYYY-MM-DD' },
          endDate: { type: 'string', description: 'YYYY-MM-DD' },
        },
      },
      handler: async (args: { clientId?: string; startDate?: string; endDate?: string }) => {
        return await api.request('GET', '/api/v1/finance/summary', undefined, {
          startDate: args.startDate,
          endDate: args.endDate,
        }, args.clientId);
      },
    },
    {
      name: 'synos_finance_referral_commissions',
      description: 'Query referring physician commission balances, ledger entries, and pending payouts.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          doctorId: { type: 'string' },
          status: { type: 'string', enum: ['Draft', 'Approved', 'Paid'] },
        },
      },
      handler: async (args: { clientId?: string; doctorId?: string; status?: string }) => {
        return await api.request('GET', '/api/v1/referral/commissions', undefined, {
          doctorId: args.doctorId,
          status: args.status,
        }, args.clientId);
      },
    },
  ];
}
