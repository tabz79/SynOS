import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Package, Plus, Trash2, Search, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { InventoryApi } from '@/api/inventory';
import { AdminApi } from '@/api/admin';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';

export function ImsRoleMappingScreen() {
    const { theme } = useTheme();
    const [roles, setRoles] = useState([]);
    const [allItems, setAllItems] = useState([]);
    const [selectedRoleId, setSelectedRoleId] = useState(null);
    const [mappedItems, setMappedItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMappingLoading, setIsMappingLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedRoleId) {
            loadMappings(selectedRoleId);
        }
    }, [selectedRoleId]);

    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            const [rolesData, itemsData] = await Promise.all([
                AdminApi.getRoles(),
                InventoryApi.getAllActiveItems()
            ]);
            setRoles(rolesData);
            setAllItems(itemsData);
            if (rolesData.length > 0) {
                setSelectedRoleId(rolesData[0].roleId);
            }
        } catch (err) {
            console.error("Failed to load initial data", err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMappings = async (roleId) => {
        setIsMappingLoading(true);
        try {
            const data = await InventoryApi.getMappings(roleId);
            setMappedItems(data);
        } catch (err) {
            console.error("Failed to load mappings", err);
        } finally {
            setIsMappingLoading(false);
        }
    };

    const handleAddMapping = async (consumableId) => {
        try {
            await InventoryApi.addMapping(selectedRoleId, consumableId);
            await loadMappings(selectedRoleId);
        } catch (err) {
            console.error(err);
        }
    };

    const handleRemoveMapping = async (consumableId) => {
        try {
            await InventoryApi.removeMapping(selectedRoleId, consumableId);
            await loadMappings(selectedRoleId);
        } catch (err) {
            console.error(err);
        }
    };

    const filteredAllItems = allItems.filter(item => 
        !mappedItems.some(m => m.consumableId === item.consumableId) &&
        (item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
         item.code.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-zinc-700" />
            </div>
        );
    }

    return (
        <div className="p-8 flex flex-col h-full space-y-8 animate-in fade-in duration-300">
            <div>
                <h1 className="text-xl font-semibold tracking-tight text-zinc-800 dark:text-white flex items-center gap-2.5">
                    <Package className="w-5 h-5 text-synos-primary" /> Inventory Role Mapping
                </h1>
                <p className="text-xs text-zinc-400 mt-1 font-medium">Define "Essential Items" that are visible by default for each laboratory role</p>
            </div>

            <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-6">
                {/* Roles Sidebar */}
                <div 
                    className="w-full md:w-64 border border-zinc-200 dark:border-zinc-900/60 rounded-2xl overflow-hidden flex flex-col shadow-sm"
                    style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}
                >
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
                </div>

                {/* Mapping Workspace */}
                <div className="flex-1 flex flex-col gap-6">
                    {/* Active Mappings */}
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
                                    Mapped Essential Items ({mappedItems.length})
                                </span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {isMappingLoading ? (
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
                                            onClick={() => handleRemoveMapping(item.consumableId)}
                                            className="p-1.5 text-zinc-400 dark:text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all md:opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Add Mappings Selector */}
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
                                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Available Items Catalog</span>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                                <input 
                                    type="text"
                                    placeholder="Quick search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full border border-zinc-200 dark:border-zinc-800 rounded-xl py-1.5 pl-9.5 pr-3 text-xs outline-none focus:ring-1 focus:ring-synos-primary focus:border-synos-primary transition-all shadow-sm shadow-black/[0.02] placeholder-zinc-400"
                                    style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff', color: theme === 'dark' ? '#f4f4f5' : '#18181b', colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {filteredAllItems.map(item => (
                                    <button
                                        key={item.consumableId}
                                        onClick={() => handleAddMapping(item.consumableId)}
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
                                ))}
                            </div>
                            {filteredAllItems.length === 0 && (
                                <div className="h-full flex items-center justify-center text-zinc-450 dark:text-zinc-500 text-xs py-10 font-medium italic">
                                    All items are already mapped or no items match search.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
