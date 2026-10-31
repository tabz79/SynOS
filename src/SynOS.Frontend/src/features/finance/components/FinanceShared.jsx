import React from 'react';
import { IndianRupee, ArrowUpRight, ArrowDownRight, Clock, ExternalLink } from 'lucide-react';

export const SummaryCard = ({ title, value, type = 'neutral' }) => (
  <div className="p-6 rounded-xl border dark:border-zinc-800 border-zinc-200 dark:bg-zinc-900/40 bg-white shadow-sm flex flex-col gap-2">
    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-500">{title}</p>
    <div className="flex items-center justify-between">
      <p className="text-2xl font-bold dark:text-zinc-100 text-zinc-900">
        <span className="text-xs font-normal text-zinc-400 mr-1">₹</span>{value}
      </p>
      {type === 'positive' && <ArrowUpRight className="w-4 h-4 text-emerald-500" />}
      {type === 'negative' && <ArrowDownRight className="w-4 h-4 text-rose-500" />}
    </div>
  </div>
);

export const ActivityItem = ({ title, meta, amount, time }) => (
  <div className="flex items-center justify-between p-3 border-b dark:border-zinc-900 border-zinc-100 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-semibold dark:text-zinc-200">{title}</p>
      <p className="text-[10px] uppercase text-zinc-500">{meta}</p>
    </div>
    <div className="text-right">
      <p className="text-xs font-bold dark:text-zinc-200">₹{amount}</p>
      <p className="text-[10px] text-zinc-400">{time}</p>
    </div>
  </div>
);

export const SectionHeader = ({ title }) => (
  <div className="flex items-center justify-between mb-3 mt-6 px-1">
    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">{title}</h3>
  </div>
);

export const DepartmentOverview = ({ title, description, stats, activity, shortcuts }) => (
  <div className="p-8 w-full space-y-4">
    <div className="flex flex-col gap-1 mb-6">
      <h1 className="text-2xl font-bold dark:text-white text-zinc-900">{title}</h1>
      <p className="text-sm text-zinc-500">{description}</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => <SummaryCard key={i} {...stat} />)}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
      <div className="lg:col-span-2">
        <SectionHeader title="Recent Activity" />
        <div className="rounded-xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-900/20 overflow-hidden shadow-sm">
          {activity.map((item, i) => <ActivityItem key={i} {...item} />)}
        </div>
      </div>
      <div>
        <SectionHeader title="Quick Actions" />
        <div className="space-y-2">
          {shortcuts.map((sc, i) => (
            <button key={i} className="w-full flex items-center justify-between p-4 rounded-xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-900/40 hover:border-synos-primary/50 transition-all group">
              <span className="text-xs font-medium dark:text-zinc-300 group-hover:text-synos-primary transition-colors">{sc}</span>
              <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-synos-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);
