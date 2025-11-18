import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';
import PaymentCaptureModal from '../components/PaymentCaptureModal';
import TokenPreview from '../components/TokenPreview';
import { useAuth } from '../contexts/AuthContext'; // To get current user ID
import dayjs from 'dayjs';

interface Visit {
  visitId: string;
  token: string;
  patient: {
    patientId: string;
    mrn: string;
    firstName: string;
    lastName: string;
  };
  invoice: {
    invoiceId: string;
    total: number;
    status: string;
  };
  status: string;
  createdAt: string;
}

interface TokenPrintDetails {
  token: string;
  mrn: string;
  patientName: string;
  visitTime: string;
}

const VisitListPage: React.FC = () => {
  const { user } = useAuth(); // Get current user from AuthContext
  const [visits, setVisits] = useState<Visit[]>([]);
  const [department, setDepartment] = useState('Pathology');
  const [status, setStatus] = useState('PendingPayment');
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTokenPreviewModal, setShowTokenPreviewModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [tokenPrintDetails, setTokenPrintDetails] = useState<TokenPrintDetails | null>(null);

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

  const handleCancelVisit = async (visit: Visit) => {
    if (!user?.userId) {
      alert('User not authenticated.');
      return;
    }
    if (window.confirm(`Are you sure you want to cancel visit ${visit.token} for ${visit.patient.firstName} ${visit.patient.lastName}?`)) {
      try {
        await apiClient.post(`/visits/${visit.visitId}/cancel`, {
          reason: 'Cancelled by reception',
          cancelledByUserId: user.userId,
        });
        fetchVisits(); // Refresh the list
      } catch (error) {
        console.error('Failed to cancel visit:', error);
        alert('Failed to cancel visit.');
      }
    }
  };

  const handlePrintToken = async (visit: Visit) => {
    try {
      const response = await apiClient.get(`/visits/${visit.visitId}/token`);
      setTokenPrintDetails(response.data);
      setShowTokenPreviewModal(true);
    } catch (error) {
      console.error('Failed to fetch token details:', error);
      alert('Failed to fetch token details for printing.');
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
            <option>Cardiology</option> {/* TODO: Make this dynamic from API */}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="block text-gray-700">Status</label>
          <select id="status" value={status} onChange={e => setStatus(e.target.value)} className="p-2 border rounded">
            <option>PendingPayment</option>
            <option>Paid</option>
            <option>PartialPayment</option>
            <option>Cancelled</option>
            <option>Pending</option> {/* Add other relevant statuses */}
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
                    {(visit.status === 'PendingPayment' || visit.status === 'PartialPayment') && (
                      <button onClick={() => handlePaymentClick(visit)} className="bg-green-500 text-white px-2 py-1 rounded text-sm mr-2">
                        Record Payment
                      </button>
                    )}
                    <button onClick={() => handlePrintToken(visit)} className="bg-blue-500 text-white px-2 py-1 rounded text-sm mr-2">
                      Print Token
                    </button>
                    {visit.status !== 'Cancelled' && (
                      <button onClick={() => handleCancelVisit(visit)} className="bg-red-500 text-white px-2 py-1 rounded text-sm">
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

      {showPaymentModal && selectedVisit && user?.userId && (
        <PaymentCaptureModal
          invoiceId={selectedVisit.invoice.invoiceId}
          totalAmount={selectedVisit.invoice.total}
          onPaymentSuccess={handlePaymentSuccess}
          onClose={() => setShowPaymentModal(false)}
          receivedByUserId={user.userId}
        />
      )}

      {showTokenPreviewModal && tokenPrintDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg relative">
            <button onClick={() => setShowTokenPreviewModal(false)} className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-xl">&times;</button>
            <TokenPreview
              token={tokenPrintDetails.token}
              mrn={tokenPrintDetails.mrn}
              patientName={tokenPrintDetails.patientName}
              visitTime={tokenPrintDetails.visitTime}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitListPage;
