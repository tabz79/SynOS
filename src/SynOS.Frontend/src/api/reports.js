export const ReportsApi = {
    getReportsByStatus: async (status) => {
        const response = await fetch(`/api/v1/reports?status=${status}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
        });
        if (!response.ok) throw new Error('Failed to fetch reports');
        return await response.json();
    },

    getReportStructure: async (reportId, forceFresh = true) => {
        const response = await fetch(`/api/v1/debug/report-structure/${reportId}?forceFresh=${forceFresh}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
        });
        if (!response.ok) throw new Error('Failed to fetch report structure');
        return await response.json();
    },

    getFullReport: async (reportId) => {
        const response = await fetch(`/api/v1/reports/${reportId}/full`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
        });
        if (!response.ok) throw new Error('Failed to fetch full report');
        return await response.json();
    },

    getReportData: async (reportId, forceLive = false) => {
        const url = `/api/v1/reports/${reportId}/data${forceLive ? '?forceLive=true' : ''}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
        });
        if (!response.ok) throw new Error('Failed to fetch report data contract');
        return await response.json();
    },

    updateInterpretation: async (reportId, summary, notes) => {
        const response = await fetch(`/api/v1/reports/${reportId}/interpretation`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ Summary: summary, Notes: notes })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update interpretation');
        }
        return true;
    },

    signReport: async (reportId) => {
        const response = await fetch(`/api/v1/reports/${reportId}/sign`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
        });
        if (!response.ok) throw new Error('Failed to sign report');
        return await response.json();
    },

    submitReport: async (reportId, isManualFlow = false) => {
        const response = await fetch(`/api/v1/reports/${reportId}/submit`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isManualFlow })
        });
        if (!response.ok) throw new Error('Failed to submit report for verification');
        return true;
    },

    reopenReport: async (reportId) => {
        const response = await fetch(`/api/v1/reports/${reportId}/reopen`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
        });
        if (!response.ok) throw new Error('Failed to reopen report');
        return true;
    },
    
    claimReport: async (reportId) => {
        const response = await fetch(`/api/v1/reports/${reportId}/claim`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
        });
        if (!response.ok) throw new Error('Failed to claim report');
        return true;
    },

    verifyManual: async (reportId, pathologistId) => {
        const response = await fetch(`/api/v1/reports/${reportId}/verify-manual?pathologistId=${pathologistId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to mark as manually verified');
        }
        return true;
    },

    getPathologists: async () => {
        const response = await fetch('/api/v1/reports/pathologists', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
        });
        if (!response.ok) throw new Error('Failed to fetch pathologists');
        return await response.json();
    },
    
    saveResults: async (orderId, results) => {
        const response = await fetch(`/api/v1/reports/${orderId}/results`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ Results: results })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save final results');
        }
        return true;
    },

    deliverViaWhatsApp: async (reportId, phone) => {
        const response = await fetch(`/api/v1/delivery/whatsapp`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ReportId: reportId, Phone: phone })
        });
        if (!response.ok) throw new Error('Failed to send WhatsApp');
        return await response.json();
    },

    deliverViaPrint: async (reportId) => {
        const response = await fetch(`/api/v1/delivery/print`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ReportId: reportId })
        });
        if (!response.ok) throw new Error('Failed to mark as printed');
        return await response.json();
    }
};
