import { useState } from 'react'
import { Plus, Users, ClipboardList, Bed, Clock } from 'lucide-react'
import { SystemBar } from '@/components/layout/SystemBar'
import { RealitySummary } from '@/components/layout/RealitySummary'
import { ActionQueue, ActionQueueHeader } from '@/components/layout/ActionQueue'
import { AuditPanel } from '@/components/layout/AuditPanel'

function App() {
  const [activeQueue, setActiveQueue] = useState("pending");

  // Dummy Reality Data
  const realityTiles = [
    { value: "185", label: "Active Patients", icon: Users, color: "amber" },
    { value: "42", label: "Pending Tasks", icon: ClipboardList, color: "red" },
    { value: "94%", label: "Bed Occupancy", icon: Bed, color: "emerald" },
    { value: "12m", label: "Avg. Wait Time", icon: Clock, color: "default" },
  ];

  // Dummy Queue Data
  const queueColumns = [
    { header: "Token ID", accessor: "token", className: "font-mono text-zinc-400" },
    { header: "Patient Name", accessor: "name", className: "font-medium text-white" },
    {
      header: "Status",
      accessor: "status",
      render: (row) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${row.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' :
          row.status === 'Blocked' ? 'bg-red-500/10 text-red-500' :
            'bg-emerald-500/10 text-emerald-500'
          }`}>
          {row.status}
        </span>
      )
    },
    { header: "Waiting", accessor: "waiting", className: "font-mono text-zinc-500" },
    { header: "Description", accessor: "description", className: "text-zinc-500" },
  ];

  const queueData = [
    { token: "P-2026-14592", name: "Rahul Deshmukh", status: "Pending", waiting: "12m", description: "Registration Incomplete" },
    { token: "P-2026-14601", name: "Anjali Gupta", status: "Blocked", waiting: "45m", description: "Insurance Failed" },
    { token: "P-2026-14588", name: "Vikram Singh", status: "Finalized", waiting: "Completed", description: "Discharge Processed" },
    { token: "P-2026-14601", name: "Priya Sharma", status: "Blocked", waiting: "45m", description: "Insurance Failed" },
    { token: "P-2026-14588", name: "Amit Kumar", status: "Finalized", waiting: "Completed", description: "Discharge Processed" },
    { token: "P-2026-14592", name: "Neha Patel", status: "Pending", waiting: "45m", description: "Registration Incomplete" },
    { token: "P-2026-14592", name: "Suresh Reddy", status: "Pending", waiting: "30m", description: "Registration Incomplete" },
    { token: "P-2026-14601", name: "Priya Sharma", status: "Blocked", waiting: "45m", description: "Insurance Failed" },
  ];

  return (
    <div className="h-screen w-screen bg-synos-background text-synos-foreground flex flex-col overflow-hidden font-sans selection:bg-white/20">
      {/* 1. Global System Bar */}
      <SystemBar />

      <div className="flex-1 p-4 overflow-hidden">
        <div className="grid grid-cols-[3fr_1fr] gap-4 h-full">

          {/* Left Column: Reality + Work */}
          <div className="flex flex-col min-h-0">

            {/* Header for Reality Summary */}
            <div className="mb-4">
              <h2 className="text-lg font-medium text-zinc-200 mb-2 px-1">Reality Summary</h2>
              <RealitySummary tiles={realityTiles} />
            </div>

            {/* Action Queues */}
            <div className="flex-1 flex flex-col min-h-0">
              <ActionQueueHeader title="Action Queues" count={queueData.length} />
              <ActionQueue columns={queueColumns} data={queueData} />
            </div>
          </div>

          {/* Right Column: Audit Panel */}
          <div className="min-h-0">
            <AuditPanel />
          </div>

        </div>
      </div>
    </div>
  )
}

export default App
