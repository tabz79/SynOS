import React, { useState, useEffect } from 'react';
import {
    fetchRemoteLabs,
    fetchLabTimeline,
    dispatchLabCommand,
    updateLabRolloutRing,
    RemoteLab,
    TimelineEvent
} from '../../repositories/controlTowerRepository';

const RemoteOpsTab: React.FC = () => {
    const [labs, setLabs] = useState<RemoteLab[]>([]);
    const [selectedLab, setSelectedLab] = useState<RemoteLab | null>(null);
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [commandLogs, setCommandLogs] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadLabs = async () => {
        try {
            const data = await fetchRemoteLabs();
            setLabs(data);
            if (data.length > 0) {
                setSelectedLab(prev => {
                    if (prev) {
                        const updated = data.find(l => l.id === prev.id);
                        return updated || data[0];
                    }
                    return data[0];
                });
            } else {
                setSelectedLab(null);
            }
        } catch (err) {
            console.error('Failed to load labs directory', err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadTimeline = async (labId: string) => {
        try {
            const events = await fetchLabTimeline(labId);
            setTimeline(events);

            // Populate command logs from timeline/commands
            const commands = events.filter(e => e.type === 'Operations');
            const logs = commands.map(c => `${c.time}: Command activity - ${c.description}`);
            setCommandLogs(logs);
        } catch (err) {
            console.error('Failed to load lab timeline', err);
        }
    };

    useEffect(() => {
        loadLabs();
        const interval = setInterval(() => {
            loadLabs();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedLab) {
            loadTimeline(selectedLab.id);
            const interval = setInterval(() => {
                loadTimeline(selectedLab.id);
            }, 10000);
            return () => clearInterval(interval);
        } else {
            setTimeline([]);
            setCommandLogs([]);
        }
    }, [selectedLab?.id]);

    const triggerCommand = async (commandType: string) => {
        if (!selectedLab) return;

        try {
            await dispatchLabCommand({
                labId: selectedLab.id,
                commandType: commandType,
                payloadJson: '{}'
            });

            alert(`Command [${commandType}] queued successfully in database.`);
            // Automatically refresh timeline and logs from backend
            await loadTimeline(selectedLab.id);
        } catch (err) {
            alert('Failed to queue command.');
        }
    };

    const handleUpdateRolloutRing = async (labId: string, ring: string) => {
        try {
            await updateLabRolloutRing(labId, ring);
            alert(`Lab rollout ring successfully updated to [${ring}].`);
            await loadLabs();
        } catch (err) {
            alert('Failed to update lab rollout ring.');
        }
    };


    const getRingBadgeIcon = (ring: string) => {
        switch (ring) {
            case 'Canary': return '🟣';
            case 'Early': return '🟡';
            case 'Production': return '🟢';
            case 'Disabled': return '🔴';
            default: return '⚪';
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold font-display text-white">Remote Operations Control</h2>
                <p className="text-sm text-textSecondary mt-1">Directly trigger, schedule, and verify configurations on deployed client environments.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Labs Directory Panel */}
                <div className="bg-cardBg border border-cardBorder rounded-xl p-5 space-y-4">
                    <h3 className="font-bold text-white text-sm font-display">Lab Directory</h3>
                    <div className="space-y-3">
                        {isLoading ? (
                            <div className="text-xs text-textSecondary font-mono py-4 text-center">Loading labs...</div>
                        ) : labs.length === 0 ? (
                            <div className="text-xs text-textSecondary font-mono py-4 text-center">No labs registered.</div>
                        ) : (
                            labs.map(lab => (
                                <button
                                    key={lab.id}
                                    onClick={() => setSelectedLab(lab)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                                        selectedLab?.id === lab.id 
                                            ? 'bg-brandSecondary/25 border-brandPrimary shadow-card-glow' 
                                            : 'bg-[#0b0c16] border-cardBorder hover:border-cardBorder/80'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-xs font-bold text-white font-display">
                                            {getRingBadgeIcon(lab.rolloutRing)} {lab.labName}
                                        </h4>
                                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                            lab.status === 'Online' ? 'bg-success/10 text-success' :
                                            lab.status === 'Degraded' ? 'bg-amber-500/10 text-amber-500' :
                                            'bg-textMuted/15 text-textMuted'
                                        }`}>
                                            {lab.status}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex justify-between text-[10px] text-textSecondary font-mono">
                                        <span>{lab.id} • {lab.geographicalRegion}</span>
                                        <span>v{lab.activeVersion}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Details & Actions Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {selectedLab ? (
                        <>
                            {/* Selected Lab Overview */}
                            <div className="bg-cardBg border border-cardBorder rounded-xl p-6">
                                <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-cardBorder pb-4 mb-4 gap-4">
                                    <div>
                                        <h3 className="text-lg font-bold font-display text-white">{selectedLab.labName}</h3>
                                        <p className="text-xs text-textSecondary mt-0.5 font-mono">{selectedLab.id} • {selectedLab.geographicalRegion}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-textSecondary">OS:</span>
                                            <span className="text-white font-semibold">{selectedLab.osVersion}</span>
                                        </div>
                                        <div className="flex items-center space-x-2 border-l border-cardBorder pl-4">
                                            <span className="text-textSecondary">Rollout Ring:</span>
                                            <span className="mr-1">{getRingBadgeIcon(selectedLab.rolloutRing)}</span>
                                            <select
                                                value={selectedLab.rolloutRing || ''}
                                                onChange={(e) => handleUpdateRolloutRing(selectedLab.id, e.target.value)}
                                                className="bg-[#0b0c16] border border-cardBorder rounded px-2 py-1 text-white font-semibold text-xs outline-none focus:border-brandPrimary"
                                            >
                                                <option value="">Unconfigured (Production Only)</option>
                                                <option value="Canary">Canary (All Rings)</option>
                                                <option value="Early">Early Adopters</option>
                                                <option value="Production">Production</option>
                                                <option value="Disabled">Disabled (No Updates)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Active Controls Grid */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">Command Dispatcher</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <button 
                                            onClick={() => triggerCommand('GenerateDiagnostics')}
                                            className="px-3 py-2 bg-[#0b0c16] border border-cardBorder hover:border-brandPrimary/50 text-xs font-semibold rounded-lg text-white text-center transition-colors"
                                        >
                                            🔍 Diagnostics
                                        </button>
                                        <button 
                                            onClick={() => triggerCommand('RequestHealthSnapshot')}
                                            className="px-3 py-2 bg-[#0b0c16] border border-cardBorder hover:border-brandPrimary/50 text-xs font-semibold rounded-lg text-white text-center transition-colors"
                                        >
                                            📊 Health Snapshot
                                        </button>
                                        <button 
                                            onClick={() => triggerCommand('ScheduleBackup')}
                                            className="px-3 py-2 bg-[#0b0c16] border border-cardBorder hover:border-brandPrimary/50 text-xs font-semibold rounded-lg text-white text-center transition-colors"
                                        >
                                            💾 Run Backup
                                        </button>
                                        <button 
                                            onClick={() => triggerCommand('RefreshFeatureFlags')}
                                            className="px-3 py-2 bg-[#0b0c16] border border-cardBorder hover:border-brandPrimary/50 text-xs font-semibold rounded-lg text-white text-center transition-colors"
                                        >
                                            ⚙️ Feature Flags
                                        </button>
                                        <button 
                                            onClick={() => triggerCommand('RefreshLicense')}
                                            className="px-3 py-2 bg-[#0b0c16] border border-cardBorder hover:border-brandPrimary/50 text-xs font-semibold rounded-lg text-white text-center transition-colors"
                                        >
                                            🔑 Refresh License
                                        </button>
                                        <button 
                                            onClick={() => triggerCommand('RestartBackgroundWorkers')}
                                            className="px-3 py-2 bg-[#0b0c16] border border-cardBorder hover:border-brandPrimary/50 text-xs font-semibold rounded-lg text-white text-center transition-colors"
                                        >
                                            🔄 Restart Workers
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Live Health Snapshot Panel */}
                            <div className="bg-cardBg border border-cardBorder rounded-xl p-6">
                                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display mb-4 flex items-center space-x-2">
                                    <span>📊 Live Health Status</span>
                                    {selectedLab.latestSnapshot && (
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    )}
                                </h3>
                                {selectedLab.latestSnapshot ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        <div className="bg-[#0b0c16] border border-cardBorder p-3 rounded-lg">
                                            <span className="text-[9px] text-textSecondary uppercase font-bold font-mono">CPU Usage</span>
                                            <p className="text-base font-bold text-white mt-1 font-display">{selectedLab.latestSnapshot.cpuUsagePercent}%</p>
                                        </div>
                                        <div className="bg-[#0b0c16] border border-cardBorder p-3 rounded-lg">
                                            <span className="text-[9px] text-textSecondary uppercase font-bold font-mono">Memory Usage</span>
                                            <p className="text-base font-bold text-white mt-1 font-display">{selectedLab.latestSnapshot.memoryUsageMB} MB</p>
                                        </div>
                                        <div className="bg-[#0b0c16] border border-cardBorder p-3 rounded-lg">
                                            <span className="text-[9px] text-textSecondary uppercase font-bold font-mono">Free Disk Space</span>
                                            <p className="text-base font-bold text-white mt-1 font-display">{selectedLab.latestSnapshot.diskFreeSpaceGB} GB</p>
                                        </div>
                                        <div className="bg-[#0b0c16] border border-cardBorder p-3 rounded-lg">
                                            <span className="text-[9px] text-textSecondary uppercase font-bold font-mono">Pending Outbox</span>
                                            <p className="text-base font-bold text-white mt-1 font-display">{selectedLab.latestSnapshot.pendingOutboxCount} Evt</p>
                                        </div>
                                        <div className="bg-[#0b0c16] border border-cardBorder p-3 rounded-lg">
                                            <span className="text-[9px] text-textSecondary uppercase font-bold font-mono">Dead Letter Queue</span>
                                            <p className="text-base font-bold text-white mt-1 font-display">{selectedLab.latestSnapshot.deadLetterCount} Evt</p>
                                        </div>
                                        <div className="bg-[#0b0c16] border border-cardBorder p-3 rounded-lg">
                                            <span className="text-[9px] text-textSecondary uppercase font-bold font-mono">Last Heartbeat</span>
                                            <p className="text-[10px] text-white mt-2 font-mono truncate">{new Date(selectedLab.latestSnapshot.timestamp).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-xs text-textSecondary font-mono py-4 text-center">
                                        No health snapshot recorded yet. Click "Health Snapshot" to request one.
                                    </div>
                                )}
                            </div>

                            {/* Fleet Timeline */}
                            <div className="bg-cardBg border border-cardBorder rounded-xl p-6">
                                <h3 className="font-bold text-white text-sm font-display mb-4">Installation Timeline</h3>
                                <div className="relative border-l border-cardBorder pl-6 space-y-4">
                                    {timeline.map((event, idx) => (
                                        <div key={idx} className="relative">
                                            <span className="absolute -left-[31px] top-1 w-4.5 h-4.5 rounded-full bg-[#080b18] border border-cardBorder flex items-center justify-center text-xs">
                                                {event.icon}
                                            </span>
                                            <div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-[10px] font-mono text-textMuted">{event.time}</span>
                                                    <span className="text-[9px] bg-cardBg border border-cardBorder px-1.5 py-0.2 rounded font-bold uppercase text-textSecondary">{event.type}</span>
                                                </div>
                                                <p className="text-xs text-white mt-1">{event.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Command Audit Log */}
                            <div className="bg-cardBg border border-cardBorder rounded-xl p-6">
                                <h3 className="font-bold text-white text-sm font-display mb-4">Command Dispatch Log</h3>
                                <div className="bg-[#0b0c16] rounded-lg border border-cardBorder p-4 font-mono text-[10px] text-textSecondary space-y-1 h-32 overflow-y-auto">
                                    {commandLogs.map((log, idx) => (
                                        <div key={idx}>{log}</div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-cardBg border border-cardBorder rounded-xl p-8 text-center text-textSecondary text-sm font-display">
                            Select a lab instance from the directory list to examine telemetry and controls.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RemoteOpsTab;
