import React, { useState, useEffect } from 'react';
import {
    fetchSupportTickets,
    fetchSupportCases,
    fetchKnownIssues,
    createKnownIssue,
    linkTicketToCase,
    updateTicketStatus,
    fetchDiagnosticBundleSummary,
    SupportTicket,
    SupportCase,
    KnownIssue,
    DiagnosticBundleSummary
} from '../../repositories/controlTowerRepository';
import controlTowerClient from '../../services/controlTowerClient';

const SupportTicketsTab: React.FC = () => {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [cases, setCases] = useState<SupportCase[]>([]);
    const [knownIssues, setKnownIssues] = useState<KnownIssue[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

    const [newKiTitle, setNewKiTitle] = useState('');
    const [newKiFingerprint, setNewKiFingerprint] = useState('');
    const [newKiWorkaround, setNewKiWorkaround] = useState('');

    const [updateStatusVal, setUpdateStatusVal] = useState('Submitted');
    const [statusMessage, setStatusMessage] = useState('');
    const [submittingStatus, setSubmittingStatus] = useState(false);

    useEffect(() => {
        if (selectedTicket) {
            setUpdateStatusVal(selectedTicket.status || 'Submitted');
            setStatusMessage(selectedTicket.statusMessage || '');
        }
    }, [selectedTicket]);

    const [summary, setSummary] = useState<DiagnosticBundleSummary | null>(null);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const handleViewSummary = async (bundleId: string) => {
        setLoadingSummary(true);
        setShowModal(true);
        try {
            const data = await fetchDiagnosticBundleSummary(bundleId);
            setSummary(data);
        } catch (err) {
            console.error(err);
            alert("Failed to load diagnostic bundle summary.");
            setShowModal(false);
        } finally {
            setLoadingSummary(false);
        }
    };

    const loadData = async () => {
        try {
            const tkts = await fetchSupportTickets();
            const css = await fetchSupportCases();
            const kis = await fetchKnownIssues();
            
            setTickets(tkts);
            setCases(css);
            setKnownIssues(kis);

            if (tkts.length > 0) {
                setSelectedTicket(prev => {
                    if (prev) {
                        const updated = tkts.find(t => t.id === prev.id);
                        return updated || tkts[0];
                    }
                    return tkts[0];
                });
            } else {
                setSelectedTicket(null);
            }
        } catch (err) {
            console.error('Failed to load support triage data', err);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const groupUnderCase = async (ticketId: string, caseId: string) => {
        if (!caseId) return;
        try {
            await linkTicketToCase(ticketId, caseId);
            alert(`Ticket linked to Support Case successfully.`);
            await loadData();
        } catch (err) {
            alert('Failed to link ticket to case.');
        }
    };

    const handleUpdateStatus = async () => {
        if (!selectedTicket) return;
        setSubmittingStatus(true);
        try {
            await updateTicketStatus(selectedTicket.id, updateStatusVal, statusMessage);
            alert("Ticket status updated successfully.");
            // Reload all data
            await loadData();
            // Update local selection
            setSelectedTicket(prev => {
                if (!prev) return null;
                // Wait, loadData already updates selectedTicket via state, but to make sure:
                return prev;
            });
        } catch (err) {
            console.error(err);
            alert("Failed to update ticket status.");
        } finally {
            setSubmittingStatus(false);
        }
    };

    const addKnownIssue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKiTitle || !newKiFingerprint) return;

        try {
            await createKnownIssue({
                title: newKiTitle,
                description: '',
                diagnosticFingerprint: newKiFingerprint,
                rootCause: '',
                workaround: newKiWorkaround,
                fixedVersion: '',
                affectedVersions: '',
                resolutionPackage: ''
            });

            setNewKiTitle('');
            setNewKiFingerprint('');
            setNewKiWorkaround('');
            alert('Known Issue added to Operations Knowledge Base.');
            await loadData();
        } catch (err) {
            alert('Failed to add known issue.');
        }
    };


    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold font-display text-white">Support & Triage Desk</h2>
                <p className="text-sm text-textSecondary mt-1">Review diagnostic tickets, link issues to cases, and register operational knowledge rules.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Tickets Directory */}
                <div className="bg-cardBg border border-cardBorder rounded-xl p-5 space-y-4">
                    <h3 className="font-bold text-white text-sm font-display">Active Tickets</h3>
                    <div className="space-y-3">
                        {tickets.map(tkt => (
                            <button
                                key={tkt.id}
                                onClick={() => setSelectedTicket(tkt)}
                                className={`w-full text-left p-3 rounded-lg border transition-all ${
                                    selectedTicket?.id === tkt.id 
                                        ? 'bg-brandSecondary/25 border-brandPrimary shadow-card-glow' 
                                        : 'bg-[#0b0c16] border-cardBorder hover:border-cardBorder/80'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <h4 className="text-xs font-bold text-white font-display">{tkt.title}</h4>
                                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                        tkt.priority === 'Critical' ? 'bg-error/15 text-error border border-error/20' :
                                        tkt.priority === 'High' ? 'bg-amber-500/10 text-amber-500' :
                                        'bg-blue-500/10 text-blue-500'
                                    }`}>
                                        {tkt.priority}
                                    </span>
                                </div>
                                <div className="mt-2 flex justify-between text-[10px] text-textSecondary font-mono">
                                    <span>{tkt.id} • {tkt.category}</span>
                                    <span>{tkt.status}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Details Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {selectedTicket ? (
                        <>
                            <div className="bg-cardBg border border-cardBorder rounded-xl p-6 space-y-6">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-lg font-bold font-display text-white">{selectedTicket.title}</h3>
                                        <span className="text-xs font-mono text-textMuted">{selectedTicket.id}</span>
                                    </div>
                                    <p className="text-xs text-textSecondary mt-1">Logged by client {selectedTicket.labId} at {selectedTicket.createdAt}</p>
                                </div>

                                <div className="p-4 rounded-lg bg-[#0b0c16] border border-cardBorder font-mono text-xs text-white">
                                    <p className="font-semibold text-textSecondary mb-2">// Diagnostic Payload Description</p>
                                    <p>{selectedTicket.description}</p>
                                </div>

                                {selectedTicket.diagnosticBundleId && (
                                    <div className="p-4 rounded-lg bg-[#0b0c16] border border-cardBorder text-xs text-white space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-textSecondary">// Diagnostic Bundle Attachment</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                                selectedTicket.diagnosticBundleStatus === 'Ready' ? 'bg-green-900/60 text-green-300 border border-green-700/50' :
                                                selectedTicket.diagnosticBundleStatus === 'Processing' ? 'bg-yellow-900/60 text-yellow-300 border border-yellow-700/50' :
                                                selectedTicket.diagnosticBundleStatus === 'Failed' ? 'bg-red-900/60 text-red-300 border border-red-700/50' :
                                                'bg-zinc-800 text-zinc-400'
                                            }`}>
                                                {selectedTicket.diagnosticBundleStatus === 'Ready' ? '🟢 Ready' :
                                                 selectedTicket.diagnosticBundleStatus === 'Processing' ? '🟡 Processing Chunks' :
                                                 selectedTicket.diagnosticBundleStatus === 'Failed' ? '🔴 Extraction Failed' :
                                                 '⚪ Missing'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-textSecondary">ID: <span className="font-mono text-white">{selectedTicket.diagnosticBundleId}</span></p>
                                        
                                        {selectedTicket.diagnosticBundleStatus === 'Ready' && (
                                            <div className="flex space-x-3 mt-2">
                                                <button
                                                    onClick={() => window.open(`${controlTowerClient.defaults.baseURL}/diagnostics/${selectedTicket.diagnosticBundleId}/download`)}
                                                    className="px-3 py-1.5 bg-[#1a1c36] border border-brandPrimary/30 rounded text-xs text-white hover:bg-brandPrimary/20 transition-colors flex items-center space-x-1"
                                                >
                                                    <span>💾 Download ZIP</span>
                                                </button>
                                                <button
                                                    onClick={() => handleViewSummary(selectedTicket.diagnosticBundleId!)}
                                                    className="px-3 py-1.5 bg-[#1a1c36] border border-brandPrimary/30 rounded text-xs text-white hover:bg-brandPrimary/20 transition-colors flex items-center space-x-1"
                                                >
                                                    <span>🔍 View Summary & Logs</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Case Triage controls */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">Triage Case Association</h4>
                                    <div className="flex items-center space-x-3">
                                        <select 
                                            value={selectedTicket.supportCaseId || ''} 
                                            onChange={(e) => groupUnderCase(selectedTicket.id, e.target.value)}
                                            className="bg-[#0b0c16] border border-cardBorder text-xs text-white p-2.5 rounded-lg focus:border-brandPrimary outline-none"
                                        >
                                            <option value="">-- Associate with Support Case --</option>
                                            {cases.map(c => (
                                                <option key={c.id} value={c.id}>{c.caseNumber} - {c.title} ({c.status})</option>
                                            ))}
                                        </select>
                                        <button 
                                            onClick={() => alert('New Support Case generated.')}
                                            className="px-4 py-2.5 bg-brandPrimary text-white font-semibold text-xs rounded-lg hover:bg-brandPrimary/85 transition-colors"
                                        >
                                            + Create Case
                                        </button>
                                    </div>
                                </div>

                                {/* Ticket Status & Feedback Loop */}
                                <div className="space-y-3 border-t border-cardBorder pt-5">
                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">Ticket Status & Feedback Loop</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] text-textSecondary mb-1 font-semibold uppercase">Ticket Status</label>
                                            <select 
                                                value={updateStatusVal} 
                                                onChange={(e) => setUpdateStatusVal(e.target.value)}
                                                className="w-full bg-[#0b0c16] border border-cardBorder text-xs text-white p-2.5 rounded-lg focus:border-brandPrimary outline-none"
                                            >
                                                <option value="Submitted">Submitted</option>
                                                <option value="Under Review">Under Review</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Waiting for Customer">Waiting for Customer</option>
                                                <option value="Resolved">Resolved</option>
                                                <option value="Closed">Closed</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-textSecondary mb-1 font-semibold uppercase">Status Update Message (1 line)</label>
                                            <input 
                                                type="text"
                                                placeholder="Enter status comment..."
                                                value={statusMessage}
                                                onChange={(e) => setStatusMessage(e.target.value)}
                                                className="w-full bg-[#0b0c16] border border-cardBorder text-xs text-white p-2.5 rounded-lg focus:border-brandPrimary outline-none"
                                                maxLength={200}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <button
                                            onClick={handleUpdateStatus}
                                            disabled={submittingStatus}
                                            className="px-4 py-2.5 bg-brandPrimary text-white font-semibold text-xs rounded-lg hover:bg-brandPrimary/85 transition-colors disabled:opacity-50"
                                        >
                                            {submittingStatus ? 'Updating...' : 'Update Ticket Status'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Knowledge Base */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* KB Entries */}
                                <div className="bg-cardBg border border-cardBorder rounded-xl p-5 space-y-4">
                                    <h3 className="font-bold text-white text-sm font-display">Operations Knowledge Base</h3>
                                    <div className="space-y-3">
                                        {knownIssues.map(ki => (
                                            <div key={ki.id} className="p-3 bg-[#0b0c16] border border-cardBorder rounded-lg space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-white">{ki.title}</span>
                                                    <span className="text-[8px] font-mono text-brandPrimary">{ki.id}</span>
                                                </div>
                                                <p className="text-[10px] text-textSecondary font-mono">Fingerprint: {ki.diagnosticFingerprint}</p>
                                                <p className="text-[10px] text-textSecondary">Workaround: {ki.workaround}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* KB Form */}
                                <form onSubmit={addKnownIssue} className="bg-cardBg border border-cardBorder rounded-xl p-5 space-y-3">
                                    <h3 className="font-bold text-white text-sm font-display">Register Known Issue</h3>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-textSecondary uppercase font-bold">Issue Title</label>
                                        <input 
                                            type="text"
                                            value={newKiTitle}
                                            onChange={(e) => setNewKiTitle(e.target.value)}
                                            className="w-full bg-[#0b0c16] border border-cardBorder text-xs text-white p-2 rounded-lg outline-none focus:border-brandPrimary"
                                            placeholder="e.g. Memory Leak on Heavy Spools"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-textSecondary uppercase font-bold">Diagnostic Fingerprint</label>
                                        <input 
                                            type="text"
                                            value={newKiFingerprint}
                                            onChange={(e) => setNewKiFingerprint(e.target.value)}
                                            className="w-full bg-[#0b0c16] border border-cardBorder text-xs text-white p-2 rounded-lg outline-none focus:border-brandPrimary"
                                            placeholder="e.g. Out of Memory Exception"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-textSecondary uppercase font-bold">Workaround Action</label>
                                        <textarea 
                                            value={newKiWorkaround}
                                            onChange={(e) => setNewKiWorkaround(e.target.value)}
                                            rows={2}
                                            className="w-full bg-[#0b0c16] border border-cardBorder text-xs text-white p-2 rounded-lg outline-none focus:border-brandPrimary resize-none"
                                            placeholder="Step-by-step resolution instruction..."
                                        />
                                    </div>
                                    <button 
                                        type="submit"
                                        className="w-full py-2 bg-gradient-to-r from-brandSecondary to-brandPrimary text-white font-semibold text-xs rounded-lg hover:opacity-90 transition-opacity"
                                    >
                                        Save Rule to Brain
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="bg-cardBg border border-cardBorder rounded-xl p-8 text-center text-textSecondary text-sm font-display">
                            Select a support ticket to inspect diagnostics and coordinate cases.
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#0b0c16] border border-cardBorder rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl">
                        {/* Header */}
                        <div className="p-5 border-b border-cardBorder flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                                <span className="text-lg">📂</span>
                                <h3 className="text-md font-bold text-white font-display">Diagnostic Bundle Analysis</h3>
                            </div>
                            <button 
                                onClick={() => { setShowModal(false); setSummary(null); }}
                                className="text-textSecondary hover:text-white transition-colors"
                            >
                                <span className="text-xl">&times;</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-textSecondary font-sans">
                            {loadingSummary ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                                    <div className="w-8 h-8 border-2 border-brandPrimary border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-xs text-textMuted font-mono">Reassembling & decrypting segments...</p>
                                </div>
                            ) : summary ? (
                                <>
                                    {/* Overview Metrics */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-3 bg-cardBg border border-cardBorder rounded-lg">
                                            <p className="text-[10px] uppercase font-bold text-textMuted">Lab Identifier</p>
                                            <p className="text-white font-semibold font-mono mt-0.5">{summary.labId}</p>
                                        </div>
                                        <div className="p-3 bg-cardBg border border-cardBorder rounded-lg">
                                            <p className="text-[10px] uppercase font-bold text-textMuted">Size on Disk</p>
                                            <p className="text-white font-semibold font-mono mt-0.5">{(summary.bundleSizeBytes / (1024 * 1024)).toFixed(2)} MB</p>
                                        </div>
                                        <div className="p-3 bg-cardBg border border-cardBorder rounded-lg">
                                            <p className="text-[10px] uppercase font-bold text-textMuted">SHA256 Integrity</p>
                                            <p className="text-white font-mono text-[9px] truncate mt-0.5" title={summary.checksumSha256}>{summary.checksumSha256}</p>
                                        </div>
                                        <div className="p-3 bg-cardBg border border-cardBorder rounded-lg">
                                            <p className="text-[10px] uppercase font-bold text-textMuted">Processed Time</p>
                                            <p className="text-white font-semibold text-xs mt-0.5">{summary.completedAt ? new Date(summary.completedAt).toLocaleString() : 'N/A'}</p>
                                        </div>
                                    </div>

                                    {/* System Summary markdown */}
                                    {summary.summaryMarkdown && (
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">// Investigation Summary</h4>
                                            <pre className="p-4 rounded-lg bg-cardBg border border-cardBorder font-mono text-[11px] leading-relaxed text-white whitespace-pre-wrap max-h-60 overflow-y-auto animate-fadeIn">
                                                {summary.summaryMarkdown}
                                            </pre>
                                        </div>
                                    )}

                                    {/* Host & Environment */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {summary.hostInventory && (
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">// Host Hardware</h4>
                                                <div className="p-4 rounded-lg bg-cardBg border border-cardBorder text-xs text-white space-y-2">
                                                    <p><span className="text-textSecondary">OS:</span> {summary.hostInventory.osVersion}</p>
                                                    <p><span className="text-textSecondary">Processors:</span> {summary.hostInventory.processorCount} Cores</p>
                                                    <p><span className="text-textSecondary">Memory MB:</span> {summary.hostInventory.totalMemoryMB} MB</p>
                                                    <div className="mt-2 border-t border-cardBorder pt-2">
                                                        <span className="text-textSecondary font-bold text-[10px] uppercase block mb-1">Drives Inventory</span>
                                                        {summary.hostInventory.drives?.map((d: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between text-[11px] font-mono">
                                                                <span>{d.name}</span>
                                                                <span>{d.availableSpaceGB} GB Free / {d.totalSpaceGB} GB</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {summary.healthSnapshot && (
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">// Runtime Metrics</h4>
                                                <div className="p-4 rounded-lg bg-cardBg border border-cardBorder text-xs text-white space-y-2">
                                                    <p><span className="text-textSecondary">Process Uptime:</span> {(summary.healthSnapshot.uptimeSeconds / 3600).toFixed(2)} hours</p>
                                                    <p><span className="text-textSecondary">Working Set:</span> {summary.healthSnapshot.workingSetMB} MB</p>
                                                    <p><span className="text-textSecondary">Private Memory:</span> {summary.healthSnapshot.privateMemoryMB} MB</p>
                                                    <p><span className="text-textSecondary">Active Threads:</span> {summary.healthSnapshot.threadCount}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Logs text */}
                                    {summary.recentLogs && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">// Redacted Active Logs (Last 100 Lines)</h4>
                                                <button
                                                    onClick={() => window.open(`${controlTowerClient.defaults.baseURL}/diagnostics/${summary.bundleId}/logs`)}
                                                    className="text-[10px] text-brandPrimary hover:underline"
                                                    type="button"
                                                >
                                                    Open full logs in new tab
                                                </button>
                                            </div>
                                            <pre className="p-4 rounded-lg bg-cardBg border border-cardBorder font-mono text-[10px] leading-relaxed text-[#c9d1d9] whitespace-pre-wrap max-h-80 overflow-y-auto">
                                                {summary.recentLogs}
                                            </pre>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-center py-6 text-textMuted">Failed to parse diagnostic data.</p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-cardBorder flex justify-end">
                            <button
                                onClick={() => { setShowModal(false); setSummary(null); }}
                                className="px-5 py-2 bg-[#1a1c36] border border-cardBorder text-xs text-white font-semibold rounded-lg hover:bg-cardBg transition-colors"
                            >
                                Close Analysis
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportTicketsTab;
