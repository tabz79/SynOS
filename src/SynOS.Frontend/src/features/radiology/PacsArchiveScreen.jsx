import React, { useState, useEffect } from 'react';
import { 
    Search, 
    Filter, 
    HardDrive, 
    Layers, 
    FileText, 
    UploadCloud, 
    Eye, 
    RefreshCw, 
    X, 
    Calendar, 
    User, 
    Activity, 
    CheckCircle2, 
    Clock, 
    Maximize2,
    Database,
    FolderArchive,
    SlidersHorizontal,
    DownloadCloud,
    History,
    FileSpreadsheet
} from 'lucide-react';
import { RadiologyApi } from '@/api/radiology';
import { DicomViewerContainer } from './DicomViewerContainer';

export function PacsArchiveScreen() {
    const [studies, setStudies] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Saince PACS Filter States
    const [showFilters, setShowFilters] = useState(true);
    const [filterPatientName, setFilterPatientName] = useState('');
    const [filterMrn, setFilterMrn] = useState('');
    const [filterAccession, setFilterAccession] = useState('');
    const [filterModality, setFilterModality] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [datePreset, setDatePreset] = useState('ALL');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const [selectedStudy, setSelectedStudy] = useState(null); // Drawer inspector hidden when null
    const [viewerStudy, setViewerStudy] = useState(null);
    const [seriesTree, setSeriesTree] = useState(null);
    const [seriesLoading, setSeriesLoading] = useState(false);
    const [storageStats, setStorageStats] = useState(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadFiles, setUploadFiles] = useState([]);
    
    // Report preview modal state
    const [reportModalStudy, setReportModalStudy] = useState(null);
    const [reportModalData, setReportModalData] = useState(null);
    const [reportModalLoading, setReportModalLoading] = useState(false);

    const fetchStudies = async () => {
        setLoading(true);
        try {
            const data = await RadiologyApi.getRadiologistWorklist();
            setStudies(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load PACS worklist studies:", err);
            setStudies([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchStorageStats = async () => {
        try {
            const stats = await RadiologyApi.getStorageStats();
            setStorageStats(stats);
        } catch (err) {
            // Stats optional
        }
    };

    useEffect(() => {
        fetchStudies();
        fetchStorageStats();
    }, []);

    const handleSelectStudy = async (study) => {
        setSelectedStudy(study);
        setSeriesLoading(true);
        try {
            const tree = await RadiologyApi.getSeriesTree(study.radiologyStudyId);
            setSeriesTree(tree);
        } catch (err) {
            console.error("Failed to fetch series tree:", err);
            setSeriesTree(null);
        } finally {
            setSeriesLoading(false);
        }
    };

    const [viewerUrls, setViewerUrls] = useState([]);
    const [viewerLoading, setViewerLoading] = useState(false);

    const handleOpenViewer = async (study) => {
        setViewerStudy(study);
        setViewerUrls([]);
        setViewerLoading(true);
        try {
            let urls = [];
            if (study.images && study.images.length > 0) {
                urls = study.images.map(img => img.fileUrl);
            }

            if (urls.length === 0) {
                try {
                    const res = await fetch(`/api/v1/radiology/reports/${study.radiologyStudyId}`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
                    });
                    if (res.ok) {
                        const details = await res.json();
                        if (details && details.images && details.images.length > 0) {
                            urls = details.images.map(img => img.fileUrl);
                        }
                    }
                } catch (e) {
                    console.warn("Failed to fetch study report details for PACS viewer:", e);
                }
            }

            const tree = await RadiologyApi.getSeriesTree(study.radiologyStudyId).catch(() => null);
            if (tree && tree.series) {
                tree.series.forEach(s => {
                    if (s.instances) {
                        s.instances.forEach(inst => {
                            const fileUrl = `/api/v1/radiology/pacs/instances/${inst.instanceId}/file`;
                            if (!urls.includes(fileUrl)) {
                                urls.push(fileUrl);
                            }
                        });
                    }
                });
            }
            setViewerUrls(urls);
        } catch (e) {
            console.error("Failed to load viewer URLs for study:", e);
            setViewerUrls([]);
        } finally {
            setViewerLoading(false);
        }
    };

    const handleViewReport = async (study) => {
        setReportModalStudy(study);
        setReportModalLoading(true);
        setReportModalData(null);
        try {
            const res = await fetch(`/api/v1/radiology/reports/${study.radiologyStudyId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setReportModalData(data);
            }
        } catch (err) {
            console.error("Failed to fetch report details:", err);
        } finally {
            setReportModalLoading(false);
        }
    };

    const handleDownloadZip = (study) => {
        const url = `/api/v1/radiology/pacs/studies/${study.radiologyStudyId}/download-zip`;
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Study_${study.accessionNumber || study.radiologyStudyId}.zip`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const handleFileUploadSubmit = async () => {
        if (!selectedStudy || uploadFiles.length === 0) return;
        setUploading(true);
        try {
            const formData = new FormData();
            Array.from(uploadFiles).forEach(file => {
                formData.append('files', file);
            });
            await RadiologyApi.uploadDicom(selectedStudy.radiologyStudyId, formData);
            setShowUploadModal(false);
            setUploadFiles([]);
            await handleSelectStudy(selectedStudy);
            await fetchStudies();
        } catch (err) {
            alert(err.message || 'Failed to upload DICOM files.');
        } finally {
            setUploading(false);
        }
    };

    const clearFilters = () => {
        setFilterPatientName('');
        setFilterMrn('');
        setFilterAccession('');
        setFilterModality('ALL');
        setFilterStatus('ALL');
        setDatePreset('ALL');
        setFromDate('');
        setToDate('');
    };

    // Format study date cleanly
    const formatStudyDate = (dateStr) => {
        if (!dateStr) return 'Today';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'Today';
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        if (isToday) return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Filter studies logic matching Saince PACS rules
    const filteredStudies = studies.filter(s => {
        const matchesName = !filterPatientName || (s.patientName && s.patientName.toLowerCase().includes(filterPatientName.toLowerCase()));
        const matchesMrn = !filterMrn || ((s.uhid || '').toLowerCase().includes(filterMrn.toLowerCase()));
        const matchesAccession = !filterAccession || ((s.accessionNumber || '').toLowerCase().includes(filterAccession.toLowerCase()));
        
        const matchesModality = 
            filterModality === 'ALL' || 
            (s.modality && s.modality.toUpperCase() === filterModality) ||
            (s.testName && s.testName.toUpperCase().includes(filterModality));

        const matchesStatus = 
            filterStatus === 'ALL' ||
            (filterStatus === 'PENDING' && !['Signed', 'ManualVerified', 'Finalized'].includes(s.status)) ||
            (filterStatus === 'SIGNED' && ['Signed', 'ManualVerified', 'Finalized'].includes(s.status));

        // Date Preset Filter
        let matchesDate = true;
        if (s.createdAt) {
            const studyDate = new Date(s.createdAt);
            const now = new Date();
            if (datePreset === 'TODAY') {
                matchesDate = studyDate.toDateString() === now.toDateString();
            } else if (datePreset === 'YESTERDAY') {
                const yest = new Date(now);
                yest.setDate(yest.getDate() - 1);
                matchesDate = studyDate.toDateString() === yest.toDateString();
            } else if (datePreset === 'PAST3') {
                const p3 = new Date(now);
                p3.setDate(p3.getDate() - 3);
                matchesDate = studyDate >= p3;
            } else if (datePreset === 'PAST7') {
                const p7 = new Date(now);
                p7.setDate(p7.getDate() - 7);
                matchesDate = studyDate >= p7;
            } else if (datePreset === 'PAST30') {
                const p30 = new Date(now);
                p30.setDate(p30.getDate() - 30);
                matchesDate = studyDate >= p30;
            } else if (datePreset === 'CUSTOM') {
                if (fromDate) matchesDate = matchesDate && studyDate >= new Date(fromDate);
                if (toDate) {
                    const toDateObj = new Date(toDate);
                    toDateObj.setHours(23, 59, 59);
                    matchesDate = matchesDate && studyDate <= toDateObj;
                }
            }
        }

        return matchesName && matchesMrn && matchesAccession && matchesModality && matchesStatus && matchesDate;
    });

    return (
        <div className="flex flex-col h-full dark:bg-synos-background bg-slate-50 text-foreground font-sans overflow-hidden">
            {/* Storage Metric Header Banner */}
            <div className="synos-card-elevated dark:bg-synos-surface bg-white px-6 py-3.5 border-b border-zinc-200/80 dark:border-zinc-700 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2.5">
                        <HardDrive className="w-5 h-5 text-emerald-600" />
                        <div>
                            <div className="text-xxs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold">PACS Storage Root</div>
                            <div className="text-xs font-mono text-zinc-800 dark:text-zinc-200 font-bold bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-md border border-zinc-250 dark:border-zinc-700 mt-0.5">C:\SynOS_Files\PACS</div>
                        </div>
                    </div>

                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

                    <div className="flex items-center space-x-2.5">
                        <Database className="w-5 h-5 text-indigo-600" />
                        <div>
                            <div className="text-xxs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold">Archived Studies</div>
                            <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/40 mt-0.5">{studies.length} Registered ({filteredStudies.length} Filtered)</div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl flex items-center space-x-1.5 border border-zinc-300 dark:border-zinc-700 transition"
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{showFilters ? 'Hide Filter' : 'Show Filter'}</span>
                    </button>

                    <button 
                        onClick={fetchStudies}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm active:scale-[0.98] transition"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh Archive</span>
                    </button>
                </div>
            </div>

            {/* Saince PACS Filter Bar */}
            {showFilters && (
                <div className="p-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3 transition-all">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                        {/* Patient Name */}
                        <div>
                            <label className="block text-xxs font-bold uppercase tracking-wider text-zinc-500 mb-1">Patient Name</label>
                            <input 
                                type="text"
                                placeholder="Search Name..."
                                value={filterPatientName}
                                onChange={(e) => setFilterPatientName(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>

                        {/* MRN / UHID */}
                        <div>
                            <label className="block text-xxs font-bold uppercase tracking-wider text-zinc-500 mb-1">MRN / UHID</label>
                            <input 
                                type="text"
                                placeholder="Search MRN/UHID..."
                                value={filterMrn}
                                onChange={(e) => setFilterMrn(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Accession Number */}
                        <div>
                            <label className="block text-xxs font-bold uppercase tracking-wider text-zinc-500 mb-1">Accession Number</label>
                            <input 
                                type="text"
                                placeholder="Search Accession..."
                                value={filterAccession}
                                onChange={(e) => setFilterAccession(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Modality */}
                        <div>
                            <label className="block text-xxs font-bold uppercase tracking-wider text-zinc-500 mb-1">Modality</label>
                            <select 
                                value={filterModality}
                                onChange={(e) => setFilterModality(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="ALL">Any Modality</option>
                                <option value="XR">X-Ray (XR)</option>
                                <option value="CT">CT Scan (CT)</option>
                                <option value="MRI">MRI Scan (MRI)</option>
                                <option value="US">Ultrasound (US)</option>
                            </select>
                        </div>

                        {/* Report Status */}
                        <div>
                            <label className="block text-xxs font-bold uppercase tracking-wider text-zinc-500 mb-1">Report Status</label>
                            <select 
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="ALL">Any Status</option>
                                <option value="PENDING">Pending / In Progress</option>
                                <option value="SIGNED">Signed Reports</option>
                            </select>
                        </div>

                        {/* Study Dates Presets */}
                        <div>
                            <label className="block text-xxs font-bold uppercase tracking-wider text-zinc-500 mb-1">Study Dates</label>
                            <select 
                                value={datePreset}
                                onChange={(e) => setDatePreset(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="ALL">All Dates</option>
                                <option value="TODAY">Today</option>
                                <option value="YESTERDAY">Yesterday</option>
                                <option value="PAST3">Past 3 Days</option>
                                <option value="PAST7">Past 7 Days</option>
                                <option value="PAST30">Past 30 Days</option>
                                <option value="CUSTOM">Custom Range</option>
                            </select>
                        </div>
                    </div>

                    {datePreset === 'CUSTOM' && (
                        <div className="flex items-center space-x-3 pt-1 text-xs">
                            <div className="flex items-center space-x-1.5">
                                <span className="text-zinc-500 font-bold">From:</span>
                                <input 
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="bg-slate-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                                />
                            </div>
                            <div className="flex items-center space-x-1.5">
                                <span className="text-zinc-500 font-bold">To:</span>
                                <input 
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="bg-slate-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end space-x-2 border-t border-zinc-150 dark:border-zinc-800 pt-2.5">
                        <button 
                            onClick={clearFilters}
                            className="px-3.5 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 text-zinc-700 dark:text-zinc-300 rounded-lg font-bold text-xs transition"
                        >
                            Clear Filter
                        </button>
                    </div>
                </div>
            )}

            {/* Main Master Workspace */}
            <div className="flex-1 flex overflow-hidden p-4 gap-4">
                {/* Left Panel: Study Worklist Table */}
                <div className="flex-1 overflow-y-auto space-y-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-zinc-500 text-xs">
                            <RefreshCw className="w-6 h-6 animate-spin mb-2 text-zinc-700" />
                            <span>Querying PACS Database...</span>
                        </div>
                    ) : filteredStudies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-zinc-400 text-xs font-medium">
                            <FolderArchive className="w-8 h-8 mb-2 text-zinc-300" />
                            <span>No archived DICOM studies match your search criteria.</span>
                        </div>
                    ) : (
                        <div className="synos-card-elevated dark:bg-synos-surface bg-white rounded-2xl border border-zinc-250 dark:border-zinc-700 overflow-hidden shadow-sm">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-zinc-100/90 dark:bg-zinc-800/90 border-b border-zinc-250 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold uppercase text-xxs tracking-wider">
                                        <th className="p-3.5">Patient & UHID</th>
                                        <th className="p-3.5">Study / Modality</th>
                                        <th className="p-3.5">Accession Number</th>
                                        <th className="p-3.5">Date & Time</th>
                                        <th className="p-3.5">#SE / #IM</th>
                                        <th className="p-3.5">REPORT STATUS</th>
                                        <th className="p-3.5 text-right">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-150 dark:divide-zinc-800">
                                    {filteredStudies.map((study) => {
                                        const isSelected = selectedStudy?.radiologyStudyId === study.radiologyStudyId;
                                        const totalImagesCount = study.images?.length || 0;
                                        const isSigned = ['Signed', 'Finalized', 'ManualVerified'].includes(study.status);
                                        return (
                                            <tr 
                                                key={study.radiologyStudyId}
                                                onClick={() => handleSelectStudy(study)}
                                                className={`cursor-pointer transition-colors duration-150 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 ${
                                                    isSelected ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-l-4 border-indigo-600 font-medium' : ''
                                                }`}
                                            >
                                                <td className="p-3.5">
                                                    <div className="font-bold text-zinc-900 dark:text-zinc-100">{study.patientName || 'Unknown Patient'}</div>
                                                    <div className="text-xxs font-mono text-zinc-500 mt-0.5">{study.uhid || 'N/A'} • {study.patientAge ? `${study.patientAge}Y` : ''} {study.patientGender || ''}</div>
                                                </td>
                                                <td className="p-3.5">
                                                    <div className="font-bold text-indigo-700 dark:text-indigo-300">{study.testName || 'Radiology Study'}</div>
                                                    <div className="text-xxs text-zinc-500 uppercase font-mono font-bold">{study.modality || 'RAD'}</div>
                                                </td>
                                                <td className="p-3.5 font-mono text-zinc-800 dark:text-zinc-200 font-bold">
                                                    {study.accessionNumber || 'N/A'}
                                                </td>
                                                <td className="p-3.5 text-zinc-600 dark:text-zinc-300 text-xxs font-mono font-medium">
                                                    {formatStudyDate(study.createdAt || study.createdDate)}
                                                </td>
                                                <td className="p-3.5 font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                                    1 / {totalImagesCount}
                                                </td>
                                                {/* REPORT STATUS Column: ONLY In Progress or Signed */}
                                                <td className="p-3.5">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xxs font-bold uppercase tracking-wider border ${
                                                        isSigned
                                                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                                                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                                                    }`}>
                                                        • {isSigned ? 'Signed' : 'In Progress'}
                                                    </span>
                                                </td>
                                                {/* ACTIONS Column: Primary "Study" button + 3 compact action icons */}
                                                <td className="p-3.5 text-right">
                                                    <div className="flex items-center justify-end space-x-1.5">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenViewer(study);
                                                            }}
                                                            className="group px-3 py-1.5 bg-zinc-900 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold inline-flex items-center shadow-sm hover:shadow transition-all duration-200 active:scale-[0.98]"
                                                            title="Open DICOM Study Viewer"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 mr-1 text-indigo-400 group-hover:text-white" />
                                                            <span>Study</span>
                                                        </button>

                                                        {/* Icon Action 1: Download Study DICOM Zip */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownloadZip(study);
                                                            }}
                                                            className="p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition"
                                                            title="Download Study (.ZIP Archive)"
                                                        >
                                                            <DownloadCloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                        </button>

                                                        {/* Icon Action 2: View Report PDF / Details */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleViewReport(study);
                                                            }}
                                                            className="p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition"
                                                            title="View Clinical Report"
                                                        >
                                                            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                        </button>

                                                        {/* Icon Action 3: Filter Patient Scans History */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setFilterMrn(study.uhid || '');
                                                            }}
                                                            className="p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition"
                                                            title="Patient Scans History"
                                                        >
                                                            <History className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Right Drawer Inspector: HIDDEN BY DEFAULT, slides in on row click */}
                {selectedStudy && (
                    <div className="w-80 synos-card-elevated dark:bg-synos-surface bg-white rounded-2xl p-4 flex flex-col justify-between shadow-lg border border-zinc-250 dark:border-zinc-700 h-full animate-in slide-in-from-right duration-200">
                        <div className="flex flex-col h-full space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-xxs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold mb-0.5">Selected DICOM Study</div>
                                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{selectedStudy.testName}</h3>
                                </div>
                                <button 
                                    onClick={() => setSelectedStudy(null)}
                                    className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                                    title="Close Inspector"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5 bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                <div><span className="text-zinc-500 font-medium">Patient:</span> <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedStudy.patientName}</span></div>
                                <div><span className="text-zinc-500 font-medium">UHID:</span> <span className="font-mono text-zinc-800 dark:text-zinc-200 font-bold">{selectedStudy.uhid || 'N/A'}</span></div>
                                <div><span className="text-zinc-500 font-medium">Accession:</span> <span className="font-mono text-zinc-800 dark:text-zinc-200 font-bold">{selectedStudy.accessionNumber || 'N/A'}</span></div>
                                <div><span className="text-zinc-500 font-medium">Exact Workflow State:</span> <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{selectedStudy.status}</span></div>
                            </div>

                            {/* Full-Height Series Hierarchy Section */}
                            <div className="flex-1 flex flex-col border-t border-zinc-200 dark:border-zinc-800 pt-3 overflow-hidden">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Series Hierarchy</span>
                                    <button 
                                        onClick={() => setShowUploadModal(true)}
                                        className="text-xxs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
                                    >
                                        <UploadCloud className="w-3.5 h-3.5" />
                                        <span>Upload DICOM</span>
                                    </button>
                                </div>

                                {seriesLoading ? (
                                    <div className="flex items-center justify-center py-6 text-zinc-400 text-xs">
                                        <RefreshCw className="w-4 h-4 animate-spin mr-2 text-zinc-700" />
                                        <span>Loading series...</span>
                                    </div>
                                ) : selectedStudy.images && selectedStudy.images.length > 0 ? (
                                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                        <div 
                                            onClick={() => handleOpenViewer(selectedStudy)}
                                            className="bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100/80 p-3 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 text-xs cursor-pointer transition shadow-xs"
                                        >
                                            <div className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                                                <span>{selectedStudy.modality || 'MR'} Diagnostic Image Series</span>
                                                <Eye className="w-3.5 h-3.5 text-indigo-500" />
                                            </div>
                                            <div className="flex justify-between text-xxs text-indigo-600 dark:text-indigo-400 mt-1.5 font-mono font-bold">
                                                <span>Modality: {selectedStudy.modality}</span>
                                                <span>{selectedStudy.images.length} Slices</span>
                                            </div>
                                        </div>

                                        {seriesTree && seriesTree.series && seriesTree.series.filter(s => (s.instanceCount || 0) > 0).map(ser => (
                                            <div 
                                                key={ser.seriesId} 
                                                onClick={() => handleOpenViewer(selectedStudy)}
                                                className="bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs cursor-pointer transition"
                                            >
                                                <div className="font-bold text-zinc-800 dark:text-zinc-200">{ser.seriesDescription || `${ser.modality || selectedStudy.modality || 'RAD'} Series`}</div>
                                                <div className="flex justify-between text-xxs text-zinc-500 mt-1 font-mono">
                                                    <span>Modality: {ser.modality || selectedStudy.modality}</span>
                                                    <span>Slices: {ser.instanceCount || 0}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (seriesTree && seriesTree.series && seriesTree.series.some(s => (s.instanceCount || 0) > 0)) ? (
                                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                        {seriesTree.series.filter(s => (s.instanceCount || 0) > 0).map(ser => (
                                            <div 
                                                key={ser.seriesId} 
                                                onClick={() => handleOpenViewer(selectedStudy)}
                                                className="bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs cursor-pointer transition"
                                            >
                                                <div className="font-bold text-zinc-800 dark:text-zinc-200">{ser.seriesDescription || `${ser.modality || selectedStudy.modality || 'RAD'} Series`}</div>
                                                <div className="flex justify-between text-xxs text-zinc-500 mt-1 font-mono">
                                                    <span>Modality: {ser.modality || selectedStudy.modality}</span>
                                                    <span>Slices: {ser.instanceCount || 0}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-zinc-400 text-xs flex-1 flex flex-col items-center justify-center">
                                        <Layers className="w-8 h-8 mb-2 text-zinc-300 dark:text-zinc-700" />
                                        <span>No DICOM series indexed for this study yet.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* View DICOM Modal Viewer with Dedicate Loading Screen */}
            {viewerStudy && (
                <div className="fixed top-[48px] inset-x-0 bottom-0 z-[40] bg-zinc-950 flex flex-col animate-in fade-in duration-200">
                    <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-white">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
                                <Eye className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-zinc-100">{viewerStudy.patientName} — {viewerStudy.testName}</h3>
                                <div className="text-xxs font-mono text-zinc-400">Accession: {viewerStudy.accessionNumber || 'N/A'} • UHID: {viewerStudy.uhid || 'N/A'}</div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => {
                                    setSelectedStudy(viewerStudy);
                                    setViewerStudy(null);
                                    setShowUploadModal(true);
                                }}
                                className="px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-indigo-300 rounded-lg font-bold text-xs flex items-center space-x-1.5 transition"
                            >
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>Upload Files</span>
                            </button>
                            <button 
                                onClick={() => setViewerStudy(null)}
                                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 bg-black overflow-hidden relative flex flex-col min-h-0">
                        {viewerLoading ? (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-300 text-xs space-y-3 bg-zinc-950">
                                <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-1" />
                                <div className="font-bold text-sm text-zinc-100">Loading DICOM Study & WebGL Viewer...</div>
                                <div className="text-zinc-500 font-mono text-xxs">Fetching image slices and initializing viewport...</div>
                            </div>
                        ) : viewerUrls.length > 0 ? (
                            <DicomViewerContainer 
                                urls={viewerUrls} 
                                imageIds={viewerUrls} 
                                modality={viewerStudy.modality || 'MRI'} 
                                studyMetadata={{
                                    patientName: viewerStudy.patientName,
                                    uhid: viewerStudy.uhid,
                                    accessionNumber: viewerStudy.accessionNumber,
                                    testName: viewerStudy.testName,
                                    studyDate: formatStudyDate(viewerStudy.createdAt || viewerStudy.createdDate)
                                }}
                                seriesList={seriesTree?.series || []}
                            />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-xs p-6 text-center space-y-3 bg-zinc-950">
                                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
                                    <Layers className="w-6 h-6" />
                                </div>
                                <h4 className="font-bold text-sm text-zinc-200">No DICOM Scans Uploaded for this Study</h4>
                                <p className="text-zinc-500 max-w-sm">No DICOM image series (.dcm files) have been uploaded for {viewerStudy.patientName}'s {viewerStudy.testName} study yet.</p>
                                <button
                                    onClick={() => {
                                        setSelectedStudy(viewerStudy);
                                        setViewerStudy(null);
                                        setShowUploadModal(true);
                                    }}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs flex items-center space-x-2 shadow-lg transition"
                                >
                                    <UploadCloud className="w-4 h-4" />
                                    <span>Upload DICOM Scans Now</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* View Clinical Report Modal */}
            {reportModalStudy && (
                <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-6 max-w-lg w-full text-xs space-y-4">
                        <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
                            <div>
                                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Clinical Radiology Report</h3>
                                <div className="text-xxs font-mono text-zinc-500">{reportModalStudy.patientName} • UHID: {reportModalStudy.uhid || 'N/A'}</div>
                            </div>
                            <button onClick={() => setReportModalStudy(null)}><X className="w-5 h-5 text-zinc-400" /></button>
                        </div>

                        {reportModalLoading ? (
                            <div className="py-12 flex flex-col items-center justify-center text-zinc-400 space-y-2">
                                <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                                <span>Loading clinical report content...</span>
                            </div>
                        ) : reportModalData ? (
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                                <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                    <div className="text-xxs uppercase tracking-wider text-indigo-500 font-bold">Study Name</div>
                                    <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{reportModalData.testName || reportModalStudy.testName}</div>
                                    <div className="text-xxs text-zinc-500 mt-1">Status: {reportModalData.studyStatus} • Modality: {reportModalData.modality}</div>
                                </div>

                                {reportModalData.attachments && reportModalData.attachments.length > 0 && (
                                    <div>
                                        <div className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">Attached PDF / Zip Documents</div>
                                        <div className="space-y-1.5">
                                            {reportModalData.attachments.map(att => (
                                                <a 
                                                    key={att.attachmentId}
                                                    href={att.fileUrl} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="flex items-center justify-between p-2.5 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100 rounded-xl border border-indigo-200 text-indigo-700 dark:text-indigo-300 font-bold"
                                                >
                                                    <span className="flex items-center"><FileText className="w-4 h-4 mr-2" /> {att.fileName}</span>
                                                    <span className="text-xxs uppercase font-mono">Open PDF</span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <div className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">Report Narrative</div>
                                    <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 font-mono text-xs">
                                        {reportModalData.reportText || "Report dictation in progress / awaiting radiologist signature."}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-8 text-center text-zinc-400">
                                No report available for this study yet.
                            </div>
                        )}

                        <div className="flex justify-end pt-2 border-t border-zinc-200 dark:border-zinc-800">
                            <button 
                                onClick={() => setReportModalStudy(null)}
                                className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && selectedStudy && (
                <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-6 max-w-md w-full text-xs space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-zinc-800 pb-3">
                            <h3 className="font-bold text-sm text-slate-800 dark:text-zinc-100">Upload DICOM File(s)</h3>
                            <button onClick={() => setShowUploadModal(false)}><X className="w-4 h-4 text-slate-400" /></button>
                        </div>

                        <div>
                            <label className="block text-slate-500 dark:text-zinc-400 mb-1">Target Study</label>
                            <div className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">{selectedStudy.testName}</div>
                            <div className="text-slate-600 dark:text-zinc-300 font-medium mt-0.5">{selectedStudy.patientName} ({selectedStudy.uhid || 'N/A'})</div>
                        </div>

                        <div className="border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-xl p-6 text-center bg-slate-50 dark:bg-zinc-950">
                            <UploadCloud className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
                            <div className="text-slate-700 dark:text-zinc-200 font-bold">Select .DCM files or compressed .ZIP</div>
                            <input 
                                type="file" 
                                multiple
                                accept=".dcm,.zip"
                                onChange={(e) => setUploadFiles(e.target.files)}
                                className="mt-3 text-xxs text-slate-500 dark:text-zinc-400"
                            />
                        </div>

                        <div className="flex justify-end space-x-2 pt-2">
                            <button 
                                onClick={() => setShowUploadModal(false)}
                                className="px-4 py-2 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 text-slate-700 dark:text-zinc-300 rounded-xl font-bold transition"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleFileUploadSubmit}
                                disabled={uploading || uploadFiles.length === 0}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-md transition"
                            >
                                {uploading ? (
                                    <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        <span>Uploading...</span>
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="w-3.5 h-3.5" />
                                        <span>Start Ingestion</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
