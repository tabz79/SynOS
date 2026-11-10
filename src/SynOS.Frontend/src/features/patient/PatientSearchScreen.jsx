import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PatientApi } from '@/api/patient';
import { 
  Search, 
  Users, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  CreditCard, 
  Sparkles, 
  ArrowRight,
  Filter,
  Calendar,
  Phone
} from 'lucide-react';
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
  const { theme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter state: null = All Patients, true = Health Card Subscribers only
  const [hasHealthCardFilter, setHasHealthCardFilter] = useState(null);

  // Pagination states
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      performSearch(query, page, limit, hasHealthCardFilter);
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [query, page, limit, hasHealthCardFilter]);

  const performSearch = async (searchQuery, currentPage, currentLimit, healthCardOnly) => {
    setLoading(true);
    setError(null);
    try {
      const offset = (currentPage - 1) * currentLimit;
      const data = await PatientApi.searchPatients(searchQuery, currentLimit, offset, healthCardOnly);
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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Header Block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold border border-blue-200 dark:border-blue-800 shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <span>Patient Master Directory</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mt-1">
            Search clinical demographic records, inspect longitudinal files, check billing logs, and manage health card subscriptions.
          </p>
        </div>
      </div>

      {/* Action Bar: Search Input & Health Card Filter Chips */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search patients by name, MRN, or phone number..."
            className="w-full h-11 bg-slate-50/70 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-xl pl-10 pr-4 text-xs font-semibold text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 transition-all shadow-2xs"
          />
        </div>

        {/* Filter Chips Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 flex items-center gap-1 uppercase tracking-wider mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </span>

          <button
            type="button"
            onClick={() => { setHasHealthCardFilter(null); setPage(1); }}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs",
              hasHealthCardFilter === null
                ? "bg-blue-600 text-white border border-blue-600 shadow-xs font-extrabold"
                : "bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700 hover:border-slate-400"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Patients</span>
          </button>

          <button
            type="button"
            onClick={() => { setHasHealthCardFilter(true); setPage(1); }}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs",
              hasHealthCardFilter === true
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border border-blue-600 shadow-xs font-extrabold"
                : "bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700 hover:border-blue-400"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>💎 Health Card Subscribers</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Table Container - Facelifted with Crisp Borders & Defined Contrast */}
      <div className="rounded-[20px] border border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        {/* Table Top Header Strip */}
        <div className="px-6 py-4 border-b border-slate-300 dark:border-zinc-800 bg-gradient-to-r from-slate-100/90 via-slate-50 to-slate-100/90 dark:from-zinc-900 dark:to-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
              Managed Patients Demographics {hasHealthCardFilter ? "• Health Card Members Only" : ""}
            </h3>
          </div>
          <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
            {patients.length} record{patients.length !== 1 ? 's' : ''} listed
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-extrabold text-slate-700 dark:text-zinc-300 uppercase tracking-wider border-b border-slate-300 dark:border-zinc-800 bg-slate-100/70 dark:bg-zinc-900/60">
                <th className="px-6 py-3.5">Patient</th>
                <th className="px-6 py-3.5">Demographics</th>
                <th className="px-6 py-3.5">{hasHealthCardFilter ? "Health Card / MRN Code" : "MRN Code"}</th>
                <th className="px-6 py-3.5">Last Visit Date</th>
                <th className="px-6 py-3.5">Last Visit Tests</th>
                <th className="px-6 py-3.5 text-right">Operational Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/90 dark:divide-zinc-800/80">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-xs font-bold text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      <span>Syncing patient demographics registry...</span>
                    </div>
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-xs text-slate-500 dark:text-zinc-400 space-y-2">
                    <Users className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto" />
                    <p className="font-bold text-sm text-slate-700 dark:text-zinc-300">No matching patient records found.</p>
                    {hasHealthCardFilter && (
                      <p className="text-xs text-slate-400">
                        Try switching to "All Patients" or search by phone/name.
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.patientId} className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all group">
                    {/* Patient Column */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xs flex items-center justify-center shadow-xs border border-blue-400/30 shrink-0">
                          {p.firstName?.[0]?.toUpperCase()}{p.lastName ? p.lastName[0]?.toUpperCase() : ''}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-zinc-100 group-hover:text-blue-600 transition-colors">
                            {p.firstName} {p.lastName}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {p.currentPhoneNumber || 'No phone registered'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Demographics Column */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 capitalize">
                          {p.gender} &bull; {calculateAge(p.dateOfBirth)}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>DOB: {formatDate(p.dateOfBirth)}</span>
                        </span>
                      </div>
                    </td>

                    {/* MRN / Card Code Column */}
                    <td className="px-6 py-4">
                      {p.hasActiveHealthCard ? (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-mono text-xs font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-2xs flex items-center gap-1.5 w-fit">
                            <CreditCard className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>{p.healthCardNumber || (p.mrn ? `${p.mrn}-HC` : 'HC MEMBER')}</span>
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span>● Active</span>
                            {p.healthCardPlanName && <span>• {p.healthCardPlanName}</span>}
                          </span>
                        </div>
                      ) : p.isHealthCardExpired ? (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-mono text-xs font-black text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-800 shadow-2xs flex items-center gap-1.5 w-fit">
                            <CreditCard className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{p.healthCardNumber || (p.mrn ? `${p.mrn}-HC` : 'HC MEMBER')}</span>
                          </span>
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <span>⚠️ Expired {p.healthCardValidUntil ? formatDate(p.healthCardValidUntil) : ''}</span>
                          </span>
                        </div>
                      ) : (p.healthCardNumber || hasHealthCardFilter) ? (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-mono text-xs font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-2xs flex items-center gap-1.5 w-fit">
                            <CreditCard className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>{p.healthCardNumber || (p.mrn ? `${p.mrn}-HC` : 'HC MEMBER')}</span>
                          </span>
                          {p.healthCardPlanName && (
                            <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                              {p.healthCardPlanName}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="font-mono text-xs font-black text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 shadow-2xs">
                          {p.mrn || 'NO MRN'}
                        </span>
                      )}
                    </td>

                    {/* Last Visit Date Column */}
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        {p.lastVisitDate ? formatDate(p.lastVisitDate) : (
                          <span className="text-slate-400 font-normal italic">No visits</span>
                        )}
                      </span>
                    </td>

                    {/* Last Visit Tests Column */}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xl">
                        {p.lastVisitTestCodes && p.lastVisitTestCodes.length > 0 ? (
                          p.lastVisitTestCodes.map((code, idx) => (
                            <span 
                              key={idx} 
                              className="px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700 rounded-md text-[10px] font-mono font-semibold"
                            >
                              {code}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No tests ordered</span>
                        )}
                      </div>
                    </td>

                    {/* Operational Actions Column */}
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          const basePath = location.pathname.startsWith('/admin') ? '/admin/patients' : '/patients';
                          navigate(`${basePath}/${p.patientId}${location.search ? location.search : ''}`);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 ml-auto active:scale-95 cursor-pointer"
                      >
                        <span>View File</span>
                        <ArrowRight className="w-3.5 h-3.5" />
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
          <div className="flex items-center justify-between border-t border-slate-300 dark:border-zinc-800 px-6 py-4 bg-slate-50/70 dark:bg-zinc-900/40">
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs font-bold outline-none cursor-pointer text-slate-800 dark:text-zinc-200 shadow-2xs"
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
                className="p-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-extrabold px-3 py-1 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg text-slate-800 dark:text-zinc-200 shadow-2xs">
                Page {page}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={patients.length < limit || loading}
                className="p-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
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
