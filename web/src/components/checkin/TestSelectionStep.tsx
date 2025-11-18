import React, { useState } from 'react';

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

  const handleTestToggle = (test: TestDefinition) => {
    setSelectedTests(prev =>
      prev.some(t => t.testCode === test.testCode)
        ? prev.filter(t => t.testCode !== test.testCode)
        : [...prev, test]
    );
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
      <h3 className="text-lg font-semibold mb-4">Step 2: Select Tests</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {testDefinitions.map(test => (
          <div
            key={test.testCode}
            className={`p-4 border rounded-md cursor-pointer ${
              selectedTests.some(t => t.testCode === test.testCode) ? 'bg-blue-100 border-blue-500' : 'bg-gray-50'
            }`}
            onClick={() => handleTestToggle(test)}
          >
            <p className="font-bold">{test.name} ({test.testCode})</p>
            <p className="text-sm text-gray-600">{test.department} - ${test.price}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="bg-gray-300 px-4 py-2 rounded">Back</button>
        <button onClick={handleNext} className="bg-blue-500 text-white px-4 py-2 rounded">Next</button>
      </div>
    </div>
  );
};

export default TestSelectionStep;
