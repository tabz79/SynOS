import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'

export const RichPatientCard = ({ patient, onAction, actionLabel, isLocked }) => {
    // Robust extraction
    const p = patient;
    let name = p.name || p.Name || p.fullName || p.FullName || p.displayName || p.DisplayName || `${p.firstName || p.FirstName || ''} ${p.lastName || p.LastName || ''}`.trim();
    const mobile = p.mobile || p.Mobile || p.phoneNumber || p.PhoneNumber || p.phone || p.Phone || p.currentPhoneNumber || p.CurrentPhoneNumber;
    const mrn = p.mrn || p.MRN || "—";
    const age = p.age || p.Age;

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

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const cardUi = isDark ? {
        locked: "bg-synos-primary/10 border border-synos-primary/30 cursor-default",
        inactive: "bg-zinc-800/50 hover:bg-zinc-800 border border-synos-border hover:border-synos-primary/50 cursor-pointer",
        name: isLocked ? "text-white" : "text-zinc-200 group-hover:text-white",
        badge: isLocked ? "bg-synos-primary/20 border-synos-primary/30 text-synos-primary" : "bg-zinc-700 text-zinc-300",
        mrn: "bg-zinc-900 border-zinc-800 text-zinc-600"
    } : {
        // LIGHT MODE: INDIVIDUAL RECESSED CARDS
        // Both Locked and Inactive are now full pockets.
        locked: "bg-black/[0.04] border border-black/5 shadow-inner rounded-lg cursor-default p-3",
        // Inactive = Same Pocket Style, but Interactive
        inactive: "bg-black/[0.04] border border-black/5 shadow-inner rounded-lg cursor-pointer hover:bg-black/[0.06] transition-all p-3",
        name: isLocked ? "type-value text-black font-semibold" : "type-value group-hover:text-black font-medium",
        badge: isLocked ? "bg-white border-zinc-200 text-black shadow-sm" : "bg-white/50 border-zinc-200/50 text-zinc-600",
        mrn: "bg-white/50 border-zinc-200/50 text-black font-medium"
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
                    "row-span-3 self-center w-12 h-12 rounded-full flex items-center justify-center shrink-0 type-value font-bold text-lg",
                    isLocked
                        ? "bg-synos-primary text-white shadow-sm"
                        : "bg-[#8FB8E8] text-[#1E40AF]"
                )}>
                    {genderInitial}
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
                <div className="justify-self-end self-start">
                    {actionLabel && (
                        <button className="text-[#0369A1] hover:text-[#0284C7] font-medium underline underline-offset-4 decoration-blue-200 hover:decoration-blue-500 transition-all text-sm leading-none">
                            {actionLabel}
                        </button>
                    )}
                </div>

                {/* ROW 2: META + LABEL */}
                <div className="flex items-center gap-2 type-code opacity-80 leading-none">
                    {/* Age */}
                    <span className="px-2 py-0.5 rounded-full bg-white/60 border border-zinc-200 text-zinc-700 font-medium text-xs">
                        {age ? `${age}Y` : '-'}
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
                        {lastVisitTestCodes.slice(0, 5).map(code => (
                            <span key={code} className={cn(
                                "px-1.5 py-[1px] rounded border type-code text-[10px] font-medium uppercase tracking-wide",
                                isLocked
                                    ? "bg-black/40 text-synos-primary/80 border-synos-primary/20"
                                    : (isDark ? "bg-zinc-700/50 text-zinc-400 border-white/5" : "bg-zinc-200/50 text-zinc-900 border-zinc-300/50 shadow-sm")
                            )}>
                                {code}
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
