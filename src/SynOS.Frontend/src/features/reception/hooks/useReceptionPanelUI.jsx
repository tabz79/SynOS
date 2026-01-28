import React, { createContext, useContext, useState, useMemo } from 'react';

// Create Context
const ReceptionContext = createContext(null);

/**
 * Ephemeral UI State for the Reception Intent Panel.
 * STRICTLY UI STATE ONLY (Visibility, Inputs). 
 * No Business Logic.
 * 
 * Implemented using React Context to scope state to the Screen.
 */
export function ReceptionProvider({ children }) {
    // Unified Drawer State
    const [drawerState, setDrawerState] = useState({
        mode: 'closed', // 'closed' | 'open'
        intent: null,   // 'create' | 'resume' | 'correction'
        visitId: null
    });

    // Draft Inputs (Persist only if needed, but usually reset on close)
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [isNewPatientMode, setIsNewPatientMode] = useState(false);
    const [newPatientDraft, setNewPatientDraft] = useState({
        mobile: '', firstName: '', lastName: '', gender: '', age: '', dob: ''
    });
    const [selectedTestCodes, setSelectedTestCodes] = useState([]);

    // Actions
    const actions = useMemo(() => ({
        // OLD: openPanel (Mapped to Create Intent)
        openPanel: () => {
            setDrawerState({ mode: 'open', intent: 'create', visitId: null });
        },

        // NEW: Explicit Intents (Phase 3A)
        openCreateIntent: () => {
            // New Walk-In
            setDrawerState({ mode: 'open', intent: 'create', visitId: null });
        },
        openResumeIntent: (visitId) => {
            // Resume Draft / Unpaid Visit
            setDrawerState({ mode: 'open', intent: 'resume', visitId });
        },
        openCorrectionIntent: (visitId) => {
            // Correct Paid Visit (Audit Mode)
            setDrawerState({ mode: 'open', intent: 'correction', visitId });
        },
        // Backward Compat (View Mode -> Resume/Correction depending on state?? No, View is distinct in UI, but logically it's resume/correction)
        // For now, mapping 'view' to 'resume' conceptually if we treat "ReadOnly" as a state of resume.
        // But prompt said: "view" mode is conflated. 
        // Let's keep "view" as "restricted resume" or just use Resume for everything and let component decide ReadOnly?
        // Prompt says: "if isFinalized === true -> openCorrectionIntent".
        // So we don't need a explicit 'view' intent anymore? 
        // Wait, 'view' was used for history. 
        // Let's support 'view' as 'resume' with read-only flag? 
        // No, let's follow prompt EXACTLY: "create -> create, resume -> resume, correction -> correction".
        // If user just wants to SEE a paid visit without correcting?
        // That sounds like "Resume" but locked.
        // Prompt says: "if isFinalized === true -> openCorrectionIntent".
        // This implies clicking a paid token enters correction mode immediately?
        // Or maybe "Correction Intent" handles the "View vs Edit" toggle internally?
        // Let's stick to the 3 explicit intents.

        closePanel: () => {
            setDrawerState({ mode: 'closed', intent: null, visitId: null });

            // Reset Draft State
            setSearchQuery('');
            setSelectedPatient(null);
            setIsNewPatientMode(false);
            setNewPatientDraft({ mobile: '', firstName: '', lastName: '', gender: '', age: '', dob: '' });
            setSelectedTestCodes([]);
        },

        setSearchQuery,
        setSelectedPatient: (patient) => {
            setSelectedPatient(patient);
            setIsNewPatientMode(false);
        },
        enableNewPatientMode: () => {
            setIsNewPatientMode(true);
            setSelectedPatient(null);
        },
        updateNewPatientDraft: (updates) => {
            setNewPatientDraft(prev => ({ ...prev, ...updates }));
        },
        toggleTestSelection: (testCode) => {
            setSelectedTestCodes(prev => {
                const exists = prev.includes(testCode);
                return exists ? prev.filter(c => c !== testCode) : [...prev, testCode];
            });
        },
        resetTestSelection: () => setSelectedTestCodes([])
    }), []);

    const value = {
        isOpen: drawerState.mode !== 'closed', // Compat
        drawerState, // Exposed for logic
        mode: drawerState.mode, // Compat (active/idle mapped to create/view?) No, just string mode.
        searchQuery,
        selectedPatient,
        isNewPatientMode,
        newPatientDraft,
        selectedTestCodes,
        ...actions
    };

    return (
        <React.Fragment>
            <ReceptionContext.Provider value={value}>
                {children}
            </ReceptionContext.Provider>
        </React.Fragment>
    );
}

export function useReceptionPanelUI() {
    const context = useContext(ReceptionContext);
    if (!context) {
        throw new Error('useReceptionPanelUI must be used within a ReceptionProvider');
    }
    return context;
}
