import React, { useState } from 'react';

interface Lab {
    id: string;
    name: string;
    region: string;
    version: string;
    os: string;
    dotnet: string;
    status: 'Online' | 'Degraded' | 'Offline';
    lastSeen: string;
}

interface TimelineEvent {
    time: string;
    type: string;
    description: string;
    icon: string;
}

const RemoteOpsTab: React.FC = () => {
    const [labs] = useState<Lab[]>([
        { id: 'LAB001', name: 'Divya Diagnostics Central', region: 'Mumbai', version: '1.2.0', os: 'Windows 11 Home 23H2', dotnet: '.NET 8.0.3', status: 'Online', lastSeen: 'Just Now' },
        { id: 'LAB002', name: 'Apollo Health Branch', region: 'Pune', version: '1.1.9', os: 'Windows Server 2022', dotnet: '.NET 8.0.3', status: 'Degraded', lastSeen: '2 mins ago' },
        { id: 'LAB003', name: 'Metro Lab Clinic', region: 'Nashik', version: '1.1.9', os: 'Windows 10 Pro 22H2', dotnet: '.NET 8.0.2', status: 'Offline', lastSeen: '1 day ago' }
    ]);

    const [selectedLab, setSelectedLab] = useState<Lab | null>(labs[0]);
    const [timeline, setTimeline] = useState<TimelineEvent[]>([
        { time: '2026-07-06 14:30', type: 'Heartbeat', description: 'System telemetry synced successfully. Queue depth: 0.', icon: '💚' },
        { time: '2026-07-06 14:15', type: 'Command', description: 'Remote command RequestHealthSnapshot executed.', icon: '🛠️' },
        { time: '2026-07-06 13:00', type: 'Backup', description: 'Database backup backup_LAB001_20260706.zip generated and verified (142 MB).', icon: '💾' },
        { time: '2026-07-06 12:45', type: 'Update', description: 'Software version upgraded from 1.1.9 to 1.2.0.', icon: '🚀' },
        { time: '2026-07-06 10:20', type: 'Crash', description: 'NullReferenceException inside PrintLabelSpooler thread.', icon: '💥' }
    ]);

    const [commandLogs, setCommandLogs] = useState<string[]>([
        '2026-07-06 14:15: RequestHealthSnapshot dispatched to LAB001 - Status: Executed',
        '2026-07-06 13:00: ScheduleBackup dispatched to LAB001 - Status: Executed'
    ]);

    const triggerCommand = (commandType: string) => {
        if (!selectedLab) return;
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const logMsg = `${timestamp}: Command ${commandType} dispatched to ${selectedLab.id} - Status: Pending`;
        setCommandLogs(prev => [logMsg, ...prev]);

        // Add to timeline
        const newEvent: TimelineEvent = {
            time: timestamp,
            type: 'Command',
            description: `Remote command ${commandType} queued and dispatched to client.`,
            icon: '⚡'
        };
        setTimeline(prev => [newEvent, ...prev]);
        
        alert(`Dispatched remote command [${commandType}] to lab [${selectedLab.name} (${selectedLab.id})].`);
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
                        {labs.map(lab => (
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
                                    <h4 className="text-xs font-bold text-white font-display">{lab.name}</h4>
                                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                        lab.status === 'Online' ? 'bg-success/10 text-success' :
                                        lab.status === 'Degraded' ? 'bg-amber-500/10 text-amber-500' :
                                        'bg-textMuted/15 text-textMuted'
                                    }`}>
                                        {lab.status}
                                    </span>
                                </div>
                                <div className="mt-2 flex justify-between text-[10px] text-textSecondary font-mono">
                                    <span>{lab.id} • {lab.region}</span>
                                    <span>v{lab.version}</span>
                                </div>
                            </button>
                        ))}
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
                                        <h3 className="text-lg font-bold font-display text-white">{selectedLab.name}</h3>
                                        <p className="text-xs text-textSecondary mt-0.5 font-mono">{selectedLab.id} • {selectedLab.region}</p>
                                    </div>
                                    <div className="flex items-center space-x-2 text-xs font-mono">
                                        <span className="text-textSecondary">OS:</span>
                                        <span className="text-white font-semibold">{selectedLab.os}</span>
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
