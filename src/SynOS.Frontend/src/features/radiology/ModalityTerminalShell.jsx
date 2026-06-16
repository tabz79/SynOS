import React, { useState, useEffect } from 'react';
import { SystemBar } from '@/components/layout/SystemBar';
import { RadiologyApi } from '@/api/radiology';
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
    const [queue, setQueue] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeStudy, setActiveStudy] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    
    // PACS simulation state
    const [pacsStep, setPacsStep] = useState(0); // 0: Idle, 1: Connecting, 2: Querying, 3: Mapping, 4: Done
    const [pacsAccession, setPacsAccession] = useState('');
    const [pacsViewerUrl, setPacsViewerUrl] = useState('');
    const [uploadedFile, setUploadedFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [hasManualUpload, setHasManualUpload] = useState(false);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const statuses = showHistory 
                ? ['AwaitingDictation', 'DictationSessionStarted', 'DraftReady', 'AwaitingSignature', 'Signed', 'ManualVerified', 'Finalized'] 
                : ['PendingImaging', 'Assigned', 'AwaitingDictation', 'DictationSessionStarted', 'DraftReady', 'AwaitingSignature', 'Signed', 'ManualVerified', 'Finalized'];
            const data = await RadiologyApi.getTechnicianQueue(statuses, showHistory);
            // Filter by modality if applicable
            const filtered = data.filter(s => s.modality.toLowerCase().includes(modalityName.toLowerCase()) || modalityName === "General");
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

    const handleAssign = async (studyId) => {
        setActionLoading(true);
        try {
            await RadiologyApi.assignStudy(studyId);
            // Refresh queue and select active study
            const statuses = showHistory 
                ? ['AwaitingDictation', 'DictationSessionStarted', 'DraftReady', 'AwaitingSignature', 'Signed', 'ManualVerified', 'Finalized'] 
                : ['PendingImaging', 'Assigned', 'AwaitingDictation', 'DictationSessionStarted', 'DraftReady', 'AwaitingSignature', 'Signed', 'ManualVerified', 'Finalized'];
            const data = await RadiologyApi.getTechnicianQueue(statuses, showHistory);
            const updated = data.find(s => s.radiologyStudyId === studyId);
            setActiveStudy(updated);
            fetchQueue();
        } catch (error) {
            alert(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const runPacsSimulation = (study) => {
        setPacsStep(1);
        const accession = `ACC-${modalityName.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
        setPacsAccession(accession);
        setPacsViewerUrl(`http://orthanc.synos.internal/viewer?study=${study.radiologyStudyId}`);

        setTimeout(() => {
            setPacsStep(2); // Querying
            setTimeout(() => {
                setPacsStep(3); // Mapping Metadata
                setTimeout(async () => {
                    try {
                        await RadiologyApi.setExternalMapping(
                            study.radiologyStudyId,
                            "Orthanc PACS Core",
                            accession,
                            `http://orthanc.synos.internal/viewer?study=${study.radiologyStudyId}`
                        );
                        setPacsStep(4); // Done
                    } catch (err) {
                        console.error(err);
                        setPacsStep(0);
                    }
                }, 1200);
            }, 1200);
        }, 1000);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadedFile(file);
        setActionLoading(true);
        setUploadProgress(20);

        try {
            setUploadProgress(50);
            await RadiologyApi.uploadAttachment(activeStudy.radiologyStudyId, file);
            setUploadProgress(100);
            setHasManualUpload(true);
            setTimeout(() => {
                fetchQueue();
                setUploadedFile(null);
                setUploadProgress(0);
            }, 800);
        } catch (error) {
            alert("File upload failed: " + error.message);
            setUploadedFile(null);
            setUploadProgress(0);
        } finally {
            setActionLoading(false);
        }
    };

    const handleComplete = async (studyId) => {
        setActionLoading(true);
        try {
            await RadiologyApi.markImagingCompleted(studyId);
            setActiveStudy(null);
            setPacsStep(0);
            setPacsAccession('');
            setPacsViewerUrl('');
            setHasManualUpload(false);
            fetchQueue();
        } catch (error) {
            alert(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen dark:bg-synos-background bg-zinc-50 dark:text-zinc-100 text-zinc-800 flex flex-col font-sans select-none overflow-hidden">
            {/* System Header */}
            <SystemBar title={`${modalityName} Acquisition Terminal`} status="Live" />

            {/* Main Workbench Layout */}
            <div className="flex-1 grid grid-cols-12 overflow-hidden">
                {/* Left Panel: Workflow Worklist Queue */}
                <div className="col-span-4 border-r dark:border-synos-border border-zinc-200 flex flex-col h-full dark:bg-synos-background/40 bg-zinc-50/50">
                    <div className="p-4 border-b dark:border-synos-border border-zinc-200 flex flex-col gap-3 dark:bg-synos-surface bg-white">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
                                <span className="font-bold text-sm uppercase tracking-wider dark:text-zinc-300 text-zinc-700">Modality Worklist</span>
                            </div>
                            <button 
                                onClick={fetchQueue}
                                className="p-1.5 dark:hover:bg-zinc-800 hover:bg-zinc-200/60 rounded transition-colors dark:text-zinc-400 text-zinc-650 hover:dark:text-zinc-200 hover:text-zinc-900"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="flex items-center gap-2 dark:bg-zinc-950/50 bg-zinc-50 rounded-lg p-1 border dark:border-white/5 border-zinc-200 shadow-sm w-fit">
                            <button
                                onClick={() => setShowHistory(false)}
                                className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded transition-all ${
                                    !showHistory ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                                }`}
                            >
                                Live
                            </button>
                            <button
                                onClick={() => setShowHistory(true)}
                                className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded transition-all ${
                                    showHistory ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                                }`}
                            >
                                History (7d)
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {loading ? (
                            <div className="h-full flex items-center justify-center flex-col gap-2 text-zinc-500">
                                <Loader2 className="h-8 w-8 animate-spin text-zinc-650" />
                                <span className="text-xs">Loading modality worklist...</span>
                            </div>
                        ) : queue.length === 0 ? (
                            <div className="h-full flex items-center justify-center flex-col p-8 text-center dark:text-zinc-500 text-zinc-400">
                                <Database className="h-8 w-8 mb-2 dark:text-zinc-700 text-zinc-300" />
                                <span className="text-xs font-semibold uppercase">No Pending Patients</span>
                                <span className="text-[10px] mt-1 dark:text-zinc-500 text-zinc-550">All scans for this terminal are completed.</span>
                            </div>
                        ) : (
                            queue.map((study) => {
                                const isSelected = activeStudy?.radiologyStudyId === study.radiologyStudyId;
                                return (
                                    <div 
                                        key={study.radiologyStudyId}
                                        onClick={() => {
                                            setActiveStudy(study);
                                            setPacsStep(0);
                                            setHasManualUpload(false);
                                        }}
                                        className={`p-3.5 rounded-lg border transition-all duration-260 ease-synos cursor-pointer ${
                                            isSelected 
                                                ? 'bg-synos-primary/10 dark:text-white text-synos-primary dark:border-synos-primary/20 border-synos-primary/30 shadow-sm' 
                                                : 'dark:bg-synos-surface bg-white dark:border-synos-border border-zinc-200 dark:hover:border-zinc-500 hover:border-zinc-400 hover:shadow-sm'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-1.5">
                                            <span className="text-[10px] font-black uppercase dark:bg-zinc-800 bg-zinc-100 dark:text-zinc-300 text-zinc-600 px-2 py-0.5 rounded tracking-wide">
                                                Token #{study.tokenNumber}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                study.status === 'Assigned' 
                                                    ? 'dark:bg-emerald-500/10 bg-emerald-50 text-emerald-650 dark:text-emerald-400 dark:border-emerald-500/20 border-emerald-200' 
                                                    : 'dark:bg-amber-500/10 bg-amber-50 text-amber-650 dark:text-amber-400 dark:border-amber-500/20 border-amber-200'
                                            }`}>
                                                {study.status}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-sm dark:text-zinc-150 text-zinc-800 tracking-tight">{study.patientName}</h3>
                                        <div className="flex gap-3 text-[10px] dark:text-zinc-400 text-zinc-500 mt-1">
                                            <span>Age: {study.patientAge}</span>
                                            <span>Gender: {study.patientGender}</span>
                                        </div>
                                        <div className="text-[11px] font-semibold dark:text-zinc-300 text-zinc-700 mt-2 dark:bg-synos-background bg-zinc-50 p-1.5 rounded border dark:border-synos-border border-zinc-200/60 flex items-center justify-between">
                                            <span>{study.testName}</span>
                                            <span className="text-zinc-400 dark:text-zinc-500">{study.modality}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Panel: Selected Study Viewport & Actions */}
                <div className="col-span-8 h-full flex flex-col overflow-hidden dark:bg-synos-background bg-zinc-50">
                    {activeStudy ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Patient Ribbon */}
                            <div className="p-4 border-b dark:border-synos-border border-zinc-200 dark:bg-synos-surface bg-white flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-xs font-black uppercase dark:text-emerald-400 text-emerald-600 dark:bg-emerald-500/10 bg-emerald-50 px-2 py-0.5 rounded border dark:border-emerald-500/20 border-emerald-250">
                                            ACTIVE SESSION
                                        </span>
                                        <h2 className="font-bold text-base dark:text-zinc-200 text-zinc-850">{activeStudy.patientName}</h2>
                                    </div>
                                    <p className="text-xs dark:text-zinc-400 text-zinc-500">{activeStudy.testName} ({activeStudy.modality})</p>
                                </div>
                                {activeStudy.status === 'PendingImaging' && (
                                    <button
                                        onClick={() => handleAssign(activeStudy.radiologyStudyId)}
                                        disabled={actionLoading}
                                        className="px-4 py-2 bg-synos-primary hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs rounded uppercase tracking-wider flex items-center gap-1.5 transition-all duration-260 ease-synos active:scale-[0.98] shadow-sm"
                                    >
                                        {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <User className="h-3.5 w-3.5" />}
                                        Assign to Me
                                    </button>
                                )}
                            </div>

                            {/* Core Work Area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {activeStudy.status === 'Assigned' ? (
                                    <div className="grid grid-cols-2 gap-6">
                                        {/* PACS Core Simulator */}
                                        <div className="dark:bg-synos-surface bg-white border dark:border-synos-border border-zinc-200 rounded-xl p-5 flex flex-col justify-between min-h-[220px] shadow-sm">
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Cpu className="h-5 w-5 text-synos-primary" />
                                                    <h3 className="font-bold text-sm uppercase tracking-wider dark:text-zinc-300 text-zinc-700">PACS Gateway Registry</h3>
                                                </div>
                                                <p className="text-xs dark:text-zinc-400 text-zinc-500 leading-relaxed mb-4">
                                                    Synchronize diagnostic imaging files directly from the Orthanc PACS imaging hardware node.
                                                </p>
                                            </div>

                                            {pacsStep === 0 ? (
                                                <button
                                                    onClick={() => runPacsSimulation(activeStudy)}
                                                    className="w-full py-2.5 bg-synos-primary hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider rounded transition-all duration-260 ease-synos flex items-center justify-center gap-1.5 shadow-sm"
                                                >
                                                    <Monitor className="h-3.5 w-3.5" />
                                                    Trigger PACS Acquisition
                                                </button>
                                            ) : (
                                                <div className="space-y-3 dark:bg-synos-background bg-zinc-50 p-4 rounded-lg border dark:border-synos-border border-zinc-250">
                                                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                                                        <span className="dark:text-zinc-500 text-zinc-500 font-medium">Status</span>
                                                        <span className={pacsStep === 4 ? "text-emerald-500 font-black" : "text-synos-primary font-black"}>
                                                            {pacsStep === 1 && "Connecting Node..."}
                                                            {pacsStep === 2 && "Querying DICOM Hierarchy..."}
                                                            {pacsStep === 3 && "Broadcasting Metadata..."}
                                                            {pacsStep === 4 && "PACS Resolution Sync Complete"}
                                                        </span>
                                                    </div>

                                                    <div className="w-full dark:bg-zinc-800 bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-500 ${pacsStep === 4 ? 'bg-emerald-500' : 'bg-synos-primary'}`}
                                                            style={{ width: `${(pacsStep / 4) * 100}%` }}
                                                        />
                                                    </div>

                                                    {pacsStep === 4 && (
                                                        <div className="text-[10px] dark:text-zinc-400 text-zinc-550 space-y-1 pt-1.5 border-t dark:border-synos-border border-zinc-200">
                                                            <div className="flex justify-between">
                                                                <span>Accession Number:</span>
                                                                <span className="font-mono dark:text-zinc-300 text-zinc-700 font-bold">{pacsAccession}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>Viewer Stream:</span>
                                                                <span className="font-mono text-synos-primary hover:underline cursor-pointer truncate max-w-[200px]" onClick={() => window.open(pacsViewerUrl, '_blank')}>Orthanc Stream</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* DICOM Fallback Manual Uploader */}
                                        <div className="dark:bg-synos-surface bg-white border dark:border-synos-border border-zinc-200 rounded-xl p-5 flex flex-col justify-between min-h-[220px] shadow-sm">
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <UploadCloud className="h-5 w-5 text-synos-amber" />
                                                    <h3 className="font-bold text-sm uppercase tracking-wider dark:text-zinc-300 text-zinc-700">Manual DICOM Fallback</h3>
                                                </div>
                                                <p className="text-xs dark:text-zinc-400 text-zinc-500 leading-relaxed mb-4">
                                                    If Orthanc broker mapping is down, manually upload consolidated DICOM image PDFs or compressed ZIP archives.
                                                </p>
                                            </div>

                                            <div className="relative">
                                                <input 
                                                    type="file" 
                                                    accept=".pdf,.zip"
                                                    onChange={handleFileUpload}
                                                    className="hidden" 
                                                    id="dicom-file-upload" 
                                                    disabled={actionLoading}
                                                />
                                                <label 
                                                    htmlFor="dicom-file-upload"
                                                    className={`w-full py-2.5 dark:bg-zinc-800 bg-zinc-100 hover:dark:bg-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-200 text-zinc-750 font-bold text-xs uppercase tracking-wider rounded border dark:border-zinc-700 border-zinc-250 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${actionLoading ? 'opacity-50 pointer-events-none' : ''}`}
                                                >
                                                    <UploadCloud className="h-3.5 w-3.5" />
                                                    Upload Backup Scan
                                                </label>

                                                {uploadProgress > 0 && (
                                                    <div className="mt-3 space-y-1.5 dark:bg-synos-background bg-zinc-50 p-3 rounded border dark:border-synos-border border-zinc-200">
                                                        <div className="flex justify-between text-[10px] font-bold dark:text-zinc-400 text-zinc-500">
                                                            <span>Uploading backup scan...</span>
                                                            <span>{uploadProgress}%</span>
                                                        </div>
                                                        <div className="w-full dark:bg-zinc-800 bg-zinc-200 h-1 rounded-full overflow-hidden">
                                                            <div className="bg-synos-amber h-full transition-all" style={{ width: `${uploadProgress}%` }} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="dark:bg-synos-surface bg-white border border-dashed dark:border-synos-border border-zinc-350 rounded-xl p-8 text-center dark:text-zinc-500 text-zinc-400 flex flex-col items-center justify-center shadow-sm">
                                        <CloudLightning className="h-8 w-8 dark:text-zinc-750 text-zinc-300 mb-2 animate-bounce" />
                                        <span className="font-semibold text-xs uppercase tracking-wider">Awaiting Staff Assignment</span>
                                        <span className="text-[10px] mt-1">Assign this study to yourself above to unlock dynamic simulation and attachment controllers.</span>
                                    </div>
                                )}

                                {/* Completion Drawer */}
                                {activeStudy.status === 'Assigned' && (
                                    <div className="p-5 dark:bg-synos-surface bg-white border dark:border-synos-border border-zinc-200 rounded-xl flex items-center justify-between shadow-sm">
                                        <div>
                                            <h4 className="font-bold dark:text-zinc-250 text-zinc-800 text-sm flex items-center gap-1.5">
                                                <CheckCircle className="h-4.5 w-4.5 text-emerald-400" />
                                                Ready for Dictation Dispatch?
                                            </h4>
                                            <p className="dark:text-zinc-400 text-zinc-550 text-xs mt-1">
                                                Once raw scans are mapped or manual archives are uploaded, finalize this step to dispatch the patient to the Radiologist dictation queue.
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => handleComplete(activeStudy.radiologyStudyId)}
                                            disabled={actionLoading || (pacsStep !== 4 && !hasManualUpload && uploadProgress === 0 && !uploadedFile)}
                                            className="px-5 py-2.5 bg-synos-emerald hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider rounded transition-all duration-260 ease-synos flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:pointer-events-none"
                                        >
                                            <Check className="h-3.5 w-3.5" />
                                            Release Study to reporting
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center dark:text-zinc-500 text-zinc-400">
                            <Monitor className="h-10 w-10 mb-2 dark:text-zinc-700 text-zinc-300" />
                            <h3 className="font-bold text-sm uppercase tracking-wider dark:text-zinc-300 text-zinc-750">Acquisition Workstation</h3>
                            <p className="text-[11px] dark:text-zinc-500 text-zinc-500 mt-1 max-w-sm leading-relaxed">
                                Select a pending or assigned patient from the worklist on the left to start mapping raw frames and dispatching study files.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
