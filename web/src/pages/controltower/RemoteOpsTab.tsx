import React, { useState, useEffect } from 'react';
import {
    fetchRemoteLabs,
    fetchLabTimeline,
    dispatchLabCommand,
    updateLabRolloutRing,
    registerLaboratory,
    updateLabProperties,
    manageLabLicense,
    extendLabTrial,
    regenerateLabLicenseKey,
    renewLabSubscription,
    RemoteLab,
    TimelineEvent
} from '../../repositories/controlTowerRepository';

const RemoteOpsTab: React.FC = () => {
    const [labs, setLabs] = useState<RemoteLab[]>([]);
    const [selectedLab, setSelectedLab] = useState<RemoteLab | null>(null);
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [commandLogs, setCommandLogs] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Register Lab Modal States
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [registerLabName, setRegisterLabName] = useState('');
    const [registerContactPerson, setRegisterContactPerson] = useState('');
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerPhone, setRegisterPhone] = useState('');
    const [registerLicenseType, setRegisterLicenseType] = useState('Commercial');
    const [registerMaximumBranches, setRegisterMaximumBranches] = useState(1);
    const [registerExpiryDate, setRegisterExpiryDate] = useState('');
    const [registerEnabledFeatures, setRegisterEnabledFeatures] = useState<string[]>(['WhatsApp', 'Diagnostics', 'Cloud Backup', 'OTA Updates']);
    const [registering, setRegistering] = useState(false);
    const [registrationResult, setRegistrationResult] = useState<{ labId: string; licenseKey: string } | null>(null);
    const [registerError, setRegisterError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Edit Laboratory Info Modal States
    const [showEditInfoModal, setShowEditInfoModal] = useState(false);
    const [editLabName, setEditLabName] = useState('');
    const [editContactPerson, setEditContactPerson] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editInfoError, setEditInfoError] = useState<string | null>(null);
    const [updatingInfo, setUpdatingInfo] = useState(false);

    // Manage License Modal States
    const [showLicenseModal, setShowLicenseModal] = useState(false);
    const [licenseType, setLicenseType] = useState('Commercial');
    const [maximumBranches, setMaximumBranches] = useState(1);
    const [expiryDate, setExpiryDate] = useState('');
    const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
    const [licenseStatus, setLicenseStatus] = useState('Active');
    const [licenseError, setLicenseError] = useState<string | null>(null);
    const [updatingLicense, setUpdatingLicense] = useState(false);

    // Regenerate Key Disclosure Modal States
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [newLicenseKey, setNewLicenseKey] = useState('');
    const [keyCopied, setKeyCopied] = useState(false);

    // Renew Subscription Modal States
    const [showRenewModal, setShowRenewModal] = useState(false);
    const [renewing, setRenewing] = useState(false);

    const formatDateFriendly = (date: Date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const d = date.getDate();
        const m = months[date.getMonth()];
        const y = date.getFullYear();
        return `${d} ${m} ${y}`;
    };

    const toggleFeature = (featureName: string) => {
        setRegisterEnabledFeatures(prev => 
            prev.includes(featureName) 
                ? prev.filter(f => f !== featureName) 
                : [...prev, featureName]
        );
    };

    const handleRegisterLab = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegistering(true);
        setRegisterError(null);
        setRegistrationResult(null);
        try {
            const res = await registerLaboratory({
                labName: registerLabName,
                contactPerson: registerContactPerson || undefined,
                email: registerEmail || undefined,
                phone: registerPhone || undefined,
                licenseType: registerLicenseType,
                maximumBranches: registerMaximumBranches,
                expiryDate: registerExpiryDate || undefined,
                enabledFeatures: registerEnabledFeatures
            });
            setRegistrationResult({ labId: res.labId, licenseKey: res.licenseKey });
            await loadLabs();
        } catch (err: any) {
            setRegisterError(err.response?.data?.error || 'Failed to register laboratory');
        } finally {
            setRegistering(false);
        }
    };

    const copyLicenseKey = () => {
        if (registrationResult) {
            navigator.clipboard.writeText(registrationResult.licenseKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleOpenModal = () => {
        setRegisterLabName('');
        setRegisterContactPerson('');
        setRegisterEmail('');
        setRegisterPhone('');
        setRegisterLicenseType('Commercial');
        setRegisterMaximumBranches(1);
        setRegisterExpiryDate('');
        setRegisterEnabledFeatures(['WhatsApp', 'Diagnostics', 'Cloud Backup', 'OTA Updates']);
        setRegistrationResult(null);
        setRegisterError(null);
        setCopied(false);
        setShowRegisterModal(true);
    };

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

    const handleOpenEditInfoModal = () => {
        if (!selectedLab) return;
        setEditLabName(selectedLab.labName);
        setEditContactPerson(selectedLab.contactPerson || '');
        setEditEmail(selectedLab.email || '');
        setEditPhone(selectedLab.phone || '');
        setEditInfoError(null);
        setShowEditInfoModal(true);
    };

    const handleEditInfoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLab) return;
        setUpdatingInfo(true);
        setEditInfoError(null);
        try {
            await updateLabProperties(selectedLab.id, {
                labName: editLabName,
                contactPerson: editContactPerson || undefined,
                email: editEmail || undefined,
                phone: editPhone || undefined
            });
            setShowEditInfoModal(false);
            await loadLabs();
        } catch (err: any) {
            console.error('Failed to update lab properties', err);
            setEditInfoError(err.response?.data?.error || 'Failed to update laboratory information');
        } finally {
            setUpdatingInfo(false);
        }
    };

    const handleOpenLicenseModal = () => {
        if (!selectedLab) return;
        setLicenseType(selectedLab.licenseType || 'Commercial');
        setMaximumBranches(selectedLab.maximumBranches ?? 1);
        setLicenseStatus(selectedLab.licenseStatus === 'Suspended' ? 'Suspended' : 'Active');
        
        let formattedDate = '';
        if (selectedLab.expiryDate) {
            try {
                formattedDate = new Date(selectedLab.expiryDate).toISOString().substring(0, 10);
            } catch (e) {}
        }
        setExpiryDate(formattedDate);
        setEnabledFeatures(selectedLab.enabledFeatures || []);
        setLicenseError(null);
        setShowLicenseModal(true);
    };

    const toggleLicenseFeature = (featureName: string) => {
        setEnabledFeatures(prev => 
            prev.includes(featureName) 
                ? prev.filter(f => f !== featureName) 
                : [...prev, featureName]
        );
    };

    const handleLicenseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLab) return;
        setUpdatingLicense(true);
        setLicenseError(null);
        try {
            await manageLabLicense(selectedLab.id, {
                licenseType,
                maximumBranches,
                expiryDate: expiryDate || undefined,
                enabledFeatures,
                status: licenseStatus
            });
            setShowLicenseModal(false);
            await loadLabs();
        } catch (err: any) {
            console.error('Failed to manage license', err);
            setLicenseError(err.response?.data?.error || 'Failed to update license parameters');
        } finally {
            setUpdatingLicense(false);
        }
    };

    const handleExtendTrial = async () => {
        if (!selectedLab) return;
        if (!window.confirm('Are you sure you want to extend this trial by 7 days?')) return;
        try {
            await extendLabTrial(selectedLab.id, 7);
            await loadLabs();
        } catch (err) {
            console.error('Failed to extend trial', err);
            alert('Failed to extend trial');
        }
    };

    const handleRegenerateKey = async () => {
        if (!selectedLab) return;
        if (!window.confirm('WARNING: Regenerating the license key will immediately invalidate the existing key. The client must re-authenticate with the new key. Are you sure you want to proceed?')) return;
        try {
            const res = await regenerateLabLicenseKey(selectedLab.id);
            setNewLicenseKey(res.licenseKey);
            setKeyCopied(false);
            setShowKeyModal(true);
            await loadLabs();
        } catch (err) {
            console.error('Failed to regenerate key', err);
            alert('Failed to regenerate key');
        }
    };

    const handleRenewSubscriptionClick = () => {
        if (!selectedLab) return;
        setShowRenewModal(true);
    };

    const handleConfirmRenewSubscription = async () => {
        if (!selectedLab) return;
        setRenewing(true);
        try {
            const res = await renewLabSubscription(selectedLab.id);
            alert(`Subscription renewed successfully! New Expiry Date: ${formatDateFriendly(new Date(res.newExpiry))}`);
            setShowRenewModal(false);
            await loadLabs();
        } catch (err: any) {
            console.error('Failed to renew subscription', err);
            alert(err.response?.data?.error || 'Failed to renew subscription');
        } finally {
            setRenewing(false);
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
                    <div className="flex justify-between items-center pb-2 border-b border-cardBorder">
                        <h3 className="font-bold text-white text-sm font-display">Lab Directory</h3>
                        <button
                            onClick={handleOpenModal}
                            className="text-[10px] px-2 py-1 bg-brandSecondary/25 border border-brandSecondary/30 hover:bg-brandSecondary/40 text-brandPrimary rounded font-bold transition-all uppercase tracking-wider"
                        >
                            + Register Lab
                        </button>
                    </div>
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
                                        <div className="flex items-center space-x-3">
                                            <h3 className="text-lg font-bold font-display text-white">{selectedLab.labName}</h3>
                                            <button
                                                onClick={handleOpenEditInfoModal}
                                                className="text-[10px] text-brandPrimary hover:underline px-2 py-0.5 bg-brandPrimary/10 border border-brandPrimary/20 rounded font-semibold"
                                            >
                                                ✏️ Edit Info
                                            </button>
                                        </div>
                                        <p className="text-xs text-textSecondary mt-0.5 font-mono">
                                            {selectedLab.id} • {selectedLab.geographicalRegion}
                                            {selectedLab.contactPerson && ` • ${selectedLab.contactPerson}`}
                                            {selectedLab.email && ` • ${selectedLab.email}`}
                                            {selectedLab.phone && ` • ${selectedLab.phone}`}
                                        </p>
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

                                {/* Branch License Telemetry */}
                                <div className="mb-6 p-4 rounded-xl bg-[#090b11] border border-cardBorder text-xs space-y-3">
                                    <div className="flex justify-between items-center border-b border-cardBorder pb-2">
                                        <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                            Branch License Status ({selectedLab.licenseType}) • <span className={selectedLab.licenseStatus === 'Active' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{selectedLab.licenseStatus || 'Active'}</span>
                                        </div>
                                        <div className="flex space-x-2">
                                            {selectedLab.licenseType === 'Trial' && (
                                                <button
                                                    onClick={handleExtendTrial}
                                                    className="text-[9px] px-2 py-0.5 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 text-amber-400 rounded transition-colors font-semibold"
                                                >
                                                    ⏱️ Extend Trial (7d)
                                                </button>
                                            )}
                                            <button
                                                onClick={handleOpenLicenseModal}
                                                className="text-[9px] px-2 py-0.5 bg-brandSecondary/25 border border-brandSecondary/30 hover:bg-brandSecondary/40 text-brandPrimary rounded transition-colors font-semibold"
                                            >
                                                🔑 Manage License
                                            </button>
                                            <button
                                                onClick={handleRegenerateKey}
                                                className="text-[9px] px-2 py-0.5 bg-red-950/20 border border-red-800 hover:bg-red-900/20 text-red-400 rounded transition-colors font-semibold"
                                            >
                                                🔄 Regenerate Key
                                            </button>
                                            <button
                                                onClick={handleRenewSubscriptionClick}
                                                className="text-[9px] px-2 py-0.5 bg-emerald-950/20 border border-emerald-800 hover:bg-emerald-900/20 text-emerald-400 rounded transition-colors font-semibold"
                                            >
                                                📅 Renew Subscription
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div className="bg-[#04060c] border border-cardBorder p-3 rounded-lg">
                                            <span className="text-[9px] text-textSecondary uppercase font-bold font-mono">Licensed Branches</span>
                                            <p className="text-lg font-bold text-white mt-1 font-display">{selectedLab.maximumBranches ?? 1}</p>
                                        </div>
                                        <div className="bg-[#04060c] border border-cardBorder p-3 rounded-lg">
                                            <span className="text-[9px] text-textSecondary uppercase font-bold font-mono">Current Branches</span>
                                            <p className="text-lg font-bold text-indigo-400 mt-1 font-display">{selectedLab.branchCount ?? 0}</p>
                                        </div>
                                        <div className="bg-[#04060c] border border-cardBorder p-3 rounded-lg">
                                            <span className="text-[9px] text-textSecondary uppercase font-bold font-mono">Remaining</span>
                                            <p className={`text-lg font-bold mt-1 font-display ${
                                                (selectedLab.maximumBranches ?? 1) - (selectedLab.branchCount ?? 0) <= 0 ? 'text-red-400' : 'text-emerald-400'
                                            }`}>
                                                {Math.max(0, (selectedLab.maximumBranches ?? 1) - (selectedLab.branchCount ?? 0))}
                                            </p>
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

            {showRegisterModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#0b0c16] border border-cardBorder rounded-xl max-w-lg w-full flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
                        {/* Header */}
                        <div className="p-5 border-b border-cardBorder flex justify-between items-center bg-cardBg/30">
                            <div className="flex items-center space-x-2">
                                <span className="text-lg">🧪</span>
                                <h3 className="text-md font-bold text-white font-display">Register New Laboratory</h3>
                            </div>
                            <button 
                                onClick={() => setShowRegisterModal(false)}
                                className="text-textSecondary hover:text-white transition-colors"
                            >
                                <span className="text-xl">&times;</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-4 text-xs text-textSecondary font-sans">
                            {registerError && (
                                <div className="p-3 bg-red-950/20 border border-red-800 text-red-400 rounded-lg">
                                    {registerError}
                                </div>
                            )}

                            {!registrationResult ? (
                                <form onSubmit={handleRegisterLab} className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Laboratory Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={registerLabName}
                                            onChange={e => setRegisterLabName(e.target.value)}
                                            placeholder="e.g. ABC Diagnostics"
                                            className="w-full bg-[#060814] border border-cardBorder text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-brandPrimary"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Contact Person</label>
                                            <input
                                                type="text"
                                                value={registerContactPerson}
                                                onChange={e => setRegisterContactPerson(e.target.value)}
                                                placeholder="e.g. John Doe"
                                                className="w-full bg-[#060814] border border-cardBorder text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-brandPrimary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phone Number</label>
                                            <input
                                                type="text"
                                                value={registerPhone}
                                                onChange={e => setRegisterPhone(e.target.value)}
                                                placeholder="e.g. +91 98765 43210"
                                                className="w-full bg-[#060814] border border-cardBorder text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-brandPrimary"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email Address</label>
                                        <input
                                            type="email"
                                            value={registerEmail}
                                            onChange={e => setRegisterEmail(e.target.value)}
                                            placeholder="e.g. contact@laboratory.com"
                                            className="w-full bg-[#060814] border border-cardBorder text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-brandPrimary"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">License Type</label>
                                            <select
                                                value={registerLicenseType}
                                                onChange={e => setRegisterLicenseType(e.target.value)}
                                                className="w-full bg-[#060814] border border-cardBorder text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-brandPrimary"
                                            >
                                                <option value="Commercial">Commercial</option>
                                                <option value="Trial">Trial</option>
                                                <option value="Educational">Educational</option>
                                                <option value="Internal">Internal</option>
                                                <option value="Partner">Partner</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Maximum Branches</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={registerMaximumBranches}
                                                onChange={e => setRegisterMaximumBranches(Math.max(1, parseInt(e.target.value) || 1))}
                                                className="w-full bg-[#060814] border border-cardBorder text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-brandPrimary"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Expiry Date</label>
                                        <input
                                            type="date"
                                            value={registerExpiryDate}
                                            onChange={e => setRegisterExpiryDate(e.target.value)}
                                            className="w-full bg-[#060814] border border-cardBorder text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-brandPrimary"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Enabled Features</label>
                                        <div className="grid grid-cols-2 gap-2 bg-[#060814] p-3 rounded-lg border border-cardBorder">
                                            {['WhatsApp', 'Diagnostics', 'Cloud Backup', 'OTA Updates', 'Referral Module', 'Inventory'].map(feature => (
                                                <label key={feature} className="flex items-center space-x-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={registerEnabledFeatures.includes(feature)}
                                                        onChange={() => toggleFeature(feature)}
                                                        className="rounded border-cardBorder bg-inputBackground text-brandPrimary focus:ring-brandPrimary"
                                                    />
                                                    <span className="text-white text-xs">{feature}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-cardBorder flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowRegisterModal(false)}
                                            className="px-4 py-2 border border-cardBorder text-white rounded-lg hover:bg-cardBg transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={registering}
                                            className="px-5 py-2 bg-brandPrimary text-white font-bold rounded-lg hover:bg-brandPrimary/80 transition-all flex items-center space-x-2"
                                        >
                                            {registering ? (
                                                <>
                                                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                                    <span>Registering...</span>
                                                </>
                                            ) : (
                                                <span>Create Laboratory</span>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-5 py-4">
                                    <div className="text-center space-y-2">
                                        <span className="text-4xl">🎉</span>
                                        <h4 className="text-sm font-bold text-success font-display">Laboratory Registered Successfully!</h4>
                                        <p className="text-[11px] text-textMuted">The laboratory profile has been created. Use the credentials below to connect the client instance.</p>
                                    </div>

                                    <div className="bg-[#060814] border border-cardBorder rounded-lg p-4 space-y-3">
                                        <div>
                                            <span className="text-[10px] text-textMuted uppercase font-bold tracking-wider">Assigned Lab ID (Internal)</span>
                                            <p className="text-white font-mono text-sm font-bold mt-0.5">{registrationResult.labId}</p>
                                        </div>
                                        <div className="border-t border-cardBorder/50 pt-3">
                                            <span className="text-[10px] text-textMuted uppercase font-bold tracking-wider">Generated License Key</span>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={registrationResult.licenseKey}
                                                    className="flex-1 bg-[#060814] border border-cardBorder text-white font-mono text-xs rounded-lg px-3 py-2 select-all focus:outline-none"
                                                />
                                                <button
                                                    onClick={copyLicenseKey}
                                                    className="px-3 py-2 bg-brandSecondary/25 border border-brandSecondary/30 hover:bg-brandSecondary/40 text-brandPrimary rounded-lg font-bold transition-all text-xs"
                                                >
                                                    {copied ? 'Copied ✓' : 'Copy'}
                                                </button>
                                            </div>
                                            <p className="text-[9px] text-amber-400 mt-2 font-medium">⚠️ Important: This key is only shown once. Make sure to copy it now!</p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-cardBorder flex justify-center">
                                        <button
                                            onClick={() => setShowRegisterModal(false)}
                                            className="px-8 py-2 bg-brandPrimary text-white font-bold rounded-lg hover:bg-brandPrimary/80 transition-all text-xs"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showEditInfoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#0b0c16] border border-cardBorder rounded-xl max-w-lg w-full flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
                        {/* Header */}
                        <div className="p-5 border-b border-cardBorder flex justify-between items-center bg-cardBg/30">
                            <div className="flex items-center space-x-2">
                                <span className="text-lg">✏️</span>
                                <h3 className="text-md font-bold text-white font-display">Edit Laboratory Info</h3>
                            </div>
                            <button 
                                onClick={() => setShowEditInfoModal(false)}
                                className="text-textSecondary hover:text-white transition-colors"
                            >
                                <span className="text-xl">&times;</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-4 text-xs text-textSecondary font-sans">
                            {editInfoError && (
                                <div className="p-3 bg-red-950/20 border border-red-800 text-red-400 rounded-lg">
                                    {editInfoError}
                                </div>
                            )}

                            <form onSubmit={handleEditInfoSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Laboratory Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editLabName}
                                        onChange={e => setEditLabName(e.target.value)}
                                        placeholder="e.g. ABC Diagnostics"
                                        className="w-full bg-[#060814] border border-cardBorder text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-brandPrimary"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Contact Person</label>
                                        <input
                                            type="text"
                                            value={editContactPerson}
                                            onChange={e => setEditContactPerson(e.target.value)}
                                            placeholder="e.g. John Doe"
                                            className="w-full bg-[#060814] border border-cardBorder text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-brandPrimary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phone Number</label>
                                        <input
                                            type="text"
                                            value={editPhone}
                                            onChange={e => setEditPhone(e.target.value)}
                                            placeholder="e.g. +91 98765 43210"
                                            className="w-full bg-[#060814] border border-cardBorder text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-brandPrimary"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={editEmail}
                                        onChange={e => setEditEmail(e.target.value)}
                                        placeholder="e.g. contact@laboratory.com"
                                        className="w-full bg-[#060814] border border-cardBorder text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-brandPrimary"
                                    />
                                </div>

                                <div className="pt-4 border-t border-cardBorder flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditInfoModal(false)}
                                        className="px-4 py-2 border border-cardBorder text-white rounded-lg hover:bg-cardBg transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={updatingInfo}
                                        className="px-5 py-2 bg-brandPrimary text-white font-bold rounded-lg hover:bg-brandPrimary/80 transition-all flex items-center space-x-2"
                                    >
                                        {updatingInfo ? (
                                            <>
                                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            <span>Save Changes</span>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {showLicenseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#0b0c16] border border-cardBorder rounded-xl max-w-lg w-full flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
                        {/* Header */}
                        <div className="p-5 border-b border-cardBorder flex justify-between items-center bg-cardBg/30">
                            <div className="flex items-center space-x-2">
                                <span className="text-lg">🔑</span>
                                <h3 className="text-md font-bold text-white font-display">Manage License Parameters</h3>
                            </div>
                            <button 
                                onClick={() => setShowLicenseModal(false)}
                                className="text-textSecondary hover:text-white transition-colors"
                            >
                                <span className="text-xl">&times;</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-4 text-xs text-textSecondary font-sans">
                            {licenseError && (
                                <div className="p-3 bg-red-950/20 border border-red-800 text-red-400 rounded-lg">
                                    {licenseError}
                                </div>
                            )}

                            <form onSubmit={handleLicenseSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">License Type</label>
                                        <select
                                            value={licenseType}
                                            onChange={e => setLicenseType(e.target.value)}
                                            className="w-full bg-[#060814] border border-cardBorder text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-brandPrimary"
                                        >
                                            <option value="Commercial">Commercial</option>
                                            <option value="Trial">Trial</option>
                                            <option value="Educational">Educational</option>
                                            <option value="Internal">Internal</option>
                                            <option value="Partner">Partner</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">License Status</label>
                                        <select
                                            value={licenseStatus}
                                            onChange={e => setLicenseStatus(e.target.value)}
                                            className="w-full bg-[#060814] border border-cardBorder text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-brandPrimary"
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Suspended">Suspended / Blocked</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Maximum Branches</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={maximumBranches}
                                            onChange={e => setMaximumBranches(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-full bg-[#060814] border border-cardBorder text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-brandPrimary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Expiry Date</label>
                                        <input
                                            type="date"
                                            value={expiryDate}
                                            onChange={e => setExpiryDate(e.target.value)}
                                            className="w-full bg-[#060814] border border-cardBorder text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-brandPrimary"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Enabled Features</label>
                                    <div className="grid grid-cols-2 gap-2 bg-[#060814] p-3 rounded-lg border border-cardBorder">
                                        {['WhatsApp', 'Diagnostics', 'Cloud Backup', 'OTA Updates', 'Referral Module', 'Inventory'].map(feature => (
                                            <label key={feature} className="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={enabledFeatures.includes(feature)}
                                                    onChange={() => toggleLicenseFeature(feature)}
                                                    className="rounded border-cardBorder bg-inputBackground text-brandPrimary focus:ring-brandPrimary"
                                                />
                                                <span className="text-white text-xs">{feature}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-cardBorder flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowLicenseModal(false)}
                                        className="px-4 py-2 border border-cardBorder text-white rounded-lg hover:bg-cardBg transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={updatingLicense}
                                        className="px-5 py-2 bg-brandPrimary text-white font-bold rounded-lg hover:bg-brandPrimary/80 transition-all flex items-center space-x-2"
                                    >
                                        {updatingLicense ? (
                                            <>
                                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            <span>Save Parameters</span>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {showKeyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#0b0c16] border border-cardBorder rounded-xl max-w-lg w-full flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
                        {/* Header */}
                        <div className="p-5 border-b border-cardBorder flex justify-between items-center bg-cardBg/30">
                            <div className="flex items-center space-x-2">
                                <span className="text-lg">🔑</span>
                                <h3 className="text-md font-bold text-white font-display">New License Key Generated</h3>
                            </div>
                            <button 
                                onClick={() => setShowKeyModal(false)}
                                className="text-textSecondary hover:text-white transition-colors"
                            >
                                <span className="text-xl">&times;</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4 text-xs text-textSecondary font-sans">
                            <div className="text-center space-y-2">
                                <span className="text-4xl">⚡</span>
                                <h4 className="text-sm font-bold text-brandPrimary font-display">License Key Rolled Successfully</h4>
                                <p className="text-[11px] text-textMuted">The old license key has been immediately invalidated. The client software must be updated with the key below to continue communicating.</p>
                            </div>

                            <div className="bg-[#060814] border border-cardBorder rounded-lg p-4 space-y-3">
                                <div>
                                    <span className="text-[10px] text-textMuted uppercase font-bold tracking-wider">New License Key</span>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <input
                                            type="text"
                                            readOnly
                                            value={newLicenseKey}
                                            className="flex-1 bg-[#060814] border border-cardBorder text-white font-mono text-xs rounded-lg px-3 py-2 select-all focus:outline-none"
                                        />
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(newLicenseKey);
                                                setKeyCopied(true);
                                                setTimeout(() => setKeyCopied(false), 2000);
                                            }}
                                            className="px-3 py-2 bg-brandSecondary/25 border border-brandSecondary/30 hover:bg-brandSecondary/40 text-brandPrimary rounded-lg font-bold transition-all text-xs"
                                        >
                                            {keyCopied ? 'Copied ✓' : 'Copy'}
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-amber-400 mt-2 font-medium">⚠️ Important: This key is only shown once. Make sure to copy it now!</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-cardBorder flex justify-center">
                                <button
                                    onClick={() => setShowKeyModal(false)}
                                    className="px-8 py-2 bg-brandPrimary text-white font-bold rounded-lg hover:bg-brandPrimary/80 transition-all text-xs"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showRenewModal && selectedLab && (() => {
                const currentExpiryDate = selectedLab.expiryDate ? new Date(selectedLab.expiryDate) : new Date();
                const newExpiryDate = new Date(currentExpiryDate.getTime());
                newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="bg-[#0b0c16] border border-cardBorder rounded-xl max-w-lg w-full flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
                            {/* Header */}
                            <div className="p-5 border-b border-cardBorder flex justify-between items-center bg-cardBg/30">
                                <div className="flex items-center space-x-2">
                                    <span className="text-lg">📅</span>
                                    <h3 className="text-md font-bold text-white font-display">Renew Subscription</h3>
                                </div>
                                <button 
                                    onClick={() => setShowRenewModal(false)}
                                    className="text-textSecondary hover:text-white transition-colors"
                                    disabled={renewing}
                                >
                                    <span className="text-xl">&times;</span>
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4 text-xs text-textSecondary font-sans">
                                <div className="text-center space-y-2 mb-4">
                                    <span className="text-4xl">💰</span>
                                    <h4 className="text-sm font-bold text-emerald-400 font-display">Extend Subscription Plan</h4>
                                    <p className="text-[11px] text-textMuted">This will extend the laboratory's active license validity by exactly 1 year and generate a new secure connection key.</p>
                                </div>

                                <div className="bg-[#060814] border border-cardBorder rounded-lg p-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div className="bg-[#04060c] border border-cardBorder/50 p-3 rounded-lg">
                                            <span className="text-[9px] text-textMuted uppercase font-bold tracking-wider font-mono">Current Expiry</span>
                                            <p className="text-sm font-bold text-red-400 mt-1 font-display">
                                                {selectedLab.expiryDate ? formatDateFriendly(currentExpiryDate) : 'Not Set / Expired'}
                                            </p>
                                        </div>
                                        <div className="bg-[#04060c] border border-cardBorder/50 p-3 rounded-lg">
                                            <span className="text-[9px] text-textMuted uppercase font-bold tracking-wider font-mono">New Expiry</span>
                                            <p className="text-sm font-bold text-emerald-400 mt-1 font-display">
                                                {formatDateFriendly(newExpiryDate)}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="text-[11px] text-amber-400 border border-amber-950/40 bg-amber-950/10 p-3 rounded-lg flex items-start space-x-2">
                                        <span className="text-sm">⚠️</span>
                                        <div>
                                            <p className="font-semibold">Important Notice</p>
                                            <p className="text-[10px] text-textMuted mt-0.5">Renewing generates a brand new license key immediately. The client must replace their old key with the new key on their local SynOS server to resume synchronization.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-cardBorder flex justify-end space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowRenewModal(false)}
                                        className="px-4 py-2 border border-cardBorder hover:bg-cardBg/30 text-white rounded-lg transition-all text-xs"
                                        disabled={renewing}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirmRenewSubscription}
                                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all text-xs flex items-center space-x-2"
                                        disabled={renewing}
                                    >
                                        {renewing ? 'Renewing...' : 'Renew Subscription'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default RemoteOpsTab;
