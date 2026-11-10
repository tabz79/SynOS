import React, { useState, useEffect, useMemo } from 'react';
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
    ImageIcon, 
    Phone, 
    Send,
    Package,
    Layers,
    Share2,
    CheckSquare,
    Square,
    Eye
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
    // -------------------------------------------------------------------------
    // View Navigation (3 Screens matching Mockup exactly)
    // -------------------------------------------------------------------------
    // 'list'     = Screen 1 (Delivery Desk Worklist Queue)
    // 'details'  = Screen 2 (Report Details & Physical Signature Verification)
    // 'dispatch' = Screen 3 (Dispatch Report - WhatsApp & Print Handover)
    const [currentScreen, setCurrentScreen] = useState('list');
    
    // Department Filter: 'Pathology' | 'Radiology'
    const [departmentTab, setDepartmentTab] = useState(initialDepartment);
    
    // Secondary Sub-Tabs: 'pending' | 'delivered'
    const [subTab, setSubTab] = useState('pending');
    
    // Bottom Nav: 'delivery' | 'history'
    const [bottomNav, setBottomNav] = useState('delivery');

    // Data State
    const [reports, setReports] = useState([]);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedReportId, setSelectedReportId] = useState(null);

    // Selected Report Context (for Screen 2 & 3)
    const [reportContext, setReportContext] = useState(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isDelivering, setIsDelivering] = useState(false);

    // Dispatch Form State
    const [phoneOption, setPhoneOption] = useState('registered'); // 'registered' | 'other'
    const [otherPhone, setOtherPhone] = useState('');
    const [usePreprinted, setUsePreprinted] = useState(false); // Strictly explicit runtime-only (Rule 1)
    const [includeDicom, setIncludeDicom] = useState(true);
    const [handoverRecipient, setHandoverRecipient] = useState('Self'); // 'Self' | 'Attendant'

    // Multi-Report Batch Delivery Selection (Clinical Desk Requirement)
    const [selectedBatchIds, setSelectedBatchIds] = useState(new Set());
    const [isBatchMode, setIsBatchMode] = useState(false);

    // Full A4 Report Preview Modal Sheet
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Toast Notification Banner
    const [toast, setToast] = useState(null);
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Load reports when filters change
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
            console.error('Failed to load delivery worklist:', err);
            showToast('Unable to load worklist', 'error');
        } finally {
            setIsLoadingList(false);
        }
    };

    // Open Report Details (Screen 2 or Screen 3 based on verification status)
    const openReport = async (report) => {
        setSelectedReportId(report.reportId);
        setIsLoadingDetail(true);

        const statusNorm = (report.status || '').toLowerCase();
        const isDigital = (report.signaturesCount > 0) || statusNorm === 'signed' || statusNorm === 'manualverified';
        const isVerified = report.isPhysicallyVerified || isDigital;

        try {
            const context = await ReportsApi.getFullReportContext(report.reportId, false);
            setReportContext(context);

            const registeredPhone = context.report?.patient?.phone || 
                                    context.reportData?.patient?.contactInfo || 
                                    report.phone || 
                                    '';
            setOtherPhone(registeredPhone);

            // Flow logic:
            // If manual paper signature needed and NOT yet verified -> Screen 2 (Report Details)
            // If verified or digital -> Screen 3 (Dispatch Report)
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

    // Verify physical pen signature (Screen 2 Action)
    const handleVerifySignature = async () => {
        if (!selectedReportId) return;
        setIsVerifying(true);
        try {
            await ReportsApi.verifyManual(
                selectedReportId, 
                user?.id || '00000000-0000-0000-0000-000000000000'
            );
            showToast('Physical signature verified!', 'success');
            
            // Refresh report context
            const freshContext = await ReportsApi.getFullReportContext(selectedReportId, true);
            setReportContext(freshContext);
            
            // Auto transition to Screen 3 (Dispatch Report)
            setCurrentScreen('dispatch');
            loadWorklist();
        } catch (err) {
            console.error('Manual verification failed:', err);
            showToast('Verification error: ' + err.message, 'error');
        } finally {
            setIsVerifying(false);
        }
    };

    // Send WhatsApp Report (Screen 3 Action)
    const handleSendWhatsApp = async () => {
        if (!selectedReportId) return;
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
                selectedReportId, 
                targetPhone.trim(), 
                includeDicom
            );
            showToast('Report link sent via WhatsApp!', 'success');
            loadWorklist();
            setCurrentScreen('list');
        } catch (err) {
            console.error('WhatsApp delivery failed:', err);
            showToast('WhatsApp error: ' + err.message, 'error');
        } finally {
            setIsDelivering(false);
        }
    };

    // Print & Hand Over (Screen 3 Action)
    const handlePrintAndDeliver = async () => {
        if (!selectedReportId) return;
        const preprintedQuery = usePreprinted ? '&preprinted=true' : '&preprinted=false';
        
        // Open print window immediately
        window.open(
            `/print/report/${selectedReportId}?forceLive=true${preprintedQuery}`, 
            '_blank'
        );

        setIsDelivering(true);
        try {
            await ReportsApi.deliverViaPrint(selectedReportId);
            showToast(`Report printed & handed over (${handoverRecipient})!`, 'success');
            loadWorklist();
            setCurrentScreen('list');
        } catch (err) {
            console.error('Print delivery failed:', err);
            showToast('Print note: ' + err.message, 'info');
        } finally {
            setIsDelivering(false);
        }
    };

    // Filter & Search Logic
    const filteredReports = useMemo(() => {
        const query = searchTerm.toLowerCase().trim();
        return reports.filter(r => {
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
    }, [reports, searchTerm, subTab]);

    // Live pending count
    const pendingTotalCount = reports.filter(r => !(r.delivered || (r.status || '').toLowerCase() === 'delivered')).length;

    // Active selected report data
    const activeReport = useMemo(() => {
        return reports.find(r => r.reportId === selectedReportId) || null;
    }, [reports, selectedReportId]);

    const patientDisplayName = activeReport?.patientName || 
                               reportContext?.report?.patient?.name || 
                               reportContext?.reportData?.patient?.name || 
                               'B. Venkanna';

    const patientToken = activeReport?.token || 
                         reportContext?.report?.token || 
                         'HAT-009';

    const patientDemographics = activeReport?.patientAgeGender || 
                                `${reportContext?.report?.patient?.age || '45'} / ${reportContext?.report?.patient?.gender || 'Male'}`;

    const investigationDisplayName = activeReport?.testName || 
                                     activeReport?.investigationName || 
                                     reportContext?.report?.testName || 
                                     'Calcium';

    const registeredPhoneNumber = reportContext?.report?.patient?.phone || 
                                  reportContext?.reportData?.patient?.contactInfo || 
                                  activeReport?.phone || 
                                  '+91 70329 96647';

    // A4 Report Template hook for Preview Sheet
    const { template } = useTemplateForReport(reportContext?.reportData);

    return (
        <div className="min-h-screen w-full bg-gradient-to-b from-[#EBF5F8] via-[#F2F8FA] to-[#EDF4F7] text-slate-900 flex flex-col font-sans selection:bg-[#0D6874]/20 max-w-[430px] mx-auto shadow-2xl relative overflow-x-hidden border-x border-slate-200/60">
            
            {/* Top Atmospheric Radial Glow Accent (Matching ChatGPT Mockup Atmosphere) */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-teal-200/40 via-sky-200/20 to-transparent rounded-full blur-3xl pointer-events-none -z-0" />
            <div className="absolute top-40 left-0 w-64 h-64 bg-gradient-to-tr from-sky-200/30 via-teal-100/20 to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

            {/* Notification Toast */}
            {toast && (
                <div className={cn(
                    "fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 max-w-[90%]",
                    toast.type === 'error' 
                        ? "bg-rose-600 text-white" 
                        : toast.type === 'info'
                            ? "bg-[#0D6874] text-white"
                            : "bg-[#0F766E] text-white"
                )}>
                    {toast.type === 'error' ? <X className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span className="truncate">{toast.message}</span>
                </div>
            )}

            {/* ========================================================================= */}
            {/* SCREEN 1: DELIVERY DESK WORKLIST (Exact 1:1 Parity with Left Mockup)      */}
            {/* ========================================================================= */}
            {currentScreen === 'list' && (
                <div className="flex-1 flex flex-col min-h-0 pb-20 relative z-10">
                    
                    {/* Top App Bar: Brand Logo & Actions */}
                    <div className="pt-4 px-5 pb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            {/* SynOS Blue Squircle Brand Emblem */}
                            <div className="w-8 h-8 rounded-xl bg-[#0284C7] flex items-center justify-center text-white font-extrabold text-sm shadow-[0_2px_8px_rgba(2,132,199,0.35)]">
                                S
                            </div>
                            <span className="text-xl font-extrabold tracking-tight text-slate-900">
                                Syn<span className="text-[#0284C7]">OS</span>
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Circular Search Button */}
                            <button 
                                onClick={() => {
                                    const searchEl = document.getElementById('synos-mobile-search');
                                    searchEl?.focus();
                                }}
                                className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 flex items-center justify-center text-slate-600 shadow-[0_2px_6px_rgba(0,0,0,0.03)] hover:bg-white cursor-pointer transition-all"
                            >
                                <Search className="w-4 h-4 stroke-[2.2]" />
                            </button>

                            {/* Circular More Options Button (Switches to Desktop View) */}
                            {onDesktopSwitch && (
                                <button 
                                    onClick={onDesktopSwitch}
                                    className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 flex items-center justify-center text-slate-600 shadow-[0_2px_6px_rgba(0,0,0,0.03)] hover:bg-white cursor-pointer transition-all"
                                    title="Switch to Desktop Terminal"
                                >
                                    <MoreHorizontal className="w-4 h-4 stroke-[2.2]" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Title & Subtitle */}
                    <div className="px-5 pt-2 pb-3">
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
                            Delivery Desk
                        </h1>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                            Report dispatch & handover
                        </p>
                    </div>

                    {/* Department Segmented Pill Bar (◉ Pathology vs ○ Radiology) */}
                    <div className="px-5 pb-3">
                        <div className="p-1 rounded-full bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center">
                            
                            {/* Pathology Segment */}
                            <button
                                onClick={() => setDepartmentTab('Pathology')}
                                className={cn(
                                    "flex-1 py-1.5 px-4 rounded-full text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer",
                                    departmentTab === 'Pathology'
                                        ? "bg-[#0D6874] text-white shadow-[0_2px_10px_rgba(13,104,116,0.3)]"
                                        : "text-slate-600 hover:text-slate-900"
                                )}
                            >
                                <span className={cn(
                                    "w-2 h-2 rounded-full transition-all",
                                    departmentTab === 'Pathology' ? "bg-white" : "border-2 border-slate-400"
                                )} />
                                <span>Pathology</span>
                            </button>

                            {/* Radiology Segment */}
                            <button
                                onClick={() => setDepartmentTab('Radiology')}
                                className={cn(
                                    "flex-1 py-1.5 px-4 rounded-full text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer",
                                    departmentTab === 'Radiology'
                                        ? "bg-[#0D6874] text-white shadow-[0_2px_10px_rgba(13,104,116,0.3)]"
                                        : "text-slate-600 hover:text-slate-900"
                                )}
                            >
                                <span className={cn(
                                    "w-2 h-2 rounded-full transition-all",
                                    departmentTab === 'Radiology' ? "bg-white" : "border-2 border-slate-400"
                                )} />
                                <span>Radiology</span>
                            </button>
                        </div>
                    </div>

                    {/* Secondary Tabs: Pending (N) vs Delivered (Today) */}
                    <div className="px-5 flex items-center justify-around border-b border-slate-200/80 text-xs font-bold">
                        <button
                            onClick={() => setSubTab('pending')}
                            className={cn(
                                "pb-2.5 px-4 transition-all relative cursor-pointer",
                                subTab === 'pending'
                                    ? "text-[#0284C7] font-extrabold"
                                    : "text-slate-400 hover:text-slate-700"
                            )}
                        >
                            Pending ({pendingTotalCount})
                            {subTab === 'pending' && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0284C7] rounded-full" />
                            )}
                        </button>

                        <button
                            onClick={() => setSubTab('delivered')}
                            className={cn(
                                "pb-2.5 px-4 transition-all relative cursor-pointer",
                                subTab === 'delivered'
                                    ? "text-[#0284C7] font-extrabold"
                                    : "text-slate-400 hover:text-slate-700"
                            )}
                        >
                            Delivered (Today)
                            {subTab === 'delivered' && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0284C7] rounded-full" />
                            )}
                        </button>
                    </div>

                    {/* Search Field */}
                    <div className="px-5 pt-3.5 pb-2">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                id="synos-mobile-search"
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by patient, token or visit ID"
                                className="w-full pl-9 pr-8 py-2.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/90 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D6874]/20 focus:border-[#0D6874] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                            />
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Patient Cards Worklist Queue */}
                    <div className="flex-1 overflow-y-auto px-5 py-2 space-y-2.5">
                        {isLoadingList ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
                                <Loader2 className="w-6 h-6 animate-spin text-[#0D6874]" />
                                <span className="text-xs font-bold uppercase tracking-wider">Syncing Queue...</span>
                            </div>
                        ) : filteredReports.length === 0 ? (
                            <div className="py-20 text-center text-slate-400 space-y-2">
                                <Package className="w-12 h-12 mx-auto text-slate-300 stroke-[1.4]" />
                                <p className="text-sm font-bold text-slate-700">
                                    No {subTab === 'pending' ? 'pending' : 'delivered'} reports in queue
                                </p>
                                <p className="text-xs text-slate-400">
                                    {searchTerm ? 'No patient matched your search criteria' : 'All reports have been successfully dispatched'}
                                </p>
                            </div>
                        ) : (
                            filteredReports.map((report) => {
                                const statusNorm = (report.status || '').toLowerCase();
                                const isDigital = (report.signaturesCount > 0) || statusNorm === 'signed' || statusNorm === 'manualverified';
                                const isVerified = report.isPhysicallyVerified || isDigital;
                                const isDelivered = report.delivered || statusNorm === 'delivered';
                                const isRadiology = departmentTab === 'Radiology' || (report.department || '').toLowerCase().includes('radio');
                                const isSelected = report.reportId === selectedReportId;

                                return (
                                    <div
                                        key={report.reportId}
                                        onClick={() => openReport(report)}
                                        className={cn(
                                            "p-3.5 rounded-[22px] bg-white border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 shadow-[0_4px_16px_rgba(15,23,42,0.03)] hover:shadow-[0_6px_22px_rgba(15,23,42,0.06)] active:scale-[0.99] group",
                                            isSelected 
                                                ? "border-[#0284C7] ring-1 ring-[#0284C7]/20" 
                                                : "border-slate-200/80 hover:border-slate-300"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Patient Avatar Circle / Squircle */}
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-2xs",
                                                isRadiology 
                                                    ? "bg-purple-50 text-purple-600 border border-purple-100" 
                                                    : "bg-sky-50 text-[#0284C7] border border-sky-100"
                                            )}>
                                                {isRadiology ? (
                                                    <ImageIcon className="w-4 h-4" />
                                                ) : (
                                                    <User className="w-4 h-4 stroke-[2.2]" />
                                                )}
                                            </div>

                                            {/* Patient Name & Investigation Info */}
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-bold text-slate-900 truncate tracking-tight">
                                                    {report.patientName}
                                                </h3>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                                                    {report.testName || report.investigationName || 'Investigation'}
                                                </p>
                                                <p className="text-[10px] font-mono font-medium text-slate-400">
                                                    {report.token || 'HAT-009'} · {report.patientAgeGender || 'Adult'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Status Badge & Chevron */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {isDelivered ? (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Delivered
                                                </span>
                                            ) : isRadiology ? (
                                                <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
                                                    <Sparkles className="w-3.5 h-3.5" />
                                                </span>
                                            ) : !isVerified ? (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF5ED] text-[#D96B27] border border-[#FAD8C3]">
                                                    Needs Verification
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EDFDF5] text-[#059669] border border-[#A7F3D0] flex items-center gap-1">
                                                    <Check className="w-3 h-3 stroke-[2.5]" />
                                                    Verified
                                                </span>
                                            )}

                                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Bottom iOS Navigation Bar (Exact Parity with Mockup) */}
                    <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-8 py-2 flex items-center justify-around z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                        
                        {/* Delivery Tab (Active Mint Pill) */}
                        <button
                            onClick={() => { setBottomNav('delivery'); setSubTab('pending'); }}
                            className={cn(
                                "flex flex-col items-center gap-0.5 py-1 px-5 rounded-2xl transition-all cursor-pointer",
                                bottomNav === 'delivery'
                                    ? "bg-[#E6F7F5] text-[#0D6874] font-extrabold"
                                    : "text-slate-400 hover:text-slate-600 font-semibold"
                            )}
                        >
                            <Package className="w-5 h-5 stroke-[2.2]" />
                            <span className="text-[10px] tracking-tight">Delivery</span>
                        </button>

                        {/* History Tab */}
                        <button
                            onClick={() => { setBottomNav('history'); setSubTab('delivered'); }}
                            className={cn(
                                "flex flex-col items-center gap-0.5 py-1 px-5 rounded-2xl transition-all cursor-pointer",
                                bottomNav === 'history'
                                    ? "bg-[#E6F7F5] text-[#0D6874] font-extrabold"
                                    : "text-slate-400 hover:text-slate-600 font-semibold"
                            )}
                        >
                            <Clock className="w-5 h-5 stroke-[2.2]" />
                            <span className="text-[10px] tracking-tight">History</span>
                        </button>

                    </div>

                </div>
            )}

            {/* ========================================================================= */}
            {/* SCREEN 2: REPORT DETAILS & PHYSICAL SIGNATURE (Middle Screen in Mockup)   */}
            {/* ========================================================================= */}
            {currentScreen === 'details' && (
                <div className="flex-1 flex flex-col min-h-0 relative z-10">
                    
                    {/* Top Navigation Bar */}
                    <div className="pt-4 px-4 pb-3 flex items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
                        <button
                            onClick={() => setCurrentScreen('list')}
                            className="p-1 rounded-full text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                            <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
                        </button>

                        <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                            Report Details
                        </h2>

                        <button className="p-1 rounded-full text-slate-500 hover:bg-slate-100 cursor-pointer">
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        
                        {/* Patient Summary Header Box */}
                        <div className="p-4 rounded-[22px] bg-gradient-to-r from-sky-50 via-teal-50/40 to-white border border-sky-100/90 flex items-center gap-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
                            <div className="w-12 h-12 rounded-full bg-sky-100/80 text-[#0284C7] flex items-center justify-center font-bold text-lg shrink-0">
                                <User className="w-6 h-6 stroke-[2.2]" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-base font-extrabold text-slate-900 truncate tracking-tight">
                                    {patientDisplayName}
                                </h3>
                                <p className="text-xs font-mono font-medium text-slate-500">
                                    {patientToken} · {patientDemographics}
                                </p>
                            </div>
                        </div>

                        {/* Report Details Grouped Card */}
                        <div className="rounded-[22px] bg-white border border-slate-200/80 divide-y divide-slate-100 shadow-[0_4px_16px_rgba(15,23,42,0.03)] overflow-hidden">
                            
                            {/* Investigation Row */}
                            <div className="p-3.5 flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">
                                    Investigation
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-900">
                                        {investigationDisplayName}
                                    </span>
                                    {activeReport?.isPhysicallyVerified ? (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EDFDF5] text-[#059669] border border-[#A7F3D0]">
                                            ✓ Verified
                                        </span>
                                    ) : (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF5ED] text-[#D96B27] border border-[#FAD8C3]">
                                            Needs Verification
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Department Row */}
                            <div className="p-3.5 flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">
                                    Department
                                </span>
                                <span className="text-sm font-semibold text-slate-800">
                                    {activeReport?.department || departmentTab}
                                </span>
                            </div>

                            {/* Report Status Row */}
                            <div className="p-3.5 flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">
                                    Report Status
                                </span>
                                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Signed
                                </span>
                            </div>

                            {/* Signature Type Row */}
                            <div className="p-3.5 flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">
                                    Signature Type
                                </span>
                                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                                    {activeReport?.isManualFlow ? 'Manual (Physical)' : 'Digital Signed'}
                                </span>
                            </div>

                        </div>

                        {/* Physical Signature Alert Box (Peach/Amber Banner from Mockup) */}
                        {!activeReport?.isPhysicallyVerified && (
                            <div className="p-4 rounded-[22px] bg-[#FFF8F2] border border-[#FCE6D6] space-y-1.5 shadow-2xs">
                                <div className="flex items-center gap-2 text-[#9A3412] font-extrabold text-xs">
                                    <Info className="w-4 h-4 text-[#D96B27] shrink-0" />
                                    <span>Verify physical signature</span>
                                </div>
                                <p className="text-xs text-[#9A3412]/85 leading-relaxed font-medium">
                                    Please check the printed report for the doctor's signature and stamp, then mark it as verified to enable dispatch.
                                </p>
                            </div>
                        )}

                        {/* Mark as Verified Button */}
                        {!activeReport?.isPhysicallyVerified ? (
                            <button
                                onClick={handleVerifySignature}
                                disabled={isVerifying}
                                className="w-full py-3.5 rounded-2xl bg-[#0D6874] hover:bg-[#0B5660] text-white font-extrabold text-sm transition-all shadow-[0_4px_16px_rgba(13,104,116,0.25)] flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
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
                                className="w-full py-3.5 rounded-2xl bg-[#0D6874] hover:bg-[#0B5660] text-white font-extrabold text-sm transition-all shadow-[0_4px_16px_rgba(13,104,116,0.25)] flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span>Proceed to Dispatch</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}

                        {/* Report Preview Link Card */}
                        <div
                            onClick={() => setIsPreviewOpen(true)}
                            className="p-3.5 rounded-[22px] bg-white border border-slate-200/80 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-all shadow-[0_4px_16px_rgba(15,23,42,0.03)] group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center">
                                    <FileText className="w-5 h-5 stroke-[2]" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900">
                                        Report Preview
                                    </h4>
                                    <p className="text-[11px] font-medium text-slate-400">
                                        1 page
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                        </div>

                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* SCREEN 3: DISPATCH REPORT (Exact 1:1 Parity with Right Mockup)           */}
            {/* ========================================================================= */}
            {currentScreen === 'dispatch' && (
                <div className="flex-1 flex flex-col min-h-0 relative z-10 pb-8">
                    
                    {/* Top Navigation Bar */}
                    <div className="pt-4 px-4 pb-3 flex items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
                        <button
                            onClick={() => setCurrentScreen('list')}
                            className="p-1 rounded-full text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                            <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
                        </button>

                        <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                            Dispatch Report
                        </h2>

                        <div className="w-8" />
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        
                        {/* Patient Header Card with Verified Badge */}
                        <div className="p-4 rounded-[22px] bg-white border border-slate-200/80 flex items-center justify-between shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-sky-50 text-[#0284C7] flex items-center justify-center shrink-0">
                                    <User className="w-5 h-5 stroke-[2.2]" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-slate-900 truncate tracking-tight">
                                        {patientDisplayName}
                                    </h3>
                                    <p className="text-[11px] font-mono font-medium text-slate-400">
                                        {patientToken} · {patientDemographics}
                                    </p>
                                </div>
                            </div>

                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EDFDF5] text-[#059669] border border-[#A7F3D0] shrink-0 flex items-center gap-1">
                                <Check className="w-3 h-3 stroke-[2.5]" />
                                Verified
                            </span>
                        </div>

                        {/* Investigation Display */}
                        <div className="px-1">
                            <p className="text-[11px] font-medium text-slate-400">
                                Investigation
                            </p>
                            <p className="text-sm font-extrabold text-slate-900">
                                {investigationDisplayName}
                            </p>
                        </div>

                        {/* ------------------------------------------------------------- */}
                        {/* CHANNEL 1: SEND VIA WHATSAPP (Screen 3 Card 1)                */}
                        {/* ------------------------------------------------------------- */}
                        <div className="rounded-[22px] bg-white border border-slate-200/80 p-4 space-y-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
                            
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-2xs">
                                    <Phone className="w-3.5 h-3.5 fill-current" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Send via WhatsApp
                                </h3>
                            </div>

                            {/* Sub-container */}
                            <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-200/70 space-y-3">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900">
                                        Send report link to patient
                                    </h4>
                                    <p className="text-[11px] text-slate-500">
                                        A secure link to view and download the PDF report.
                                    </p>
                                </div>

                                {/* Radio Options */}
                                <div className="space-y-2.5 pt-1">
                                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-800">
                                        <input
                                            type="radio"
                                            name="phoneOption"
                                            checked={phoneOption === 'registered'}
                                            onChange={() => setPhoneOption('registered')}
                                            className="w-4 h-4 text-[#0D6874] focus:ring-[#0D6874]"
                                        />
                                        <span>Registered number</span>
                                    </label>
                                    
                                    {phoneOption === 'registered' && (
                                        <p className="pl-6 text-xs font-mono font-bold text-slate-900">
                                            {registeredPhoneNumber}
                                        </p>
                                    )}

                                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-800 pt-0.5">
                                        <input
                                            type="radio"
                                            name="phoneOption"
                                            checked={phoneOption === 'other'}
                                            onChange={() => setPhoneOption('other')}
                                            className="w-4 h-4 text-[#0D6874] focus:ring-[#0D6874]"
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
                                                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0D6874]/20"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Radiology Extra: Include DICOM Viewer Link */}
                                {(departmentTab === 'Radiology' || (activeReport?.department || '').toLowerCase().includes('radio')) && (
                                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-900">
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
                                            className="w-4 h-4 text-[#0D6874] rounded"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* WhatsApp Action Button */}
                            <button
                                onClick={handleSendWhatsApp}
                                disabled={isDelivering}
                                className="w-full py-3.5 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-sm transition-all shadow-[0_4px_16px_rgba(5,150,105,0.25)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
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
                        {/* CHANNEL 2: PRINT & HAND OVER (Screen 3 Card 2)                */}
                        {/* ------------------------------------------------------------- */}
                        <div className="rounded-[22px] bg-white border border-slate-200/80 p-4 space-y-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
                            
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#0284C7] text-white flex items-center justify-center shadow-2xs">
                                    <Printer className="w-3.5 h-3.5" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Print & Hand Over
                                </h3>
                            </div>

                            {/* Preprinted Stationery Toggle (Rule 1: Runtime-only, explicit toggle) */}
                            <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-200/70 flex items-center justify-between">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900">
                                        Use Preprinted Stationery
                                    </h4>
                                    <p className="text-[11px] text-slate-500">
                                        Leaves space at top (≈ 55 mm)
                                    </p>
                                </div>

                                {/* iOS Style Switch Toggle */}
                                <button
                                    type="button"
                                    onClick={() => setUsePreprinted(!usePreprinted)}
                                    className={cn(
                                        "w-12 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none",
                                        usePreprinted ? "bg-[#0D6874]" : "bg-slate-300"
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

                            {/* Handover Recipient Picker (Self vs Attendant Audit) */}
                            <div className="flex items-center gap-2 px-1 text-xs">
                                <span className="font-semibold text-slate-500">Handed to:</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setHandoverRecipient('Self')}
                                        className={cn(
                                            "px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer",
                                            handoverRecipient === 'Self'
                                                ? "bg-slate-900 text-white"
                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        )}
                                    >
                                        Self (Patient)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setHandoverRecipient('Attendant')}
                                        className={cn(
                                            "px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer",
                                            handoverRecipient === 'Attendant'
                                                ? "bg-slate-900 text-white"
                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        )}
                                    >
                                        Attendant / Family
                                    </button>
                                </div>
                            </div>

                            {/* Print & Mark Delivered Action Button */}
                            <button
                                onClick={handlePrintAndDeliver}
                                disabled={isDelivering}
                                className="w-full py-3.5 rounded-2xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-extrabold text-sm transition-all shadow-[0_4px_16px_rgba(2,132,199,0.25)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
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
            {/* FULL A4 REPORT PREVIEW BOTTOM SHEET MODAL                                 */}
            {/* ========================================================================= */}
            {isPreviewOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
                    <div className="bg-white rounded-t-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
                        
                        {/* Sheet Header */}
                        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#0284C7]" />
                                <h3 className="text-sm font-bold text-slate-900">
                                    Official Report Preview
                                </h3>
                            </div>
                            <button 
                                onClick={() => setIsPreviewOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Sheet Body: Scaled A4 Preview */}
                        <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-slate-100">
                            {reportContext?.reportData ? (
                                <div className="scale-[0.45] sm:scale-[0.55] origin-top shadow-xl border bg-white">
                                    <ReportA4
                                        data={reportContext.reportData}
                                        template={template}
                                        forcePreprinted={usePreprinted}
                                        hidePrintButton={true}
                                    />
                                </div>
                            ) : (
                                <div className="py-20 text-center text-slate-400">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0D6874] mb-2" />
                                    <span className="text-xs font-semibold">Generating document preview...</span>
                                </div>
                            )}
                        </div>

                        {/* Sheet Footer */}
                        <div className="p-3 border-t border-slate-200 bg-white flex items-center justify-end">
                            <button
                                onClick={() => setIsPreviewOpen(false)}
                                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
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
