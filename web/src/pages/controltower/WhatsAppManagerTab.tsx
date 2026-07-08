// File: web/src/pages/controltower/WhatsAppManagerTab.tsx
// Redesigned into a premium Operations Console for WhatsApp Manager V2.
// Consumes controlTowerRepository, adds write logic and Composer as sub-tabs.

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import controlTowerClient from '../../services/controlTowerClient';
import { 
  fetchWhatsAppSummary, 
  fetchWhatsAppLogs, 
  fetchWhatsAppLogDetails,
  WhatsAppSummaryViewModel, 
  WhatsAppLogItem 
} from '../../repositories/controlTowerRepository';

interface TemplateItem {
  id: string;
  templateName: string;
  language: string;
  category: string;
  approved: boolean;
  bodyPattern: string;
  variableMappingsJson: string;
}

interface InboxItem {
  id: string;
  sender: string;
  messageId: string | null;
  channel: string;
  body: string;
  receivedAt: string;
  rawPayload: string;
  processed: boolean;
  processedAt: string | null;
}

interface WebhookItem {
  id: string;
  receivedAt: string;
  messageId: string | null;
  status: string | null;
  phone: string | null;
  conversationId: string | null;
  rawJson: string;
}

interface AnalyticsData {
  successRate: number;
  readRate: number;
  averageDeliveryTime: number;
  dailyTimeline: Array<{ Date: string; Count: number }>;
}

const WhatsAppManagerTab: React.FC = () => {
  const [subTab, setSubTab] = useState<'console' | 'templates' | 'test' | 'inbox' | 'webhooks' | 'config' | 'analytics'>('console');
  
  // Dashboard & Queue Telemetry
  const [summary, setSummary] = useState<WhatsAppSummaryViewModel | null>(null);
  const [logs, setLogs] = useState<WhatsAppLogItem[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<WhatsAppLogItem | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [providerFilter, setProviderFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [phoneSearchQuery, setPhoneSearchQuery] = useState<string>('');

  const [config, setConfig] = useState({
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
    verifyToken: '',
    appSecret: '',
    graphApiVersion: 'v20.0',
    callbackUrl: '/api/webhooks/whatsapp',
    publicTunnelUrl: ''
  });
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [activeTemplateName, setActiveTemplateName] = useState<string>('report_ready');
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    successRate: 0,
    readRate: 0,
    averageDeliveryTime: 0,
    dailyTimeline: []
  });

  // Direct Send / Test states
  const [testPhone, setTestPhone] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [testVariables, setTestVariables] = useState<Record<string, string>>({});

  // Chat reply states
  const [replyingTo, setReplyingTo] = useState<InboxItem | null>(null);
  const [replyText, setReplyText] = useState('');

  // API Host resolution for direct sending on main API port
  const getApiHost = () => {
    const base = controlTowerClient.defaults.baseURL;
    return base ? base.replace('/api/controltower', '') : 'http://localhost:5069';
  };

  const extractErrorMsg = (e: any, fallback: string): string => {
    const data = e.response?.data;
    if (typeof data === 'object' && data !== null) {
      return data.detail || data.message || data.title || JSON.stringify(data);
    }
    return data || fallback;
  };

  useEffect(() => {
    loadDashboard();
    // Poll summary and logs every 5 seconds for live queue monitoring
    const interval = setInterval(() => {
      refreshData();
    }, 5000);
    return () => clearInterval(interval);
  }, [statusFilter, providerFilter, typeFilter]);

  useEffect(() => {
    if (subTab === 'config') loadConfig();
    if (subTab === 'templates') loadTemplates();
    if (subTab === 'inbox') loadInbox();
    if (subTab === 'webhooks') loadWebhooks();
    if (subTab === 'analytics') loadAnalytics();
  }, [subTab]);

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

  // Sub-tab API handlers
  const loadConfig = async () => {
    try {
      const res = await controlTowerClient.get('/whatsapp/config');
      setConfig(res.data);
    } catch (e) {
      console.error('Failed to load WABA config', e);
    }
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await controlTowerClient.post('/whatsapp/config', config);
      setSuccessMsg('Configuration updated successfully!');
      loadConfig();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to save configuration settings.');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await controlTowerClient.get('/whatsapp/templates');
      setTemplates(res.data);
      const activeRes = await controlTowerClient.get('/whatsapp/templates/active');
      setActiveTemplateName(activeRes.data.activeTemplateName || 'report_ready');
    } catch (e) {
      console.error('Failed to load templates', e);
    }
  };

  const handleSetActiveTemplate = async (templateName: string) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await controlTowerClient.post('/whatsapp/templates/active', { templateName });
      setActiveTemplateName(templateName);
      setSuccessMsg(`Template '${templateName}' activated successfully!`);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to activate template.');
    } finally {
      setLoading(false);
    }
  };

  const syncTemplates = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await controlTowerClient.post('/whatsapp/templates/sync');
      setSuccessMsg(`Successfully synced ${res.data.syncedCount} templates from Meta WABA!`);
      loadTemplates();
    } catch (e: any) {
      setError(extractErrorMsg(e, 'Failed to sync templates from Meta.'));
    } finally {
      setLoading(false);
    }
  };

  const loadInbox = async () => {
    try {
      const res = await controlTowerClient.get('/whatsapp/inbox');
      setInbox(res.data);
    } catch (e) {
      console.error('Failed to load inbox replies', e);
    }
  };

  const loadWebhooks = async () => {
    try {
      const res = await controlTowerClient.get('/whatsapp/webhook-events');
      setWebhooks(res.data);
    } catch (e) {
      console.error('Failed to load webhooks', e);
    }
  };

  const loadAnalytics = async () => {
    try {
      const res = await controlTowerClient.get('/whatsapp/analytics');
      setAnalytics(res.data);
    } catch (e) {
      console.error('Failed to load analytics', e);
    }
  };

  const retryLogItem = async (id: string) => {
    try {
      await controlTowerClient.post(`/whatsapp/logs/retry/${id}`);
      setSuccessMsg('Message queued for retry successfully!');
      loadDashboard();
    } catch (e) {
      console.error(e);
    }
  };

  const cancelLogItem = async (id: string) => {
    try {
      await controlTowerClient.post(`/whatsapp/logs/cancel/${id}`);
      setSuccessMsg('Message dispatch cancelled.');
      loadDashboard();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const apiHost = getApiHost();
      await axios.post(`${apiHost}/api/notifications/send`, {
        recipient: testPhone,
        templateName: selectedTemplate,
        variables: testVariables,
        channel: 'WhatsApp'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Lab-Id': 'LAB001',
          'X-Api-Key': 'TBZ-LAB-KEY-12345'
        }
      });
      setSuccessMsg('Custom notification dispatched to outbox worker!');
      setTestPhone('');
      setTestVariables({});
      setSelectedTemplate('');
    } catch (e: any) {
      setError(extractErrorMsg(e, 'Failed to dispatch custom notification.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingTo || !replyText) return;
    setLoading(true);
    setError(null);
    try {
      await controlTowerClient.post('/whatsapp/inbox/reply', {
        phone: replyingTo.sender,
        replyText: replyText,
        inboxId: replyingTo.id
      });
      setSuccessMsg('Reply dispatched successfully!');
      setReplyText('');
      setReplyingTo(null);
      loadInbox();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to dispatch reply message.');
    } finally {
      setLoading(false);
    }
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
      return retryCount < 5
        ? 'text-warning bg-warning/10 border-warning/20'
        : 'text-error bg-error/10 border-error/20';
    }
    return 'text-textSecondary bg-[#0c0f20] border-cardBorder';
  };

  const getStatusText = (status: string, retryCount: number) => {
    if (status === 'Failed' && retryCount < 5) return 'Retrying';
    return status;
  };

  const filteredLogs = logs.filter(log => {
    if (phoneSearchQuery) {
      return log.phone.includes(phoneSearchQuery);
    }
    if (providerFilter) {
      return log.provider.toLowerCase() === providerFilter.toLowerCase();
    }
    return true;
  });

  const successRate = summary?.totalQueue && summary.totalQueue > 0
    ? (summary.deliveredCount / summary.totalQueue) * 100
    : 0;

  if (loading && logs.length === 0 && subTab === 'console') {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-brandPrimary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-textSecondary text-sm mt-4 font-display">Syncing Live Dispatch Logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold font-display text-white">WhatsApp Operations Console</h2>
          <p className="text-xs text-textSecondary mt-1">Real-time status monitoring, template registry, chat replies, and credentials editor</p>
        </div>
        <button 
          onClick={() => {
            refreshData();
            if (subTab === 'config') loadConfig();
            if (subTab === 'templates') loadTemplates();
            if (subTab === 'inbox') loadInbox();
            if (subTab === 'webhooks') loadWebhooks();
            if (subTab === 'analytics') loadAnalytics();
          }}
          className="px-3 py-1.5 border border-cardBorder rounded-lg text-xs bg-cardBg hover:bg-cardBgHover text-slate-300 font-bold transition-all"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/25 text-error rounded-xl text-xs font-semibold flex items-center space-x-2">
          <span>⚠️</span> <span>{typeof error === 'object' && error !== null ? (error.detail || error.message || error.title || JSON.stringify(error)) : error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-success/15 border border-success/30 text-success rounded-xl text-xs font-semibold flex items-center space-x-2">
          <span>✅</span> <span>{successMsg}</span>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="flex gap-1 bg-[#0c0f20] p-1.5 rounded-2xl border border-cardBorder w-fit overflow-x-auto select-none">
        {[
          { id: 'console', label: 'Queue Monitor', icon: '⏱️' },
          { id: 'templates', label: 'Template Registry', icon: '🗃️' },
          { id: 'inbox', label: 'Chat Inbox', icon: '💬' },
          { id: 'webhooks', label: 'Webhook Logs', icon: '📃' },
          { id: 'test', label: 'Test Dispatcher', icon: '🚀' },
          { id: 'config', label: 'Gateway Config', icon: '⚙️' },
          { id: 'analytics', label: 'Analytics', icon: '📈' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setSubTab(tab.id as any);
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              subTab === tab.id
                ? 'bg-gradient-to-r from-brandSecondary/25 to-brandPrimary/10 text-white border border-brandPrimary/30 shadow-card-glow font-semibold'
                : 'text-textSecondary hover:bg-cardBg/45 hover:text-white'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* SUBTAB CONTENT: OPERATIONS CONSOLE */}
      {subTab === 'console' && summary && (
        <div className="space-y-6">
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

          {/* Provider Health Panel */}
          <div className="space-y-3">
            <h3 className="font-bold text-white text-xs font-display uppercase tracking-wider">Provider Health Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-cardBg border border-cardBorder rounded-xl p-4 flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white text-sm font-display">Meta WhatsApp API</span>
                  <span className="text-[9px] bg-success/15 text-success border border-success/30 px-2 py-0.5 rounded font-bold">ACTIVE</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div className="bg-[#080b18] p-2 rounded">
                    <span className="text-textSecondary block">Total Sent</span>
                    <span className="font-bold text-white font-mono block mt-1">{summary.totalQueue}</span>
                  </div>
                  <div className="bg-[#080b18] p-2 rounded">
                    <span className="text-textSecondary block">Failures</span>
                    <span className="font-bold text-error font-mono block mt-1">{summary.failedCount}</span>
                  </div>
                  <div className="bg-[#080b18] p-2 rounded">
                    <span className="text-textSecondary block">Success Rate</span>
                    <span className="font-bold text-success font-mono block mt-1">{successRate.toFixed(1)}%</span>
                  </div>
                  <div className="bg-[#080b18] p-2 rounded">
                    <span className="text-textSecondary block">Avg Speed</span>
                    <span className="font-bold text-textMuted font-mono block mt-1">Direct</span>
                  </div>
                </div>
              </div>

              <div className="bg-cardBg border border-cardBorder rounded-xl p-4 flex flex-col justify-between space-y-4 opacity-50">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white text-sm font-display text-textMuted">Twilio SMS / WhatsApp</span>
                  <span className="text-[9px] bg-[#1a1c30] text-textSecondary border border-cardBorder px-2 py-0.5 rounded font-bold">STANDBY</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div className="bg-[#080b18] p-2 rounded">
                    <span className="text-textSecondary block">Total Sent</span>
                    <span className="font-bold text-white font-mono block mt-1">0</span>
                  </div>
                  <div className="bg-[#080b18] p-2 rounded">
                    <span className="text-textSecondary block">Failures</span>
                    <span className="font-bold text-white font-mono block mt-1">0</span>
                  </div>
                  <div className="bg-[#080b18] p-2 rounded">
                    <span className="text-textSecondary block">Success Rate</span>
                    <span className="font-bold text-white font-mono block mt-1">N/A</span>
                  </div>
                  <div className="bg-[#080b18] p-2 rounded">
                    <span className="text-textSecondary block">Avg Speed</span>
                    <span className="font-bold text-textMuted font-mono block mt-1">N/A</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters Toolbar */}
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
                placeholder="Type (e.g. report_ready)..."
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="bg-background border border-cardBorder text-white text-[11px] rounded-lg px-3 py-1.5 w-44 focus:outline-none focus:border-brandPrimary"
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

          {/* Queue Logs Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-cardBg border border-cardBorder rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-white text-sm font-display">Live Queue</h3>
                <span className="text-[10px] text-textSecondary">{filteredLogs.length} messages in batch</span>
              </div>

              <div className="overflow-x-auto max-h-[50vh]">
                <table className="w-full text-left border-collapse text-[10px] text-slate-300">
                  <thead>
                    <tr className="border-b border-cardBorder/30 text-textSecondary font-semibold">
                      <th className="pb-2 pl-2">Recipient</th>
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
                        <td colSpan={6} className="py-8 text-center text-textMuted italic">No messages found.</td>
                      </tr>
                    ) : (
                      filteredLogs.map((item) => (
                        <tr 
                          key={item.id}
                          onClick={() => handleSelectLog(item.id)}
                          className={`hover:bg-background/30 cursor-pointer ${selectedLogId === item.id ? 'bg-[#0f1228]' : ''}`}
                        >
                          <td className="py-2.5 font-semibold text-white pl-2 font-mono">{item.phone}</td>
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

            {/* Side Troubleshooting Drawer */}
            <div className="bg-cardBg border border-cardBorder rounded-xl p-6 h-fit max-h-[75vh] overflow-y-auto">
              <h3 className="font-bold text-white text-sm font-display mb-4 uppercase tracking-wider text-[11px]">Message Troubleshooting Details</h3>
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center h-48">
                  <div className="w-6 h-6 border-2 border-accentCyan border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-textSecondary text-[10px] mt-2">Syncing message variables...</p>
                </div>
              ) : selectedLog ? (
                <div className="space-y-4 text-xs">
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
                    <div className="flex justify-between border-t border-cardBorder/25 pt-2">
                      <span className="text-textSecondary">Template Name</span>
                      <span className="font-semibold text-slate-200 font-mono">{selectedLog.templateName || 'Not Available'}</span>
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

                  {/* Variables */}
                  <div>
                    <span className="text-[10px] text-textSecondary uppercase block font-bold mb-2">Variables Metadata</span>
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

                  {/* Queue Control Buttons */}
                  <div className="pt-4 flex gap-2">
                    {selectedLog.status === 'Failed' && (
                      <button 
                        onClick={() => retryLogItem(selectedLog.id)}
                        className="flex-1 py-2 bg-warning/20 hover:bg-warning/30 text-warning border border-warning/30 font-bold rounded-lg text-[10px] text-center transition-all"
                      >
                        🔄 Retry Message
                      </button>
                    )}
                    {selectedLog.status === 'Pending' && (
                      <button 
                        onClick={() => cancelLogItem(selectedLog.id)}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-[10px] text-center transition-all"
                      >
                        ❌ Cancel Delivery
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-center text-textMuted text-xs py-10 font-display">Select a queue row to inspect properties.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB CONTENT: TEMPLATE REGISTRY */}
      {subTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-cardBorder pb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">Meta Approved Templates ({templates.length})</h3>
            <button 
              onClick={syncTemplates}
              className="px-4 py-2 bg-brandPrimary hover:bg-brandPrimary/90 text-white font-bold text-xs rounded-xl shadow-card-glow transition-all"
            >
              🔄 Sync Templates from WABA
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map(tmpl => {
              const isActive = tmpl.templateName === activeTemplateName;
              return (
                <div key={tmpl.id} className={`bg-cardBg border p-5 rounded-xl space-y-4 transition-all duration-300 ${isActive ? 'border-brandPrimary shadow-card-glow' : 'border-cardBorder'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono font-bold text-xs text-brandPrimary">{tmpl.templateName}</span>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[9px] text-textSecondary uppercase font-semibold">Lang: {tmpl.language}</span>
                        <span className="text-[9px] text-textSecondary uppercase font-semibold">Cat: {tmpl.category}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      {isActive ? (
                        <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-brandPrimary/20 text-brandPrimary border border-brandPrimary/40 uppercase">
                          Active
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetActiveTemplate(tmpl.templateName)}
                          className="px-2 py-0.5 bg-[#0f1228] hover:bg-brandPrimary hover:text-white text-brandPrimary font-bold text-[9px] rounded border border-brandPrimary/35 transition-all"
                        >
                          Select Active
                        </button>
                      )}
                      <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-success/15 text-success border border-success/30">
                        APPROVED
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-background/50 rounded-lg text-[10px] font-mono leading-relaxed text-slate-300">
                    {tmpl.bodyPattern}
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-textSecondary uppercase tracking-wider block mb-1">Variable Mappings</span>
                    <span className="text-[10px] font-mono text-slate-450 block truncate bg-[#080b18] p-2 rounded border border-cardBorder/40">
                      {tmpl.variableMappingsJson}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB CONTENT: INBOX */}
      {subTab === 'inbox' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-cardBg border border-cardBorder rounded-xl overflow-hidden md:col-span-1 h-[550px] flex flex-col">
            <div className="p-4 border-b border-cardBorder bg-[#080b18]/40">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">Incoming Chats</h3>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-cardBorder/30">
              {inbox.length === 0 ? (
                <p className="p-8 text-center text-textMuted text-xs italic">No messages received.</p>
              ) : (
                inbox.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => setReplyingTo(item)}
                    className={`p-4 cursor-pointer transition-all hover:bg-background/25 ${replyingTo?.id === item.id ? 'bg-[#0f1228] border-l-2 border-brandPrimary' : ''}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-xs text-white">{item.sender}</span>
                      <span className="text-[9px] text-textMuted">{new Date(item.receivedAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[10px] text-textSecondary mt-1.5 truncate">{item.body}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[8px] text-textMuted">{new Date(item.receivedAt).toLocaleDateString()}</span>
                      {item.processed ? (
                        <span className="text-[9px] text-success font-bold">✔️ Replied</span>
                      ) : (
                        <span className="text-[9px] text-warning font-bold">⏳ Needs Action</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="md:col-span-2 bg-cardBg border border-cardBorder rounded-xl overflow-hidden h-[550px] flex flex-col">
            {replyingTo ? (
              <div className="flex flex-col h-full justify-between">
                <div className="p-4 border-b border-cardBorder bg-[#080b18]/40 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-xs text-white block">{replyingTo.sender}</span>
                    <span className="text-[9px] text-textSecondary">Incoming Customer Reply</span>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-textMuted hover:text-white font-bold">✕</button>
                </div>

                <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                  <div className="flex items-start gap-2.5 max-w-[80%]">
                    <div className="p-3 bg-background/50 border border-cardBorder/40 rounded-xl rounded-tl-none text-xs leading-relaxed text-slate-350">
                      {replyingTo.body}
                      <span className="text-[8px] text-textMuted block text-right mt-1.5">{new Date(replyingTo.receivedAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {replyingTo.processed && (
                    <div className="flex items-start justify-end gap-2.5 max-w-[80%] ml-auto">
                      <div className="p-3 bg-brandPrimary/10 border border-brandPrimary/20 rounded-xl rounded-tr-none text-xs leading-relaxed text-brandPrimary">
                        Reply successfully sent via outbound client gateway.
                        <span className="text-[8px] text-brandPrimary/75 block text-right mt-1.5">Processed</span>
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendReply} className="p-4 border-t border-cardBorder flex gap-2">
                  <input 
                    type="text"
                    required
                    placeholder="Type message response..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    className="flex-1 bg-background border border-cardBorder rounded-xl px-4 py-2 text-xs focus:outline-none text-white focus:border-brandPrimary"
                  />
                  <button 
                    type="submit"
                    disabled={!replyText}
                    className="px-4 py-2 bg-brandPrimary hover:bg-brandPrimary/90 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all"
                  >
                    ✉️ Send
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-textMuted p-8">
                <span className="text-3xl mb-2">💬</span>
                <p className="text-xs">Select conversation thread to view replies.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB CONTENT: WEBHOOK LOGS */}
      {subTab === 'webhooks' && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">Webhook Callbacks (Last 100)</h3>
          <div className="bg-cardBg border border-cardBorder rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-[10px] text-slate-350">
              <thead>
                <tr className="border-b border-cardBorder/30 bg-[#080b18]/30 text-textSecondary font-semibold">
                  <th className="p-4">Received At</th>
                  <th className="p-4">Message ID</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Status Callback</th>
                  <th className="p-4">Payload JSON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cardBorder/20">
                {webhooks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-textMuted italic">No webhook callbacks logged.</td>
                  </tr>
                ) : (
                  webhooks.map(ev => (
                    <tr key={ev.id} className="hover:bg-background/20">
                      <td className="p-4 text-textSecondary">{new Date(ev.receivedAt).toLocaleString()}</td>
                      <td className="p-4 font-mono text-[9px]">{ev.messageId || 'N/A'}</td>
                      <td className="p-4 font-bold font-mono text-white">{ev.phone || 'N/A'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded border text-[8px] font-bold ${
                          ev.status === 'delivered' ? 'text-success bg-success/10 border-success/20' :
                          ev.status === 'read' ? 'text-accentBlue bg-accentBlue/10 border-accentBlue/20' :
                          ev.status === 'failed' ? 'text-error bg-error/10 border-error/20' :
                          'text-textSecondary bg-[#080b18] border-cardBorder'
                        }`}>
                          {ev.status || 'Received'}
                        </span>
                      </td>
                      <td className="p-4">
                        <details className="cursor-pointer">
                          <summary className="text-[9px] text-brandPrimary hover:underline">View Raw JSON</summary>
                          <pre className="p-3 bg-[#080b18]/80 border border-cardBorder/40 rounded mt-2 text-[9px] font-mono text-emerald-400 max-w-md overflow-x-auto whitespace-pre-wrap select-all">
                            {JSON.stringify(JSON.parse(ev.rawJson || '{}'), null, 2)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB CONTENT: TEST DISPATCHER */}
      {subTab === 'test' && (
        <div className="max-w-xl bg-cardBg border border-cardBorder p-6 rounded-xl space-y-6">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">Test Dispatch Message composer</h3>
          <form onSubmit={handleSendTest} className="space-y-4 text-xs">
            <div>
              <label className="block text-[9px] font-bold text-textSecondary uppercase tracking-wider mb-1.5">Phone Number</label>
              <input 
                type="text"
                required
                placeholder="e.g. +919988776655"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                className="w-full bg-background border border-cardBorder rounded-xl px-4 py-2.5 text-xs focus:outline-none text-white focus:border-brandPrimary"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-textSecondary uppercase tracking-wider mb-1.5">Select Template</label>
              <select 
                required
                value={selectedTemplate}
                onChange={e => {
                  setSelectedTemplate(e.target.value);
                  setTestVariables({});
                }}
                className="w-full bg-background border border-cardBorder rounded-xl px-3 py-2.5 text-xs focus:outline-none text-white focus:border-brandPrimary"
              >
                <option value="">-- Choose active template --</option>
                {templates.map(tmpl => (
                  <option key={tmpl.id} value={tmpl.templateName}>{tmpl.templateName} ({tmpl.language})</option>
                ))}
              </select>
            </div>

            {selectedTemplate && (
              <div className="space-y-3 p-4 bg-background/50 border border-cardBorder/40 rounded-xl">
                <h4 className="text-[9px] font-bold text-brandPrimary uppercase tracking-wider">Dynamic Variables Form</h4>
                {(() => {
                  const tmpl = templates.find(t => t.templateName === selectedTemplate);
                  if (!tmpl) return null;
                  const mappedParams = JSON.parse(tmpl.variableMappingsJson || '[]');
                  
                  return mappedParams.map((param: string) => (
                    <div key={param}>
                      <label className="block text-[9px] font-semibold text-slate-350 mb-1 font-mono">{param}</label>
                      <input 
                        type="text"
                        required
                        placeholder={`Value for ${param}`}
                        value={testVariables[param] || ''}
                        onChange={e => setTestVariables({
                          ...testVariables,
                          [param]: e.target.value
                        })}
                        className="w-full bg-background border border-cardBorder rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-brandPrimary"
                      />
                    </div>
                  ));
                })()}
              </div>
            )}

            <button 
              type="submit"
              disabled={!selectedTemplate || !testPhone}
              className="w-full py-2.5 bg-brandPrimary hover:bg-brandPrimary/90 text-white font-bold text-xs rounded-xl shadow-card-glow disabled:opacity-50 transition-all"
            >
              🚀 Dispatch Test Notification
            </button>
          </form>
        </div>
      )}

      {/* SUBTAB CONTENT: CONFIGURATION */}
      {subTab === 'config' && (
        <div className="max-w-xl bg-cardBg border border-cardBorder p-6 rounded-xl space-y-6">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">WABA Settings Editor</h3>
          <form onSubmit={saveConfig} className="space-y-4 text-xs">
            <div>
              <label className="block text-[9px] font-bold text-textSecondary uppercase tracking-wider mb-1">Webhook URL Endpoint (Read-Only)</label>
              <input 
                type="text"
                readOnly
                value={config.callbackUrl}
                className="w-full bg-background/50 border border-cardBorder rounded-xl px-4 py-2.5 text-xs focus:outline-none text-textMuted font-mono select-all"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-textSecondary uppercase tracking-wider mb-1">Graph API Version</label>
              <select 
                value={config.graphApiVersion}
                onChange={e => setConfig({ ...config, graphApiVersion: e.target.value })}
                className="w-full bg-background border border-cardBorder rounded-xl px-3 py-2.5 text-xs focus:outline-none text-white focus:border-brandPrimary"
              >
                <option value="v20.0">v20.0 (Stable)</option>
                <option value="v21.0">v21.0</option>
                <option value="v22.0">v22.0</option>
                <option value="v25.0">v25.0</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-textSecondary uppercase tracking-wider mb-1">Webhook Verification Token</label>
              <input 
                type="text"
                placeholder="Enter verify token"
                value={config.verifyToken}
                onChange={e => setConfig({ ...config, verifyToken: e.target.value })}
                className="w-full bg-background border border-cardBorder rounded-xl px-4 py-2.5 text-xs focus:outline-none text-white focus:border-brandPrimary"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-textSecondary uppercase tracking-wider mb-1">Phone Number ID</label>
              <input 
                type="text"
                placeholder="Meta Phone Number ID"
                value={config.phoneNumberId}
                onChange={e => setConfig({ ...config, phoneNumberId: e.target.value })}
                className="w-full bg-background border border-cardBorder rounded-xl px-4 py-2.5 text-xs focus:outline-none text-white focus:border-brandPrimary"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-textSecondary uppercase tracking-wider mb-1">Business Account ID</label>
              <input 
                type="text"
                placeholder="Meta Business Account ID"
                value={config.businessAccountId}
                onChange={e => setConfig({ ...config, businessAccountId: e.target.value })}
                className="w-full bg-background border border-cardBorder rounded-xl px-4 py-2.5 text-xs focus:outline-none text-white focus:border-brandPrimary"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-textSecondary uppercase tracking-wider mb-1">Public Tunnel URL (Active Cloudflare URL)</label>
              <input 
                type="text"
                placeholder="https://xxxx.trycloudflare.com"
                value={config.publicTunnelUrl}
                onChange={e => setConfig({ ...config, publicTunnelUrl: e.target.value })}
                className="w-full bg-background border border-cardBorder rounded-xl px-4 py-2.5 text-xs focus:outline-none text-white focus:border-brandPrimary"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-textSecondary uppercase tracking-wider mb-1">WABA Access Token</label>
              <input 
                type="password"
                placeholder={config.accessToken ? "••••••••••••••••••••" : "Enter access token"}
                value={config.accessToken}
                onChange={e => setConfig({ ...config, accessToken: e.target.value })}
                className="w-full bg-background border border-cardBorder rounded-xl px-4 py-2.5 text-xs focus:outline-none text-white focus:border-brandPrimary"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-textSecondary uppercase tracking-wider mb-1">App Secret</label>
              <input 
                type="password"
                placeholder={config.appSecret ? "••••••••••••" : "Enter app secret"}
                value={config.appSecret}
                onChange={e => setConfig({ ...config, appSecret: e.target.value })}
                className="w-full bg-background border border-cardBorder rounded-xl px-4 py-2.5 text-xs focus:outline-none text-white focus:border-brandPrimary"
              />
            </div>

            <button 
              type="submit"
              className="w-full py-2.5 bg-brandPrimary hover:bg-brandPrimary/90 text-white font-bold text-xs rounded-xl shadow-card-glow transition-all"
            >
              ⚙️ Save Credentials Configuration
            </button>
          </form>
        </div>
      )}

      {/* SUBTAB CONTENT: ANALYTICS */}
      {subTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-cardBg border border-cardBorder p-5 rounded-xl text-center">
              <span className="text-[10px] text-textSecondary uppercase block font-bold tracking-wider">Overall Delivery Success</span>
              <span className="text-3xl font-black text-white block mt-2 font-mono">{(analytics.successRate * 100).toFixed(1)}%</span>
            </div>
            <div className="bg-cardBg border border-cardBorder p-5 rounded-xl text-center">
              <span className="text-[10px] text-textSecondary uppercase block font-bold tracking-wider">Message Read rate</span>
              <span className="text-3xl font-black text-white block mt-2 font-mono">{(analytics.readRate * 100).toFixed(1)}%</span>
            </div>
            <div className="bg-cardBg border border-cardBorder p-5 rounded-xl text-center">
              <span className="text-[10px] text-textSecondary uppercase block font-bold tracking-wider">Average Speed</span>
              <span className="text-3xl font-black text-white block mt-2 font-mono">
                {analytics.averageDeliveryTime ? `${analytics.averageDeliveryTime.toFixed(1)}s` : 'N/A'}
              </span>
            </div>
          </div>

          {/* Timeline visualization */}
          <div className="bg-cardBg border border-cardBorder p-6 rounded-xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">Outbox Volume (Last 7 Days)</h3>
            <div className="h-48 flex items-end justify-between gap-4 pt-4 border-b border-cardBorder/30">
              {(analytics.dailyTimeline || []).map((item: any, idx) => {
                const dateVal = item.date || item.Date || '';
                const countVal = item.count !== undefined ? item.count : (item.Count !== undefined ? item.Count : 0);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group">
                    <div 
                      className="w-full bg-brandPrimary/20 group-hover:bg-brandPrimary/80 rounded-t border-t border-brandPrimary/50 transition-all"
                      style={{ height: `${Math.min(100, Math.max(8, (countVal / 100) * 100))}%` }}
                      title={`${countVal} messages`}
                    />
                    <span className="text-[9px] text-textSecondary font-semibold mt-2 font-mono">{dateVal ? dateVal.slice(5) : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WhatsAppManagerTab;
