import { useTheme } from '@/context/ThemeContext' // Added
import { useFocusTrap } from '@/hooks/useFocusTrap'

export function PatientRegistrationModal({ isOpen, onClose, onPatientRegistered }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        age: '',
        gender: 'Male', // Default
        email: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // FOCUS CANON: Trap
    const modalRef = useRef(null);
    useFocusTrap(modalRef, isOpen, onClose);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Basic Validation
        if (!formData.name || !formData.mobile || !formData.age) {
            setError("Name, Mobile, and Age are required.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Call API
            const result = await ReceptionApi.registerPatient(formData);

            // Result should contain { patientId: "..." }
            if (result && result.patientId) {
                onPatientRegistered(result.patientId, formData);
                onClose(); // Close modal on success
                // Reset form
                setFormData({ name: '', mobile: '', age: '', gender: 'Male', email: '' });
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

                        {/* Mobile & Age Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-500">Mobile Number *</label>
                                <input
                                    type="tel"
                                    className={cn(
                                        "w-full rounded-md px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-zinc-400",
                                        isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900 shadow-sm"
                                    )}
                                    placeholder="9876543210"
                                    value={formData.mobile}
                                    onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-500">Age *</label>
                                <input
                                    type="number"
                                    className={cn(
                                        "w-full rounded-md px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-zinc-400",
                                        isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900 shadow-sm"
                                    )}
                                    placeholder="25"
                                    value={formData.age}
                                    onChange={e => setFormData({ ...formData, age: e.target.value })}
                                />
                            </div>
                        </div>

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
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
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
