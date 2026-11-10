import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'
import { User, Pencil, CreditCard } from 'lucide-react'

export const calculateDetailedAge = (dobString, fallbackAge) => {
    if (!dobString && fallbackAge && fallbackAge > 0) {
        return { text: `${fallbackAge} Yrs`, category: fallbackAge < 18 ? "Child" : "Adult" };
    }
    if (!dobString) return { text: "-", category: "Adult" };
    const dob = new Date(dobString);
    if (isNaN(dob.getTime()) || dob.getFullYear() <= 1900) {
        if (fallbackAge && fallbackAge > 0) {
            return { text: `${fallbackAge} Yrs`, category: fallbackAge < 18 ? "Child" : "Adult" };
        }
        return { text: "-", category: "Adult" };
    }
    
    const today = new Date();
    const timeDiff = today - dob;
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return { text: "0 Days", category: "Newborn" };
    
    if (days <= 28) {
        return { text: `${days} Day${days !== 1 ? 's' : ''}`, category: "Newborn" };
    }
    
    // Calculate months and days
    let months = today.getMonth() - dob.getMonth() + (12 * (today.getFullYear() - dob.getFullYear()));
    let remainingDays = today.getDate() - dob.getDate();
    if (remainingDays < 0) {
        months--;
        const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        remainingDays += prevMonth.getDate();
    }
    
    if (months < 12) {
        const parts = [];
        if (months > 0) parts.push(`${months} Month${months > 1 ? 's' : ''}`);
        if (remainingDays > 0) parts.push(`${remainingDays} Day${remainingDays > 1 ? 's' : ''}`);
        return { text: parts.join(' ') || "1 Month", category: "Infant" };
    }
    
    // Calculate years and months
    let years = today.getFullYear() - dob.getFullYear();
    let remainingMonths = today.getMonth() - dob.getMonth();
    if (remainingMonths < 0 || (remainingMonths === 0 && today.getDate() < dob.getDate())) {
        years--;
        remainingMonths += 12;
    }
    if (today.getDate() < dob.getDate()) {
        remainingMonths--;
    }
    
    if (years <= 12) {
        const parts = [`${years} Year${years > 1 ? 's' : ''}`];
        if (remainingMonths > 0) parts.push(`${remainingMonths} Month${remainingMonths > 1 ? 's' : ''}`);
        return { text: parts.join(' '), category: "Child" };
    }
    
    return { text: `${years} Yrs`, category: "Adult" };
};

export const formatPatientDob = (dobString, isDobKnown) => {
    if (!dobString) return "";
    const dob = new Date(dobString);
    if (isNaN(dob.getTime()) || dob.getFullYear() <= 1900) return "";
    
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(dob.getDate()).padStart(2, '0');
    const month = months[dob.getMonth()];
    const year = dob.getFullYear();
    
    const status = isDobKnown === true || isDobKnown === "true" || isDobKnown === 1 ? "Exact" : "Estimated";
    return `${day}-${month}-${year} (${status})`;
};

export const RichPatientCard = ({ patient, onAction, actionLabel, secondaryActionLabel, onSecondaryAction, isLocked, isHighlighted, patientIndex, onHighlight }) => {
    // Robust extraction
    const p = patient;
    let name = p.name || p.Name || p.fullName || p.FullName || p.displayName || p.DisplayName || `${p.firstName || p.FirstName || ''} ${p.lastName || p.LastName || ''}`.trim();
    const mobile = p.mobile || p.Mobile || p.phoneNumber || p.PhoneNumber || p.phone || p.Phone || p.currentPhoneNumber || p.CurrentPhoneNumber;
    const mrn = p.mrn || p.MRN || "—";

    // Systemic Health Card extraction across all clinical pods
    const hasHealthCard = Boolean(
        p.hasActiveHealthCard || 
        p.HasActiveHealthCard || 
        p.healthCardNumber || 
        p.HealthCardNumber ||
        (p.healthCardEligibility && (p.healthCardEligibility.hasActiveCard || p.healthCardEligibility.isPatientEnrolledBeneficiary)) ||
        (p.membershipCard && p.membershipCard.status === 'Active')
    );
    const rawCardNumber = p.healthCardNumber || 
                          p.HealthCardNumber || 
                          p.healthCardEligibility?.card?.cardNumber ||
                          p.membershipCard?.cardNumber;
    const healthCardNumber = (rawCardNumber && !rawCardNumber.startsWith("HC-")) 
        ? rawCardNumber 
        : (hasHealthCard && mrn && mrn !== "—" ? `${String(mrn).trim()}-HC` : null);
    const healthCardPlanName = p.healthCardPlanName || 
                               p.HealthCardPlanName || 
                               p.planName || 
                               p.PlanName ||
                               p.healthCardEligibility?.card?.plan?.planName ||
                               p.healthCardEligibility?.card?.planName ||
                               p.membershipCard?.planName;
    
    const dob = p.dateOfBirth || p.DateOfBirth || p.dob || p.Dob;
    const fallbackAge = p.age !== undefined ? p.age : p.Age;
    const isDobKnown = p.isDateOfBirthKnown !== undefined ? p.isDateOfBirthKnown : (p.IsDateOfBirthKnown !== undefined ? p.IsDateOfBirthKnown : true);

    const detailedAge = calculateDetailedAge(dob, fallbackAge);
    const dobText = formatPatientDob(dob, isDobKnown);

    // Normalize Gender (Handle: Male, male, M, m, etc)
    const rawGender = p.gender || p.Gender || p.sex || p.Sex || '';
    const genderInitial = rawGender ? rawGender.charAt(0).toUpperCase() : 'P';
    const genderLabel = rawGender ? rawGender : '-';

    const lastVisitDate = p.lastVisitDate || p.LastVisitDate;
    const lastVisitTestCodes = p.lastVisitTestCodes || p.LastVisitTestCodes || p.testCodes || p.TestCodes || p.tests || p.Tests || (p.lastVisit && (p.lastVisit.testCodes || p.lastVisit.TestCodes));

    // Cleaner Name Logic: If name ends with " Patient", strip it IF cleaner look desired
    if (name && name.endsWith(' Patient')) {
        name = name.replace(' Patient', '');
    }
    // DEF-006: Sanitize HTML tags from display name
    if (name && typeof name === 'string') {
        name = name.replace(/<[^>]*>?/gm, '').trim() || name;
    }

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const cardUi = isDark ? {
        locked: "bg-transparent cursor-default p-0 shadow-none border-0",
        inactive: "bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 cursor-pointer rounded-2xl p-4 shadow-xs",
        name: isLocked ? "text-white font-bold" : "text-zinc-200 group-hover:text-white",
        badge: isLocked ? "bg-zinc-800 border border-zinc-700/80 text-zinc-200 shadow-2xs" : "bg-zinc-700 text-zinc-300",
        mrn: isLocked ? "bg-zinc-800 border border-zinc-700/80 text-zinc-300 shadow-2xs" : "bg-zinc-900 border-zinc-800 text-zinc-400"
    } : {
        locked: "bg-transparent cursor-default p-0 shadow-none border-0",
        inactive: "bg-white border border-slate-200/80 shadow-xs rounded-2xl cursor-pointer hover:border-slate-300 transition-all p-4",
        name: "text-slate-900 font-bold",
        badge: isLocked 
            ? "bg-white border border-slate-200/90 text-slate-700 shadow-[0_1px_2px_rgba(15,35,60,0.06)]"
            : "bg-slate-200/70 border border-slate-300/60 text-slate-700",
        mrn: isLocked
            ? "bg-white border border-slate-200/90 text-slate-800 font-semibold shadow-[0_1px_2px_rgba(15,35,60,0.06)]"
            : "bg-slate-200/70 border border-slate-300/60 text-slate-800 font-semibold"
    };

    if (isLocked) {
        return (
            <div className="w-full flex flex-col justify-center py-0.5">
                {/* 3-COLUMN CLINICAL WORKSTATION GRID */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 w-full">
                    {/* COL 1: AVATAR & PROMINENT PATIENT NAME */}
                    <div className="flex items-center gap-3 min-w-0 shrink-0">
                        <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                            isDark 
                                ? "bg-sky-950/60 text-sky-400 border-2 border-zinc-800 shadow-md" 
                                : "bg-gradient-to-b from-[#E0F2FE] to-[#BAE6FD] text-[#0284C7] border-2 border-white shadow-[0_3px_10px_rgba(2,132,199,0.2)]"
                        )}>
                            <User className="w-6 h-6 text-[#0284C7]" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate block tracking-tight leading-tight" title={name}>
                                {name}
                            </span>
                        </div>
                    </div>

                    {/* SUBTLE SEPARATOR 1 */}
                    <div className="hidden sm:block h-10 w-[1px] bg-slate-300 dark:bg-zinc-700/80 mx-2 sm:mx-3 shrink-0 select-none" />

                    {/* COL 2: DEMOGRAPHICS (Age, Sex, Mobile, Last Visit) */}
                    <div className="flex flex-col justify-center gap-1.5 flex-1 min-w-0">
                        {/* Row 1: Age & Sex Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={cn(
                                "px-3 py-1 rounded-xl text-xs sm:text-sm font-bold shadow-2xs border inline-flex items-center gap-1",
                                cardUi.badge
                            )}>
                                <span className="text-slate-500 dark:text-zinc-400 font-medium">Age:</span>
                                <span className="font-bold text-slate-900 dark:text-white">{detailedAge.text}</span>
                            </span>
                            <span className={cn(
                                "px-3 py-1 rounded-xl text-xs sm:text-sm font-bold shadow-2xs border inline-flex items-center",
                                cardUi.badge
                            )}>
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {genderLabel !== '-' ? genderLabel : (genderInitial === 'M' ? 'Male' : 'Female')}
                                </span>
                            </span>
                        </div>

                        {/* Row 2: Mobile & Last Visit */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={cn(
                                "px-3 py-1 rounded-xl text-xs sm:text-sm font-bold shadow-2xs border inline-flex items-center gap-1.5",
                                cardUi.badge
                            )}>
                                <span className="text-slate-500 dark:text-zinc-400 font-medium">Mobile:</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                    {mobile || "—"}
                                </span>
                            </span>
                            <span className={cn(
                                "px-3 py-1 rounded-xl text-xs sm:text-sm font-bold shadow-2xs border inline-flex items-center gap-1.5",
                                cardUi.badge
                            )}>
                                <span className="text-slate-500 dark:text-zinc-400 font-medium">Last Visit:</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                    {lastVisitDate ? new Date(lastVisitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : 'New'}
                                </span>
                            </span>
                        </div>
                    </div>

                    {/* SUBTLE SEPARATOR 2 */}
                    <div className="hidden sm:block h-10 w-[1px] bg-slate-300 dark:bg-zinc-700/80 mx-2 sm:mx-3 shrink-0 select-none" />

                    {/* COL 3: MRN & EDIT ACTION */}
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0 justify-end">
                        <div className="text-right leading-tight">
                            {hasHealthCard ? (
                                <>
                                    <span className="text-[10px] sm:text-xs uppercase font-extrabold tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1 justify-end">
                                        <CreditCard className="w-3 h-3 text-indigo-500" />
                                        CARD / MRN
                                    </span>
                                    <span className="font-mono text-indigo-700 dark:text-indigo-300 font-black text-sm sm:text-base block mt-0.5">
                                        {healthCardNumber || `${mrn}-HC`}
                                    </span>
                                    {healthCardPlanName && (
                                        <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 block truncate max-w-[140px]">
                                            {healthCardPlanName}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <>
                                    <span className="text-[10px] sm:text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-zinc-400 block">
                                        MRN
                                    </span>
                                    <span className="font-mono text-slate-900 dark:text-white font-bold text-sm sm:text-base block mt-0.5">
                                        {mrn}
                                    </span>
                                </>
                            )}
                        </div>

                        {secondaryActionLabel && (
                            <button 
                                id="btn-edit-demographics"
                                data-initial-focus="true"
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSecondaryAction) onSecondaryAction();
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Tab' && !e.shiftKey) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const payerBtn = document.getElementById('btn-payer-mode-active') ||
                                                         document.querySelector('[data-payer-mode-btn="true"][data-selected="true"]') ||
                                                         document.querySelector('[data-payer-mode-btn="true"]');
                                        if (payerBtn) payerBtn.focus();
                                    } else if (e.key === 'Tab' && e.shiftKey) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const bottomAction = document.getElementById('btn-unified-action') ||
                                                             document.getElementById('btn-delete-draft') ||
                                                             document.getElementById('btn-cancel-visit');
                                        if (bottomAction) bottomAction.focus();
                                    }
                                }}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-200 bg-white hover:bg-slate-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-300/80 dark:border-zinc-700 shadow-xs hover:shadow transition-all cursor-pointer active:scale-95 synos-focus-btn"
                                title="Edit Patient Demographics"
                            >
                                <Pencil className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                                <span>{secondaryActionLabel}</span>
                            </button>
                        )}
                        {actionLabel && (
                            <button 
                                id="btn-change-patient"
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onAction) onAction();
                                }}
                                className="text-[#0369A1] hover:text-[#0284C7] font-bold text-xs rounded px-2 py-1 cursor-pointer synos-focus-btn"
                            >
                                {actionLabel}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={onAction}
            className={cn(
                "flex flex-col gap-3 transition-all group",
                !isLocked && "synos-focus-card",
                isLocked ? cardUi.locked : cardUi.inactive,
                isHighlighted && "is-active-nav ring-1 ring-indigo-500/40 bg-indigo-50/20 dark:bg-indigo-950/20"
            )}
        >
            {/* NEW LAYOUT: STRICT GRID */}
            <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-1.5 items-center">

                {/* COL 1: AVATAR (Row Span 3) */}
                <div className={cn(
                    "row-span-3 self-center rounded-full flex items-center justify-center shrink-0 transition-transform",
                    isLocked ? "w-10 h-10 sm:w-11 sm:h-11" : "w-9 h-9 sm:w-10 sm:h-10",
                    isLocked
                        ? (isDark 
                            ? "bg-sky-950/60 text-sky-400 border-2 border-zinc-800 shadow-md" 
                            : "bg-gradient-to-b from-[#E0F2FE] to-[#BAE6FD] text-[#0284C7] border-2 border-white shadow-[0_3px_10px_rgba(2,132,199,0.2)]")
                        : (isDark 
                            ? "bg-zinc-800 text-zinc-300 border border-zinc-700 shadow-xs" 
                            : "bg-slate-100 text-slate-600 border border-slate-200 shadow-xs")
                )}>
                    <User className={isLocked ? "w-5 h-5 text-[#0284C7]" : "w-4 h-4"} />
                </div>

                {/* ROW 1: NAME + SELECT */}
                <div className="flex items-center pt-0.5">
                    <div className={cn(
                        "truncate text-base sm:text-lg font-bold leading-tight tracking-normal",
                        cardUi.name
                    )}>
                        {name}
                    </div>
                </div>
                <div className="justify-self-end self-start flex items-center gap-2">
                    {secondaryActionLabel && (
                        <button 
                            id="btn-edit-demographics"
                            data-initial-focus="true"
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onSecondaryAction) onSecondaryAction();
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Tab' && !e.shiftKey) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const payerBtn = document.getElementById('btn-payer-mode-active') ||
                                                     document.querySelector('[data-payer-mode-btn="true"][data-selected="true"]') ||
                                                     document.querySelector('[data-payer-mode-btn="true"]');
                                    if (payerBtn) payerBtn.focus();
                                } else if (e.key === 'Tab' && e.shiftKey) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const bottomAction = document.getElementById('btn-unified-action') ||
                                                         document.getElementById('btn-delete-draft') ||
                                                         document.getElementById('btn-cancel-visit');
                                    if (bottomAction) bottomAction.focus();
                                }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-slate-700 dark:text-zinc-200 bg-white/90 hover:bg-white dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-300/80 dark:border-zinc-700 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95 synos-focus-btn"
                            title="Edit Patient Demographics"
                        >
                            <Pencil className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                            <span>{secondaryActionLabel}</span>
                        </button>
                    )}
                    {actionLabel && (
                        <button 
                            id={actionLabel === "Select" ? `btn-select-patient-${p.id || p.Id || p.patientId || patientIndex}` : "btn-change-patient"}
                            data-patient-select-btn={actionLabel === "Select" ? "true" : undefined}
                            type="button"
                            onFocus={() => {
                                if (actionLabel === "Select" && onHighlight) {
                                    onHighlight(patientIndex);
                                }
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onAction) onAction();
                            }}
                            onKeyDown={(e) => {
                                if (actionLabel === "Select") {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (onAction) onAction();
                                    } else if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const allButtons = Array.from(document.querySelectorAll('[data-patient-select-btn="true"]'));
                                        const currentPos = allButtons.indexOf(e.currentTarget);
                                        if (currentPos !== -1 && currentPos < allButtons.length - 1) {
                                            allButtons[currentPos + 1].focus();
                                            if (onHighlight) onHighlight(currentPos + 1);
                                        } else {
                                            const newBtn = document.getElementById('btn-new-patient');
                                            if (newBtn) {
                                                newBtn.focus();
                                                if (onHighlight) onHighlight(-1);
                                            }
                                        }
                                    } else if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const allButtons = Array.from(document.querySelectorAll('[data-patient-select-btn="true"]'));
                                        const currentPos = allButtons.indexOf(e.currentTarget);
                                        if (currentPos > 0) {
                                            allButtons[currentPos - 1].focus();
                                            if (onHighlight) onHighlight(currentPos - 1);
                                        } else {
                                            const searchInput = document.getElementById('input-patient-search');
                                            if (searchInput) {
                                                searchInput.focus();
                                                if (onHighlight) onHighlight(0);
                                            }
                                        }
                                    }
                                } else {
                                    // Active Visit Identified Patient Card "Change" Button
                                    if (e.key === 'Tab' && !e.shiftKey) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const payerBtn = document.getElementById('btn-payer-mode-active') ||
                                                         document.querySelector('[data-payer-mode-btn="true"][data-selected="true"]') ||
                                                         document.querySelector('[data-payer-mode-btn="true"]');
                                        if (payerBtn) payerBtn.focus();
                                    } else if (e.key === 'Tab' && e.shiftKey) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const editBtn = document.getElementById('btn-edit-demographics');
                                        if (editBtn) editBtn.focus();
                                    }
                                }
                            }}
                            className={cn(
                                "text-[#0369A1] hover:text-[#0284C7] font-semibold underline underline-offset-4 decoration-blue-200 hover:decoration-blue-500 transition-all text-sm leading-none rounded px-1.5 py-0.5 cursor-pointer synos-focus-btn",
                                actionLabel === "Select" && "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 no-underline px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 font-bold hover:bg-blue-600 hover:text-white transition-all shadow-2xs"
                            )}
                        >
                            {actionLabel}
                        </button>
                    )}
                </div>

                {/* ROW 2: META + LABEL */}
                <div className="flex flex-wrap items-center gap-1.5 leading-none">
                    {/* Age */}
                    <span className={cn("px-2 py-0.5 rounded-md font-semibold text-xs", cardUi.badge)}>
                        Age: {detailedAge.text}
                    </span>
                    {/* Gender */}
                    <span className={cn("px-2 py-0.5 rounded-md font-bold text-xs", cardUi.badge)}>
                        {genderInitial}
                    </span>
                    {/* Mobile */}
                    <span className={cn("px-2 py-0.5 rounded-md font-mono text-xs font-semibold", cardUi.badge)}>
                        {mobile || "No Mobile"}
                    </span>
                </div>
                <div className="justify-self-end leading-none">
                    {lastVisitDate && (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-500">
                            LAST VISIT
                        </span>
                    )}
                </div>

                {/* ROW 3: MRN / HEALTH CARD + DATE */}
                <div className="flex items-center leading-none">
                    {hasHealthCard ? (
                        <div className="inline-flex items-center gap-1.5 flex-wrap">
                            <div className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold tracking-normal inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                                <CreditCard className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span>{healthCardNumber || `${mrn}-HC`}</span>
                            </div>
                            {healthCardPlanName && (
                                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200/80 dark:border-indigo-800/80">
                                    {healthCardPlanName}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className={cn("px-2 py-0.5 rounded-md text-xs font-mono tracking-normal inline-flex items-center gap-1.5", cardUi.mrn)}>
                            <span className="font-bold opacity-60 text-xs">MRN:</span>
                            <span className="font-bold">{mrn}</span>
                        </div>
                    )}
                </div>
                <div className="justify-self-end leading-none">
                    {lastVisitDate ? (
                        <span className="font-mono text-slate-800 dark:text-zinc-200 font-bold text-sm sm:text-base">
                            {new Date(lastVisitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </span>
                    ) : (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold uppercase tracking-wide">
                            New
                        </span>
                    )}
                </div>

                {/* ROW 4: TEST CODES (Only when NOT locked, e.g. in search results list) */}
                {!isLocked && lastVisitTestCodes && lastVisitTestCodes.length > 0 && (
                    <div className="col-span-3 flex flex-wrap gap-1.5 mt-1 pt-2 border-t border-slate-200/60 dark:border-zinc-800">
                        {lastVisitTestCodes.slice(0, 5).map((code, idx) => (
                            <span key={`${code}-${idx}`} className={cn(
                                "px-2.5 py-0.5 rounded-md border font-mono text-xs font-semibold uppercase tracking-normal",
                                isDark ? "bg-zinc-800 text-zinc-300 border-zinc-700/60" : "bg-slate-100 text-slate-700 border-slate-200/60"
                            )}>
                                {code || 'Test'}
                            </span>
                        ))}
                        {lastVisitTestCodes.length > 5 && (
                            <span className="px-1.5 py-[1px] font-mono text-xs text-zinc-400/80 self-center">
                                +{lastVisitTestCodes.length - 5}
                            </span>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};
