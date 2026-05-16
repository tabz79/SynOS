import React, { useState, useEffect, useRef } from 'react';
import { 
    Users, 
    UserPlus, 
    Search, 
    Filter, 
    MoreVertical, 
    CreditCard, 
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Wallet,
    ShieldCheck,
    AlertCircle,
    CheckCircle2,
    Clock,
    FileText,
    Calculator,
    ChevronRight,
    Zap,
    Download,
    History,
    Settings,
    PlusCircle,
    Trash2,
    Key,
    Fingerprint
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { AddStaffModal } from './components/workforce/AddStaffModal';
import { AdvanceRequestModal } from './components/workforce/AdvanceRequestModal';
import { StatutoryConfigModal } from './components/workforce/StatutoryConfigModal';
import { AttendanceExceptionModal } from './components/workforce/AttendanceExceptionModal';
import { WorkforcePolicyModal } from './components/workforce/WorkforcePolicyModal';

const { WorkforceApi } = FinanceApi;

import { AttendanceCalendar } from './components/workforce/AttendanceCalendar';

export function AttendanceLeavesScreen() {
    const [staff, setStaff] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [month, setMonth] = useState(new Date().toISOString().split('-').slice(0, 2).join('-') + '-01');
    const [summary, setSummary] = useState(null);
    const [audit, setAudit] = useState([]);
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [loading, setLoading] = useState(false);
    const [reviewingLeave, setReviewingLeave] = useState(null);
    const [isPeriodLocked, setIsPeriodLocked] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showPolicyModal, setShowPolicyModal] = useState(false);

    useEffect(() => {
        loadStaff();
        loadPendingLeaves();
    }, []);

    useEffect(() => {
        if (selectedStaff) {
            fetchSummary(selectedStaff.employeeId);
        }
    }, [month]);

    const loadStaff = async () => {
        try {
            const data = await WorkforceApi.getStaff();
            setStaff(data);
        } catch (error) {
            console.error(error);
        }
    };

    const loadPendingLeaves = async () => {
        try {
            const data = await WorkforceApi.getPendingLeaves();
            setPendingLeaves(data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchSummary = async (staffId) => {
        setLoading(true);
        try {
            const data = await WorkforceApi.getAttendanceSummary(staffId, month);
            setSummary(data);
            
            // Check period status
            const periods = await WorkforceApi.getPeriods();
            const currentPeriod = periods.find(p => p.startDate.substring(0, 7) === month.substring(0, 7));
            setIsPeriodLocked(currentPeriod?.status === 1 || currentPeriod?.status === 2);

            const auditData = await WorkforceApi.getAttendanceAudit(staffId);
            setAudit(auditData.events || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDateClick = (day) => {
        if (isPeriodLocked) return;
        setSelectedDate(day);
    };

    const handleSaveException = async (data) => {
        try {
            await WorkforceApi.markException(data);
            await fetchSummary(selectedStaff.employeeId);
            setSelectedDate(null);
        } catch (error) {
            console.error(error);
            alert("Failed to update attendance exception");
        }
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold dark:text-white">Attendance & Leaves</h1>
                    <p className="text-zinc-500">Monitor employee availability, work sessions, and leave facts.</p>
                </div>
                <div className="flex gap-3">
                    <input 
                        type="month" 
                        value={month.substring(0, 7)}
                        onChange={e => setMonth(e.target.value + '-01')}
                        className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-200 px-4 py-2 rounded-xl text-sm font-bold outline-none"
                    />
                    <button 
                        onClick={() => setShowPolicyModal(true)}
                        className="p-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-xl border dark:border-zinc-700 transition-colors group"
                        title="Configure Leave Policy"
                    >
                        <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Staff Selection Sidebar */}
                <div className="col-span-4 space-y-4">
                    <div className="dark:bg-zinc-900/50 bg-white border dark:border-zinc-800 border-zinc-200 rounded-2xl overflow-hidden h-[600px] flex flex-col">
                        <div className="p-4 border-b dark:border-zinc-800 border-zinc-200 bg-zinc-50 dark:bg-zinc-950/50">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Employee List</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y dark:divide-zinc-800 divide-zinc-100">
                            {staff.map(s => (
                                <button 
                                    key={s.employeeId}
                                    onClick={() => {
                                        setSelectedStaff(s);
                                        fetchSummary(s.employeeId);
                                    }}
                                    className={`w-full p-4 flex items-center gap-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${selectedStaff?.employeeId === s.employeeId ? 'bg-synos-primary/5 dark:bg-synos-primary/10 border-r-2 border-synos-primary' : ''}`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                                        {s.firstName[0]}{s.lastName[0]}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold dark:text-zinc-200">{s.firstName} {s.lastName}</p>
                                        <p className="text-[10px] text-zinc-500">{s.jobTitle}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Attendance Display */}
                <div className="col-span-8 space-y-6">
                    {!selectedStaff ? (
                        <div className="h-[600px] flex flex-col items-center justify-center dark:bg-zinc-900/30 bg-zinc-50 rounded-2xl border-2 border-dashed dark:border-zinc-800 border-zinc-200">
                            <Clock className="w-12 h-12 text-zinc-300 mb-4" />
                            <p className="text-zinc-500 text-sm italic">Select an employee to view attendance summary.</p>
                        </div>
                    ) : loading ? (
                        <div className="h-[600px] flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-8 h-8 border-4 border-synos-primary border-t-transparent rounded-full animate-spin" />
                                <p className="text-xs text-zinc-500">Reconstructing work history...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                             {/* Summary Stats */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Days Present</p>
                                    <p className="text-2xl font-black text-emerald-500">{summary?.totalPresentDays || 0}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                                    <p className="text-[10px] font-bold text-amber-600 uppercase">Leave Days</p>
                                    <p className="text-2xl font-black text-amber-500">{summary?.totalLeaveDays || 0}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Planned Leaves</p>
                                    <p className="text-2xl font-black dark:text-white">{summary?.totalPlannedLeaves || 0}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                                    <p className="text-[10px] font-bold text-rose-600 uppercase">Total Absent</p>
                                    <p className="text-2xl font-black text-rose-500">{summary?.totalAbsentDays || 0}</p>
                                </div>
                            </div>
                            {/* New: Attendance Calendar View */}
                            <AttendanceCalendar 
                                statuses={summary?.dailyStatuses || []} 
                                isLocked={isPeriodLocked} 
                                onDateClick={handleDateClick}
                            />

                            {/* Audit Timeline */}
                            <div className="dark:bg-zinc-900/50 bg-white border dark:border-zinc-800 border-zinc-200 rounded-2xl p-6">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                                    <History className="w-4 h-4" /> Clock Audit Timeline
                                </h3>
                                <div className="space-y-6 relative ml-4 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-zinc-200 dark:before:bg-zinc-800">
                                    {audit.length === 0 ? (
                                        <p className="text-xs text-zinc-500 italic ml-6">No clock events recorded for this employee.</p>
                                    ) : audit.slice(-5).reverse().map((ev, i) => (
                                        <div key={i} className="relative pl-8 group">
                                            <div className="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-synos-primary border-2 border-white dark:border-zinc-950 z-10 group-hover:scale-150 transition-transform" />
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold dark:text-zinc-200">{ev.eventType}</span>
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 uppercase">{ev.sourceModule}</span>
                                                </div>
                                                <p className="text-[10px] text-zinc-500 mt-0.5">{new Date(ev.timestamp).toLocaleString()}</p>
                                                {ev.description && <p className="text-[10px] text-zinc-400 italic mt-1 font-mono">{ev.description}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* New: Pending Leave Requests Section */}
            <div className="mt-12 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Pending Leave Approvals
                </h3>
                <div className="grid grid-cols-3 gap-6">
                    {pendingLeaves.length === 0 ? (
                        <div className="col-span-3 p-8 text-center border-2 border-dashed dark:border-zinc-800 border-zinc-200 rounded-2xl text-zinc-500 text-sm">
                            No pending leave requests. Peace of mind.
                        </div>
                    ) : pendingLeaves.map(l => (
                        <div key={l.leaveRequestId} className="p-5 dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-zinc-200 rounded-2xl shadow-sm hover:border-synos-primary transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm font-bold dark:text-white">{l.employeeName}</p>
                                    <p className="text-[10px] text-zinc-500 font-medium tracking-tight">Requested on {new Date(l.appliedAt).toLocaleDateString()}</p>
                                </div>
                                <span className="px-2 py-0.5 bg-synos-primary/10 text-synos-primary text-[9px] font-bold rounded-full">{l.leaveType}</span>
                            </div>
                            <div className="space-y-2 mb-6">
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-zinc-400">Duration</span>
                                    <span className="font-bold dark:text-zinc-300">
                                        {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-[11px] text-zinc-500 line-clamp-2 italic">"{l.reason || 'No reason provided'}"</p>
                            </div>
                            <button 
                                onClick={() => setReviewingLeave(l)}
                                className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-synos-primary hover:text-white transition-all rounded-xl text-xs font-bold"
                            >
                                Review & Analyze Impact
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {reviewingLeave && (
                <LeaveReviewModal 
                    request={reviewingLeave} 
                    onClose={() => {
                        setReviewingLeave(null);
                        loadPendingLeaves();
                        if (selectedStaff) fetchSummary(selectedStaff.employeeId);
                    }} 
                />
            )}

            {selectedDate && (
                <AttendanceExceptionModal
                    isOpen={!!selectedDate}
                    onClose={() => setSelectedDate(null)}
                    date={selectedDate.dateStr}
                    employeeId={selectedStaff.employeeId}
                    currentStatus={selectedDate.status?.status}
                    rawStatus={selectedDate.status?.rawStatus}
                    initialNotes={selectedDate.status?.notes}
                    onSave={handleSaveException}
                />
            )}

            <WorkforcePolicyModal 
                isOpen={showPolicyModal}
                onClose={() => setShowPolicyModal(false)}
                onSuccess={() => {
                    // Maybe refresh data if policy impacts current view
                    if (selectedStaff) fetchSummary(selectedStaff.employeeId);
                }}
            />
        </div>
    );
}

// --- STAFF REGISTRY --- (rest of file...)

export function StaffRegistryScreen() {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        headcount: 0,
        monthlyBurn: 0,
        complianceHealth: '98%',
        pendingAdvances: 0
    });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [staffToEdit, setStaffToEdit] = useState(null);
    const [isStatutoryModalOpen, setIsStatutoryModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [staffData] = await Promise.all([
                WorkforceApi.getStaff()
            ]);
            
            // For now, calculate stats locally if specific endpoints are pending
            const activeStaff = staffData.filter(s => s.isActive);
            const burn = activeStaff.reduce((sum, s) => sum + s.baseSalary, 0);

            setStaff(staffData);
            setStats({
                headcount: activeStaff.length,
                monthlyBurn: burn,
                complianceHealth: '98%',
                pendingAdvances: 0 
            });
        } catch (error) {
            console.error("Failed to load workforce data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteStaff = async (id) => {
        if (!window.confirm("Are you sure you want to remove this staff member? This action is permanent.")) return;
        
        try {
            await WorkforceApi.deleteStaff(id);
            await loadData();
        } catch (error) {
            alert("Deletion failed: " + error.message);
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500 bg-clip-text text-transparent">
                        Workforce Registry
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage lab personnel, compensation structures, and compliance.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsStatutoryModalOpen(true)}
                        className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-4 py-2 rounded-xl transition-all border dark:border-zinc-800 border-zinc-200"
                    >
                        <Settings className="w-4 h-4" />
                        <span className="font-semibold text-sm">Compliance Rules</span>
                    </button>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 bg-synos-primary hover:bg-synos-primary/90 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-synos-primary/20 group"
                    >
                        <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="font-semibold text-sm">Add Staff Member</span>
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard label="Total Headcount" value={stats.headcount} icon={Users} trend="+2 this month" color="primary" />
                <StatCard label="Monthly Burn (Liability)" value={`₹${(stats.monthlyBurn / 100000).toFixed(1)}L`} icon={Calculator} trend="Accrued" color="zinc" />
                <StatCard label="Compliance Health" value={stats.complianceHealth} icon={ShieldCheck} trend="PF/ESI Active" color="emerald" />
                <StatCard label="Pending Advances" value={`₹${stats.pendingAdvances}`} icon={Wallet} trend="0 requests" color="amber" />
            </div>

            {/* Staff List Table */}
            <div className="dark:bg-zinc-900/50 bg-white border dark:border-zinc-800 border-zinc-200 rounded-2xl overflow-hidden shadow-sm backdrop-blur-md">
                <div className="p-4 border-b dark:border-zinc-800 border-zinc-200 flex items-center justify-between gap-4">
                    <div className="flex-1 relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input 
                            type="text" 
                            placeholder="Search by name, department, or role..." 
                            className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-synos-primary/50 outline-none transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={loadData} className="p-2 dark:bg-zinc-800 bg-zinc-100 rounded-lg text-zinc-500 hover:text-synos-primary transition-colors">
                            <Clock className="w-4 h-4" />
                        </button>
                        <button className="flex items-center gap-2 px-3 py-2 dark:bg-zinc-800 bg-zinc-100 rounded-lg text-xs font-medium dark:text-zinc-300">
                            <Filter className="w-3 h-3" /> Filter
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="dark:bg-zinc-950/50 bg-zinc-50/50 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Department</th>
                                <th className="px-6 py-4">Salary Type</th>
                                <th className="px-6 py-4 text-right">Base Salary</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-zinc-500 text-sm">Syncing with HR truth engine...</td>
                                </tr>
                            ) : staff.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-zinc-500 text-sm">No staff records found. Add your first member.</td>
                                </tr>
                            ) : staff.map(s => (
                                <StaffRow 
                                    key={s.employeeId} 
                                    name={`${s.firstName} ${s.lastName}`} 
                                    role={s.jobTitle} 
                                    dept={s.department || 'General'} 
                                    type={s.salaryType === 0 ? 'Fixed' : s.salaryType === 1 ? 'Hourly' : 'Visit'} 
                                    salary={s.baseSalary.toLocaleString()} 
                                    status={s.isActive ? 'Active' : 'Inactive'} 
                                    onEdit={() => setStaffToEdit(s)}
                                    onDelete={() => handleDeleteStaff(s.employeeId)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AddStaffModal 
                isOpen={isAddModalOpen || !!staffToEdit} 
                onClose={() => {
                    setIsAddModalOpen(false);
                    setStaffToEdit(null);
                }} 
                onStaffAdded={loadData} 
                editStaff={staffToEdit}
            />

            <StatutoryConfigModal 
                isOpen={isStatutoryModalOpen} 
                onClose={() => setIsStatutoryModalOpen(false)} 
                onConfigUpdated={() => {}} 
            />
        </div>
    );
}

// --- SALARY PROCESSING ---

export function SalaryProcessingScreen() {
    const [step, setStep] = useState(1); // 1: Select Period, 2: Calculate/Review, 3: Settle
    const [periods, setPeriods] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [activeRun, setActiveRun] = useState(null);
    const [draftResults, setDraftResults] = useState([]);
    const [lopSummary, setLopSummary] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadPeriods();
    }, []);

    const loadPeriods = async () => {
        try {
            const data = await WorkforceApi.getPeriods();
            setPeriods(data);
        } catch (error) {
            console.error("Failed to load periods:", error);
        }
    };

    const handleSelectPeriod = async (period) => {
        setSelectedPeriod(period);
        setLoading(true);
        try {
            // Check for existing run or start new one
            const run = await WorkforceApi.startRun(period.payrollPeriodId);
            setActiveRun(run);
            
            // Fetch LOP Preview for this month
            const monthStr = period.startDate.substring(0, 7) + '-01';
            const lop = await WorkforceApi.getLopSummary(monthStr);
            setLopSummary(lop);

            setStep(2);
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const executeCalculation = async () => {
        setLoading(true);
        try {
            await WorkforceApi.calculateRun(activeRun.payrollRunId);
            const results = await WorkforceApi.getRunReview(activeRun.payrollRunId);
            setDraftResults(results);
        } catch (error) {
            alert("Calculation failed: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const finalizeRun = async () => {
        setLoading(true);
        try {
            await WorkforceApi.finalizeRun(activeRun.payrollRunId);
            setStep(3);
        } catch (error) {
            alert("Finalization failed: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500 bg-clip-text text-transparent">
                        Salary Processing
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">Execute payroll runs, calculate statutory liabilities, and settle salaries.</p>
                </div>
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border dark:border-zinc-800 border-zinc-200">
                    <StepIndicator active={step === 1} number={1} label="Period" />
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                    <StepIndicator active={step === 2} number={2} label="Calculate" />
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                    <StepIndicator active={step === 3} number={3} label="Settle" />
                </div>
            </div>

            {step === 1 && (
                <div className="grid grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
                    {periods.length === 0 ? (
                        <div className="col-span-3 p-12 text-center border-2 border-dashed dark:border-zinc-800 border-zinc-200 rounded-2xl">
                            <Calendar className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                            <p className="text-zinc-500 mb-4">No payroll periods defined yet.</p>
                            <button className="bg-synos-primary text-white px-6 py-2 rounded-xl text-sm font-bold">Initialize 2026 Periods</button>
                        </div>
                    ) : (
                        periods.map(p => (
                            <PeriodCard 
                                key={p.payrollPeriodId}
                                month={new Date(p.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} 
                                status={p.status === 0 ? 'Open' : p.status === 1 ? 'Locked' : 'Finalized'} 
                                staffCount="--" 
                                accrual="--" 
                                onSelect={() => handleSelectPeriod(p)}
                                isCurrent={p.status === 0}
                            />
                        ))
                    )}
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                    <div className="flex items-center justify-between p-4 dark:bg-synos-primary/10 bg-synos-primary/5 border border-synos-primary/20 rounded-2xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-synos-primary flex items-center justify-center text-white shadow-lg shadow-synos-primary/30">
                                <Zap className="w-6 h-6 fill-current" />
                            </div>
                            <div>
                                <h3 className="font-bold text-zinc-900 dark:text-white">Run Calculation Engine</h3>
                                <p className="text-xs text-zinc-500">Aggregating attendance, proration, and adjustments.</p>
                            </div>
                        </div>
                        <button 
                            onClick={executeCalculation}
                            disabled={loading}
                            className="bg-synos-primary text-white px-6 py-2 rounded-xl font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-synos-primary/30 disabled:opacity-50"
                        >
                            {loading ? "Calculating..." : "Start Calculation"}
                        </button>
                    </div>

                    <div className="dark:bg-zinc-900/50 bg-white border dark:border-zinc-800 border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b dark:border-zinc-800 border-zinc-200 bg-amber-500/5 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-amber-600">
                                <AlertCircle className="w-4 h-4" />
                                <h3 className="text-xs font-bold uppercase tracking-widest">LOP & Quota Reconciliation</h3>
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono">Month: {lopSummary?.month}</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[11px]">
                                <thead>
                                    <tr className="bg-zinc-50 dark:bg-zinc-950/50 text-zinc-500 font-bold border-b dark:border-zinc-800">
                                        <th className="px-6 py-3">Employee</th>
                                        <th className="px-6 py-3 text-center">Paid Leave Used</th>
                                        <th className="px-6 py-3 text-center text-rose-500">LOP Days</th>
                                        <th className="px-6 py-3 text-right">Est. Deduction</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-zinc-800">
                                    {lopSummary?.rows?.map(row => (
                                        <tr key={row.employeeId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                            <td className="px-6 py-3 font-bold">{row.employeeName}</td>
                                            <td className="px-6 py-3 text-center">
                                                <span className="font-mono text-zinc-500">{row.paidLeaveUsed}</span> / <span className="text-zinc-400">{row.paidLeaveQuota}</span>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full font-bold ${row.lopDays > 0 ? 'bg-rose-500/10 text-rose-500' : 'text-zinc-300'}`}>
                                                    {row.lopDays} Days
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right font-mono font-bold text-zinc-600 dark:text-zinc-400">
                                                {row.estimatedDeduction > 0 ? `₹${row.estimatedDeduction.toLocaleString()}` : '--'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button onClick={() => setStep(1)} className="px-6 py-2.5 rounded-xl border dark:border-zinc-800 border-zinc-200 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                            Cancel
                        </button>
                        <button 
                            onClick={finalizeRun}
                            disabled={loading || draftResults.length === 0}
                            className="px-8 py-2.5 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white rounded-xl text-sm font-bold shadow-xl shadow-black/20 hover:scale-[1.02] transition-transform disabled:opacity-50"
                        >
                            {loading ? "Finalizing..." : "Finalize & Lock Period"}
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="max-w-2xl mx-auto text-center space-y-6 animate-in zoom-in-95 duration-500 py-12">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-500/50">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold dark:text-white">Payroll Finalized</h2>
                    <p className="text-zinc-500">
                        Liabilities have been generated. Salaries are now ready for settlement in the expense hub.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-8">
                        <button className="flex flex-col items-center gap-3 p-6 dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-zinc-200 rounded-2xl hover:border-synos-primary transition-all">
                            <CreditCard className="w-8 h-8 text-synos-primary" />
                            <span className="font-bold text-sm">Bulk Bank Settle</span>
                        </button>
                        <button className="flex flex-col items-center gap-3 p-6 dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-zinc-200 rounded-2xl hover:border-synos-primary transition-all">
                            <Wallet className="w-8 h-8 text-amber-500" />
                            <span className="font-bold text-sm">Cash Settle Hub</span>
                        </button>
                    </div>
                    <button onClick={() => setStep(1)} className="mt-8 text-sm text-synos-primary hover:underline">
                        Return to Period Selector
                    </button>
                </div>
            )}
        </div>
    );
}

// --- PAYROLL HISTORY ---

export function PayrollHistoryScreen() {
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const data = await WorkforceApi.getRuns();
            setRuns(data.filter(r => r.status === 4)); // Finalized
        } catch (error) {
            console.error("History fail:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold dark:text-white">Payroll History</h1>
                <p className="text-zinc-500">Review past payroll runs and settlement audits.</p>
            </div>

            <div className="dark:bg-zinc-900/50 bg-white border dark:border-zinc-800 border-zinc-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="dark:bg-zinc-950/50 bg-zinc-50/50 text-[10px] uppercase font-bold text-zinc-500">
                        <tr>
                            <th className="px-6 py-4">Period</th>
                            <th className="px-6 py-4">Finalized On</th>
                            <th className="px-6 py-4">Run ID</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200 text-sm">
                        {loading ? (
                             <tr><td colSpan="4" className="p-12 text-center text-zinc-500">Loading audit logs...</td></tr>
                        ) : runs.length === 0 ? (
                            <tr><td colSpan="4" className="p-12 text-center text-zinc-500">No finalized runs found.</td></tr>
                        ) : runs.map(run => (
                            <tr key={run.payrollRunId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                                <td className="px-6 py-4 font-bold">{new Date(run.payrollPeriod?.startDate).toLocaleDateString()} - {new Date(run.payrollPeriod?.endDate).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-zinc-500">{new Date(run.completedAt).toLocaleString()}</td>
                                <td className="px-6 py-4 font-mono text-[10px] text-zinc-400">{run.payrollRunId}</td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-synos-primary hover:underline font-bold text-xs">View Report</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- ADVANCES & DEDUCTIONS ---

export function AdvancesDeductionsScreen() {
    const [advances, setAdvances] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [advData, staffData] = await Promise.all([
                WorkforceApi.getAdvances(),
                WorkforceApi.getStaff()
            ]);
            setAdvances(advData);
            setStaff(staffData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold dark:text-white">Advances & Deductions</h1>
                    <p className="text-zinc-500">Manage employee loan requests and ad-hoc salary adjustments.</p>
                </div>
                <button 
                    onClick={() => setIsAdvanceModalOpen(true)}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-amber-500/20"
                >
                    <PlusCircle className="w-4 h-4" />
                    New Advance Request
                </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                        <Wallet className="w-4 h-4" /> Pending Advances
                    </h3>
                    <div className="dark:bg-zinc-900/50 bg-white border dark:border-zinc-800 border-zinc-200 rounded-2xl overflow-hidden min-h-[300px]">
                        {loading ? <div className="p-8 text-center text-zinc-500">Loading...</div> : (
                            <table className="w-full text-left text-xs">
                                <thead className="bg-zinc-50 dark:bg-zinc-950 font-bold text-zinc-500 border-b dark:border-zinc-800">
                                    <tr>
                                        <th className="px-4 py-3">Employee</th>
                                        <th className="px-4 py-3 text-right">Amount</th>
                                        <th className="px-4 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-zinc-800">
                                    {advances.filter(a => a.status === 'Pending').map(a => (
                                        <tr key={a.advanceId}>
                                            <td className="px-4 py-3">{a.employeeId.substring(0,8)}...</td>
                                            <td className="px-4 py-3 text-right font-bold">₹{a.amount}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">{a.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {advances.filter(a => a.status === 'Pending').length === 0 && (
                                        <tr><td colSpan="3" className="p-8 text-center text-zinc-500 italic">No pending advances.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                        <Calculator className="w-4 h-4" /> Recent Adjustments
                    </h3>
                    <div className="dark:bg-zinc-900/50 bg-white border dark:border-zinc-800 border-zinc-200 rounded-2xl p-8 text-center">
                        <FileText className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                        <p className="text-xs text-zinc-500">Ad-hoc adjustments (TDS overrides, bonuses) appear here once finalized.</p>
                    </div>
                </div>
            </div>

            <AdvanceRequestModal 
                isOpen={isAdvanceModalOpen} 
                onClose={() => setIsAdvanceModalOpen(false)} 
                staffList={staff}
                onAdvanceAdded={loadData}
            />
        </div>
    );
}

// --- SHARED COMPONENTS ---

function StatCard({ label, value, icon: Icon, trend, color }) {
    const colors = {
        primary: 'bg-synos-primary text-white shadow-synos-primary/20',
        emerald: 'bg-emerald-500 text-white shadow-emerald-500/20',
        amber: 'bg-amber-500 text-white shadow-amber-500/20',
        zinc: 'bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white shadow-black/10'
    };

    return (
        <div className="dark:bg-zinc-900/50 bg-white border dark:border-zinc-800 border-zinc-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-xl ${colors[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-600 transition-colors">{trend}</span>
            </div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</p>
            <p className="text-2xl font-black mt-1 dark:text-white">{value}</p>
        </div>
    );
}

function StaffRow({ name, role, dept, type, salary, status, onEdit, onDelete }) {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <tr className="hover:dark:bg-zinc-800/30 hover:bg-zinc-50 transition-colors group">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                        {name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-200">{name}</p>
                        <p className="text-[10px] text-zinc-500 font-medium">{role}</p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 text-xs font-medium text-zinc-500">{dept}</td>
            <td className="px-6 py-4">
                <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
                    {type}
                </span>
            </td>
            <td className="px-6 py-4 text-right text-xs font-mono font-bold dark:text-zinc-400">
                ₹{salary}
            </td>
            <td className="px-6 py-4 text-center">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'} border`}>
                    <div className={`w-1 h-1 rounded-full ${status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {status}
                </span>
            </td>
            <td className="px-6 py-4 text-right relative">
                <button 
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                    <MoreVertical className="w-4 h-4" />
                </button>

                {showMenu && (
                    <div ref={menuRef} className="absolute right-6 top-10 z-10 w-36 bg-white dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-200 rounded-xl shadow-xl py-2 animate-in fade-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => {
                                setShowMenu(false);
                                onEdit();
                            }}
                            className="w-full px-4 py-2 text-left text-xs font-medium dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
                        >
                            <Settings className="w-3.5 h-3.5" /> Edit Profile
                        </button>
                        <button 
                            onClick={() => {
                                setShowMenu(false);
                                onDelete();
                            }}
                            className="w-full px-4 py-2 text-left text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-2"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Member
                        </button>
                    </div>
                )}
            </td>
        </tr>
    );
}

function StepIndicator({ active, number, label }) {
    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${active ? 'bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700' : 'opacity-50'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${active ? 'bg-synos-primary text-white' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                {number}
            </div>
            <span className="text-xs font-bold">{label}</span>
        </div>
    );
}

function PeriodCard({ month, status, staffCount, accrual, onSelect, isCurrent }) {
    return (
        <div className={`p-6 rounded-2xl border transition-all hover:scale-[1.02] cursor-pointer group ${isCurrent ? 'bg-synos-primary/5 border-synos-primary shadow-lg shadow-synos-primary/5' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm'}`} onClick={onSelect}>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-black dark:text-white group-hover:text-synos-primary transition-colors">{month}</h3>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${status === 'Finalized' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500 animate-pulse'}`}>
                        {status}
                    </span>
                </div>
                <Calendar className={`w-6 h-6 ${isCurrent ? 'text-synos-primary' : 'text-zinc-300'}`} />
            </div>
            <div className="space-y-3">
                <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Staff Count</span>
                    <span className="font-bold dark:text-zinc-300">{staffCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Estimated Accrual</span>
                    <span className="font-bold dark:text-zinc-300">{accrual}</span>
                </div>
            </div>
            <button className="w-full mt-6 py-2 rounded-xl bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                Select Period
            </button>
        </div>
    );
}

function PayrollReviewRow({ name, gross, deductions, net }) {
    return (
        <tr className="hover:dark:bg-zinc-800/30 hover:bg-zinc-50 transition-colors">
            <td className="px-6 py-4 font-bold text-sm dark:text-zinc-200">{name}</td>
            <td className="px-6 py-4 text-right font-mono text-xs text-zinc-500">₹{gross}</td>
            <td className="px-6 py-4 text-right font-mono text-xs text-rose-500">-₹{deductions}</td>
            <td className="px-6 py-4 text-right font-mono text-sm font-black text-emerald-500">₹{net}</td>
        </tr>
    );
}

function LeaveReviewModal({ request, onClose }) {
    const [impact, setImpact] = useState(null);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        analyzeImpact();
    }, []);

    const analyzeImpact = async () => {
        try {
            const data = await WorkforceApi.getImpactAnalysis(request.employeeId, request.startDate, request.endDate);
            setImpact(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (action) => {
        setSubmitting(true);
        try {
            await WorkforceApi.reviewLeave({
                leaveRequestId: request.leaveRequestId,
                status: action,
                supervisorNote: note
            });
            onClose();
        } catch (error) {
            alert(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border dark:border-zinc-800 border-zinc-200">
                <div className="p-6 border-b dark:border-zinc-800 border-zinc-200 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950/50">
                    <div>
                        <h2 className="text-lg font-bold dark:text-white">Review Leave Request</h2>
                        <p className="text-xs text-zinc-500">{request.employeeName} • {request.leaveType}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <MoreVertical className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/50 border dark:border-zinc-800 border-zinc-200">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Request Reason</p>
                        <p className="text-sm italic dark:text-zinc-300">"{request.reason || 'No reason provided'}"</p>
                    </div>

                    {loading ? (
                        <div className="py-8 text-center">
                            <div className="w-6 h-6 border-2 border-synos-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-xs text-zinc-500">Calculating financial impact...</p>
                        </div>
                    ) : impact && (
                        <div className={`p-4 rounded-2xl border ${impact.convertedToLopDays > 0 ? 'bg-rose-500/5 border-rose-500/30' : 'bg-emerald-500/5 border-emerald-500/30'}`}>
                            <div className="flex items-center gap-2 mb-3">
                                {impact.convertedToLopDays > 0 ? <AlertCircle className="w-4 h-4 text-rose-500" /> : <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                                <h3 className={`text-xs font-bold uppercase ${impact.convertedToLopDays > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {impact.convertedToLopDays > 0 ? 'Approval Impact Warning' : 'Safe to Approve'}
                                </h3>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-500">Remaining Quota</span>
                                    <span className="font-bold dark:text-zinc-300">{impact.remainingQuotaBeforeRequest} Days</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-500">Paid Leave Consumed</span>
                                    <span className="font-bold dark:text-zinc-300">{impact.paidDaysConsumed} Days</span>
                                </div>
                                {impact.convertedToLopDays > 0 && (
                                    <div className="flex justify-between text-xs pt-2 border-t dark:border-zinc-800 border-zinc-200">
                                        <span className="text-rose-500 font-bold">Converted to LOP</span>
                                        <span className="font-black text-rose-500">{impact.convertedToLopDays} Days</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Supervisor Note (Optional)</label>
                        <textarea 
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="Add a reason for approval/rejection..."
                            className="w-full h-24 p-4 bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-synos-primary/50 transition-all resize-none"
                        />
                    </div>
                </div>

                <div className="p-6 bg-zinc-50 dark:bg-zinc-950/50 border-t dark:border-zinc-800 border-zinc-200 flex gap-3">
                    <button 
                        disabled={submitting}
                        onClick={() => handleReview('Rejected')}
                        className="flex-1 py-3 rounded-2xl border border-rose-500/30 text-rose-500 font-bold text-sm hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50"
                    >
                        Reject Request
                    </button>
                    <button 
                        disabled={submitting}
                        onClick={() => handleReview('Approved')}
                        className="flex-[2] py-3 rounded-2xl bg-synos-primary text-white font-bold text-sm hover:scale-[1.02] transition-transform shadow-lg shadow-synos-primary/20 disabled:opacity-50"
                    >
                        {submitting ? "Processing..." : "Approve & Log Impact"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function IdentityProvisioningScreen() {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    useEffect(() => {
        loadStaff();
    }, []);

    const loadStaff = async () => {
        setLoading(true);
        try {
            const data = await WorkforceApi.getStaff();
            setStaff(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        if (!window.confirm("DEV ONLY: This will link seeded users to HR records. Proceed?")) return;
        setSyncing(true);
        try {
            await WorkforceApi.syncSeededUsers();
            await loadStaff();
        } catch (error) {
            alert("Migration failed: " + error.message);
        } finally {
            setSyncing(false);
        }
    };

    const toggleAccess = async (employeeId, currentStatus) => {
        try {
            if (currentStatus) {
                await WorkforceApi.deactivateAccess(employeeId);
            } else {
                await WorkforceApi.reactivateAccess(employeeId);
            }
            await loadStaff();
        } catch (error) {
            alert(error.message);
        }
    };

    const pending = staff.filter(e => !e.userId && e.isActive);
    const managed = staff.filter(e => e.userId);

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Identity & Access</h1>
                    <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-bold">Workforce Management Utility</p>
                </div>
                <button 
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 px-3 py-1.5 rounded-lg text-xs font-bold border dark:border-zinc-700 transition-colors"
                >
                    <History className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                    Migration Bridge (Dev)
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Pending Access Queue */}
                <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Key className="w-3.5 h-3.5 text-synos-primary" />
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Pending Access</h3>
                        </div>
                        <span className="text-[10px] font-black bg-synos-primary/10 text-synos-primary px-2 py-0.5 rounded-full">
                            {pending.length} Awaiting Login
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 border-b dark:border-zinc-800">
                                    <th className="px-4 py-2">Staff Member</th>
                                    <th className="px-4 py-2">Designation</th>
                                    <th className="px-4 py-2">Department</th>
                                    <th className="px-4 py-2 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-zinc-800">
                                {loading ? (
                                    <tr><td colSpan="4" className="px-4 py-8 text-center text-xs text-zinc-500">Updating registry...</td></tr>
                                ) : pending.length === 0 ? (
                                    <tr><td colSpan="4" className="px-4 py-8 text-center text-xs text-zinc-500">No pending access requests.</td></tr>
                                ) : pending.map(e => (
                                    <tr key={e.employeeId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-4 py-2.5 text-sm font-bold dark:text-zinc-200">{e.firstName} {e.lastName}</td>
                                        <td className="px-4 py-2.5 text-xs text-zinc-500">{e.jobTitle}</td>
                                        <td className="px-4 py-2.5 text-xs text-zinc-500">{e.department || 'N/A'}</td>
                                        <td className="px-4 py-2.5 text-right">
                                            <button 
                                                onClick={() => setSelectedEmployee(e)}
                                                className="bg-synos-primary text-white px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter hover:opacity-90"
                                            >
                                                Provision Login
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Managed Identities */}
                <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center gap-2">
                        <Fingerprint className="w-3.5 h-3.5 text-emerald-500" />
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Managed System Identities</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 border-b dark:border-zinc-800">
                                    <th className="px-4 py-2">Staff Member</th>
                                    <th className="px-4 py-2">Access Status</th>
                                    <th className="px-4 py-2">Last Activity</th>
                                    <th className="px-4 py-2">Identity ID</th>
                                    <th className="px-4 py-2 text-right">Lifecycle</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-zinc-800">
                                {managed.length === 0 ? (
                                    <tr><td colSpan="4" className="px-4 py-8 text-center text-xs text-zinc-500">No provisioned identities found.</td></tr>
                                ) : managed.map(e => (
                                    <tr key={e.employeeId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-4 py-2.5 text-sm font-bold dark:text-zinc-200">{e.firstName} {e.lastName}</td>
                                        <td className="px-4 py-2.5">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${e.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                {e.isActive ? 'Active Access' : 'Deactivated'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-zinc-500">
                                            {e.user?.lastLoginAt ? new Date(e.user.lastLoginAt).toLocaleString() : 'Never'}
                                        </td>
                                        <td className="px-4 py-2.5 text-[10px] font-mono text-zinc-400 uppercase">{e.userId.substring(0, 8)}...</td>
                                        <td className="px-4 py-2.5 text-right">
                                            <button 
                                                onClick={() => toggleAccess(e.employeeId, e.isActive)}
                                                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-colors ${
                                                    e.isActive 
                                                    ? 'text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white' 
                                                    : 'text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
                                                }`}
                                            >
                                                {e.isActive ? 'Deactivate Access' : 'Reactivate Access'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {selectedEmployee && (
                <ProvisionAccessModal 
                    employee={selectedEmployee} 
                    onClose={() => setSelectedEmployee(null)} 
                    onSuccess={() => {
                        setSelectedEmployee(null);
                        loadStaff();
                    }}
                />
            )}
        </div>
    );
}

function ProvisionAccessModal({ employee, onClose, onSuccess }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [roles, setRoles] = useState(['Staff']);
    const [submitting, setSubmitting] = useState(false);

    const availableRoles = ['Staff', 'Technician', 'Pathologist', 'Receptionist', 'Finance', 'InventoryManager', 'Admin'];

    const handleProvision = async () => {
        if (!username || !password) return alert("Username and initial password are required.");
        if (roles.length === 0) return alert("At least one system role must be assigned.");

        setSubmitting(true);
        try {
            await WorkforceApi.provisionAccess(employee.employeeId, {
                username,
                email: email || null,
                password,
                roles
            });
            onSuccess();
        } catch (error) {
            alert(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-xl overflow-hidden shadow-2xl border dark:border-zinc-800">
                <div className="px-5 py-4 border-b dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
                    <div>
                        <h2 className="text-sm font-bold dark:text-white">Provision System Login</h2>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">{employee.firstName} {employee.lastName}</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors">
                        <Trash2 className="w-4 h-4 text-zinc-400 rotate-45" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Username (Mandatory)</label>
                            <input 
                                type="text" 
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="e.g. jdoe_lab"
                                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-800 rounded text-xs outline-none focus:border-synos-primary transition-colors"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Email Address (Optional)</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="staff@lab.com"
                                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-800 rounded text-xs outline-none focus:border-synos-primary transition-colors"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Initial Password</label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-800 rounded text-xs outline-none focus:border-synos-primary transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Operational Roles (Manual Assignment)</label>
                        <div className="flex flex-wrap gap-1.5">
                            {availableRoles.map(role => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => {
                                        if (roles.includes(role)) {
                                            setRoles(roles.filter(r => r !== role));
                                        } else {
                                            setRoles([...roles, role]);
                                        }
                                    }}
                                    className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase border transition-all ${
                                        roles.includes(role) 
                                        ? 'bg-synos-primary border-synos-primary text-white' 
                                        : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400'
                                    }`}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                        <p className="text-[9px] text-zinc-500 italic mt-1">Note: Designation suggestions are ignored. Admin must confirm all roles.</p>
                    </div>
                </div>

                <div className="px-5 py-4 bg-zinc-50 dark:bg-zinc-950 border-t dark:border-zinc-800 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-[10px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                        Cancel
                    </button>
                    <button 
                        onClick={handleProvision}
                        disabled={submitting}
                        className="px-6 py-2 bg-synos-primary text-white rounded text-[10px] font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
                    >
                        {submitting ? "Processing..." : "Enable System Access"}
                    </button>
                </div>
            </div>
        </div>
    );
}
