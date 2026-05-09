/**
 * Purchasing Service API Utility
 */
export const PurchasingApi = {
    getHeaders: () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`
    }),

    getPurchaseOrders: async () => {
        const response = await fetch('/api/v1/purchasing/po', {
            headers: PurchasingApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load purchase orders");
        return response.json();
    },

    getPurchaseOrder: async (id) => {
        const response = await fetch(`/api/v1/purchasing/po/${id}`, {
            headers: PurchasingApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load purchase order");
        return response.json();
    },

    createPurchaseOrder: async (supplierId) => {
        const response = await fetch('/api/v1/purchasing/po', {
            method: 'POST',
            headers: PurchasingApi.getHeaders(),
            body: JSON.stringify({ supplierId })
        });
        if (!response.ok) throw new Error("Failed to create purchase order");
        return response.json();
    },

    addPOItem: async (poId, itemData) => {
        const response = await fetch(`/api/v1/purchasing/po/${poId}/items`, {
            method: 'POST',
            headers: PurchasingApi.getHeaders(),
            body: JSON.stringify(itemData)
        });
        if (!response.ok) throw new Error("Failed to add item to PO");
        return response.json();
    },

    getPOItems: async (poId) => {
        const response = await fetch(`/api/v1/purchasing/po/${poId}/items`, {
            headers: PurchasingApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load PO items");
        return response.json();
    },

    approvePurchaseOrder: async (id) => {
        const response = await fetch(`/api/v1/purchasing/po/${id}/approve`, {
            method: 'POST',
            headers: PurchasingApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to approve purchase order");
        return response.json();
    }
};
