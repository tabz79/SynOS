import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

interface ReferenceLab {
  id: string;
  name: string;
  code: string;
}

interface TestCatalogItem {
  testId: string;
  testCode: string;
  testName: string;
  basePrice: number;
}

interface AddOutsourcedTestModalProps {
  onClose: () => void;
  onAdd: (test: { testName: string; price: number; referenceLabId: string | null; referenceLabName: string | null }) => void;
}

const AddOutsourcedTestModal: React.FC<AddOutsourcedTestModalProps> = ({ onClose, onAdd }) => {
  const [testName, setTestName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [referenceLabId, setReferenceLabId] = useState<string>('');
  const [labs, setLabs] = useState<ReferenceLab[]>([]);
  const [catalog, setCatalog] = useState<TestCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [labsRes, catalogRes] = await Promise.all([
          apiClient.get('/reception/reference-labs'),
          apiClient.get('/reception/outsourced-catalog')
        ]);
        if (labsRes.data?.data) setLabs(labsRes.data.data);
        if (catalogRes.data?.data) setCatalog(catalogRes.data.data);
      } catch (err) {
        console.error('Failed to fetch data', err);
        setError('Failed to load catalog data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSelectFromCatalog = (item: TestCatalogItem) => {
    setTestName(item.testName);
    setPrice(item.basePrice);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!testName || testName.length < 3) {
      setError('Test name must be at least 3 characters.');
      return;
    }
    if (price <= 0) {
      setError('Price must be greater than 0.');
      return;
    }

    const lab = labs.find(l => l.id === referenceLabId);
    onAdd({
      testName,
      price,
      referenceLabId: referenceLabId || null,
      referenceLabName: lab ? lab.name : null
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-3xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Add Outsourced Test</h3>
            <p className="text-sm text-gray-500 mt-1">Select from catalog or enter ad-hoc details for external lab processing.</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg animate-pulse">
            <p className="font-semibold">Action Required</p>
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Catalog selection */}
          <div className="lg:col-span-2 border-r pr-8">
            <h4 className="font-bold mb-4 text-xs text-gray-400 uppercase tracking-widest flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Standard Catalog
            </h4>
            <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-200">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
                </div>
              ) : catalog.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400 italic">No outsourced tests in catalog.</p>
                </div>
              ) : (
                catalog.map(item => (
                  <div 
                    key={item.testId}
                    onClick={() => handleSelectFromCatalog(item)}
                    className="p-3 border border-gray-100 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-gray-800 group-hover:text-blue-700">{item.testName}</p>
                      <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">${item.basePrice}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 font-mono uppercase">{item.testCode}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Manual entry */}
          <div className="lg:col-span-3">
            <h4 className="font-bold mb-4 text-xs text-gray-400 uppercase tracking-widest flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Configuration Details
            </h4>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Test Title</label>
                    <input
                      type="text"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                      placeholder="e.g. Rare Genetic Screening"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Billing Price</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(Number(e.target.value))}
                          className="w-full bg-white border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                          placeholder="0.00"
                          step="0.01"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reference Lab</label>
                      <select
                        value={referenceLabId}
                        onChange={(e) => setReferenceLabId(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow appearance-none"
                        disabled={isLoading}
                      >
                        <option value="">-- No Lab Selected --</option>
                        {labs.map(lab => (
                          <option key={lab.id} value={lab.id}>{lab.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-4 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex-[2] px-6 py-4 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 rounded-xl shadow-lg shadow-blue-500/20 transform active:scale-[0.98] transition-all"
                >
                  Apply to Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddOutsourcedTestModal;
