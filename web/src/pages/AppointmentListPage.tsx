import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';

interface Appointment {
  appointmentId: string;
  patient: {
    firstName: string;
    lastName: string;
    mrn: string;
  };
  scheduledFor: string;
  department: string;
  status: string;
}

const AppointmentListPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [department, setDepartment] = useState('Pathology');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchAppointments = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(`/appointments/upcoming?department=${department}&date=${date}`);
        setAppointments(response.data);
      } catch (error) {
        console.error('Failed to fetch appointments:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAppointments();
  }, [department, date]);

  const handleCancel = async (appointmentId: string) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await apiClient.post(`/appointments/${appointmentId}/cancel`, { reason: 'Cancelled by user' });
        setAppointments(prev => prev.filter(a => a.appointmentId !== appointmentId));
      } catch (error) {
        console.error('Failed to cancel appointment:', error);
      }
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Upcoming Appointments</h1>
      <div className="flex space-x-4 mb-4">
        <div>
          <label htmlFor="department" className="block text-gray-700">Department</label>
          <select id="department" value={department} onChange={e => setDepartment(e.target.value)} className="p-2 border rounded">
            <option>Pathology</option>
            <option>Radiology</option>
            <option>Cardiology</option>
          </select>
        </div>
        <div>
          <label htmlFor="date" className="block text-gray-700">Date</label>
          <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="p-2 border rounded" />
        </div>
      </div>

      {isLoading ? (
        <p>Loading appointments...</p>
      ) : (
        <table className="min-w-full bg-white">
          <thead className="bg-gray-200">
            <tr>
              <th className="py-2 px-4 border-b">Time</th>
              <th className="py-2 px-4 border-b">Patient</th>
              <th className="py-2 px-4 border-b">MRN</th>
              <th className="py-2 px-4 border-b">Status</th>
              <th className="py-2 px-4 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map(app => (
              <tr key={app.appointmentId}>
                <td className="py-2 px-4 border-b">{new Date(app.scheduledFor).toLocaleTimeString()}</td>
                <td className="py-2 px-4 border-b">{app.patient.firstName} {app.patient.lastName}</td>
                <td className="py-2 px-4 border-b">{app.patient.mrn}</td>
                <td className="py-2 px-4 border-b">{app.status}</td>
                <td className="py-2 px-4 border-b">
                  <button className="bg-blue-500 text-white px-2 py-1 rounded text-sm mr-2">Reschedule</button>
                  <button onClick={() => handleCancel(app.appointmentId)} className="bg-red-500 text-white px-2 py-1 rounded text-sm">Cancel</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AppointmentListPage;
