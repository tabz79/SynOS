import { SynOSApiClient } from '../client.js';

export function registerHardwareTools(api: SynOSApiClient): any[] {
  return [
    {
      name: 'synos_hardware_list_analyzers',
      description: 'List all configured laboratory analyzers, serial COM ports, TCP ports, protocols (ASTM E1381, HL7 v2), and operational status.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
        },
      },
      handler: async (args: { clientId?: string }) => {
        return await api.request('GET', '/api/v1/analyzers', undefined, undefined, args.clientId);
      },
    },
    {
      name: 'synos_hardware_analyzer_inbox',
      description: 'Inspect unprocessed or pending telemetry packets received from clinical instruments (chemistry, hematology, immunoassay).',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          analyzerId: { type: 'string' },
          status: { type: 'string', enum: ['Pending', 'Processed', 'Failed'], default: 'Pending' },
        },
      },
      handler: async (args: { clientId?: string; analyzerId?: string; status?: string }) => {
        return await api.request('GET', '/api/v1/analyzers/inbox', undefined, {
          analyzerId: args.analyzerId,
          status: args.status || 'Pending',
        }, args.clientId);
      },
    },
    {
      name: 'synos_hardware_auto_match',
      description: 'Trigger automatic matching of analyzer results to open patient work orders based on sample barcode ID.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          analyzerId: { type: 'string' },
        },
      },
      handler: async (args: { clientId?: string; analyzerId?: string }) => {
        return await api.request('POST', '/api/v1/analyzers/auto-match', {
          analyzerId: args.analyzerId,
        }, undefined, args.clientId);
      },
    },
    {
      name: 'synos_hardware_dicom_worklist',
      description: 'Query DICOM Modality Worklist (MWL) for scheduled X-Ray, CT, MRI, or Ultrasound examinations.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          modality: { type: 'string', description: 'e.g. CR, DX, CT, MR, US' },
          date: { type: 'string', description: 'YYYY-MM-DD' },
        },
      },
      handler: async (args: { clientId?: string; modality?: string; date?: string }) => {
        return await api.request('GET', '/api/v1/radiology/worklist', undefined, {
          modality: args.modality,
          date: args.date,
        }, args.clientId);
      },
    },
    {
      name: 'synos_hardware_pacs_series_tree',
      description: 'Retrieve PACS DICOM study series and instance tree for a radiology examination.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          studyInstanceUid: { type: 'string' },
        },
        required: ['studyInstanceUid'],
      },
      handler: async (args: { clientId?: string; studyInstanceUid: string }) => {
        return await api.request('GET', `/api/v1/radiology/pacs/studies/${encodeURIComponent(args.studyInstanceUid)}/series`, undefined, undefined, args.clientId);
      },
    },
  ];
}
