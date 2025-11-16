import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';

interface SameDayVisitWarningProps {
  patientId: string;
  date: string; // YYYY-MM-DD
}

interface SameDayVisitDto {
  hasSameDayVisits: boolean;
  suggestCombineBilling: boolean;
  visits: {
    appointmentId: string;
    scheduledFor: string;
    department: string;
  }[];
}

const SameDayVisitWarning: React.FC<SameDayVisitWarningProps> = ({ patientId, date }) => {
  const [warning, setWarning] = useState<SameDayVisitDto | null>(null);

  useEffect(() => {
    const checkVisits = async () => {
      try {
        const response = await apiClient.get(`/patients/${patientId}/same-day-visits?date=${date}`);
        if (response.data.hasSameDayVisits) {
          setWarning(response.data);
        }
      } catch (error) {
        console.error('Failed to check for same-day visits:', error);
      }
    };
    checkVisits();
  }, [patientId, date]);

  if (!warning) {
    return null;
  }

  return (
    <div className="p-4 mb-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
      <p className="font-bold">Same-Day Visit Alert</p>
      <p>This patient has other appointments scheduled for today:</p>
      <ul className="list-disc list-inside">
        {warning.visits.map(v => (
          <li key={v.appointmentId}>
            {v.department} at {new Date(v.scheduledFor).toLocaleTimeString()}
          </li>
        ))}
      </ul>
      <div className="mt-2">
        {warning.suggestCombineBilling && (
          <button className="bg-green-500 text-white px-3 py-1 rounded mr-2">Combine Billing</button>
        )}
        <button className="bg-blue-500 text-white px-3 py-1 rounded">Create New Visit</button>
      </div>
    </div>
  );
};

export default SameDayVisitWarning;
