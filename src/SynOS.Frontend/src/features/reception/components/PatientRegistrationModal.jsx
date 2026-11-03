import { useState, useRef, useEffect } from 'react'
import { X, Loader2, UserPlus, Save, AlertCircle, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ReceptionApi } from '@/api/reception'
import { useTheme } from '@/context/ThemeContext'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { calculateDetailedAge } from '@/components/patient/RichPatientCard'

export function PatientRegistrationModal({ isOpen, onClose, onPatientRegistered }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        gender: 'Male', // Default
        email: ''
    });
    const [hasNoMobile, setHasNoMobile] = useState(false);
    const [noMobileReason, setNoMobileReason] = useState('Elderly / Senior');
    const [entryMode, setEntryMode] = useState("dob"); // "dob" or "age"
    const [dob, setDob] = useState("");
    const [age, setAge] = useState("");
    const [ageUnit, setAgeUnit] = useState("Years"); // "Years", "Months", "Days"
    
    const [fuzzyMatches, setFuzzyMatches] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const reasons = [
        'Elderly / Senior',
        'Emergency Walk-in',
        'Minor / Child',
        'Refused / No Phone'
    ];

    // FOCUS CANON: Trap
    const modalRef = useRef(null);
    useFocusTrap(modalRef, isOpen, onClose);

    // Fuzzy matching lookup
    useEffect(() => {
        if (!isOpen) return;
        const cleanName = (formData.name || '').trim();
        if (cleanName.length < 2) {
            setFuzzyMatches([]);
            return;
        }

        let calcAge = null;
        if (entryMode === "age" && age) {
            calcAge = parseInt(age, 10);
        } else if (entryMode === "dob" && dob) {
            const birthYear = new Date(dob).getFullYear();
            calcAge = new Date().getFullYear() - birthYear;
        }

        const timer = setTimeout(async () => {
            try {
                const results = await ReceptionApi.fuzzyMatchPatients({
                    name: cleanName,
                    gender: formData.gender,
                    age: calcAge && !isNaN(calcAge) ? calcAge : undefined,
                    dob: entryMode === "dob" && dob ? dob : undefined
                });
                setFuzzyMatches(results || []);
            } catch (err) {
                console.error("Fuzzy search error", err);
            }
        }, 350);

        return () => clearTimeout(timer);
    }, [formData.name, formData.gender, age, dob, entryMode, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Basic Validation
        const cleanName = (formData.name || '').trim();
        const cleanMobile = (formData.mobile || '').trim();

        if (!cleanName) {
            setError("Full Name is required.");
            return;
        }

        if (cleanName.length > 100) {
            setError("Name cannot exceed 100 characters.");
            return;
        }

        if (!hasNoMobile) {
            if (!cleanMobile) {
                setError("Mobile number is required, or check 'No Mobile Number'.");
                return;
            }

            // Phone validation: 10-15 digits
            const phoneRegex = /^[0-9]{10,15}$/;
            if (!phoneRegex.test(cleanMobile)) {
                setError("Mobile number must be a valid 10 to 15 digit number.");
                return;
            }
        }

        let finalDob = null;
        let isDateOfBirthKnown = true;
        let finalAge = null;

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        if (entryMode === "dob") {
            if (!dob) {
                setError("Date of Birth is required.");
                return;
            }
            if (dob > todayStr) {
                setError("Date of Birth cannot be in the future.");
                return;
            }
            const birthYear = new Date(dob).getFullYear();
            if (birthYear < today.getFullYear() - 130) {
                setError("Date of Birth cannot be older than 130 years.");
                return;
            }
            finalDob = dob;
            isDateOfBirthKnown = true;
            
            // simple year difference for fallback
            const diffYears = today.getFullYear() - birthYear;
            finalAge = diffYears >= 0 ? diffYears : 0;
        } else {
            if (!age || isNaN(parseInt(age, 10))) {
                setError("Age is required.");
                return;
            }
            const num = parseInt(age, 10);
            if (num < 0 || num > 130) {
                setError("Age must be between 0 and 130.");
                return;
            }
            isDateOfBirthKnown = false;
            const d = new Date();
            if (ageUnit === "Years") {
                d.setFullYear(d.getFullYear() - num);
                finalAge = num;
            } else if (ageUnit === "Months") {
                d.setMonth(d.getMonth() - num);
                finalAge = 0;
            } else if (ageUnit === "Days") {
                d.setDate(d.getDate() - num);
                finalAge = 0;
            }
            finalDob = d.toISOString().split('T')[0];
        }

        setIsSubmitting(true);
        try {
            const apiPayload = {
                ...formData,
                mobile: hasNoMobile ? '' : cleanMobile,
                hasNoMobile,
                noMobileReason: hasNoMobile ? noMobileReason : null,
                dob: finalDob,
                isDateOfBirthKnown,
                age: finalAge
            };
            const result = await ReceptionApi.registerPatient(apiPayload);

            // Result should contain { patientId: "...", mrn: "..." }
            if (result && result.patientId) {
                onPatientRegistered(result.patientId, { 
                    ...formData, 
                    currentPhoneNumber: hasNoMobile ? '' : cleanMobile,
                    dob: finalDob, 
                    isDateOfBirthKnown, 
                    age: finalAge,
                    mrn: result.mrn 
                });
                onClose(); // Close modal on success
                // Reset form
                setFormData({ name: '', mobile: '', gender: 'Male', email: '' });
                setHasNoMobile(false);
                setDob("");
                setAge("");
                setAgeUnit("Years");
                setEntryMode("dob");
            } else {
                throw new Error("Invalid response from server");
            }
        } catch (err) {
            console.error("Registration failed:", err);
            setError(err.message || "Failed to register patient");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 animate-in fade-in duration-200">
            <div ref={modalRef} className={cn(
                "relative w-full max-w-md border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200",
                isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
            )}>

                {/* Header */}
                <div className={cn("flex items-center justify-between px-6 py-4 border-b", isDark ? "border-zinc-800" : "border-zinc-100")}>
                    <div className={cn("flex items-center gap-2", isDark ? "text-zinc-100" : "text-zinc-900")}>
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <UserPlus className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">New Patient</h2>
                            <p className="text-xs text-zinc-500">Quick Registration</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={cn("p-2 rounded-full transition-colors", isDark ? "hover:bg-zinc-800 text-zinc-400 hover:text-white" : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900")}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Name */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-zinc-500">Full Name *</label>
                            <input
                                type="text"
                                maxLength={100}
                                className={cn(
                                    "w-full rounded-md px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-zinc-400",
                                    isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900 shadow-sm"
                                )}
                                placeholder="e.g. Rahul Sharma"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                autoFocus
                            />
                        </div>

                        {/* Mobile & Entry Method Row */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-zinc-500">
                                        Mobile Number {!hasNoMobile && "*"}
                                    </label>
                                    <input
                                        type="tel"
                                        maxLength={15}
                                        disabled={hasNoMobile}
                                        className={cn(
                                            "w-full rounded-md px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-zinc-400",
                                            isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900 shadow-sm",
                                            hasNoMobile && "opacity-60 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                        )}
                                        placeholder={hasNoMobile ? "No Mobile (Physical Pickup)" : "9876543210"}
                                        value={hasNoMobile ? "" : formData.mobile}
                                        onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-zinc-500">Entry Method *</label>
                                    <div className={cn(
                                        "flex p-0.5 rounded-lg border",
                                        isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-100 border-zinc-200"
                                    )}>
                                        {[
                                            { key: "dob", label: "DOB" },
                                            { key: "age", label: "Age" }
                                        ].map(mode => (
                                            <button
                                                key={mode.key}
                                                type="button"
                                                onClick={() => setEntryMode(mode.key)}
                                                className={cn(
                                                    "flex-1 text-xs py-1 rounded-md transition-all duration-250 cursor-pointer",
                                                    entryMode === mode.key
                                                        ? (isDark ? "bg-zinc-850 text-white font-semibold" : "bg-white text-zinc-900 font-bold shadow-sm")
                                                        : "text-zinc-500 hover:text-zinc-900 font-medium"
                                                )}
                                            >
                                                {mode.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* No Mobile Checkbox & Reason */}
                            <div className="pt-0.5">
                                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={hasNoMobile}
                                        onChange={e => setHasNoMobile(e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-300 text-synos-primary focus:ring-synos-primary accent-synos-primary cursor-pointer"
                                    />
                                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                                        No Mobile Number (Physical Hardcopy Pickup Only)
                                    </span>
                                </label>

                                {hasNoMobile && (
                                    <div className="mt-2.5 p-3 rounded-xl bg-slate-100/80 dark:bg-zinc-800/50 border border-slate-200/90 dark:border-zinc-700/80 space-y-2.5 animate-in fade-in duration-150">
                                        <div className="flex items-start gap-2">
                                            <div className="w-5 h-5 rounded-md bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                            </div>
                                            <p className="text-xs font-medium text-slate-700 dark:text-zinc-300 leading-snug">
                                                Reports will <strong className="text-slate-900 dark:text-white font-semibold">NOT</strong> be dispatched via WhatsApp. Physical hardcopy report pickup at front desk only.
                                            </p>
                                        </div>
                                        <div className="flex items-center flex-wrap gap-1.5 pt-1.5 border-t border-slate-200/70 dark:border-zinc-700/60">
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-zinc-400 mr-1">Reason:</span>
                                            {reasons.map(r => (
                                                <button
                                                    key={r}
                                                    type="button"
                                                    onClick={() => setNoMobileReason(r)}
                                                    className={cn(
                                                        "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                                                        noMobileReason === r
                                                            ? "bg-synos-primary text-white shadow-xs font-bold"
                                                            : "bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-750"
                                                    )}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* DOB or Age entry */}
                        {entryMode === "dob" ? (
                            <div className="grid grid-cols-2 gap-4 items-end animate-in fade-in duration-200">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-zinc-500">Date of Birth *</label>
                                    <input
                                        type="date"
                                        className={cn(
                                            "w-full rounded-md px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-zinc-400",
                                            isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900 shadow-sm"
                                        )}
                                        value={dob}
                                        max={new Date().toISOString().split('T')[0]}
                                        onChange={e => setDob(e.target.value)}
                                    />
                                </div>
                                <div className="h-9 flex items-center pl-1 text-[11px] text-zinc-500 font-medium leading-tight">
                                    {dob ? (
                                        <span>
                                            Calculated Age: <strong className="text-emerald-600">{calculateDetailedAge(dob).text}</strong>
                                        </span>
                                    ) : (
                                        <span className="italic text-zinc-400">Enter DOB</span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-zinc-500">Age *</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className={cn(
                                            "w-full rounded-md px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-zinc-400",
                                            isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900 shadow-sm"
                                        )}
                                        placeholder="Age"
                                        value={age}
                                        onChange={e => setAge(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-zinc-500">Age Unit *</label>
                                    <select
                                        className={cn(
                                            "w-full rounded-md px-3 py-2 text-sm focus:border-emerald-500 outline-none transition-all",
                                            isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900 shadow-sm"
                                        )}
                                        value={ageUnit}
                                        onChange={e => setAgeUnit(e.target.value)}
                                    >
                                        <option value="Years">Years</option>
                                        <option value="Months">Months</option>
                                        <option value="Days">Days</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Gender & Email Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-500">Gender *</label>
                                <select
                                    className={cn(
                                        "w-full rounded-md px-3 py-2 text-sm focus:border-emerald-500 outline-none transition-all",
                                        isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900 shadow-sm"
                                    )}
                                    value={formData.gender}
                                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-500">Email (Optional)</label>
                                <input
                                    type="email"
                                    className={cn(
                                        "w-full rounded-md px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-zinc-400",
                                        isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900 shadow-sm"
                                    )}
                                    placeholder="rahul@example.com"
                                    value={formData.email || ""}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Instant Fuzzy Match Banner */}
                    {fuzzyMatches.length > 0 && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-bold">
                                <span className="flex items-center gap-1.5">
                                    <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                                    Found {fuzzyMatches.length} Matching Patient{fuzzyMatches.length > 1 ? 's' : ''} in System
                                </span>
                                <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">
                                    1-Click Select
                                </span>
                            </div>
                            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                {fuzzyMatches.map(m => (
                                    <div
                                        key={m.mrn || m.patientId}
                                        className="flex items-center justify-between p-2 rounded-lg bg-white/90 dark:bg-zinc-800/90 border border-amber-200/60 dark:border-zinc-700"
                                    >
                                        <div className="min-w-0 pr-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-zinc-900 dark:text-white truncate">{m.name}</span>
                                                <span className="text-[11px] text-zinc-500">({m.age} Yrs, {m.gender})</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-zinc-500">
                                                <span className="font-mono font-bold bg-slate-100 dark:bg-zinc-700 px-1.5 py-0.2 rounded">MRN: {m.mrn}</span>
                                                {m.lastVisitDate && (
                                                    <span>• Last: {new Date(m.lastVisitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onPatientRegistered(m.patientId, { ...m, id: m.patientId });
                                                onClose();
                                            }}
                                            className="px-2.5 py-1 rounded-md bg-synos-primary hover:bg-synos-primary/90 text-white text-xs font-bold transition-all shrink-0 cursor-pointer"
                                        >
                                            Use Patient
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Register Patient
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
