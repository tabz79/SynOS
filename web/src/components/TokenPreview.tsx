import React from 'react';

interface TokenPreviewProps {
  token: string;
}

const TokenPreview: React.FC<TokenPreviewProps> = ({ token }) => {
  const handlePrint = () => {
    window.print(); // Simple browser print for now
  };

  return (
    <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
      <h3 className="text-2xl font-bold text-blue-700 mb-4">Your Token Number</h3>
      <p className="text-6xl font-extrabold text-blue-900 mb-6">{token}</p>
      <button onClick={handlePrint} className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-blue-700">
        Print Token
      </button>
    </div>
  );
};

export default TokenPreview;
