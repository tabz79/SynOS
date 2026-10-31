import React, { useState, useEffect } from 'react';
import { MacrosApi } from '@/api/macros';
import { cn } from "@/lib/utils";
import { 
    Search, 
    Plus, 
    X, 
    Edit2, 
    Trash2, 
    Sparkles, 
    PlusCircle,
    ChevronLeft,
    Keyboard,
    Pin
} from 'lucide-react';

export function MedicalMacrosWorkspace({ onClose }) {
    const [personalSnippets, setPersonalSnippets] = useState([]);
    const [systemSnippets, setSystemSnippets] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All'); // 'All' | 'Personal' | 'System'
    const [editingSnippet, setEditingSnippet] = useState(null); // snippet object or 'new'
    
    // Form fields state
    const [formTrigger, setFormTrigger] = useState('');
    const [formLabel, setFormLabel] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formText, setFormText] = useState('');
    const [formIsSystem, setFormIsSystem] = useState(false);

    useEffect(() => {
        loadSnippets();
    }, []);

    const loadSnippets = async () => {
        try {
            const data = await MacrosApi.getMacros();
            const personal = data.filter(m => m.scope?.toUpperCase() === 'PERSONAL' || !m.isSystem);
            const system = data.filter(m => m.scope?.toUpperCase() === 'SYSTEM' || m.isSystem);
            setPersonalSnippets(personal);
            setSystemSnippets(system);
        } catch (err) {
            console.error("Failed to load macros:", err);
            setPersonalSnippets([]);
            setSystemSnippets([]);
        }
    };

    const handleSave = async () => {
        if (!formTrigger.startsWith('/')) {
            alert('Macro triggers must start with a slash (e.g. /my-macro)');
            return;
        }
        if (!formTrigger.trim() || !formLabel.trim() || !formText.trim()) {
            alert('Please fill out trigger shortcut, label, and expansion text.');
            return;
        }

        try {
            const payload = {
                shortcut: formTrigger.trim(),
                label: formLabel.trim(),
                description: formDesc.trim(),
                text: formText.trim(),
                scope: formIsSystem ? 'SYSTEM' : 'PERSONAL'
            };

            if (editingSnippet === 'new') {
                await MacrosApi.createMacro(payload);
            } else {
                await MacrosApi.updateMacro(editingSnippet.macroId, payload);
            }

            window.dispatchEvent(new Event('synos_snippets_updated')); // Instant broadcast sync
            await loadSnippets();
            setEditingSnippet(null);
        } catch (err) {
            alert('Failed to save macro: ' + err.message);
        }
    };

    const handleDelete = async (macroId, shortcut) => {
        if (!window.confirm(`Delete the macro ${shortcut}?`)) return;

        try {
            await MacrosApi.deleteMacro(macroId);
            window.dispatchEvent(new Event('synos_snippets_updated')); // Instant broadcast sync
            await loadSnippets();
        } catch (err) {
            alert('Failed to delete: ' + err.message);
        }
    };

    const handleEditStart = (snippet) => {
        setEditingSnippet(snippet);
        setFormTrigger(snippet.shortcut);
        setFormLabel(snippet.label);
        setFormDesc(snippet.description || '');
        setFormText(snippet.text);
        setFormIsSystem(!!snippet.isSystem);
    };

    const handleCreateStart = () => {
        setEditingSnippet('new');
        setFormTrigger('/');
        setFormLabel('');
        setFormDesc('');
        setFormText('');
        setFormIsSystem(false);
    };

    const injectVariable = (variable) => {
        setFormText(prev => prev + ` {{${variable}}}`);
    };

    const filteredSnippets = [
        ...(activeTab === 'System' ? [] : personalSnippets),
        ...(activeTab === 'Personal' ? [] : systemSnippets)
    ].filter(s => {
        const matchesSearch = s.shortcut.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             s.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             s.text.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    return (
        <div className="flex flex-col h-full min-h-0 bg-transparent select-none animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b dark:border-white/5 border-zinc-200 shrink-0">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={onClose}
                        className="p-1 hover:bg-zinc-500/10 rounded-lg text-zinc-500 transition-all active:scale-95 border dark:border-white/5 border-zinc-200"
                        title="Back to queue"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <h2 className="text-lg font-bold flex items-center gap-1.5 dark:text-zinc-200">
                        <Keyboard className="w-5 h-5 text-indigo-500" />
                        Medical Macros
                    </h2>
                </div>
                <button
                    onClick={handleCreateStart}
                    disabled={editingSnippet !== null}
                    className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white rounded-lg transition-all active:scale-95 disabled:opacity-40"
                    title="Add custom macro"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {editingSnippet === null ? (
                // VIEW/LIST MODE
                <div className="flex-1 flex flex-col min-h-0 gap-3 mt-4">
                    {/* Search bar */}
                    <div className="relative shrink-0">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                        <input 
                            type="text"
                            placeholder="Search shortcuts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full dark:bg-zinc-950/50 bg-zinc-50 border dark:border-white/10 border-zinc-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-zinc-200 transition-all font-semibold"
                        />
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 dark:bg-zinc-950 bg-zinc-50 p-1 rounded-xl border dark:border-white/5 border-zinc-200 shrink-0">
                        {['All', 'Personal', 'System'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "flex-1 text-[9px] uppercase font-black tracking-widest py-1 rounded-lg transition-all",
                                    activeTab === tab 
                                        ? "bg-indigo-500 text-white shadow" 
                                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Macro cards list */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 pb-12 custom-scrollbar">
                        {filteredSnippets.length === 0 ? (
                            <div className="text-center py-12 dark:bg-zinc-900/50 bg-white/50 border border-dashed dark:border-white/10 border-zinc-300 rounded-xl">
                                <span className="text-xs text-zinc-500 font-mono tracking-tighter italic">No macros found</span>
                            </div>
                        ) : filteredSnippets.map(snip => (
                            <div 
                                key={snip.shortcut}
                                className={cn(
                                    "group p-3 border rounded-xl flex flex-col gap-1 transition-all duration-200 relative dark:bg-zinc-950/20 bg-zinc-50/50 dark:border-white/5 border-zinc-200 hover:dark:bg-zinc-950 hover:bg-zinc-100/50"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black dark:text-zinc-300 text-zinc-700 font-mono bg-zinc-200/50 dark:bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-tight">
                                        {snip.shortcut}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        {(snip.scope?.toUpperCase() === 'SYSTEM' || snip.isSystem) && (
                                            <span className="text-[8px] font-black uppercase text-indigo-500 tracking-wider bg-indigo-500/10 px-1.5 py-0.5 rounded">System</span>
                                        )}
                                        <button
                                            onClick={() => handleEditStart(snip)}
                                            className="p-1 hover:bg-zinc-500/15 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                                            title="Edit macro"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(snip.macroId, snip.shortcut)}
                                            className="p-1 hover:bg-red-500/15 rounded text-zinc-400 hover:text-red-500 transition-colors"
                                            title="Delete macro"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 truncate mt-1">
                                    {snip.label}
                                </span>
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 line-clamp-2 mt-0.5 leading-relaxed">
                                    {snip.description || snip.text}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                // EDIT/CREATE MODE
                <div className="flex-1 flex flex-col min-h-0 gap-4 mt-4 overflow-y-auto pr-1 pb-12 custom-scrollbar">
                    <div className="px-3 py-2 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex items-center gap-2 shrink-0">
                        <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 leading-none">
                            {editingSnippet === 'new' ? 'Create Custom Macro' : `Edit Macro: ${editingSnippet.shortcut}`}
                        </span>
                    </div>

                    <div className="space-y-3 shrink-0">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Shortcut Trigger</label>
                            <input 
                                type="text"
                                value={formTrigger}
                                onChange={(e) => setFormTrigger(e.target.value)}
                                className="w-full bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-white/5 rounded-xl px-3 py-2 text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-zinc-200"
                                placeholder="/my-shortcut"
                                disabled={editingSnippet !== 'new'}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Macro Scope / Type</label>
                            <div className="flex items-center gap-1 dark:bg-zinc-950 bg-zinc-50 p-1 rounded-xl border dark:border-white/5 border-zinc-200 shrink-0">
                                {[
                                    { value: false, label: 'Personal (Desk Scope)' },
                                    { value: true, label: 'System (Lab Scope)' }
                                ].map(opt => (
                                    <button
                                        key={String(opt.value)}
                                        type="button"
                                        onClick={() => setFormIsSystem(opt.value)}
                                        className={cn(
                                            "flex-1 text-[9px] uppercase font-black tracking-widest py-1.5 rounded-lg transition-all",
                                            formIsSystem === opt.value 
                                                ? "bg-indigo-500 text-white shadow-sm" 
                                                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Macro Label</label>
                            <input 
                                type="text"
                                value={formLabel}
                                onChange={(e) => setFormLabel(e.target.value)}
                                className="w-full bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-white/5 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-zinc-200"
                                placeholder="Normal Summary Statement"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Short Description</label>
                            <input 
                                type="text"
                                value={formDesc}
                                onChange={(e) => setFormDesc(e.target.value)}
                                className="w-full bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-white/5 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-zinc-200"
                                placeholder="Short explanation of findings..."
                            />
                        </div>

                        <div className="space-y-1 flex flex-col min-h-0">
                            <div className="flex items-center justify-between">
                                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Macro Expanded Text</label>
                                <span className="text-[9px] font-bold text-zinc-400 font-mono">TipTap JSON ready</span>
                            </div>
                            <textarea 
                                value={formText}
                                onChange={(e) => setFormText(e.target.value)}
                                rows={6}
                                className="w-full bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-white/5 rounded-xl px-3 py-2 text-xs font-semibold leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-zinc-200 custom-scrollbar resize-none"
                                placeholder="Enter the full text block that will expand..."
                            />
                        </div>
                    </div>

                    {/* Variable Quick Injections */}
                    <div className="space-y-2 shrink-0">
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1 block">Dynamic Variables</span>
                        <div className="flex flex-wrap gap-1.5">
                            {['patientName', 'age', 'gender', 'token'].map(v => (
                                <button
                                    key={v}
                                    type="button"
                                    onClick={() => injectVariable(v)}
                                    className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:dark:bg-zinc-700/50 border dark:border-white/5 border-zinc-200 rounded-lg text-[9px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 transition-colors"
                                >
                                    +{v}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2.5 pt-4 border-t dark:border-white/5 border-zinc-100 shrink-0">
                        <button
                            onClick={() => setEditingSnippet(null)}
                            className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 hover:dark:bg-zinc-700 font-bold text-xs py-2.5 rounded-xl transition-all active:scale-95 uppercase tracking-tight"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 bg-indigo-500 text-white hover:opacity-90 font-bold text-xs py-2.5 rounded-xl shadow shadow-indigo-500/20 transition-all active:scale-95 uppercase tracking-tight"
                        >
                            Save Macro
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
