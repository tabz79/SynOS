import { jwtDecode } from 'jwt-decode';

/**
 * Global API Client for SynOS
 * Centralizes:
 * 1. Auth Header management
 * 2. 401 Unauthorized handling (Force Logout)
 * 3. BranchId injection for Oversight Mode
 */

const getHeaders = (body) => {
    const token = localStorage.getItem('synos_jwt');
    const headers = {};
    
    // Only set JSON content type if it's not FormData
    if (!(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

const withBranchId = (url) => {
    const token = localStorage.getItem('synos_jwt');
    if (!token) return url;
    try {
        const decoded = jwtDecode(token);
        
        // ROLE CANON: Check for Admin or SystemAdmin elevated roles
        const role = decoded.role || decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
        const isAdmin = role === 'Admin' || role === 'SystemAdmin' || 
                       (Array.isArray(role) && (role.includes('Admin') || role.includes('SystemAdmin')));

        if (isAdmin) {
            const branchId = localStorage.getItem('synos_oversight_branch_id');
            if (branchId && branchId !== 'undefined' && branchId !== 'null') {
                // Prevent duplication: Check if branchId or BranchId is already in the URL
                if (url.toLowerCase().includes('branchid=')) return url;
                
                const separator = url.includes('?') ? '&' : '?';
                return `${url}${separator}branchId=${branchId}`;
            }
        }
    } catch (e) {
        // Silent fail for malformed tokens to prevent request blocking
    }
    return url;
};

const handleResponse = async (response) => {
    if (response.status === 401) {
        console.warn("Unauthorized API Access Detected. Clearing session.");
        localStorage.removeItem('synos_jwt');
        localStorage.removeItem('synos_oversight_branch_id');
        // Force a hard redirect to ensure the app state is reset
        window.location.href = '/login?expired=true';
        throw new Error("Session Expired");
    }
    
    if (response.status === 204) {
        return null;
    }
    
    const text = await response.text().catch(() => "");
    let data = {};
    if (text) {
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse API response as JSON:", e);
        }
    }
    
    if (!response.ok) {
        throw new Error(data.message || `API Error: ${response.status}`);
    }
    
    return data;
};

export const apiClient = {
    get: async (url, options = {}) => {
        const response = await fetch(withBranchId(url), {
            ...options,
            method: 'GET',
            headers: { ...getHeaders(), ...options.headers }
        });
        return handleResponse(response);
    },

    post: async (url, body, options = {}) => {
        const response = await fetch(withBranchId(url), {
            ...options,
            method: 'POST',
            headers: { ...getHeaders(body), ...options.headers },
            body: body instanceof FormData ? body : JSON.stringify(body)
        });
        return handleResponse(response);
    },

    put: async (url, body, options = {}) => {
        const response = await fetch(withBranchId(url), {
            ...options,
            method: 'PUT',
            headers: { ...getHeaders(body), ...options.headers },
            body: body instanceof FormData ? body : JSON.stringify(body)
        });
        return handleResponse(response);
    },

    patch: async (url, body, options = {}) => {
        const response = await fetch(withBranchId(url), {
            ...options,
            method: 'PATCH',
            headers: { ...getHeaders(body), ...options.headers },
            body: body instanceof FormData ? body : JSON.stringify(body)
        });
        return handleResponse(response);
    },

    delete: async (url, options = {}) => {
        const response = await fetch(withBranchId(url), {
            ...options,
            method: 'DELETE',
            headers: { ...getHeaders(), ...options.headers }
        });
        return handleResponse(response);
    }
};
