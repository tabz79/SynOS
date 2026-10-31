import React, { useState } from 'react';
import { ReceptionApi } from '@/api/reception';
import { cn } from '@/lib/utils'; // Assuming this utility exists, else standard classes

const ReferralDraftForm = ({ visitId, onSuccess, onCancel, isDark, uiStyles }) => {
    const [providerName, setProviderName] = useState('');
    const [clinicName, setClinicName] = useState('');
    const [location, setLocation] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!providerName.trim()) {
            setError('Doctor/Provider Name is required.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // OPX-GPT-5: Save to Unified Registry as DRAFT
            const partner = await ReceptionApi.createDraftPartner({
                name: providerName,
                clinicName: clinicName,
                location: location,
                partnerType: 'Doctor' // Default for draft onboarding
            });

            // Link to the current visit
            if (visitId) {
                await ReceptionApi.applyReferralToVisit(visitId, partner.referralPartnerId);
            }

            if (onSuccess) onSuccess(partner);
        } catch (err) {
            setError(err.message || 'Failed to save draft.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className={cn("p-4 animate-in fade-in zoom-in-95 duration-200 border rounded-xl", uiStyles.section)}>
            <h4 className={cn("mb-3", uiStyles.sectionTitle)}>
                Referral Draft (Provisional)
            </h4>

            {error && (
                <div className={cn("text-xs mb-3 font-medium p-2 rounded border", 
                    isDark ? "text-red-400 bg-red-900/20 border-red-500/30" : "text-red-600 bg-red-50 border-red-200")}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                        Doctor / Provider Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={providerName}
                        onChange={(e) => setProviderName(e.target.value)}
                        className={cn("w-full h-10 rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors disabled:opacity-50", uiStyles.input)}
                        placeholder="e.g. Dr. Rajesh Kumar"
                        disabled={isSubmitting}
                        autoFocus
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                            Clinic / Hospital
                        </label>
                        <input
                            type="text"
                            value={clinicName}
                            onChange={(e) => setClinicName(e.target.value)}
                            className={cn("w-full h-10 rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors disabled:opacity-50", uiStyles.input)}
                            placeholder="e.g. Sunshine Clinic"
                            disabled={isSubmitting}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                            Location / Area
                        </label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className={cn("w-full h-10 rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors disabled:opacity-50", uiStyles.input)}
                            placeholder="e.g. Indiranagar"
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className={cn("px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50",
                            isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900")}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !providerName.trim()}
                        className={cn("px-4 py-2 text-xs font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
                            isDark 
                                ? "text-white bg-zinc-800 border border-zinc-700 hover:bg-zinc-700" 
                                : "text-white bg-zinc-900 border border-black/10 hover:bg-black")}
                    >
                        {isSubmitting ? 'Saving...' : 'Save Draft'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ReferralDraftForm;
