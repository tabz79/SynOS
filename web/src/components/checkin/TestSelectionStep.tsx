import React, { useState } from 'react';
import AddOutsourcedTestModal from '../AddOutsourcedTestModal';

interface TestDefinition {
  testCode: string;
  name: string;
  price: number;
  department: string;
}

interface TestSelectionStepProps {
  testDefinitions: TestDefinition[];
  onTestsSelected: (tests: TestDefinition[]) => void;
  onBack: () => void;
}

const TestSelectionStep: React.FC<TestSelectionStepProps> = ({ testDefinitions, onTestsSelected, onBack }) => {
  const [selectedTests, setSelectedTests] = useState<TestDefinition[]>([]);
  const [showOutsourcedModal, setShowOutsourcedModal] = useState(false);

  const handleTestToggle = (test: TestDefinition) => {
    setSelectedTests(prev =>
      prev.some(t => t.testCode === test.testCode)
        ? prev.filter(t => t.testCode !== test.testCode)
        : [...prev, test]
    );
  };

  const handleAddOutsourced = (outsourced: { testName: string; price: number; referenceLabId: string | null; referenceLabName: string | null }) => {
    const newTest: TestDefinition = {
      testCode: `AD-HOC-${Date.now()}`,
      name: outsourced.testName,
      price: outsourced.price,
      department: 'Outsourced'
    };
    setSelectedTests(prev => [...prev, newTest]);
  };

  const handleNext = () => {
    if (selectedTests.length > 0) {
      onTestsSelected(selectedTests);
    } else {
      alert('Please select at least one test.');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Step 2: Select Tests</h3>
        <button
          onClick={() => setShowOutsourcedModal(true)}
          className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transition"
        >
          + Add Outsourced Test
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto p-1">
        {testDefinitions.map(test => (
          <div
            key={test.testCode}
            className={`p-4 border rounded-md cursor-pointer transition ${
              selectedTests.some(t => t.testCode === test.testCode) ? 'bg-blue-100 border-blue-500 shadow-sm' : 'bg-gray-50 hover:bg-gray-100'
            }`}
            onClick={() => handleTestToggle(test)}
          >
            <p className="font-bold">{test.name} ({test.testCode})</p>
            <p className="text-sm text-gray-600">{test.department} - ${test.price}</p>
          </div>
        ))}
        {/* Render ad-hoc tests specifically if they aren't in the list */}
        {selectedTests.filter(st => !testDefinitions.some(td => td.testCode === st.testCode)).map(test => (
           <div
           key={test.testCode}
           className="p-4 border rounded-md cursor-pointer bg-purple-100 border-purple-500 shadow-sm"
           onClick={() => handleTestToggle(test)}
         >
           <p className="font-bold">{test.name} <span className="text-xs bg-purple-200 px-1 rounded">OUTSOURCED</span></p>
           <p className="text-sm text-gray-600">Manual Entry - ${test.price}</p>
         </div>
        ))}
      </div>

      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="bg-gray-300 px-4 py-2 rounded">Back</button>
        <button onClick={handleNext} className="bg-blue-500 text-white px-4 py-2 rounded">Next</button>
      </div>

      {showOutsourcedModal && (
        <AddOutsourcedTestModal
          onClose={() => setShowOutsourcedModal(false)}
          onAdd={handleAddOutsourced}
        />
      )}
    </div>
  );
};

export default TestSelectionStep;
