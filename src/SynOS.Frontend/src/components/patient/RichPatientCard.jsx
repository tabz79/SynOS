import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'
import { User } from 'lucide-react'

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

export const RichPatientCard = ({ patient, onAction, actionLabel, secondaryActionLabel, onSecondaryAction, isLocked }) => {
    // Robust extraction
    const p = patient;
    let name = p.name || p.Name || p.fullName || p.FullName || p.displayName || p.DisplayName || `${p.firstName || p.FirstName || ''} ${p.lastName || p.LastName || ''}`.trim();
    const mobile = p.mobile || p.Mobile || p.phoneNumber || p.PhoneNumber || p.phone || p.Phone || p.currentPhoneNumber || p.CurrentPhoneNumber;
    const mrn = p.mrn || p.MRN || "—";
    
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
        locked: "bg-zinc-900 border border-zinc-700/80 shadow-[0_4px_16px_rgba(0,0,0,0.4)] rounded-xl cursor-default p-3.5",
        inactive: "bg-zinc-900/90 border border-zinc-700/80 shadow-[0_4px_16px_rgba(0,0,0,0.4)] rounded-xl cursor-pointer hover:border-zinc-500 hover:bg-zinc-850 transition-all p-3.5",
        name: isLocked ? "text-white" : "text-zinc-200 group-hover:text-white",
        badge: isLocked ? "bg-synos-primary/20 border-synos-primary/40 text-synos-primary" : "bg-zinc-800 text-zinc-300 border-zinc-700",
        mrn: "bg-zinc-950 border-zinc-800 text-zinc-400"
    } : {
        // LIGHT MODE: Crisp elevated card with solid white surface & shadow depth
        locked: "bg-white border border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] rounded-xl cursor-default p-3.5",
        inactive: "bg-white border border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] rounded-xl cursor-pointer hover:border-slate-400 hover:shadow-md transition-all p-3.5",
        name: isLocked ? "type-value text-zinc-900 font-bold" : "type-value group-hover:text-black font-semibold",
        badge: isLocked ? "bg-slate-100 border-slate-300 text-zinc-800 shadow-2xs font-semibold" : "bg-slate-50 border-slate-200 text-zinc-600",
        mrn: "bg-slate-50 border-slate-300 text-zinc-900 font-bold"
    };

    return (
        <div
            onClick={onAction}
            className={cn(
                "p-3 rounded-lg flex flex-col gap-3 transition-all group",
                isLocked ? cardUi.locked : cardUi.inactive
            )}
        >
            {/* NEW LAYOUT: STRICT GRID */}
            <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-1 items-center">

                {/* COL 1: AVATAR (Row Span 3) */}
                <div className={cn(
                    "row-span-3 self-center w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                    isLocked
                        ? (isDark ? "bg-synos-primary/20 text-synos-primary border border-synos-primary/30" : "bg-sky-100 text-sky-600 border border-sky-200")
                        : (isDark ? "bg-zinc-800 text-zinc-300 border border-zinc-700" : "bg-slate-100 text-slate-600 border border-slate-200")
                )}>
                    <User className="w-6 h-6" />
                </div>

                {/* ROW 1: NAME + SELECT */}
                <div className="flex items-center pt-0.5">
                    <div className={cn(
                        "truncate type-value text-base font-semibold leading-none",
                        cardUi.name
                    )}>
                        {name}
                    </div>
                </div>
                <div className="justify-self-end self-start flex items-center gap-2">
                    {secondaryActionLabel && (
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onSecondaryAction) onSecondaryAction();
                            }}
                            className="text-[#0369A1] hover:text-[#0284C7] font-medium underline underline-offset-4 decoration-blue-200 hover:decoration-blue-500 transition-all text-sm leading-none focus:outline-none focus:ring-2 focus:ring-synos-primary focus:ring-offset-1 rounded px-1.5 py-0.5 cursor-pointer"
                        >
                            {secondaryActionLabel}
                        </button>
                    )}
                    {actionLabel && (
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onAction) onAction();
                            }}
                            className="text-[#0369A1] hover:text-[#0284C7] font-medium underline underline-offset-4 decoration-blue-200 hover:decoration-blue-500 transition-all text-sm leading-none focus:outline-none focus:ring-2 focus:ring-synos-primary focus:ring-offset-1 rounded px-1.5 py-0.5 cursor-pointer"
                        >
                            {actionLabel}
                        </button>
                    )}
                </div>

                {/* ROW 2: META + LABEL */}
                <div className="flex flex-wrap items-center gap-2 type-code opacity-80 leading-none">
                    {/* Age */}
                    <span className="px-2 py-0.5 rounded-full bg-white/60 border border-zinc-200 text-zinc-700 font-medium text-xs">
                        Age: {detailedAge.text}
                    </span>
                    {/* Gender */}
                    <span className="w-6 h-6 rounded-full bg-white/60 border border-zinc-200 text-zinc-700 flex items-center justify-center font-medium text-xs">
                        {genderInitial}
                    </span>
                    {/* Mobile */}
                    <span className="text-zinc-900 font-mono tracking-wide ml-1 text-sm">
                        {mobile}
                    </span>
                </div>
                <div className="justify-self-end leading-none">
                    {lastVisitDate && (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                            LAST VISIT
                        </span>
                    )}
                </div>

                {/* ROW 3: MRN + DATE */}
                <div className="flex items-center leading-none">
                    <div className="px-2 py-0.5 rounded bg-white/40 border border-zinc-200/50 text-zinc-900 font-mono text-sm tracking-wider inline-flex items-center">
                        <span className="font-bold opacity-60 mr-2 text-[10px]">MRN:</span>
                        {mrn}
                    </div>
                </div>
                <div className="justify-self-end leading-none">
                    {lastVisitDate ? (
                        <span className="font-mono text-zinc-900 font-medium text-sm">
                            {new Date(lastVisitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </span>
                    ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase tracking-wide">
                            New
                        </span>
                    )}
                </div>

                {/* ROW 4: TEST CODES (Full Width, Compact) */}
                {lastVisitTestCodes && lastVisitTestCodes.length > 0 && (
                    <div className="col-span-3 flex flex-wrap gap-1 mt-0.5 pt-1.5 border-t border-black/5">
                        {lastVisitTestCodes.slice(0, 5).map((code, idx) => (
                            <span key={`${code}-${idx}`} className={cn(
                                "px-1.5 py-[1px] rounded border type-code text-[10px] font-medium uppercase tracking-wide",
                                isLocked
                                    ? "bg-black/40 text-synos-primary/80 border-synos-primary/20"
                                    : (isDark ? "bg-zinc-700/50 text-zinc-400 border-white/5" : "bg-zinc-200/50 text-zinc-900 border-zinc-300/50 shadow-sm")
                            )}>
                                {code || 'Test'}
                            </span>
                        ))}
                        {lastVisitTestCodes.length > 5 && (
                            <span className="px-1.5 py-[1px] type-code text-[10px] text-zinc-400/80 self-center">
                                +{lastVisitTestCodes.length - 5}
                            </span>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};
