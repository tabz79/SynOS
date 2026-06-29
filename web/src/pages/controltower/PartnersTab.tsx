// File: web/src/pages/controltower/PartnersTab.tsx
// Redesigned to match the premium 'Mission Control' dark theme with complete Referral Partner Profile details.

import React, { useEffect, useState } from 'react';
import { 
  fetchPartners, 
  fetchPartnerDetails, 
  fetchPatientDetails,
  PartnerViewModel, 
  PartnerDetailsViewModel,
  PatientDetailsViewModel
} from '../../repositories/controlTowerRepository';

const PartnersTab: React.FC = () => {
  const [partners, setPartners] = useState<PartnerViewModel[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [details, setDetails] = useState<PartnerDetailsViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Patient details modal state
  const [selectedPatientDetails, setSelectedPatientDetails] = useState<PatientDetailsViewModel | null>(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = (query = '') => {
    setLoading(true);
    fetchPartners(query)
      .then(list => {
        setPartners(list);
        setLoading(false);
        if (list.length > 0 && !selectedPartnerId) {
          handleSelectPartner(list[0].partnerId);
        }
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load referral partners from repository.');
        setLoading(false);
      });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPartners(searchQuery);
  };

  const handleSelectPartner = (id: string) => {
    setSelectedPartnerId(id);
    setDetailsLoading(true);
    fetchPartnerDetails(id)
      .then(data => {
        setDetails(data);
        setDetailsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setDetailsLoading(false);
      });
  };

  const handleOpenPatientDetails = (patientId: string) => {
    setPatientLoading(true);
    fetchPatientDetails(patientId)
      .then(data => {
        setSelectedPatientDetails(data);
        setPatientLoading(false);
      })
      .catch(err => {
        console.error(err);
        setPatientLoading(false);
      });
  };

  if (loading && partners.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brandPrimary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-textSecondary text-xs mt-3">Syncing partners registry...</p>
      </div>
    );
  }

  // Filter referred patient directory based on query
  const filteredPatients = details?.completePatientDirectory.filter(p => 
    p.patientName.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
    p.mrn.toLowerCase().includes(patientSearchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header section with search bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-white">Referral Partners Registry</h2>
          <p className="text-xs text-textSecondary mt-0.5">Lookup patient referral pipelines, volume statistics, and yield yields</p>
        </div>
        
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 w-full md:w-80">
          <input
            type="text"
            placeholder="Search partners or locations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-inputBackground border border-cardBorder text-white text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-brandPrimary transition-colors"
          />
          <button type="submit" className="px-4 py-2.5 bg-brandSecondary/25 border border-brandSecondary/30 hover:bg-brandSecondary/40 text-brandPrimary font-bold text-xs rounded-xl transition-all">
            Filter
          </button>
        </form>
      </div>

      {error && (
        <div className="p-3 bg-error/15 border border-error/30 text-error text-xs rounded-xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Table List */}
        <div className="lg:col-span-1 bg-cardBg border border-cardBorder rounded-xl p-6 h-fit">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-white text-sm font-display">Active Referrers</h3>
            <span className="text-[10px] text-textSecondary">{partners.length} channels</span>
          </div>

          <div className="overflow-y-auto max-h-[70vh] pr-1 space-y-2">
            {partners.length === 0 ? (
              <p className="text-center text-textMuted text-xs py-10 font-display">
                No referral partners match the search criteria.
              </p>
            ) : (
              partners.map((p) => (
                <div 
                  key={p.partnerId} 
                  onClick={() => handleSelectPartner(p.partnerId)}
                  className={`p-4 border rounded-xl cursor-pointer transition-all ${
                    selectedPartnerId === p.partnerId 
                      ? 'bg-[#0f1228] border-brandPrimary shadow-[0_0_15px_rgba(124,58,237,0.1)]' 
                      : 'bg-background/20 border-cardBorder hover:bg-background/40'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-semibold text-white text-xs">{p.partnerName}</span>
                    <span className="text-[10px] font-bold text-accentCyan font-mono">{p.totalRevenueFormatted}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 text-[10px] text-textSecondary">
                    <span>{p.partnerLocation}</span>
                    <span>{p.totalPatients} patients / {p.totalTests} tests</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Detailed Card */}
        <div className="lg:col-span-2 bg-cardBg border border-cardBorder rounded-xl p-6 min-h-[50vh] max-h-[85vh] overflow-y-auto pr-3">
          <h3 className="font-bold text-white text-sm font-display mb-4">Partner Performance Profile</h3>
          
          {detailsLoading ? (
            <div className="flex flex-col items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-accentCyan border-t-transparent rounded-full animate-spin"></div>
              <p className="text-textSecondary text-[10px] mt-2">Loading details profile...</p>
            </div>
          ) : details ? (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="border-b border-cardBorder/40 pb-4">
                <h4 className="text-base font-bold text-white font-display">{details.summary.partnerName}</h4>
                <p className="text-xs text-textSecondary mt-0.5">{details.summary.partnerLocation}</p>
              </div>

              {/* 1. Overview Grid */}
              <div className="space-y-3">
                <h5 className="font-bold text-white text-[11px] font-display uppercase tracking-wider">Overview Summary</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-background/40 border border-cardBorder/40 rounded-xl p-3">
                    <span className="text-[10px] text-textSecondary block">Total Revenue</span>
                    <span className="font-bold text-accentCyan text-sm font-mono mt-1 block">{details.summary.revenueFormatted}</span>
                  </div>
                  <div className="bg-background/40 border border-cardBorder/40 rounded-xl p-3">
                    <span className="text-[10px] text-textSecondary block">Unique Patients</span>
                    <span className="font-bold text-white text-sm font-mono mt-1 block">{details.summary.totalUniquePatients}</span>
                  </div>
                  <div className="bg-background/40 border border-cardBorder/40 rounded-xl p-3">
                    <span className="text-[10px] text-textSecondary block">Average Bill</span>
                    <span className="font-bold text-brandPrimary text-sm font-mono mt-1 block">{details.summary.averageBillFormatted}</span>
                  </div>
                  <div className="bg-background/40 border border-cardBorder/40 rounded-xl p-3">
                    <span className="text-[10px] text-textSecondary block">Days Since Referral</span>
                    <span className="font-bold text-white text-sm font-mono mt-1 block">{details.summary.daysSinceLastReferral ?? '—'}</span>
                  </div>
                  <div className="bg-background/40 border border-cardBorder/40 rounded-xl p-3">
                    <span className="text-[10px] text-textSecondary block">Repeat Patients</span>
                    <span className="font-bold text-white text-xs font-mono mt-1 block">{details.summary.repeatPatients}</span>
                  </div>
                  <div className="bg-background/40 border border-cardBorder/40 rounded-xl p-3">
                    <span className="text-[10px] text-textSecondary block">First-Time Patients</span>
                    <span className="font-bold text-white text-xs font-mono mt-1 block">{details.summary.firstTimePatients}</span>
                  </div>
                  <div className="bg-background/40 border border-cardBorder/40 rounded-xl p-3">
                    <span className="text-[10px] text-textSecondary block">Active Intake (90D)</span>
                    <span className="font-bold text-emerald-400 text-xs font-mono mt-1 block">{details.summary.activePatientsLast90Days}</span>
                  </div>
                  <div className="bg-background/40 border border-cardBorder/40 rounded-xl p-3">
                    <span className="text-[10px] text-textSecondary block">Re-referral Rate</span>
                    <span className="font-bold text-slate-300 text-xs font-mono mt-1 block">{details.summary.averageDaysBetweenReferrals}d avg</span>
                  </div>
                </div>

                <div className="bg-[#13162b]/40 border border-cardBorder/30 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-textSecondary block">Highest Value Patient</span>
                    <span className="font-bold text-white mt-1 block">{details.summary.highestValuePatientName}</span>
                    <span className="text-[10px] text-accentCyan font-mono">{details.summary.highestValuePatientRevenueFormatted} LFT</span>
                  </div>
                  <div>
                    <span className="text-textSecondary block">Most Recent Referral</span>
                    <span className="font-bold text-white mt-1 block">{details.summary.mostRecentPatientName}</span>
                    <span className="text-[10px] text-textSecondary font-mono">{details.summary.mostRecentPatientDateFormatted}</span>
                  </div>
                </div>
              </div>

              {/* 2. Trends */}
              <div className="space-y-3">
                <h5 className="font-bold text-white text-[11px] font-display uppercase tracking-wider">Revenue & Patient Trends</h5>
                <div className="bg-background/40 border border-cardBorder/40 rounded-xl p-4 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[10px] text-slate-300">
                    <thead>
                      <tr className="border-b border-cardBorder/30 text-textSecondary font-semibold">
                        <th className="pb-2">Month</th>
                        <th className="pb-2 text-right">Revenue</th>
                        <th className="pb-2 text-right">Patients</th>
                        <th className="pb-2 text-right">Avg Bill</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cardBorder/20">
                      {details.monthlyRevenueTrend.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-3 text-center text-textMuted italic">No monthly trend data.</td>
                        </tr>
                      ) : (
                        details.monthlyRevenueTrend.map((rev) => {
                          const pts = details.monthlyPatientTrend.find(p => p.month === rev.month)?.value ?? 0;
                          const avg = details.averageBillTrend.find(a => a.month === rev.month)?.valueFormatted ?? '—';
                          return (
                            <tr key={rev.month}>
                              <td className="py-2 font-semibold font-mono">{rev.month}</td>
                              <td className="py-2 text-right text-accentCyan font-mono">{rev.valueFormatted}</td>
                              <td className="py-2 text-right font-mono">{pts}</td>
                              <td className="py-2 text-right text-brandPrimary font-mono">{avg}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Demographics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Age Distribution */}
                <div className="space-y-3">
                  <h5 className="font-bold text-white text-[11px] font-display uppercase tracking-wider">Age Distribution</h5>
                  <div className="bg-background/40 border border-cardBorder/40 rounded-xl p-4 space-y-2 text-xs">
                    {Object.entries(details.ageDistribution).map(([bucket, count]) => {
                      const max = Math.max(...Object.values(details.ageDistribution)) || 1;
                      const widthPercent = (count / max) * 100;
                      return (
                        <div key={bucket} className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-textSecondary">{bucket} years</span>
                            <span className="font-bold text-white">{count}</span>
                          </div>
                          <div className="w-full bg-cardBorder/30 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-brandPrimary h-full rounded-full" style={{ width: `${widthPercent}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Gender Split */}
                <div className="space-y-3">
                  <h5 className="font-bold text-white text-[11px] font-display uppercase tracking-wider">Gender Split</h5>
                  <div className="bg-background/40 border border-cardBorder/40 rounded-xl p-4 space-y-2 text-xs">
                    {Object.entries(details.genderDistribution).map(([gender, count]) => {
                      const total = Object.values(details.genderDistribution).reduce((sum, c) => sum + c, 0) || 1;
                      const percent = Math.round((count / total) * 100);
                      return (
                        <div key={gender} className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-textSecondary">{gender}</span>
                            <span className="font-bold text-white">{count} ({percent}%)</span>
                          </div>
                          <div className="w-full bg-cardBorder/30 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-accentCyan h-full rounded-full" style={{ width: `${percent}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                    {Object.keys(details.genderDistribution).length === 0 && (
                      <p className="text-[10px] text-textMuted italic py-4 text-center">No gender demographics.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Test Intelligence */}
              <div className="space-y-3">
                <h5 className="font-bold text-white text-[11px] font-display uppercase tracking-wider">Test Frequency Distribution</h5>
                <div className="bg-background/40 border border-cardBorder/40 rounded-xl p-4 text-xs space-y-3">
                  {details.topTests.length === 0 ? (
                    <p className="text-textMuted italic text-center py-4">No test referral frequency recorded.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {details.topTests.slice(0, 10).map((t, idx) => (
                        <div key={t.testCode} className="bg-background/50 border border-cardBorder/20 rounded-lg p-2 text-center">
                          <span className="text-[10px] text-textSecondary font-mono block">#{idx + 1} {t.testCode}</span>
                          <span className="font-bold text-white text-xs font-mono mt-1 block">{t.count} referrals</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Patient Directory */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <h5 className="font-bold text-white text-[11px] font-display uppercase tracking-wider">Referred Patient Directory</h5>
                  <input
                    type="text"
                    placeholder="Search patients..."
                    value={patientSearchQuery}
                    onChange={e => setPatientSearchQuery(e.target.value)}
                    className="bg-inputBackground border border-cardBorder text-white text-[10px] rounded-lg px-3 py-1.5 w-full sm:w-48 focus:outline-none focus:border-brandPrimary transition-colors"
                  />
                </div>
                
                <div className="bg-background/40 border border-cardBorder/40 rounded-xl p-4 overflow-x-auto max-h-[40vh]">
                  <table className="w-full text-left border-collapse text-[10px] text-slate-300">
                    <thead>
                      <tr className="border-b border-cardBorder/30 text-textSecondary font-semibold">
                        <th className="pb-2">MRN</th>
                        <th className="pb-2">Patient Name</th>
                        <th className="pb-2">Age/Sex</th>
                        <th className="pb-2">Phone</th>
                        <th className="pb-2 text-right">Visits</th>
                        <th className="pb-2 text-right">Total Paid</th>
                        <th className="pb-2">Last Visit</th>
                        <th className="pb-2">Tests Ordered</th>
                        <th className="pb-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cardBorder/25">
                      {filteredPatients.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-4 text-center text-textMuted italic">No referred patients found.</td>
                        </tr>
                      ) : (
                        filteredPatients.map(p => (
                          <tr key={p.patientId} className="hover:bg-background/30">
                            <td className="py-2 font-mono font-semibold text-white">{p.mrn}</td>
                            <td className="py-2 font-semibold">{p.patientName}</td>
                            <td className="py-2">{p.age} / {p.gender}</td>
                            <td className="py-2 font-mono text-textSecondary">{p.mobileNumber}</td>
                            <td className="py-2 text-right font-mono">{p.totalVisits}</td>
                            <td className="py-2 text-right text-accentCyan font-mono">{p.lifetimeRevenueFormatted}</td>
                            <td className="py-2 font-mono">{p.lastVisitFormatted}</td>
                            <td className="py-2 text-textSecondary max-w-xs truncate" title={p.lastTestsOrdered}>{p.lastTestsOrdered || '—'}</td>
                            <td className="py-2 text-center">
                              <button 
                                onClick={() => handleOpenPatientDetails(p.patientId)}
                                className="px-2 py-0.5 bg-brandSecondary/25 border border-brandSecondary/30 hover:bg-brandSecondary/40 text-brandPrimary font-bold text-[9px] rounded"
                              >
                                View Profile
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 6. Recent Activity Timeline */}
              <div className="space-y-3">
                <h5 className="font-bold text-white text-[11px] font-display uppercase tracking-wider">Recent Referral Activity Timeline</h5>
                <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                  {details.recentPatientTimeline.length === 0 ? (
                    <p className="text-[10px] text-textMuted italic">No recent referral timeline recorded.</p>
                  ) : (
                    details.recentPatientTimeline.map((item, idx) => (
                      <div key={idx} className="bg-background/30 border border-cardBorder/30 rounded-lg p-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-[10px]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200">{item.patientName}</span>
                            <span className="text-[9px] text-textSecondary font-mono">{item.visitDateFormatted}</span>
                          </div>
                          <div className="text-textSecondary mt-1">
                            <span className="font-semibold">Tests ordered:</span> {item.testsOrdered.join(', ') || '—'}
                          </div>
                        </div>
                        <div className="text-right flex sm:flex-col justify-between items-center sm:items-end">
                          <span className="text-[9px] text-textSecondary sm:hidden">Paid:</span>
                          <span className="font-bold text-accentCyan font-mono">{item.amountPaidFormatted}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-textMuted text-xs py-10 font-display">Select a referral partner to inspect.</p>
          )}
        </div>
      </div>

      {/* Patient Details Modal */}
      {selectedPatientDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-cardBg border border-cardBorder rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button 
              onClick={() => setSelectedPatientDetails(null)}
              className="absolute top-4 right-4 text-textSecondary hover:text-white text-base"
            >
              ✕
            </button>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-bold text-white font-display">{selectedPatientDetails.name}</h4>
                <p className="text-xs text-textSecondary mt-0.5 font-mono">MRN: {selectedPatientDetails.mrn}</p>
              </div>

              {/* Personal Details */}
              <div className="bg-background/40 border border-cardBorder/40 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-textSecondary">Age / Gender</span>
                  <span className="font-bold text-white">{selectedPatientDetails.age} yrs / {selectedPatientDetails.gender}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-textSecondary">Mobile Number</span>
                  <span className="font-bold text-white font-mono">{selectedPatientDetails.mobileNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-textSecondary">Referral Source</span>
                  <span className="font-bold text-white">{selectedPatientDetails.referringDoctorOrPartner}</span>
                </div>
                <div className="flex justify-between items-center border-t border-cardBorder/45 pt-3">
                  <span className="text-textSecondary">Total Visits</span>
                  <span className="font-bold text-white font-mono">{selectedPatientDetails.totalVisits}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-textSecondary">Lifetime Revenue</span>
                  <span className="font-bold text-accentCyan font-mono">{selectedPatientDetails.lifetimeRevenueFormatted}</span>
                </div>
              </div>

              {/* Visit Timeline / History */}
              <div className="space-y-3">
                <h5 className="font-bold text-white text-[11px] font-display uppercase tracking-wider">Visit History</h5>
                
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {selectedPatientDetails.visits.length === 0 ? (
                    <p className="text-[10px] text-textMuted italic">No visit history found.</p>
                  ) : (
                    selectedPatientDetails.visits.map((v) => (
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

              {/* Dates */}
              <div className="space-y-2 text-[10px] border-t border-cardBorder/40 pt-4">
                <div className="flex justify-between">
                  <span className="text-textSecondary">First Visit Date</span>
                  <span className="font-semibold text-slate-300 font-mono">{selectedPatientDetails.firstVisitDateFormatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Last Visit Date</span>
                  <span className="font-semibold text-slate-300 font-mono">{selectedPatientDetails.lastVisitDateFormatted}</span>
                </div>
              </div>
              
              <div className="text-right pt-2">
                <button 
                  onClick={() => setSelectedPatientDetails(null)}
                  className="px-4 py-2 bg-brandSecondary/25 border border-brandSecondary/30 hover:bg-brandSecondary/40 text-brandPrimary font-bold text-xs rounded-xl transition-all"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay for patient details */}
      {patientLoading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50">
          <div className="bg-cardBg p-4 border border-cardBorder rounded-xl flex items-center space-x-3 text-xs text-white">
            <div className="w-4 h-4 border-2 border-accentCyan border-t-transparent rounded-full animate-spin"></div>
            <span>Syncing patient profile context...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnersTab;
