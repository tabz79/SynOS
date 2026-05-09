import { apiClient } from './client';
import { jwtDecode } from 'jwt-decode';

const API_BASE = '/api/v1/inventory';

export const InventoryApi = {
    // Legacy Helpers (Kept for Surgical Migration)
    getHeaders: () => {
        const token = localStorage.getItem('synos_jwt');
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    withBranchId: (url) => {
        const token = localStorage.getItem('synos_jwt');
        if (!token) return url;
        try {
            const decoded = jwtDecode(token);
            const mode = decoded.session_mode || "operational";
            if (mode === "oversight") {
                const branchId = localStorage.getItem('synos_oversight_branch_id');
                if (branchId && branchId !== 'undefined') {
                    if (url.toLowerCase().includes('branchid=')) return url;
                    const separator = url.includes('?') ? '&' : '?';
                    return `${url}${separator}branchId=${branchId}`;
                }
            }
        } catch (e) {}
        return url;
    },

    // Refactored Methods
    getAllowedItems: async () => {
        return apiClient.get(`${API_BASE}/requests/allowed-items`);
    },
    
    getAllActiveItems: async () => {
        return apiClient.get(`${API_BASE}/requests/all-items`);
    },

    getMappings: async (roleId) => {
        return apiClient.get(`${API_BASE}/requests/roles/${roleId}/mappings`);
    },

    addMapping: async (roleId, consumableId) => {
        return apiClient.post(`${API_BASE}/requests/roles/${roleId}/mappings/${consumableId}`);
    },

    removeMapping: async (roleId, consumableId) => {
        return apiClient.delete(`${API_BASE}/requests/roles/${roleId}/mappings/${consumableId}`);
    },
    
    createRequest: async (consumableId, quantity, branchId) => {
        return apiClient.post(`${API_BASE}/requests`, {
            consumableId,
            quantity: parseInt(quantity),
            branchId
        });
    },
    
    getPendingRequests: async (branchId) => {
        return apiClient.get(`${API_BASE}/requests/pending`);
    },
    
    fulfillRequest: async (requestId) => {
        return apiClient.post(`${API_BASE}/requests/${requestId}/fulfill`);
    },
    
    ignoreRequest: async (requestId) => {
        return apiClient.post(`${API_BASE}/requests/${requestId}/ignore`);
    },

    getStockLedger: async () => {
        return apiClient.get(`${API_BASE}/stock`);
    },

    getItemLots: async (itemId, branchId) => {
        return apiClient.get(`${API_BASE}/stock/${itemId}/lots?branchId=${branchId}`);
    },

    getInventoryItems: async () => {
        return apiClient.get(`${API_BASE}/items`);
    },

    createInventoryItem: async (dto) => {
        return apiClient.post(`${API_BASE}/items`, dto);
    },

    receiveStock: async (data) => {
        return apiClient.post(`${API_BASE}/receive`, data);
    },

    getMovementHistory: async () => {
        return apiClient.get(`${API_BASE}/history`);
    },

    getDashboardMetrics: async () => {
        return apiClient.get(`${API_BASE}/dashboard`);
    },

    // New Opening Stock Methods
    createOpeningStockSingle: async (dto) => {
        return apiClient.post(`${API_BASE}/opening-stock/single`, dto);
    },

    createOpeningStockBulk: async (entries) => {
        return apiClient.post(`${API_BASE}/opening-stock/bulk`, entries);
    },

    getSuppliers: async () => {
        return apiClient.get(`${API_BASE}/suppliers`);
    }
};
