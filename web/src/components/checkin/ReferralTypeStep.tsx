import React, { useState } from 'react';

interface ReferralTypeStepProps {
  onReferralTypeSelected: (type: string) => void;
  onBack: () => void;
}

const ReferralTypeStep: React.FC<ReferralTypeStepProps> = ({ onReferralTypeSelected, onBack }) => {
  const [selectedType, setSelectedType] = useState('');

  const handleNext = () => {
    if (selectedType) {
      onReferralTypeSelected(selectedType);
    } else {
      alert('Please select a referral type.');
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Step 3: Choose Referral Type</h3>
      <div className="mb-4">
        <label className="inline-flex items-center mr-4">
          <input
            type="radio"
            className="form-radio"
            name="referralType"
            value="internal"
            checked={selectedType === 'internal'}
            onChange={() => setSelectedType('internal')}
          />
          <span className="ml-2">Internal Referral</span>
        </label>
        <label className="inline-flex items-center">
          <input
            type="radio"
            className="form-radio"
            name="referralType"
            value="external"
            checked={selectedType === 'external'}
            onChange={() => setSelectedType('external')}
          />
          <span className="ml-2">External Referral</span>
        </label>
      </div>
      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="bg-gray-300 px-4 py-2 rounded">Back</button>
        <button onClick={handleNext} className="bg-blue-500 text-white px-4 py-2 rounded">Next</button>
      </div>
    </div>
  );
};

export default ReferralTypeStep;
