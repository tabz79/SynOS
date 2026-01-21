import { useState } from 'react'
import { X, Loader2, UserPlus, Save } from 'lucide-react'
import { ReceptionApi } from '@/api/reception'
import { cn } from '@/lib/utils'

export function PatientRegistrationModal({ isOpen, onClose, onPatientRegistered }) {
    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        age: '',
        gender: 'Male', // Default
        email: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-zinc-950 border border-synos-border rounded-xl shadow-2xl animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                    <div className="flex items-center gap-2 text-zinc-100">
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
                        className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Name */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-zinc-400">Full Name *</label>
                            <input
                                type="text"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-zinc-600"
                                placeholder="e.g. Rahul Sharma"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                autoFocus
                            />
                        </div>

                        {/* Mobile & Age Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-400">Mobile Number *</label>
                                <input
                                    type="tel"
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-zinc-600"
                                    placeholder="9876543210"
                                    value={formData.mobile}
                                    onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-400">Age *</label>
                                <input
                                    type="number"
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-zinc-600"
                                    placeholder="25"
                                    value={formData.age}
                                    onChange={e => setFormData({ ...formData, age: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Gender & Email Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-400">Gender *</label>
                                <select
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                                    value={formData.gender}
                                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-400">Email (Optional)</label>
                                <input
                                    type="email"
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-zinc-600"
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
