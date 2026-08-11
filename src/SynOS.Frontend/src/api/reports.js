export const ReportsApi = {
    _cachedTemplates: null,
    _cachedTemplatesPromise: null,
    _clearCache: () => {
        ReportsApi._cachedTemplates = null;
        ReportsApi._cachedTemplatesPromise = null;
    },

    searchReportsArchive: async (params) => {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, val]) => {
            if (val !== null && val !== undefined && val !== "") {
                if (Array.isArray(val)) {
                    val.forEach(v => queryParams.append(key, v));
                } else {
                    queryParams.append(key, val);
                }
            }
        });
        const response = await fetch(`/api/v1/reports/archive?${queryParams.toString()}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
        });
        if (!response.ok) throw new Error('Failed to query report archive');
        return await response.json();
    },

    getReportsByStatus: async (status, department, includeHistory = false) => {
        let url = `/api/v1/reports?status=${status}&includeHistory=${includeHistory}`;
        if (department) {
            url += `&department=${encodeURIComponent(department)}`;
        }
        const response = await fetch(url, {
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

    getFullReportContext: async (reportId, forceLive = true) => {
        const response = await fetch(`/api/v1/reports/${reportId}/full-context?forceLive=${forceLive}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
        });
        if (!response.ok) throw new Error('Failed to fetch full report context');
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
        if (!response.ok) {
            let errMsg = 'Failed to sign report';
            try {
                const errData = await response.json();
                errMsg = errData.message || errData.Message || errMsg;
            } catch {}
            throw new Error(errMsg);
        }
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
    },

    getTemplates: async (modality) => {
        if (!modality) {
            if (ReportsApi._cachedTemplates) {
                return ReportsApi._cachedTemplates;
            }
            if (ReportsApi._cachedTemplatesPromise) {
                return ReportsApi._cachedTemplatesPromise;
            }
            const timestamp = Date.now();
            const url = `/api/v1/reports/templates?_t=${timestamp}`;
            ReportsApi._cachedTemplatesPromise = fetch(url, {
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            }).then(async response => {
                if (!response.ok) {
                    ReportsApi._cachedTemplatesPromise = null;
                    throw new Error('Failed to fetch templates');
                }
                const data = await response.json();
                ReportsApi._cachedTemplates = data;
                ReportsApi._cachedTemplatesPromise = null;
                return data;
            }).catch(err => {
                ReportsApi._cachedTemplatesPromise = null;
                throw err;
            });
            return ReportsApi._cachedTemplatesPromise;
        }

        const timestamp = Date.now();
        const url = `/api/v1/reports/templates?modality=${encodeURIComponent(modality)}&_t=${timestamp}`;
        const response = await fetch(url, {
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        if (!response.ok) throw new Error('Failed to fetch templates');
        return await response.json();
    },

    getTemplateById: async (id) => {
        const response = await fetch(`/api/v1/reports/templates/${id}?_t=${Date.now()}`, {
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        if (!response.ok) throw new Error('Failed to fetch template');
        return await response.json();
    },

    createTemplate: async (dto) => {
        ReportsApi._clearCache();
        const response = await fetch('/api/v1/reports/templates', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dto)
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to create template');
        }
        return await response.json();
    },

    updateTemplate: async (id, dto) => {
        ReportsApi._clearCache();
        const response = await fetch(`/api/v1/reports/templates/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dto)
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to update template');
        }
        return true;
    },

    setDefaultTemplate: async (id) => {
        ReportsApi._clearCache();
        const response = await fetch(`/api/v1/reports/templates/${id}/set-default`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
        });
        if (!response.ok) throw new Error('Failed to set default template');
        return true;
    },

    publishTemplate: async (id) => {
        ReportsApi._clearCache();
        const response = await fetch(`/api/v1/reports/templates/${id}/publish`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
        });
        if (!response.ok) throw new Error('Failed to publish template');
        return true;
    },

    deleteTemplate: async (id) => {
        ReportsApi._clearCache();
        const response = await fetch(`/api/v1/reports/templates/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
        });
        if (!response.ok) throw new Error('Failed to delete template');
        return true;
    }
};

