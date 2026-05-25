export const MacrosApi = {
    async getMacros() {
        const token = localStorage.getItem('synos_token');
        const res = await fetch('/api/macros', {
            headers: { 
                'Authorization': token ? `Bearer ${token}` : '' 
            }
        });
        if (!res.ok) throw new Error('Failed to fetch macros');
        return res.json();
    },

    async createMacro(macro) {
        const token = localStorage.getItem('synos_token');
        const res = await fetch('/api/macros', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(macro)
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || 'Failed to create macro');
        }
        return res.json();
    },

    async updateMacro(id, macro) {
        const token = localStorage.getItem('synos_token');
        const res = await fetch(`/api/macros/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(macro)
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || 'Failed to update macro');
        }
        return res.json();
    },

    async deleteMacro(id) {
        const token = localStorage.getItem('synos_token');
        const res = await fetch(`/api/macros/${id}`, {
            method: 'DELETE',
            headers: { 
                'Authorization': token ? `Bearer ${token}` : '' 
            }
        });
        if (!res.ok) throw new Error('Failed to delete macro');
        return true;
    }
};
