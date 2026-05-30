import { apiClient } from './client';

const API_BASE = '/api/v1/admin';

export const AdminApi = {
    getRoles: async () => {
        return apiClient.get(`${API_BASE}/users/roles`);
    },
    
    getUsers: async () => {
        return apiClient.get(`${API_BASE}/users`);
    },

    getBranches: async () => {
        return apiClient.get(`${API_BASE}/users/branches`);
    },

    createBranch: async (dto) => {
        return apiClient.post(`${API_BASE}/users/branches`, dto);
    },

    updateBranch: async (id, dto) => {
        return apiClient.put(`${API_BASE}/users/branches/${id}`, dto);
    },

    deleteBranch: async (id) => {
        return apiClient.delete(`${API_BASE}/users/branches/${id}`);
    },

    createUser: async (dto) => {
        return apiClient.post(`${API_BASE}/users`, dto);
    },

    updateUser: async (id, dto) => {
        return apiClient.put(`${API_BASE}/users/${id}`, dto);
    },

    resetPassword: async (id, password) => {
        return apiClient.post(`${API_BASE}/users/${id}/reset-password`, { password });
    },

    assignBranchRole: async (id, branchId, roleId, roleName) => {
        return apiClient.post(`${API_BASE}/users/${id}/branches`, { branchId, roleId, roleName });
    },

    removeBranchRole: async (id, branchId, roleId) => {
        return apiClient.delete(`${API_BASE}/users/${id}/branches?branchId=${branchId}&roleId=${roleId}`);
    },

    getTests: async () => {
        return apiClient.get(`${API_BASE}/tests`);
    },

    createTest: async (dto) => {
        return apiClient.post(`${API_BASE}/tests`, dto);
    },

    updateTest: async (id, dto) => {
        return apiClient.put(`${API_BASE}/tests/${id}`, dto);
    },

    deleteTest: async (id) => {
        return apiClient.delete(`${API_BASE}/tests/${id}`);
    },

    getDepartments: async () => {
        return apiClient.get(`/api/v1/admin/departments`);
    },

    createDepartment: async (dto) => {
        return apiClient.post(`/api/v1/admin/departments`, dto);
    },

    updateDepartment: async (id, dto) => {
        return apiClient.put(`/api/v1/admin/departments/${id}`, dto);
    },

    deleteDepartment: async (id) => {
        return apiClient.delete(`/api/v1/admin/departments/${id}`);
    },

    getWorkspaces: async () => {
        return apiClient.get(`${API_BASE}/users/workspaces`);
    },

    createWorkspace: async (dto) => {
        return apiClient.post(`${API_BASE}/users/workspaces`, dto);
    },

    updateWorkspace: async (id, dto) => {
        return apiClient.put(`${API_BASE}/users/workspaces/${id}`, dto);
    },

    deleteWorkspace: async (id) => {
        return apiClient.delete(`${API_BASE}/users/workspaces/${id}`);
    },

    setUserWorkspaces: async (id, workspaceIds) => {
        return apiClient.post(`${API_BASE}/users/${id}/workspaces`, { workspaceIds });
    },

    getSettings: async () => {
        return apiClient.get(`${API_BASE}/settings`);
    },
    
    updateSettings: async (dto) => {
        return apiClient.put(`${API_BASE}/settings`, dto);
    },

    getPermissionsMatrix: async () => {
        return apiClient.get(`${API_BASE}/roles/matrix`);
    },

    updateRoleCapabilities: async (dto) => {
        return apiClient.post(`${API_BASE}/roles/matrix`, dto);
    },

    getDepartmentPolicies: async () => {
        return apiClient.get(`${API_BASE}/roles/department-policies`);
    },

    saveDepartmentPolicy: async (dto) => {
        return apiClient.post(`${API_BASE}/roles/department-policies`, dto);
    },

    deleteDepartmentPolicy: async (id) => {
        return apiClient.delete(`${API_BASE}/roles/department-policies/${id}`);
    },

    getDiscounts: async (isActive, isEffective, search) => {
        let q = '';
        const params = [];
        if (isActive !== undefined && isActive !== null) params.push(`isActive=${isActive}`);
        if (isEffective !== undefined && isEffective !== null) params.push(`isEffective=${isEffective}`);
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        if (params.length > 0) q = '?' + params.join('&');
        return apiClient.get(`${API_BASE}/discounts${q}`);
    },

    createDiscount: async (dto) => {
        return apiClient.post(`${API_BASE}/discounts`, dto);
    },

    updateDiscount: async (id, dto) => {
        return apiClient.put(`${API_BASE}/discounts/${id}`, dto);
    },

    getReferralPartners: async () => {
        return apiClient.get(`${API_BASE}/referral-partners`);
    },

    createReferralPartner: async (dto) => {
        return apiClient.post(`${API_BASE}/referral-partners`, dto);
    },

    updateReferralPartner: async (id, dto) => {
        return apiClient.put(`${API_BASE}/referral-partners/${id}`, dto);
    },

    deleteReferralPartner: async (id) => {
        return apiClient.delete(`${API_BASE}/referral-partners/${id}`);
    },

    getBranchPrinters: async () => {
        return apiClient.get(`${API_BASE}/printing/printers`);
    },

    createBranchPrinter: async (dto) => {
        return apiClient.post(`${API_BASE}/printing/printers`, dto);
    },

    updateBranchPrinter: async (id, dto) => {
        return apiClient.put(`${API_BASE}/printing/printers/${id}`, dto);
    },

    deleteBranchPrinter: async (id) => {
        return apiClient.delete(`${API_BASE}/printing/printers/${id}`);
    },

    getTerminalPrinterConfigs: async () => {
        return apiClient.get(`${API_BASE}/printing/terminals`);
    },

    createTerminalPrinterConfig: async (dto) => {
        return apiClient.post(`${API_BASE}/printing/terminals`, dto);
    },

    updateTerminalPrinterConfig: async (id, dto) => {
        return apiClient.put(`${API_BASE}/printing/terminals/${id}`, dto);
    },

    deleteTerminalPrinterConfig: async (id) => {
        return apiClient.delete(`${API_BASE}/printing/terminals/${id}`);
    },

    getGlobalThermalSettings: async () => {
        return apiClient.get(`${API_BASE}/printing/settings`);
    },

    saveGlobalThermalSettings: async (dto) => {
        return apiClient.post(`${API_BASE}/printing/settings`, dto);
    },

    getAuditLogs: async (query) => {
        return apiClient.get(`${API_BASE}/audit-logs${query}`);
    }
};
