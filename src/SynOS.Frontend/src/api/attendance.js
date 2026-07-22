import { apiClient as client } from './client';

export const AttendanceApi = {
  getSummary: (employeeId, month) =>
    client.get(`/api/v1/attendance/summary/${employeeId}?month=${month || ''}`),

  getMySummary: (month) =>
    client.get(`/api/v1/attendance/my-summary${month ? `?month=${month}` : ''}`),

  getMyRequests: () =>
    client.get('/api/v1/attendance/my-requests'),

  getAudit: (employeeId) => 
    client.get(`/api/v1/attendance/audit/${employeeId}`),
    
  submitLeave: (request) => 
    client.post('/api/v1/attendance/request-leave', request),
    
  reviewLeave: (review) => 
    client.post('/api/v1/attendance/review-leave', review),
    
  markException: (exception) => 
    client.post('/api/v1/attendance/exception', exception)
};
