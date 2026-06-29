// File: web/src/pages/controltower/WhatsAppManagerTab.tsx
// Redesigned into a premium Operations Console for WhatsApp Manager V1.
// Consumes controlTowerRepository and contains no write logic or composer.

import React, { useEffect, useState } from 'react';
import { 
  fetchWhatsAppSummary, 
  fetchWhatsAppLogs, 
  fetchWhatsAppLogDetails,
  WhatsAppSummaryViewModel, 
  WhatsAppLogItem 
} from '../../repositories/controlTowerRepository';

const WhatsAppManagerTab: React.FC = () => {
  const [summary, setSummary] = useState<WhatsAppSummaryViewModel | null>(null);
  const [logs, setLogs] = useState<WhatsAppLogItem[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<WhatsAppLogItem | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [providerFilter, setProviderFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [phoneSearchQuery, setPhoneSearchQuery] = useState<string>('');

  useEffect(() => {
    loadDashboard();
    // Poll summary and logs every 5 seconds for live queue monitoring
    const interval = setInterval(() => {
      refreshData();
    }, 5000);
    return () => clearInterval(interval);
  }, [statusFilter, providerFilter, typeFilter]);

  const loadDashboard = () => {
    setLoading(true);
    Promise.all([
      fetchWhatsAppSummary(),
      fetchWhatsAppLogs(statusFilter, undefined, typeFilter)
    ])
      .then(([s, l]) => {
        setSummary(s);
        setLogs(l);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to fetch WhatsApp monitoring telemetry.');
        setLoading(false);
      });
  };

  const refreshData = () => {
    Promise.all([
      fetchWhatsAppSummary(),
      fetchWhatsAppLogs(statusFilter, undefined, typeFilter)
    ])
      .then(([s, l]) => {
        setSummary(s);
        setLogs(l);
      })
      .catch(console.error);
  };

  const handleSelectLog = (id: string) => {
    setSelectedLogId(id);
    setDetailLoading(true);
    fetchWhatsAppLogDetails(id)
      .then(detail => {
        setSelectedLog(detail);
        setDetailLoading(false);
      })
      .catch(err => {
        console.error(err);
        setDetailLoading(false);
      });
  };

  const getStatusBadgeClass = (status: string, retryCount: number) => {
    if (status === 'Pending') {
      return 'text-accentBlue bg-accentBlue/10 border-accentBlue/20';
    }
    if (status === 'Sending') {
      return 'text-warning bg-warning/10 border-warning/20 animate-pulse';
    }
    if (status === 'Sent' || status === 'Delivered') {
      return 'text-success bg-success/10 border-success/20';
    }
    if (status === 'Failed') {
      return retryCount < 3
        ? 'text-warning bg-warning/10 border-warning/20'
        : 'text-error bg-error/10 border-error/20';
    }
    return 'text-textSecondary bg-[#0c0f20] border-cardBorder';
  };

  const getStatusText = (status: string, retryCount: number) => {
    if (status === 'Failed' && retryCount < 3) return 'Retrying';
    return status;
  };

  // Perform search query filtering on phone locally to avoid hammering database
  const filteredLogs = logs.filter(log => {
    if (phoneSearchQuery) {
      return log.phone.includes(phoneSearchQuery);
    }
    if (providerFilter) {
      return log.provider.toLowerCase() === providerFilter.toLowerCase();
    }
    return true;
  });

  if (loading && logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-brandPrimary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-textSecondary text-sm mt-4 font-display">Syncing Live Dispatch Logs...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-6 bg-error/10 border border-error/25 text-error rounded-xl text-center">
        <p className="font-semibold">{error}</p>
        <button 
          onClick={loadDashboard}
          className="mt-4 px-4 py-2 bg-error text-white font-semibold text-xs rounded-lg hover:bg-error/85 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const successRate = summary.totalQueue > 0
    ? (summary.deliveredCount / summary.totalQueue) * 100
    : 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div>
        <h2 className="text-xl font-bold font-display text-white">WhatsApp Operations Console</h2>
        <p className="text-xs text-textSecondary mt-1">Real-time status monitoring, message lifecycle tracking, and delivery pipelines</p>
      </div>

      {/* 1. Delivery Pipeline Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div 
          onClick={() => setStatusFilter(statusFilter === 'Pending' ? '' : 'Pending')}
          className={`cursor-pointer border rounded-xl p-5 transition-all ${
            statusFilter === 'Pending' 
              ? 'bg-accentBlue/10 border-accentBlue' 
              : 'bg-cardBg border-cardBorder hover:border-cardBorderHover'
          }`}
        >
          <span className="text-[10px] text-textSecondary block uppercase tracking-wider font-bold">Pending</span>
          <span className="text-3xl font-bold text-accentBlue font-mono mt-2 block">{summary.pendingCount}</span>
          <span className="text-[9px] text-textMuted mt-1 block">Awaiting queue pickup</span>
        </div>

        <div 
          onClick={() => setStatusFilter(statusFilter === 'Sending' ? '' : 'Sending')}
          className={`cursor-pointer border rounded-xl p-5 transition-all ${
            statusFilter === 'Sending' 
              ? 'bg-warning/10 border-warning' 
              : 'bg-cardBg border-cardBorder hover:border-cardBorderHover'
          }`}
        >
          <span className="text-[10px] text-textSecondary block uppercase tracking-wider font-bold">Sending</span>
          <span className="text-3xl font-bold text-warning font-mono mt-2 block">{summary.sendingCount}</span>
          <span className="text-[9px] text-textMuted mt-1 block">Processing in worker</span>
        </div>

        <div 
          onClick={() => setStatusFilter(statusFilter === 'Sent' ? '' : 'Sent')}
          className={`cursor-pointer border rounded-xl p-5 transition-all ${
            statusFilter === 'Sent' 
              ? 'bg-success/10 border-success' 
              : 'bg-cardBg border-cardBorder hover:border-cardBorderHover'
          }`}
        >
          <span className="text-[10px] text-textSecondary block uppercase tracking-wider font-bold">Sent / Delivered</span>
          <span className="text-3xl font-bold text-success font-mono mt-2 block">
            {summary.sentCount + summary.deliveredCount}
          </span>
          <span className="text-[9px] text-textMuted mt-1 block">Successfully dispatched</span>
        </div>

        <div 
          onClick={() => setStatusFilter(statusFilter === 'Failed' ? '' : 'Failed')}
          className={`cursor-pointer border rounded-xl p-5 transition-all ${
            statusFilter === 'Failed' 
              ? 'bg-error/10 border-error' 
              : 'bg-cardBg border-cardBorder hover:border-cardBorderHover'
          }`}
        >
          <span className="text-[10px] text-textSecondary block uppercase tracking-wider font-bold">Failed</span>
          <span className="text-3xl font-bold text-error font-mono mt-2 block">{summary.failedCount}</span>
          <span className="text-[9px] text-textMuted mt-1 block">Exceeded retry limits</span>
        </div>
      </div>

      {/* 5. Provider Health Operations Panel */}
      <div className="space-y-3">
        <h3 className="font-bold text-white text-xs font-display uppercase tracking-wider">Provider Health Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Provider Meta */}
          <div className="bg-cardBg border border-cardBorder rounded-xl p-4 flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white text-sm font-display">Meta WhatsApp API</span>
              <span className="text-[9px] bg-success/15 text-success border border-success/30 px-2 py-0.5 rounded font-bold">ACTIVE</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
              <div className="bg-background/40 p-2 rounded">
                <span className="text-textSecondary block">Total Sent</span>
                <span className="font-bold text-white font-mono block mt-1">{summary.totalQueue}</span>
              </div>
              <div className="bg-background/40 p-2 rounded">
                <span className="text-textSecondary block">Failures</span>
                <span className="font-bold text-error font-mono block mt-1">{summary.failedCount}</span>
              </div>
              <div className="bg-background/40 p-2 rounded">
                <span className="text-textSecondary block">Success Rate</span>
                <span className="font-bold text-success font-mono block mt-1">{successRate.toFixed(1)}%</span>
              </div>
              <div className="bg-background/40 p-2 rounded">
                <span className="text-textSecondary block">Avg Speed</span>
                <span className="font-bold text-textMuted font-mono block mt-1">N/A</span>
              </div>
            </div>
          </div>

          {/* Provider Twilio */}
          <div className="bg-cardBg border border-cardBorder rounded-xl p-4 flex flex-col justify-between space-y-4 opacity-60">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white text-sm font-display text-textMuted">Twilio SMS / WhatsApp</span>
              <span className="text-[9px] bg-[#1a1c30] text-textSecondary border border-cardBorder px-2 py-0.5 rounded font-bold">STANDBY</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
              <div className="bg-background/40 p-2 rounded">
                <span className="text-textSecondary block">Total Sent</span>
                <span className="font-bold text-white font-mono block mt-1">0</span>
              </div>
              <div className="bg-background/40 p-2 rounded">
                <span className="text-textSecondary block">Failures</span>
                <span className="font-bold text-white font-mono block mt-1">0</span>
              </div>
              <div className="bg-background/40 p-2 rounded">
                <span className="text-textSecondary block">Success Rate</span>
                <span className="font-bold text-white font-mono block mt-1">N/A</span>
              </div>
              <div className="bg-background/40 p-2 rounded">
                <span className="text-textSecondary block">Avg Speed</span>
                <span className="font-bold text-textMuted font-mono block mt-1">N/A</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 4. Filters Toolbar */}
      <div className="bg-cardBg border border-cardBorder rounded-xl p-4 flex flex-wrap gap-4 items-center">
        
        <div className="flex flex-col space-y-1">
          <span className="text-[9px] text-textSecondary uppercase font-bold">Provider</span>
          <select 
            value={providerFilter}
            onChange={e => setProviderFilter(e.target.value)}
            className="bg-background border border-cardBorder text-white text-[11px] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brandPrimary"
          >
            <option value="">All Providers</option>
            <option value="Meta">Meta</option>
            <option value="Twilio">Twilio</option>
          </select>
        </div>

        <div className="flex flex-col space-y-1">
          <span className="text-[9px] text-textSecondary uppercase font-bold">Message Type</span>
          <input 
            type="text"
            placeholder="Type (e.g. CBC)..."
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-background border border-cardBorder text-white text-[11px] rounded-lg px-3 py-1.5 w-36 focus:outline-none focus:border-brandPrimary"
          />
        </div>

        <div className="flex flex-col space-y-1">
          <span className="text-[9px] text-textSecondary uppercase font-bold">Search Phone</span>
          <input 
            type="text"
            placeholder="Search by phone..."
            value={phoneSearchQuery}
            onChange={e => setPhoneSearchQuery(e.target.value)}
            className="bg-background border border-cardBorder text-white text-[11px] rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:border-brandPrimary"
          />
        </div>

        <button 
          onClick={() => {
            setStatusFilter('');
            setProviderFilter('');
            setTypeFilter('');
            setPhoneSearchQuery('');
          }}
          className="ml-auto px-4 py-1.5 bg-brandSecondary/25 border border-brandSecondary/30 hover:bg-brandSecondary/40 text-brandPrimary font-bold text-xs rounded-xl transition-all"
        >
          Clear Filters
        </button>
      </div>

      {/* Main logs & details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 2. Live Queue List */}
        <div className="lg:col-span-2 bg-cardBg border border-cardBorder rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-white text-sm font-display">Live Queue</h3>
            <span className="text-[10px] text-textSecondary">{filteredLogs.length} messages in batch</span>
          </div>

          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-left border-collapse text-[10px] text-slate-300">
              <thead>
                <tr className="border-b border-cardBorder/30 text-textSecondary font-semibold">
                  <th className="pb-2 pl-2">Patient</th>
                  <th className="pb-2">Phone</th>
                  <th className="pb-2">Message Type</th>
                  <th className="pb-2 text-center">Status</th>
                  <th className="pb-2 text-center">Retries</th>
                  <th className="pb-2">Provider</th>
                  <th className="pb-2 text-right pr-2">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cardBorder/25">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-textMuted italic">No messages found.</td>
                  </tr>
                ) : (
                  filteredLogs.map((item) => (
                    <tr 
                      key={item.id}
                      onClick={() => handleSelectLog(item.id)}
                      className={`hover:bg-background/30 cursor-pointer ${selectedLogId === item.id ? 'bg-[#0f1228]' : ''}`}
                    >
                      <td className="py-2.5 font-semibold text-white pl-2 font-mono truncate max-w-[120px]" title={item.patientId || 'N/A'}>
                        {item.patientId ? item.patientId.substring(0, 8).toUpperCase() : 'N/A'}
                      </td>
                      <td className="py-2.5 font-semibold text-slate-300 font-mono">{item.phone}</td>
                      <td className="py-2.5 font-mono">{item.messageType}</td>
                      <td className="py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded border text-[8px] font-bold ${getStatusBadgeClass(item.status, item.retryCount)}`}>
                          {getStatusText(item.status, item.retryCount)}
                        </span>
                      </td>
                      <td className="py-2.5 text-center font-mono">{item.retryCount}</td>
                      <td className="py-2.5 font-mono text-[9px]">{item.provider}</td>
                      <td className="py-2.5 text-right font-mono pr-2">{item.createdAtRelative}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Message Details Drawer (Troubleshooting Sidebar) */}
        <div className="bg-cardBg border border-cardBorder rounded-xl p-6 h-fit max-h-[75vh] overflow-y-auto">
          <h3 className="font-bold text-white text-sm font-display mb-4 font-display uppercase tracking-wider text-[11px]">Message Troubleshooting Details</h3>

          {detailLoading ? (
            <div className="flex flex-col items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-accentCyan border-t-transparent rounded-full animate-spin"></div>
              <p className="text-textSecondary text-[10px] mt-2">Syncing message variables...</p>
            </div>
          ) : selectedLog ? (
            <div className="space-y-4 text-xs">
              
              <div>
                <span className="text-[10px] text-textSecondary uppercase block font-bold">Patient ID</span>
                <span className="font-mono text-white select-all block mt-0.5">{selectedLog.patientId || 'Not Available'}</span>
              </div>

              <div>
                <span className="text-[10px] text-textSecondary uppercase block font-bold">Visit ID</span>
                <span className="font-mono text-white select-all block mt-0.5">{selectedLog.visitId || 'Not Available'}</span>
              </div>

              <div>
                <span className="text-[10px] text-textSecondary uppercase block font-bold">Report ID</span>
                <span className="font-mono text-white select-all block mt-0.5">{selectedLog.reportId || 'Not Available'}</span>
              </div>

              <div>
                <span className="text-[10px] text-textSecondary uppercase block font-bold">Lab ID</span>
                <span className="font-mono text-white select-all block mt-0.5">{selectedLog.labId || 'Not Available'}</span>
              </div>

              <div className="bg-background/40 border border-cardBorder/40 rounded-xl p-4 space-y-2.5 text-[10px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-textSecondary">Phone Number</span>
                  <span className="font-bold text-white font-mono">{selectedLog.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Channel</span>
                  <span className="font-bold text-white">{selectedLog.channel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Provider</span>
                  <span className="font-bold text-white font-mono">{selectedLog.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Status</span>
                  <span className={`px-2 py-0.5 rounded border text-[8px] font-bold ${getStatusBadgeClass(selectedLog.status, selectedLog.retryCount)}`}>
                    {getStatusText(selectedLog.status, selectedLog.retryCount)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-cardBorder/25 pt-2">
                  <span className="text-textSecondary">Template Name</span>
                  <span className="font-semibold text-slate-200 font-mono">{selectedLog.templateName || 'Not Available'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Trigger Event</span>
                  <span className="font-semibold text-slate-200 font-mono text-[9px]">{selectedLog.triggerEvent || 'Not Available'}</span>
                </div>
              </div>

              {selectedLog.failureReason && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-[10px]">
                  <span className="font-bold text-error uppercase block tracking-wider mb-1">Failure / Error Log</span>
                  <p className="text-slate-300 font-mono leading-relaxed">{selectedLog.failureReason}</p>
                </div>
              )}

              <div className="bg-background/40 border border-cardBorder/40 rounded-xl p-4 space-y-2 text-[10px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-textSecondary">Created At</span>
                  <span className="font-mono">{selectedLog.createdAtRelative}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Sent At</span>
                  <span className="font-mono">{selectedLog.sentAtFormatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Delivered At</span>
                  <span className="font-mono">{selectedLog.deliveredAtFormatted || 'Pending'}</span>
                </div>
              </div>

              {/* Provider Payload Metadata */}
              <div>
                <span className="text-[10px] text-textSecondary uppercase block font-bold mb-2">Provider Metadata</span>
                <div className="bg-background/60 border border-cardBorder/50 rounded-xl p-3 text-[9px] font-mono text-emerald-400 overflow-x-auto max-h-48 whitespace-pre-wrap select-all">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedLog.payloadJson), null, 2);
                    } catch {
                      return selectedLog.payloadJson || 'No metadata payload';
                    }
                  })()}
                </div>
              </div>

            </div>
          ) : (
            <p className="text-center text-textMuted text-xs py-10 font-display">Select a queue row to inspect properties.</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default WhatsAppManagerTab;
