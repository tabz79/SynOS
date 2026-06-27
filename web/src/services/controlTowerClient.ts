import axios from 'axios';

const API_BASE_URL = (import.meta as any).env.VITE_CONTROL_TOWER_API || 'http://localhost:5069/api/controltower';

const controlTowerClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Lab-Id': 'LAB001',
    'X-Api-Key': 'TBZ-LAB-KEY-12345',
  },
});

export default controlTowerClient;
