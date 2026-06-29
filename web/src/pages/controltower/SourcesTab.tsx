// File: web/src/pages/controltower/SourcesTab.tsx
// Redesigned around searchable Patient Intelligence directory.
// Presentation-only: consumes controlTowerRepository layer.

import React, { useEffect, useState } from 'react';
import { 
  fetchPatients, 
  fetchPatientDetails, 
  PatientListItemViewModel, 
  PatientDetailsViewModel 
} from '../../repositories/controlTowerRepository';

const SourcesTab: React.FC = () => {
  const [patients, setPatients] = useState<PatientListItemViewModel[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [details, setDetails] = useState<PatientDetailsViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = (query = '') => {
    setLoading(true);
    fetchPatients(query)
      .then(list => {
        setPatients(list);
        setLoading(false);
        if (list.length > 0) {
          // Select first patient by default if none selected or if previous selected is not in the new list
          const stillExists = list.some(p => p.patientId === selectedPatientId);
          if (!stillExists) {
            handleSelectPatient(list[0].patientId);
          } else if (selectedPatientId) {
            handleSelectPatient(selectedPatientId);
          }
        } else {
          setDetails(null);
          setSelectedPatientId(null);
        }
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load patient intelligence directory.');
        setLoading(false);
      });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPatients(searchQuery);
  };

  const handleSelectPatient = (id: string) => {
    setSelectedPatientId(id);
    setDetailsLoading(true);
    fetchPatientDetails(id)
      .then(data => {
        setDetails(data);
        setDetailsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setDetailsLoading(false);
      });
  };

  if (loading && patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brandPrimary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-textSecondary text-xs mt-3">Syncing patient directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header section with search bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-white">Patient Intelligence</h2>
          <p className="text-xs text-textSecondary mt-0.5">Filter, search, and analyze cohort patient profiles for campaign segmentation</p>
        </div>
        
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 w-full md:w-80">
          <input
            type="text"
            placeholder="Search MRN, Name, Phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-inputBackground border border-cardBorder text-white text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-brandPrimary transition-colors"
          />
          <button type="submit" className="px-4 py-2.5 bg-brandSecondary/25 border border-brandSecondary/30 hover:bg-brandSecondary/40 text-brandPrimary font-bold text-xs rounded-xl transition-all">
            Search
          </button>
        </form>
      </div>

      {error && (
        <div className="p-3 bg-error/15 border border-error/30 text-error text-xs rounded-xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Patient List Directory */}
        <div className="lg:col-span-2 bg-cardBg border border-cardBorder rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-white text-sm font-display">Patient Profiles</h3>
            <span className="text-[10px] text-textSecondary">{patients.length} patients registered</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-cardBorder text-textSecondary font-semibold">
                  <th className="pb-3 pl-2">MRN</th>
                  <th className="pb-3">Patient Name</th>
                  <th className="pb-3">Age/Sex</th>
                  <th className="pb-3">Mobile</th>
                  <th className="pb-3">Referring Source</th>
                  <th className="pb-3">Tests Ordered</th>
                  <th className="pb-3 text-right">Visits</th>
                  <th className="pb-3 text-right">Lifetime Rev</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cardBorder/40 text-slate-300">
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-textMuted text-xs font-display">
                      No patients match the search criteria.
                    </td>
                  </tr>
                ) : (
                  patients.map((p) => (
                    <tr 
                      key={p.patientId} 
                      onClick={() => handleSelectPatient(p.patientId)}
                      className={`hover:bg-background/40 cursor-pointer transition-colors ${selectedPatientId === p.patientId ? 'bg-[#0f1228] border-l-2 border-l-brandPrimary' : ''}`}
                    >
                      <td className="py-3 font-semibold text-white pl-2 font-mono">{p.mrn}</td>
                      <td className="py-3 font-medium text-white">{p.name}</td>
                      <td className="py-3 text-textSecondary">{p.age}y / {p.gender}</td>
                      <td className="py-3 text-textSecondary font-mono">{p.mobileNumber}</td>
                      <td className="py-3 text-textSecondary truncate max-w-[120px]">{p.referringDoctorOrPartner}</td>
                      <td className="py-3 text-textSecondary truncate max-w-[150px]" title={p.testsOrdered}>{p.testsOrdered}</td>
                      <td className="py-3 text-right font-semibold font-mono">{p.totalVisits}</td>
                      <td className="py-3 text-right font-bold text-accentCyan pr-2 font-mono">{p.lifetimeRevenueFormatted}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Detailed Card Profile */}
        <div className="bg-cardBg border border-cardBorder rounded-xl p-6">
          <h3 className="font-bold text-white text-sm font-display mb-4">Patient Intelligence Card</h3>
          
          {detailsLoading ? (
            <div className="flex flex-col items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-accentCyan border-t-transparent rounded-full animate-spin"></div>
              <p className="text-textSecondary text-[10px] mt-2">Loading patient profile...</p>
            </div>
          ) : details ? (
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-bold text-white font-display">{details.name}</h4>
                <p className="text-xs text-textSecondary mt-0.5 font-mono">MRN: {details.mrn}</p>
              </div>

              {/* Personal Details */}
              <div className="bg-background/40 border border-cardBorder/40 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-textSecondary">Age / Gender</span>
                  <span className="font-bold text-white">{details.age} yrs / {details.gender}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-textSecondary">Mobile Number</span>
                  <span className="font-bold text-white font-mono">{details.mobileNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-textSecondary">Referral Source</span>
                  <span className="font-bold text-white">{details.referringDoctorOrPartner}</span>
                </div>
                <div className="flex justify-between items-center border-t border-cardBorder/45 pt-3">
                  <span className="text-textSecondary">Total Visits</span>
                  <span className="font-bold text-white font-mono">{details.totalVisits}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-textSecondary">Lifetime Revenue</span>
                  <span className="font-bold text-accentCyan font-mono">{details.lifetimeRevenueFormatted}</span>
                </div>
              </div>

              {/* Visit Timeline / History */}
              <div className="space-y-3">
                <h5 className="font-bold text-white text-[11px] font-display uppercase tracking-wider">Visit History</h5>
                
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {details.visits.length === 0 ? (
                    <p className="text-[10px] text-textMuted italic">No visit history found.</p>
                  ) : (
                    details.visits.map((v) => (
                      <div key={v.visitId} className="bg-background/30 border border-cardBorder/30 rounded-lg p-3 space-y-2 text-[10px]">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-200">{v.visitDateFormatted}</span>
                          <span className="px-2 py-0.5 bg-cardBorder/40 rounded text-textSecondary font-mono">{v.token}</span>
                        </div>
                        <div className="text-textSecondary">
                          <span className="font-semibold">Tests:</span> {v.tests.join(', ') || '—'}
                        </div>
                        <div className="flex justify-between items-center text-[10px] border-t border-cardBorder/20 pt-1.5">
                          <span className="text-textSecondary">Paid</span>
                          <span className="font-bold text-accentCyan font-mono">{v.amountPaidFormatted}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Demographics Date ranges */}
              <div className="space-y-2 text-[10px] border-t border-cardBorder/40 pt-4">
                <div className="flex justify-between">
                  <span className="text-textSecondary">First Visit Date</span>
                  <span className="font-semibold text-slate-300 font-mono">{details.firstVisitDateFormatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Last Visit Date</span>
                  <span className="font-semibold text-slate-300 font-mono">{details.lastVisitDateFormatted}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-textMuted text-xs py-10 font-display">Select a patient to inspect.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SourcesTab;
