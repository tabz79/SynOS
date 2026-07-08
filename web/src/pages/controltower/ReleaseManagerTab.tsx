import React, { useState } from 'react';

interface Release {
    version: string;
    releaseDate: string;
    schemaVersion: number;
    status: 'Stable' | 'Beta' | 'Deprecated';
    rolloutRing: string;
    adoptionRate: string;
}

const ReleaseManagerTab: React.FC = () => {
    const [releases] = useState<Release[]>([
        { version: '1.2.0', releaseDate: '2026-07-06', schemaVersion: 24, status: 'Stable', rolloutRing: 'Canary', adoptionRate: '12%' },
        { version: '1.1.9', releaseDate: '2026-06-20', schemaVersion: 23, status: 'Stable', rolloutRing: 'General', adoptionRate: '88%' },
        { version: '1.1.8', releaseDate: '2026-05-15', schemaVersion: 22, status: 'Deprecated', rolloutRing: 'General', adoptionRate: '0%' }
    ]);

    const [selectedRelease, setSelectedRelease] = useState<Release>(releases[0]);
    const [canaryPercentage, setCanaryPercentage] = useState(10);

    const publishRelease = (e: React.FormEvent) => {
        e.preventDefault();
        alert('Software release published to local inventory database.');
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold font-display text-white">Release Manager</h2>
                <p className="text-sm text-textSecondary mt-1">Manage target SemVer distributions, programmatic database migrations, and rollout schedules.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Release List */}
                <div className="bg-cardBg border border-cardBorder rounded-xl p-5 space-y-4">
                    <h3 className="font-bold text-white text-sm font-display">Active Releases</h3>
                    <div className="space-y-3">
                        {releases.map(rel => (
                            <button
                                key={rel.version}
                                onClick={() => setSelectedRelease(rel)}
                                className={`w-full text-left p-3 rounded-lg border transition-all ${
                                    selectedRelease.version === rel.version 
                                        ? 'bg-brandSecondary/25 border-brandPrimary shadow-card-glow' 
                                        : 'bg-[#0b0c16] border-cardBorder hover:border-cardBorder/80'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <h4 className="text-xs font-bold text-white font-mono">v{rel.version}</h4>
                                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                        rel.status === 'Stable' ? 'bg-success/10 text-success' :
                                        rel.status === 'Beta' ? 'bg-amber-500/10 text-amber-500' :
                                        'bg-error/10 text-error'
                                    }`}>
                                        {rel.status}
                                    </span>
                                </div>
                                <div className="mt-2 flex justify-between text-[10px] text-textSecondary font-mono">
                                    <span>Schema {rel.schemaVersion} • {rel.rolloutRing}</span>
                                    <span>{rel.adoptionRate} Adopted</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Release Detail & Rollout Configuration */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-cardBg border border-cardBorder rounded-xl p-6 space-y-6">
                        <div>
                            <h3 className="text-lg font-bold font-display text-white">Version Profile: {selectedRelease.version}</h3>
                            <p className="text-xs text-textSecondary mt-0.5">Published on {selectedRelease.releaseDate} • Schema Version {selectedRelease.schemaVersion}</p>
                        </div>

                        {/* Rollout Gates */}
                        <div className="space-y-4 border-t border-cardBorder pt-4">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">Staged Canary Rollout</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-textSecondary">
                                    <span>Target Ring Size</span>
                                    <span className="text-white font-semibold font-mono">{canaryPercentage}% of Deployed Fleet</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    value={canaryPercentage} 
                                    onChange={(e) => setCanaryPercentage(Number(e.target.value))}
                                    className="w-full h-1 bg-[#0b0c16] rounded-lg appearance-none cursor-pointer accent-brandPrimary"
                                />
                                <div className="flex justify-between text-[10px] text-textMuted font-mono">
                                    <span>0% (Halted)</span>
                                    <span>50% (Active Canary)</span>
                                    <span>100% (General Release)</span>
                                </div>
                            </div>
                        </div>

                        {/* Migration verification logs */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">Programmatic Database Verification</h4>
                            <div className="p-4 bg-[#0b0c16] border border-cardBorder rounded-lg font-mono text-[10px] text-success space-y-1">
                                <div>[INFO] Programmatic dry-run migrations validation for schema_migration_v24.sql</div>
                                <div>[OK] EF Core schema target verification succeeded (0 warnings).</div>
                                <div>[OK] Dry-run schema mapping verified against on-premise SQLite replica database.</div>
                            </div>
                        </div>
                    </div>

                    {/* Publish Release Form */}
                    <form onSubmit={publishRelease} className="bg-cardBg border border-cardBorder rounded-xl p-6 space-y-4">
                        <h3 className="font-bold text-white text-sm font-display">Publish New Release Package</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] text-textSecondary uppercase font-bold">SemVer Version</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full bg-[#0b0c16] border border-cardBorder text-xs text-white p-2 rounded-lg outline-none focus:border-brandPrimary"
                                    placeholder="e.g. 1.2.1"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-textSecondary uppercase font-bold">Schema Migration ID</label>
                                <input 
                                    type="number" 
                                    required 
                                    className="w-full bg-[#0b0c16] border border-cardBorder text-xs text-white p-2 rounded-lg outline-none focus:border-brandPrimary"
                                    placeholder="e.g. 25"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-textSecondary uppercase font-bold">Target Rollout Ring</label>
                            <select className="w-full bg-[#0b0c16] border border-cardBorder text-xs text-white p-2.5 rounded-lg outline-none focus:border-brandPrimary">
                                <option value="Canary">Canary (Internal Testing & Developer Environments)</option>
                                <option value="Early">Early Adopters (Staging & Non-critical Clinical Sites)</option>
                                <option value="General">General (All Active Installations)</option>
                            </select>
                        </div>
                        <button 
                            type="submit"
                            className="w-full py-2 bg-gradient-to-r from-brandSecondary to-brandPrimary text-white font-semibold text-xs rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Publish and Stage Package
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ReleaseManagerTab;
