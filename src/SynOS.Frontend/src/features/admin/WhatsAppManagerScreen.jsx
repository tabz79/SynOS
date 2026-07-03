import React, { useState, useEffect } from 'react';
import { 
    MessageSquare, 
    Send, 
    RefreshCw, 
    Sliders, 
    Database, 
    Activity, 
    FileText, 
    CheckCircle2, 
    AlertCircle, 
    Trash2, 
    Settings, 
    Plus, 
    Search, 
    Users, 
    Clock, 
    BarChart3,
    Check,
    X,
    ChevronRight,
    Lock
} from 'lucide-react';
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

export function WhatsAppManagerScreen() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [activeTab, setActiveTab] = useState('dashboard');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    // States for data
    const [config, setConfig] = useState({
        accessToken: '',
        phoneNumberId: '',
        businessAccountId: '',
        verifyToken: '',
        appSecret: '',
        graphApiVersion: 'v20.0',
        callbackUrl: '/api/webhooks/whatsapp'
    });
    const [analytics, setAnalytics] = useState({
        successRate: 0,
        readRate: 0,
        averageDeliveryTime: 0,
        dailyTimeline: []
    });
    const [logs, setLogs] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [inbox, setInbox] = useState([]);
    const [webhooks, setWebhooks] = useState([]);

    // Filtering / Search States
    const [logSearch, setLogSearch] = useState('');
    const [logStatus, setLogStatus] = useState('');
    
    // Direct Send States
    const [testPhone, setTestPhone] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [testVariables, setTestVariables] = useState({});

    // Reply States
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');

    // Fetch config
    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/controltower/whatsapp/config');
            if (res.ok) {
                const data = await res.json();
                setConfig({
                    accessToken: data.accessToken || '',
                    phoneNumberId: data.phoneNumberId || '',
                    businessAccountId: data.businessAccountId || '',
                    verifyToken: data.verifyToken || '',
                    appSecret: data.appSecret || '',
                    graphApiVersion: data.graphApiVersion || 'v20.0',
                    callbackUrl: data.callbackUrl || '/api/webhooks/whatsapp'
                });
            }
        } catch (e) {
            console.error('Failed to load WABA config', e);
        }
    };

    // Save config
    const saveConfig = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);
        try {
            const res = await fetch('/api/controltower/whatsapp/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            if (res.ok) {
                setSuccessMsg('Configuration updated successfully!');
                fetchConfig();
            } else {
                const err = await res.json();
                setError(err.message || 'Failed to update configuration.');
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch analytics
    const fetchAnalytics = async () => {
        try {
            const res = await fetch('/api/controltower/whatsapp/analytics');
            if (res.ok) {
                const data = await res.json();
                setAnalytics(data);
            }
        } catch (e) {
            console.error('Failed to load analytics', e);
        }
    };

    // Fetch logs
    const fetchLogs = async () => {
        try {
            const url = logStatus 
                ? `/api/controltower/whatsapp/logs?status=${logStatus}` 
                : '/api/controltower/whatsapp/logs';
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (e) {
            console.error('Failed to load logs', e);
        }
    };

    // Fetch templates
    const fetchTemplates = async () => {
        try {
            const res = await fetch('/api/controltower/whatsapp/templates');
            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
            }
        } catch (e) {
            console.error('Failed to load templates', e);
        }
    };

    // Sync templates
    const syncTemplates = async () => {
        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);
        try {
            const res = await fetch('/api/controltower/whatsapp/templates/sync', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setSuccessMsg(`Synced ${data.syncedCount} templates successfully from Meta!`);
                fetchTemplates();
            } else {
                const text = await res.text();
                setError(text || 'Failed to sync templates from Meta.');
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch inbox
    const fetchInbox = async () => {
        try {
            const res = await fetch('/api/controltower/whatsapp/inbox');
            if (res.ok) {
                const data = await res.json();
                setInbox(data);
            }
        } catch (e) {
            console.error('Failed to load inbox replies', e);
        }
    };

    // Fetch webhooks
    const fetchWebhooks = async () => {
        try {
            const res = await fetch('/api/controltower/whatsapp/webhook-events');
            if (res.ok) {
                const data = await res.json();
                setWebhooks(data);
            }
        } catch (e) {
            console.error('Failed to load webhooks', e);
        }
    };

    // Retry Queue Item
    const retryLogItem = async (id) => {
        try {
            const res = await fetch(`/api/controltower/whatsapp/logs/retry/${id}`, { method: 'POST' });
            if (res.ok) {
                setSuccessMsg('Outbox dispatch item queued for retry!');
                fetchLogs();
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Cancel Queue Item
    const cancelLogItem = async (id) => {
        try {
            const res = await fetch(`/api/controltower/whatsapp/logs/cancel/${id}`, { method: 'POST' });
            if (res.ok) {
                setSuccessMsg('Outbox dispatch item cancelled.');
                fetchLogs();
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Direct Send Test Message
    const handleSendTest = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);
        try {
            const res = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: testPhone,
                    templateName: selectedTemplate,
                    variables: testVariables,
                    channel: 'WhatsApp'
                })
            });
            if (res.ok) {
                setSuccessMsg('Test notification sent successfully!');
                setTestPhone('');
                setTestVariables({});
                fetchLogs();
            } else {
                const text = await res.text();
                setError(text || 'Failed to send test notification.');
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Reply to Patient Chat
    const handleSendReply = async (e) => {
        e.preventDefault();
        if (!replyingTo || !replyText) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/controltower/whatsapp/inbox/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: replyingTo.sender,
                    replyText: replyText,
                    inboxId: replyingTo.id
                })
            });
            if (res.ok) {
                setSuccessMsg('Reply sent successfully!');
                setReplyText('');
                setReplyingTo(null);
                fetchInbox();
            } else {
                const err = await res.json();
                setError(err.message || 'Failed to send reply.');
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Load initial data
    useEffect(() => {
        fetchConfig();
        fetchAnalytics();
        fetchLogs();
        fetchTemplates();
        fetchInbox();
        fetchWebhooks();

        const timer = setInterval(() => {
            fetchAnalytics();
            fetchLogs();
            fetchInbox();
        }, 15000); // refresh transient items every 15s

        return () => clearInterval(timer);
    }, [logStatus]);

    const filteredLogs = logs.filter(log => {
        const query = logSearch.toLowerCase();
        return (log.phone?.toLowerCase().includes(query) || 
                log.messageType?.toLowerCase().includes(query) ||
                log.failureReason?.toLowerCase().includes(query));
    });

    return (
        <div className="p-8 space-y-8 pb-16 relative z-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black dark:text-white text-zinc-900 tracking-tight">WhatsApp Manager</h1>
                    <p className="text-xs text-zinc-500 font-medium mt-1">Configure Meta Cloud API, manage templates, view delivery outbox queue, and reply to chats.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => {
                            fetchAnalytics();
                            fetchLogs();
                            fetchTemplates();
                            fetchInbox();
                            fetchWebhooks();
                        }}
                        className="p-2 border rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 dark:border-zinc-800 transition-all text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        title="Reload Dashboard"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Alert system */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 border border-red-200 dark:border-red-950 rounded-2xl text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
            {successMsg && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-950 rounded-2xl text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-2xl border border-black/5 dark:border-white/5 w-fit overflow-x-auto">
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                    { id: 'logs', label: 'Outbox Queue', icon: Clock },
                    { id: 'templates', label: 'Template Registry', icon: Database },
                    { id: 'inbox', label: 'Incoming Inbox', icon: MessageSquare },
                    { id: 'webhooks', label: 'Webhook Logs', icon: FileText },
                    { id: 'test', label: 'Test Dispatcher', icon: Send },
                    { id: 'config', label: 'Configuration', icon: Settings }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            setError(null);
                            setSuccessMsg(null);
                        }}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                            activeTab === tab.id
                                ? "bg-white dark:bg-zinc-800 text-synos-primary shadow-sm"
                                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        )}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB CONTENT: DASHBOARD (ANALYTICS) */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    {/* Metric grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-zinc-900/40 border dark:border-zinc-850 p-6 rounded-2xl shadow-sm">
                            <span className="text-xxs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">WABA Connection Status</span>
                            <span className="text-lg font-black dark:text-white text-zinc-850 mt-1 block flex items-center gap-2">
                                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                                Active (Meta Cloud API)
                            </span>
                        </div>
                        <div className="bg-white dark:bg-zinc-900/40 border dark:border-zinc-850 p-6 rounded-2xl shadow-sm">
                            <span className="text-xxs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Average Delivery Speed</span>
                            <span className="text-lg font-black dark:text-white text-zinc-850 mt-1 block">
                                {analytics.averageDeliveryTime ? `${analytics.averageDeliveryTime.toFixed(1)}s` : '0.0s'}
                            </span>
                        </div>
                        <div className="bg-white dark:bg-zinc-900/40 border dark:border-zinc-850 p-6 rounded-2xl shadow-sm">
                            <span className="text-xxs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Delivery Success Rate</span>
                            <span className="text-lg font-black dark:text-white text-zinc-850 mt-1 block">
                                {(analytics.successRate * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div className="bg-white dark:bg-zinc-900/40 border dark:border-zinc-850 p-6 rounded-2xl shadow-sm">
                            <span className="text-xxs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">WABA Message Read Rate</span>
                            <span className="text-lg font-black dark:text-white text-zinc-850 mt-1 block">
                                {(analytics.readRate * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    {/* Timeline & Active Template List */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Timeline */}
                        <div className="bg-white dark:bg-zinc-900/40 border dark:border-zinc-850 p-6 rounded-2xl shadow-sm md:col-span-2">
                            <h3 className="text-xs font-black dark:text-white text-zinc-850 uppercase tracking-wider mb-4">Daily Volume (Last 7 Days)</h3>
                            <div className="h-48 flex items-end justify-between gap-4 pt-4 border-b dark:border-zinc-800 border-zinc-200">
                                {analytics.dailyTimeline.map((item, idx) => (
                                    <div key={idx} className="flex-1 flex flex-col items-center group">
                                        <div 
                                            className="w-full bg-synos-primary/20 dark:bg-synos-primary/10 group-hover:bg-synos-primary rounded-t-lg transition-all"
                                            style={{ height: `${Math.min(100, Math.max(8, (item.Count / 100) * 100))}%` }}
                                            title={`${item.Count} messages`}
                                        />
                                        <span className="text-[10px] text-zinc-400 font-bold mt-2">{item.Date.slice(5)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white dark:bg-zinc-900/40 border dark:border-zinc-850 p-6 rounded-2xl shadow-sm space-y-4">
                            <h3 className="text-xs font-black dark:text-white text-zinc-850 uppercase tracking-wider">Quick Actions</h3>
                            <button 
                                onClick={syncTemplates}
                                className="w-full py-2.5 px-4 bg-synos-primary hover:bg-synos-primary-dark text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Sync Meta Templates
                            </button>
                            <button 
                                onClick={() => setActiveTab('test')}
                                className="w-full py-2.5 px-4 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <Send className="w-3.5 h-3.5" />
                                Send Test Notification
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: OUTBOX QUEUE */}
            {activeTab === 'logs' && (
                <div className="space-y-4">
                    {/* Search and filters */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 border dark:border-zinc-800 rounded-xl px-3 py-1.5 bg-white dark:bg-zinc-950 w-full md:w-80">
                            <Search className="w-4 h-4 text-zinc-400" />
                            <input 
                                type="text"
                                placeholder="Search by recipient or template..."
                                value={logSearch}
                                onChange={e => setLogSearch(e.target.value)}
                                className="bg-transparent border-none text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none w-full"
                            />
                        </div>
                        <div className="flex gap-2">
                            {['', 'Pending', 'Sending', 'Sent', 'Delivered', 'Failed', 'Retry'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setLogStatus(status)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-xl text-xxs font-bold border transition-all",
                                        logStatus === status
                                            ? "bg-synos-primary text-white border-synos-primary"
                                            : "bg-white dark:bg-zinc-900/40 text-zinc-650 dark:text-zinc-400 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-950"
                                    )}
                                >
                                    {status || 'All Statuses'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white dark:bg-zinc-900/40 border dark:border-zinc-850 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/20 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                                    <th className="p-4">Recipient</th>
                                    <th className="p-4">Template</th>
                                    <th className="p-4">Created At</th>
                                    <th className="p-4">Attempts</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Last Error</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="p-8 text-center text-zinc-400 font-medium">No queue logs found matching criteria.</td>
                                    </tr>
                                ) : (
                                    filteredLogs.map(log => (
                                        <tr key={log.id} className="border-b dark:border-zinc-850/80 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/10">
                                            <td className="p-4 font-bold text-zinc-800 dark:text-zinc-200">{log.phone}</td>
                                            <td className="p-4 font-mono text-xxs bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded text-synos-primary">{log.messageType}</td>
                                            <td className="p-4 text-zinc-500">{new Date(log.createdAt).toLocaleString()}</td>
                                            <td className="p-4 font-bold">{log.retryCount}</td>
                                            <td className="p-4">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide",
                                                    log.status === 'Sent' && "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
                                                    log.status === 'Delivered' && "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
                                                    log.status === 'Failed' && "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400",
                                                    log.status === 'Pending' && "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
                                                    log.status === 'Sending' && "bg-indigo-50 text-indigo-650 dark:bg-indigo-950/30 dark:text-indigo-400 animate-pulse"
                                                )}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-rose-500 max-w-xs truncate" title={log.failureReason}>{log.failureReason || 'None'}</td>
                                            <td className="p-4 text-right space-x-2">
                                                {log.status === 'Failed' && (
                                                    <button 
                                                        onClick={() => retryLogItem(log.id)}
                                                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-600 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 rounded-lg text-xxs font-bold transition-all"
                                                    >
                                                        Retry
                                                    </button>
                                                )}
                                                {log.status === 'Pending' && (
                                                    <button 
                                                        onClick={() => cancelLogItem(log.id)}
                                                        className="px-2 py-1 bg-zinc-100 hover:bg-zinc-250 text-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg text-xxs font-bold transition-all"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: TEMPLATE REGISTRY */}
            {activeTab === 'templates' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-black dark:text-white text-zinc-850 uppercase tracking-wider">Approved Templates ({templates.length})</h3>
                        <button 
                            onClick={syncTemplates}
                            className="py-1.5 px-4 bg-synos-primary hover:bg-synos-primary-dark text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Sync Templates from Meta
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {templates.map(tmpl => (
                            <div key={tmpl.id} className="bg-white dark:bg-zinc-900/40 border dark:border-zinc-850 p-6 rounded-2xl shadow-sm space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="font-mono font-black text-xs text-synos-primary">{tmpl.templateName}</span>
                                        <div className="flex gap-2 mt-1">
                                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Lang: {tmpl.language}</span>
                                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Category: {tmpl.category}</span>
                                        </div>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                                        Approved
                                    </span>
                                </div>
                                <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border dark:border-zinc-900 text-xxs font-medium leading-relaxed font-mono">
                                    {tmpl.bodyPattern}
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Variable Mappings</span>
                                    <span className="text-xxs font-mono block truncate dark:text-zinc-400">{tmpl.variableMappingsJson}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: INBOX */}
            {activeTab === 'inbox' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Inbox list */}
                    <div className="bg-white dark:bg-zinc-900/40 border dark:border-zinc-850 rounded-2xl overflow-hidden shadow-sm md:col-span-1">
                        <div className="p-4 border-b dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/10">
                            <h3 className="text-xs font-black dark:text-white text-zinc-850 uppercase tracking-wider">Patient Replies</h3>
                        </div>
                        <div className="divide-y dark:divide-zinc-800">
                            {inbox.length === 0 ? (
                                <p className="p-8 text-center text-zinc-400 text-xs font-medium">No replies received yet.</p>
                            ) : (
                                inbox.map(item => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => {
                                            setReplyingTo(item);
                                            setError(null);
                                        }}
                                        className={cn(
                                            "p-4 cursor-pointer transition-all hover:bg-zinc-50 dark:hover:bg-zinc-950/20",
                                            replyingTo?.id === item.id && "bg-synos-primary/5 dark:bg-synos-primary/10 border-l-2 border-synos-primary"
                                        )}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-xs">{item.sender}</span>
                                            <span className="text-[10px] text-zinc-400 font-medium">{new Date(item.receivedAt).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="text-xxs text-zinc-650 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">{item.body}</p>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-[9px] text-zinc-400 font-bold">{new Date(item.receivedAt).toLocaleDateString()}</span>
                                            {item.processed ? (
                                                <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-0.5">
                                                    <Check className="w-2.5 h-2.5" /> Replied
                                                </span>
                                            ) : (
                                                <span className="text-[9px] text-amber-500 font-bold">Needs Reply</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Chat view / Reply */}
                    <div className="md:col-span-2 flex flex-col bg-white dark:bg-zinc-900/40 border dark:border-zinc-850 rounded-2xl overflow-hidden shadow-sm h-[500px]">
                        {replyingTo ? (
                            <div className="flex flex-col h-full">
                                {/* Chat Header */}
                                <div className="p-4 border-b dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-950/10">
                                    <div>
                                        <span className="font-bold text-xs text-zinc-850 dark:text-white block">{replyingTo.sender}</span>
                                        <span className="text-[10px] text-zinc-450">Active Customer Conversation</span>
                                    </div>
                                    <button onClick={() => setReplyingTo(null)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Messages list */}
                                <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                                    <div className="flex items-end gap-2.5 max-w-[80%]">
                                        <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl rounded-bl-none text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                                            {replyingTo.body}
                                            <span className="text-[8px] text-zinc-400 font-medium mt-1.5 block text-right">{new Date(replyingTo.receivedAt).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                    
                                    {replyingTo.processed && (
                                        <div className="flex items-end justify-end gap-2.5 max-w-[80%] ml-auto">
                                            <div className="p-3 bg-synos-primary/10 dark:bg-synos-primary/20 text-synos-primary rounded-2xl rounded-br-none text-xs leading-relaxed">
                                                System Response Sent
                                                <span className="text-[8px] text-synos-primary/70 font-medium mt-1.5 block text-right">Processed</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Reply Input Form */}
                                <form onSubmit={handleSendReply} className="p-4 border-t dark:border-zinc-800 flex gap-2">
                                    <input 
                                        type="text"
                                        placeholder="Type your WhatsApp message reply here..."
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        className="flex-1 bg-zinc-50 dark:bg-zinc-950/40 border dark:border-zinc-850 rounded-xl px-4 py-2 text-xs focus:outline-none text-zinc-800 dark:text-zinc-200"
                                    />
                                    <button 
                                        type="submit"
                                        disabled={isLoading || !replyText}
                                        className="px-4 py-2 bg-synos-primary hover:bg-synos-primary-dark text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        Send
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8">
                                <MessageSquare className="w-12 h-12 text-zinc-300 mb-2" />
                                <p className="text-xs font-medium">Select a patient message thread from the left to view details and reply.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: WEBHOOK LOGS */}
            {activeTab === 'webhooks' && (
                <div className="space-y-4">
                    <h3 className="text-xs font-black dark:text-white text-zinc-850 uppercase tracking-wider">Raw Webhook Event Logs (Last 100)</h3>
                    <div className="bg-white dark:bg-zinc-900/40 border dark:border-zinc-850 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/20 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                                    <th className="p-4">Received At</th>
                                    <th className="p-4">Message ID</th>
                                    <th className="p-4">Phone</th>
                                    <th className="p-4">Status Update</th>
                                    <th className="p-4">Payload Detail</th>
                                </tr>
                            </thead>
                            <tbody>
                                {webhooks.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-zinc-400 font-medium">No webhook payloads logged yet.</td>
                                    </tr>
                                ) : (
                                    webhooks.map(ev => (
                                        <tr key={ev.id} className="border-b dark:border-zinc-850/80 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/10">
                                            <td className="p-4 text-zinc-500">{new Date(ev.receivedAt).toLocaleString()}</td>
                                            <td className="p-4 font-mono text-xxs truncate max-w-xs">{ev.messageId || 'N/A'}</td>
                                            <td className="p-4 font-bold text-zinc-800 dark:text-zinc-200">{ev.phone || 'N/A'}</td>
                                            <td className="p-4">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide",
                                                    ev.status === 'delivered' && "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30",
                                                    ev.status === 'read' && "bg-blue-50 text-blue-650 dark:bg-blue-950/30",
                                                    ev.status === 'sent' && "bg-zinc-100 text-zinc-700 dark:bg-zinc-850",
                                                    ev.status === 'failed' && "bg-rose-50 text-rose-650 dark:bg-rose-950/30"
                                                )}>
                                                    {ev.status || 'Received'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <details className="cursor-pointer group">
                                                    <summary className="text-[10px] text-zinc-400 font-bold hover:text-synos-primary transition-colors select-none">View JSON Payload</summary>
                                                    <pre className="p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-lg mt-2 text-[10px] font-mono leading-relaxed max-w-lg overflow-x-auto border dark:border-zinc-900">
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

            {/* TAB CONTENT: TEST DISPATCHER */}
            {activeTab === 'test' && (
                <div className="max-w-xl bg-white dark:bg-zinc-900/40 border dark:border-zinc-850 p-6 rounded-2xl shadow-sm space-y-6">
                    <h3 className="text-xs font-black dark:text-white text-zinc-850 uppercase tracking-wider flex items-center gap-1.5">
                        <Send className="w-4 h-4 text-synos-primary" />
                        Send Custom Test Message
                    </h3>
                    <form onSubmit={handleSendTest} className="space-y-4">
                        <div>
                            <label className="block text-xxs font-bold text-zinc-400 mb-1.5 uppercase tracking-wide">Recipient Phone (with Country Code)</label>
                            <input 
                                type="text"
                                required
                                placeholder="e.g. +919988776655"
                                value={testPhone}
                                onChange={e => setTestPhone(e.target.value)}
                                className="w-full bg-zinc-50 dark:bg-zinc-950/40 border dark:border-zinc-850 rounded-xl px-4 py-2.5 text-xs focus:outline-none text-zinc-800 dark:text-zinc-200"
                            />
                        </div>

                        <div>
                            <label className="block text-xxs font-bold text-zinc-400 mb-1.5 uppercase tracking-wide">Select Template</label>
                            <select 
                                required
                                value={selectedTemplate}
                                onChange={e => {
                                    setSelectedTemplate(e.target.value);
                                    setTestVariables({});
                                }}
                                className="w-full bg-zinc-50 dark:bg-zinc-950/40 border dark:border-zinc-850 rounded-xl px-4 py-2.5 text-xs focus:outline-none text-zinc-850 dark:text-zinc-350"
                            >
                                <option value="">-- Choose an approved template --</option>
                                {templates.map(tmpl => (
                                    <option key={tmpl.id} value={tmpl.templateName}>{tmpl.templateName} ({tmpl.language})</option>
                                ))}
                            </select>
                        </div>

                        {selectedTemplate && (
                            <div className="space-y-3 p-4 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl border dark:border-zinc-850">
                                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Template Variables Form</h4>
                                {(() => {
                                    const tmpl = templates.find(t => t.templateName === selectedTemplate);
                                    if (!tmpl) return null;
                                    const mappedParams = JSON.parse(tmpl.variableMappingsJson || '[]');
                                    
                                    return mappedParams.map(param => (
                                        <div key={param}>
                                            <label className="block text-[10px] font-bold text-zinc-500 mb-1 font-mono">{param}</label>
                                            <input 
                                                type="text"
                                                required
                                                placeholder={`Value for ${param}`}
                                                value={testVariables[param] || ''}
                                                onChange={e => setTestVariables({
                                                    ...testVariables,
                                                    [param]: e.target.value
                                                })}
                                                className="w-full bg-white dark:bg-zinc-950 border dark:border-zinc-850 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                                            />
                                        </div>
                                    ));
                                })()}
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={isLoading || !selectedTemplate || !testPhone}
                            className="w-full py-2.5 px-4 bg-synos-primary hover:bg-synos-primary-dark text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Send className="w-3.5 h-3.5" />
                            Dispatch Notification
                        </button>
                    </form>
                </div>
            )}

            {/* TAB CONTENT: CONFIGURATION */}
            {activeTab === 'config' && (
                <div className="max-w-xl bg-white dark:bg-zinc-900/40 border dark:border-zinc-850 p-6 rounded-2xl shadow-sm space-y-6">
                    <h3 className="text-xs font-black dark:text-white text-zinc-850 uppercase tracking-wider flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-synos-primary" />
                        Meta Cloud API Configuration
                    </h3>
                    <form onSubmit={saveConfig} className="space-y-4">
                        <div>
                            <label className="block text-xxs font-bold text-zinc-400 mb-1.5 uppercase tracking-wide">System Callback Endpoint URL (Read-Only)</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="text"
                                    readOnly
                                    value={config.callbackUrl}
                                    className="w-full bg-zinc-100 dark:bg-zinc-900 border dark:border-zinc-850 rounded-xl px-4 py-2.5 text-xs focus:outline-none text-zinc-500 font-mono select-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xxs font-bold text-zinc-400 mb-1.5 uppercase tracking-wide">Graph API Version</label>
                            <select 
                                value={config.graphApiVersion}
                                onChange={e => setConfig({ ...config, graphApiVersion: e.target.value })}
                                className="w-full bg-zinc-50 dark:bg-zinc-950/40 border dark:border-zinc-850 rounded-xl px-4 py-2.5 text-xs focus:outline-none text-zinc-850 dark:text-zinc-350"
                            >
                                <option value="v20.0">v20.0 (Recommended)</option>
                                <option value="v21.0">v21.0</option>
                                <option value="v22.0">v22.0</option>
                                <option value="v25.0">v25.0</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xxs font-bold text-zinc-400 mb-1.5 uppercase tracking-wide">Verify Token (for Webhook setup)</label>
                            <input 
                                type="text"
                                placeholder="Enter webhook verify token"
                                value={config.verifyToken}
                                onChange={e => setConfig({ ...config, verifyToken: e.target.value })}
                                className="w-full bg-zinc-50 dark:bg-zinc-950/40 border dark:border-zinc-850 rounded-xl px-4 py-2.5 text-xs focus:outline-none text-zinc-800 dark:text-zinc-200"
                            />
                        </div>

                        <div>
                            <label className="block text-xxs font-bold text-zinc-400 mb-1.5 uppercase tracking-wide">Phone Number ID</label>
                            <input 
                                type="text"
                                placeholder="e.g. 102938475610293"
                                value={config.phoneNumberId}
                                onChange={e => setConfig({ ...config, phoneNumberId: e.target.value })}
                                className="w-full bg-zinc-50 dark:bg-zinc-950/40 border dark:border-zinc-850 rounded-xl px-4 py-2.5 text-xs focus:outline-none text-zinc-800 dark:text-zinc-200"
                            />
                        </div>

                        <div>
                            <label className="block text-xxs font-bold text-zinc-400 mb-1.5 uppercase tracking-wide">Business Account ID</label>
                            <input 
                                type="text"
                                placeholder="e.g. 987654321012345"
                                value={config.businessAccountId}
                                onChange={e => setConfig({ ...config, businessAccountId: e.target.value })}
                                className="w-full bg-zinc-50 dark:bg-zinc-950/40 border dark:border-zinc-850 rounded-xl px-4 py-2.5 text-xs focus:outline-none text-zinc-800 dark:text-zinc-200"
                            />
                        </div>

                        <div>
                            <label className="block text-xxs font-bold text-zinc-400 mb-1.5 uppercase tracking-wide block flex items-center gap-1">
                                <Lock className="w-3 h-3 text-zinc-400" /> WABA Permanent Access Token
                            </label>
                            <input 
                                type="password"
                                placeholder={config.accessToken ? "••••••••••••••••••••" : "Enter long-lived Access Token"}
                                value={config.accessToken}
                                onChange={e => setConfig({ ...config, accessToken: e.target.value })}
                                className="w-full bg-zinc-50 dark:bg-zinc-950/40 border dark:border-zinc-850 rounded-xl px-4 py-2.5 text-xs focus:outline-none text-zinc-800 dark:text-zinc-200"
                            />
                        </div>

                        <div>
                            <label className="block text-xxs font-bold text-zinc-400 mb-1.5 uppercase tracking-wide block flex items-center gap-1">
                                <Lock className="w-3 h-3 text-zinc-400" /> App Secret
                            </label>
                            <input 
                                type="password"
                                placeholder={config.appSecret ? "••••••••••••••••" : "Enter App Secret"}
                                value={config.appSecret}
                                onChange={e => setConfig({ ...config, appSecret: e.target.value })}
                                className="w-full bg-zinc-50 dark:bg-zinc-950/40 border dark:border-zinc-850 rounded-xl px-4 py-2.5 text-xs focus:outline-none text-zinc-800 dark:text-zinc-200"
                            />
                        </div>

                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2.5 px-4 bg-synos-primary hover:bg-synos-primary-dark text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                        >
                            <Settings className="w-3.5 h-3.5" />
                            Save Configuration
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
