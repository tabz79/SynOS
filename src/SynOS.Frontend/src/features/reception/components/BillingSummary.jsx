import { useReceptionPanelUI } from '../hooks/useReceptionPanelUI'

// Mock Data - Duplicate for now, should be shared context/hook
const MOCK_TEST_CATALOG = {
    "CBC": 450,
    "LIPID": 800,
    "TSH": 350,
    "GLU-F": 150,
    "LFT": 900,
    "XR-CHEST": 600,
    "VIT-D": 1200
};

export function BillingSummary() {
    const { selectedTestCodes } = useReceptionPanelUI();

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 text-zinc-400 mb-2 mt-6">
                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold border border-synos-border">
                    3
                </div>
                <h3 className="font-medium text-sm text-zinc-200 uppercase tracking-wide">Billing</h3>
            </div>

            <div className="bg-zinc-950 border border-synos-border rounded-lg p-4 space-y-4">
                <div className="space-y-2">
                    {selectedTestCodes.map(code => (
                        <div key={code} className="flex justify-between text-sm">
                            <span className="text-zinc-400">{code}</span>
                            <span className="font-mono text-zinc-300">₹{MOCK_TEST_CATALOG[code] || '---'}</span>
                        </div>
                    ))}
                    {selectedTestCodes.length === 0 && (
                        <div className="text-xs text-zinc-600 italic text-center py-2">No tests selected</div>
                    )}
                </div>

                <div className="border-t border-dashed border-zinc-800 pt-3">
                    <div className="flex justify-between items-center bg-synos-surface p-2 rounded text-zinc-300 text-xs">
                        <span className="font-semibold uppercase tracking-wider">Prices shown are List Price</span>
                    </div>
                    <div className="mt-2 text-[10px] text-zinc-500 text-center">
                        Final bill, discounts, and taxes are calculated by the backend upon commit.
                    </div>
                </div>
            </div>
        </div>
    )
}
