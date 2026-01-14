import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { useReceptionPanelUI } from '../hooks/useReceptionPanelUI'

// Mock Data for UI Dev phase - Will be replaced by real API useTestMaster()
const MOCK_TEST_MASTER = [
    { code: "CBC", name: "Complete Blood Count", price: 450, category: "Hematology" },
    { code: "LIPID", name: "Lipid Profile", price: 800, category: "Biochemistry" },
    { code: "TSH", name: "Thyroid Stimulating Hormone", price: 350, category: "Biochemistry" },
    { code: "GLU-F", name: "Glucose (Fasting)", price: 150, category: "Biochemistry" },
    { code: "LFT", name: "Liver Function Test", price: 900, category: "Biochemistry" },
    { code: "XR-CHEST", name: "X-Ray Chest PA", price: 600, category: "Radiology" },
    { code: "VIT-D", name: "Vitamin D Total", price: 1200, category: "Special" },
];

export function VisitDetails() {
    const { selectedTestCodes, toggleTestSelection } = useReceptionPanelUI();
    const [filter, setFilter] = useState("");

    // Derived state for display
    const availableTests = MOCK_TEST_MASTER.filter(t =>
        filter === "" ||
        t.name.toLowerCase().includes(filter.toLowerCase()) ||
        t.code.toLowerCase().includes(filter.toLowerCase())
    );

    const selectedTests = MOCK_TEST_MASTER.filter(t => selectedTestCodes.includes(t.code));

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 text-zinc-400 mb-2 mt-6">
                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold border border-synos-border">
                    2
                </div>
                <h3 className="font-medium text-sm text-zinc-200 uppercase tracking-wide">Visit Details</h3>
            </div>

            {/* Test Selection */}
            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search Test Catalog..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full bg-zinc-900 border border-synos-border rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-synos-primary transition-colors placeholder:text-zinc-600"
                    />
                </div>

                {/* Selected Tags */}
                {selectedTests.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 bg-zinc-800/30 rounded-lg border border-dashed border-zinc-700">
                        {selectedTests.map(test => (
                            <div key={test.code} className="bg-synos-surface border border-synos-border rounded-md pl-2 pr-1 py-1 flex items-center gap-2">
                                <span className="text-xs font-medium text-zinc-200">{test.name}</span>
                                <span className="text-xs font-mono text-synos-emerald">₹{test.price}</span>
                                <button
                                    onClick={() => toggleTestSelection(test.code)}
                                    className="p-0.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-red-400 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Catalog List */}
                <div className="max-h-60 overflow-y-auto border border-synos-border rounded-lg bg-zinc-900/50 scrollbar-thin scrollbar-thumb-zinc-700">
                    {availableTests.map(test => {
                        const isSelected = selectedTestCodes.includes(test.code);
                        return (
                            <div
                                key={test.code}
                                onClick={() => toggleTestSelection(test.code)}
                                className={`
                                    p-2.5 border-b border-synos-border last:border-0 flex justify-between items-center cursor-pointer transition-colors
                                    ${isSelected ? 'bg-synos-primary/10' : 'hover:bg-zinc-800'}
                                `}
                            >
                                <div>
                                    <div className={`text-sm font-medium ${isSelected ? 'text-synos-primary' : 'text-zinc-300'}`}>
                                        {test.name}
                                    </div>
                                    <div className="text-xs text-zinc-500 font-mono">{test.code} • {test.category}</div>
                                </div>
                                <div className="text-sm font-mono text-zinc-400">
                                    ₹{test.price}
                                </div>
                            </div>
                        )
                    })}
                    {availableTests.length === 0 && (
                        <div className="p-4 text-center text-xs text-zinc-500 italic">
                            No tests found matching "{filter}"
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
