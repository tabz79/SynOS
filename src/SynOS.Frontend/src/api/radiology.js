export const RadiologyApi = {
    getTechnicianQueue: async (statuses = [], includeHistory = false) => {
        let url = `/api/v1/radiology/studies/queue?includeHistory=${includeHistory}`;
        if (statuses.length > 0) {
            const params = statuses.map(s => `status=${encodeURIComponent(s)}`).join('&');
            url += `&${params}`;
        }
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
        });
        if (!response.ok) throw new Error('Failed to fetch studies queue');
        return await response.json();
    },

    assignStudy: async (studyId) => {
        const response = await fetch('/api/v1/radiology/studies/assign', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ studyId })
        });
        if (!response.ok) throw new Error('Failed to assign study');
        return true;
    },

    setExternalMapping: async (studyId, systemName, accessionNumber, viewerUrl) => {
        const response = await fetch('/api/v1/radiology/studies/set-external-mapping', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ studyId, systemName, accessionNumber, viewerUrl })
        });
        if (!response.ok) throw new Error('Failed to set external PACS mapping');
        return true;
    },

    markImagingCompleted: async (studyId) => {
        const response = await fetch('/api/v1/radiology/studies/mark-imaging-completed', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ studyId })
        });
        if (!response.ok) throw new Error('Failed to mark imaging as completed');
        return true;
    },

    uploadAttachment: async (studyId, file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/v1/radiology/studies/${studyId}/attachments`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`
            },
            body: formData
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || 'Failed to upload attachment');
        }
        return await response.json();
    },

    getRadiologistWorklist: async () => {
        const response = await fetch('/api/v1/radiology/studies/archive', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
        });
        if (!response.ok) throw new Error('Failed to fetch radiologist worklist');
        return await response.json();
    },

    getSeriesTree: async (radiologyStudyId) => {
        const response = await fetch(`/api/v1/radiology/pacs/studies/${radiologyStudyId}/series-tree`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
        });
        if (!response.ok) throw new Error('Failed to fetch PACS series tree');
        return await response.json();
    },

    uploadDicom: async (radiologyStudyId, formData) => {
        const response = await fetch(`/api/v1/radiology/pacs/${radiologyStudyId}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` },
            body: formData
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.message || data.title || 'Failed to upload DICOM file');
        }
        return data;
    },

    getStorageStats: async () => {
        const response = await fetch('/api/v1/radiology/pacs/admin/storage-stats', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
        });
        if (!response.ok) return null;
        return await response.json();
    }
};
