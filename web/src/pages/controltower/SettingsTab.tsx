// File: web/src/pages/controltower/SettingsTab.tsx
// Refactored to consume settings view models from repository.
// Presentation-only: contains no mocks, direct HTTP, or inline calculations.

import React, { useEffect, useState } from 'react';
import { fetchSettings, SettingsViewModel } from '../../repositories/controlTowerRepository';

const SettingsTab: React.FC = () => {
  const [viewModel, setViewModel] = useState<SettingsViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings()
      .then(vm => {
        setViewModel(vm);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load Settings.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-gray-400 text-xs font-display">Loading settings...</div>;
  }

  if (error || !viewModel) {
    return <div className="text-red-500 text-xs font-display">{error || 'No data found.'}</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <h2 className="text-xl font-bold text-white font-display">System Settings & Connection</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Connection status */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg">
          <h3 className="text-sm font-bold text-slate-200 mb-4 font-display">Middleware Connection Status</h3>
          <div className="space-y-4 text-xs font-mono">
            <div className="flex justify-between items-center bg-slate-950 p-3 rounded">
              <span className="text-slate-400">API Endpoint Status</span>
              <span className="text-emerald-400 font-semibold flex items-center">
                <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full mr-2"></span> Connected
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-950 p-3 rounded">
              <span className="text-slate-400">Active Lab Instance</span>
              <span className="text-white font-semibold">{viewModel.labId}</span>
            </div>

            <div className="flex justify-between items-center bg-slate-950 p-3 rounded">
              <span className="text-slate-400">Time Range Selection</span>
              <span className="text-white font-semibold">{viewModel.timeRange}</span>
            </div>

            <div className="flex justify-between items-center bg-slate-950 p-3 rounded">
              <span className="text-slate-400">Context Schema Version</span>
              <span className="text-white font-semibold">{viewModel.schemaVersion}</span>
            </div>
          </div>
        </div>

        {/* Projection health summary */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg">
          <h3 className="text-sm font-bold text-slate-200 mb-4 font-display">Projection Engine Health</h3>
          <div className="space-y-4 text-xs font-mono">
            <div className="flex justify-between items-center bg-slate-950 p-3 rounded">
              <span className="text-slate-400">Projection Status</span>
              <span className={`font-semibold ${viewModel.projectionStatus === 'Up-to-date' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {viewModel.projectionStatus}
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-950 p-3 rounded">
              <span className="text-slate-400">Last Projection Advance</span>
              <span className="text-white font-semibold">
                {viewModel.lastProjectionAt ? new Date(viewModel.lastProjectionAt).toLocaleString() : 'N/A'}
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-950 p-3 rounded">
              <span className="text-slate-400">Settings Last Refreshed</span>
              <span className="text-white font-semibold">
                {new Date(viewModel.generatedAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
