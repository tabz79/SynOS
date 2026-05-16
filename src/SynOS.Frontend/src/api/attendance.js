import { apiClient as client } from './client';

export const AttendanceApi = {
  getAudit: (employeeId) => 
    client.get(`/attendance/audit/${employeeId}`).then(res => res.data),
    
  submitLeave: (request) => 
    client.post('/attendance/request-leave', request).then(res => res.data),
    
  reviewLeave: (review) => 
    client.post('/attendance/review-leave', review).then(res => res.data),
    
  markException: (exception) => 
    client.post('/attendance/exception', exception).then(res => res.data)
};
