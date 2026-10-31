import React from 'react';
import { Lock, Info } from 'lucide-react';

export function AttendanceCalendar({ statuses, isLocked, onDateClick }) {
    // Generate days for the month based on the first status date
    if (!statuses || statuses.length === 0) return null;

    const firstDate = new Date(statuses[0].date);
    const month = firstDate.toLocaleString('default', { month: 'long' });
    const year = firstDate.getFullYear();

    const daysInMonth = new Date(year, firstDate.getMonth() + 1, 0).getDate();
    const startDay = new Date(year, firstDate.getMonth(), 1).getDay();

    const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
        const dateStr = `${year}-${String(firstDate.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
        const status = statuses.find(s => s.date === dateStr);
        return { day: i + 1, dateStr, status };
    });

    const blanks = Array.from({ length: startDay }, (_, i) => i);

    const todayStr = new Date().toISOString().split('T')[0];

    return (
        <div className="dark:bg-zinc-900/50 bg-white border dark:border-zinc-800 border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b dark:border-zinc-800 border-zinc-100 bg-zinc-50 dark:bg-zinc-950/50 flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">{month} {year}</h3>
                {isLocked && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold border border-amber-500/20">
                        <Lock className="w-3 h-3" /> PERIOD LOCKED
                    </div>
                )}
            </div>
            
            <div className="p-4">
                <div className="grid grid-cols-7 gap-px dark:bg-zinc-800 bg-zinc-100 border dark:border-zinc-800 border-zinc-100 rounded-lg overflow-hidden">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="bg-zinc-50 dark:bg-zinc-900/80 p-2 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                            {d}
                        </div>
                    ))}
                    
                    {blanks.map(b => (
                        <div key={`blank-${b}`} className="bg-white dark:bg-zinc-950/30 p-4" />
                    ))}
                    
                    {calendarDays.map(d => {
                        const isToday = d.dateStr === todayStr;
                        return (
                            <div 
                                key={d.day} 
                                onClick={() => !isLocked && onDateClick?.(d)}
                                className={`bg-white dark:bg-zinc-950/50 p-2 h-16 relative transition-all group ${
                                    !isLocked ? 'hover:bg-synos-primary/10 cursor-pointer' : ''
                                } ${d.status?.status === 'Upcoming' ? 'opacity-60 dark:opacity-40 grayscale-[0.5]' : ''}`}
                            >
                                {/* Today Highlighter */}
                                {isToday && (
                                    <div className="absolute inset-1 rounded-xl border-2 border-synos-primary bg-synos-primary/5 z-0" />
                                )}

                                <div className="relative z-10 flex justify-between items-start">
                                    <span className={`text-[9px] font-bold font-mono transition-colors ${
                                        isToday ? 'text-synos-primary' : 
                                        d.status?.status === 'Upcoming' ? 'text-zinc-500' : 
                                        'text-zinc-400 group-hover:text-synos-primary'
                                    }`}>
                                        {d.day}
                                    </span>
                                </div>
                                
                                {d.status && (
                                    <div className={`absolute inset-1 rounded-xl flex items-end justify-center pb-2 transition-all group-hover:inset-0 group-hover:rounded-none z-1 ${
                                        d.status.status === 'Present' ? 'bg-emerald-500/5' :
                                        d.status.status === 'Leave' ? 'bg-amber-500/10' :
                                        d.status.status === 'Upcoming' ? 'bg-zinc-200/30 dark:bg-zinc-800/20' :
                                        'bg-rose-500/10'
                                    }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ring-4 ${
                                            d.status.status === 'Present' ? 'bg-emerald-500 ring-emerald-500/20' :
                                            d.status.status === 'Leave' ? 'bg-amber-500 ring-amber-500/20' :
                                            d.status.status === 'Upcoming' ? 'bg-zinc-300 dark:bg-zinc-700 ring-transparent' :
                                            'bg-rose-500 ring-rose-500/20'
                                        }`} />
                                    </div>
                                )}
                                
                                {d.status?.isLeave && (
                                    <div className="absolute top-1.5 right-1.5 z-10">
                                        <Info className="w-3 h-3 text-amber-500 opacity-60 hover:opacity-100 transition-opacity" title={d.status.leaveType} />
                                    </div>
                                )}

                                {/* Selection indicator border */}
                                <div className="absolute inset-0 border-2 border-synos-primary opacity-0 group-active:opacity-100 group-focus:opacity-100 transition-opacity pointer-events-none z-20" />
                            </div>
                        );
                    })}
                </div>
                
                <div className="mt-4 flex flex-wrap gap-4 text-[9px] font-bold uppercase text-zinc-500">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" /> Present
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-amber-500" /> Approved Leave
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-rose-500" /> Absent/LOP
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700" /> Planned / Upcoming
                    </div>
                </div>
            </div>
        </div>
    );
}
