import React from 'react';

export const FinanceScreen = () => {
  return (
    <div className="h-screen w-screen bg-synos-background flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold dark:text-white text-zinc-900 mb-4">Finance Module</h1>
        <p className="text-zinc-500 max-w-md mx-auto">
          Welcome to the SynOS Finance Intelligence Hub. This module is currently under development based on the GPT-5 Operational Position implementation plan.
        </p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
            <h3 className="font-semibold mb-2">Operational Position</h3>
            <p className="text-sm text-zinc-400">Real-time tracking of recognized revenue vs actual settled cash movement.</p>
          </div>
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
            <h3 className="font-semibold mb-2">Settlement Maturity</h3>
            <p className="text-sm text-zinc-400">Audit-ready visibility into payables and receivables aging.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
