import React, { useState, useEffect } from 'react';
import { SystemBar } from '@/components/layout/SystemBar';
import { RadiologyApi } from '@/api/radiology';
import { useAuth } from '@/context/AuthContext';
import { WorklistMatrixTabs } from '@/components/common/WorklistMatrixTabs';
import { 
    Activity, 
    UploadCloud, 
    CheckCircle, 
    Monitor, 
    RefreshCw, 
    Loader2, 
    User, 
    Cpu, 
    CloudLightning, 
    Check, 
    Database, 
    ShieldAlert, 
    FileSpreadsheet, 
    FileText 
} from 'lucide-react';

export function ModalityTerminalShell({ modalityName, technicianRole }) {
    const { user } = useAuth();
    const [queue, setQueue] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [activeTab, setActiveTab] = useState('available'); // available | assigned | live | history
    const [loading, setLoading] = useState(true);
    const [activeStudy, setActiveStudy] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const handleAssign = async (studyId) => {
        setActionLoading(true);
        try {
            await RadiologyApi.assignStudy(studyId);
            // Auto-switch UI to Assigned tab upon claiming
            setActiveTab('assigned');
            setShowHistory(false);

            const statuses = ['PendingImaging', 'Assigned', 'AwaitingDictation', 'DictationSessionStarted', 'DraftReady', 'AwaitingSignature', 'Signed', 'ManualVerified', 'Finalized'];
            const data = await RadiologyApi.getTechnicianQueue(statuses, false);
            const updated = data.find(s => s.radiologyStudyId === studyId);
            if (updated) setActiveStudy(updated);
            fetchQueue();
        } catch (error) {
            alert(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const isAdmin = user?.role === 'Admin' || user?.role === 'SystemAdmin';

    const availableCount = queue.filter(study => !study.claimedByUserId && !study.assignedToTechnicianName).length;

    const displayQueue = queue.filter(study => {
        if (showHistory) return true;

        const isClaimedByMe = study.claimedByUserId?.toLowerCase() === user?.id?.toLowerCase() ||
                              study.assignedToTechnicianName?.toLowerCase() === user?.name?.toLowerCase();
        const isUnassigned = !study.claimedByUserId && !study.assignedToTechnicianName;

        if (activeTab === 'available') {
            return isUnassigned;
        } else {
            return isAdmin ? !isUnassigned : isClaimedByMe;
        }
    });
    
    // PACS simulation state
    const [pacsStep, setPacsStep] = useState(0); // 0: Idle, 1: Connecting, 2: Querying, 3: Mapping, 4: Done
    const [pacsAccession, setPacsAccession] = useState('');
    const [pacsViewerUrl, setPacsViewerUrl] = useState('');
    const [uploadedFile, setUploadedFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [hasManualUpload, setHasManualUpload] = useState(false);

    const [dicomSliceCount, setDicomSliceCount] = useState(0);
    const [checkingSliceCount, setCheckingSliceCount] = useState(false);

    const checkDicomSliceCount = async (studyId) => {
        if (!studyId) return;
        setCheckingSliceCount(true);
        try {
            const count = await RadiologyApi.getStudySliceCount(studyId);
            setDicomSliceCount(count);
        } catch (err) {
            console.error("Failed to check DICOM slice count:", err);
            setDicomSliceCount(0);
        } finally {
            setCheckingSliceCount(false);
        }
    };

    useEffect(() => {
        if (activeStudy?.radiologyStudyId) {
            checkDicomSliceCount(activeStudy.radiologyStudyId);
        } else {
            setDicomSliceCount(0);
        }
    }, [activeStudy?.radiologyStudyId]);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const statuses = ['PendingImaging', 'Assigned', 'AwaitingDictation', 'DictationSessionStarted', 'DraftReady', 'AwaitingSignature', 'Signed', 'ManualVerified', 'Finalized', 'ImagingCompleted'];
            const data = await RadiologyApi.getTechnicianQueue(statuses, showHistory);
            // Robust filter by modality or testName (e.g. MRI, CT, US, X-Ray)
            const filtered = data.filter(s => {
                if (!modalityName || modalityName === "General") return true;
                const target = modalityName.toLowerCase();
                const modStr = (s.modality || '').toLowerCase();
                const testStr = (s.testName || '').toLowerCase();
                return modStr.includes(target) || testStr.includes(target);
            });
            setQueue(filtered);
        } catch (error) {
            console.error("Failed to load technician queue:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, [modalityName, showHistory]);

    const handleScannerImport = async (study) => {
        setPacsStep(1); // Querying DICOM network
        setActionLoading(true);

        try {
            const res = await fetch(`/api/v1/radiology/pacs/${study.radiologyStudyId}/acquire`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                setPacsStep(2);
                setTimeout(() => setPacsStep(3), 800);
                setTimeout(() => {
                    setPacsStep(4);
                    setPacsViewerUrl(`/viewer/${data.studyInstanceUid || study.radiologyStudyId}`);
                    setActionLoading(false);
                }, 1600);
            } else {
                setPacsStep(0);
                alert(data.message || data.title || "No DICOM series detected on scanner C-STORE node. Please upload DICOM files manually.");
                return;
            }

            setPacsAccession(data.accessionNumber || study.accessionNumber || `ACC-${study.modality}`);
            setPacsStep(4); // Successfully linked
            await checkDicomSliceCount(study.radiologyStudyId);
            fetchQueue();
        } catch (err) {
            console.error("Scanner import query failed:", err);
            setPacsStep(0);
            alert("Failed to connect to scanner DICOM node: " + (err.message || "No scanner network response."));
        } finally {
            setActionLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !activeStudy) return;
        setUploadedFile(file);
        setActionLoading(true);
        setUploadProgress(20);

        try {
            setUploadProgress(50);
            const formData = new FormData();
            formData.append('files', file);
            await RadiologyApi.uploadDicom(activeStudy.radiologyStudyId, formData);
            setUploadProgress(100);
            setHasManualUpload(true);
            await checkDicomSliceCount(activeStudy.radiologyStudyId);
            setTimeout(() => {
                fetchQueue();
                setUploadedFile(null);
                setUploadProgress(0);
            }, 600);
        } catch (error) {
            alert("DICOM Upload failed: " + error.message);
            setUploadedFile(null);
            setUploadProgress(0);
        } finally {
            setActionLoading(false);
        }
    };

    const handleComplete = async (studyId) => {
        if (dicomSliceCount === 0 && !hasManualUpload) {
            alert("Cannot release study. No DICOM images have been acquired or uploaded for this patient.");
            return;
        }
        setActionLoading(true);
        try {
            await RadiologyApi.markImagingCompleted(studyId);
            setActiveStudy(null);
            setPacsStep(0);
            setPacsAccession('');
            setPacsViewerUrl('');
            setHasManualUpload(false);
            setDicomSliceCount(0);
            fetchQueue();
        } catch (error) {
            alert(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const formatStatusLabel = (status) => {
        if (!status) return 'Pending';
        if (status === 'DictationSessionStarted') return 'Dictation Started';
        if (status === 'PendingImaging') return 'Awaiting Scan';
        if (status === 'ManualVerified') return 'Verified';
        return status.replace(/([A-Z])/g, ' $1').trim();
    };

    return (
        <div className="h-screen w-screen dark:bg-synos-background bg-transparent text-foreground flex flex-col overflow-hidden font-sans selection:bg-white/20 relative">
            {/* Atmospheric Background Canvas */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] dark:hidden">
                <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ==")` }} />
                <div className="absolute top-[-15%] left-[-5%] w-[50%] h-[55%] animate-pulse" style={{ background: 'radial-gradient(circle at 40% 40%, rgba(6, 182, 212, 0.07) 0%, rgba(6, 182, 212, 0.02) 45%, rgba(6, 182, 212, 0) 85%)', animationDuration: '10s' }} />
                <div className="absolute top-[-10%] right-[10%] w-[45%] h-[50%]" style={{ background: 'radial-gradient(circle at center, rgba(37, 99, 235, 0.05) 0%, rgba(37, 99, 235, 0.01) 50%, rgba(37, 99, 235, 0) 90%)' }} />
                <div className="absolute top-[-25%] right-[-10%] w-[60%] h-[65%]" style={{ background: 'radial-gradient(circle at 60% 30%, rgba(52, 211, 153, 0.06) 0%, rgba(52, 211, 153, 0.01) 40%, rgba(52, 211, 153, 0) 80%)' }} />
            </div>

            {/* Top SystemBar Header */}
            <SystemBar syncStatus="Synced" />

            {/* Main Workbench Layout */}
            <div className="flex-1 p-3 overflow-hidden relative">
                <div className="flex h-full gap-3">
                    {/* Left Panel: Workflow Worklist Queue */}
                    <div className="w-80 flex flex-col h-full overflow-hidden shrink-0">
                        <div className="p-2.5 mb-2.5 synos-card-elevated dark:bg-synos-surface bg-white rounded-xl flex justify-between items-center shadow-xs">
                            <h2 className="font-bold text-xs tracking-tight dark:text-zinc-300 text-zinc-800 flex items-center gap-1.5">
                                <Activity className="h-3.5 w-3.5 text-emerald-500" />
                                <span>Modality Worklist</span>
                            </h2>
                            <button 
                                onClick={fetchQueue} 
                                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
                                title="Refresh Worklist"
                            >
                                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {/* Filter Tabs */}
                        <WorklistMatrixTabs
                            activeAssignmentTab={activeTab}
                            onAssignmentTabChange={setActiveTab}
                            showHistory={showHistory}
                            onTimeTabChange={setShowHistory}
                            availableCount={availableCount}
                            className="mb-2.5"
                        />

                        {/* Patient Card List */}
                        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                            {loading ? (
                                <div className="flex items-center justify-center h-28 text-zinc-500 text-xs gap-2">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-700" />
                                    <span>Loading Worklist...</span>
                                </div>
                            ) : displayQueue.length === 0 ? (
                                <div className="text-center py-10 text-zinc-400 text-xs font-medium">
                                    <span>No radiology studies in queue.</span>
                                </div>
                            ) : (
                                displayQueue.map((study) => {
                                    const isSelected = activeStudy?.radiologyStudyId === study.radiologyStudyId;
                                    return (
                                        <div
                                            key={study.radiologyStudyId}
                                            onClick={() => setActiveStudy(study)}
                                            className={`p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                                                isSelected 
                                                    ? 'synos-dept-card border-2 border-indigo-500/80 bg-indigo-50/40 dark:bg-indigo-950/20 -translate-y-0.5 shadow-sm' 
                                                    : 'synos-item-card dark:bg-synos-surface bg-white hover:-translate-y-0.5 hover:shadow-sm'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-250 dark:border-zinc-700">
                                                    {study.tokenNumber || 'N/A'}
                                                </span>
                                                <span className={`text-[10px] font-bold tracking-tight px-2 py-0.5 rounded border ${
                                                    study.status === 'Assigned' 
                                                        ? 'bg-indigo-50 text-indigo-700 dark:text-indigo-300 border-indigo-200'
                                                        : 'bg-emerald-50 text-emerald-700 dark:text-emerald-300 border-emerald-200'
                                                }`}>
                                                    • {formatStatusLabel(study.status)}
                                                </span>
                                            </div>

                                            <div className="flex items-baseline gap-1.5">
                                                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 tracking-tight">{study.patientName}</h3>
                                                {study.patientAge && (
                                                    <span className="font-mono text-[10px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                                                        {study.patientAge}y/{study.patientGender?.[0] || 'M'}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-2 pt-2 border-t border-zinc-150 dark:border-zinc-800 flex justify-between items-center">
                                                <span className="font-bold text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/40 uppercase tracking-tight">
                                                    {study.testName}
                                                </span>
                                                <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold">{study.modality}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Acquisition Active Workspace */}
                    <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
                        {activeStudy ? (
                            <div className="flex-1 flex flex-col overflow-hidden space-y-3">
                                {/* Active Patient Banner Card */}
                                <div className="synos-card-elevated dark:bg-synos-surface bg-white rounded-xl p-3 flex justify-between items-center shadow-xs">
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[10px] font-bold uppercase tracking-tight text-emerald-700 dark:text-emerald-400 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                ACTIVE SESSION
                                            </span>
                                            <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-100">{activeStudy.patientName}</h2>
                                        </div>
                                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">{activeStudy.testName} ({activeStudy.modality})</p>
                                    </div>

                                    <div className="flex items-center gap-2.5">
                                        {/* Image Count Badge */}
                                        <div className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold flex items-center gap-1.5 border ${
                                            dicomSliceCount > 0 
                                                ? 'bg-emerald-50 text-emerald-700 dark:text-emerald-300 border-emerald-200' 
                                                : 'bg-amber-50 text-amber-700 dark:text-amber-300 border-amber-200'
                                        }`}>
                                            <Database className="w-3.5 h-3.5" />
                                            <span>{checkingSliceCount ? 'Checking Node...' : `${dicomSliceCount} DICOM Images`}</span>
                                        </div>

                                        {activeStudy.status === 'PendingImaging' && (
                                            <button
                                                onClick={() => handleAssign(activeStudy.radiologyStudyId)}
                                                disabled={actionLoading}
                                                className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-lg uppercase tracking-wider flex items-center gap-1.5 transition-all duration-200 shadow-xs active:scale-[0.98]"
                                            >
                                                {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <User className="h-3 w-3" />}
                                                <span>Assign to Me</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Core Work Area */}
                                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                                    {activeStudy.status !== 'PendingImaging' ? (
                                        <div className="space-y-3">
                                            {/* Acquisition Stepper Progress Bar */}
                                            <div className="synos-card-elevated dark:bg-synos-surface bg-white rounded-xl p-3.5 flex items-center justify-between shadow-xs">
                                                <div className="flex items-center space-x-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 flex items-center justify-center font-bold text-xs">
                                                        1
                                                    </div>
                                                    <div>
                                                        <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">Study Claimed</div>
                                                        <div className="text-[10px] text-zinc-500 font-medium">In Scan Room</div>
                                                    </div>
                                                </div>

                                                <div className="h-0.5 w-12 bg-zinc-200 dark:bg-zinc-700" />

                                                <div className="flex items-center space-x-2.5">
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border ${
                                                        pacsStep > 0 
                                                            ? 'bg-indigo-50 text-indigo-700 dark:text-indigo-300 border-indigo-200' 
                                                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700'
                                                    }`}>
                                                        2
                                                    </div>
                                                    <div>
                                                        <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">Scanner Sync / Upload</div>
                                                        <div className="text-[10px] text-zinc-500 font-medium">DICOM Transfer</div>
                                                    </div>
                                                </div>

                                                <div className="h-0.5 w-12 bg-zinc-200 dark:bg-zinc-700" />

                                                <div className="flex items-center space-x-2.5">
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border ${
                                                        dicomSliceCount > 0 
                                                            ? 'bg-emerald-50 text-emerald-700 dark:text-emerald-300 border-emerald-200' 
                                                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700'
                                                    }`}>
                                                        3
                                                    </div>
                                                    <div>
                                                        <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">{dicomSliceCount} Images Ready</div>
                                                        <div className="text-[10px] text-zinc-500 font-medium">Indexed in PACS</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Ingestion Cards: Import From Scanner vs Manual Upload */}
                                            <div className="grid grid-cols-2 gap-3">
                                                {/* Card 1: Scanner Network Import */}
                                                <div className="synos-dept-card dark:bg-synos-surface bg-white rounded-xl p-4 flex flex-col justify-between min-h-[170px] shadow-xs">
                                                    <div>
                                                        <div className="flex items-center gap-1.5 mb-2">
                                                            <Cpu className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                                            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Import From Scanner</h3>
                                                        </div>
                                                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mb-3 font-medium">
                                                            Query connected local DICOM scanner network and sync DICOM series for this Accession.
                                                        </p>
                                                    </div>

                                                    {pacsStep === 0 ? (
                                                        <button
                                                            onClick={() => handleScannerImport(activeStudy)}
                                                            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all duration-200 shadow-xs flex items-center justify-center gap-2 active:scale-[0.98]"
                                                        >
                                                            <Monitor className="h-3.5 w-3.5" />
                                                            <span>Import From Scanner</span>
                                                        </button>
                                                    ) : (
                                                        <div className="space-y-2 bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                                            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                                                                <span className="text-zinc-500">Status</span>
                                                                <span className={pacsStep === 4 ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400"}>
                                                                    {pacsStep === 1 && "Querying Scanner..."}
                                                                    {pacsStep === 2 && "Connecting DICOM C-STORE..."}
                                                                    {pacsStep === 3 && "Ingesting Series..."}
                                                                    {pacsStep === 4 && "✓ Images Imported"}
                                                                </span>
                                                            </div>

                                                            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full transition-all duration-500 ${pacsStep === 4 ? 'bg-emerald-600' : 'bg-indigo-600'}`}
                                                                    style={{ width: `${(pacsStep / 4) * 100}%` }}
                                                                />
                                                            </div>

                                                            {pacsStep === 4 && (
                                                                <div className="text-[11px] text-zinc-600 dark:text-zinc-400 space-y-0.5 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                                                                    <div className="flex justify-between font-mono">
                                                                        <span>Accession:</span>
                                                                        <span className="text-zinc-900 dark:text-zinc-100 font-bold">{pacsAccession}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Card 2: Manual DICOM File Upload */}
                                                <div className="synos-dept-card dark:bg-synos-surface bg-white rounded-xl p-4 flex flex-col justify-between min-h-[170px] shadow-xs">
                                                    <div>
                                                        <div className="flex items-center gap-1.5 mb-2">
                                                            <UploadCloud className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                                            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Manual DICOM Upload</h3>
                                                        </div>
                                                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mb-3 font-medium">
                                                            Upload .dcm files or compressed ZIP archives directly from disk or USB.
                                                        </p>
                                                    </div>

                                                    <div className="relative">
                                                        <input 
                                                            type="file" 
                                                            accept=".dcm,.zip"
                                                            onChange={handleFileUpload}
                                                            className="hidden" 
                                                            id="dicom-file-upload" 
                                                            disabled={actionLoading}
                                                        />
                                                        <label 
                                                            htmlFor="dicom-file-upload"
                                                            className={`w-full py-2.5 bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 font-bold text-xs uppercase tracking-wider rounded-lg border border-zinc-300 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98] ${actionLoading ? 'opacity-50 pointer-events-none' : ''}`}
                                                        >
                                                            <UploadCloud className="h-3.5 w-3.5 text-amber-600" />
                                                            <span>Upload DICOM Files</span>
                                                        </label>

                                                        {uploadProgress > 0 && (
                                                            <div className="mt-2 space-y-1 bg-zinc-50 dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                                                <div className="flex justify-between text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                                                                    <span>Uploading DICOM dataset...</span>
                                                                    <span>{uploadProgress}%</span>
                                                                </div>
                                                                <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                                                    <div className="bg-amber-500 h-full transition-all" style={{ width: `${uploadProgress}%` }} />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="synos-card-elevated dark:bg-synos-surface bg-white rounded-xl p-8 text-center text-zinc-500 flex flex-col items-center justify-center shadow-xs">
                                            <CloudLightning className="h-8 w-8 text-zinc-400 mb-2 animate-bounce" />
                                            <span className="font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200">Awaiting Staff Assignment</span>
                                            <span className="text-[11px] text-zinc-500 mt-1 font-medium max-w-xs">Assign this study to yourself on the left to unlock scanner import and DICOM file controllers.</span>
                                        </div>
                                    )}

                                    {/* Hard Stop Release Drawer */}
                                    {activeStudy.status !== 'PendingImaging' && (
                                        <div className="synos-card-elevated dark:bg-synos-surface bg-white rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                                            <div>
                                                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs flex items-center gap-1.5">
                                                    <CheckCircle className={`h-4 w-4 ${dicomSliceCount > 0 ? 'text-emerald-600' : 'text-amber-600'}`} />
                                                    <span>Release Study to Reporting?</span>
                                                </h4>
                                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                                                    {dicomSliceCount > 0 
                                                        ? `✓ ${dicomSliceCount} DICOM images ready. Dispatch patient to radiologist dictation queue.`
                                                        : '⚠️ Hard Stop: Cannot release study. 0 DICOM images acquired. Import from scanner or upload files first.'}
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => handleComplete(activeStudy.radiologyStudyId)}
                                                disabled={actionLoading || (dicomSliceCount === 0 && !hasManualUpload)}
                                                className={`px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-lg transition-all duration-200 flex items-center gap-1.5 shadow-xs ${
                                                    dicomSliceCount > 0 || hasManualUpload
                                                        ? 'bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs active:scale-[0.98]'
                                                        : 'bg-zinc-100 text-zinc-400 border border-zinc-250 cursor-not-allowed opacity-60'
                                                }`}
                                            >
                                                <Check className="h-3.5 w-3.5" />
                                                <span>Release to Radiologist</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-400">
                                <Monitor className="h-10 w-10 mb-2 text-zinc-300 dark:text-zinc-700" />
                                <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-800 dark:text-zinc-200">Acquisition Workstation</h3>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm leading-relaxed font-medium">
                                    Select a pending or assigned patient from the worklist on the left to start mapping raw frames and dispatching study files.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
