import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, Building2, CreditCard, Calendar } from 'lucide-react';
import { FinanceApi } from '@/api/finance';

const { WorkforceApi } = FinanceApi;

export function AddStaffModal({ isOpen, onClose, onStaffAdded, editStaff = null }) {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        jobTitle: '',
        department: '',
        employmentType: 0, // FullTime
        salaryType: 0, // Fixed
        baseSalary: 0,
        bankName: '',
        accountNumber: '',
        ifsc: '',
        phone: '',
        isActive: true,
        joinDate: new Date().toISOString().split('T')[0]
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (editStaff && isOpen) {
            setFormData({
                firstName: editStaff.firstName || '',
                lastName: editStaff.lastName || '',
                jobTitle: editStaff.jobTitle || '',
                department: editStaff.department || '',
                employmentType: editStaff.employmentType ?? 0,
                salaryType: editStaff.salaryType ?? 0,
                baseSalary: editStaff.baseSalary?.toString() || '0',
                bankName: editStaff.bankName || '',
                accountNumber: editStaff.accountNumber || '',
                ifsc: editStaff.ifsc || '',
                phone: editStaff.phone || '',
                isActive: editStaff.isActive ?? true,
                joinDate: editStaff.joinDate ? new Date(editStaff.joinDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
            });
        } else if (!editStaff && isOpen) {
            setFormData({
                firstName: '',
                lastName: '',
                jobTitle: '',
                department: '',
                employmentType: 0,
                salaryType: 0,
                baseSalary: 0,
                bankName: '',
                accountNumber: '',
                ifsc: '',
                phone: '',
                isActive: true,
                joinDate: new Date().toISOString().split('T')[0]
            });
        }
    }, [editStaff, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Robust payload construction:
            // 1. Start with the original object to preserve "hidden" fields (e.g., Quota, Metadata)
            // 2. Overwrite with current form data
            // 3. Normalize types
            const payload = {
                ...(editStaff || {}),
                ...formData,
                employmentType: Number(formData.employmentType) || 0,
                salaryType: Number(formData.salaryType) || 0,
                baseSalary: Number(formData.baseSalary) || 0,
                joinDate: formData.joinDate ? new Date(formData.joinDate).toISOString() : new Date().toISOString()
            };

            // 4. CRITICAL: Remove navigation properties that cause 400 Bad Request
            delete payload.user;

            console.log("Submitting Staff Payload:", payload);

            if (editStaff) {
                await WorkforceApi.updateStaff(editStaff.employeeId, payload);
            } else {
                await WorkforceApi.createStaff(payload);
            }
            
            onStaffAdded();
            onClose();
        } catch (error) {
            console.error("Failed to process staff record:", error);
            alert("Error processing staff member. Please check logs.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b dark:border-zinc-900 border-zinc-100 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-synos-primary/10 rounded-xl">
                            <UserPlus className="w-5 h-5 text-synos-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold dark:text-white">
                                {editStaff ? 'Edit Staff Profile' : 'Register New Staff'}
                            </h2>
                            <p className="text-xs text-zinc-500">
                                {editStaff ? `Modifying record for ${editStaff.firstName}` : 'Initialize HR and compensation record.'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">First Name</label>
                            <input 
                                required
                                value={formData.firstName}
                                onChange={e => setFormData({...formData, firstName: e.target.value})}
                                className="w-full bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-synos-primary/50 transition-all"
                                placeholder="Enter first name"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Last Name</label>
                            <input 
                                required
                                value={formData.lastName}
                                onChange={e => setFormData({...formData, lastName: e.target.value})}
                                className="w-full bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-synos-primary/50 transition-all"
                                placeholder="Enter last name"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Job Title</label>
                            <input 
                                required
                                value={formData.jobTitle}
                                onChange={e => setFormData({...formData, jobTitle: e.target.value})}
                                className="w-full bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-synos-primary/50 transition-all"
                                placeholder="e.g. Senior Technician"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Department</label>
                            <select 
                                value={formData.department}
                                onChange={e => setFormData({...formData, department: e.target.value})}
                                className="w-full bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-synos-primary/50 transition-all"
                            >
                                <option value="">Select Department</option>
                                <option value="Pathology">Pathology</option>
                                <option value="Biochemistry">Biochemistry</option>
                                <option value="Hematology">Hematology</option>
                                <option value="Collection">Collection</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Employment Type</label>
                            <select 
                                value={formData.employmentType}
                                onChange={e => setFormData({...formData, employmentType: parseInt(e.target.value)})}
                                className="w-full bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-synos-primary/50 transition-all"
                            >
                                <option value={0}>Full Time</option>
                                <option value={1}>Part Time</option>
                                <option value={2}>Contractor</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Phone Number</label>
                            <input 
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                className="w-full bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-synos-primary/50 transition-all"
                                placeholder="Contact number"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Salary Type</label>
                            <select 
                                value={formData.salaryType}
                                onChange={e => setFormData({...formData, salaryType: parseInt(e.target.value)})}
                                className="w-full bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-synos-primary/50 transition-all"
                            >
                                <option value={0}>Fixed Monthly</option>
                                <option value={1}>Hourly Rate</option>
                                <option value={2}>Visit Based</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Base Salary / Rate (₹)</label>
                            <input 
                                type="number"
                                required
                                value={formData.baseSalary}
                                onChange={e => setFormData({...formData, baseSalary: e.target.value})}
                                className="w-full bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-synos-primary/50 transition-all"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border dark:border-zinc-800 border-zinc-200 space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5" /> Banking Details
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <input 
                                value={formData.bankName}
                                onChange={e => setFormData({...formData, bankName: e.target.value})}
                                className="w-full bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-100 rounded-xl px-4 py-2 text-xs outline-none"
                                placeholder="Bank Name"
                            />
                            <input 
                                value={formData.accountNumber}
                                onChange={e => setFormData({...formData, accountNumber: e.target.value})}
                                className="w-full bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-100 rounded-xl px-4 py-2 text-xs outline-none"
                                placeholder="Account Number"
                            />
                            <input 
                                value={formData.ifsc}
                                onChange={e => setFormData({...formData, ifsc: e.target.value})}
                                className="w-full bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-100 rounded-xl px-4 py-2 text-xs outline-none"
                                placeholder="IFSC Code"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t dark:border-zinc-900 border-zinc-100">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl border dark:border-zinc-800 border-zinc-200 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="px-8 py-2.5 bg-synos-primary text-white rounded-xl text-sm font-bold shadow-xl shadow-synos-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? (editStaff ? 'Updating...' : 'Registering...') : (
                                <>
                                    <Save className="w-4 h-4" />
                                    {editStaff ? 'Update Profile' : 'Register Employee'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
