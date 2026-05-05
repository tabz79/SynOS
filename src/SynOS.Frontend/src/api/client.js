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
        const mode = decoded.session_mode || "operational";
        if (mode === "oversight") {
            const branchId = localStorage.getItem('synos_oversight_branch_id');
            if (branchId && branchId !== 'undefined') {
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
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    
    return response.json();
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
