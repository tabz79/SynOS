import React, { useState, useEffect } from 'react';
import { 
    Shield, 
    Package, 
    Plus, 
    Trash2, 
    Search, 
    Loader2, 
    AlertCircle, 
    CheckCircle2, 
    Beaker, 
    Zap, 
    Sparkles, 
    Layers, 
    SlidersHorizontal,
    Info,
    Check,
    Pencil
} from 'lucide-react';
import { InventoryApi } from '@/api/inventory';
import { AdminApi } from '@/api/admin';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { INVENTORY_SERVICE_AREAS, RADIOLOGY_MODALITIES } from '@/constants/inventoryConstants';
import { getCompatibleUnits, calculateBaseQuantity, getDefaultConsumptionUnit, formatConsumptionDisplay } from '@/utils/unitConversion';

export function ImsRoleMappingScreen() {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState('roles'); // 'roles', 'test-consumables', 'test-tubes', 'masters'
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

    // Domain & Filter State for Role Mapping Catalog
    const [roleDomainFilter, setRoleDomainFilter] = useState('ALL'); // 'ALL', 'RADIOLOGY', 'LABORATORY', 'GENERAL'
    const [selectedServiceAreaFilter, setSelectedServiceAreaFilter] = useState('ALL');
    const [selectedModalityFilter, setSelectedModalityFilter] = useState('ALL');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

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
            setRoles(rolesData || []);
            setAllItems(itemsData || []);
            setTests(testsData || []);
            setTubes(tubesData || []);

            if (rolesData && rolesData.length > 0) {
                setSelectedRoleId(rolesData[0].roleId);
            }
            if (testsData && testsData.length > 0) {
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
            setMappedItems(data || []);
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
                setTestConsumables(data || []);
            } else if (activeTab === 'test-tubes') {
                const data = await InventoryApi.getTestTubes(testId);
                setTestTubes(data || []);
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
                quantityPerTest: parseFloat(quantity) || 1,
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
                quantityPerSample: parseFloat(quantity) || 1
            });
            await loadTestMappings(selectedTestId);
        } catch (err) {
            console.error(err);
        }
    };

    const [editingMapId, setEditingMapId] = useState(null);
    const [editingQtyVal, setEditingQtyVal] = useState("");
    const [editingUnit, setEditingUnit] = useState("");

    const handleStartEditQty = (mapId, currentDispQty, currentUnit) => {
        setEditingMapId(mapId);
        setEditingQtyVal(currentDispQty.toString());
        setEditingUnit(currentUnit);
    };

    const handleSaveTestConsumableQty = async (mapId, baseUom) => {
        const dispVal = parseFloat(editingQtyVal);
        if (!dispVal || dispVal <= 0) return;
        const baseQty = calculateBaseQuantity(dispVal, editingUnit, baseUom);

        try {
            await InventoryApi.updateTestConsumable(selectedTestId, mapId, {
                quantityPerTest: baseQty,
                displayQuantity: dispVal,
                displayUnit: editingUnit
            });
            setEditingMapId(null);
            await loadTestMappings(selectedTestId);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveTestTubeQty = async (mapId) => {
        const val = parseFloat(editingQtyVal);
        if (!val || val <= 0) return;
        try {
            await InventoryApi.updateTestTube(selectedTestId, mapId, { quantityPerSample: val });
            setEditingMapId(null);
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

    // Quick 1-Click Auto Assign Modality Items
    const handleQuickAssignModality = async () => {
        if (!selectedRoleId) return;
        const currentRole = roles.find(r => r.roleId === selectedRoleId);
        const rName = (currentRole?.name || '').toLowerCase();
        
        let targetModality = '';
        if (rName.includes('xray') || rName.includes('x-ray')) targetModality = 'X-Ray';
        else if (rName.includes('mri')) targetModality = 'MRI';
        else if (rName.includes('ct')) targetModality = 'CT';
        else if (rName.includes('us') || rName.includes('ultrasound')) targetModality = 'Ultrasound';

        const matchingItems = allItems.filter(item => 
            (item.serviceArea === 'Radiology' && (targetModality ? item.modality === targetModality : true)) ||
            (item.serviceArea === 'General Supplies')
        );

        for (const item of matchingItems) {
            if (!mappedItems.some(m => m.consumableId === item.consumableId)) {
                await InventoryApi.addMapping(selectedRoleId, item.consumableId).catch(() => {});
            }
        }
        await loadRoleMappings(selectedRoleId);
    };

    // Role Domain categorization helper
    const getRoleDomain = (rName) => {
        const name = (rName || '').toLowerCase();
        if (name.includes('xray') || name.includes('mri') || name.includes('ct') || name.includes('us') || name.includes('radiolog')) {
            return 'RADIOLOGY';
        }
        if (name.includes('lab') || name.includes('patholog') || name.includes('phlebotom')) {
            return 'LABORATORY';
        }
        return 'GENERAL';
    };

    // Filtering Roles by Domain
    const filteredRoles = roles.filter(role => {
        if (roleDomainFilter === 'ALL') return true;
        return getRoleDomain(role.name) === roleDomainFilter;
    });

    // Catalog filtering for available items
    const filteredAvailableItems = allItems.filter(item => {
        // Exclude already mapped
        const isMapped = Array.isArray(mappedItems) && mappedItems.some(m => m.consumableId === item.consumableId);
        if (isMapped) return false;

        // Search match
        const search = roleSearchQuery.toLowerCase();
        const matchesSearch = !search || item.name.toLowerCase().includes(search) || item.code.toLowerCase().includes(search);
        if (!matchesSearch) return false;

        // Service Area Filter
        if (selectedServiceAreaFilter !== 'ALL') {
            const sa = item.serviceArea || 'Laboratory';
            if (sa !== selectedServiceAreaFilter) return false;
        }

        // Modality Filter (if Radiology)
        if (selectedServiceAreaFilter === 'Radiology' && selectedModalityFilter !== 'ALL') {
            if (item.modality !== selectedModalityFilter) return false;
        }

        // Category Filter (if Laboratory)
        if (selectedServiceAreaFilter === 'Laboratory' && selectedCategoryFilter !== 'ALL') {
            if (item.category !== selectedCategoryFilter) return false;
        }

        return true;
    });

    const filteredAvailableConsumablesForTests = allItems.filter(item => 
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
                <Loader2 className="h-10 w-10 animate-spin text-zinc-700 dark:text-zinc-300" />
            </div>
        );
    }

    return (
        <div className="p-8 flex flex-col h-full space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-zinc-800 dark:text-white flex items-center gap-2.5">
                        <Package className="w-5 h-5 text-synos-primary" /> Inventory Setup & Governance
                    </h1>
                    <p className="text-xs text-zinc-400 mt-1 font-medium">Configure role access, diagnostic test mappings, and domain master classifications</p>
                </div>
            </div>

            {/* Tab switch bar */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-900/60 pb-px gap-6">
                <button
                    onClick={() => setActiveTab('roles')}
                    className={cn(
                        "pb-4 text-xs font-bold uppercase tracking-wider border-b-2 px-1 transition-all flex items-center gap-2",
                        activeTab === 'roles'
                            ? "border-synos-primary text-synos-primary"
                            : "border-transparent text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-300"
                    )}
                >
                    <Shield className="w-4 h-4" /> Role Mappings
                </button>
                <button
                    onClick={() => setActiveTab('test-consumables')}
                    className={cn(
                        "pb-4 text-xs font-bold uppercase tracking-wider border-b-2 px-1 transition-all flex items-center gap-2",
                        activeTab === 'test-consumables' || activeTab === 'test-tubes'
                            ? "border-synos-primary text-synos-primary"
                            : "border-transparent text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-300"
                    )}
                >
                    <Beaker className="w-4 h-4" /> Test & Procedure Mappings
                </button>
                <button
                    onClick={() => setActiveTab('masters')}
                    className={cn(
                        "pb-4 text-xs font-bold uppercase tracking-wider border-b-2 px-1 transition-all flex items-center gap-2",
                        activeTab === 'masters'
                            ? "border-synos-primary text-synos-primary"
                            : "border-transparent text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-300"
                    )}
                >
                    <SlidersHorizontal className="w-4 h-4" /> Master Classifications
                </button>
            </div>

            {/* MAIN CONTENT AREA */}
            {activeTab === 'masters' ? (
                /* MASTER CLASSIFICATIONS TAB */
                <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar">
                    {/* Service Areas Card */}
                    <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-900/60 bg-white dark:bg-zinc-950 shadow-sm flex flex-col gap-4">
                        <div className="flex items-center justify-between pb-3 border-b dark:border-zinc-800 border-zinc-200">
                            <h3 className="text-sm font-semibold dark:text-white flex items-center gap-2">
                                <Layers className="w-4 h-4 text-synos-primary" /> Service Areas
                            </h3>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-synos-primary/10 text-synos-primary">{INVENTORY_SERVICE_AREAS.length} Active</span>
                        </div>
                        <div className="space-y-3">
                            {INVENTORY_SERVICE_AREAS.map(sa => {
                                const count = allItems.filter(i => (i.serviceArea || 'Laboratory') === sa).length;
                                return (
                                    <div key={sa} className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/40 flex justify-between items-center">
                                        <div>
                                            <p className="text-xs font-bold dark:text-zinc-200">{sa}</p>
                                            <p className="text-[10px] text-zinc-400 font-medium">Primary operational domain</p>
                                        </div>
                                        <span className="text-xs font-mono font-bold text-synos-primary bg-synos-primary/10 px-2 py-1 rounded-lg">{count} items</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Laboratory Categories Card */}
                    <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-900/60 bg-white dark:bg-zinc-950 shadow-sm flex flex-col gap-4">
                        <div className="flex items-center justify-between pb-3 border-b dark:border-zinc-800 border-zinc-200">
                            <h3 className="text-sm font-semibold dark:text-white flex items-center gap-2">
                                <Beaker className="w-4 h-4 text-emerald-500" /> Lab Categories
                            </h3>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">3 Categories</span>
                        </div>
                        <div className="space-y-3">
                            {['General', 'Test Consumables', 'Tube Consumables'].map(cat => {
                                const count = allItems.filter(i => i.category === cat).length;
                                return (
                                    <div key={cat} className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/40 flex justify-between items-center">
                                        <div>
                                            <p className="text-xs font-bold dark:text-zinc-200">{cat}</p>
                                            <p className="text-[10px] text-zinc-400 font-medium">Pathology & sample collection</p>
                                        </div>
                                        <span className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">{count} items</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Radiology Modalities Card */}
                    <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-900/60 bg-white dark:bg-zinc-950 shadow-sm flex flex-col gap-4">
                        <div className="flex items-center justify-between pb-3 border-b dark:border-zinc-800 border-zinc-200">
                            <h3 className="text-sm font-semibold dark:text-white flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-purple-500" /> Radiology Modalities
                            </h3>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-500">{RADIOLOGY_MODALITIES.length} Modalities</span>
                        </div>
                        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                            {RADIOLOGY_MODALITIES.map(mod => {
                                const count = allItems.filter(i => i.modality === mod).length;
                                return (
                                    <div key={mod} className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/40 flex justify-between items-center">
                                        <div>
                                            <p className="text-xs font-bold dark:text-zinc-200">{mod}</p>
                                            <p className="text-[10px] text-zinc-400 font-medium">Diagnostic imaging modality</p>
                                        </div>
                                        <span className="text-xs font-mono font-bold text-purple-500 bg-purple-500/10 px-2 py-1 rounded-lg">{count} items</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                /* ROLE MAPPINGS & TEST MAPPINGS VIEWS */
                <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-6">
                    
                    {/* LEFT SIDEBAR: Roles or Tests list */}
                    <div 
                        className="w-full md:w-72 border border-zinc-200 dark:border-zinc-900/60 rounded-2xl overflow-hidden flex flex-col shadow-sm"
                        style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}
                    >
                        {activeTab === 'roles' ? (
                            <>
                                <div 
                                    className="p-4 border-b border-zinc-200 dark:border-zinc-900/60 flex flex-col gap-3"
                                    style={{ backgroundColor: theme === 'dark' ? '#18181b' : '#fafafa' }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-synos-primary" />
                                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">System Roles</span>
                                        </div>
                                        <span className="text-[10px] font-mono font-bold text-zinc-400">{filteredRoles.length}</span>
                                    </div>

                                    {/* Domain Filter Pills */}
                                    <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
                                        {['ALL', 'RADIOLOGY', 'LABORATORY', 'GENERAL'].map(dom => (
                                            <button
                                                key={dom}
                                                onClick={() => setRoleDomainFilter(dom)}
                                                className={cn(
                                                    "py-1 text-[9px] font-extrabold uppercase rounded-lg transition-all truncate",
                                                    roleDomainFilter === dom
                                                        ? "bg-white dark:bg-zinc-800 text-synos-primary shadow-sm"
                                                        : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                                )}
                                            >
                                                {dom === 'RADIOLOGY' ? 'RAD' : dom === 'LABORATORY' ? 'LAB' : dom}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-2.5 space-y-1 custom-scrollbar">
                                    {filteredRoles.map(role => {
                                        const domain = getRoleDomain(role.name);
                                        return (
                                            <button
                                                key={role.roleId}
                                                onClick={() => setSelectedRoleId(role.roleId)}
                                                className={cn(
                                                    "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-98 border",
                                                    selectedRoleId === role.roleId
                                                        ? "text-synos-primary border-synos-primary/20 shadow-sm"
                                                        : "text-zinc-600 dark:text-zinc-400 border-transparent hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50"
                                                )}
                                                style={selectedRoleId === role.roleId ? { backgroundColor: theme === 'dark' ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.08)' } : {}}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className={cn(
                                                        "text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase",
                                                        domain === 'RADIOLOGY' ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" :
                                                        domain === 'LABORATORY' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                                                        "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                                    )}>
                                                        {domain === 'RADIOLOGY' ? 'RAD' : domain === 'LABORATORY' ? 'LAB' : 'GEN'}
                                                    </span>
                                                    <span className="truncate">{role.name}</span>
                                                </div>
                                                {selectedRoleId === role.roleId && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 ml-1" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            /* TEST DIRECTORY */
                            <>
                                <div 
                                    className="p-4 border-b border-zinc-200 dark:border-zinc-900/60 flex flex-col gap-2.5"
                                    style={{ backgroundColor: theme === 'dark' ? '#18181b' : '#fafafa' }}
                                >
                                    <div className="flex border-b border-zinc-200 dark:border-zinc-800 pb-2 gap-4">
                                        <button 
                                            onClick={() => setActiveTab('test-consumables')}
                                            className={cn("text-xs font-bold uppercase transition-all pb-1 border-b-2", activeTab === 'test-consumables' ? "border-synos-primary text-synos-primary" : "border-transparent text-zinc-400")}
                                        >
                                            Reagents
                                        </button>
                                        <button 
                                            onClick={() => setActiveTab('test-tubes')}
                                            className={cn("text-xs font-bold uppercase transition-all pb-1 border-b-2", activeTab === 'test-tubes' ? "border-synos-primary text-synos-primary" : "border-transparent text-zinc-400")}
                                        >
                                            Tubes
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                                        <input 
                                            type="text"
                                            placeholder="Search diagnostic test..."
                                            value={testSearchQuery}
                                            onChange={(e) => setTestSearchQuery(e.target.value)}
                                            className="w-full border border-zinc-200 dark:border-zinc-800 rounded-lg py-1.5 pl-8 pr-2.5 text-xs outline-none focus:ring-1 focus:ring-synos-primary transition-all"
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
                                                        : "text-zinc-600 dark:text-zinc-400 border-transparent hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50"
                                                )}
                                                style={selectedTestId === test.testId ? { backgroundColor: theme === 'dark' ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.08)' } : {}}
                                                title={testName}
                                            >
                                                <span className="truncate font-semibold">{testName}</span>
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
                                className="p-4 border-b border-zinc-200 dark:border-zinc-900/60 flex items-center justify-between flex-wrap gap-2"
                                style={{ backgroundColor: theme === 'dark' ? '#18181b' : '#fafafa' }}
                            >
                                <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-synos-primary" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                                        {activeTab === 'roles' && `Active Mapped Items (${mappedItems.length})`}
                                        {activeTab === 'test-consumables' && `Mapped Test Reagents (${testConsumables.length})`}
                                        {activeTab === 'test-tubes' && `Mapped Specimen Tubes (${testTubes.length})`}
                                    </span>
                                </div>

                                {activeTab === 'roles' && (
                                    <button 
                                        onClick={handleQuickAssignModality}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-synos-primary/10 text-synos-primary border border-synos-primary/20 rounded-lg text-[10px] font-extrabold uppercase hover:bg-synos-primary hover:text-white transition-all shadow-sm"
                                    >
                                        <Zap className="w-3 h-3" />
                                        1-Click Auto Assign Domain Items
                                    </button>
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
                                            <p className="text-[10px] text-zinc-400 mt-0.5 font-medium">Use 1-Click Auto Assign or add items from the catalog below</p>
                                        </div>
                                    ) : (
                                        mappedItems.map(item => {
                                            const isAuto = item.originType === 'AutoDerived';
                                            return (
                                                <div 
                                                    key={item.consumableId}
                                                    className="flex items-center justify-between p-3 border border-zinc-150 dark:border-zinc-900/50 rounded-xl group transition-all"
                                                    style={{ backgroundColor: theme === 'dark' ? '#18181b80' : '#fafafa' }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("p-2 rounded-lg", isAuto ? "bg-amber-500/10 text-amber-500" : "bg-synos-primary/10 text-synos-primary")}>
                                                            {isAuto ? <Zap className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{item.name}</span>
                                                                {isAuto ? (
                                                                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                                                        <Zap className="w-2.5 h-2.5" />
                                                                        Auto-Derived ({item.derivedFromTestName || 'Test Master'})
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                                        Custom Mapping
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-[10px] text-zinc-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                                                                <span>{item.code}</span>
                                                                <span>•</span>
                                                                <span className="text-synos-primary font-semibold">{item.serviceArea || 'Laboratory'}</span>
                                                                {item.modality && <span className="text-purple-500 font-semibold">• {item.modality}</span>}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                                <span className="text-[10px] font-bold text-zinc-400">Used by Tests:</span>
                                                                {(item.derivedFromTestName ? [item.derivedFromTestName, "HbA1c"] : ["CBP", "HbA1c", "ESR"]).map(tName => (
                                                                    <a
                                                                        key={tName}
                                                                        href="/admin/test-master"
                                                                        className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-synos-primary/10 text-synos-primary hover:bg-synos-primary hover:text-white transition-all border border-synos-primary/20"
                                                                    >
                                                                        {tName}
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {!isAuto && (
                                                        <button 
                                                            onClick={() => handleRemoveRoleMapping(item.consumableId)}
                                                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                            title="Remove custom mapping"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )
                                ) : activeTab === 'test-consumables' ? (
                                    /* TEST CONSUMABLES VIEW */
                                    testConsumables.map(mapping => {
                                        const baseUom = mapping.consumable?.unitOfMeasure || 'units';
                                        const dispQty = mapping.displayQuantity ?? (baseUom === 'LITER' ? mapping.quantityPerTest * 1000 : mapping.quantityPerTest);
                                        const dispUnit = mapping.displayUnit || (baseUom === 'LITER' ? 'mL' : baseUom);

                                        return (
                                            <div 
                                                key={mapping.mapId}
                                                className="flex items-center justify-between p-3 border border-zinc-150 dark:border-zinc-900/50 rounded-xl group transition-all hover:border-synos-primary/30"
                                                style={{ backgroundColor: theme === 'dark' ? '#18181b80' : '#fafafa' }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-synos-primary/10 p-2 rounded-lg text-synos-primary">
                                                        <Package className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{mapping.consumable?.name || "Consumable"}</div>
                                                        <div className="text-[10px] text-zinc-450 dark:text-zinc-500 font-mono mt-0.5 flex items-center gap-2">
                                                            <span>{mapping.consumable?.code || "N/A"}</span>
                                                            <span>•</span>
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Stock: {baseUom}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {editingMapId === mapping.mapId ? (
                                                        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-zinc-950 rounded-xl border border-synos-primary/50 shadow-inner">
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                min="0.0001"
                                                                value={editingQtyVal}
                                                                onChange={(e) => setEditingQtyVal(e.target.value)}
                                                                onKeyDown={(e) => e.key === 'Enter' && handleSaveTestConsumableQty(mapping.mapId, baseUom)}
                                                                className="w-20 px-2 py-0.5 text-xs font-bold border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-center"
                                                                autoFocus
                                                            />
                                                            <select
                                                                value={editingUnit}
                                                                onChange={(e) => setEditingUnit(e.target.value)}
                                                                className="px-2 py-0.5 text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none text-synos-primary"
                                                            >
                                                                {getCompatibleUnits(baseUom).map(u => (
                                                                    <option key={u.value} value={u.value}>{u.value}</option>
                                                                ))}
                                                            </select>
                                                            <button
                                                                onClick={() => handleSaveTestConsumableQty(mapping.mapId, baseUom)}
                                                                className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-xs"
                                                                title="Save Changes"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleStartEditQty(mapping.mapId, dispQty, dispUnit)}
                                                            className="group flex flex-col items-end px-3 py-1 rounded-xl bg-synos-primary/5 hover:bg-synos-primary/15 border border-synos-primary/20 transition-all"
                                                            title="Click to edit quantity & unit"
                                                        >
                                                            <div className="flex items-center gap-1.5 text-xs font-extrabold text-synos-primary">
                                                                <span>{dispQty} {dispUnit} / test</span>
                                                                <Pencil className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                                            </div>
                                                            <span className="text-[9px] font-mono text-zinc-400 font-medium mt-0.5">
                                                                (Deducts {mapping.quantityPerTest} {baseUom} stock)
                                                            </span>
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => handleRemoveTestConsumable(mapping.mapId)}
                                                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                        title="Remove mapping"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    /* TEST TUBES VIEW */
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
                                                    <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{mapping.tube?.name || "Tube"}</div>
                                                    <div className="text-[10px] text-zinc-450 dark:text-zinc-500 font-mono mt-0.5">
                                                        {mapping.tube?.code || "N/A"}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {editingMapId === mapping.mapId ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            min="0.0001"
                                                            value={editingQtyVal}
                                                            onChange={(e) => setEditingQtyVal(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveTestTubeQty(mapping.mapId)}
                                                            className="w-16 px-2 py-0.5 text-xs font-bold border border-purple-500 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200"
                                                            autoFocus
                                                        />
                                                        <span className="text-[10px] font-semibold text-purple-400">{mapping.tube?.unitOfMeasure || 'PCS'}</span>
                                                        <button
                                                            onClick={() => handleSaveTestTubeQty(mapping.mapId)}
                                                            className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all"
                                                            title="Save Quantity"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleStartEditQty(mapping.mapId, mapping.quantityPerSample)}
                                                        className="group flex items-center gap-1 text-xs font-extrabold text-purple-600 bg-purple-500/10 hover:bg-purple-600 hover:text-white px-2.5 py-1 rounded-lg transition-all border border-purple-500/20"
                                                        title="Click to edit quantity"
                                                    >
                                                        <span>Qty: {mapping.quantityPerSample} {mapping.tube?.unitOfMeasure || 'PCS'}</span>
                                                        <Pencil className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleRemoveTestTube(mapping.mapId)}
                                                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* BOTTOM PANEL: Available Catalog Filter & Add */}
                        <div 
                            className="h-1/2 border border-zinc-200 dark:border-zinc-900/60 rounded-2xl flex flex-col overflow-hidden shadow-sm"
                            style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}
                        >
                            <div 
                                className="p-4 border-b border-zinc-200 dark:border-zinc-900/60 flex flex-col gap-3"
                                style={{ backgroundColor: theme === 'dark' ? '#18181b' : '#fafafa' }}
                            >
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                        <Search className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                                            Available Catalog ({filteredAvailableItems.length})
                                        </span>
                                    </div>
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                                        <input 
                                            type="text"
                                            placeholder="Search catalog..."
                                            value={roleSearchQuery}
                                            onChange={(e) => setRoleSearchQuery(e.target.value)}
                                            className="w-full border border-zinc-200 dark:border-zinc-800 rounded-xl py-1.5 pl-9 pr-3 text-xs outline-none focus:ring-1 focus:ring-synos-primary transition-all dark:text-white dark:bg-zinc-900"
                                        />
                                    </div>
                                </div>

                                {/* Service Area Filters */}
                                {activeTab === 'roles' && (
                                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t dark:border-zinc-800/60 border-zinc-200">
                                        <span className="text-[10px] font-bold uppercase text-zinc-400">Service Area:</span>
                                        {['ALL', ...INVENTORY_SERVICE_AREAS].map(sa => (
                                            <button
                                                key={sa}
                                                onClick={() => {
                                                    setSelectedServiceAreaFilter(sa);
                                                    setSelectedModalityFilter('ALL');
                                                    setSelectedCategoryFilter('ALL');
                                                }}
                                                className={cn(
                                                    "px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase transition-all border",
                                                    selectedServiceAreaFilter === sa
                                                        ? "bg-synos-primary text-white border-synos-primary shadow-sm"
                                                        : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border-transparent hover:text-zinc-800 dark:hover:text-white"
                                                )}
                                            >
                                                {sa}
                                            </button>
                                        ))}

                                        {/* Modalities Sub-Filter if Radiology */}
                                        {selectedServiceAreaFilter === 'Radiology' && (
                                            <div className="flex items-center gap-1.5 ml-auto overflow-x-auto custom-scrollbar max-w-full">
                                                <span className="text-[10px] font-bold uppercase text-purple-400">Modality:</span>
                                                {['ALL', ...RADIOLOGY_MODALITIES].map(mod => (
                                                    <button
                                                        key={mod}
                                                        onClick={() => setSelectedModalityFilter(mod)}
                                                        className={cn(
                                                            "px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all border",
                                                            selectedModalityFilter === mod
                                                                ? "bg-purple-600 text-white border-purple-600"
                                                                : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                                                        )}
                                                    >
                                                        {mod}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Categories Sub-Filter if Laboratory */}
                                        {selectedServiceAreaFilter === 'Laboratory' && (
                                            <div className="flex items-center gap-1.5 ml-auto">
                                                <span className="text-[10px] font-bold uppercase text-emerald-500">Category:</span>
                                                {['ALL', 'General', 'Test Consumables', 'Tube Consumables'].map(cat => (
                                                    <button
                                                        key={cat}
                                                        onClick={() => setSelectedCategoryFilter(cat)}
                                                        className={cn(
                                                            "px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all border",
                                                            selectedCategoryFilter === cat
                                                                ? "bg-emerald-600 text-white border-emerald-600"
                                                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                        )}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Available catalog list */}
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {activeTab === 'roles' ? (
                                        filteredAvailableItems.map(item => (
                                            <button
                                                key={item.consumableId}
                                                onClick={() => handleAddRoleMapping(item.consumableId)}
                                                className="flex items-center justify-between p-3 border border-zinc-150 dark:border-zinc-900/40 rounded-xl hover:border-synos-primary/40 transition-all text-left group"
                                                style={{ backgroundColor: theme === 'dark' ? '#18181b' : '#fafafa' }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-zinc-100 dark:bg-zinc-850 p-2 rounded-lg text-zinc-400 group-hover:bg-synos-primary/10 group-hover:text-synos-primary transition-colors">
                                                        <Package className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{item.name}</div>
                                                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                                                            <span>{item.code}</span>
                                                            <span>•</span>
                                                            <span className="text-synos-primary font-semibold">{item.serviceArea || 'Laboratory'}</span>
                                                            {item.modality && <span className="text-purple-500 font-semibold">• {item.modality}</span>}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                            <span className="text-[10px] font-bold text-zinc-400">Used by Tests:</span>
                                                            {["CBP", "HbA1c", "ESR"].map(tName => (
                                                                <a
                                                                    key={tName}
                                                                    href="/admin/test-master"
                                                                    className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-synos-primary/10 text-synos-primary hover:bg-synos-primary hover:text-white transition-all border border-synos-primary/20"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    {tName}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Plus className="h-4 w-4 text-zinc-400 group-hover:text-synos-primary transition-colors" />
                                            </button>
                                        ))
                                    ) : activeTab === 'test-consumables' ? (
                                        filteredAvailableConsumablesForTests.map(item => (
                                            <button
                                                key={item.consumableId}
                                                onClick={() => handleAddTestConsumable(item.consumableId)}
                                                className="flex items-center justify-between p-3 border border-zinc-150 dark:border-zinc-900/40 rounded-xl hover:border-synos-primary/40 transition-all text-left group"
                                                style={{ backgroundColor: theme === 'dark' ? '#18181b' : '#fafafa' }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-zinc-100 dark:bg-zinc-850 p-2 rounded-lg text-zinc-400 group-hover:bg-synos-primary/10 group-hover:text-synos-primary transition-colors">
                                                        <Package className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{item.name}</div>
                                                        <div className="text-[10px] text-zinc-450 dark:text-zinc-500 font-mono mt-0.5">{item.code}</div>
                                                    </div>
                                                </div>
                                                <Plus className="h-4 w-4 text-zinc-400 group-hover:text-synos-primary transition-colors" />
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
                                                    <div className="bg-zinc-100 dark:bg-zinc-850 p-2 rounded-lg text-zinc-400 group-hover:bg-synos-primary/10 group-hover:text-synos-primary transition-colors">
                                                        <Package className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{tube.name}</div>
                                                        <div className="text-[10px] text-zinc-450 dark:text-zinc-500 font-mono mt-0.5">{tube.code}</div>
                                                    </div>
                                                </div>
                                                <Plus className="h-4 w-4 text-zinc-400 group-hover:text-synos-primary transition-colors" />
                                            </button>
                                        ))
                                    )}
                                </div>
                                {activeTab === 'roles' && filteredAvailableItems.length === 0 && (
                                    <div className="h-full flex items-center justify-center text-zinc-400 text-xs py-10 font-medium italic">
                                        No available items match the selected Service Area or search query.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
