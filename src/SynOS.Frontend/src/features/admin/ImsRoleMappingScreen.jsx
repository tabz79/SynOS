import React, { useState, useEffect } from 'react';
import { Shield, Package, Plus, Trash2, Search, Loader2, AlertCircle, CheckCircle2, Beaker } from 'lucide-react';
import { InventoryApi } from '@/api/inventory';
import { AdminApi } from '@/api/admin';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';

export function ImsRoleMappingScreen() {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState('roles'); // 'roles', 'test-consumables', 'test-tubes'
    const [isLoading, setIsLoading] = useState(true);

    // Common Catalog State
    const [allItems, setAllItems] = useState([]); // Consumables
    const [tubes, setTubes] = useState([]); // Tubes
    const [tests, setTests] = useState([]); // Tests

    // Role Mapping State
    const [roles, setRoles] = useState([]);
    const [selectedRoleId, setSelectedRoleId] = useState(null);
    const [mappedItems, setMappedItems] = useState([]);
    const [isMappingLoading, setIsMappingLoading] = useState(false);
    const [roleSearchQuery, setRoleSearchQuery] = useState('');

    // Test Mapping State
    const [selectedTestId, setSelectedTestId] = useState(null);
    const [testConsumables, setTestConsumables] = useState([]);
    const [testTubes, setTestTubes] = useState([]);
    const [isSubMappingLoading, setIsSubMappingLoading] = useState(false);
    const [testSearchQuery, setTestSearchQuery] = useState('');
    const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
    
    // Mapping Parameters
    const [quantity, setQuantity] = useState(1);
    const [usageType, setUsageType] = useState(0); // 0 = Consumption, 1 = Calibration, 2 = Control

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedRoleId && activeTab === 'roles') {
            loadRoleMappings(selectedRoleId);
        }
    }, [selectedRoleId, activeTab]);

    useEffect(() => {
        if (selectedTestId && (activeTab === 'test-consumables' || activeTab === 'test-tubes')) {
            loadTestMappings(selectedTestId);
        }
    }, [selectedTestId, activeTab]);

    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            const [rolesData, itemsData, testsData, tubesData] = await Promise.all([
                AdminApi.getRoles(),
                InventoryApi.getAllActiveItems(),
                AdminApi.getTests(),
                InventoryApi.getTubes()
            ]);
            setRoles(rolesData);
            setAllItems(itemsData);
            setTests(testsData);
            setTubes(tubesData);

            if (rolesData.length > 0) {
                setSelectedRoleId(rolesData[0].roleId);
            }
            if (testsData.length > 0) {
                setSelectedTestId(testsData[0].testId);
            }
        } catch (err) {
            console.error("Failed to load initial setup data", err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadRoleMappings = async (roleId) => {
        setIsMappingLoading(true);
        try {
            const data = await InventoryApi.getMappings(roleId);
            setMappedItems(data);
        } catch (err) {
            console.error("Failed to load role mappings", err);
        } finally {
            setIsMappingLoading(false);
        }
    };

    const loadTestMappings = async (testId) => {
        setIsSubMappingLoading(true);
        try {
            if (activeTab === 'test-consumables') {
                const data = await InventoryApi.getTestConsumables(testId);
                setTestConsumables(data);
            } else if (activeTab === 'test-tubes') {
                const data = await InventoryApi.getTestTubes(testId);
                setTestTubes(data);
            }
        } catch (err) {
            console.error("Failed to load test mappings", err);
        } finally {
            setIsSubMappingLoading(false);
        }
    };

    // Role Mapping actions
    const handleAddRoleMapping = async (consumableId) => {
        try {
            await InventoryApi.addMapping(selectedRoleId, consumableId);
            await loadRoleMappings(selectedRoleId);
        } catch (err) {
            console.error(err);
        }
    };

    const handleRemoveRoleMapping = async (consumableId) => {
        try {
            await InventoryApi.removeMapping(selectedRoleId, consumableId);
            await loadRoleMappings(selectedRoleId);
        } catch (err) {
            console.error(err);
        }
    };

    // Test Consumable actions
    const handleAddTestConsumable = async (consumableId) => {
        try {
            await InventoryApi.addTestConsumable(selectedTestId, {
                consumableId,
                quantityPerTest: parseInt(quantity) || 1,
                usageType: parseInt(usageType) || 0
            });
            await loadTestMappings(selectedTestId);
        } catch (err) {
            console.error(err);
        }
    };

    const handleRemoveTestConsumable = async (mapId) => {
        try {
            await InventoryApi.removeTestConsumable(selectedTestId, mapId);
            await loadTestMappings(selectedTestId);
        } catch (err) {
            console.error(err);
        }
    };

    // Test Tube actions
    const handleAddTestTube = async (tubeId) => {
        try {
            await InventoryApi.addTestTube({
                testId: selectedTestId,
                tubeId,
                quantityPerSample: parseInt(quantity) || 1
            });
            await loadTestMappings(selectedTestId);
        } catch (err) {
            console.error(err);
        }
    };

    const handleRemoveTestTube = async (mapId) => {
        try {
            await InventoryApi.removeTestTube(mapId);
            await loadTestMappings(selectedTestId);
        } catch (err) {
            console.error(err);
        }
    };

    // Filters
    const filteredAllItemsForRoles = allItems.filter(item => 
        Array.isArray(mappedItems) &&
        !mappedItems.some(m => m.consumableId === item.consumableId) &&
        (item.name.toLowerCase().includes(roleSearchQuery.toLowerCase()) || 
         item.code.toLowerCase().includes(roleSearchQuery.toLowerCase()))
    );

    const filteredAvailableConsumables = allItems.filter(item => 
        Array.isArray(testConsumables) &&
        !testConsumables.some(tc => tc.consumableId === item.consumableId) &&
        (item.name.toLowerCase().includes(catalogSearchQuery.toLowerCase()) || 
         item.code.toLowerCase().includes(catalogSearchQuery.toLowerCase()))
    );

    const filteredAvailableTubes = tubes.filter(tube => 
        Array.isArray(testTubes) &&
        !testTubes.some(tt => tt.tubeId === tube.tubeId) &&
        (tube.name.toLowerCase().includes(catalogSearchQuery.toLowerCase()) || 
         tube.code.toLowerCase().includes(catalogSearchQuery.toLowerCase()))
    );

    const filteredTests = tests.filter(test => {
        const name = test.testName || test.TestName || test.name || '';
        const code = test.testCode || test.code || '';
        return name.toLowerCase().includes(testSearchQuery.toLowerCase()) ||
               code.toLowerCase().includes(testSearchQuery.toLowerCase());
    });

    const getUsageTypeName = (type) => {
        switch (type) {
            case 0: return "Consumption";
            case 1: return "Calibration";
            case 2: return "Control";
            default: return "Consumption";
        }
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-zinc-700" />
            </div>
        );
    }

    return (
        <div className="p-8 flex flex-col h-full space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div>
                <h1 className="text-xl font-semibold tracking-tight text-zinc-800 dark:text-white flex items-center gap-2.5">
                    <Package className="w-5 h-5 text-synos-primary" /> Inventory Setup
                </h1>
                <p className="text-xs text-zinc-400 mt-1 font-medium">Configure roles, tests, and collection tube inventory mappings</p>
            </div>

            {/* Tab switch bar */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-900/60 pb-px gap-6">
                <button
                    onClick={() => setActiveTab('roles')}
                    className={cn(
                        "pb-4 text-xs font-semibold uppercase tracking-wider border-b-2 px-1 transition-all",
                        activeTab === 'roles'
                            ? "border-synos-primary text-synos-primary"
                            : "border-transparent text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-300"
                    )}
                >
                    Role Mappings
                </button>
                <button
                    onClick={() => setActiveTab('test-consumables')}
                    className={cn(
                        "pb-4 text-xs font-semibold uppercase tracking-wider border-b-2 px-1 transition-all",
                        activeTab === 'test-consumables'
                            ? "border-synos-primary text-synos-primary"
                            : "border-transparent text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-300"
                    )}
                >
                    Test Consumables
                </button>
                <button
                    onClick={() => setActiveTab('test-tubes')}
                    className={cn(
                        "pb-4 text-xs font-semibold uppercase tracking-wider border-b-2 px-1 transition-all",
                        activeTab === 'test-tubes'
                            ? "border-synos-primary text-synos-primary"
                            : "border-transparent text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-300"
                    )}
                >
                    Test Tubes
                </button>
            </div>

            {/* Layout Wrapper */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-6">
                
                {/* LEFT SIDEBAR: Roles or Tests list */}
                <div 
                    className="w-full md:w-64 border border-zinc-200 dark:border-zinc-900/60 rounded-2xl overflow-hidden flex flex-col shadow-sm"
                    style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}
                >
                    {activeTab === 'roles' ? (
                        <>
                            <div 
                                className="p-4 border-b border-zinc-200 dark:border-zinc-900/60 flex items-center gap-2"
                                style={{ backgroundColor: theme === 'dark' ? '#18181b' : '#fafafa' }}
                            >
                                <Shield className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">System Roles</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2.5 space-y-1 custom-scrollbar">
                                {roles.map(role => (
                                    <button
                                        key={role.roleId}
                                        onClick={() => setSelectedRoleId(role.roleId)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-98 border",
                                            selectedRoleId === role.roleId
                                                ? "text-synos-primary border-synos-primary/20 shadow-sm"
                                                : "text-zinc-550 dark:text-zinc-400 border-transparent hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50 hover:text-zinc-855 dark:hover:text-zinc-200"
                                        )}
                                        style={selectedRoleId === role.roleId ? { backgroundColor: theme === 'dark' ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.08)' } : {}}
                                    >
                                        {role.name}
                                        {selectedRoleId === role.roleId && <CheckCircle2 className="h-3.5 w-3.5" />}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <div 
                                className="p-4 border-b border-zinc-200 dark:border-zinc-900/60 flex flex-col gap-2"
                                style={{ backgroundColor: theme === 'dark' ? '#18181b' : '#fafafa' }}
                            >
                                <div className="flex items-center gap-2">
                                    <Beaker className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Test Directory</span>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                                    <input 
                                        type="text"
                                        placeholder="Search test..."
                                        value={testSearchQuery}
                                        onChange={(e) => setTestSearchQuery(e.target.value)}
                                        className="w-full border border-zinc-200 dark:border-zinc-800 rounded-lg py-1 pl-8 pr-2.5 text-xxs outline-none focus:ring-1 focus:ring-synos-primary transition-all"
                                        style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff', color: theme === 'dark' ? '#f4f4f5' : '#18181b' }}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2.5 space-y-1 custom-scrollbar">
                                {filteredTests.map(test => {
                                    const testName = test.testName || test.TestName || test.name;
                                    return (
                                        <button
                                            key={test.testId}
                                            onClick={() => setSelectedTestId(test.testId)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-4 py-2 rounded-xl text-left text-xs font-medium transition-all active:scale-98 border truncate",
                                                selectedTestId === test.testId
                                                    ? "text-synos-primary border-synos-primary/20 shadow-sm"
                                                    : "text-zinc-550 dark:text-zinc-400 border-transparent hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50 hover:text-zinc-855 dark:hover:text-zinc-200"
                                            )}
                                            style={selectedTestId === test.testId ? { backgroundColor: theme === 'dark' ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.08)' } : {}}
                                            title={testName}
                                        >
                                            <span className="truncate">{testName}</span>
                                            {selectedTestId === test.testId && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 ml-1" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* RIGHT WORKSPACE: Mapped list & Catalog list */}
                <div className="flex-1 flex flex-col gap-6">
                    
                    {/* TOP PANEL: Active Mappings */}
                    <div 
                        className="flex-1 border border-zinc-200 dark:border-zinc-900/60 rounded-2xl flex flex-col overflow-hidden shadow-sm"
                        style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}
                    >
                        <div 
                            className="p-4 border-b border-zinc-200 dark:border-zinc-900/60 flex items-center justify-between"
                            style={{ backgroundColor: theme === 'dark' ? '#18181b' : '#fafafa' }}
                        >
                            <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-synos-primary" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                                    {activeTab === 'roles' && `Mapped Essential Items (${mappedItems.length})`}
                                    {activeTab === 'test-consumables' && `Mapped Test Consumables (${testConsumables.length})`}
                                    {activeTab === 'test-tubes' && `Mapped Specimen Tubes (${testTubes.length})`}
                                </span>
                            </div>

                            {/* Options configuration for active selection on non-roles tabs */}
                            {activeTab !== 'roles' && (
                                <div className="flex items-center gap-4 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="text-zinc-400 font-semibold uppercase text-xxs">Qty:</span>
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={quantity}
                                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-12 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-center text-xs outline-none"
                                            style={{ backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', color: theme === 'dark' ? '#f4f4f5' : '#18181b' }}
                                        />
                                    </div>
                                    {activeTab === 'test-consumables' && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-zinc-400 font-semibold uppercase text-xxs">Type:</span>
                                            <select
                                                value={usageType}
                                                onChange={(e) => setUsageType(parseInt(e.target.value))}
                                                className="border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-xs outline-none"
                                                style={{ backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', color: theme === 'dark' ? '#f4f4f5' : '#18181b' }}
                                            >
                                                <option value={0}>Consumption</option>
                                                <option value={1}>Calibration</option>
                                                <option value={2}>Control</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Mapped contents list */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {activeTab === 'roles' ? (
                                isMappingLoading ? (
                                    <div className="h-full flex items-center justify-center opacity-25">
                                        <Loader2 className="h-6 w-6 animate-spin text-synos-primary" />
                                    </div>
                                ) : mappedItems.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 py-12 text-center">
                                        <AlertCircle className="h-9 w-9 mb-2 opacity-65 text-zinc-400" />
                                        <p className="text-xs font-semibold text-zinc-500">No items mapped to this role</p>
                                        <p className="text-[10px] text-zinc-400 mt-0.5 font-medium">Staff will have to use the escape hatch by default</p>
                                    </div>
                                ) : (
                                    mappedItems.map(item => (
                                        <div 
                                            key={item.consumableId}
                                            className="flex items-center justify-between p-3 border border-zinc-150 dark:border-zinc-900/50 rounded-xl group transition-all"
                                            style={{ backgroundColor: theme === 'dark' ? '#18181b80' : '#fafafa' }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="bg-synos-primary/10 p-2 rounded-lg text-synos-primary">
                                                    <Package className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{item.name}</div>
                                                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">{item.code}</div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveRoleMapping(item.consumableId)}
                                                className="p-1.5 text-zinc-400 dark:text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all md:opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))
                                )
                            ) : activeTab === 'test-consumables' ? (
                                isSubMappingLoading ? (
                                    <div className="h-full flex items-center justify-center opacity-25">
                                        <Loader2 className="h-6 w-6 animate-spin text-synos-primary" />
                                    </div>
                                ) : testConsumables.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 py-12 text-center">
                                        <AlertCircle className="h-9 w-9 mb-2 opacity-65 text-zinc-400" />
                                        <p className="text-xs font-semibold text-zinc-500">No reagents/consumables mapped to this test</p>
                                        <p className="text-[10px] text-zinc-400 mt-0.5 font-medium">Automatic deduction will fall back to REAGENT-GEN</p>
                                    </div>
                                ) : (
                                    testConsumables.map(mapping => (
                                        <div 
                                            key={mapping.mapId}
                                            className="flex items-center justify-between p-3 border border-zinc-150 dark:border-zinc-900/50 rounded-xl group transition-all"
                                            style={{ backgroundColor: theme === 'dark' ? '#18181b80' : '#fafafa' }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="bg-synos-primary/10 p-2 rounded-lg text-synos-primary">
                                                    <Package className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{mapping.consumable?.name || "Consumable"}</div>
                                                    <div className="text-[10px] text-zinc-450 dark:text-zinc-500 font-mono mt-0.5">
                                                        {mapping.consumable?.code || "N/A"} • Qty: <span className="font-bold text-synos-primary">{mapping.quantityPerTest}</span> • Type: <span className="font-semibold text-amber-500">{getUsageTypeName(mapping.usageType)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveTestConsumable(mapping.mapId)}
                                                className="p-1.5 text-zinc-400 dark:text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all md:opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))
                                )
                            ) : (
                                isSubMappingLoading ? (
                                    <div className="h-full flex items-center justify-center opacity-25">
                                        <Loader2 className="h-6 w-6 animate-spin text-synos-primary" />
                                    </div>
                                ) : testTubes.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 py-12 text-center">
                                        <AlertCircle className="h-9 w-9 mb-2 opacity-65 text-zinc-400" />
                                        <p className="text-xs font-semibold text-zinc-500">No specimen collection tubes mapped to this test</p>
                                        <p className="text-[10px] text-zinc-400 mt-0.5 font-medium">Tubes will not be automatically tracked during phlebotomy</p>
                                    </div>
                                ) : (
                                    testTubes.map(mapping => (
                                        <div 
                                            key={mapping.mapId}
                                            className="flex items-center justify-between p-3 border border-zinc-150 dark:border-zinc-900/50 rounded-xl group transition-all"
                                            style={{ backgroundColor: theme === 'dark' ? '#18181b80' : '#fafafa' }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="bg-synos-primary/10 p-2 rounded-lg text-synos-primary">
                                                    <Package className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{mapping.tube?.name || "Tube"}</div>
                                                    <div className="text-[10px] text-zinc-450 dark:text-zinc-500 font-mono mt-0.5">
                                                        {mapping.tube?.code || "N/A"} • Qty: <span className="font-bold text-synos-primary">{mapping.quantityPerSample}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveTestTube(mapping.mapId)}
                                                className="p-1.5 text-zinc-400 dark:text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all md:opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))
                                )
                            )}
                        </div>
                    </div>

                    {/* BOTTOM PANEL: Add Mappings Catalog */}
                    <div 
                        className="h-1/2 border border-zinc-200 dark:border-zinc-900/60 rounded-2xl flex flex-col overflow-hidden shadow-sm"
                        style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}
                    >
                        <div 
                            className="p-4 border-b border-zinc-200 dark:border-zinc-900/60 flex items-center justify-between flex-wrap gap-2"
                            style={{ backgroundColor: theme === 'dark' ? '#18181b' : '#fafafa' }}
                        >
                            <div className="flex items-center gap-2">
                                <Search className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                                    {activeTab === 'test-tubes' ? "Available Tubes Master" : "Available Consumables Catalog"}
                                </span>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                                <input 
                                    type="text"
                                    placeholder="Quick search..."
                                    value={activeTab === 'roles' ? roleSearchQuery : catalogSearchQuery}
                                    onChange={(e) => activeTab === 'roles' ? setRoleSearchQuery(e.target.value) : setCatalogSearchQuery(e.target.value)}
                                    className="w-full border border-zinc-200 dark:border-zinc-800 rounded-xl py-1.5 pl-9.5 pr-3 text-xs outline-none focus:ring-1 focus:ring-synos-primary focus:border-synos-primary transition-all shadow-sm shadow-black/[0.02] placeholder-zinc-400"
                                    style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff', color: theme === 'dark' ? '#f4f4f5' : '#18181b' }}
                                />
                            </div>
                        </div>

                        {/* Available catalog list */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {activeTab === 'roles' ? (
                                    filteredAllItemsForRoles.map(item => (
                                        <button
                                            key={item.consumableId}
                                            onClick={() => handleAddRoleMapping(item.consumableId)}
                                            className="flex items-center justify-between p-3 border border-zinc-150 dark:border-zinc-900/40 rounded-xl hover:border-synos-primary/40 transition-all text-left group"
                                            style={{ backgroundColor: theme === 'dark' ? '#18181b' : '#fafafa' }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="bg-zinc-100 dark:bg-zinc-850 p-2 rounded-lg text-zinc-400 dark:text-zinc-500 group-hover:bg-synos-primary/10 group-hover:text-synos-primary transition-colors">
                                                    <Package className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{item.name}</div>
                                                    <div className="text-[10px] text-zinc-450 dark:text-zinc-500 font-mono mt-0.5">{item.code}</div>
                                                </div>
                                            </div>
                                            <Plus className="h-4 w-4 text-zinc-400 dark:text-zinc-500 group-hover:text-synos-primary transition-colors" />
                                        </button>
                                    ))
                                ) : activeTab === 'test-consumables' ? (
                                    filteredAvailableConsumables.map(item => (
                                        <button
                                            key={item.consumableId}
                                            onClick={() => handleAddTestConsumable(item.consumableId)}
                                            className="flex items-center justify-between p-3 border border-zinc-150 dark:border-zinc-900/40 rounded-xl hover:border-synos-primary/40 transition-all text-left group"
                                            style={{ backgroundColor: theme === 'dark' ? '#18181b' : '#fafafa' }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="bg-zinc-100 dark:bg-zinc-850 p-2 rounded-lg text-zinc-400 dark:text-zinc-500 group-hover:bg-synos-primary/10 group-hover:text-synos-primary transition-colors">
                                                    <Package className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{item.name}</div>
                                                    <div className="text-[10px] text-zinc-450 dark:text-zinc-500 font-mono mt-0.5">{item.code}</div>
                                                </div>
                                            </div>
                                            <Plus className="h-4 w-4 text-zinc-400 dark:text-zinc-500 group-hover:text-synos-primary transition-colors" />
                                        </button>
                                    ))
                                ) : (
                                    filteredAvailableTubes.map(tube => (
                                        <button
                                            key={tube.tubeId}
                                            onClick={() => handleAddTestTube(tube.tubeId)}
                                            className="flex items-center justify-between p-3 border border-zinc-150 dark:border-zinc-900/40 rounded-xl hover:border-synos-primary/40 transition-all text-left group"
                                            style={{ backgroundColor: theme === 'dark' ? '#18181b' : '#fafafa' }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="bg-zinc-100 dark:bg-zinc-850 p-2 rounded-lg text-zinc-400 dark:text-zinc-500 group-hover:bg-synos-primary/10 group-hover:text-synos-primary transition-colors">
                                                    <Package className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{tube.name}</div>
                                                    <div className="text-[10px] text-zinc-450 dark:text-zinc-500 font-mono mt-0.5">{tube.code}</div>
                                                </div>
                                            </div>
                                            <Plus className="h-4 w-4 text-zinc-400 dark:text-zinc-500 group-hover:text-synos-primary transition-colors" />
                                        </button>
                                    ))
                                )}
                            </div>
                            {((activeTab === 'roles' && filteredAllItemsForRoles.length === 0) ||
                              (activeTab === 'test-consumables' && filteredAvailableConsumables.length === 0) ||
                              (activeTab === 'test-tubes' && filteredAvailableTubes.length === 0)) && (
                                <div className="h-full flex items-center justify-center text-zinc-450 dark:text-zinc-500 text-xs py-10 font-medium italic">
                                    All items are already mapped or no items match search query.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
