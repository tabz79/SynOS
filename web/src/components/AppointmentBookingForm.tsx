import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import apiClient from '../services/apiClient';
import PatientSearchForm from './PatientSearchForm';

interface Patient {
  patientId: string;
  mrn: string;
  firstName: string;
  lastName: string;
}

const AppointmentBookingForm: React.FC = () => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [department, setDepartment] = useState('Pathology');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!patient || !date || !time) {
      setError('Patient, date, and time are required.');
      return;
    }

    const scheduledFor = new Date(`${date}T${time}`);
    const idempotencyKey = uuidv4();

    try {
      await apiClient.post('/appointments', {
        patientId: patient.patientId,
        scheduledFor,
        department,
        notes,
      }, {
        headers: { 'Idempotency-Key': idempotencyKey }
      });
      setSuccess(`Appointment booked successfully for ${patient.firstName} ${patient.lastName}.`);
      // Reset form
      setPatient(null);
      setDate('');
      setTime('');
      setNotes('');
    } catch (err: any) {
      if (err.response?.data?.code === 'SLOT_FULL') {
        setError('This time slot is already full. Please choose another time.');
      } else {
        setError(err.response?.data?.message || 'Failed to book appointment.');
      }
    }
  };

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-xl font-bold mb-4">Book an Appointment</h2>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}
      
      <form onSubmit={handleBooking}>
        <div className="mb-4">
          <label className="block text-gray-700">Patient</label>
          {patient ? (
            <div>{patient.firstName} {patient.lastName} ({patient.mrn}) <button type="button" onClick={() => setPatient(null)} className="text-red-500 ml-2">(Change)</button></div>
          ) : (
            <PatientSearchForm onPatientSelect={setPatient} />
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="date" className="block text-gray-700">Date</label>
            <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label htmlFor="time" className="block text-gray-700">Time (30-min slots)</label>
            <input type="time" id="time" value={time} onChange={e => setTime(e.target.value)} step="1800" className="w-full p-2 border rounded" />
          </div>
        </div>
        <div className="mb-4">
          <label htmlFor="department" className="block text-gray-700">Department</label>
          <select id="department" value={department} onChange={e => setDepartment(e.target.value)} className="w-full p-2 border rounded">
            <option>Pathology</option>
            <option>Radiology</option>
            <option>Cardiology</option>
          </select>
        </div>
        <div className="mb-4">
          <label htmlFor="notes" className="block text-gray-700">Notes</label>
          <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-2 border rounded" />
        </div>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" disabled={!patient}>
          Book Appointment
        </button>
      </form>
    </div>
  );
};

export default AppointmentBookingForm;
