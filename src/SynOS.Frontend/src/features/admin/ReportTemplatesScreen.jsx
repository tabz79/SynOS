import React, { useState } from 'react';
import { 
  Columns, 
  Layout, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Save, 
  FileText,
  Eye,
  Sliders,
  Type,
  Plus,
  Trash2,
  List,
  Check
} from 'lucide-react';
import { cn } from "@/lib/utils";

const INITIAL_TEMPLATES = [
  {
    id: "mod-cbc",
    modality: "Hematology",
    title: "Hematology Lab Template",
    columns: [
      { code: "Parameter", title: "Test Parameter", weight: 3, alignment: "Left", bold: true },
      { code: "Value", title: "Observed Value", weight: 2, alignment: "Center", bold: false },
      { code: "Unit", title: "Unit", weight: 1, alignment: "Center", bold: false },
      { code: "ReferenceRange", title: "Reference Ranges", weight: 3, alignment: "Right", bold: false }
    ],
    signatureSlots: [
      { slotId: 0, title: "Lab Technician", required: true },
      { slotId: 1, title: "Pathologist", required: true },
      { slotId: 2, title: "Director", required: false }
    ]
  },
  {
    id: "mod-lft",
    modality: "Biochemistry",
    title: "Biochemistry standard 3-Column template",
    columns: [
      { code: "Parameter", title: "Analysis", weight: 4, alignment: "Left", bold: true },
      { code: "Value", title: "Result", weight: 3, alignment: "Center", bold: false },
      { code: "ReferenceRange", title: "Biological Reference Interval", weight: 4, alignment: "Right", bold: false }
    ],
    signatureSlots: [
      { slotId: 0, title: "Biochemist", required: true },
      { slotId: 1, title: "Consultant Pathologist", required: true }
    ]
  }
];

export function ReportTemplatesScreen() {
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState(INITIAL_TEMPLATES[0]);
  const [activeTab, setActiveTab] = useState("columns"); // columns | signatures | layout
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);

  // Column form states
  const [newColCode, setNewColCode] = useState("");
  const [newColTitle, setNewColTitle] = useState("");
  const [newColWeight, setNewColWeight] = useState("2");
  const [newColAlignment, setNewColAlignment] = useState("Left");
  const [newColBold, setNewColBold] = useState(false);

  // Signature Slot Form States
  const [newSlotTitle, setNewSlotTitle] = useState("");
  const [newSlotRequired, setNewSlotRequired] = useState(false);

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setIsSavedSuccessfully(false);
  };

  const handleUpdateColumn = (index, field, value) => {
    const updatedCols = [...selectedTemplate.columns];
    updatedCols[index] = {
      ...updatedCols[index],
      [field]: value
    };

    const updatedTemplate = {
      ...selectedTemplate,
      columns: updatedCols
    };

    setSelectedTemplate(updatedTemplate);
    setTemplates(templates.map(t => t.id === selectedTemplate.id ? updatedTemplate : t));
  };

  const handleAddColumn = (e) => {
    e.preventDefault();
    if (!newColCode || !newColTitle) return;

    const newCol = {
      code: newColCode,
      title: newColTitle,
      weight: Number(newColWeight) || 1,
      alignment: newColAlignment,
      bold: newColBold
    };

    const updatedTemplate = {
      ...selectedTemplate,
      columns: [...selectedTemplate.columns, newCol]
    };

    setSelectedTemplate(updatedTemplate);
    setTemplates(templates.map(t => t.id === selectedTemplate.id ? updatedTemplate : t));

    setNewColCode("");
    setNewColTitle("");
    setNewColWeight("2");
    setNewColAlignment("Left");
    setNewColBold(false);
  };

  const handleDeleteColumn = (index) => {
    const updatedCols = selectedTemplate.columns.filter((_, idx) => idx !== index);
    const updatedTemplate = {
      ...selectedTemplate,
      columns: updatedCols
    };

    setSelectedTemplate(updatedTemplate);
    setTemplates(templates.map(t => t.id === selectedTemplate.id ? updatedTemplate : t));
  };

  const handleAddSignatureSlot = (e) => {
    e.preventDefault();
    if (!newSlotTitle) return;

    const newSlot = {
      slotId: selectedTemplate.signatureSlots.length,
      title: newSlotTitle,
      required: newSlotRequired
    };

    const updatedTemplate = {
      ...selectedTemplate,
      signatureSlots: [...selectedTemplate.signatureSlots, newSlot]
    };

    setSelectedTemplate(updatedTemplate);
    setTemplates(templates.map(t => t.id === selectedTemplate.id ? updatedTemplate : t));

    setNewSlotTitle("");
    setNewSlotRequired(false);
  };

  const handleDeleteSignatureSlot = (slotId) => {
    const updatedSlots = selectedTemplate.signatureSlots
      .filter(s => s.slotId !== slotId)
      .map((s, idx) => ({ ...s, slotId: idx })); // re-index

    const updatedTemplate = {
      ...selectedTemplate,
      signatureSlots: updatedSlots
    };

    setSelectedTemplate(updatedTemplate);
    setTemplates(templates.map(t => t.id === selectedTemplate.id ? updatedTemplate : t));
  };

  const handleSaveAll = () => {
    setIsSavedSuccessfully(true);
    setTimeout(() => setIsSavedSuccessfully(false), 3000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <Layout className="w-6 h-6 text-synos-primary" />
            Report Templates
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Customize default column structures, alignments, weights, and pathologist signature slots per modality.
          </p>
        </div>
        <button
          id="btn-save-template-config"
          onClick={handleSaveAll}
          className="px-6 py-2.5 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-synos-primary/10 active:scale-95 transition-all flex items-center gap-2"
        >
          {isSavedSuccessfully ? (
            <>
              <Check className="w-4 h-4 text-white animate-bounce" /> Saved Successfully
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Save Layout Changes
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Panel: Available Modality Templates */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Modality Templates</span>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {templates.map(t => (
              <button
                key={t.id}
                id={`template-item-${t.id}`}
                onClick={() => handleSelectTemplate(t)}
                className={cn(
                  "w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-2 group",
                  selectedTemplate.id === t.id
                    ? "bg-synos-primary/10 border-synos-primary/30 text-zinc-900 dark:text-white"
                    : "bg-white dark:bg-zinc-900/10 border-zinc-200 dark:border-zinc-800/80 text-zinc-650 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
              >
                <span className="font-bold text-sm tracking-tight text-zinc-800 dark:text-zinc-200 block uppercase">{t.modality}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed block">{t.title}</span>
                <div className="flex items-center gap-3 mt-1 text-[10px] font-bold">
                  <span className="bg-synos-primary/10 text-synos-primary border border-synos-primary/20 px-2 py-0.5 rounded">{t.columns.length} Columns</span>
                  <span className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-2 py-0.5 rounded">{t.signatureSlots.length} Signature Spots</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel: Template customizer workspace */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
          {/* Tab selector */}
          <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3 shrink-0">
            <button
              onClick={() => setActiveTab("columns")}
              className={cn(
                "px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all",
                activeTab === "columns" ? "bg-synos-primary/10 text-synos-primary border border-synos-primary/20" : "text-zinc-450 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              )}
            >
              Table Columns Definition
            </button>
            <button
              onClick={() => setActiveTab("signatures")}
              className={cn(
                "px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all",
                activeTab === "signatures" ? "bg-synos-primary/10 text-synos-primary border border-synos-primary/20" : "text-zinc-450 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              )}
            >
              Pathologist Signature Slots
            </button>
            <button
              onClick={() => setActiveTab("layout")}
              className={cn(
                "px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all",
                activeTab === "layout" ? "bg-synos-primary/10 text-synos-primary border border-synos-primary/20" : "text-zinc-450 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              )}
            >
              Visual Layout Preview
            </button>
          </div>

          {/* Tab Content Workspace */}
          <div className="space-y-6">
            {activeTab === "columns" && (
              <div className="space-y-6">
                <div className="space-y-3">
                  {selectedTemplate.columns.map((col, idx) => (
                    <div key={idx} className="bg-zinc-50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Name & Code */}
                      <div className="flex items-center gap-3 w-full md:w-[35%]">
                        <span className="bg-synos-primary/10 text-synos-primary border border-synos-primary/20 px-2.5 py-1 rounded text-xs font-mono font-bold">
                          {col.code}
                        </span>
                        <input
                          type="text"
                          className="bg-transparent font-bold text-sm text-zinc-800 dark:text-zinc-200 border-b border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-synos-primary focus:outline-none py-0.5 px-1 w-full"
                          value={col.title}
                          onChange={(e) => handleUpdateColumn(idx, "title", e.target.value)}
                        />
                      </div>

                      {/* Weight Selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-450 dark:text-zinc-500 uppercase font-bold">Weight:</span>
                        <input
                          type="number"
                          className="w-12 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg py-1 text-xs text-center font-bold text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-synos-primary outline-none"
                          value={col.weight}
                          onChange={(e) => handleUpdateColumn(idx, "weight", Number(e.target.value))}
                          min="1"
                          max="10"
                        />
                      </div>

                      {/* Alignment Switcher */}
                      <div className="flex items-center gap-1 bg-white dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 p-1 rounded-xl">
                        {["Left", "Center", "Right"].map(align => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => handleUpdateColumn(idx, "alignment", align)}
                            className={cn(
                              "p-1.5 rounded-lg transition-all",
                              col.alignment === align ? "bg-synos-primary/10 text-synos-primary" : "text-zinc-400 dark:text-zinc-650 hover:text-zinc-650 dark:hover:text-zinc-400"
                            )}
                            title={align}
                          >
                            {align === "Left" && <AlignLeft className="w-3.5 h-3.5" />}
                            {align === "Center" && <AlignCenter className="w-3.5 h-3.5" />}
                            {align === "Right" && <AlignRight className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>

                      {/* Styling Toggles */}
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-synos-primary focus:ring-0 w-3.5 h-3.5"
                            checked={col.bold}
                            onChange={(e) => handleUpdateColumn(idx, "bold", e.target.checked)}
                          />
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold">Bold</span>
                        </label>

                        <button
                          onClick={() => handleDeleteColumn(idx)}
                          className="p-1.5 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg text-zinc-400 dark:text-zinc-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add column form */}
                <form onSubmit={handleAddColumn} className="bg-zinc-50/50 dark:bg-zinc-900/10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block">Add Custom Column Definition</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-zinc-400 dark:text-zinc-500 ml-1">Column Code</label>
                      <input
                        id="new-col-code"
                        type="text"
                        placeholder="e.g. Method"
                        className="w-full bg-white dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-1 focus:ring-synos-primary outline-none"
                        value={newColCode}
                        onChange={(e) => setNewColCode(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[9px] font-bold uppercase text-zinc-400 dark:text-zinc-500 ml-1">Header Title</label>
                      <input
                        id="new-col-title"
                        type="text"
                        placeholder="e.g. Methodology"
                        className="w-full bg-white dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-1 focus:ring-synos-primary outline-none"
                        value={newColTitle}
                        onChange={(e) => setNewColTitle(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold">Weight:</span>
                      <input
                        id="new-col-weight"
                        type="number"
                        className="w-14 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs text-center font-bold text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-synos-primary outline-none"
                        value={newColWeight}
                        onChange={(e) => setNewColWeight(e.target.value)}
                        min="1"
                        max="10"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold">Align:</span>
                      <select
                        id="new-col-align"
                        className="bg-white dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-synos-primary outline-none"
                        value={newColAlignment}
                        onChange={(e) => setNewColAlignment(e.target.value)}
                      >
                        <option value="Left">Left</option>
                        <option value="Center">Center</option>
                        <option value="Right">Right</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        id="new-col-bold"
                        type="checkbox"
                        className="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-synos-primary focus:ring-0 w-3.5 h-3.5"
                        checked={newColBold}
                        onChange={(e) => setNewColBold(e.target.checked)}
                      />
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold">Bold cell emphasis</span>
                    </label>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      id="btn-add-col"
                      type="submit"
                      className="bg-synos-primary hover:bg-synos-primary/95 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md shadow-synos-primary/10 transition-all flex items-center gap-1.5 uppercase tracking-wider"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Column Layout
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "signatures" && (
              <div className="space-y-6">
                <div className="space-y-3">
                  {selectedTemplate.signatureSlots.map((slot, idx) => (
                    <div key={idx} className="bg-zinc-50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center font-bold text-xs text-synos-primary font-mono shadow-sm">
                          {slot.slotId + 1}
                        </span>
                        <div>
                          <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200 block">{slot.title}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 block text-synos-primary">Pathologist Signature Spot</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-synos-primary focus:ring-0 w-3.5 h-3.5"
                            checked={slot.required}
                            onChange={(e) => {
                              const updatedSlots = [...selectedTemplate.signatureSlots];
                              updatedSlots[idx] = { ...updatedSlots[idx], required: e.target.checked };
                              const updatedTemplate = { ...selectedTemplate, signatureSlots: updatedSlots };
                              setSelectedTemplate(updatedTemplate);
                              setTemplates(templates.map(t => t.id === selectedTemplate.id ? updatedTemplate : t));
                            }}
                          />
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold">Mandatory Sign-off</span>
                        </label>

                        <button
                          onClick={() => handleDeleteSignatureSlot(slot.slotId)}
                          className="p-1.5 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg text-zinc-450 dark:text-zinc-650 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddSignatureSlot} className="bg-zinc-50/50 dark:bg-zinc-900/10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
                  <span className="text-[10px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-widest block">Add Doctor Signature Slot</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-zinc-450 dark:text-zinc-500 ml-1">Doctor Designation Label</label>
                      <input
                        id="new-slot-title"
                        type="text"
                        placeholder="e.g. Chief Pathologist"
                        className="w-full bg-white dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-1 focus:ring-synos-primary outline-none"
                        value={newSlotTitle}
                        onChange={(e) => setNewSlotTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex items-center justify-between pb-1 gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          id="new-slot-required"
                          type="checkbox"
                          className="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-synos-primary focus:ring-0 w-3.5 h-3.5"
                          checked={newSlotRequired}
                          onChange={(e) => setNewSlotRequired(e.target.checked)}
                        />
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold">Mark as Mandatory</span>
                      </label>
                      <button
                        id="btn-add-slot"
                        type="submit"
                        className="bg-synos-primary hover:bg-synos-primary/95 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md shadow-synos-primary/10 transition-all flex items-center gap-1.5 uppercase tracking-wider"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Signature Slot
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "layout" && (
              <div className="space-y-6">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-2">High-Fidelity Document Grid Preview</span>
                <div className="bg-white text-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xl max-w-2xl mx-auto min-h-[300px] flex flex-col justify-between">
                  <div>
                    {/* Fake pre-printed header */}
                    <div className="h-10 border-b border-zinc-200 flex items-center justify-between pb-2 mb-6">
                      <span className="font-bold text-[9px] text-zinc-400 tracking-wider">PRE-PRINTED CLINIC HEADER RESERVATION (48mm)</span>
                      <span className="text-[8px] bg-zinc-150 text-zinc-500 px-2 py-0.5 rounded font-black tracking-wider uppercase">A4 LAYOUT</span>
                    </div>

                    {/* Table Header mock based on columns */}
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-t border-b border-zinc-800 text-[10px] font-bold uppercase text-zinc-900">
                          {selectedTemplate.columns.map((col, idx) => (
                            <th
                              key={idx}
                              className={cn(
                                "py-1.5 px-2",
                                col.alignment === "Left" ? "text-left" : col.alignment === "Center" ? "text-center" : "text-right"
                              )}
                              style={{ width: `${(col.weight / selectedTemplate.columns.reduce((sum, c) => sum + c.weight, 0)) * 100}%` }}
                            >
                              {col.title}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="text-[11px] text-zinc-800">
                        {/* Fake parameter rows */}
                        {[
                          { code: "PARAM1", name: "SAMPLE ANALYSIS PARAMETER A", value: "14.2", unit: "g/dL", ref: "12.0 - 16.0" },
                          { code: "PARAM2", name: "SAMPLE ANALYSIS PARAMETER B", value: "4.8", unit: "M/uL", ref: "4.0 - 5.5" }
                        ].map((row, rIdx) => (
                          <tr key={rIdx} className="border-b border-zinc-100">
                            {selectedTemplate.columns.map((col, cIdx) => {
                              let text = "";
                              if (col.code === "Parameter") text = row.name;
                              else if (col.code === "Value") text = row.value;
                              else if (col.code === "Unit") text = row.unit;
                              else if (col.code === "ReferenceRange") text = row.ref;

                              return (
                                <td
                                  key={cIdx}
                                  className={cn(
                                    "py-2 px-2",
                                    col.bold && "font-bold text-zinc-950",
                                    col.alignment === "Left" ? "text-left" : col.alignment === "Center" ? "text-center" : "text-right"
                                  )}
                                >
                                  {text}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mock Signatures */}
                  <div className="grid grid-cols-3 gap-6 mt-16 pt-6 border-t border-dashed border-zinc-200">
                    {selectedTemplate.signatureSlots.map((slot, idx) => (
                      <div key={idx} className="text-center min-h-[50px] flex flex-col justify-end">
                        <div className="border-t border-zinc-300 pt-1.5 text-[8px] font-bold text-zinc-500 uppercase tracking-wider">
                          {slot.title}
                          {slot.required && <span className="text-rose-500 font-bold ml-0.5">*</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportTemplatesScreen;
