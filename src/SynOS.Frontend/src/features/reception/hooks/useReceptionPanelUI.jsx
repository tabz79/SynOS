import React, { createContext, useContext, useState, useMemo } from 'react';

// Create Concept Split
const ReceptionDrawerContext = createContext(null);
const ReceptionDraftContext = createContext(null);

/**
 * Ephemeral UI State for the Reception Intent Panel.
 * STRICTLY UI STATE ONLY (Visibility, Inputs). 
 * No Business Logic.
 * 
 * Implemented using React Context to scope state to the Screen.
 */
export function ReceptionProvider({ children }) {
    // Unified Drawer State (Low Frequency)
    const [drawerState, setDrawerState] = useState({
        mode: 'closed', // 'closed' | 'open'
        intent: null,   // 'create' | 'resume' | 'correction'
        visitId: null
    });

    // Draft Inputs (High Frequency)
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [isNewPatientMode, setIsNewPatientMode] = useState(false);
    const [newPatientDraft, setNewPatientDraft] = useState({
        mobile: '', firstName: '', lastName: '', gender: '', age: '', dob: ''
    });
    const [selectedTestCodes, setSelectedTestCodes] = useState([]);

    // Drawer Actions
    const drawerActions = useMemo(() => ({
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
        closePanel: () => {
            setDrawerState({ mode: 'closed', intent: null, visitId: null });

            // Reset Draft State
            setSearchQuery('');
            setSelectedPatient(null);
            setIsNewPatientMode(false);
            setNewPatientDraft({ mobile: '', firstName: '', lastName: '', gender: '', age: '', dob: '' });
            setSelectedTestCodes([]);
        }
    }), []);

    // Draft Actions
    const draftActions = useMemo(() => ({
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

    const drawerValue = {
        isOpen: drawerState.mode !== 'closed',
        drawerState,
        ...drawerActions
    };

    const draftValue = {
        searchQuery,
        selectedPatient,
        isNewPatientMode,
        newPatientDraft,
        selectedTestCodes,
        ...draftActions
    };

    return (
        <React.Fragment>
            <ReceptionDrawerContext.Provider value={drawerValue}>
                <ReceptionDraftContext.Provider value={draftValue}>
                    {children}
                </ReceptionDraftContext.Provider>
            </ReceptionDrawerContext.Provider>
        </React.Fragment>
    );
}

// Old hook for backward compatibility during refactor
export function useReceptionPanelUI() {
    const drawer = useContext(ReceptionDrawerContext);
    const draft = useContext(ReceptionDraftContext);
    if (!drawer || !draft) {
        throw new Error('useReceptionPanelUI must be used within a ReceptionProvider');
    }
    return { ...drawer, ...draft };
}

// New Hooks: High-Frequency Isolation
export function useReceptionDrawer() {
    const context = useContext(ReceptionDrawerContext);
    if (!context) {
        throw new Error('useReceptionDrawer must be used within a ReceptionProvider');
    }
    return context;
}

export function useReceptionDraft() {
    const context = useContext(ReceptionDraftContext);
    if (!context) {
        throw new Error('useReceptionDraft must be used within a ReceptionProvider');
    }
    return context;
}
