import React, { useState } from 'react';

interface Incident {
    id: string;
    title: string;
    description: string;
    severity: 'Critical' | 'Major' | 'Minor';
    category: string;
    affectedLabsCount: number;
    createdAt: string;
    status: 'Investigating' | 'Identified' | 'Monitoring' | 'Resolved';
}

const IncidentCenterTab: React.FC = () => {
    const [incidents] = useState<Incident[]>([
        {
            id: 'INC-1092',
            title: 'Widespread Backup Upload Timeout',
            description: 'Backup sync worker is timing out when pushing encrypted segments over slower client ISP routes.',
            severity: 'Critical',
            category: 'Backup & Restore',
            affectedLabsCount: 4,
            createdAt: '2026-07-06 14:00',
            status: 'Investigating'
        },
        {
            id: 'INC-1093',
            title: 'Version 1.2.0 Print Spooler Regression',
            description: 'Thermal label printing commands freeze background print spooler threads due to a null reference exception.',
            severity: 'Major',
            category: 'Printers',
            affectedLabsCount: 3,
            createdAt: '2026-07-06 12:30',
            status: 'Identified'
        },
        {
            id: 'INC-1094',
            title: 'Feature Flag Sync Failures',
            description: 'Local caching layer failing to reload active branch licensing updates from Control Tower settings.',
            severity: 'Minor',
            category: 'Feature Flags',
            affectedLabsCount: 2,
            createdAt: '2026-07-06 09:15',
            status: 'Monitoring'
        }
    ]);

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold font-display text-white">Incident Center</h2>
                <p className="text-sm text-textSecondary mt-1">Real-time status updates for ongoing operational issues across the fleet.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-cardBg border border-cardBorder rounded-xl p-5 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] text-textSecondary uppercase font-bold tracking-wider">Critical Incidents</span>
                        <h4 className="text-3xl font-bold font-display text-white mt-1">1</h4>
                    </div>
                    <span className="text-2xl">🚨</span>
                </div>
                <div className="bg-cardBg border border-cardBorder rounded-xl p-5 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] text-textSecondary uppercase font-bold tracking-wider">Affected Labs</span>
                        <h4 className="text-3xl font-bold font-display text-white mt-1">9</h4>
                    </div>
                    <span className="text-2xl">🏥</span>
                </div>
                <div className="bg-cardBg border border-cardBorder rounded-xl p-5 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] text-textSecondary uppercase font-bold tracking-wider">Average Triage Time</span>
                        <h4 className="text-3xl font-bold font-display text-white mt-1">14m</h4>
                    </div>
                    <span className="text-2xl">⏱️</span>
                </div>
            </div>

            <div className="bg-cardBg border border-cardBorder rounded-xl p-6">
                <h3 className="font-bold text-white text-sm font-display mb-4">Active Fleet Incidents</h3>
                <div className="space-y-4">
                    {incidents.map(inc => (
                        <div key={inc.id} className="p-4 rounded-lg bg-[#0b0c16] border border-cardBorder/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                        inc.severity === 'Critical' ? 'bg-error/15 text-error border border-error/20' :
                                        inc.severity === 'Major' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                        'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                    }`}>
                                        {inc.severity}
                                    </span>
                                    <span className="text-xs font-mono text-textMuted">{inc.id}</span>
                                    <span className="text-xs font-mono text-textMuted">•</span>
                                    <span className="text-xs font-semibold text-textSecondary">{inc.category}</span>
                                </div>
                                <h4 className="text-sm font-bold text-white font-display">{inc.title}</h4>
                                <p className="text-xs text-textSecondary max-w-2xl">{inc.description}</p>
                            </div>
                            <div className="flex items-center space-x-6">
                                <div className="text-left md:text-right">
                                    <p className="text-[10px] text-textSecondary uppercase tracking-wider">Affected Labs</p>
                                    <p className="text-xs font-bold text-white font-mono">{inc.affectedLabsCount} Deployed</p>
                                </div>
                                <div className="text-left md:text-right">
                                    <p className="text-[10px] text-textSecondary uppercase tracking-wider">Status</p>
                                    <span className="text-xs font-bold text-accentCyan flex items-center mt-0.5">
                                        <span className="w-1.5 h-1.5 bg-accentCyan rounded-full mr-1.5 animate-pulse"></span>
                                        {inc.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default IncidentCenterTab;
