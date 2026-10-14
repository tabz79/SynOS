import React, { useState, useEffect } from 'react';
import { FinanceApi } from '@/api/finance';
import { DEFAULT_DOCUMENT_SCHEMAS } from './documentLayoutSchemas';
import { hydrateDocumentSchema } from './schemaHydrator';
import { DynamicInvoiceCanvas } from './DynamicInvoiceCanvas';
import { Loader2 } from 'lucide-react';

// In-memory cache to prevent duplicate roundtrips
let cachedMappings = null;
let cachedSettings = null;

export const DynamicDocumentRenderer = ({
    slotId = "patient_tax_invoice",
    data,
    letterheadMode,
    topMarginMm,
    readOnly = true
}) => {
    const [loading, setLoading] = useState(!cachedMappings || !cachedSettings);
    const [mappings, setMappings] = useState(cachedMappings || []);
    const [settings, setSettings] = useState(cachedSettings || null);

    useEffect(() => {
        let isMounted = true;
        const loadConfig = async () => {
            try {
                if (!cachedMappings || !cachedSettings) {
                    const [stationeryRes, mappingsRes] = await Promise.all([
                        FinanceApi.getStationerySettings(),
                        FinanceApi.getDocumentMappings()
                    ]);
                    if (isMounted) {
                        cachedSettings = stationeryRes;
                        cachedMappings = mappingsRes;
                        setSettings(stationeryRes);
                        setMappings(mappingsRes);
                    }
                }
            } catch (err) {
                console.warn("DynamicDocumentRenderer: Failed to fetch registry config, using defaults", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadConfig();
        return () => { isMounted = false; };
    }, []);

    if (loading && !data) {
        return (
            <div className="p-12 flex flex-col items-center justify-center text-zinc-400 gap-2">
                <Loader2 className="animate-spin text-indigo-600" size={24} />
                <span className="text-xs font-semibold">Generating customized document...</span>
            </div>
        );
    }

    // Resolve slot configuration from registry
    const slotMapping = mappings.find(m => m.slotId === slotId);
    const rawSchema = slotMapping?.customLayout || DEFAULT_DOCUMENT_SCHEMAS[slotId];
    const effectiveLetterheadMode = letterheadMode || slotMapping?.letterheadMode || settings?.defaultLetterheadMode || "digital";
    const effectiveTopMarginMm = topMarginMm !== undefined ? topMarginMm : (slotMapping?.topMarginMm ?? settings?.topMarginMm ?? 40);

    // Hydrate dynamic schema with live domain entity
    const hydratedSchema = hydrateDocumentSchema(slotId, rawSchema, data || {}, settings || {});

    return (
        <DynamicInvoiceCanvas
            schema={hydratedSchema}
            letterheadMode={effectiveLetterheadMode}
            topMarginMm={effectiveTopMarginMm}
            labSettings={settings || {}}
            readOnly={readOnly}
        />
    );
};
