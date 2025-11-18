import React, { useState } from 'react';
import apiClient from '../services/apiClient';

interface PaymentCaptureModalProps {
  invoiceId: string;
  totalAmount: number;
  onPaymentSuccess: () => void;
  onClose: () => void;
  receivedByUserId: string; // New prop for the user making the payment
}

const PaymentCaptureModal: React.FC<PaymentCaptureModalProps> = ({ invoiceId, totalAmount, onPaymentSuccess, onClose, receivedByUserId }) => {
  const [amount, setAmount] = useState(totalAmount);
  const [method, setMethod] = useState('Cash');
  const [receiptNo, setReceiptNo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const paymentMethods = ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Prepaid'];

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await apiClient.post(`/visits/${invoiceId}/payment`, {
        amount,
        method,
        receiptNo,
        receivedByUserId, // Include the user ID
      });
      onPaymentSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Payment failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Capture Payment for Invoice: {invoiceId}</h2>
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
        <form onSubmit={handlePayment}>
          <div className="mb-4">
            <label htmlFor="amount" className="block text-gray-700">Amount</label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={e => setAmount(parseFloat(e.target.value))}
              className="w-full p-2 border rounded"
              step="0.01"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="method" className="block text-gray-700">Payment Method</label>
            <select
              id="method"
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="w-full p-2 border rounded"
              required
            >
              {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="receiptNo" className="block text-gray-700">Receipt Number</label>
            <input
              type="text"
              id="receiptNo"
              value={receiptNo}
              onChange={e => setReceiptNo(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">Cancel</button>
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded" disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentCaptureModal;
