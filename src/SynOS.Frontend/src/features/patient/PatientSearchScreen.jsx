import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientApi } from '@/api/patient';
import { Search, Users, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

// Helper date formatters
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function PatientSearchScreen() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 2026 Pagination states
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      performSearch(query, page, limit);
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [query, page, limit]);

  const performSearch = async (searchQuery, currentPage, currentLimit) => {
    setLoading(true);
    setError(null);
    try {
      const offset = (currentPage - 1) * currentLimit;
      const data = await PatientApi.searchPatients(searchQuery, currentLimit, offset);
      setPatients(data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to query patient database.');
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    setPage(1);
  };

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} Y`;
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      {/* Header Block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-medium tracking-tight text-zinc-800 dark:text-white flex items-center gap-2.5">
            <Users className="w-5 h-5 text-synos-primary" /> Patient Master Directory
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Search clinical demographic records, inspect longitudinal files, check billing logs, and merge duplicates</p>
        </div>
      </div>

      {/* Action Bar / Search Input */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full max-w-xs sm:max-w-md">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search patients by name, MRN, or phone number..."
            className="w-full bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-200 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-550 focus:outline-none focus:ring-1 focus:ring-synos-primary focus:border-synos-primary transition-all font-medium shadow-sm"
          />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Table Container - matching Identity & Access perfectly */}
      <div className="bg-white dark:bg-zinc-950 border dark:border-zinc-900/60 border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b dark:border-zinc-900/60 border-zinc-100 bg-zinc-50/50 dark:bg-zinc-900/10 flex items-center gap-2">
          <Users className="w-4 h-4 text-synos-primary" />
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Managed Patients Demographics</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-medium text-zinc-400 border-b dark:border-zinc-900 border-zinc-100 bg-zinc-50/10 dark:bg-zinc-900/5">
                <th className="px-6 py-3.5 font-medium">Patient</th>
                <th className="px-6 py-3.5 font-medium">Demographics</th>
                <th className="px-6 py-3.5 font-medium">MRN Code</th>
                <th className="px-6 py-3.5 font-medium">Last Visit Date</th>
                <th className="px-6 py-3.5 font-medium">Last Visit Tests</th>
                <th className="px-6 py-3.5 text-right font-medium">Operational Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-zinc-900 border-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-xs text-zinc-400 animate-pulse font-normal">
                    Syncing system patient demographics registry...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-xs text-zinc-505">
                    No matching patient demographics records found.
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.patientId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-medium text-zinc-500 border dark:border-zinc-700">
                          {p.firstName[0]?.toUpperCase()}{p.lastName ? p.lastName[0]?.toUpperCase() : ''}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{p.firstName} {p.lastName}</p>
                          <p className="text-[10px] text-zinc-450 dark:text-zinc-500 font-medium">{p.currentPhoneNumber || 'No phone registered'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-zinc-650 dark:text-zinc-400 capitalize">{p.gender} &bull; {calculateAge(p.dateOfBirth)}</span>
                        <span className="text-[10px] text-zinc-400 font-medium">DOB: {formatDate(p.dateOfBirth)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 bg-synos-primary/10 text-synos-primary border border-synos-primary/10 rounded-md text-[9px] font-mono font-medium uppercase tracking-normal">
                        {p.mrn || 'NO MRN'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-zinc-650 dark:text-zinc-400">
                        {p.lastVisitDate ? formatDate(p.lastVisitDate) : 'No visits'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {p.lastVisitTestCodes && p.lastVisitTestCodes.length > 0 ? (
                          p.lastVisitTestCodes.map((code, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border dark:border-zinc-700/60 rounded text-[9px] font-mono">
                              {code}
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] text-zinc-400 italic">No tests ordered</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/admin/patients/${p.patientId}`)}
                        className="bg-synos-primary text-white hover:bg-opacity-95 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors shadow-sm shadow-synos-primary/5 active:scale-95"
                      >
                        View File
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modern 2026 Pagination Controls */}
        {!loading && (patients.length > 0 || page > 1) && (
          <div className="flex items-center justify-between border-t dark:border-zinc-900 border-zinc-100 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/5">
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-200 rounded px-2 py-1 text-xs outline-none cursor-pointer text-zinc-700 dark:text-zinc-300"
                >
                  {[5, 10, 20, 50].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              <span>Showing page {page}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="p-1.5 rounded-lg border dark:border-zinc-800 border-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-zinc-600 dark:text-zinc-300">
                Page {page}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={patients.length < limit || loading}
                className="p-1.5 rounded-lg border dark:border-zinc-800 border-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
