import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import dayjs from 'dayjs';

interface Payable {
  id: string;
  referenceLabName: string;
  referenceLabId: string | null;
  patientId: string;
  testId: string;
  amountDue: number;
  amountPaid: number;
  status: string;
  createdAt: string;
}

const OutsourcedPayablesScreen: React.FC = () => {
  const [payables, setPayables] = useState<Payable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('Pending');

  const fetchPayables = async () => {
    setIsLoading(true);
    try {
      // Assuming a generic endpoint or filtering logic on backend
      const response = await apiClient.get('/finance/outsourced-payables'); 
      setPayables(response.data.data);
    } catch (err) {
      console.error('Failed to fetch payables', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayables();
  }, []);

  const handleSettle = async (payableId: string) => {
    if (window.confirm('Are you sure you want to mark this as settled?')) {
      try {
        await apiClient.post(`/finance/outsourced-payables/${payableId}/settle`, {
           amount: payables.find(p => p.id === payableId)?.amountDue
        });
        fetchPayables();
      } catch (err) {
        console.error('Settlement failed', err);
        alert('Settlement failed.');
      }
    }
  };

  const filteredPayables = payables.filter(p => 
    filter === 'All' || p.status === filter
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Outsourced Lab Payables</h2>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Filter:</label>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-md p-1 text-sm"
          >
            <option value="All">All</option>
            <option value="Pending">Pending</option>
            <option value="Settled">Settled</option>
          </select>
          <button 
            onClick={fetchPayables}
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference Lab</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Due</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayables.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">No payables found.</td>
                </tr>
              ) : (
                filteredPayables.map((payable) => (
                  <tr key={payable.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {dayjs(payable.createdAt).format('DD MMM YYYY')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {payable.referenceLabName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      ${payable.amountDue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        payable.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {payable.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {payable.status === 'Pending' && (
                        <button 
                          onClick={() => handleSettle(payable.id)}
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded"
                        >
                          Settle
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OutsourcedPayablesScreen;
