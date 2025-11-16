import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';

interface DuplicatePatient {
  patientId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  matchPercentage: number;
}

interface MergePreview {
    visitsToMove: number;
    samplesToMove: number;
    phoneHistoryToMove: number;
    aliasesToMove: number;
    referrerLinksToMove: number;
}

interface DuplicateDetectionModalProps {
  patientId: string;
  onClose: () => void;
}

const DuplicateDetectionModal: React.FC<DuplicateDetectionModalProps> = ({ patientId, onClose }) => {
  const [duplicates, setDuplicates] = useState<DuplicatePatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDuplicate, setSelectedDuplicate] = useState<DuplicatePatient | null>(null);
  const [mergePreview, setMergePreview] = useState<MergePreview | null>(null);
  const [mergeConfirmed, setMergeConfirmed] = useState(false);

  useEffect(() => {
    const fetchDuplicates = async () => {
      try {
        const response = await apiClient.get(`/patients/${patientId}/possible-duplicates`);
        setDuplicates(response.data);
      } catch (error) {
        console.error('Failed to fetch duplicates:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDuplicates();
  }, [patientId]);

  const handleMergePreview = async (sourceId: string) => {
    try {
      const response = await apiClient.post('/patients/merge-preview', { targetId: patientId, sourceId });
      setMergePreview(response.data);
      setSelectedDuplicate(duplicates.find(d => d.patientId === sourceId) || null);
    } catch (error) {
      console.error('Failed to get merge preview:', error);
    }
  };

  const handleMerge = async () => {
    if (!selectedDuplicate) return;
    try {
      await apiClient.post('/patients/merge', { targetId: patientId, sourceId: selectedDuplicate.patientId });
      alert('Merge successful!');
      onClose();
      // Optionally, refresh the patient page or redirect
    } catch (error) {
      console.error('Merge failed:', error);
      alert('Merge failed. See console for details.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Possible Duplicates</h2>
        {isLoading ? (
          <p>Searching for duplicates...</p>
        ) : duplicates.length === 0 ? (
          <p>No potential duplicates found.</p>
        ) : (
          <ul>
            {duplicates.map(dup => (
              <li key={dup.patientId} className="border-b py-2 flex justify-between items-center">
                <div>
                  <p><strong>{dup.firstName} {dup.lastName}</strong> ({dup.mrn})</p>
                  <p>Match: {dup.matchPercentage}%</p>
                </div>
                <div>
                  <button
                    onClick={() => handleMergePreview(dup.patientId)}
                    className="bg-blue-500 text-white px-3 py-1 rounded mr-2"
                  >
                    Preview Merge
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {mergePreview && selectedDuplicate && (
          <div className="mt-4 p-4 border border-yellow-400 bg-yellow-50">
            <h3 className="font-bold">Merge Preview</h3>
            <p>Merging <strong>{selectedDuplicate.firstName} {selectedDuplicate.lastName}</strong> into the current patient will move:</p>
            <ul>
              <li>{mergePreview.visitsToMove} Visits</li>
              <li>{mergePreview.samplesToMove} Samples</li>
              <li>{mergePreview.phoneHistoryToMove} Phone History Records</li>
              <li>{mergePreview.aliasesToMove} Aliases</li>
              <li>{mergePreview.referrerLinksToMove} Referrer Links</li>
            </ul>
            <div className="mt-2">
              <input type="checkbox" id="confirmMerge" checked={mergeConfirmed} onChange={() => setMergeConfirmed(!mergeConfirmed)} />
              <label htmlFor="confirmMerge" className="ml-2">I have reviewed the preview and confirm the merge.</label>
            </div>
            <button
              onClick={handleMerge}
              disabled={!mergeConfirmed}
              className={`mt-2 px-4 py-2 rounded text-white ${mergeConfirmed ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 cursor-not-allowed'}`}
            >
              Confirm & Merge
            </button>
          </div>
        )}

        <button onClick={onClose} className="mt-4 bg-gray-300 px-4 py-2 rounded">Close</button>
      </div>
    </div>
  );
};

export default DuplicateDetectionModal;
