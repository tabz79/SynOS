import React from 'react';
import { useAuth } from '@/context/AuthContext';

export function AdminPlaceholder() {
    const { logout } = useAuth();

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center dark:bg-zinc-950 bg-zinc-50 font-mono uppercase tracking-widest text-xs">
            <div className="dark:text-zinc-500 text-zinc-400 mb-8">
                Admin Control Tower (Placeholder)
            </div>
            <button 
                onClick={logout}
                className="px-6 py-2 border dark:border-zinc-800 border-zinc-200 dark:text-zinc-400 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-all rounded"
            >
                Terminate Session (Logout)
            </button>
        </div>
    );
}
