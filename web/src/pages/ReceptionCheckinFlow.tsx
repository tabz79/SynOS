import React, { useState } from 'react';
import PatientSearchForm from '../components/PatientSearchForm';
import TestSelectionStep from '../components/checkin/TestSelectionStep';
import ReferralTypeStep from '../components/checkin/ReferralTypeStep';
import InvoicePreviewStep from '../components/checkin/InvoicePreviewStep';
import PaymentCaptureModal from '../components/PaymentCaptureModal';
import TokenPreview from '../components/TokenPreview';
import apiClient from '../services/apiClient';

interface Patient {
  patientId: string;
  mrn: string;
  firstName: string;
  lastName: string;
}

interface TestDefinition {
  code: string;
  name: string;
  price: number;
  department: string;
}

const testDefinitions: TestDefinition[] = [
  { code: 'CBC', name: 'Complete Blood Count', price: 150, department: 'Pathology' },
  { code: 'FBS', name: 'Fasting Blood Sugar', price: 100, department: 'Pathology' },
  { code: 'USG', name: 'Ultrasound Scan', price: 500, department: 'Radiology' },
  { code: 'XrayChest', name: 'X-Ray Chest', price: 300, department: 'Radiology' },
  { code: 'CTHead', name: 'CT Scan Head', price: 1000, department: 'Radiology' },
];

const ReceptionCheckinFlow: React.FC = () => {
  const [step, setStep] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedTests, setSelectedTests] = useState<TestDefinition[]>([]);
  const [referralType, setReferralType] = useState('');
  const [visitDetails, setVisitDetails] = useState<any | null>(null); // Stores visitId, token, invoice details
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setStep(2);
  };

  const handleTestsSelected = (tests: TestDefinition[]) => {
    setSelectedTests(tests);
    setStep(3);
  };

  const handleReferralTypeSelected = (type: string) => {
    setReferralType(type);
    setStep(4);
  };

  const handleCreateVisit = async () => {
    if (!selectedPatient || selectedTests.length === 0) {
      setError('Patient and tests must be selected.');
      return;
    }

    try {
      const response = await apiClient.post('/visits', {
        patientId: selectedPatient.patientId,
        department: selectedTests[0].department, // Assuming all tests are from same dept for simplicity
        testCodes: selectedTests.map(t => t.code),
        referrerId: referralType === 'internal' ? 'some-internal-id' : null, // Placeholder
      });
      setVisitDetails(response.data);
      setStep(5); // Move to payment step
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create visit.');
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setStep(6); // Move to token preview
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">Step 1: Search Patient</h3>
            <PatientSearchForm onPatientSelect={handlePatientSelect} />
          </div>
        );
      case 2:
        return (
          <TestSelectionStep
            testDefinitions={testDefinitions}
            onTestsSelected={handleTestsSelected}
            onBack={() => setStep(1)}
          />
        );
      case 3:
        return (
          <ReferralTypeStep
            onReferralTypeSelected={handleReferralTypeSelected}
            onBack={() => setStep(2)}
          />
        );
      case 4:
        return (
          <InvoicePreviewStep
            patient={selectedPatient!}
            selectedTests={selectedTests}
            onCreateVisit={handleCreateVisit}
            onBack={() => setStep(3)}
          />
        );
      case 5:
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">Step 5: Payment</h3>
            {visitDetails && (
              <button onClick={() => setShowPaymentModal(true)} className="bg-green-500 text-white px-4 py-2 rounded">
                Proceed to Payment
              </button>
            )}
            {showPaymentModal && visitDetails && (
              <PaymentCaptureModal
                invoiceId={visitDetails.invoiceId} // Assuming invoiceId is returned with visitDetails
                totalAmount={visitDetails.invoiceTotal} // Assuming total is returned
                onPaymentSuccess={handlePaymentSuccess}
                onClose={() => setShowPaymentModal(false)}
              />
            )}
            <button onClick={() => setStep(4)} className="bg-gray-300 px-4 py-2 rounded mt-4">Back</button>
          </div>
        );
      case 6:
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">Step 6: Token Preview</h3>
            {visitDetails && <TokenPreview token={visitDetails.token} />}
            <button onClick={() => setStep(7)} className="bg-blue-500 text-white px-4 py-2 rounded mt-4">Done</button>
            <button onClick={() => setStep(5)} className="bg-gray-300 px-4 py-2 rounded mt-4 ml-2">Back</button>
          </div>
        );
      case 7:
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">Check-in Complete!</h3>
            <p>Patient {selectedPatient?.firstName} {selectedPatient?.lastName} has been checked in.</p>
            <button onClick={() => { setStep(1); setSelectedPatient(null); setSelectedTests([]); setReferralType(''); setVisitDetails(null); }} className="bg-blue-500 text-white px-4 py-2 rounded mt-4">Start New Check-in</button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Reception Check-in Flow</h1>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      <div className="bg-white shadow-md rounded-lg p-6">
        {renderStep()}
      </div>
    </div>
  );
};

export default ReceptionCheckinFlow;
