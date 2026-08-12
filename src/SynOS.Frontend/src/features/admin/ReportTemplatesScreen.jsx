import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ReportsApi } from '../../api/reports';
import { mapTemplateToBackendDsl, mapBackendDslToTemplate } from '../documents/templates/ReportTemplateService';
import { useTemplatesList } from '../documents/templates/hooks/useReportTemplates';
import { DEFAULT_TEMPLATES, sanitizeTemplates } from '../documents/templates/defaultTemplates';
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
  Check,
  X
} from 'lucide-react';
import { cn } from "@/lib/utils";


const getCoordinates = (template) => {
  const margin = template.leftRightMargin ?? 15;
  const pY = template.patientBlockY ?? 55;
  const tY = template.tableBlockY ?? 95;
  const sY = template.signatureBlockY ?? 25;
  
  return {
    patientNameX: template.patientNameX !== undefined ? template.patientNameX : margin,
    patientNameY: template.patientNameY !== undefined ? template.patientNameY : pY,
    
    patientAgeSexX: template.patientAgeSexX !== undefined ? template.patientAgeSexX : margin,
    patientAgeSexY: template.patientAgeSexY !== undefined ? template.patientAgeSexY : (pY + 12),
    
    refDoctorX: template.refDoctorX !== undefined ? template.refDoctorX : (margin + 60),
    refDoctorY: template.refDoctorY !== undefined ? template.refDoctorY : pY,
    
    patientIdX: template.patientIdX !== undefined ? template.patientIdX : (margin + 60),
    patientIdY: template.patientIdY !== undefined ? template.patientIdY : (pY + 12),
    
    billingDateX: template.billingDateX !== undefined ? template.billingDateX : (margin + 120),
    billingDateY: template.billingDateY !== undefined ? template.billingDateY : pY,
    
    reportDateX: template.reportDateX !== undefined ? template.reportDateX : (margin + 120),
    reportDateY: template.reportDateY !== undefined ? template.reportDateY : (pY + 12),
    
    testTitleX: template.testTitleX !== undefined ? template.testTitleX : margin,
    testTitleY: template.testTitleY !== undefined ? template.testTitleY : tY,
    
    resultsTableX: template.resultsTableX !== undefined ? template.resultsTableX : margin,
    resultsTableY: template.resultsTableY !== undefined ? template.resultsTableY : (tY + 8),
    
    interpretationX: template.interpretationX !== undefined ? template.interpretationX : margin,
    interpretationY: template.interpretationY !== undefined ? template.interpretationY : (tY + 55),
    
    signatureX: template.signatureX !== undefined ? template.signatureX : margin,
    signatureY: template.signatureY !== undefined ? template.signatureY : sY,
  };
};

export function ReportTemplatesScreen() {
  const { user } = useAuth();
  const { templates, setTemplates, loading, refresh } = useTemplatesList();
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    if (templates.length > 0) {
      if (!selectedTemplate) {
        setSelectedTemplate(templates[0]);
      } else {
        const updated = templates.find(t => t.id === selectedTemplate.id);
        if (updated) {
          setSelectedTemplate(updated);
        }
      }
    }
  }, [templates]);

  const [activeTab, setActiveTab] = useState("columns"); // columns | signatures | settings
  const [previewMode, setPreviewMode] = useState("digital"); // digital | physical
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);
  const [activeColIndex, setActiveColIndex] = useState(0);

  const [showGuidelines, setShowGuidelines] = useState(true);
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);

  const handleStartDrag = (e, fieldX, fieldY, initValX, initValY, isBottom = false) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    
    const currentScale = scale || 1;
    const mmPerPixel = 1 / (currentScale * 3.78095);
    
    const handlePointerMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      
      const deltaXMm = dx * mmPerPixel;
      const deltaYMm = dy * mmPerPixel;
      
      let nextX = initValX + deltaXMm;
      let nextY = isBottom ? (initValY - deltaYMm) : (initValY + deltaYMm);
      
      nextX = Math.max(0, Math.min(210, nextX));
      nextY = Math.max(0, Math.min(297, nextY));
      
      setSelectedTemplate(prev => {
        const updated = {
          ...prev,
          [fieldX]: Math.round(nextX * 10) / 10,
          [fieldY]: Math.round(nextY * 10) / 10
        };
        setTemplates(prevList => prevList.map(t => t.id === prev.id ? updated : t));
        return updated;
      });
    };
    
    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
    
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    
    const handleResize = (entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        const baseWidth = 794;
        const newScale = Math.min(1, width / baseWidth);
        setScale(newScale);
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);

    // Initial check
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width > 0) {
      setScale(Math.min(1, rect.width / 794));
    }

    return () => observer.disconnect();
  }, []);


  // Column form states
  const [newColCode, setNewColCode] = useState("");
  const [newColTitle, setNewColTitle] = useState("");
  const [newColWeight, setNewColWeight] = useState("2");
  const [newColAlignment, setNewColAlignment] = useState("Left");
  const [newColBold, setNewColBold] = useState(false);

  // Signature Slot Form States
  const [newSlotRequired, setNewSlotRequired] = useState(false);
  const [slotType, setSlotType] = useState("Additional Pathologist");

  // New Template creation states
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateModality, setNewTemplateModality] = useState("");
  const [customModalityText, setCustomModalityText] = useState("");

  const handleSelectTemplate = (template) => {
    // Find the latest in the current list
    const latest = templates.find(t => t.id === template.id) || template;
    setSelectedTemplate(latest);
    setIsSavedSuccessfully(false);
    setActiveColIndex(0);
  };

  const handleCreateTemplate = async () => {
    const modalityVal = newTemplateModality === "Custom" ? customModalityText.trim() : newTemplateModality.trim();
    if (!newTemplateTitle.trim() || !modalityVal) return;

    // Smart Cloning
    const baseTemplate = selectedTemplate || {};
    const tempTemplate = {
      ...baseTemplate,
      modality: modalityVal,
      title: newTemplateTitle.trim(),
      brandNameText: newTemplateTitle.trim(),
      columns: baseTemplate.columns ? baseTemplate.columns.map(c => ({ ...c })) : [
        { code: "Parameter", title: "Test Parameter", weight: 3, alignment: "Left", bold: true },
        { code: "Value", title: "Observed Value", weight: 2, alignment: "Center", bold: false },
        { code: "Unit", title: "Unit", weight: 1, alignment: "Center", bold: false },
        { code: "ReferenceRange", title: "Reference Ranges", weight: 3, alignment: "Right", bold: false }
      ],
      signatureSlots: baseTemplate.signatureSlots ? baseTemplate.signatureSlots.map(s => ({ ...s })) : [
        { slotId: 0, title: "Default Pathologist (Lab Owner)", required: true }
      ]
    };

    try {
      const dsl = mapTemplateToBackendDsl(tempTemplate);
      const createDto = {
        modality: modalityVal,
        name: newTemplateTitle.trim(),
        description: `Template configuration for ${modalityVal}.`,
        templateJson: dsl,
        createdBy: user?.id || "00000000-0000-0000-0000-000000000000"
      };

      const created = await ReportsApi.createTemplate(createDto);
      
      setNewTemplateTitle("");
      setNewTemplateModality("");
      setCustomModalityText("");
      
      // Refresh templates list
      await refresh();
      
      // Map and select the new template
      const dslObj = created.templateDsl || JSON.parse(created.templateJson);
      const mappedNew = mapBackendDslToTemplate(dslObj, created.templateId, created.isDefault, created.isPublished);
      setSelectedTemplate(mappedNew);
    } catch (e) {
      console.error("Failed to create template", e);
      alert(e.message || "Failed to create template");
    }
  };

  const handleShiftColumn = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= selectedTemplate.columns.length) return;
    
    const updatedCols = [...selectedTemplate.columns];
    const temp = updatedCols[index];
    updatedCols[index] = updatedCols[targetIndex];
    updatedCols[targetIndex] = temp;

    const updatedTemplate = {
      ...selectedTemplate,
      columns: updatedCols
    };
    setSelectedTemplate(updatedTemplate);
    setTemplates(templates.map(t => t.id === selectedTemplate.id ? updatedTemplate : t));
  };

  const handleUpdateTemplateField = (field, value) => {
    const updatedTemplate = {
      ...selectedTemplate,
      [field]: value
    };
    setSelectedTemplate(updatedTemplate);
    setTemplates(templates.map(t => t.id === selectedTemplate.id ? updatedTemplate : t));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleUpdateTemplateField("logoUrl", reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBgImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        alert("Image exceeds the 1.5MB limit. Please select a smaller, compressed background artwork image.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        handleUpdateTemplateField("bgImageUrl", reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomBackdropUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image exceeds the 2MB limit. Please select a smaller backdrop image.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const updatedTemplate = {
          ...selectedTemplate,
          bgType: "image",
          backgroundPath: reader.result,
          bgImageOpacity: 1.0
        };
        setSelectedTemplate(updatedTemplate);
        setTemplates(templates.map(t => t.id === selectedTemplate.id ? updatedTemplate : t));
      };
      reader.readAsDataURL(file);
    }
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
    const finalTitle = slotType;
    if (!finalTitle) return;

    // Check if slot with this title already exists in the selected template
    if (selectedTemplate.signatureSlots.some(s => s.title === finalTitle)) {
      alert("This signature slot already exists.");
      return;
    }

    const newSlot = {
      slotId: selectedTemplate.signatureSlots.length,
      title: finalTitle,
      required: newSlotRequired
    };

    const updatedTemplate = {
      ...selectedTemplate,
      signatureSlots: [...selectedTemplate.signatureSlots, newSlot]
    };

    setSelectedTemplate(updatedTemplate);
    setTemplates(templates.map(t => t.id === selectedTemplate.id ? updatedTemplate : t));

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

  const handleSaveAll = async () => {
    if (!selectedTemplate) return;
    try {
      const dsl = mapTemplateToBackendDsl(selectedTemplate);
      const updateDto = {
        modality: selectedTemplate.modality,
        name: selectedTemplate.title || selectedTemplate.name || "",
        description: selectedTemplate.description || "Updated layout configuration.",
        templateJson: dsl,
        isPublished: selectedTemplate.isPublished,
        isDefault: selectedTemplate.isDefault
      };

      await ReportsApi.updateTemplate(selectedTemplate.id, updateDto);
      
      setIsSavedSuccessfully(true);
      setTimeout(() => setIsSavedSuccessfully(false), 3000);
      refresh();
    } catch (e) {
      console.error("Failed to save template layout changes", e);
      alert(e.message || "Failed to save template layout changes");
    }
  };

  if (loading && templates.length === 0) {
    return (
      <div className="w-full h-[calc(100vh-56px)] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <span className="text-sm font-semibold text-zinc-500 animate-pulse">Loading report templates...</span>
      </div>
    );
  }

  if (!selectedTemplate) {
    return (
      <div className="w-full h-[calc(100vh-56px)] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <span className="text-sm font-semibold text-zinc-500 animate-pulse">No template selected</span>
      </div>
    );
  }

  const coords = getCoordinates(selectedTemplate);

  return (
    <div className="w-full lg:h-[calc(100vh-56px)] flex flex-col overflow-hidden px-6 pt-4 pb-6 space-y-4 animate-in fade-in duration-500">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5 shrink-0">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <Layout className="w-6 h-6 text-synos-primary" />
            Report Templates
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
            Configure reusable department-level presets, column styling, pathologist signatures, preprinted margins, and digital branding.
          </p>
        </div>
        <button
          id="btn-save-template-config"
          onClick={handleSaveAll}
          className="px-6 py-2.5 bg-synos-primary hover:bg-synos-primary/95 text-white font-semibold text-xs rounded-xl shadow-md shadow-synos-primary/10 active:scale-95 transition-all flex items-center gap-2"
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

      <div className="grid grid-cols-12 gap-6 items-stretch flex-1 min-h-0 overflow-hidden pb-4">
        {/* Left Panel: Available Modality Templates */}
        <div className="col-span-12 lg:col-span-3 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 shadow-sm lg:h-full lg:overflow-y-auto custom-scrollbar">
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Modality Templates</span>
          <div className="space-y-2 pr-1">
            {templates.map(t => (
              <button
                key={t.id}
                id={`template-item-${t.id}`}
                onClick={() => handleSelectTemplate(t)}
                className={cn(
                  "w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-2 group",
                  selectedTemplate.id === t.id
                    ? "bg-synos-primary/10 border-synos-primary/30 text-zinc-900 dark:text-white"
                    : "bg-white dark:bg-zinc-900/10 border-zinc-200 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
              >
                <span className="font-semibold text-sm tracking-tight text-zinc-800 dark:text-zinc-200 block">{t.modality}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed block">{t.title}</span>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] font-bold">
                  <span className="bg-synos-primary/10 text-synos-primary border border-synos-primary/20 px-2 py-0.5 rounded">{t.columns.length} Columns</span>
                  <span className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-2 py-0.5 rounded">{t.signatureSlots.length} Doctor Slots</span>
                  <span className={cn("px-2 py-0.5 rounded text-white border", t.usePreprinted ? "bg-amber-600/80 border-amber-600" : "bg-emerald-600/80 border-emerald-600")}>
                    {t.usePreprinted ? "Preprinted" : "Digital PDF"}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Create custom template form */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-2 space-y-3">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Create New Template</span>
            
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 dark:text-zinc-300 block ml-0.5">Template Title</label>
                <input
                  id="new-template-title"
                  type="text"
                  placeholder="e.g. Immunology Detailed"
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary font-medium"
                  value={newTemplateTitle}
                  onChange={(e) => setNewTemplateTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 dark:text-zinc-300 block ml-0.5">Department / Modality</label>
                <select
                  id="new-template-modality"
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary font-medium"
                  value={newTemplateModality}
                  onChange={(e) => setNewTemplateModality(e.target.value)}
                >
                  <option value="">-- Select Department --</option>
                  <option value="Hematology">Hematology</option>
                  <option value="Biochemistry">Biochemistry</option>
                  <option value="Radiology">Radiology</option>
                  <option value="Histopathology">Histopathology</option>
                  <option value="Microbiology">Microbiology</option>
                  <option value="Serology">Serology</option>
                  <option value="Immunology">Immunology</option>
                  <option value="Custom">Custom Modality...</option>
                </select>
              </div>

              {newTemplateModality === "Custom" && (
                <div className="space-y-1 animate-in slide-in-from-top-1 duration-200">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 dark:text-zinc-300 block ml-0.5">Enter Custom Modality</label>
                  <input
                    id="custom-modality-text"
                    type="text"
                    placeholder="e.g. Cardiology"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary font-medium"
                    value={customModalityText}
                    onChange={(e) => setCustomModalityText(e.target.value)}
                  />
                </div>
              )}

              <button
                id="btn-create-template"
                onClick={handleCreateTemplate}
                disabled={
                  !newTemplateTitle.trim() || 
                  !newTemplateModality.trim() || 
                  (newTemplateModality === "Custom" && !customModalityText.trim())
                }
                className="w-full py-2.5 bg-synos-primary hover:bg-synos-primary/95 disabled:opacity-40 disabled:hover:bg-synos-primary text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
              >
                <Plus className="w-3.5 h-3.5" /> Create Template
              </button>
            </div>
          </div>
        </div>

        {/* Center Panel: Settings Tab Workspace */}
        <div className="col-span-12 lg:col-span-5 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col gap-6 lg:h-full lg:overflow-y-auto custom-scrollbar">
          {/* Tab selector */}
          <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3 shrink-0">
            {["columns", "signatures", "settings"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 text-xs font-semibold rounded-lg transition-all border",
                  activeTab === tab 
                    ? "bg-synos-primary/10 text-synos-primary border-synos-primary/20" 
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border-transparent"
                )}
              >
                {tab === "columns" && "Table Columns"}
                {tab === "signatures" && "Signature Slots"}
                {tab === "settings" && "Visual Settings"}
              </button>
            ))}
          </div>

          {/* Tab Content Workspace */}
          <div className="space-y-6">
            {activeTab === "columns" && (() => {
              const safeActiveColIdx = selectedTemplate.columns.findIndex((_, idx) => idx === activeColIndex) >= 0
                ? activeColIndex
                : 0;
              const activeCol = selectedTemplate.columns[safeActiveColIdx] || null;

              return (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                      Interactive Table Header Designer
                    </span>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                      Click on any column header cell to select it. Adjust its relative width weight, alignment, and formatting below.
                    </p>
                  </div>

                  {/* Visual Table Header & Mock Row */}
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/50 dark:bg-zinc-950/20 shadow-sm space-y-2">
                    
                    {/* Visual Header Row */}
                    <div className="flex w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-750 rounded-xl overflow-hidden divide-x divide-zinc-200 dark:divide-zinc-800 shadow-sm">
                      {selectedTemplate.columns.map((col, idx) => {
                        const totalWeight = selectedTemplate.columns.reduce((sum, c) => sum + c.weight, 0);
                        const widthPct = Math.round((col.weight / totalWeight) * 100);
                        const isActive = idx === safeActiveColIdx;

                        return (
                          <div
                            key={idx}
                            onClick={() => setActiveColIndex(idx)}
                            className={cn(
                              "p-4 cursor-pointer transition-all relative select-none flex flex-col justify-between min-h-[90px] min-w-[80px]",
                              isActive 
                                ? "bg-synos-primary/10 text-synos-primary ring-2 ring-synos-primary/30 ring-inset font-bold" 
                                : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400"
                            )}
                            style={{ flex: `${col.weight} 1 0%` }}
                          >
                            <div className="flex items-center justify-between gap-1 text-[9px] font-semibold tracking-wider opacity-85">
                              <span className="truncate">{col.code}</span>
                              <span className="font-mono text-synos-primary">{widthPct}%</span>
                            </div>
                            <div 
                              className={cn(
                                "text-xs font-bold tracking-tight py-2 uppercase truncate",
                                col.alignment === "Left" ? "text-left" : col.alignment === "Center" ? "text-center" : "text-right",
                                col.bold && "font-semibold underline decoration-synos-primary/40 underline-offset-4"
                              )}
                            >
                              {col.title || "(Untitled)"}
                            </div>
                            <div className="text-[8px] font-mono text-zinc-400 flex justify-between items-center opacity-70">
                              <span>Weight: {col.weight}</span>
                              <span>Align: {col.alignment[0]}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Visual Mock Body Row */}
                    <div className="flex w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-xl divide-x divide-zinc-200 dark:divide-zinc-800 overflow-hidden text-xs">
                      {selectedTemplate.columns.map((col, idx) => {
                        let sampleValue = "Glucose Fasting";
                        if (col.code === "Value") sampleValue = "104.5";
                        else if (col.code === "Unit") sampleValue = "mg/dL";
                        else if (col.code === "ReferenceRange") sampleValue = "70.0 - 110.0";
                        else if (col.code === "Methodology") sampleValue = "Hexokinase";

                        return (
                          <div
                            key={idx}
                            className={cn(
                              "p-3 truncate text-zinc-700 dark:text-zinc-300 transition-colors",
                              col.alignment === "Left" ? "text-left" : col.alignment === "Center" ? "text-center" : "text-right",
                              col.bold ? "font-bold text-zinc-950 dark:text-white" : "font-normal",
                              idx === safeActiveColIdx ? "bg-synos-primary/5" : ""
                            )}
                            style={{ flex: `${col.weight} 1 0%` }}
                          >
                            {sampleValue}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Column Properties Configuration Card */}
                  {activeCol && (
                    <div className="bg-white dark:bg-zinc-900/25 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-3 duration-250">
                      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-synos-primary/10 text-synos-primary border border-synos-primary/20 px-2.5 py-1 rounded-xl text-xs font-mono font-semibold">
                            Configure: {activeCol.code}
                          </span>
                          <span className="text-xs text-zinc-400 font-bold">Column {safeActiveColIdx + 1} of {selectedTemplate.columns.length}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleShiftColumn(safeActiveColIdx, -1)}
                            disabled={safeActiveColIdx === 0}
                            className="px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 disabled:opacity-30 text-zinc-600 dark:text-zinc-400 transition-all font-bold text-xs"
                            title="Move Column Left"
                          >
                            &larr; Move Left
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShiftColumn(safeActiveColIdx, 1)}
                            disabled={safeActiveColIdx === selectedTemplate.columns.length - 1}
                            className="px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 disabled:opacity-30 text-zinc-600 dark:text-zinc-400 transition-all font-bold text-xs"
                            title="Move Column Right"
                          >
                            Move Right &rarr;
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleDeleteColumn(safeActiveColIdx);
                              setActiveColIndex(0);
                            }}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg transition-colors border border-rose-500/20"
                            title="Delete Column"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Header Title Input */}
                        <div className="md:col-span-5 space-y-1.5">
                          <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 dark:text-zinc-500 ml-0.5">Column Header Label</label>
                          <input
                            type="text"
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 dark:text-zinc-200 outline-none focus:ring-1 focus:ring-synos-primary"
                            value={activeCol.title}
                            onChange={(e) => handleUpdateColumn(safeActiveColIdx, "title", e.target.value)}
                          />
                        </div>

                        {/* Width Weight Controller */}
                        <div className="md:col-span-3 space-y-1.5">
                          <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 dark:text-zinc-500 ml-0.5">Width Weight (Proportion)</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="1"
                              max="10"
                              className="w-full accent-synos-primary cursor-pointer h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none"
                              value={activeCol.weight}
                              onChange={(e) => handleUpdateColumn(safeActiveColIdx, "weight", Number(e.target.value))}
                            />
                            <span className="text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 dark:bg-zinc-800 px-2 py-1 rounded w-10 text-center">
                              {activeCol.weight}
                            </span>
                          </div>
                        </div>

                        {/* Text Alignment */}
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 dark:text-zinc-500 ml-0.5 block">Alignment</label>
                          <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-0.5 rounded-xl w-fit">
                            {["Left", "Center", "Right"].map(align => (
                              <button
                                key={align}
                                type="button"
                                onClick={() => handleUpdateColumn(safeActiveColIdx, "alignment", align)}
                                className={cn(
                                  "p-1.5 rounded-lg transition-all",
                                  activeCol.alignment === align ? "bg-synos-primary/10 text-synos-primary font-semibold shadow-xs" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                                )}
                                title={`Align ${align}`}
                              >
                                {align === "Left" && <AlignLeft className="w-3.5 h-3.5" />}
                                {align === "Center" && <AlignCenter className="w-3.5 h-3.5" />}
                                {align === "Right" && <AlignRight className="w-3.5 h-3.5" />}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Bold cell styling */}
                        <div className="md:col-span-2 flex items-end justify-start pb-1.5">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              className="rounded border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-synos-primary focus:ring-0 w-4 h-4"
                              checked={activeCol.bold}
                              onChange={(e) => handleUpdateColumn(safeActiveColIdx, "bold", e.target.checked)}
                            />
                            <div>
                              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">Bold Text</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add column form */}
                  <form onSubmit={handleAddColumn} className="bg-zinc-50/50 dark:bg-zinc-900/10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
                    <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 block">Add custom column definition</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 ml-1">Column Code (LIMS Tag)</label>
                        <input
                          id="new-col-code"
                          type="text"
                          list="column-codes-suggestions"
                          placeholder="e.g. ReferenceRange, Unit"
                          className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-1 focus:ring-synos-primary outline-none"
                          value={newColCode}
                          onChange={(e) => setNewColCode(e.target.value)}
                          required
                        />
                        <datalist id="column-codes-suggestions">
                          <option value="Parameter" />
                          <option value="Value" />
                          <option value="Unit" />
                          <option value="ReferenceRange" />
                        </datalist>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 ml-1">Header Title</label>
                        <input
                          id="new-col-title"
                          type="text"
                          placeholder="e.g. Diagnostic Methodology"
                          className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-1 focus:ring-synos-primary outline-none"
                          value={newColTitle}
                          onChange={(e) => setNewColTitle(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">Weight:</span>
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
                        <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">Align:</span>
                        <select
                          id="new-col-align"
                          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-synos-primary outline-none"
                          value={newColAlignment}
                          onChange={(e) => setNewColAlignment(e.target.value)}
                        >
                          <option value="Left">Left</option>
                          <option value="Center">Center</option>
                          <option value="Right">Right</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          id="new-col-bold"
                          type="checkbox"
                          className="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-synos-primary focus:ring-0 w-3.5 h-3.5"
                          checked={newColBold}
                          onChange={(e) => setNewColBold(e.target.checked)}
                        />
                        <span className="text-[10px] text-zinc-700 dark:text-zinc-300 font-medium">Bold cell emphasis</span>
                      </label>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        id="btn-add-col"
                        type="submit"
                        className="bg-synos-primary hover:bg-synos-primary/95 text-white font-semibold text-xs px-5 py-2 rounded-xl shadow-sm hover:bg-synos-primary/95 transition-all flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Column Layout
                      </button>
                    </div>
                  </form>
                </div>
              );
            })()}

            {activeTab === "signatures" && (
              <div className="space-y-6">
                <label className="flex items-center gap-2.5 cursor-pointer bg-zinc-50 dark:bg-zinc-900/20 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800/80">
                  <input
                    type="checkbox"
                    checked={selectedTemplate.includeSignatures ?? true}
                    onChange={(e) => handleUpdateTemplateField("includeSignatures", e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-700 text-synos-primary focus:ring-synos-primary w-4.5 h-4.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">Include Signatures Block</span>
                    <span className="text-[9px] text-zinc-400 block">Render pathologist / radiologist signature lines on reports</span>
                  </div>
                </label>

                <div className={cn("space-y-3 transition-all", !(selectedTemplate.includeSignatures ?? true) && "opacity-40 pointer-events-none")}>
                  {selectedTemplate.signatureSlots.map((slot, idx) => {
                    const isDefaultPathologist = slot.title === "Default Pathologist (Lab Owner)";
                    return (
                      <div key={idx} className="bg-zinc-50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center font-bold text-xs text-synos-primary font-mono shadow-sm">
                            {slot.slotId + 1}
                          </span>
                          <div>
                            <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200 block">{slot.title}</span>
                            <span className="text-[9px] font-semibold mt-0.5 block text-synos-primary">Default Signature Designation</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-synos-primary focus:ring-0 w-3.5 h-3.5 disabled:opacity-50"
                              checked={slot.required}
                              disabled={isDefaultPathologist}
                              onChange={(e) => {
                                const updatedSlots = [...selectedTemplate.signatureSlots];
                                updatedSlots[idx] = { ...updatedSlots[idx], required: e.target.checked };
                                const updatedTemplate = { ...selectedTemplate, signatureSlots: updatedSlots };
                                setSelectedTemplate(updatedTemplate);
                                setTemplates(templates.map(t => t.id === selectedTemplate.id ? updatedTemplate : t));
                              }}
                            />
                            <span className="text-[10px] text-zinc-700 dark:text-zinc-300 font-medium">Mandatory sign-off</span>
                          </label>

                          {!isDefaultPathologist ? (
                            <button
                              onClick={() => handleDeleteSignatureSlot(slot.slotId)}
                              className="p-1.5 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg text-zinc-600 dark:text-zinc-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <div className="w-7 h-7" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={handleAddSignatureSlot} className={cn("bg-zinc-50/50 dark:bg-zinc-900/10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4 transition-all", !(selectedTemplate.includeSignatures ?? true) && "opacity-40 pointer-events-none")}>
                  <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 block">Add doctor signature slot</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-zinc-650 dark:text-zinc-400 ml-1">Doctor Designation</label>
                      <select
                        id="new-slot-type"
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary font-bold text-zinc-700"
                        value={slotType}
                        onChange={(e) => setSlotType(e.target.value)}
                      >
                        <option value="Additional Pathologist">Additional Pathologist</option>
                        <option value="Radiologist">Radiologist</option>
                      </select>
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
                        <span className="text-[10px] text-zinc-700 dark:text-zinc-300 font-medium">Mark as mandatory</span>
                      </label>
                      <button
                        id="btn-add-slot"
                        type="submit"
                        className="bg-synos-primary hover:bg-synos-primary/95 text-white font-semibold text-xs px-5 py-2 rounded-xl shadow-sm hover:bg-synos-primary/95 transition-all flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Signature Slot
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6">
                {/* Save templates banner indicator */}
                {isSavedSuccessfully && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    Styles updated in memory. Click "Save Config" at the top to commit changes.
                  </div>
                )}

                <div className="space-y-6">
                  {/* Card 1: Canvas, Margins & density */}
                  <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Layout className="w-3.5 h-3.5" /> Canvas & Layout Setup
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 dark:text-zinc-500">Template Title</label>
                        <input
                          type="text"
                          className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs w-full text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary"
                          value={selectedTemplate.title || ""}
                          onChange={(e) => handleUpdateTemplateField("title", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 dark:text-zinc-500">Modality Mapping</label>
                        <input
                          type="text"
                          className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs w-full text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary font-bold"
                          value={selectedTemplate.modality || ""}
                          onChange={(e) => handleUpdateTemplateField("modality", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 dark:text-zinc-500">Spacing Density</label>
                      <div className="flex gap-2">
                        {["Compact", "Comfortable", "Large-print"].map(densityOpt => (
                          <button
                            key={densityOpt}
                            onClick={() => handleUpdateTemplateField("density", densityOpt)}
                            className={cn(
                              "flex-1 py-2 text-xs font-bold rounded-lg border transition-all",
                              selectedTemplate.density === densityOpt
                                ? "bg-synos-primary/10 border-synos-primary/30 text-synos-primary font-semibold"
                                : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500"
                            )}
                          >
                            {densityOpt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center gap-2 cursor-pointer bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <input
                          type="checkbox"
                          checked={selectedTemplate.usePreprinted || false}
                          onChange={(e) => handleUpdateTemplateField("usePreprinted", e.target.checked)}
                          className="rounded border-zinc-300 dark:border-zinc-700 dark:border-zinc-700 text-synos-primary focus:ring-synos-primary w-4.5 h-4.5"
                        />
                        <div>
                          <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 block">Preprinted Sheet</span>
                          <span className="text-[9px] text-zinc-400 block">Physical hardcopy</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <input
                          type="checkbox"
                          checked={selectedTemplate.includeBranding || false}
                          onChange={(e) => handleUpdateTemplateField("includeBranding", e.target.checked)}
                          className="rounded border-zinc-300 dark:border-zinc-700 dark:border-zinc-700 text-synos-primary focus:ring-synos-primary w-4.5 h-4.5"
                        />
                        <div>
                          <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 block">Digital Branding</span>
                          <span className="text-[9px] text-zinc-400 block">PDF branding & logo</span>
                        </div>
                      </label>
                    </div>

                    {/* Preprinted Margins */}
                    <div className={cn(
                      "border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-2.5 transition-all duration-300",
                      selectedTemplate.usePreprinted ? "bg-zinc-50/50 dark:bg-zinc-950 opacity-100" : "opacity-40 pointer-events-none select-none"
                    )}>
                      <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 block">Print margins (mm)</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[8px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">Top</label>
                          <input
                            type="number"
                            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs w-full font-mono text-center outline-none focus:ring-1 focus:ring-synos-primary"
                            value={selectedTemplate.topMargin || 0}
                            onChange={(e) => handleUpdateTemplateField("topMargin", Number(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">Bottom</label>
                          <input
                            type="number"
                            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs w-full font-mono text-center outline-none focus:ring-1 focus:ring-synos-primary"
                            value={selectedTemplate.bottomMargin || 0}
                            onChange={(e) => handleUpdateTemplateField("bottomMargin", Number(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">Sides</label>
                          <input
                            type="number"
                            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs w-full font-mono text-center outline-none focus:ring-1 focus:ring-synos-primary"
                            value={selectedTemplate.leftRightMargin || 0}
                            onChange={(e) => handleUpdateTemplateField("leftRightMargin", Number(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Backgrounds & Borders */}
                  <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" /> Backgrounds, Borders & Spacing
                    </h3>

                    {/* bgType selector */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 dark:text-zinc-500">Background Canvas Style</label>
                      <div className="flex gap-1.5">
                        {[
                          { id: "solid", label: "Solid Color" },
                          { id: "gradient", label: "Gradient" },
                          { id: "image", label: "Image / Watermark" }
                        ].map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleUpdateTemplateField("bgType", opt.id)}
                            className={cn(
                              "flex-1 py-1.5 text-[11px] font-bold rounded-lg border transition-all",
                              selectedTemplate.bgType === opt.id
                                ? "bg-synos-primary/10 border-synos-primary/30 text-synos-primary font-semibold"
                                : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* bgType conditional options */}
                    {selectedTemplate.bgType === "solid" && (
                      <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                        <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 dark:text-zinc-500">Canvas Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            className="w-10 h-8 rounded border border-zinc-200 dark:border-zinc-800 cursor-pointer p-0"
                            value={selectedTemplate.bgColor || "#ffffff"}
                            onChange={(e) => handleUpdateTemplateField("bgColor", e.target.value)}
                          />
                          <input
                            type="text"
                            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs flex-1 text-zinc-900 dark:text-zinc-100 font-mono"
                            value={selectedTemplate.bgColor || "#ffffff"}
                            onChange={(e) => handleUpdateTemplateField("bgColor", e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {selectedTemplate.bgType === "gradient" && (
                      <div className="grid grid-cols-2 gap-3.5 animate-in slide-in-from-top-1 duration-150">
                        <div className="space-y-1">
                          <label className="text-[8px] font-semibold text-zinc-600 dark:text-zinc-400 dark:text-zinc-500">Start Color</label>
                          <div className="flex gap-1.5">
                            <input
                              type="color"
                              className="w-8 h-7 rounded border border-zinc-200 dark:border-zinc-800 cursor-pointer p-0"
                              value={selectedTemplate.bgGradientStart || "#ffffff"}
                              onChange={(e) => handleUpdateTemplateField("bgGradientStart", e.target.value)}
                            />
                            <input
                              type="text"
                              className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-[10px] w-full text-zinc-900 dark:text-zinc-100 font-mono"
                              value={selectedTemplate.bgGradientStart || "#ffffff"}
                              onChange={(e) => handleUpdateTemplateField("bgGradientStart", e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-semibold text-zinc-600 dark:text-zinc-400 dark:text-zinc-500">End Color</label>
                          <div className="flex gap-1.5">
                            <input
                              type="color"
                              className="w-8 h-7 rounded border border-zinc-200 dark:border-zinc-800 cursor-pointer p-0"
                              value={selectedTemplate.bgGradientEnd || "#f1f5f9"}
                              onChange={(e) => handleUpdateTemplateField("bgGradientEnd", e.target.value)}
                            />
                            <input
                              type="text"
                              className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-[10px] w-full text-zinc-900 dark:text-zinc-100 font-mono"
                              value={selectedTemplate.bgGradientEnd || "#f1f5f9"}
                              onChange={(e) => handleUpdateTemplateField("bgGradientEnd", e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-span-2 space-y-1">
                          <div className="flex justify-between text-[9px] font-semibold text-zinc-600 dark:text-zinc-400">
                            <span>Gradient Angle</span>
                            <span className="font-mono">{selectedTemplate.bgGradientAngle || 135}°</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            className="w-full accent-synos-primary h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                            value={selectedTemplate.bgGradientAngle || 135}
                            onChange={(e) => handleUpdateTemplateField("bgGradientAngle", Number(e.target.value))}
                          />
                        </div>
                      </div>
                    )}

                    {selectedTemplate.bgType === "image" && (
                      <div className="space-y-3 animate-in slide-in-from-top-1 duration-150">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-semibold text-zinc-650 dark:text-zinc-400 block">Department Master Backdrop Theme</label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { name: "Hematology", path: "/assets/report-masters/hematology-master.svg", color: "bg-indigo-500/10 border-indigo-500/30" },
                              { name: "Biochemistry", path: "/assets/report-masters/biochemistry-master.svg", color: "bg-emerald-500/10 border-emerald-500/30" },
                              { name: "Radiology", path: "/assets/report-masters/radiology-master.svg", color: "bg-zinc-500/10 border-zinc-500/30" },
                              { name: "Histopathology", path: "/assets/report-masters/histopathology-master.svg", color: "bg-amber-500/10 border-amber-500/30" },
                              { name: "Default Master", path: "/assets/report-masters/default-master.svg", color: "bg-blue-500/10 border-blue-500/30" }
                            ].map((theme) => {
                              const isSelected = selectedTemplate.backgroundPath === theme.path;
                              return (
                                <button
                                  key={theme.path}
                                  type="button"
                                  onClick={() => handleUpdateTemplateField("backgroundPath", theme.path)}
                                  className={cn(
                                    "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all",
                                    isSelected 
                                      ? "border-synos-primary bg-synos-primary/5 shadow-sm text-synos-primary ring-1 ring-synos-primary" 
                                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400"
                                  )}
                                >
                                  <div className={cn("w-full h-8 rounded border mb-1 flex items-center justify-center text-[8px] font-bold uppercase tracking-wider", theme.color)}>
                                    {theme.name.substring(0, 4)}
                                  </div>
                                  <span className="text-[9px] font-bold block">{theme.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="space-y-1.5 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                          <label className="text-[9px] font-semibold text-zinc-650 dark:text-zinc-400 block">External Custom Backdrop (Canva/Crystal)</label>
                          {selectedTemplate.backgroundPath && selectedTemplate.backgroundPath.startsWith("data:") ? (
                            <div className="flex items-center gap-3 bg-white dark:bg-zinc-950 p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                              <img src={selectedTemplate.backgroundPath} alt="Custom Backdrop Preview" className="h-10 w-10 object-contain rounded border border-zinc-100 dark:border-zinc-800" />
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] text-zinc-500 block truncate font-mono">Custom Backdrop Active</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const defaultPath = selectedTemplate.modality === "Hematology" ? "/assets/report-masters/hematology-master.svg" :
                                    selectedTemplate.modality === "Biochemistry" ? "/assets/report-masters/biochemistry-master.svg" :
                                    selectedTemplate.modality === "Radiology" ? "/assets/report-masters/radiology-master.svg" :
                                    selectedTemplate.modality === "Histopathology" ? "/assets/report-masters/histopathology-master.svg" :
                                    "/assets/report-masters/default-master.svg";
                                  handleUpdateTemplateField("backgroundPath", defaultPath);
                                }}
                                className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
                                title="Remove Custom Backdrop"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative group flex flex-col items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl p-3 bg-white dark:bg-zinc-950 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-all cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleCustomBackdropUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <Plus className="w-4 h-4 text-zinc-400 group-hover:text-synos-primary transition-colors mb-1" />
                              <span className="text-[10px] text-zinc-500 font-semibold group-hover:text-zinc-600 transition-colors">Upload Canva/A4 preprinted PNG</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-semibold text-zinc-600 dark:text-zinc-400 font-medium">
                            <span>Image Overlay Opacity</span>
                            <span className="font-mono">{Math.round((selectedTemplate.bgImageOpacity || 0.05) * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.01"
                            max="1.0"
                            step="0.01"
                            className="w-full accent-synos-primary h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                            value={selectedTemplate.bgImageOpacity ?? 0.05}
                            onChange={(e) => handleUpdateTemplateField("bgImageOpacity", Number(e.target.value))}
                          />
                        </div>
                      </div>
                    )}

                    {/* Border Width / Style / Color / Radius & Page Padding */}
                    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3.5 space-y-3.5">
                      <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 block">Border & canvas framing</span>
                      
                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-semibold text-zinc-600 dark:text-zinc-400">
                            <span>Border Width</span>
                            <span className="font-mono">{selectedTemplate.borderWidth ?? 1}px</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="10"
                            className="w-full accent-synos-primary h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                            value={selectedTemplate.borderWidth ?? 1}
                            onChange={(e) => handleUpdateTemplateField("borderWidth", Number(e.target.value))}
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-semibold text-zinc-600 dark:text-zinc-400">
                            <span>Border Radius</span>
                            <span className="font-mono">{selectedTemplate.borderRadius ?? 12}px</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="30"
                            className="w-full accent-synos-primary h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                            value={selectedTemplate.borderRadius ?? 12}
                            onChange={(e) => handleUpdateTemplateField("borderRadius", Number(e.target.value))}
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-semibold text-zinc-600 dark:text-zinc-400">
                            <span>Page Inner Padding</span>
                            <span className="font-mono">{selectedTemplate.pagePadding ?? 24}px</span>
                          </div>
                          <input
                            type="range"
                            min="8"
                            max="48"
                            className="w-full accent-synos-primary h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                            value={selectedTemplate.pagePadding ?? 24}
                            onChange={(e) => handleUpdateTemplateField("pagePadding", Number(e.target.value))}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] font-semibold text-zinc-600 dark:text-zinc-400 dark:text-zinc-500">Border Style</label>
                          <select
                            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs w-full text-zinc-700 outline-none"
                            value={selectedTemplate.borderStyle || "solid"}
                            onChange={(e) => handleUpdateTemplateField("borderStyle", e.target.value)}
                          >
                            <option value="solid">Solid</option>
                            <option value="dashed">Dashed</option>
                            <option value="dotted">Dotted</option>
                            <option value="double">Double</option>
                            <option value="none">None</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 dark:text-zinc-500">Border Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            className="w-10 h-8 rounded border border-zinc-200 dark:border-zinc-800 cursor-pointer p-0"
                            value={selectedTemplate.borderColor || "#e2e8f0"}
                            onChange={(e) => handleUpdateTemplateField("borderColor", e.target.value)}
                          />
                          <input
                            type="text"
                            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs flex-1 text-zinc-900 dark:text-zinc-100 font-mono"
                            value={selectedTemplate.borderColor || "#e2e8f0"}
                            onChange={(e) => handleUpdateTemplateField("borderColor", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card: Stationery Overlay Coordinates */}
                  <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" /> Stationery Overlay Coordinates (mm)
                    </h3>
                    
                    <label className="flex items-center gap-2 cursor-pointer bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <input
                        type="checkbox"
                        checked={selectedTemplate.enableAbsolutePositioning || false}
                        onChange={(e) => handleUpdateTemplateField("enableAbsolutePositioning", e.target.checked)}
                        className="rounded border-zinc-300 dark:border-zinc-700 text-synos-primary focus:ring-synos-primary w-4.5 h-4.5"
                      />
                      <div>
                        <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 block">Enable Absolute Coordinates</span>
                        <span className="text-[9px] text-zinc-400 block">Overlay blocks using physical millimeter rulers</span>
                      </div>
                    </label>

                    <div className={cn(
                      "space-y-3 transition-all duration-300",
                      selectedTemplate.enableAbsolutePositioning ? "opacity-100 animate-in slide-in-from-top-1 duration-150" : "opacity-40 pointer-events-none select-none"
                    )}>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-semibold text-zinc-650 dark:text-zinc-400">
                          <span>Patient Block Y-Offset</span>
                          <span className="font-mono font-bold text-synos-primary">{selectedTemplate.patientBlockY ?? 55} mm</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="120"
                          className="w-full accent-synos-primary h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                          value={selectedTemplate.patientBlockY ?? 55}
                          onChange={(e) => handleUpdateTemplateField("patientBlockY", Number(e.target.value))}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-semibold text-zinc-650 dark:text-zinc-400">
                          <span>Findings Table Y-Offset</span>
                          <span className="font-mono font-bold text-synos-primary">{selectedTemplate.tableBlockY ?? 95} mm</span>
                        </div>
                        <input
                          type="range"
                          min="30"
                          max="220"
                          className="w-full accent-synos-primary h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                          value={selectedTemplate.tableBlockY ?? 95}
                          onChange={(e) => handleUpdateTemplateField("tableBlockY", Number(e.target.value))}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-semibold text-zinc-650 dark:text-zinc-400">
                          <span>Signature Block Y-Offset (from bottom)</span>
                          <span className="font-mono font-bold text-synos-primary">{selectedTemplate.signatureBlockY ?? 25} mm</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="80"
                          className="w-full accent-synos-primary h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                          value={selectedTemplate.signatureBlockY ?? 25}
                          onChange={(e) => handleUpdateTemplateField("signatureBlockY", Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Advanced Brand Visual overrides */}
                  <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5" /> Advanced Brand Visual overrides & Clinic Branding
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Sub-section: Brand Name & Typography */}
                      <div className="space-y-4 bg-zinc-50/50 dark:bg-zinc-950/20 p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                        <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 block">Brand Typography & Header text</span>
                        
                        <div className="flex gap-4 border-b border-zinc-200/60 dark:border-zinc-850 pb-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              className="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-synos-primary focus:ring-0 w-3.5 h-3.5"
                              checked={selectedTemplate.includeHeaderName ?? true}
                              onChange={(e) => handleUpdateTemplateField("includeHeaderName", e.target.checked)}
                            />
                            <span className="text-[10px] font-semibold text-zinc-750 dark:text-zinc-300">Show Brand Title</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              className="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-synos-primary focus:ring-0 w-3.5 h-3.5"
                              checked={selectedTemplate.includeHeaderSubtitle ?? true}
                              onChange={(e) => handleUpdateTemplateField("includeHeaderSubtitle", e.target.checked)}
                            />
                            <span className="text-[10px] font-semibold text-zinc-750 dark:text-zinc-300">Show Subtitle</span>
                          </label>
                        </div>

                        <div className={cn("space-y-1.5 transition-all duration-300", !(selectedTemplate.includeHeaderName ?? true) && "opacity-40 pointer-events-none select-none")}>
                          <label className="text-[9px] font-semibold text-zinc-600 dark:text-zinc-400">Brand Main Title Text</label>
                          <input
                            type="text"
                            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs w-full text-zinc-900 dark:text-zinc-100 outline-none"
                            value={selectedTemplate.brandNameText || selectedTemplate.clinicName || ""}
                            onChange={(e) => handleUpdateTemplateField("brandNameText", e.target.value)}
                          />
                        </div>

                        <div className={cn("grid grid-cols-3 gap-2 transition-all duration-300", !(selectedTemplate.includeHeaderName ?? true) && "opacity-40 pointer-events-none select-none")}>
                          <div className="space-y-1">
                            <label className="text-[8px] font-semibold text-zinc-400 block mb-0.5">Size (px)</label>
                            <input
                              type="number"
                              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs w-full font-mono text-center outline-none"
                              value={selectedTemplate.brandNameSize || 16}
                              onChange={(e) => handleUpdateTemplateField("brandNameSize", Number(e.target.value) || 16)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-semibold text-zinc-400 block mb-0.5">Weight</label>
                            <select
                              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-1 text-xs w-full text-zinc-700 outline-none"
                              value={selectedTemplate.brandNameWeight || "900"}
                              onChange={(e) => handleUpdateTemplateField("brandNameWeight", e.target.value)}
                            >
                              <option value="300">Light</option>
                              <option value="400">Regular</option>
                              <option value="500">Medium</option>
                              <option value="700">Bold</option>
                              <option value="900">Heavy</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-semibold text-zinc-400 block mb-0.5">Color</label>
                            <input
                              type="color"
                              className="w-full h-7 rounded border border-zinc-200 dark:border-zinc-800 cursor-pointer p-0"
                              value={selectedTemplate.brandNameColor || "#312e81"}
                              onChange={(e) => handleUpdateTemplateField("brandNameColor", e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Subtitle details */}
                        <div className={cn("space-y-1.5 border-t border-zinc-200 dark:border-zinc-800 pt-3 transition-all duration-300", !(selectedTemplate.includeHeaderSubtitle ?? true) && "opacity-40 pointer-events-none select-none")}>
                          <label className="text-[9px] font-semibold text-zinc-600 dark:text-zinc-400">Brand Subtitle Text</label>
                          <input
                            type="text"
                            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs w-full text-zinc-900 dark:text-zinc-100 outline-none"
                            value={selectedTemplate.brandSubtitleText || ""}
                            onChange={(e) => handleUpdateTemplateField("brandSubtitleText", e.target.value)}
                          />
                        </div>

                        <div className={cn("grid grid-cols-2 gap-2 transition-all duration-300", !(selectedTemplate.includeHeaderSubtitle ?? true) && "opacity-40 pointer-events-none select-none")}>
                          <div className="space-y-1">
                            <label className="text-[8px] font-semibold text-zinc-400 block mb-0.5">Size (px)</label>
                            <input
                              type="number"
                              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs w-full font-mono text-center outline-none"
                              value={selectedTemplate.brandSubtitleSize || 9}
                              onChange={(e) => handleUpdateTemplateField("brandSubtitleSize", Number(e.target.value) || 9)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-semibold text-zinc-400 block mb-0.5">Color</label>
                            <input
                              type="color"
                              className="w-full h-7 rounded border border-zinc-200 dark:border-zinc-800 cursor-pointer p-0"
                              value={selectedTemplate.brandSubtitleColor || "#71717a"}
                              onChange={(e) => handleUpdateTemplateField("brandSubtitleColor", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sub-section: Logo URL, alignment, sizes */}
                      <div className="space-y-4 bg-zinc-50/50 dark:bg-zinc-950/25 p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                        <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800 pb-2">
                          <span className="text-[10px] font-semibold text-zinc-650 dark:text-zinc-400 block">Brand Logo & Header Dividers</span>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              className="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-synos-primary focus:ring-0 w-3.5 h-3.5"
                              checked={selectedTemplate.includeLogo ?? true}
                              onChange={(e) => handleUpdateTemplateField("includeLogo", e.target.checked)}
                            />
                            <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">Show Clinic Logo</span>
                          </label>
                        </div>

                        <div className={cn("space-y-4 transition-all duration-300", !(selectedTemplate.includeLogo ?? true) && "opacity-40 pointer-events-none select-none")}>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-semibold text-zinc-650 dark:text-zinc-400 block">Clinic Logo (PNG/Image)</label>
                            {selectedTemplate.logoUrl ? (
                              <div className="flex items-center gap-3 bg-white dark:bg-zinc-950 p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                                <img src={selectedTemplate.logoUrl} alt="Logo Preview" className="h-10 w-10 object-contain rounded border border-zinc-100 dark:border-zinc-800" />
                                <div className="flex-1 min-w-0">
                                  <span className="text-[10px] text-zinc-500 block truncate">Logo loaded</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateTemplateField("logoUrl", "")}
                                  className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
                                  title="Remove Logo"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="relative group flex flex-col items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl p-3 bg-white dark:bg-zinc-950 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-all cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleLogoChange}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <Plus className="w-4 h-4 text-zinc-400 group-hover:text-synos-primary transition-colors mb-1" />
                                <span className="text-[10px] text-zinc-500 font-semibold group-hover:text-zinc-600 transition-colors">Choose local logo image</span>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3.5">
                            <div className="space-y-1">
                              <label className="text-[8px] font-semibold text-zinc-400 block mb-0.5">Logo Width (px)</label>
                              <input
                                type="number"
                                min="20"
                                max="200"
                                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs w-full font-mono text-center outline-none"
                                value={selectedTemplate.logoSize || 40}
                                onChange={(e) => handleUpdateTemplateField("logoSize", Number(e.target.value) || 40)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-semibold text-zinc-400 block mb-0.5">Logo Position</label>
                              <select
                                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-1 text-xs w-full text-zinc-600 dark:text-zinc-400 outline-none font-bold"
                                value={selectedTemplate.logoPosition || "Left"}
                                onChange={(e) => handleUpdateTemplateField("logoPosition", e.target.value)}
                              >
                                <option value="Left">Left Side</option>
                                <option value="Center">Centered</option>
                                <option value="Right">Right Side</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Header Divider settings */}
                        <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedTemplate.showHeaderDivider ?? true}
                              onChange={(e) => handleUpdateTemplateField("showHeaderDivider", e.target.checked)}
                              className="rounded border-zinc-300 text-synos-primary focus:ring-0 w-3.5 h-3.5"
                            />
                            <span className="text-[9px] font-semibold text-zinc-600 dark:text-zinc-400">Draw Header Divider Line</span>
                          </label>

                          {selectedTemplate.showHeaderDivider !== false && (
                            <div className="grid grid-cols-3 gap-2.5 animate-in slide-in-from-top-1 duration-150">
                              <div>
                                <label className="text-[8px] font-semibold text-zinc-400 block mb-0.5">Width</label>
                                <input
                                  type="number"
                                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs w-full font-mono text-center outline-none"
                                  value={selectedTemplate.headerDividerThickness ?? 2}
                                  onChange={(e) => handleUpdateTemplateField("headerDividerThickness", Number(e.target.value) || 2)}
                                />
                              </div>
                              <div>
                                <label className="text-[8px] font-semibold text-zinc-400 block mb-0.5">Style</label>
                                <select
                                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-1 text-xs w-full text-zinc-600 dark:text-zinc-400 outline-none"
                                  value={selectedTemplate.headerDividerStyle || "solid"}
                                  onChange={(e) => handleUpdateTemplateField("headerDividerStyle", e.target.value)}
                                >
                                  <option value="solid">Solid</option>
                                  <option value="dashed">Dashed</option>
                                  <option value="dotted">Dotted</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[8px] font-semibold text-zinc-400 block mb-0.5">Color</label>
                                <input
                                  type="color"
                                  className="w-full h-7 rounded border border-zinc-200 dark:border-zinc-800 cursor-pointer p-0"
                                  value={selectedTemplate.headerDividerColor || "#4f46e5"}
                                  onChange={(e) => handleUpdateTemplateField("headerDividerColor", e.target.value)}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Watermark & Footer Branding */}
                  <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Watermark Overlay & Footer Branding
                    </h3>

                    <div className="flex flex-wrap items-center gap-6 border-b border-zinc-150 dark:border-zinc-800 pb-2.5">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-synos-primary focus:ring-0 w-3.5 h-3.5"
                          checked={selectedTemplate.includeWatermark ?? true}
                          onChange={(e) => handleUpdateTemplateField("includeWatermark", e.target.checked)}
                        />
                        <span className="text-[10px] font-semibold text-zinc-750 dark:text-zinc-300">Enable Watermark Settings</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-synos-primary focus:ring-0 w-3.5 h-3.5"
                          checked={selectedTemplate.includeFooter ?? true}
                          onChange={(e) => handleUpdateTemplateField("includeFooter", e.target.checked)}
                        />
                        <span className="text-[10px] font-semibold text-zinc-750 dark:text-zinc-300">Enable Footer Settings</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className={cn("space-y-4 transition-all duration-300", !(selectedTemplate.includeWatermark ?? true) && "opacity-40 pointer-events-none select-none")}>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2 space-y-1.5">
                            <label className="text-[9px] font-semibold text-zinc-650 dark:text-zinc-400">Watermark Overlay Text</label>
                            <input
                              type="text"
                              className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs w-full text-zinc-900 dark:text-zinc-100 outline-none"
                              value={selectedTemplate.watermarkText || ""}
                              onChange={(e) => handleUpdateTemplateField("watermarkText", e.target.value)}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-semibold text-zinc-600 dark:text-zinc-400">Opacity (0.01-0.5)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              max="0.5"
                              className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs w-full font-mono text-center outline-none"
                              value={selectedTemplate.watermarkOpacity || 0.05}
                              onChange={(e) => handleUpdateTemplateField("watermarkOpacity", Number(e.target.value) || 0.05)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-semibold text-zinc-600 dark:text-zinc-400">
                              <span>Font Size (px)</span>
                              <span className="font-mono">{selectedTemplate.watermarkSize || 32}px</span>
                            </div>
                            <input
                              type="range"
                              min="14"
                              max="80"
                              className="w-full accent-synos-primary h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                              value={selectedTemplate.watermarkSize || 32}
                              onChange={(e) => handleUpdateTemplateField("watermarkSize", Number(e.target.value))}
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-semibold text-zinc-600 dark:text-zinc-400">
                              <span>Rotation</span>
                              <span className="font-mono">{selectedTemplate.watermarkRotation ?? 12}°</span>
                            </div>
                            <input
                              type="range"
                              min="-90"
                              max="90"
                              className="w-full accent-synos-primary h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                              value={selectedTemplate.watermarkRotation ?? 12}
                              onChange={(e) => handleUpdateTemplateField("watermarkRotation", Number(e.target.value))}
                            />
                          </div>
                        </div>
                      </div>

                      <div className={cn("space-y-4 transition-all duration-300", !(selectedTemplate.includeFooter ?? true) && "opacity-40 pointer-events-none select-none")}>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-semibold text-zinc-600 dark:text-zinc-400">Footer Brand Subtext</label>
                          <input
                            type="text"
                            placeholder="Sector 4, Phase 2, Health City | Email: reports@synos.in"
                            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs w-full text-zinc-900 dark:text-zinc-100 outline-none"
                            value={selectedTemplate.footerText || ""}
                            onChange={(e) => handleUpdateTemplateField("footerText", e.target.value)}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-semibold text-zinc-600 dark:text-zinc-400">Branding Color Theme Preset</label>
                          <select
                            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs w-full outline-none font-bold text-zinc-700"
                            value={selectedTemplate.themeColor || "Indigo"}
                            onChange={(e) => handleUpdateTemplateField("themeColor", e.target.value)}
                          >
                            <option value="Indigo">Indigo / Purple</option>
                            <option value="Emerald">Emerald / Green</option>
                            <option value="Dark Zinc">Dark Zinc / Professional</option>
                            <option value="Amber">Amber / Orange-Gold</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Column 3: Live Report Preview */}
        <div className="col-span-12 lg:col-span-4 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-6 lg:h-full lg:overflow-y-auto custom-scrollbar">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 block uppercase tracking-wider">Live Report Preview</span>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-synos-primary focus:ring-0 w-3.5 h-3.5"
                  checked={showGuidelines}
                  onChange={(e) => setShowGuidelines(e.target.checked)}
                />
                <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-450 uppercase tracking-wider">Guidelines</span>
              </label>
            </div>
            
            {/* Segmented Mode Selector Toggle */}
            <div className="flex bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-0.5 rounded-xl text-xs font-bold">
              <button
                onClick={() => setPreviewMode("digital")}
                className={cn(
                  "px-4 py-1.5 rounded-lg transition-all",
                  previewMode === "digital" 
                    ? "bg-white dark:bg-zinc-800 shadow-sm text-synos-primary font-extrabold" 
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200"
                )}
              >
                Digital
              </button>
              <button
                onClick={() => setPreviewMode("physical")}
                className={cn(
                  "px-4 py-1.5 rounded-lg transition-all",
                  previewMode === "physical" 
                    ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-800 dark:text-zinc-200 font-extrabold" 
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200"
                )}
              >
                Physical
              </button>
            </div>
          </div>

          {/* High-Fidelity A4 Scrollable Container Preview */}
          <div ref={containerRef} className="w-full overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-100 dark:bg-zinc-950 p-4 flex justify-center">
            <div 
              className="relative transition-all" 
              style={{ 
                width: `${794 * scale}px`, 
                height: `${1123 * scale + 32}px`, 
                overflow: "hidden" 
              }}
            >
              <div 
                id="report-a4-canvas"
                className={cn(
                  selectedTemplate.enableAbsolutePositioning 
                    ? "text-zinc-900 relative select-none transition-all box-border overflow-hidden" 
                    : "bg-white text-zinc-900 shadow-2xl relative select-none transition-all box-border overflow-hidden",
                  selectedTemplate.density === "Compact" ? "font-sans" : "font-serif"
                )}
                style={{
                  width: "794px",
                  height: "1123px",
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  padding: selectedTemplate.enableAbsolutePositioning ? 0 : `${selectedTemplate.pagePadding ?? 24}px`,
                  borderWidth: selectedTemplate.enableAbsolutePositioning ? 0 : `${selectedTemplate.borderWidth ?? 1}px`,
                  borderStyle: selectedTemplate.enableAbsolutePositioning ? "none" : (selectedTemplate.borderStyle || "solid"),
                  borderColor: selectedTemplate.enableAbsolutePositioning ? "transparent" : (selectedTemplate.borderColor || "#e2e8f0"),
                  borderRadius: selectedTemplate.enableAbsolutePositioning ? 0 : `${selectedTemplate.borderRadius ?? 0}px`,
                  backgroundColor: selectedTemplate.enableAbsolutePositioning 
                    ? "transparent" 
                    : (selectedTemplate.bgType === "solid" ? (selectedTemplate.bgColor || "#ffffff") : "#ffffff"),
                  position: "absolute",
                  top: 0,
                  left: 0
                }}
              >
              
              {/* Background Backdrop Master Artwork */}
              {((previewMode === "digital") || (previewMode === "physical" && !selectedTemplate.usePreprinted)) && selectedTemplate.backgroundPath && (
                <img 
                  src={selectedTemplate.backgroundPath} 
                  alt="Background Letterhead"
                  className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
                  style={{ 
                    opacity: selectedTemplate.backgroundPath.startsWith('data:') ? 1.0 : (selectedTemplate.bgImageOpacity ?? 1.0),
                    zIndex: 0 
                  }} 
                />
              )}

              {/* Background Gradient layer */}
              {((previewMode === "digital") || (previewMode === "physical" && !selectedTemplate.usePreprinted)) && selectedTemplate.bgType === "gradient" && (
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{ 
                    backgroundImage: `linear-gradient(${selectedTemplate.bgGradientAngle || 135}deg, ${selectedTemplate.bgGradientStart || '#ffffff'}, ${selectedTemplate.bgGradientEnd || '#f1f5f9'})`,
                    zIndex: 0 
                  }} 
                />
              )}

              {/* Digital mode Watermark overlay */}
              {previewMode === "digital" && selectedTemplate.includeBranding && (selectedTemplate.includeWatermark ?? true) && selectedTemplate.watermarkText && (
                <div 
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none font-semibold font-mono tracking-wider"
                  style={{ 
                    opacity: selectedTemplate.watermarkOpacity || 0.05, 
                    color: '#000',
                    fontSize: `${selectedTemplate.watermarkSize || 32}px`,
                    transform: `rotate(${selectedTemplate.watermarkRotation ?? 12}deg)`,
                    zIndex: 5
                  }}
                >
                  {selectedTemplate.watermarkText}
                </div>
              )}

              {/* Absolute coordinates guidelines overlay (suppressed in printing) */}
              {showGuidelines && selectedTemplate.enableAbsolutePositioning && (
                <div className="absolute inset-0 pointer-events-none z-30 select-none print:hidden">
                  {/* Patient Block Y Guideline */}
                  <div 
                    className="absolute left-0 right-0 border-t border-dashed border-indigo-400/80"
                    style={{ top: `${selectedTemplate.patientBlockY ?? 55}mm` }}
                  >
                    <span className="absolute right-4 -top-3 bg-indigo-600 text-white font-mono text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                      Patient Y: {selectedTemplate.patientBlockY ?? 55}mm
                    </span>
                  </div>

                  {/* Table Block Y Guideline */}
                  <div 
                    className="absolute left-0 right-0 border-t border-dashed border-emerald-400/80"
                    style={{ top: `${selectedTemplate.tableBlockY ?? 95}mm` }}
                  >
                    <span className="absolute right-4 -top-3 bg-emerald-600 text-white font-mono text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                      Table Y: {selectedTemplate.tableBlockY ?? 95}mm
                    </span>
                  </div>

                  {/* Signature Block Y Guideline */}
                  <div 
                    className="absolute left-0 right-0 border-b border-dashed border-violet-400/80"
                    style={{ bottom: `${selectedTemplate.signatureBlockY ?? 25}mm` }}
                  >
                    <span className="absolute right-4 -bottom-3 bg-violet-600 text-white font-mono text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                      Signature Bottom Y: {selectedTemplate.signatureBlockY ?? 25}mm
                    </span>
                  </div>
                </div>
              )}

              {/* Content Box */}
              <div className="relative z-10 w-full h-full flex flex-col justify-between">
                <div>
                  {/* Brand headers with custom logo, positioning, colors and fonts */}
                  {((previewMode === "digital") || (previewMode === "physical" && !selectedTemplate.usePreprinted)) && selectedTemplate.includeBranding && (() => {
                    const hasLogo = (selectedTemplate.includeLogo ?? true) && !!selectedTemplate.logoUrl;
                    const hasTitle = selectedTemplate.includeHeaderName ?? true;
                    const hasSubtitle = selectedTemplate.includeHeaderSubtitle ?? true;

                    if (!hasLogo && !hasTitle && !hasSubtitle) return null;

                    const logoEl = hasLogo ? (
                      <img 
                        src={selectedTemplate.logoUrl} 
                        alt="Logo" 
                        style={{ width: `${selectedTemplate.logoSize || 40}px`, height: 'auto', objectFit: 'contain' }}
                        className="max-h-12 relative z-10"
                      />
                    ) : (
                      (selectedTemplate.includeLogo ?? true) ? (
                        <div 
                          className="rounded-lg flex items-center justify-center font-semibold text-white select-none relative z-10 animate-pulse"
                          style={{
                            width: `${selectedTemplate.logoSize || 32}px`,
                            height: `${selectedTemplate.logoSize || 32}px`,
                            backgroundColor: selectedTemplate.brandNameColor || "#4f46e5",
                            fontSize: `${Math.max(10, (selectedTemplate.logoSize || 32) * 0.35)}px`
                          }}
                        >
                          {(selectedTemplate.brandNameText || selectedTemplate.clinicName || "SY").substring(0, 2).toUpperCase()}
                        </div>
                      ) : null
                    );

                    const brandTextEl = (hasTitle || hasSubtitle) ? (
                      <div className="relative z-10 text-left">
                        {hasTitle && (
                          <h4 
                            style={{
                              fontSize: `${selectedTemplate.brandNameSize || 14}px`,
                              fontWeight: selectedTemplate.brandNameWeight || "900",
                              color: selectedTemplate.brandNameColor || "#1e1b4b"
                            }}
                            className="uppercase tracking-tight leading-tight"
                          >
                            {selectedTemplate.brandNameText || selectedTemplate.clinicName || "SynOS Diagnostics"}
                          </h4>
                        )}
                        {hasSubtitle && (
                          <p 
                            style={{
                              fontSize: `${selectedTemplate.brandSubtitleSize || 8}px`,
                              color: selectedTemplate.brandSubtitleColor || "#71717a"
                            }}
                            className="font-medium mt-0.5 leading-none"
                          >
                            {selectedTemplate.brandSubtitleText || "Accredited Diagnostics Lab"}
                          </p>
                        )}
                      </div>
                    ) : null;

                    const dividerStyle = selectedTemplate.showHeaderDivider !== false ? {
                      borderBottomWidth: `${selectedTemplate.headerDividerThickness ?? 2}px`,
                      borderBottomStyle: selectedTemplate.headerDividerStyle || "solid",
                      borderBottomColor: selectedTemplate.headerDividerColor || "#e2e8f0"
                    } : {};

                    if (selectedTemplate.logoPosition === "Center") {
                      return (
                        <div className="w-full pb-2 mb-3 space-y-2.5 relative z-10" style={dividerStyle}>
                          <div className="flex flex-col items-center text-center gap-1.5">
                            {logoEl}
                            {brandTextEl}
                          </div>
                        </div>
                      );
                    } else if (selectedTemplate.logoPosition === "Right") {
                      return (
                        <div className="w-full pb-2 mb-3 flex justify-between items-stretch gap-4 relative z-10" style={dividerStyle}>
                          <div className="w-[10px]" />
                          <div className="flex items-center gap-2.5 text-right">
                            {brandTextEl}
                            {logoEl}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="w-full pb-2 mb-3 flex justify-between items-stretch gap-4 relative z-10" style={dividerStyle}>
                          <div className="flex items-center gap-2.5">
                            {logoEl}
                            {brandTextEl}
                          </div>
                        </div>
                      );
                    }
                  })()}

                  {/* Physical Preprinted top space indicators in non-absolute layout */}
                  {!selectedTemplate.enableAbsolutePositioning && previewMode === "physical" && selectedTemplate.usePreprinted && (
                    <div className="h-[90px] border border-dashed border-zinc-200 bg-zinc-50/50 rounded-lg flex flex-col justify-center items-center mb-6 relative z-10">
                      <span className="text-[8px] font-semibold tracking-wider text-zinc-600 dark:text-zinc-400">Physical pre-printed sheet header region</span>
                      <span className="text-[7px] text-zinc-400 font-mono mt-0.5">Top Safe Margins: {selectedTemplate.topMargin}mm (~90px gap)</span>
                    </div>
                  )}

                  {/* Patient Info block */}
                  {selectedTemplate.enableAbsolutePositioning ? (
                    <>
                      {/* Invisible placeholders for future workflow binding - mapping structure */}
                      <span className="hidden" data-patient-name-placeholder={"{" + "{" + "PATIENT_NAME" + "}" + "}"} />
                      <span className="hidden" data-ref-doctor-placeholder={"{" + "{" + "REF_DOCTOR" + "}" + "}"} />
                      <span className="hidden" data-age-sex-placeholder={"{" + "{" + "AGE_SEX" + "}" + "}"} />
                      <span className="hidden" data-patient-id-placeholder={"{" + "{" + "PATIENT_ID" + "}" + "}"} />
                      <span className="hidden" data-billing-date-placeholder={"{" + "{" + "BILLING_DATE" + "}" + "}"} />
                      <span className="hidden" data-report-date-placeholder={"{" + "{" + "REPORT_DATE" + "}" + "}"} />

                      {/* 1. Patient Name */}
                      <div
                        style={{
                          position: 'absolute',
                          left: `${coords.patientNameX}mm`,
                          top: `${coords.patientNameY}mm`,
                          cursor: 'grab',
                          zIndex: 20
                        }}
                        onPointerDown={(e) => handleStartDrag(e, 'patientNameX', 'patientNameY', coords.patientNameX, coords.patientNameY)}
                        className="bg-transparent border-0 shadow-none p-1 text-[10px] text-zinc-850 dark:text-zinc-200 transition-all select-none hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 rounded"
                      >
                        <span className="font-bold text-zinc-800 dark:text-zinc-100">Rajesh Kumar</span>
                      </div>

                      {/* 2. Age / Sex */}
                      <div
                        style={{
                          position: 'absolute',
                          left: `${coords.patientAgeSexX}mm`,
                          top: `${coords.patientAgeSexY}mm`,
                          cursor: 'grab',
                          zIndex: 20
                        }}
                        onPointerDown={(e) => handleStartDrag(e, 'patientAgeSexX', 'patientAgeSexY', coords.patientAgeSexX, coords.patientAgeSexY)}
                        className="bg-transparent border-0 shadow-none p-1 text-[10px] text-zinc-850 dark:text-zinc-200 transition-all select-none hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 rounded"
                      >
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">32Y / Male</span>
                      </div>

                      {/* 3. Ref Doctor */}
                      <div
                        style={{
                          position: 'absolute',
                          left: `${coords.refDoctorX}mm`,
                          top: `${coords.refDoctorY}mm`,
                          cursor: 'grab',
                          zIndex: 20
                        }}
                        onPointerDown={(e) => handleStartDrag(e, 'refDoctorX', 'refDoctorY', coords.refDoctorX, coords.refDoctorY)}
                        className="bg-transparent border-0 shadow-none p-1 text-[10px] text-zinc-850 dark:text-zinc-200 transition-all select-none hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 rounded"
                      >
                        <span className="font-bold text-zinc-850 dark:text-zinc-100">Dr. S. Sharma, MD</span>
                      </div>

                      {/* 4. Patient ID */}
                      <div
                        style={{
                          position: 'absolute',
                          left: `${coords.patientIdX}mm`,
                          top: `${coords.patientIdY}mm`,
                          cursor: 'grab',
                          zIndex: 20
                        }}
                        onPointerDown={(e) => handleStartDrag(e, 'patientIdX', 'patientIdY', coords.patientIdX, coords.patientIdY)}
                        className="bg-transparent border-0 shadow-none p-1 text-[10px] text-zinc-850 dark:text-zinc-200 transition-all select-none hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 rounded"
                      >
                        <span className="font-semibold font-mono text-zinc-700 dark:text-zinc-300">PID-2026-8940</span>
                      </div>

                      {/* 5. Billing Date */}
                      <div
                        style={{
                          position: 'absolute',
                          left: `${coords.billingDateX}mm`,
                          top: `${coords.billingDateY}mm`,
                          cursor: 'grab',
                          zIndex: 20
                        }}
                        onPointerDown={(e) => handleStartDrag(e, 'billingDateX', 'billingDateY', coords.billingDateX, coords.billingDateY)}
                        className="bg-transparent border-0 shadow-none p-1 text-[10px] text-zinc-850 dark:text-zinc-200 transition-all select-none hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 rounded"
                      >
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">20-May-2026</span>
                      </div>

                      {/* 6. Report Date */}
                      <div
                        style={{
                          position: 'absolute',
                          left: `${coords.reportDateX}mm`,
                          top: `${coords.reportDateY}mm`,
                          cursor: 'grab',
                          zIndex: 20
                        }}
                        onPointerDown={(e) => handleStartDrag(e, 'reportDateX', 'reportDateY', coords.reportDateX, coords.reportDateY)}
                        className="bg-transparent border-0 shadow-none p-1 text-[10px] text-zinc-850 dark:text-zinc-200 transition-all select-none hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 rounded"
                      >
                        <span className="font-bold text-zinc-800 dark:text-zinc-100">22-May-2026</span>
                      </div>
                    </>
                  ) : (
                    /* Default/Legacy Patient Info block */
                    <div
                      style={{
                        marginTop: '10px',
                        marginBottom: '15px'
                      }}
                      className="transition-all"
                    >
                      <div className="flex justify-between items-center text-[9px] border-b border-zinc-150 pb-1.5 font-semibold text-zinc-650 dark:text-zinc-400">
                        <div>
                          <span className="font-bold text-zinc-800">Patient:</span> Rajesh Kumar, M / 32Y
                        </div>
                        <div>
                          <span className="font-bold text-zinc-800">Referrer:</span> Dr. S. Sharma, MD
                        </div>
                        <div>
                          <span className="font-bold text-zinc-800">Date:</span> 20-May-2026
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 7. Test Title */}
                  {selectedTemplate.enableAbsolutePositioning ? (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${coords.testTitleX}mm`,
                        top: `${coords.testTitleY}mm`,
                        cursor: 'grab',
                        zIndex: 20
                      }}
                      onPointerDown={(e) => handleStartDrag(e, 'testTitleX', 'testTitleY', coords.testTitleX, coords.testTitleY)}
                      className="bg-transparent border-0 shadow-none p-1 transition-all select-none hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 rounded"
                    >
                      <div className={cn(
                        "text-[9px] tracking-wider text-zinc-650 mb-1 font-semibold",
                        selectedTemplate.density === "Compact" && "py-0.5",
                        selectedTemplate.density === "Comfortable" && "py-1.5",
                        selectedTemplate.density === "Large-print" && "py-2.5 text-xs"
                      )}>
                        Clinical Investigation Findings
                      </div>
                    </div>
                  ) : null}

                  {/* 8. Results Table */}
                  <div
                    style={selectedTemplate.enableAbsolutePositioning ? {
                      position: 'absolute',
                      top: `${coords.resultsTableY}mm`,
                      left: `${coords.resultsTableX}mm`,
                      width: `calc(210mm - ${(selectedTemplate.leftRightMargin ?? 15) * 2}mm)`,
                      cursor: 'grab',
                      zIndex: 10
                    } : {
                      marginTop: '20px',
                      flex: 1
                    }}
                    onPointerDown={selectedTemplate.enableAbsolutePositioning ? (e) => handleStartDrag(e, 'resultsTableX', 'resultsTableY', coords.resultsTableX, coords.resultsTableY) : undefined}
                    className={cn(
                      "transition-all",
                      selectedTemplate.enableAbsolutePositioning && "hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 p-1 rounded"
                    )}
                  >
                    {!selectedTemplate.enableAbsolutePositioning && (
                      <div className={cn(
                        "text-[9px] tracking-wider text-zinc-600 dark:text-zinc-400 mb-2 font-semibold",
                        selectedTemplate.density === "Compact" && "py-0.5",
                        selectedTemplate.density === "Comfortable" && "py-1.5",
                        selectedTemplate.density === "Large-print" && "py-2.5 text-xs"
                      )}>
                        Clinical Investigation Findings
                      </div>
                    )}
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-t border-b border-zinc-900 text-[9px] font-bold text-zinc-800">
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
                      <tbody className="text-[10px] text-zinc-800">
                        {[
                          { name: "GLUCOSE ESTIMATION, FASTING", val: "104.5", unit: "mg/dL", ref: "70.0 - 110.0", meth: "Hexokinase" },
                          { name: "GLUCOSE ESTIMATION, POST-PRANDIAL", val: "142.8", unit: "mg/dL", ref: "70.0 - 140.0", meth: "GOD-PAP" }
                        ].map((row, rIdx) => (
                          <tr 
                            key={rIdx} 
                            className={cn(
                              "border-b border-zinc-100",
                              selectedTemplate.density === "Compact" ? "leading-tight" :
                              selectedTemplate.density === "Large-print" ? "py-3 text-xs" : "py-1.5"
                            )}
                          >
                            {selectedTemplate.columns.map((col, cIdx) => {
                              let text = "";
                              if (col.code === "Parameter") text = row.name;
                              else if (col.code === "Value") text = row.val;
                              else if (col.code === "Unit") text = row.unit;
                              else if (col.code === "ReferenceRange") text = row.ref;
                              else if (col.code === "Methodology") text = row.meth;

                              return (
                                <td
                                  key={cIdx}
                                  className={cn(
                                    col.bold && "font-bold text-zinc-950",
                                    col.alignment === "Left" ? "text-left" : col.alignment === "Center" ? "text-center" : "text-right",
                                    selectedTemplate.density === "Compact" ? "py-1 px-2" :
                                    selectedTemplate.density === "Large-print" ? "py-3 px-2 text-xs" : "py-2 px-2"
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

                  {/* 9. Interpretation Comments */}
                  {selectedTemplate.enableAbsolutePositioning ? (
                    <div
                      style={{
                        position: 'absolute',
                        top: `${coords.interpretationY}mm`,
                        left: `${coords.interpretationX}mm`,
                        width: `calc(210mm - ${(selectedTemplate.leftRightMargin ?? 15) * 2}mm)`,
                        cursor: 'grab',
                        zIndex: 10
                      }}
                      onPointerDown={(e) => handleStartDrag(e, 'interpretationX', 'interpretationY', coords.interpretationX, coords.interpretationY)}
                      className="bg-transparent border-0 shadow-none p-1 transition-all select-none hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 rounded"
                    >
                      <div className="bg-transparent p-0 border-t border-dashed border-zinc-200 text-left pt-2">
                        <span className="font-bold block text-[7px] text-zinc-500 uppercase tracking-wide">Commentaries & Remarks</span>
                        <p className="text-[7.5px] italic text-zinc-650 mt-0.5 leading-normal">
                          Mock interpretation comments. The biological activity and clinical interpretation should be carefully evaluated with reference ranges.
                        </p>
                      </div>
                    </div>
                  ) : null}

                </div>

                {/* Signatures & Footer Blocks */}
                <div>
                  {/* 10. Signature Area */}
                  {(selectedTemplate.includeSignatures ?? true) && (
                    <div
                      style={selectedTemplate.enableAbsolutePositioning ? {
                        position: 'absolute',
                        bottom: `${coords.signatureY}mm`,
                        left: `${coords.signatureX}mm`,
                        width: `calc(210mm - ${(selectedTemplate.leftRightMargin ?? 15) * 2}mm)`,
                        cursor: 'grab',
                        zIndex: 10
                      } : {
                        marginTop: '30px'
                      }}
                      onPointerDown={selectedTemplate.enableAbsolutePositioning ? (e) => handleStartDrag(e, 'signatureX', 'signatureY', coords.signatureX, coords.signatureY, true) : undefined}
                      className={cn(
                        "grid grid-cols-3 gap-6 pt-4 border-t border-dashed border-zinc-200 transition-all",
                        selectedTemplate.enableAbsolutePositioning && "hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 p-1 rounded"
                      )}
                    >
                      {selectedTemplate.signatureSlots.map((slot, idx) => (
                        <div key={idx} className="text-center min-h-[45px] flex flex-col justify-end">
                          {previewMode === "digital" && selectedTemplate.includeBranding && (
                            <span className="font-mono text-[7px] text-zinc-500 italic block mb-0.5">/Signed digitally/</span>
                          )}
                          <div className="border-t border-zinc-300 pt-1 text-[8px] font-semibold text-zinc-650">
                            {slot.title}
                            {slot.required && <span className="text-rose-500 font-bold ml-0.5">*</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Physical Preprinted Bottom Margins indicator in non-absolute layout */}
                  {!selectedTemplate.enableAbsolutePositioning && previewMode === "physical" && selectedTemplate.usePreprinted && (
                    <div className="h-[70px] border border-dashed border-zinc-200 bg-zinc-50/50 rounded-lg flex flex-col justify-center items-center mt-4 relative">
                      <span className="text-[8px] font-semibold tracking-wider text-zinc-600 dark:text-zinc-400">Physical pre-printed sheet region</span>
                      <span className="text-[7px] text-zinc-400 font-mono mt-0.5">Bottom Safe Margins: {selectedTemplate.bottomMargin}mm (~70px gap)</span>
                    </div>
                  )}

                  {/* Digital mode Footer bar */}
                  {((previewMode === "digital") || (previewMode === "physical" && !selectedTemplate.usePreprinted)) && selectedTemplate.includeBranding && (selectedTemplate.includeFooter ?? true) && selectedTemplate.footerText && (
                    <div 
                      style={selectedTemplate.enableAbsolutePositioning ? {
                        position: 'absolute',
                        bottom: '8mm',
                        left: `${selectedTemplate.leftRightMargin ?? 15}mm`,
                        width: `calc(210mm - ${(selectedTemplate.leftRightMargin ?? 15) * 2}mm)`,
                        zIndex: 10
                      } : {}}
                      className="mt-4 pt-2 border-t border-zinc-200 text-center text-[7px] text-zinc-400 font-medium"
                    >
                      {selectedTemplate.footerText}
                    </div>
                  )}
                </div>

              </div>

            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


