import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';
import PaymentCaptureModal from '../components/PaymentCaptureModal';

interface Visit {
  visitId: string;
  token: string;
  patient: {
    firstName: string;
    lastName: string;
  };
  invoice: {
    invoiceId: string;
    total: number;
    status: string;
  };
  status: string;
}

const VisitListPage: React.FC = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [department, setDepartment] = useState('Pathology');
  const [status, setStatus] = useState('PendingPayment');
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  const fetchVisits = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/visits?dept=${department}&status=${status}&limit=50`);
      setVisits(response.data);
    } catch (error) {
      console.error('Failed to fetch visits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, [department, status]);

  const handlePaymentClick = (visit: Visit) => {
    setSelectedVisit(visit);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedVisit(null);
    fetchVisits(); // Refresh the list
  };

  const handleCancelVisit = async (visitId: string) => {
    if (window.confirm('Are you sure you want to cancel this visit?')) {
      try {
        await apiClient.post(`/visits/${visitId}/cancel`, { reason: 'Cancelled by reception' });
        fetchVisits(); // Refresh the list
      } catch (error) {
        console.error('Failed to cancel visit:', error);
      }
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Visit List</h1>
      <div className="flex space-x-4 mb-4">
        <div>
          <label htmlFor="department" className="block text-gray-700">Department</label>
          <select id="department" value={department} onChange={e => setDepartment(e.target.value)} className="p-2 border rounded">
            <option>Pathology</option>
            <option>Radiology</option>
            <option>Cardiology</option>
          </select>
        </div>
        <div>
          <label htmlFor="status" className="block text-gray-700">Status</label>
          <select id="status" value={status} onChange={e => setStatus(e.target.value)} className="p-2 border rounded">
            <option>PendingPayment</option>
            <option>Paid</option>
            <option>Cancelled</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <p>Loading visits...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-200">
              <tr>
                <th className="py-2 px-4 border-b">Token</th>
                <th className="py-2 px-4 border-b">Patient</th>
                <th className="py-2 px-4 border-b">Amount</th>
                <th className="py-2 px-4 border-b">Status</th>
                <th className="py-2 px-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visits.map(visit => (
                <tr key={visit.visitId}>
                  <td className="py-2 px-4 border-b">{visit.token}</td>
                  <td className="py-2 px-4 border-b">{visit.patient.firstName} {visit.patient.lastName}</td>
                  <td className="py-2 px-4 border-b">${visit.invoice?.total.toFixed(2) || 'N/A'}</td>
                  <td className="py-2 px-4 border-b">{visit.status}</td>
                  <td className="py-2 px-4 border-b">
                    {visit.status === 'PendingPayment' && (
                      <button onClick={() => handlePaymentClick(visit)} className="bg-green-500 text-white px-2 py-1 rounded text-sm mr-2">
                        Record Payment
                      </button>
                    )}
                    {visit.status !== 'Cancelled' && (
                      <button onClick={() => handleCancelVisit(visit.visitId)} className="bg-red-500 text-white px-2 py-1 rounded text-sm">
                        Cancel Visit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showPaymentModal && selectedVisit && (
        <PaymentCaptureModal
          invoiceId={selectedVisit.invoice.invoiceId}
          totalAmount={selectedVisit.invoice.total}
          onPaymentSuccess={handlePaymentSuccess}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
};

export default VisitListPage;
