
import React from 'react';
import { cn } from "@/lib/utils";
import { AlertTriangle, Save, Trash2, X } from 'lucide-react';

export function UnsavedChangesGuard({ isOpen, onSave, onDiscard, onCancel }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md dark:bg-zinc-900 bg-white rounded-2xl shadow-2xl border dark:border-white/10 border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold dark:text-white text-zinc-900">Unsaved Changes</h3>
                            <p className="text-sm dark:text-zinc-400 text-zinc-600">
                                You have entered results that haven't been saved yet. What would you like to do?
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <button
                            onClick={onSave}
                            className="w-full flex items-center justify-between p-4 rounded-xl dark:bg-cyan-500/10 bg-cyan-50 border-2 dark:border-cyan-500/50 border-cyan-500/20 hover:dark:bg-cyan-500/20 hover:bg-cyan-100 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <Save className="w-5 h-5 text-cyan-500" />
                                <div className="text-left">
                                    <div className="font-bold text-cyan-500">Save Draft</div>
                                    <div className="text-[10px] uppercase font-bold text-cyan-400 group-hover:text-cyan-500 transition-colors">Recommended</div>
                                </div>
                            </div>
                            <span className="text-xs font-mono opacity-50">CTRL + S</span>
                        </button>

                        <button
                            onClick={onDiscard}
                            className="w-full flex items-center gap-3 p-4 rounded-xl dark:bg-white/5 bg-zinc-50 border dark:border-white/5 border-zinc-200 dark:text-zinc-300 text-zinc-700 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all font-bold"
                        >
                            <Trash2 className="w-5 h-5" />
                            Discard Changes
                        </button>
                    </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-950/50 p-4 flex justify-end px-6">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-700 transition-colors flex items-center gap-2"
                    >
                        <X className="w-4 h-4" />
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
