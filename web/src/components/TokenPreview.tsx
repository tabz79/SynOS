import React, { useRef } from 'react';

interface TokenPreviewProps {
  token: string;
  mrn: string;
  patientName: string;
  visitTime: string;
}

const TokenPreview: React.FC<TokenPreviewProps> = ({ token, mrn, patientName, visitTime }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // Reload to restore original content and scripts
    }
  };

  return (
    <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
      <div ref={printRef} className="print-area p-4">
        <h3 className="text-2xl font-bold text-blue-700 mb-4">Your Token Number</h3>
        <p className="text-6xl font-extrabold text-blue-900 mb-6">{token}</p>
        <div className="text-left mt-4 border-t pt-4 border-blue-200">
          <p className="text-lg"><strong>Patient:</strong> {patientName}</p>
          <p className="text-lg"><strong>MRN:</strong> {mrn}</p>
          <p className="text-lg"><strong>Visit Time:</strong> {visitTime}</p>
        </div>
      </div>
      <button onClick={handlePrint} className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-blue-700 mt-4">
        Print Token
      </button>
    </div>
  );
};

export default TokenPreview;
