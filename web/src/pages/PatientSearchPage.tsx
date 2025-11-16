import React, { useState } from 'react';
import PatientSearchForm from '../components/PatientSearchForm';
import PatientListGrid from '../components/PatientListGrid';

interface Patient {
  patientId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  currentPhoneNumber: string;
  dateOfBirth: string;
}

const PatientSearchPage: React.FC = () => {
  const [searchResults, setSearchResults] = useState<Patient[]>([]);

  // This is a simplified implementation. In a real app, you might
  // want to fetch search results here based on the query from PatientSearchForm
  // and pass them to PatientListGrid. For now, we'll just show a message.

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Patient Search</h1>
      <PatientSearchForm onPatientSelect={(patient) => setSearchResults([patient])} />
      <div className="mt-8">
        {searchResults.length > 0 ? (
          <PatientListGrid patients={searchResults} />
        ) : (
          <p>Search for a patient to see results.</p>
        )}
      </div>
    </div>
  );
};

export default PatientSearchPage;
