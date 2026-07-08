import React, { useState } from 'react';

interface SupportTicket {
    id: string;
    labId: string;
    title: string;
    description: string;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    category: string;
    status: 'Created' | 'InAnalysis' | 'WaitingForUpdate' | 'Closed';
    createdAt: string;
    caseId?: string;
}

interface SupportCase {
    id: string;
    caseNumber: string;
    title: string;
    status: 'Open' | 'InProgress' | 'Resolved' | 'Closed';
}

interface KnownIssue {
    id: string;
    title: string;
    fingerprint: string;
    workaround: string;
}

const SupportTicketsTab: React.FC = () => {
    const [tickets, setTickets] = useState<SupportTicket[]>([
        { id: 'TKT-7821', labId: 'LAB001', title: 'Database backup failed', description: 'Exception: Disk space exceeded on D: snapshot directory.', priority: 'High', category: 'Backup', status: 'InAnalysis', createdAt: '2026-07-06 12:00', caseId: 'CASE-4412' },
        { id: 'TKT-7822', labId: 'LAB002', title: 'WhatsApp dispatch failed', description: 'Error parsing template Variables payload: PatientName is empty.', priority: 'Medium', category: 'Notifications', status: 'Created', createdAt: '2026-07-06 10:15' },
        { id: 'TKT-7823', labId: 'LAB001', title: 'Application crash during update', description: 'Exception: CS8601 possible null reference assignment on startup.', priority: 'Critical', category: 'Crash', status: 'WaitingForUpdate', createdAt: '2026-07-06 08:30', caseId: 'CASE-4413' }
    ]);

    const [cases] = useState<SupportCase[]>([
        { id: 'CASE-4412', caseNumber: 'CASE-4412', title: 'Widespread Backup Failures', status: 'Open' },
        { id: 'CASE-4413', caseNumber: 'CASE-4413', title: 'Spooler Thread Regressions', status: 'InProgress' }
    ]);

    const [knownIssues, setKnownIssues] = useState<KnownIssue[]>([
        { id: 'KI-001', title: 'Print Spooler NullReferenceException', fingerprint: 'PrintLabelSpooler', workaround: 'Restart the background print spooler worker thread.' },
        { id: 'KI-002', title: 'Disk Space Outage on Backup Drive', fingerprint: 'Disk space exceeded', workaround: 'Clean backup retention folders or expand D: partition.' }
    ]);

    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(tickets[0]);
    const [newKiTitle, setNewKiTitle] = useState('');
    const [newKiFingerprint, setNewKiFingerprint] = useState('');
    const [newKiWorkaround, setNewKiWorkaround] = useState('');

    const groupUnderCase = (ticketId: string, caseId: string) => {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, caseId } : t));
        if (selectedTicket && selectedTicket.id === ticketId) {
            setSelectedTicket(prev => prev ? { ...prev, caseId } : null);
        }
        alert(`Ticket ${ticketId} linked to Support Case ${caseId}.`);
    };

    const addKnownIssue = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKiTitle || !newKiFingerprint) return;

        const newKi: KnownIssue = {
            id: `KI-00${knownIssues.length + 1}`,
            title: newKiTitle,
            fingerprint: newKiFingerprint,
            workaround: newKiWorkaround
        };

        setKnownIssues(prev => [...prev, newKi]);
        setNewKiTitle('');
        setNewKiFingerprint('');
        setNewKiWorkaround('');
        alert('Known Issue added to Operations Knowledge Base.');
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

                                {/* Case Triage controls */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">Triage Case Association</h4>
                                    <div className="flex items-center space-x-3">
                                        <select 
                                            value={selectedTicket.caseId || ''} 
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
                                                <p className="text-[10px] text-textSecondary font-mono">Fingerprint: {ki.fingerprint}</p>
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
        </div>
    );
};

export default SupportTicketsTab;
