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
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState('idle'); // idle | active

    // Draft Inputs
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [isNewPatientMode, setIsNewPatientMode] = useState(false);
    const [newPatientDraft, setNewPatientDraft] = useState({
        mobile: '',
        firstName: '',
        lastName: '',
        gender: '', // male | female | other
        age: '',
        dob: ''
    });
    const [selectedTestCodes, setSelectedTestCodes] = useState([]);

    // Actions
    const actions = useMemo(() => ({
        openPanel: () => {
            setIsOpen(true);
            setMode('active');
        },
        closePanel: () => {
            setIsOpen(false);
            setMode('idle');
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
        isOpen,
        mode,
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
