import React, { useState } from 'react';
import apiClient from '../services/apiClient';

interface Patient {
  patientId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  currentPhoneNumber?: string;
  dateOfBirth?: string;
}

interface PatientSearchFormProps {
  onPatientSelect: (patient: Patient) => void;
}

const PatientSearchForm: React.FC<PatientSearchFormProps> = ({ onPatientSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    if (newQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.get(`/patients?q=${newQuery}&limit=10`);
      setResults(response.data);
    } catch (error) {
      console.error('Failed to search for patients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Search patients by name, MRN, or phone..."
        className="w-full p-2 border border-gray-300 rounded-md"
      />
      {isLoading && <div className="p-2">Loading...</div>}
      {results.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto">
          {results.map((patient) => (
            <li
              key={patient.patientId}
              className="p-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => {
                onPatientSelect(patient);
                setQuery(`${patient.firstName} ${patient.lastName} (${patient.mrn})`);
                setResults([]);
              }}
            >
              {patient.firstName} {patient.lastName} ({patient.mrn})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PatientSearchForm;
