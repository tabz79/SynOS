import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, ChevronRight, User, MapPin } from 'lucide-react';
import { InventoryApi } from '@/api/inventory';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function PendingRequestsQueue() {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [filter, setFilter] = useState('pending'); // pending | history

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        setIsLoading(true);
        try {
            const data = await InventoryApi.getPendingRequests(user.branchId);
            setRequests(data);
        } catch (err) {
            console.error("Failed to load requests", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFulfill = async (requestId) => {
        if (!confirm("Are you sure you want to fulfill this request? This will deduct stock from the oldest lots.")) return;
        
        setIsProcessing(true);
        try {
            await InventoryApi.fulfillRequest(requestId);
            await loadRequests();
        } catch (err) {
            alert(err.response?.data?.message || "Fulfillment failed.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleIgnore = async (requestId) => {
        if (!confirm("Ignore this request?")) return;
        
        try {
            await InventoryApi.ignoreRequest(requestId);
            await loadRequests();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Header Area */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Inventory Fulfillment</h1>
                    <p className="text-zinc-500 text-sm">Manage manual stock requests from branch staff</p>
                </div>
                <button 
                    onClick={loadRequests}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-white/5 rounded-lg text-sm text-zinc-400 hover:text-white transition-all active:scale-95"
                >
                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    Refresh
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-h-0 bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden flex flex-col shadow-2xl">
                {/* Stats Bar */}
                <div className="grid grid-cols-4 border-b border-white/5 divide-x divide-white/5">
                    <div className="p-4 text-center">
                        <div className="text-2xl font-bold text-amber-500">{requests.length}</div>
                        <div className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">Pending Requests</div>
                    </div>
                    <div className="p-4 text-center">
                        <div className="text-2xl font-bold text-white">0</div>
                        <div className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">Low Stock Alerts</div>
                    </div>
                    {/* Placeholder stats */}
                    <div className="p-4 text-center opacity-20">
                        <div className="text-2xl font-bold text-white">-</div>
                        <div className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">Turnaround Time</div>
                    </div>
                    <div className="p-4 text-center opacity-20">
                        <div className="text-2xl font-bold text-white">-</div>
                        <div className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">Waste Optimization</div>
                    </div>
                </div>

                {/* Queue List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                            <RefreshCw className="h-10 w-10 animate-spin opacity-20 mb-4" />
                            <p className="font-medium">Syncing with Central Store...</p>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-white/5 rounded-2xl">
                            <CheckCircle2 className="h-12 w-12 opacity-10 mb-4" />
                            <p className="text-lg font-medium">All requests fulfilled</p>
                            <p className="text-sm opacity-60">Enjoy the operational silence</p>
                        </div>
                    ) : (
                        requests.map((req, idx) => (
                            <motion.div 
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                key={req.requestId}
                                className="group relative bg-zinc-900 border border-white/5 rounded-xl p-5 hover:border-emerald-500/30 hover:bg-zinc-800/50 transition-all shadow-lg"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-4">
                                        <div className="mt-1 rounded-full bg-amber-500/10 p-3 text-amber-500 ring-4 ring-amber-500/5">
                                            <Package className="h-6 w-6" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-white">{req.consumableName}</h3>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-500 border border-white/5">{req.consumableCode}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-zinc-500">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="h-3 w-3 text-emerald-400" />
                                                    <span className="text-zinc-200 font-semibold">{req.requestedByUserName || req.requestedByName}</span>
                                                    <span className="text-[10px] text-zinc-400">({req.requestedByUserRole || 'Admin'})</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-bold uppercase text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                                                        Screen: {req.requestedFromScreen || 'Reception'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="h-3 w-3" />
                                                    <span>{formatDistanceToNow(new Date(req.requestedAt))} ago</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="h-3 w-3" />
                                                    <span>{req.branchName}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <div className="text-3xl font-black text-white tracking-tight">{req.quantity}</div>
                                        <div className="text-[10px] uppercase font-black text-emerald-500 tracking-widest">{req.unitOfMeasure} requested</div>
                                    </div>
                                </div>

                                {/* Action Bar (Reveals on Hover) */}
                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between opacity-60 group-hover:opacity-100 transition-all">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500">
                                        <AlertCircle className="h-3 w-3" />
                                        FIFO DEDUCTION WILL BE APPLIED
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => handleIgnore(req.requestId)}
                                            className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all"
                                        >
                                            Ignore
                                        </button>
                                        <button 
                                            onClick={() => handleFulfill(req.requestId)}
                                            disabled={isProcessing}
                                            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-900/20 active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            {isProcessing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                            Fulfill Request
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
