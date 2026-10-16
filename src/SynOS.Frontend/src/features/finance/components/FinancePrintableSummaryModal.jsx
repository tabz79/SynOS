import React from 'react';
import { CommercialDocumentViewer } from './documents/CommercialDocumentViewer';
import { DynamicDocumentRenderer } from './documents/DynamicDocumentRenderer';

/**
 * FinancePrintableSummaryModal
 * Central governing summary modal for all financial ledgers, bills daybooks, and summaries.
 * Strictly routes rendering to DynamicDocumentRenderer and CommercialDocumentViewer
 * governed by the Billing & Print Setup studio slots.
 */
export const FinancePrintableSummaryModal = ({
    isOpen,
    onClose,
    slotId = null,
    title = "Financial Operations Summary",
    subtitle = "Enterprise Financial Audit & Ledger Report",
    dateRangeText = "Current Period",
    filterTags = [],
    kpis = [],
    columns = [],
    data = [],
    summaryTotals = null,
    secondaryTable = null,
    extraContent = null,
    onDownloadCsv = null,
    categoryLabel = "FINANCE LEDGER SUMMARY",
    labInfo = null
}) => {
    if (!isOpen) return null;

    // Resolve slotId based on category / context if not explicitly provided
    const resolveSlotId = () => {
        if (slotId) return slotId;
        const cat = (categoryLabel || '').toLowerCase();
        const tit = (title || '').toLowerCase();
        if (cat.includes('corporate') || tit.includes('corporate')) return 'summary_corporate';
        if (cat.includes('insurance') || tit.includes('insurance')) return 'summary_insurance';
        if (cat.includes('outsource') || tit.includes('outsource')) return 'summary_outsource';
        if (cat.includes('referral') || cat.includes('doctor') || tit.includes('referral') || tit.includes('doctor') || tit.includes('partner')) return 'summary_doctor_dues';
        return 'summary_bills_daybook';
    };

    const resolvedSlotId = resolveSlotId();

    return (
        <CommercialDocumentViewer
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            paperSize="a4"
            recordCount={data?.length || 0}
            onDownloadCsv={onDownloadCsv}
        >
            <DynamicDocumentRenderer
                slotId={resolvedSlotId}
                data={{
                    title,
                    subtitle,
                    dateRangeText,
                    filterTags,
                    kpis,
                    columns,
                    data,
                    items: data,
                    summaryTotals,
                    secondaryTable,
                    labInfo
                }}
            />
        </CommercialDocumentViewer>
    );
};
