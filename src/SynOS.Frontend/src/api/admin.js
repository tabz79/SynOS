import axios from 'axios';

const API_BASE = '/api/v1/admin';

export const AdminApi = {
    getRoles: async () => {
        const response = await axios.get(`${API_BASE}/users/roles`);
        return response.data;
    },
    
    getUsers: async () => {
        const response = await axios.get(`${API_BASE}/users`);
        return response.data;
    }
};
