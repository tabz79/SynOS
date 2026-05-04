import { jwtDecode } from 'jwt-decode';

const API_BASE = '/api/v1/inventory';

export const InventoryApi = {
    // Helper to get headers (Sync with ReceptionApi pattern)
    getHeaders: () => {
        const token = localStorage.getItem('synos_jwt');
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    // Helper to append branchId
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

    getAllowedItems: async () => {
        const response = await fetch(InventoryApi.withBranchId(`${API_BASE}/requests/allowed-items`), {
            headers: InventoryApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load essential items");
        return response.json();
    },
    
    getAllActiveItems: async () => {
        const response = await fetch(InventoryApi.withBranchId(`${API_BASE}/requests/all-items`), {
            headers: InventoryApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load all items");
        return response.json();
    },

    getMappings: async (roleId) => {
        const response = await fetch(`${API_BASE}/requests/roles/${roleId}/mappings`, {
            headers: InventoryApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load mappings");
        return response.json();
    },

    addMapping: async (roleId, consumableId) => {
        const response = await fetch(`${API_BASE}/requests/roles/${roleId}/mappings/${consumableId}`, {
            method: 'POST',
            headers: InventoryApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to add mapping");
    },

    removeMapping: async (roleId, consumableId) => {
        const response = await fetch(`${API_BASE}/requests/roles/${roleId}/mappings/${consumableId}`, {
            method: 'DELETE',
            headers: InventoryApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to remove mapping");
    },
    
    createRequest: async (consumableId, quantity, branchId) => {
        const response = await fetch(InventoryApi.withBranchId(`${API_BASE}/requests`), {
            method: 'POST',
            headers: InventoryApi.getHeaders(),
            body: JSON.stringify({
                consumableId,
                quantity: parseInt(quantity),
                branchId
            })
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || "Failed to submit request");
        }
        return response.json();
    },
    
    getPendingRequests: async (branchId) => {
        const url = InventoryApi.withBranchId(`${API_BASE}/requests/pending`);
        const response = await fetch(url, {
            headers: InventoryApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load pending requests");
        return response.json();
    },
    
    fulfillRequest: async (requestId) => {
        const response = await fetch(`${API_BASE}/requests/${requestId}/fulfill`, {
            method: 'POST',
            headers: InventoryApi.getHeaders()
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || "Fulfillment failed");
        }
    },
    
    ignoreRequest: async (requestId) => {
        const response = await fetch(`${API_BASE}/requests/${requestId}/ignore`, {
            method: 'POST',
            headers: InventoryApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to ignore request");
    },

    getStockLedger: async () => {
        const response = await fetch(`${API_BASE}/stock`, {
            headers: InventoryApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load stock ledger");
        return response.json();
    },

    getItemLots: async (itemId, branchId) => {
        const response = await fetch(`${API_BASE}/stock/${itemId}/lots?branchId=${branchId}`, {
            headers: InventoryApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load item lots");
        return response.json();
    },

    getInventoryItems: async () => {
        const response = await fetch(`${API_BASE}/items`, {
            headers: InventoryApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load inventory items");
        return response.json();
    },

    receiveStock: async (data) => {
        const response = await fetch(`${API_BASE}/receive`, {
            method: 'POST',
            headers: InventoryApi.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || "Failed to receive stock");
        }
        return response.json();
    },

    getMovementHistory: async () => {
        const response = await fetch(`${API_BASE}/history`, {
            headers: InventoryApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load movement history");
        return response.json();
    },

    getDashboardMetrics: async () => {
        const response = await fetch(`${API_BASE}/dashboard`, {
            headers: InventoryApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load dashboard metrics");
        return response.json();
    }
};
