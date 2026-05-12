import React, { useState, useEffect } from 'react';
import PatientSearchForm from '../components/PatientSearchForm';
import TestSelectionStep from '../components/checkin/TestSelectionStep';
import ReferralTypeStep from '../components/checkin/ReferralTypeStep';
import InvoicePreviewStep from '../components/checkin/InvoicePreviewStep';
import PaymentCaptureModal from '../components/PaymentCaptureModal';
import TokenPreview from '../components/TokenPreview';
import apiClient from '../services/apiClient';
import { v4 as uuidv4 } from 'uuid'; // For generating idempotency key
import dayjs from 'dayjs'; // For local date handling
import { useAuth } from '../contexts/AuthContext'; // Import useAuth

interface Patient {
  patientId: string;
  mrn: string;
  firstName: string;
  lastName: string;
}

interface TestDefinition {
  testCode: string;
  name: string;
  price: number;
  department: string;
}

interface VisitDetails {
  visitId: string;
  token: string;
  invoice: {
    invoiceId: string;
    total: number;
  };
  patient: {
    mrn: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string; // Assuming this is the visit time
}

const ReceptionCheckinFlow: React.FC = () => {
  const { user } = useAuth(); // Get current user from AuthContext
  const [step, setStep] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [availableTestDefinitions, setAvailableTestDefinitions] = useState<TestDefinition[]>([]);
  const [selectedTests, setSelectedTests] = useState<TestDefinition[]>([]);
  const [referralType, setReferralType] = useState('');
  const [visitDetails, setVisitDetails] = useState<VisitDetails | null>(null); // Stores visitId, token, invoice details
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingTests, setLoadingTests] = useState(true);

  useEffect(() => {
    const fetchTestDefinitions = async () => {
      try {
        const response = await apiClient.get('/admin/tests'); // Assuming an endpoint for test definitions
        setAvailableTestDefinitions(response.data);
      } catch (err) {
        console.error('Failed to fetch test definitions:', err);
        setError('Failed to load test definitions.');
      } finally {
        setLoadingTests(false);
      }
    };
    fetchTestDefinitions();
  }, []);

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

    // Generate a unique idempotency key for this request
    const idempotencyKey = uuidv4();

    try {
      // Split tests into normal and ad-hoc (ad-hoc tests have testCode starting with AD-HOC-)
      const normalTests = selectedTests.filter(t => !t.testCode.startsWith('AD-HOC-'));
      const adHocTests = selectedTests.filter(t => t.testCode.startsWith('AD-HOC-'));

      // 1. Create Visit with normal tests (or just a visit shell if all are ad-hoc)
      const response = await apiClient.post('/reception/start-visit', {
        patientId: selectedPatient.patientId,
        department: normalTests.length > 0 ? normalTests[0].department : 'Outsourced',
        testCodes: normalTests.map(t => t.testCode),
        referrerId: referralType === 'internal' ? 'some-internal-id' : null, // Placeholder
      }, {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });

      const newVisit = response.data.data;
      const visitId = newVisit.visitId;

      // 2. Add ad-hoc outsourced tests if any
      for (const test of adHocTests) {
        await apiClient.post('/reception/visit/outsource-test', {
          visitId: visitId,
          testName: test.name,
          price: test.price
        });
      }

      // 3. Re-fetch final visit summary to ensure invoice is correct
      const summaryResponse = await apiClient.get(`/reception/visit-summary/${visitId}`);
      setVisitDetails(summaryResponse.data.data);

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
        if (loadingTests) return <p>Loading tests...</p>;
        return (
          <TestSelectionStep
            testDefinitions={availableTestDefinitions}
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
            {showPaymentModal && visitDetails && user?.userId && ( // Ensure user.userId is available
              <PaymentCaptureModal
                invoiceId={visitDetails.invoice.invoiceId}
                totalAmount={visitDetails.invoice.total}
                onPaymentSuccess={handlePaymentSuccess}
                onClose={() => setShowPaymentModal(false)}
                receivedByUserId={user.userId} // Pass the current user's ID
              />
            )}
            <button onClick={() => setStep(4)} className="bg-gray-300 px-4 py-2 rounded mt-4">Back</button>
          </div>
        );
      case 6:
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">Step 6: Token Preview</h3>
            {visitDetails && (
              <TokenPreview
                token={visitDetails.token}
                mrn={visitDetails.patient.mrn}
                patientName={`${visitDetails.patient.firstName} ${visitDetails.patient.lastName}`}
                visitTime={dayjs(visitDetails.createdAt).format('YYYY-MM-DD HH:mm')}
              />
            )}
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
