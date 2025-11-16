import React from 'react';

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

interface InvoicePreviewStepProps {
  patient: Patient;
  selectedTests: TestDefinition[];
  onCreateVisit: () => void;
  onBack: () => void;
}

const InvoicePreviewStep: React.FC<InvoicePreviewStepProps> = ({ patient, selectedTests, onCreateVisit, onBack }) => {
  const grossAmount = selectedTests.reduce((sum, test) => sum + test.price, 0);
  const discountAmount = 0; // For simplicity
  const netAmount = grossAmount - discountAmount;
  const taxAmount = netAmount * 0.05; // 5% tax for example
  const totalAmount = netAmount + taxAmount;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Step 4: Invoice Preview</h3>
      <div className="mb-4 p-4 border rounded-md bg-gray-50">
        <p><strong>Patient:</strong> {patient.firstName} {patient.lastName} ({patient.mrn})</p>
        <p className="font-bold mt-2">Selected Tests:</p>
        <ul>
          {selectedTests.map(test => (
            <li key={test.code}>{test.name} ({test.department}) - ${test.price.toFixed(2)}</li>
          ))}
        </ul>
        <p className="font-bold mt-2">Invoice Summary:</p>
        <p>Gross Amount: ${grossAmount.toFixed(2)}</p>
        <p>Discount: ${discountAmount.toFixed(2)}</p>
        <p>Net Amount: ${netAmount.toFixed(2)}</p>
        <p>Tax (5%): ${taxAmount.toFixed(2)}</p>
        <p className="text-xl font-bold">Total: ${totalAmount.toFixed(2)}</p>
      </div>
      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="bg-gray-300 px-4 py-2 rounded">Back</button>
        <button onClick={onCreateVisit} className="bg-blue-500 text-white px-4 py-2 rounded">Confirm & Create Visit</button>
      </div>
    </div>
  );
};

export default InvoicePreviewStep;
