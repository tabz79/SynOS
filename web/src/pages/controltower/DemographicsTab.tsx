// File: web/src/pages/controltower/DemographicsTab.tsx
// Redesigned to match the premium 'Mission Control' dark theme (Demographics Tab)
// Presentation-only: consumes the repository layer and contains no business logic.

import React, { useEffect, useState } from 'react';
import { fetchDemographics, DemographicsViewModel } from '../../repositories/controlTowerRepository';

const DemographicsTab: React.FC = () => {
  const [viewModel, setViewModel] = useState<DemographicsViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDemographics()
      .then(vm => {
        setViewModel(vm);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to fetch patient cohort demographics from repository.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brandPrimary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-textSecondary text-xs mt-3">Syncing demographics indices...</p>
      </div>
    );
  }

  if (error || !viewModel) {
    return (
      <div className="p-6 bg-error/10 border border-error/25 text-error rounded-xl text-center">
        {error || 'No demographics available.'}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold font-display text-white">Patient Cohorts & Demographics</h2>
        <p className="text-xs text-textSecondary mt-0.5">Diagnose distribution criteria by Age brackets, Biological gender, and Geo-coordinates</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Side: Age Groups */}
        <div className="bg-cardBg border border-cardBorder rounded-xl p-6">
          <h3 className="font-bold text-white text-sm font-display mb-4">Intake by Age Bracket</h3>
          
          <div className="space-y-4">
            {viewModel.ageGroups.length === 0 ? (
              <div className="py-8 text-center text-textMuted text-xs">No age group distribution records found.</div>
            ) : (
              viewModel.ageGroups.map((g, idx) => (
                <div key={idx} className="bg-background/40 border border-cardBorder/40 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-white font-display">Age Group: {g.ageGroup}</span>
                    <span className="text-accentCyan font-bold">{g.patientCount} Patients</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-[#1e264d] h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-brandSecondary to-brandPrimary h-full rounded-full" style={{ width: g.percentWidth }}></div>
                  </div>
                  
                  <div className="flex justify-between items-center text-[10px] text-textSecondary pt-1">
                    <span>Tests Run: <span className="font-bold text-white font-mono">{g.testCount}</span></span>
                    <span>Billing Ingested: <span className="font-bold text-accentMagenta font-mono">{g.revenueFormatted}</span></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Gender Breakdown */}
        <div className="bg-cardBg border border-cardBorder rounded-xl p-6">
          <h3 className="font-bold text-white text-sm font-display mb-4">Biological Sex Split</h3>
          
          <div className="space-y-4">
            {viewModel.genders.length === 0 ? (
              <div className="py-8 text-center text-textMuted text-xs">No gender split metrics found.</div>
            ) : (
              viewModel.genders.map((g, idx) => (
                <div key={idx} className="bg-background/40 border border-cardBorder/40 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-white font-display">Sex: {g.gender}</span>
                    <span className="text-accentCyan font-bold">{g.patientCount} Patients</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-[#1e264d] h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${g.isFemale ? 'from-accentMagenta/80 to-accentMagenta' : 'from-accentBlue/80 to-accentBlue'}`} style={{ width: g.percentWidth }}></div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-textSecondary pt-1">
                    <span>Tests Run: <span className="font-bold text-white font-mono">{g.testCount}</span></span>
                    <span>Billing Ingested: <span className="font-bold text-accentMagenta font-mono">{g.revenueFormatted}</span></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Locations table */}
      <div className="bg-cardBg border border-cardBorder rounded-xl p-6">
        <h3 className="font-bold text-white text-sm font-display mb-4">Geographical Area Distribution</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-cardBorder text-textSecondary font-semibold">
                <th className="pb-3">Area / Sector Name</th>
                <th className="pb-3 text-right">Registered Patients</th>
                <th className="pb-3 text-right">Tests Run</th>
                <th className="pb-3 text-right">Billing Yield</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cardBorder/40 text-slate-300">
              {viewModel.locations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-textMuted">No geographical area statistics found.</td>
                </tr>
              ) : (
                viewModel.locations.map((l, idx) => (
                  <tr key={idx} className="hover:bg-background/40 transition-colors">
                    <td className="py-3 font-semibold text-white pl-2 flex items-center">
                      <span className="text-sm mr-2">📍</span>
                      {l.location}
                    </td>
                    <td className="py-3 text-right font-semibold">{l.patientCount}</td>
                    <td className="py-3 text-right text-textSecondary">{l.testCount}</td>
                    <td className="py-3 text-right font-bold text-accentTeal pr-2">{l.revenueFormatted}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DemographicsTab;
