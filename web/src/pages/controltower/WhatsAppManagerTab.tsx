// File: web/src/pages/controltower/WhatsAppManagerTab.tsx
// Author: Gemini
// Date: 2026-06-27
// Presentation-only: monitoring hub with zero mock datasets, composer inputs, or write actions.

import React, { useEffect, useState } from 'react';
import { 
  fetchWhatsAppSummary, 
  fetchWhatsAppLogs, 
  fetchWhatsAppTemplates, 
  WhatsAppSummaryViewModel, 
  WhatsAppLogItem, 
  WhatsAppTemplate 
} from '../../repositories/controlTowerRepository';
import { formatPercentage } from '../../services/formattingUtils';

const WhatsAppManagerTab: React.FC = () => {
  const [summary, setSummary] = useState<WhatsAppSummaryViewModel | null>(null);
  const [logs, setLogs] = useState<WhatsAppLogItem[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchWhatsAppSummary(),
      fetchWhatsAppLogs(),
      fetchWhatsAppTemplates()
    ])
      .then(([s, l, t]) => {
        setSummary(s);
        setLogs(l);
        setTemplates(t);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to fetch WhatsApp monitoring telemetry. Ensure backend is running.');
        setLoading(false);
      });
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered': 
      case 'Sent': 
        return 'text-success bg-success/10 border-success/20';
      case 'Pending': 
        return 'text-accentBlue bg-accentBlue/10 border-accentBlue/20';
      case 'Failed': 
        return 'text-error bg-error/10 border-error/20';
      default: 
        return 'text-textSecondary bg-[#0c0f20] border-cardBorder';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-brandPrimary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-textSecondary text-sm mt-4 font-display">Syncing with WhatsApp Gateway telemetry...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-6 bg-error/10 border border-error/25 text-error rounded-xl text-center">
        <p className="font-semibold">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-error text-white font-semibold text-xs rounded-lg hover:bg-error/85 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const deliveryRate = summary.totalQueue > 0 
    ? (summary.deliveredCount / summary.totalQueue) * 100 
    : 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div>
        <h2 className="text-xl font-bold font-display text-white">WhatsApp Monitoring Hub</h2>
        <p className="text-xs text-textSecondary mt-1">Read-only connection status and transmission queue verification</p>
      </div>

      {/* Main Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Connection Info & Delivery Stats */}
        <div className="bg-cardBg border border-cardBorder rounded-xl p-6 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-white text-sm font-display">Gateway Status</h3>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                summary.connectionStatus === 'Connected' 
                  ? 'bg-success/10 text-success border border-success/20 animate-pulse' 
                  : 'bg-[#1b1c30] text-textSecondary border border-cardBorder'
              }`}>
                {summary.connectionStatus}
              </span>
            </div>

            {/* Circular Gauge */}
            {summary.connectionStatus === 'Connected' ? (
              <div className="flex justify-center my-6 relative">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle cx="80" cy="80" r="68" stroke="#1e264d" strokeWidth="12" fill="transparent" />
                  <circle 
                    cx="80" 
                    cy="80" 
                    r="68" 
                    stroke="#8a2be2" 
                    strokeWidth="12" 
                    fill="transparent" 
                    strokeDasharray={427} 
                    strokeDashoffset={427 * (1 - (deliveryRate / 100))} 
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-white font-display">
                    {summary.deliveredCount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-textSecondary uppercase tracking-widest font-semibold mt-1">Delivered</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center bg-[#07080e] rounded-lg border border-cardBorder/40">
                <span className="text-2xl">⚠️</span>
                <p className="text-xs font-semibold text-white mt-2">Integration Inactive</p>
                <p className="text-[10px] text-textSecondary mt-1 px-4">No active integration configured on the backend.</p>
              </div>
            )}

            <div className="space-y-3 mt-6 text-[11px]">
              <div className="flex justify-between items-center border-b border-cardBorder/40 pb-2">
                <span className="text-textSecondary">Connected Account</span>
                <span className="font-bold text-white">{summary.businessAccount}</span>
              </div>
              <div className="flex justify-between items-center border-b border-cardBorder/40 pb-2">
                <span className="text-textSecondary">Pipeline Delivery Success</span>
                <span className="font-bold text-white">{formatPercentage(deliveryRate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column: Queue Status & Read-only templates */}
        <div className="bg-cardBg border border-cardBorder rounded-xl p-6 flex flex-col justify-between space-y-6">
          <div>
            <h3 className="font-bold text-white text-sm font-display mb-4">Transmission Queue</h3>
            <div className="grid grid-cols-3 gap-3 text-center mb-6">
              <div className="bg-[#0b0c16] border border-cardBorder rounded-lg p-3">
                <span className="text-[9px] text-textSecondary uppercase block font-bold">Sent</span>
                <span className="text-lg font-bold text-white mt-1 block font-mono">
                  {summary.sentCount.toLocaleString()}
                </span>
              </div>
              <div className="bg-[#0b0c16] border border-cardBorder rounded-lg p-3">
                <span className="text-[9px] text-textSecondary uppercase block font-bold">Pending</span>
                <span className="text-lg font-bold text-accentBlue mt-1 block font-mono">
                  {summary.pendingCount.toLocaleString()}
                </span>
              </div>
              <div className="bg-[#0b0c16] border border-cardBorder rounded-lg p-3">
                <span className="text-[9px] text-textSecondary uppercase block font-bold">Failed</span>
                <span className="text-lg font-bold text-error mt-1 block font-mono">
                  {summary.failedCount.toLocaleString()}
                </span>
              </div>
            </div>

            <h3 className="font-bold text-white text-sm font-display mb-3">Registered Message Templates</h3>
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {templates.map((tpl, i) => (
                <div key={i} className="bg-[#07080e] border border-cardBorder rounded-lg p-3 text-[10px]">
                  <p className="font-bold text-brandPrimary font-mono mb-1">{tpl.name}</p>
                  <p className="text-textSecondary leading-relaxed font-sans">{tpl.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Logs */}
        <div className="bg-cardBg border border-cardBorder rounded-xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-bold text-white text-sm font-display mb-4">Live Dispatch Log</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <p className="text-center text-textMuted text-xs py-10 font-display">No message logs logged yet.</p>
              ) : (
                logs.map((log) => (
                  <div 
                    key={log.id} 
                    className="p-3 bg-[#07080e] border border-cardBorder rounded-lg flex flex-col justify-between space-y-2 hover:border-brandPrimary/30 transition-colors"
                  >
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-white font-mono">{log.phone}</span>
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-textSecondary font-mono">
                      <span>Template: {log.messageType}</span>
                      <span>{log.createdAtRelative}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="text-[10px] text-textMuted text-center font-mono">
            Auto-refresh active (5s polling cycle)
          </div>
        </div>

      </div>
    </div>
  );
};

export default WhatsAppManagerTab;
