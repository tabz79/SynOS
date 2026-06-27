// File: web/src/pages/controltower/PartnersTab.tsx
// Redesigned to match the premium 'Mission Control' dark theme.
// Presentation-only: consumes the repository layer and contains no business logic.

import React, { useEffect, useState } from 'react';
import { 
  fetchPartners, 
  fetchPartnerDetails, 
  PartnerViewModel, 
  PartnerDetailsViewModel 
} from '../../repositories/controlTowerRepository';

const PartnersTab: React.FC = () => {
  const [partners, setPartners] = useState<PartnerViewModel[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [details, setDetails] = useState<PartnerDetailsViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  if (loading && partners.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brandPrimary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-textSecondary text-xs mt-3">Syncing partners registry...</p>
      </div>
    );
  }

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
        <div className="lg:col-span-2 bg-cardBg border border-cardBorder rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-white text-sm font-display">Active Referrers</h3>
            <span className="text-[10px] text-textSecondary">{partners.length} channels loaded</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-cardBorder text-textSecondary font-semibold">
                  <th className="pb-3">Partner Name</th>
                  <th className="pb-3">Location</th>
                  <th className="pb-3 text-right">Patients</th>
                  <th className="pb-3 text-right">Tests</th>
                  <th className="pb-3 text-right">Revenue Yield</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cardBorder/40 text-slate-300">
                {partners.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-textMuted text-xs font-display">
                      No referral partners match the search criteria.
                    </td>
                  </tr>
                ) : (
                  partners.map((p, idx) => (
                    <tr 
                      key={p.partnerId} 
                      onClick={() => handleSelectPartner(p.partnerId)}
                      className={`hover:bg-background/40 cursor-pointer transition-colors ${selectedPartnerId === p.partnerId ? 'bg-[#0f1228] border-l-2 border-l-brandPrimary' : ''}`}
                    >
                      <td className="py-3 font-semibold text-white pl-2 flex items-center">
                        <span className="w-4 h-4 rounded bg-cardBorder/40 text-textSecondary flex items-center justify-center text-[9px] font-bold mr-2">
                          {idx + 1}
                        </span>
                        {p.partnerName}
                      </td>
                      <td className="py-3 text-textSecondary">{p.partnerLocation}</td>
                      <td className="py-3 text-right font-semibold">{p.totalPatients}</td>
                      <td className="py-3 text-right text-textSecondary">{p.totalTests}</td>
                      <td className="py-3 text-right font-bold text-accentCyan pr-2">{p.totalRevenueFormatted}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Detailed Card */}
        <div className="bg-cardBg border border-cardBorder rounded-xl p-6">
          <h3 className="font-bold text-white text-sm font-display mb-4">Partner Performance Profile</h3>
          
          {detailsLoading ? (
            <div className="flex flex-col items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-accentCyan border-t-transparent rounded-full animate-spin"></div>
              <p className="text-textSecondary text-[10px] mt-2">Loading details profile...</p>
            </div>
          ) : details ? (
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-bold text-white font-display">{details.partnerName}</h4>
                <p className="text-xs text-textSecondary mt-0.5">{details.partnerLocation}</p>
              </div>

              <div className="bg-background/40 border border-cardBorder/40 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-textSecondary">Total Patients Intake</span>
                  <span className="font-bold text-white font-mono">{details.totalPatients}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-textSecondary">Test volume ordered</span>
                  <span className="font-bold text-white font-mono">{details.totalTests}</span>
                </div>
                <div className="flex justify-between items-center border-t border-cardBorder/45 pt-3">
                  <span className="text-textSecondary">Consolidated Revenue</span>
                  <span className="font-bold text-accentCyan font-mono">{details.totalRevenueFormatted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-textSecondary">Average Yield / Case</span>
                  <span className="font-bold text-brandPrimary font-mono">{details.avgYieldFormatted}</span>
                </div>
              </div>

              <div className="space-y-3 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-textSecondary">Acquisition Date</span>
                  <span className="font-bold text-white">{details.firstReferralDateFormatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Latest Sync Date</span>
                  <span className="font-bold text-white">{details.latestReferralDateFormatted}</span>
                </div>
              </div>

              <div className="p-3 bg-brandPrimary/10 border border-brandPrimary/20 rounded-lg text-[10px] text-textSecondary">
                <p className="font-bold text-white mb-1">🔍 Verification Check</p>
                All data points are compiled directly from database transactions. This profile is locked for modifications.
              </div>
            </div>
          ) : (
            <p className="text-center text-textMuted text-xs py-10 font-display">Select a referral partner to inspect.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartnersTab;
