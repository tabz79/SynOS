import React, { useState } from 'react';
import { ReceptionApi } from '@/api/reception';
import { cn } from '@/lib/utils'; // Assuming this utility exists, else standard classes

const ReferralDraftForm = ({ visitId, onSuccess, onCancel }) => {
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
            await ReceptionApi.addReferralDraft(visitId, providerName, clinicName, location);
            if (onSuccess) onSuccess();
        } catch (err) {
            setError(err.message || 'Failed to save draft.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-zinc-950/30 border border-synos-border rounded-lg p-4 mb-4 animate-in fade-in zoom-in-95 duration-200">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                Referral Draft (Provisional)
            </h4>

            {error && (
                <div className="text-red-400 text-xs mb-3 font-medium bg-red-900/20 border border-red-500/30 p-2 rounded">
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
                        className="w-full bg-zinc-900 border border-synos-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-synos-primary transition-colors placeholder:text-zinc-600 disabled:opacity-50"
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
                            className="w-full bg-zinc-900 border border-synos-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-synos-primary transition-colors placeholder:text-zinc-600 disabled:opacity-50"
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
                            className="w-full bg-zinc-900 border border-synos-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-synos-primary transition-colors placeholder:text-zinc-600 disabled:opacity-50"
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
                        className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !providerName.trim()}
                        className="px-4 py-2 text-xs font-bold text-white bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSubmitting ? 'Saving...' : 'Save Draft'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ReferralDraftForm;
