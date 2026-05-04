import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Package, Plus, Trash2, Search, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { InventoryApi } from '@/api/inventory';
import { AdminApi } from '@/api/admin';
import { cn } from '@/lib/utils';

export function ImsRoleMappingScreen() {
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
        <div className="flex flex-col h-full space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Inventory Role Mapping</h1>
                <p className="text-zinc-500 text-sm">Define "Essential Items" for each laboratory role</p>
            </div>

            <div className="flex-1 min-h-0 flex gap-6">
                {/* Roles Sidebar */}
                <div className="w-64 bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-zinc-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">System Roles</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {roles.map(role => (
                            <button
                                key={role.roleId}
                                onClick={() => setSelectedRoleId(role.roleId)}
                                className={cn(
                                    "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all",
                                    selectedRoleId === role.roleId
                                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-900/20"
                                        : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                {role.name}
                                {selectedRoleId === role.roleId && <CheckCircle2 className="h-4 w-4" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mapping Workspace */}
                <div className="flex-1 flex flex-col gap-6">
                    {/* Active Mappings */}
                    <div className="flex-1 bg-zinc-900/50 border border-white/5 rounded-2xl flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-emerald-500" />
                                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                    Mapped Essential Items ({mappedItems.length})
                                </span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {isMappingLoading ? (
                                <div className="h-full flex items-center justify-center opacity-20">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : mappedItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-40">
                                    <AlertCircle className="h-10 w-10 mb-2" />
                                    <p className="text-sm font-medium">No items mapped to this role</p>
                                    <p className="text-xs">Staff will have to use the escape hatch by default</p>
                                </div>
                            ) : (
                                mappedItems.map(item => (
                                    <div 
                                        key={item.consumableId}
                                        className="flex items-center justify-between p-3 bg-zinc-900 border border-white/5 rounded-xl group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500">
                                                <Package className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white">{item.name}</div>
                                                <div className="text-[10px] text-zinc-500 font-mono">{item.code}</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveMapping(item.consumableId)}
                                            className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Add Mappings Selector */}
                    <div className="h-1/2 bg-zinc-900 border border-white/5 rounded-2xl flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Search className="h-4 w-4 text-zinc-500" />
                                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Available Items Catalog</span>
                            </div>
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-600" />
                                <input 
                                    type="text"
                                    placeholder="Quick search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 pl-8 pr-3 text-xs text-white outline-none focus:border-emerald-500/50 transition-all"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <div className="grid grid-cols-2 gap-3">
                                {filteredAllItems.map(item => (
                                    <button
                                        key={item.consumableId}
                                        onClick={() => handleAddMapping(item.consumableId)}
                                        className="flex items-center justify-between p-3 bg-black/20 border border-white/5 rounded-xl hover:border-emerald-500/50 hover:bg-white/5 transition-all text-left group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-zinc-800 p-2 rounded-lg text-zinc-500 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-colors">
                                                <Package className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors">{item.name}</div>
                                                <div className="text-[10px] text-zinc-600 font-mono">{item.code}</div>
                                            </div>
                                        </div>
                                        <Plus className="h-4 w-4 text-zinc-700 group-hover:text-emerald-500 transition-colors" />
                                    </button>
                                ))}
                            </div>
                            {filteredAllItems.length === 0 && (
                                <div className="h-full flex items-center justify-center text-zinc-600 text-xs py-10">
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
