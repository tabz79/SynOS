import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Patient {
  patientId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  currentPhoneNumber: string;
  dateOfBirth: string;
  // lastVisit: string; // This property is not in the model yet
}

interface PatientListGridProps {
  patients: Patient[];
}

const PatientListGrid: React.FC<PatientListGridProps> = ({ patients }) => {
  const navigate = useNavigate();

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead className="bg-gray-200">
          <tr>
            <th className="py-2 px-4 border-b">MRN</th>
            <th className="py-2 px-4 border-b">Name</th>
            <th className="py-2 px-4 border-b">Phone</th>
            <th className="py-2 px-4 border-b">Age</th>
            <th className="py-2 px-4 border-b">Last Visit</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <tr
              key={patient.patientId}
              className="hover:bg-gray-100 cursor-pointer"
              onClick={() => navigate(`/patients/${patient.patientId}`)}
            >
              <td className="py-2 px-4 border-b">{patient.mrn}</td>
              <td className="py-2 px-4 border-b">{patient.firstName} {patient.lastName}</td>
              <td className="py-2 px-4 border-b">{patient.currentPhoneNumber}</td>
              <td className="py-2 px-4 border-b">{calculateAge(patient.dateOfBirth)}</td>
              <td className="py-2 px-4 border-b">N/A</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PatientListGrid;
