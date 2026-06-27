// File: web/src/pages/controltower/SourcesTab.tsx
// Redesigned to match the premium 'Mission Control' dark theme (Customers Tab)
// Presentation-only: consumes repository layer to eliminate calculations and direct HTTP.

import React, { useEffect, useState } from 'react';
import { 
  fetchCustomers, 
  fetchCustomerDetails, 
  CustomerChannelViewModel, 
  CustomerChannelDetailsViewModel 
} from '../../repositories/controlTowerRepository';

const SourcesTab: React.FC = () => {
  const [sources, setSources] = useState<CustomerChannelViewModel[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [details, setDetails] = useState<CustomerChannelDetailsViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = (query = '') => {
    setLoading(true);
    fetchCustomers(query)
      .then(list => {
        setSources(list);
        setLoading(false);
        if (list.length > 0 && !selectedSourceId) {
          handleSelectSource(list[0].sourceId);
        }
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load customer business sources.');
        setLoading(false);
      });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadSources(searchQuery);
  };

  const handleSelectSource = (id: string) => {
    setSelectedSourceId(id);
    setDetailsLoading(true);
    fetchCustomerDetails(id)
      .then(data => {
        setDetails(data);
        setDetailsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setDetailsLoading(false);
      });
  };

  if (loading && sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brandPrimary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-textSecondary text-xs mt-3">Syncing customer channels...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header section with search bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-white">Customer Channels & Sources</h2>
          <p className="text-xs text-textSecondary mt-0.5">Analyze acquisition platforms, referral triggers, and patient cohort distribution</p>
        </div>
        
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 w-full md:w-80">
          <input
            type="text"
            placeholder="Search channels..."
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
            <h3 className="font-bold text-white text-sm font-display">Acquisition Channels</h3>
            <span className="text-[10px] text-textSecondary">{sources.length} sources registered</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-cardBorder text-textSecondary font-semibold">
                  <th className="pb-3">Source / Channel</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Cohort Type</th>
                  <th className="pb-3 text-right">Patients</th>
                  <th className="pb-3 text-right">Billing Yield</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cardBorder/40 text-slate-300">
                {sources.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-textMuted text-xs font-display">
                      No customer sources match the search criteria.
                    </td>
                  </tr>
                ) : (
                  sources.map((s, idx) => (
                    <tr 
                      key={s.sourceId} 
                      onClick={() => handleSelectSource(s.sourceId)}
                      className={`hover:bg-background/40 cursor-pointer transition-colors ${selectedSourceId === s.sourceId ? 'bg-[#0f1228] border-l-2 border-l-brandPrimary' : ''}`}
                    >
                      <td className="py-3 font-semibold text-white pl-2 flex items-center">
                        <span className="w-4 h-4 rounded bg-cardBorder/40 text-textSecondary flex items-center justify-center text-[9px] font-bold mr-2">
                          {idx + 1}
                        </span>
                        {s.sourceName}
                      </td>
                      <td className="py-3 text-textSecondary">{s.sourceType}</td>
                      <td className="py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          s.isFirstVisit 
                            ? 'text-success bg-success/10 border-success/20' 
                            : 'text-accentCyan bg-accentCyan/10 border-accentCyan/20'
                        }`}>
                          {s.cohortTypeFormatted}
                        </span>
                      </td>
                      <td className="py-3 text-right font-semibold">{s.totalPatients}</td>
                      <td className="py-3 text-right font-bold text-accentCyan pr-2">{s.totalRevenueFormatted}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Detailed Card */}
        <div className="bg-cardBg border border-cardBorder rounded-xl p-6">
          <h3 className="font-bold text-white text-sm font-display mb-4">Acquisition Analytics</h3>
          
          {detailsLoading ? (
            <div className="flex flex-col items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-accentCyan border-t-transparent rounded-full animate-spin"></div>
              <p className="text-textSecondary text-[10px] mt-2">Loading details profile...</p>
            </div>
          ) : details ? (
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-bold text-white font-display">{details.sourceName}</h4>
                <p className="text-xs text-textSecondary mt-0.5">Platform: {details.sourceType}</p>
              </div>

              <div className="bg-background/40 border border-cardBorder/40 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-textSecondary">Target Cohort</span>
                  <span className="font-bold text-white">{details.cohortTypeFormatted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-textSecondary">Total Patients Yield</span>
                  <span className="font-bold text-white font-mono">{details.totalPatients}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-textSecondary">Total Tests Ordered</span>
                  <span className="font-bold text-white font-mono">{details.totalTests}</span>
                </div>
                <div className="flex justify-between items-center border-t border-cardBorder/45 pt-3">
                  <span className="text-textSecondary">Total Billing Generated</span>
                  <span className="font-bold text-accentCyan font-mono">{details.totalRevenueFormatted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-textSecondary">Average Ticket Size</span>
                  <span className="font-bold text-brandPrimary font-mono">{details.avgYieldFormatted}</span>
                </div>
              </div>

              <div className="space-y-3 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-textSecondary">First Event Ingestion</span>
                  <span className="font-bold text-white">{details.firstReferralDateFormatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Latest Transaction Date</span>
                  <span className="font-bold text-white">{details.latestReferralDateFormatted}</span>
                </div>
              </div>

              <div className="p-3 bg-brandPrimary/10 border border-brandPrimary/20 rounded-lg text-[10px] text-textSecondary">
                <p className="font-bold text-white mb-1">🛡️ Platform Audit Integrity</p>
                Metrics are extracted automatically by Kestrel Projection Engines. No direct writes allowed.
              </div>
            </div>
          ) : (
            <p className="text-center text-textMuted text-xs py-10 font-display">Select a channel to inspect.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SourcesTab;
