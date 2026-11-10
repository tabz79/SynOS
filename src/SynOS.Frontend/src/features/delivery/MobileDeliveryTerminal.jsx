import React, { useState, useEffect } from 'react';
import { 
    Search, 
    MoreHorizontal, 
    MoreVertical, 
    ChevronLeft, 
    ChevronRight, 
    User, 
    Check, 
    CheckCircle2, 
    Clock, 
    FileText, 
    Printer, 
    X, 
    Loader2, 
    Sparkles, 
    Info, 
    Share2, 
    ImageIcon, 
    Phone, 
    Send,
    Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReportsApi } from '@/api/reports';
import { ReportA4 } from '../documents/templates/ReportA4';
import { useTemplateForReport } from '../documents/templates/hooks/useReportTemplates';

export function MobileDeliveryTerminal({
    user,
    onDesktopSwitch,
    initialDepartment = 'Pathology'
}) {
    // Navigation & View States (3 Screens matching mockup)
    // 'list' = Screen 1 (Delivery Desk Worklist)
    // 'details' = Screen 2 (Report Details & Verification)
    // 'dispatch' = Screen 3 (Dispatch Report - WhatsApp / Print)
    const [currentScreen, setCurrentScreen] = useState('list');
    
    // Department Filter: 'Pathology' | 'Radiology'
    const [departmentTab, setDepartmentTab] = useState(initialDepartment);
    
    // Sub-Tabs: 'pending' | 'delivered'
    const [subTab, setSubTab] = useState('pending');
    
    // Bottom Nav: 'delivery' | 'history'
    const [bottomNav, setBottomNav] = useState('delivery');

    // Data States
    const [reports, setReports] = useState([]);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    
    // Selected Report & Details
    const [selectedReportSummary, setSelectedReportSummary] = useState(null);
    const [reportContext, setReportContext] = useState(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isDelivering, setIsDelivering] = useState(false);

    // Dispatch Configuration
    const [phoneOption, setPhoneOption] = useState('registered'); // 'registered' | 'other'
    const [otherPhone, setOtherPhone] = useState('');
    const [usePreprinted, setUsePreprinted] = useState(false); // Strictly explicit runtime-only (Rule 1)
    const [includeDicom, setIncludeDicom] = useState(true);

    // A4 Preview Modal Sheet
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Toast Notification
    const [toast, setToast] = useState(null);
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Load reports when department, subTab, or bottomNav changes
    useEffect(() => {
        loadWorklist();
    }, [departmentTab, subTab, bottomNav]);

    const loadWorklist = async () => {
        setIsLoadingList(true);
        try {
            const isHistory = bottomNav === 'history' || subTab === 'delivered';
            const statusStr = isHistory 
                ? 'Signed,ManualVerified,Finalized,Delivered' 
                : 'ReadyForVerification,Signed,ManualVerified,Delivered';
            
            const data = await ReportsApi.getReportsByStatus(statusStr, departmentTab, isHistory);
            setReports(data || []);
        } catch (err) {
            console.error('Failed to load mobile delivery worklist:', err);
            showToast('Unable to load worklist', 'error');
        } finally {
            setIsLoadingList(false);
        }
    };

    // Fetch report full context when opening Details or Dispatch screen
    const openReportDetails = async (report) => {
        setSelectedReportSummary(report);
        setIsLoadingDetail(true);
        
        // Determine whether report goes to Details (Needs Verification) or Dispatch (Already Verified)
        const statusNorm = (report.status || '').toLowerCase();
        const isDigital = (report.signaturesCount > 0) || statusNorm === 'signed' || statusNorm === 'manualverified';
        const isVerified = report.isPhysicallyVerified || isDigital;

        try {
            const context = await ReportsApi.getFullReportContext(report.reportId, false);
            setReportContext(context);
            
            // Set default delivery phone
            const registeredPhone = context.report?.patient?.phone || 
                                    context.reportData?.patient?.contactInfo || 
                                    report.phone || 
                                    '';
            setOtherPhone(registeredPhone);

            // If report is manual and not verified -> Screen 2 (Report Details / Verification)
            // If already verified or digital -> Screen 3 (Dispatch Report)
            if (report.isManualFlow && !report.isPhysicallyVerified) {
                setCurrentScreen('details');
            } else if (isVerified) {
                setCurrentScreen('dispatch');
            } else {
                setCurrentScreen('details');
            }
        } catch (err) {
            console.error('Failed to load report context:', err);
            showToast('Failed to load report details', 'error');
        } finally {
            setIsLoadingDetail(false);
        }
    };

    // Verify physical signature
    const handleVerifySignature = async () => {
        if (!selectedReportSummary) return;
        setIsVerifying(true);
        try {
            await ReportsApi.verifyManual(
                selectedReportSummary.reportId, 
                user?.id || '00000000-0000-0000-0000-000000000000'
            );
            showToast('Physical signature verified!', 'success');
            
            // Refresh report context
            const freshContext = await ReportsApi.getFullReportContext(selectedReportSummary.reportId, true);
            setReportContext(freshContext);
            setSelectedReportSummary(prev => ({ ...prev, isPhysicallyVerified: true }));
            
            // Auto advance to Screen 3 (Dispatch Report)
            setCurrentScreen('dispatch');
            loadWorklist();
        } catch (err) {
            console.error('Manual verification failed:', err);
            showToast('Verification error: ' + err.message, 'error');
        } finally {
            setIsVerifying(false);
        }
    };

    // WhatsApp Dispatch
    const handleSendWhatsApp = async () => {
        if (!selectedReportSummary) return;
        const targetPhone = phoneOption === 'registered' 
            ? (reportContext?.report?.patient?.phone || reportContext?.reportData?.patient?.contactInfo || otherPhone)
            : otherPhone;

        if (!targetPhone || targetPhone.trim().length < 10) {
            showToast('Please provide a valid 10-digit mobile number', 'error');
            return;
        }

        setIsDelivering(true);
        try {
            await ReportsApi.deliverViaWhatsApp(
                selectedReportSummary.reportId, 
                targetPhone.trim(), 
                includeDicom
            );
            showToast('Report sent via WhatsApp!', 'success');
            loadWorklist();
            setCurrentScreen('list');
        } catch (err) {
            console.error('WhatsApp delivery failed:', err);
            showToast('WhatsApp error: ' + err.message, 'error');
        } finally {
            setIsDelivering(false);
        }
    };

    // Print & Deliver Handover
    const handlePrintAndDeliver = async () => {
        if (!selectedReportSummary) return;
        const preprintedQuery = usePreprinted ? '&preprinted=true' : '&preprinted=false';
        
        // Open print view in new window / tab
        window.open(
            `/print/report/${selectedReportSummary.reportId}?forceLive=true${preprintedQuery}`, 
            '_blank'
        );

        setIsDelivering(true);
        try {
            await ReportsApi.deliverViaPrint(selectedReportSummary.reportId);
            showToast('Report marked as delivered and printed!', 'success');
            loadWorklist();
            setCurrentScreen('list');
        } catch (err) {
            console.error('Print delivery failed:', err);
            showToast('Print note: ' + err.message, 'info');
        } finally {
            setIsDelivering(false);
        }
    };

    // Filter reports
    const filteredReports = reports.filter(r => {
        const query = searchTerm.toLowerCase();
        const matchesQuery = !query || 
            (r.patientName || '').toLowerCase().includes(query) ||
            (r.token || '').toLowerCase().includes(query) ||
            (r.testName || '').toLowerCase().includes(query) ||
            (r.investigationName || '').toLowerCase().includes(query);

        const statusNorm = (r.status || '').toLowerCase();
        const isDelivered = r.delivered || statusNorm === 'delivered';

        if (subTab === 'pending') {
            return matchesQuery && !isDelivered;
        } else {
            return matchesQuery && isDelivered;
        }
    });

    const pendingCount = reports.filter(r => !(r.delivered || (r.status || '').toLowerCase() === 'delivered')).length;

    // Template hook for A4 preview modal
    const { template } = useTemplateForReport(reportContext?.reportData);

    // Patient display helpers
    const getPatientDisplayName = () => {
        return selectedReportSummary?.patientName || 
               reportContext?.report?.patient?.name || 
               reportContext?.reportData?.patient?.name || 
               'Patient';
    };

    const getPatientDemographics = () => {
        const token = selectedReportSummary?.token || reportContext?.report?.token || 'HAT-000';
        const ageGender = selectedReportSummary?.patientAgeGender || 
                          `${reportContext?.report?.patient?.age || ''} / ${reportContext?.report?.patient?.gender || ''}`;
        return `${token} · ${ageGender}`.trim().replace(/^·\s*|·\s*$/g, '');
    };

    const getInvestigationName = () => {
        return selectedReportSummary?.investigationName || 
               selectedReportSummary?.testName || 
               reportContext?.report?.testName || 
               'Investigation';
    };

    const getRegisteredPhone = () => {
        return reportContext?.report?.patient?.phone || 
               reportContext?.reportData?.patient?.contactInfo || 
               selectedReportSummary?.phone || 
               '+91 70329 96647';
    };

    return (
        <div className="min-h-screen w-full bg-[#F4F8FA] dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-teal-500/20 max-w-md mx-auto shadow-2xl relative overflow-x-hidden">
            
            {/* Top Toast Banner */}
            {toast && (
                <div className={cn(
                    "fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-3 max-w-[90%]",
                    toast.type === 'error' 
                        ? "bg-rose-600 text-white" 
                        : toast.type === 'info'
                            ? "bg-sky-600 text-white"
                            : "bg-[#0F766E] text-white"
                )}>
                    {toast.type === 'error' ? <X className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span className="truncate">{toast.message}</span>
                </div>
            )}

            {/* ========================================================================= */}
            {/* SCREEN 1: DELIVERY DESK WORKLIST                                          */}
            {/* ========================================================================= */}
            {currentScreen === 'list' && (
                <div className="flex-1 flex flex-col min-h-0 pb-20">
                    
                    {/* Top App Bar */}
                    <div className="pt-3 px-5 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {/* SynOS Blue Squircle Logo */}
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
                                S
                            </div>
                            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Syn<span className="text-sky-600 dark:text-sky-400">OS</span>
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setIsSearchVisible(!isSearchVisible)}
                                className={cn(
                                    "w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs border",
                                    isSearchVisible 
                                        ? "bg-sky-100 text-sky-700 border-sky-300" 
                                        : "bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50"
                                )}
                                title="Search"
                            >
                                <Search className="w-4 h-4" />
                            </button>

                            {onDesktopSwitch && (
                                <button 
                                    onClick={onDesktopSwitch}
                                    className="w-9 h-9 rounded-full bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:bg-slate-50 cursor-pointer shadow-2xs"
                                    title="Switch to Desktop Terminal"
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Header Title */}
                    <div className="px-5 pt-1 pb-3">
                        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Delivery Desk
                        </h1>
                        <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                            Report dispatch & handover
                        </p>
                    </div>

                    {/* Department Segmented Pill Toggle (Pathology vs Radiology) */}
                    <div className="px-5 pb-3">
                        <div className="p-1 rounded-full bg-slate-200/70 dark:bg-zinc-900 flex items-center">
                            <button
                                onClick={() => setDepartmentTab('Pathology')}
                                className={cn(
                                    "flex-1 py-1.5 px-4 rounded-full text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                    departmentTab === 'Pathology'
                                        ? "bg-[#0D6874] text-white shadow-xs"
                                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                                )}
                            >
                                <span className={cn("w-1.5 h-1.5 rounded-full", departmentTab === 'Pathology' ? "bg-white" : "border border-slate-400")} />
                                Pathology
                            </button>

                            <button
                                onClick={() => setDepartmentTab('Radiology')}
                                className={cn(
                                    "flex-1 py-1.5 px-4 rounded-full text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                    departmentTab === 'Radiology'
                                        ? "bg-[#0D6874] text-white shadow-xs"
                                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                                )}
                            >
                                <span className={cn("w-1.5 h-1.5 rounded-full", departmentTab === 'Radiology' ? "bg-white" : "border border-slate-400")} />
                                Radiology
                            </button>
                        </div>
                    </div>

                    {/* Secondary Status Tabs (Pending vs Delivered) */}
                    <div className="px-5 border-b border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-around text-xs font-bold">
                        <button
                            onClick={() => setSubTab('pending')}
                            className={cn(
                                "pb-2.5 px-4 transition-all relative cursor-pointer",
                                subTab === 'pending'
                                    ? "text-sky-700 dark:text-sky-400 font-extrabold"
                                    : "text-slate-400 dark:text-zinc-500 hover:text-slate-700"
                            )}
                        >
                            Pending ({pendingCount})
                            {subTab === 'pending' && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600 rounded-full" />
                            )}
                        </button>

                        <button
                            onClick={() => setSubTab('delivered')}
                            className={cn(
                                "pb-2.5 px-4 transition-all relative cursor-pointer",
                                subTab === 'delivered'
                                    ? "text-sky-700 dark:text-sky-400 font-extrabold"
                                    : "text-slate-400 dark:text-zinc-500 hover:text-slate-700"
                            )}
                        >
                            Delivered (Today)
                            {subTab === 'delivered' && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600 rounded-full" />
                            )}
                        </button>
                    </div>

                    {/* Search Field (Always present or toggleable) */}
                    <div className="px-5 pt-3.5 pb-2">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by patient, token or visit ID"
                                className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-2xs"
                            />
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Patient / Report Card List */}
                    <div className="flex-1 overflow-y-auto px-5 py-2 space-y-2.5">
                        {isLoadingList ? (
                            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
                                <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                                <span className="text-xs font-semibold">Loading worklist...</span>
                            </div>
                        ) : filteredReports.length === 0 ? (
                            <div className="py-16 text-center text-slate-400 space-y-2">
                                <Package className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
                                <p className="text-xs font-bold text-slate-600 dark:text-zinc-400">
                                    No {subTab === 'pending' ? 'pending' : 'delivered'} reports found
                                </p>
                                <p className="text-[11px] text-slate-400">
                                    {searchTerm ? 'Try a different search term' : 'All reports in this queue are cleared'}
                                </p>
                            </div>
                        ) : (
                            filteredReports.map((report) => {
                                const statusNorm = (report.status || '').toLowerCase();
                                const isDigital = (report.signaturesCount > 0) || statusNorm === 'signed' || statusNorm === 'manualverified';
                                const isVerified = report.isPhysicallyVerified || isDigital;
                                const isDelivered = report.delivered || statusNorm === 'delivered';
                                const isRadiology = departmentTab === 'Radiology' || (report.department || '').toLowerCase().includes('radio');

                                return (
                                    <div
                                        key={report.reportId}
                                        onClick={() => openReportDetails(report)}
                                        className={cn(
                                            "p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs flex items-center justify-between gap-3 group active:scale-[0.99]",
                                            report.reportId === selectedReportSummary?.reportId
                                                ? "border-sky-400 dark:border-sky-500 ring-1 ring-sky-400/20"
                                                : "border-slate-200/90 dark:border-zinc-800/80 hover:border-slate-300"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Avatar Icon */}
                                            <div className={cn(
                                                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                                                isRadiology
                                                    ? "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/60"
                                                    : "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/60"
                                            )}>
                                                {isRadiology ? (
                                                    <ImageIcon className="w-5 h-5" />
                                                ) : (
                                                    <User className="w-5 h-5" />
                                                )}
                                            </div>

                                            {/* Patient & Test Metadata */}
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                    {report.patientName}
                                                </h3>
                                                <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider truncate">
                                                    {report.testName || report.investigationName || 'Investigation'}
                                                </p>
                                                <p className="text-[10px] font-mono font-medium text-slate-400 dark:text-zinc-500">
                                                    {report.token || 'HAT-000'} · {report.patientAgeGender || 'Adult'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Status Badge & Chevron */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {isDelivered ? (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Delivered
                                                </span>
                                            ) : isRadiology ? (
                                                <span className="w-7 h-7 rounded-xl bg-purple-100/70 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center border border-purple-200 dark:border-purple-800">
                                                    <Sparkles className="w-3.5 h-3.5" />
                                                </span>
                                            ) : !isVerified ? (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                                                    Needs Verification
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                                    <Check className="w-3 h-3" />
                                                    Verified
                                                </span>
                                            )}

                                            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-zinc-600 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Bottom iOS Navigation Bar */}
                    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-zinc-800 px-6 py-2 flex items-center justify-around z-30">
                        <button
                            onClick={() => { setBottomNav('delivery'); setSubTab('pending'); }}
                            className={cn(
                                "flex flex-col items-center gap-1 py-1 px-5 rounded-2xl transition-all cursor-pointer",
                                bottomNav === 'delivery'
                                    ? "bg-teal-50 dark:bg-teal-950/50 text-[#0D6874] dark:text-teal-300 font-extrabold"
                                    : "text-slate-400 dark:text-zinc-500 hover:text-slate-600"
                            )}
                        >
                            <Package className="w-5 h-5 stroke-[2.2]" />
                            <span className="text-[11px]">Delivery</span>
                        </button>

                        <button
                            onClick={() => { setBottomNav('history'); setSubTab('delivered'); }}
                            className={cn(
                                "flex flex-col items-center gap-1 py-1 px-5 rounded-2xl transition-all cursor-pointer",
                                bottomNav === 'history'
                                    ? "bg-teal-50 dark:bg-teal-950/50 text-[#0D6874] dark:text-teal-300 font-extrabold"
                                    : "text-slate-400 dark:text-zinc-500 hover:text-slate-600"
                            )}
                        >
                            <Clock className="w-5 h-5 stroke-[2.2]" />
                            <span className="text-[11px]">History</span>
                        </button>
                    </div>

                </div>
            )}

            {/* ========================================================================= */}
            {/* SCREEN 2: REPORT DETAILS & VERIFICATION (Screen 2 in Mockup)             */}
            {/* ========================================================================= */}
            {currentScreen === 'details' && (
                <div className="flex-1 flex flex-col min-h-0 bg-[#F4F8FA] dark:bg-zinc-950">
                    
                    {/* Top Header */}
                    <div className="pt-3 px-4 pb-3 flex items-center justify-between border-b border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <button
                            onClick={() => setCurrentScreen('list')}
                            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 cursor-pointer"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>

                        <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                            Report Details
                        </h2>

                        <button className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 cursor-pointer">
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        
                        {/* Patient Summary Header Card */}
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-teal-50/40 to-white dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-sky-100/90 dark:border-zinc-800 flex items-center gap-3.5 shadow-2xs">
                            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-lg shrink-0">
                                <User className="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                                    {getPatientDisplayName()}
                                </h3>
                                <p className="text-xs font-mono font-medium text-slate-500 dark:text-zinc-400">
                                    {getPatientDemographics()}
                                </p>
                            </div>
                        </div>

                        {/* Report Details Grouped Card */}
                        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-800/80 shadow-2xs overflow-hidden">
                            
                            {/* Investigation */}
                            <div className="p-3.5 flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                                    Investigation
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                                        {getInvestigationName()}
                                    </span>
                                    {selectedReportSummary?.isPhysicallyVerified ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                                            ✓ Verified
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200">
                                            Needs Verification
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Department */}
                            <div className="p-3.5 flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                                    Department
                                </span>
                                <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                                    {selectedReportSummary?.department || departmentTab}
                                </span>
                            </div>

                            {/* Report Status */}
                            <div className="p-3.5 flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                                    Report Status
                                </span>
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Signed
                                </span>
                            </div>

                            {/* Signature Type */}
                            <div className="p-3.5 flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                                    Signature Type
                                </span>
                                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                                    {selectedReportSummary?.isManualFlow ? 'Manual (Physical)' : 'Digital Signed'}
                                </span>
                            </div>

                        </div>

                        {/* Physical Signature Alert Box (Screen 2 Amber Card) */}
                        {!selectedReportSummary?.isPhysicallyVerified && (
                            <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-800/60 space-y-2">
                                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-extrabold text-xs">
                                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                                    <span>Verify physical signature</span>
                                </div>
                                <p className="text-xs text-amber-800/90 dark:text-amber-300/80 leading-relaxed font-medium">
                                    Please check the printed report for the doctor's signature and stamp, then mark it as verified to enable dispatch.
                                </p>
                            </div>
                        )}

                        {/* Mark as Verified Button */}
                        {!selectedReportSummary?.isPhysicallyVerified ? (
                            <button
                                onClick={handleVerifySignature}
                                disabled={isVerifying}
                                className="w-full py-3.5 rounded-2xl bg-[#0D6874] hover:bg-[#0B5660] text-white font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
                            >
                                {isVerifying ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Registering Verification...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4 stroke-[3]" />
                                        <span>Mark as Verified</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={() => setCurrentScreen('dispatch')}
                                className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span>Proceed to Dispatch</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}

                        {/* Report Preview Card Link */}
                        <div
                            onClick={() => setIsPreviewOpen(true)}
                            className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-all shadow-2xs group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Report Preview
                                    </h4>
                                    <p className="text-[11px] font-medium text-slate-400">
                                        1 page · Full clinical format
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                        </div>

                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* SCREEN 3: DISPATCH REPORT (Screen 3 in Mockup)                            */}
            {/* ========================================================================= */}
            {currentScreen === 'dispatch' && (
                <div className="flex-1 flex flex-col min-h-0 bg-[#F4F8FA] dark:bg-zinc-950 pb-8">
                    
                    {/* Top Header */}
                    <div className="pt-3 px-4 pb-3 flex items-center justify-between border-b border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <button
                            onClick={() => setCurrentScreen('list')}
                            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 cursor-pointer"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>

                        <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                            Dispatch Report
                        </h2>

                        <div className="w-8" />
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        
                        {/* Patient Header Card with Verified Badge */}
                        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 flex items-center justify-between shadow-2xs">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 flex items-center justify-center shrink-0">
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                        {getPatientDisplayName()}
                                    </h3>
                                    <p className="text-[11px] font-mono font-medium text-slate-400">
                                        {getPatientDemographics()}
                                    </p>
                                </div>
                            </div>

                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 shrink-0 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Verified
                            </span>
                        </div>

                        {/* Investigation Name */}
                        <div className="px-1">
                            <p className="text-[11px] font-medium text-slate-400">
                                Investigation
                            </p>
                            <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                                {getInvestigationName()}
                            </p>
                        </div>

                        {/* ------------------------------------------------------------- */}
                        {/* DISPATCH CHANNEL 1: WHATSAPP (Screen 3 Card 1)                */}
                        {/* ------------------------------------------------------------- */}
                        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 p-4 space-y-3.5 shadow-2xs">
                            
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-2xs">
                                    <Phone className="w-3.5 h-3.5" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Send via WhatsApp
                                </h3>
                            </div>

                            {/* Sub-container */}
                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-700/60 space-y-3">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                        Send report link to patient
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                                        A secure link to view and download the PDF report.
                                    </p>
                                </div>

                                {/* Radio Options */}
                                <div className="space-y-2 pt-1">
                                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-800 dark:text-zinc-200">
                                        <input
                                            type="radio"
                                            name="phoneOption"
                                            checked={phoneOption === 'registered'}
                                            onChange={() => setPhoneOption('registered')}
                                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span>Registered number</span>
                                    </label>
                                    
                                    {phoneOption === 'registered' && (
                                        <p className="pl-6 text-xs font-mono font-bold text-slate-900 dark:text-white">
                                            {getRegisteredPhone()}
                                        </p>
                                    )}

                                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-800 dark:text-zinc-200 pt-1">
                                        <input
                                            type="radio"
                                            name="phoneOption"
                                            checked={phoneOption === 'other'}
                                            onChange={() => setPhoneOption('other')}
                                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span>Other number</span>
                                    </label>

                                    {phoneOption === 'other' && (
                                        <div className="pl-6 pt-1">
                                            <input
                                                type="tel"
                                                value={otherPhone}
                                                onChange={(e) => setOtherPhone(e.target.value)}
                                                placeholder="Enter 10-digit mobile number"
                                                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Radiology Extra: Include DICOM Viewer Link */}
                                {(departmentTab === 'Radiology' || (selectedReportSummary?.department || '').toLowerCase().includes('radio')) && (
                                    <div className="pt-2 border-t border-slate-200/80 dark:border-zinc-700 flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-900 dark:text-white">
                                                Include DICOM Study Link
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                Adds online scan viewer & download package
                                            </p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={includeDicom}
                                            onChange={(e) => setIncludeDicom(e.target.checked)}
                                            className="w-4 h-4 text-emerald-600 rounded"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* WhatsApp Action Button */}
                            <button
                                onClick={handleSendWhatsApp}
                                disabled={isDelivering}
                                className="w-full py-3.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                            >
                                {isDelivering ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Dispatching via WhatsApp...</span>
                                    </>
                                ) : (
                                    <>
                                        <Phone className="w-4 h-4 fill-current" />
                                        <span>Send on WhatsApp</span>
                                    </>
                                )}
                            </button>

                        </div>

                        {/* ------------------------------------------------------------- */}
                        {/* DISPATCH CHANNEL 2: PRINT & HAND OVER (Screen 3 Card 2)       */}
                        {/* ------------------------------------------------------------- */}
                        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 p-4 space-y-3.5 shadow-2xs">
                            
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#0284C7] text-white flex items-center justify-center shadow-2xs">
                                    <Printer className="w-3.5 h-3.5" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Print & Hand Over
                                </h3>
                            </div>

                            {/* Preprinted Stationery Toggle (Rule 1: Runtime-only, explicit toggle) */}
                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-700/60 flex items-center justify-between">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                        Use Preprinted Stationery
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                                        Leaves space at top (≈ 55 mm)
                                    </p>
                                </div>

                                {/* iOS Style Switch Toggle */}
                                <button
                                    type="button"
                                    onClick={() => setUsePreprinted(!usePreprinted)}
                                    className={cn(
                                        "w-12 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none",
                                        usePreprinted ? "bg-[#0D6874]" : "bg-slate-300 dark:bg-zinc-700"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "w-5 h-5 rounded-full bg-white shadow-md transform transition-transform absolute top-0.5",
                                            usePreprinted ? "translate-x-6 left-0.5" : "left-0.5"
                                        )}
                                    />
                                </button>
                            </div>

                            {/* Print & Mark Delivered Action Button */}
                            <button
                                onClick={handlePrintAndDeliver}
                                disabled={isDelivering}
                                className="w-full py-3.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-extrabold text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                            >
                                {isDelivering ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Queuing Print Job...</span>
                                    </>
                                ) : (
                                    <>
                                        <Printer className="w-4 h-4" />
                                        <span>Print & Mark Delivered</span>
                                    </>
                                )}
                            </button>

                        </div>

                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* FULL A4 REPORT PREVIEW BOTTOM SHEET / MODAL                               */}
            {/* ========================================================================= */}
            {isPreviewOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 rounded-t-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                        
                        {/* Sheet Header */}
                        <div className="px-5 py-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-sky-600" />
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Official Report Preview
                                </h3>
                            </div>
                            <button 
                                onClick={() => setIsPreviewOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500 hover:text-slate-700 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Sheet Body: Scaled A4 Preview */}
                        <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-slate-100 dark:bg-zinc-950">
                            {reportContext?.reportData ? (
                                <div className="scale-[0.45] sm:scale-[0.55] origin-top shadow-xl border">
                                    <ReportA4
                                        data={reportContext.reportData}
                                        template={template}
                                        forcePreprinted={usePreprinted}
                                        hidePrintButton={true}
                                    />
                                </div>
                            ) : (
                                <div className="py-20 text-center text-slate-400">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600 mb-2" />
                                    <span className="text-xs font-semibold">Generating document preview...</span>
                                </div>
                            )}
                        </div>

                        {/* Sheet Footer */}
                        <div className="p-3 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-end">
                            <button
                                onClick={() => setIsPreviewOpen(false)}
                                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
                            >
                                Close Preview
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}
