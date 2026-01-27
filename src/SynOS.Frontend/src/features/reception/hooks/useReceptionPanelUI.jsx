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
        mode: 'closed', // 'closed' | 'create' | 'view'
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
        // OLD: openPanel (Mapped to Create Mode for backward compat if needed)
        openPanel: () => {
            setDrawerState({ mode: 'create', visitId: null });
        },

        // NEW: Explicit Modes
        openCreateMode: () => {
            setDrawerState({ mode: 'create', visitId: null });
        },
        openViewMode: (visitId) => {
            setDrawerState({ mode: 'view', visitId });
        },
        openEditMode: (visitId) => {
            setDrawerState({ mode: 'create', visitId });
        },

        closePanel: () => {
            setDrawerState({ mode: 'closed', visitId: null });

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
