import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export function RoleTakeoverBanner({ roleName }) {
    const navigate = useNavigate();
    const { user } = useAuth();

    const isAdmin = user?.role === 'Admin' || user?.role === 'SystemAdmin' || 
                   (Array.isArray(user?.role) && (user.role.includes('Admin') || user.role.includes('SystemAdmin')));

    // Only show if the user is an Admin acting in an operational role
    if (!user || !isAdmin) {
        return null;
    }

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] h-10 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 shadow-xl">
            <div className="flex items-center gap-3">
                <div className="bg-synos-primary/10 p-1 rounded">
                    <ShieldAlert className="w-4 h-4 text-synos-primary" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                    Role Takeover Active: <span className="text-white font-bold">{roleName}</span>
                </span>
            </div>
            
            <button 
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-white transition-colors group"
            >
                <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                Exit Role → Back to Control Tower
            </button>
        </div>
    );
}
