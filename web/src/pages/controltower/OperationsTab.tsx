// File: web/src/pages/controltower/OperationsTab.tsx
// Refactored to consume operations view models from repository.
// Presentation-only: contains no mocks, direct HTTP, or inline calculations.

import React, { useEffect, useState } from 'react';
import { fetchOperations, OperationsViewModel } from '../../repositories/controlTowerRepository';

const OperationsTab: React.FC = () => {
  const [viewModel, setViewModel] = useState<OperationsViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOperations()
      .then(vm => {
        setViewModel(vm);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load operational facts.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-gray-400 text-xs font-display">Loading operations info...</div>;
  }

  if (error || !viewModel) {
    return <div className="text-red-500 text-xs font-display">{error || 'No telemetry data available.'}</div>;
  }

  const { workflow, delivery, health } = viewModel;

  return (
    <div className="space-y-6 animate-fadeIn">
      <h2 className="text-xl font-bold text-white font-display">Operations & TAT Analysis</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workflow TAT Metrics */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg">
          <h3 className="text-sm font-bold text-slate-200 font-display">Average Turnaround Time (TAT)</h3>
          <p className="text-[10px] text-slate-500 mb-4 font-display">Time spent at each processing step (in minutes)</p>

          <div className="space-y-4 text-xs font-mono">
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Registration to Checkout (Billing)</span>
                <span className="font-semibold text-white">{workflow.avgRegistrationToCheckoutMinutes} min</span>
              </div>
              <div className="w-full bg-slate-850 h-2 rounded overflow-hidden">
                <div className="bg-emerald-400 h-full rounded" style={{ width: `${Math.min(100, (workflow.avgRegistrationToCheckoutMinutes / 60) * 100)}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Checkout to Sample Draw</span>
                <span className="font-semibold text-white">{workflow.avgCheckoutToSampleDrawMinutes} min</span>
              </div>
              <div className="w-full bg-slate-850 h-2 rounded overflow-hidden">
                <div className="bg-cyan-400 h-full rounded" style={{ width: `${Math.min(100, (workflow.avgCheckoutToSampleDrawMinutes / 60) * 100)}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Sample Draw to Processing</span>
                <span className="font-semibold text-white">{workflow.avgSampleDrawToProcessingMinutes} min</span>
              </div>
              <div className="w-full bg-slate-850 h-2 rounded overflow-hidden">
                <div className="bg-amber-400 h-full rounded" style={{ width: `${Math.min(100, (workflow.avgSampleDrawToProcessingMinutes / 120) * 100)}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Processing to Report Signoff</span>
                <span className="font-semibold text-white">{workflow.avgProcessingToReportSignedMinutes} min</span>
              </div>
              <div className="w-full bg-slate-850 h-2 rounded overflow-hidden">
                <div className="bg-pink-400 h-full rounded" style={{ width: `${Math.min(100, (workflow.avgProcessingToReportSignedMinutes / 240) * 100)}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Signoff to Report Delivery</span>
                <span className="font-semibold text-white">{workflow.avgReportSignedToReportDeliveredMinutes} min</span>
              </div>
              <div className="w-full bg-slate-850 h-2 rounded overflow-hidden">
                <div className="bg-indigo-400 h-full rounded" style={{ width: `${Math.min(100, (workflow.avgReportSignedToReportDeliveredMinutes / 120) * 100)}%` }}></div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-between items-center font-sans">
              <div>
                <p className="text-xs font-semibold text-slate-300">Overall Average Turnaround Time</p>
                <p className="text-[10px] text-slate-500 font-mono">Based on {workflow.totalCompletedVisitsCount} completed reports</p>
              </div>
              <span className="text-xl font-bold text-cyan-400 font-mono">{workflow.avgOverallTurnaroundTimeMinutes} min</span>
            </div>
          </div>
        </div>

        {/* Delivery Details */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-200 font-display">Report Dispatch & Deliveries</h3>
            <p className="text-[10px] text-slate-500 mb-4 font-display">Fulfillment and delivery speeds</p>

            <div className="grid grid-cols-3 gap-4 mb-6 text-xs font-mono">
              <div className="bg-slate-950 p-4 rounded text-center">
                <span className="text-[9px] text-slate-500 block">Total Requested</span>
                <p className="text-lg font-bold text-white mt-1">{delivery.totalRequested}</p>
              </div>
              <div className="bg-slate-950 p-4 rounded text-center">
                <span className="text-[9px] text-slate-500 block">Total Delivered</span>
                <p className="text-lg font-bold text-emerald-400 mt-1">{delivery.totalDelivered}</p>
              </div>
              <div className="bg-slate-950 p-4 rounded text-center">
                <span className="text-[9px] text-slate-500 block">Total Pending</span>
                <p className="text-lg font-bold text-amber-400 mt-1">{delivery.totalPending}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Average Delivery Time</span>
                <span className="font-semibold text-white">{delivery.avgDeliverySpeedMinutes} min</span>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-xs font-bold text-slate-200 mb-3 font-display">Delivery Channel Mix</h4>
              <div className="space-y-3 text-xs font-mono">
                {delivery.methodsBreakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-slate-400">{item.deliveryMethod}</span>
                    <span className="font-semibold text-white">{item.count} dispatches</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workers / Projection Checkpoints status */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg">
        <h3 className="text-sm font-bold text-slate-200 mb-4 font-display">Projection Daemon Health & Outbox</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-xs font-mono">
          <div className="flex justify-between items-center bg-slate-950 p-3 rounded">
            <span className="text-slate-400">Pending events in outbox</span>
            <span className="font-semibold text-white">{health.pendingOutboxEvents}</span>
          </div>
          <div className="flex justify-between items-center bg-slate-950 p-3 rounded">
            <span className="text-slate-400">Dead-letter queue count</span>
            <span className={`font-semibold ${health.deadLetterEvents > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {health.deadLetterEvents}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                <th className="pb-2">Projection Handler Name</th>
                <th className="pb-2 text-right">Processed Event Sequence</th>
                <th className="pb-2 text-right">Last Sync Timestamp</th>
                <th className="pb-2 text-right">Daemon Health Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300 font-mono">
              {health.workers.map((worker, idx) => (
                <tr key={idx} className="hover:bg-slate-850/20 transition-colors">
                  <td className="py-2.5 font-sans font-semibold text-slate-200">{worker.workerName}</td>
                  <td className="py-2.5 text-right">{worker.lastProcessedSequence}</td>
                  <td className="py-2.5 text-right text-slate-500">{new Date(worker.lastUpdatedAtUtc).toLocaleTimeString()}</td>
                  <td className="py-2.5 text-right font-bold text-emerald-400 pr-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block mr-1.5 animate-pulse"></span>
                    Running
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OperationsTab;
