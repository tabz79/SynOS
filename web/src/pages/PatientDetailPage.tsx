import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../services/apiClient';
import DuplicateDetectionModal from '../components/DuplicateDetectionModal';

interface Patient {
  patientId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  currentPhoneNumber: string;
  dateOfBirth: string;
  gender: string;
}

interface PhoneHistory {
  phoneHistoryId: string;
  phoneNumber: string;
  startDate: string;
  endDate: string | null;
}

const PatientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [phoneHistory, setPhoneHistory] = useState<PhoneHistory[]>([]);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const patientRes = await apiClient.get(`/patients/${id}`);
        setPatient(patientRes.data);
        const phoneHistoryRes = await apiClient.get(`/patients/${id}/phone-history`);
        setPhoneHistory(phoneHistoryRes.data);
      } catch (error) {
        console.error('Failed to fetch patient data:', error);
      }
    };

    if (id) {
      fetchPatientData();
    }
  }, [id]);

  if (!patient) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{patient.firstName} {patient.lastName} ({patient.mrn})</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p><strong>Date of Birth:</strong> {new Date(patient.dateOfBirth).toLocaleDateString()}</p>
          <p><strong>Gender:</strong> {patient.gender}</p>
          <p><strong>Phone:</strong> {patient.currentPhoneNumber}</p>
        </div>
        <div>
          <button
            onClick={() => setShowDuplicatesModal(true)}
            className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
          >
            Check Duplicates
          </button>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Phone Number History</h2>
        <ul>
          {phoneHistory.map(h => (
            <li key={h.phoneHistoryId} className="border-b py-2">
              {h.phoneNumber} (from {new Date(h.startDate).toLocaleDateString()} to {h.endDate ? new Date(h.endDate).toLocaleDateString() : 'Present'})
            </li>
          ))}
        </ul>
      </div>

      {showDuplicatesModal && (
        <DuplicateDetectionModal
          patientId={patient.patientId}
          onClose={() => setShowDuplicatesModal(false)}
        />
      )}
    </div>
  );
};

export default PatientDetailPage;
