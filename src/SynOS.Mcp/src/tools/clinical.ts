import { SynOSApiClient } from '../client.js';

export function registerClinicalTools(api: SynOSApiClient): any[] {
  return [
    {
      name: 'synos_clinical_search_patients',
      description: 'Search for patients by name, phone number, national ID, or UHID/MRN.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          query: { type: 'string', description: 'Patient name, phone, or MRN query.' },
        },
        required: ['query'],
      },
      handler: async (args: { clientId?: string; query: string }) => {
        return await api.request('GET', `/api/v1/patients/search?query=${encodeURIComponent(args.query)}`, undefined, undefined, args.clientId);
      },
    },
    {
      name: 'synos_clinical_get_patient',
      description: 'Get full clinical and demographic profile of a patient by ID.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          patientId: { type: 'string' },
        },
        required: ['patientId'],
      },
      handler: async (args: { clientId?: string; patientId: string }) => {
        return await api.request('GET', `/api/v1/patients/${args.patientId}`, undefined, undefined, args.clientId);
      },
    },
    {
      name: 'synos_clinical_get_visit_details',
      description: 'Get complete clinical visit/order details including ordered tests, tubes, billing status, and workflow phase.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          visitId: { type: 'string' },
        },
        required: ['visitId'],
      },
      handler: async (args: { clientId?: string; visitId: string }) => {
        return await api.request('GET', `/api/v1/visits/${args.visitId}`, undefined, undefined, args.clientId);
      },
    },
    {
      name: 'synos_clinical_phlebotomy_collect',
      description: 'Mark phlebotomy tube/specimen collection complete with barcode verification.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          sampleId: { type: 'string', description: 'Sample ID or barcode' },
          collectorId: { type: 'string', description: 'Phlebotomist user ID' },
          tubeColor: { type: 'string', description: 'e.g. Lavender, Red, Grey' },
        },
        required: ['sampleId'],
      },
      handler: async (args: { clientId?: string; sampleId: string; collectorId?: string; tubeColor?: string }) => {
        return await api.request('POST', `/api/v1/samples/${args.sampleId}/collect`, {
          collectorId: args.collectorId,
          tubeColor: args.tubeColor,
          collectedAt: new Date().toISOString(),
        }, undefined, args.clientId);
      },
    },
    {
      name: 'synos_clinical_enter_results',
      description: 'Record or update test parameter results in the lab workbench.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          testOrderId: { type: 'string' },
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                parameterId: { type: 'string' },
                parameterCode: { type: 'string' },
                value: { type: 'string' },
                remarks: { type: 'string' },
              },
              required: ['value'],
            },
          },
        },
        required: ['testOrderId', 'results'],
      },
      handler: async (args: { clientId?: string; testOrderId: string; results: any[] }) => {
        return await api.request('POST', `/api/v1/results/orders/${args.testOrderId}`, {
          results: args.results,
        }, undefined, args.clientId);
      },
    },
    {
      name: 'synos_clinical_panic_alerts',
      description: 'Check active clinical panic/critical value alerts requiring urgent physician escalation.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          department: { type: 'string', description: 'e.g. Biochemistry, Hematology, Radiology' },
        },
      },
      handler: async (args: { clientId?: string; department?: string }) => {
        return await api.request('GET', '/api/v1/results/panic-alerts', undefined, { department: args.department }, args.clientId);
      },
    },
  ];
}
