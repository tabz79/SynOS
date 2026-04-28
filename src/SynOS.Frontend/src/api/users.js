import axios from 'axios';

const API_BASE = '/api/v1/users';

export const UsersApi = {
    /**
     * Fetches the profile of the currently authenticated user.
     * @returns {Promise<Object>} User profile object including name, email, role, and signatureImageUrl.
     */
    getProfile: async () => {
        const token = localStorage.getItem('synos_jwt');
        const response = await axios.get(`${API_BASE}/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    /**
     * Uploads a digital signature for a specific user.
     * @param {string} userId - UUID of the user.
     * @param {File} file - Image file (JPG/PNG).
     * @returns {Promise<Object>} Result with new SignatureImageUrl.
     */
    uploadSignature: async (userId, file) => {
        const token = localStorage.getItem('synos_jwt');
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(`${API_BASE}/${userId}/signature`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    },

    /**
     * Updates user profile (name, designation).
     * @param {Object} data - Profile data.
     */
    updateProfile: async (data) => {
        const token = localStorage.getItem('synos_jwt');
        const response = await axios.patch(`${API_BASE}/profile`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    }
};

export default UsersApi;
