import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AdminApi } from '@/api/admin';
import { useAuth } from '@/context/AuthContext';

const GlobalFilterContext = createContext(null);

export const GlobalFilterProvider = ({ children }) => {
    const { user, activeOversightBranchId, setOversightBranch } = useAuth();
    const isAdmin = user?.role === 'Admin' || user?.role === 'SystemAdmin';

    // 1. Time Horizon Preset ('today' | 'month' | 'quarter' | 'year' | 'custom')
    const [presetRange, setPresetRangeState] = useState(() => {
        return sessionStorage.getItem('synos_filter_preset') || 'month';
    });

    // 2. Custom Date Range ({ start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' })
    const [customDates, setCustomDatesState] = useState(() => {
        try {
            const saved = sessionStorage.getItem('synos_filter_custom_dates');
            return saved ? JSON.parse(saved) : { start: '', end: '' };
        } catch {
            return { start: '', end: '' };
        }
    });

    // 3. Consolidated Multi-Branch Mode
    const [isConsolidated, setIsConsolidatedState] = useState(() => {
        const saved = sessionStorage.getItem('synos_filter_is_consolidated');
        return saved === null ? true : saved === 'true';
    });

    // 4. Branch Selection
    const [activeBranchId, setActiveBranchIdState] = useState(() => {
        return activeOversightBranchId || localStorage.getItem('synos_oversight_branch_id') || user?.branchId || '';
    });

    const [branches, setBranches] = useState([]);
    const [isLoadingBranches, setIsLoadingBranches] = useState(false);

    // Sync activeBranchId from AuthContext if it updates externally
    useEffect(() => {
        if (activeOversightBranchId && activeOversightBranchId !== activeBranchId) {
            setActiveBranchIdState(activeOversightBranchId);
        }
    }, [activeOversightBranchId]);

    // Load available branches once
    useEffect(() => {
        let isMounted = true;
        const fetchBranches = async () => {
            setIsLoadingBranches(true);
            try {
                const data = await AdminApi.getBranches();
                if (isMounted && Array.isArray(data) && data.length > 0) {
                    setBranches(data);
                    // If no branch active, set to first branch
                    if (!activeBranchId && data[0]) {
                        const firstId = data[0].branchId || data[0].id;
                        setActiveBranchIdState(firstId);
                    }
                }
            } catch (err) {
                console.error("Failed to load branches in GlobalFilterContext", err);
            } finally {
                if (isMounted) setIsLoadingBranches(false);
            }
        };

        fetchBranches();
        return () => { isMounted = false; };
    }, []);

    const setPresetRange = useCallback((preset) => {
        sessionStorage.setItem('synos_filter_preset', preset);
        setPresetRangeState(preset);
    }, []);

    const setCustomDates = useCallback((dates) => {
        sessionStorage.setItem('synos_filter_custom_dates', JSON.stringify(dates));
        setCustomDatesState(dates);
        sessionStorage.setItem('synos_filter_preset', 'custom');
        setPresetRangeState('custom');
    }, []);

    const setQuickDays = useCallback((days) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - (days - 1));

        const formatDate = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const newDates = {
            start: formatDate(start),
            end: formatDate(end)
        };

        sessionStorage.setItem('synos_filter_custom_dates', JSON.stringify(newDates));
        setCustomDatesState(newDates);
        sessionStorage.setItem('synos_filter_preset', 'custom');
        setPresetRangeState('custom');
    }, []);

    const setIsConsolidated = useCallback((val) => {
        sessionStorage.setItem('synos_filter_is_consolidated', String(val));
        setIsConsolidatedState(val);
    }, []);

    const setActiveBranchId = useCallback((branchId) => {
        localStorage.setItem('synos_oversight_branch_id', branchId);
        setActiveBranchIdState(branchId);
        if (setOversightBranch) {
            setOversightBranch(branchId);
        }
    }, [setOversightBranch]);

    const effectiveBranchId = useMemo(() => {
        if (isConsolidated && isAdmin) return null;
        return activeBranchId || activeOversightBranchId || user?.branchId || null;
    }, [isConsolidated, isAdmin, activeBranchId, activeOversightBranchId, user?.branchId]);

    const currentBranchName = useMemo(() => {
        if (isConsolidated && isAdmin) return "All Branches";
        const found = branches.find(b => (b.branchId || b.id) === effectiveBranchId);
        return found?.name || user?.branchName || "Main Branch";
    }, [isConsolidated, isAdmin, effectiveBranchId, branches, user?.branchName]);

    const value = useMemo(() => ({
        presetRange,
        setPresetRange,
        customDates,
        setCustomDates,
        setQuickDays,
        isConsolidated,
        setIsConsolidated,
        activeBranchId,
        setActiveBranchId,
        effectiveBranchId,
        branches,
        isLoadingBranches,
        currentBranchName,
        isAdmin
    }), [
        presetRange,
        setPresetRange,
        customDates,
        setCustomDates,
        setQuickDays,
        isConsolidated,
        setIsConsolidated,
        activeBranchId,
        setActiveBranchId,
        effectiveBranchId,
        branches,
        isLoadingBranches,
        currentBranchName,
        isAdmin
    ]);

    return (
        <GlobalFilterContext.Provider value={value}>
            {children}
        </GlobalFilterContext.Provider>
    );
};

export const useGlobalFilter = () => {
    const ctx = useContext(GlobalFilterContext);
    if (!ctx) {
        throw new Error("useGlobalFilter must be used within a GlobalFilterProvider");
    }
    return ctx;
};
