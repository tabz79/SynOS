import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
    Trash2, 
    Edit2, 
    Plus, 
    Check, 
    X, 
    QrCode, 
    ShieldCheck, 
    CheckCircle2, 
    Layers, 
    Info,
    Sparkles,
    FileText,
    Building2,
    Columns,
    Upload,
    Phone,
    Mail
} from 'lucide-react';

const CanvasContext = createContext({ readOnly: false });

/**
 * Inline editable & deletable text element
 */
const EditableField = ({ 
    label, 
    value, 
    onSave, 
    onDelete, 
    canDelete = true, 
    canEdit = true,
    readOnly,
    className = "",
    labelClassName = "text-zinc-500",
    valueClassName = "font-bold text-zinc-900",
    isBlock = false
}) => {
    const ctx = useContext(CanvasContext);
    const isReadOnly = readOnly !== undefined ? readOnly : ctx.readOnly;
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value || "");
    const [tempLabel, setTempLabel] = useState(label || "");

    useEffect(() => {
        setTempValue(value || "");
    }, [value]);

    useEffect(() => {
        setTempLabel(label || "");
    }, [label]);

    const handleSave = () => {
        if (onSave) {
            onSave(tempLabel, tempValue);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            setTempValue(value || "");
            setTempLabel(label || "");
            setIsEditing(false);
        }
    };

    // Clean label to eliminate double colons (e.g. "Doctor Name:" instead of "Doctor Name::")
    const cleanLabel = label ? label.trim().replace(/[:\s]+$/, '') + ':' : '';

    if (isReadOnly) {
        return (
            <div className={`inline-flex items-center gap-1.5 max-w-full min-w-0 ${className} ${isBlock ? 'flex justify-between w-full' : ''}`}>
                <div className={`flex items-center gap-1 min-w-0 ${isBlock ? 'justify-between w-full' : 'flex-1'}`}>
                    {cleanLabel && <span className={`${labelClassName} shrink-0`}>{cleanLabel}</span>}
                    <span className={`${valueClassName}`}>{value}</span>
                </div>
            </div>
        );
    }

    if (isEditing) {
        return (
            <div className={`inline-flex items-center gap-1.5 p-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded shadow-xs text-xs z-30 ${isBlock ? 'w-full' : ''} max-w-full`}>
                {label !== undefined && (
                    <input 
                        type="text" 
                        value={tempLabel}
                        onChange={(e) => setTempLabel(e.target.value)}
                        placeholder="Label"
                        className="px-1.5 py-0.5 text-[10px] font-bold border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 w-24 shrink-0 text-zinc-700 dark:text-zinc-200 outline-none"
                    />
                )}
                <input 
                    type="text" 
                    value={tempValue}
                    autoFocus
                    onChange={(e) => setTempValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Value / Text"
                    className="px-1.5 py-0.5 text-xs font-semibold border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 flex-1 min-w-0 text-zinc-900 dark:text-zinc-100 outline-none"
                />
                <button 
                    type="button" 
                    onClick={handleSave} 
                    className="p-1 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-950/60 rounded cursor-pointer shrink-0"
                    title="Save changes (Enter)"
                >
                    <Check size={12} />
                </button>
                <button 
                    type="button" 
                    onClick={() => {
                        setTempValue(value || "");
                        setTempLabel(label || "");
                        setIsEditing(false);
                    }} 
                    className="p-1 text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800 rounded cursor-pointer shrink-0"
                    title="Cancel (Esc)"
                >
                    <X size={12} />
                </button>
                {canDelete && onDelete && (
                    <button 
                        type="button" 
                        onClick={() => {
                            setIsEditing(false);
                            onDelete();
                        }} 
                        className="p-1 text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-950/60 rounded cursor-pointer shrink-0"
                        title="Delete (Remove)"
                    >
                        <Trash2 size={12} />
                    </button>
                )}
            </div>
        );
    }

    return (
        <div 
            onClick={(e) => {
                if (!isReadOnly && canEdit) {
                    setTempValue(value || "");
                    setTempLabel(label || "");
                    setIsEditing(true);
                }
            }}
            className={`group/field relative inline-flex items-center gap-1.5 rounded px-1 -mx-1 transition-all hover:bg-indigo-50/70 dark:hover:bg-indigo-950/50 hover:ring-1 hover:ring-indigo-300/60 max-w-full min-w-0 cursor-pointer ${className} ${isBlock ? 'flex justify-between w-full' : ''}`}
        >
            <div className={`flex items-center gap-1 min-w-0 ${isBlock ? 'justify-between w-full' : 'flex-1'}`}>
                {cleanLabel && <span className={`${labelClassName} shrink-0`}>{cleanLabel}</span>}
                <span className={`${valueClassName}`}>{value}</span>
            </div>

            {/* HOVER ACTIONS - Absolute overlay positioned to never steal physical layout width */}
            <div className="opacity-0 pointer-events-none group-hover/field:pointer-events-auto group-hover/field:opacity-100 transition-opacity absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-white/95 dark:bg-zinc-800/95 shadow-xs border border-zinc-200 dark:border-zinc-700 rounded px-1 py-0.5 z-20">
                {canEdit && (
                    <button 
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setTempValue(value || "");
                            setTempLabel(label || "");
                            setIsEditing(true);
                        }}
                        className="p-0.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/60 rounded cursor-pointer"
                        title="Edit text"
                    >
                        <Edit2 size={11} />
                    </button>
                )}
                {canDelete && onDelete && (
                    <button 
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="p-0.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded cursor-pointer"
                        title="Delete this text/field"
                    >
                        <Trash2 size={11} />
                    </button>
                )}
            </div>
        </div>
    );
};

/**
 * Modular Box Wrapper with hover toolbar & delete/add controls
 */
const ModularBoxWrapper = ({ 
    boxId, 
    boxName, 
    onDeleteBox, 
    onAddCustomLine, 
    extraToolbarActions,
    children, 
    className = "",
    allowDelete = true,
    readOnly
}) => {
    const ctx = useContext(CanvasContext);
    const isReadOnly = readOnly !== undefined ? readOnly : ctx.readOnly;
    const isThermal = ctx.isThermal;
    const [showAddForm, setShowAddForm] = useState(false);
    const [newLabel, setNewLabel] = useState("");
    const [newValue, setNewValue] = useState("");

    const handleAdd = (e) => {
        e.preventDefault();
        if (!newValue.trim() && !newLabel.trim()) return;
        if (onAddCustomLine) {
            onAddCustomLine({ label: newLabel.trim(), value: newValue.trim() });
        }
        setNewLabel("");
        setNewValue("");
        setShowAddForm(false);
    };

    if (isReadOnly) {
        return (
            <div className={`relative mb-3 ${className}`}>
                {children}
            </div>
        );
    }

    return (
        <div className={`group/box relative border border-dashed border-transparent hover:border-indigo-400 rounded-xl transition-all ${isThermal ? 'p-1 -m-1 mb-2' : 'p-2 -m-2 mb-3'} ${className}`}>
            {/* FLOATING BOX HOVER TOOLBAR - Positioned cleanly above box content to avoid blocking text editing */}
            <div className={`absolute ${isThermal ? '-top-6 right-0' : '-top-3 right-3'} opacity-0 group-hover/box:opacity-100 transition-all flex items-center gap-1 bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 shadow-md rounded-lg px-2 py-0.5 text-[10px] z-30 select-none`}>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mr-1">
                    <Layers size={10} /> {boxName}
                </span>

                {extraToolbarActions}

                <button 
                    type="button"
                    onClick={() => setShowAddForm(prev => !prev)}
                    className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 font-bold flex items-center gap-0.5 cursor-pointer"
                >
                    <Plus size={10} /> Add Field
                </button>

                {allowDelete && onDeleteBox && (
                    <button 
                        type="button"
                        onClick={onDeleteBox}
                        className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 font-bold flex items-center gap-0.5 cursor-pointer ml-1"
                    >
                        <Trash2 size={10} /> Delete Box
                    </button>
                )}
            </div>

            {/* INLINE ADD FIELD FORM */}
            {showAddForm && (
                <form onSubmit={handleAdd} className="mb-3 p-2 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg flex items-center gap-2 text-xs">
                    <input 
                        type="text" 
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="Label (e.g. Specimen Type)"
                        className="px-2 py-1 bg-white dark:bg-zinc-900 border rounded text-xs font-semibold w-36 outline-none"
                    />
                    <input 
                        type="text" 
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        placeholder="Value (e.g. Fasting EDTA Whole Blood)"
                        className="px-2 py-1 bg-white dark:bg-zinc-900 border rounded text-xs flex-1 outline-none font-bold"
                    />
                    <button 
                        type="submit" 
                        className="px-2.5 py-1 bg-indigo-600 text-white rounded font-bold text-[11px] cursor-pointer"
                    >
                        Add
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setShowAddForm(false)} 
                        className="px-2 py-1 bg-zinc-200 dark:bg-zinc-800 rounded font-semibold text-[11px] cursor-pointer"
                    >
                        Cancel
                    </button>
                </form>
            )}

            {children}
        </div>
    );
};

export const DynamicInvoiceCanvas = ({
    schema,
    onUpdateSchema,
    letterheadMode = "digital",
    topMarginMm = 40,
    labSettings = {},
    onUpdateLabSetting,
    onToggleBox,
    readOnly = false
}) => {
    const [showColumnManager, setShowColumnManager] = useState(false);
    const [newColName, setNewColName] = useState("");
    const [editingColumn, setEditingColumn] = useState(null); // { boxId, colKey, label }
    const [editColLabel, setEditColLabel] = useState("");

    // Helper to update schema immutably
    const updateSchema = (newSchema) => {
        if (onUpdateSchema) onUpdateSchema(newSchema);
    };

    if (!schema || !schema.boxes) {
        return <div className="p-8 text-center text-zinc-400">Loading document canvas...</div>;
    }

    const { boxes } = schema;
    const isThermal = schema.isThermal || letterheadMode === 'raw_thermal' || schema.paperSize === 'thermal80';
    const effectiveLogo = labSettings?.logoUrl || (typeof window !== 'undefined' ? window.localStorage?.getItem('synos_lab_logo') : null);
    const effectiveQrImage = boxes.bankAndUpi?.customQrImage || labSettings?.customQrImage || (typeof window !== 'undefined' ? window.localStorage?.getItem('synos_custom_qr_image') : null);

    const handleQrUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) {
            alert("QR screenshot or image must be under 3MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            const next = {
                ...schema,
                boxes: {
                    ...boxes,
                    bankAndUpi: {
                        ...boxes.bankAndUpi,
                        customQrImage: dataUrl
                    }
                }
            };
            updateSchema(next);
            if (onUpdateLabSetting) {
                onUpdateLabSetting('customQrImage', dataUrl);
            }
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem('synos_custom_qr_image', dataUrl);
                }
            } catch (storageErr) {
                console.warn("Storage sync warning for QR:", storageErr);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveQr = () => {
        const next = {
            ...schema,
            boxes: {
                ...boxes,
                bankAndUpi: {
                    ...boxes.bankAndUpi,
                    customQrImage: ""
                }
            }
        };
        updateSchema(next);
        if (onUpdateLabSetting) {
            onUpdateLabSetting('customQrImage', "");
        }
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem('synos_custom_qr_image');
            }
        } catch {}
    };

    // Box toggle / delete
    const deleteBox = (boxId) => {
        if (onToggleBox) {
            onToggleBox(boxId, false);
        } else {
            const next = {
                ...schema,
                boxes: {
                    ...boxes,
                    [boxId]: { ...boxes[boxId], enabled: false }
                }
            };
            updateSchema(next);
        }
    };

    // Field updater within a box
    const updateField = (boxId, fieldId, newLabel, newValue) => {
        const box = boxes[boxId];
        if (!box || !box.fields || !box.fields[fieldId]) return;

        // Bi-directional sync with facility stationery settings
        if (onUpdateLabSetting && newValue !== undefined) {
            if (boxId === 'header') {
                if (fieldId === 'legalName') onUpdateLabSetting('labLegalName', newValue);
                else if (fieldId === 'tagline') onUpdateLabSetting('labTradeName', newValue);
                else if (fieldId === 'address') onUpdateLabSetting('address', newValue);
                else if (fieldId === 'phone') onUpdateLabSetting('phone', newValue);
                else if (fieldId === 'email') onUpdateLabSetting('email', newValue);
                else if (fieldId === 'gstin') onUpdateLabSetting('gstin', newValue);
                else if (fieldId === 'pan') onUpdateLabSetting('pan', newValue);
            } else if (boxId === 'bankAndUpi') {
                if (fieldId === 'bankName') onUpdateLabSetting('bankName', newValue);
                else if (fieldId === 'accountNumber') onUpdateLabSetting('accountNumber', newValue);
                else if (fieldId === 'ifsc') onUpdateLabSetting('ifscCode', newValue);
                else if (fieldId === 'upiId') onUpdateLabSetting('upiId', newValue);
            }
        }

        const next = {
            ...schema,
            boxes: {
                ...boxes,
                [boxId]: {
                    ...box,
                    fields: {
                        ...box.fields,
                        [fieldId]: {
                            ...box.fields[fieldId],
                            label: newLabel !== undefined ? newLabel : box.fields[fieldId].label,
                            value: newValue !== undefined ? newValue : box.fields[fieldId].value
                        }
                    }
                }
            }
        };
        updateSchema(next);
    };

    // Field deleter within a box
    const deleteField = (boxId, fieldId) => {
        const box = boxes[boxId];
        if (!box || !box.fields || !box.fields[fieldId]) return;

        const next = {
            ...schema,
            boxes: {
                ...boxes,
                [boxId]: {
                    ...box,
                    fields: {
                        ...box.fields,
                        [fieldId]: {
                            ...box.fields[fieldId],
                            enabled: false
                        }
                    }
                }
            }
        };
        updateSchema(next);
    };

    // Add custom line to a box
    const addCustomLine = (boxId, line) => {
        const box = boxes[boxId];
        if (!box) return;

        const customLines = box.customLines || [];
        const next = {
            ...schema,
            boxes: {
                ...boxes,
                [boxId]: {
                    ...box,
                    customLines: [
                        ...customLines,
                        { id: `custom-${Date.now()}`, label: line.label, value: line.value, enabled: true }
                    ]
                }
            }
        };
        updateSchema(next);
    };

    // Delete custom line
    const deleteCustomLine = (boxId, lineId) => {
        const box = boxes[boxId];
        if (!box || !box.customLines) return;

        const next = {
            ...schema,
            boxes: {
                ...boxes,
                [boxId]: {
                    ...box,
                    customLines: box.customLines.filter(l => l.id !== lineId)
                }
            }
        };
        updateSchema(next);
    };

    // Table Column deleter
    const deleteColumn = (boxId, colId) => {
        const box = boxes[boxId];
        if (!box || !box.columns || !box.columns[colId]) return;

        const next = {
            ...schema,
            boxes: {
                ...boxes,
                [boxId]: {
                    ...box,
                    columns: {
                        ...box.columns,
                        [colId]: { ...box.columns[colId], enabled: false }
                    }
                }
            }
        };
        updateSchema(next);
    };

    // Table Column toggle (enable / disable)
    const toggleColumn = (boxId, colId, enabled) => {
        const box = boxes[boxId];
        if (!box || !box.columns || !box.columns[colId]) return;

        const isEnabled = enabled !== undefined ? enabled : !box.columns[colId].enabled;
        const next = {
            ...schema,
            boxes: {
                ...boxes,
                [boxId]: {
                    ...box,
                    columns: {
                        ...box.columns,
                        [colId]: { ...box.columns[colId], enabled: isEnabled }
                    }
                }
            }
        };
        updateSchema(next);
    };

    // Table Column add
    const addColumn = (boxId, label) => {
        const box = boxes[boxId];
        if (!box) return;

        const newId = `col_${Date.now()}`;
        const newLabel = label || 'New Column';
        const next = {
            ...schema,
            boxes: {
                ...boxes,
                [boxId]: {
                    ...box,
                    columns: {
                        ...(box.columns || {}),
                        [newId]: { id: newId, label: newLabel, enabled: true }
                    }
                }
            }
        };
        updateSchema(next);
    };

    // Table Column updater
    const updateColumnLabel = (boxId, colId, newLabel) => {
        const box = boxes[boxId];
        if (!box || !box.columns || !box.columns[colId]) return;

        const next = {
            ...schema,
            boxes: {
                ...boxes,
                [boxId]: {
                    ...box,
                    columns: {
                        ...box.columns,
                        [colId]: { ...box.columns[colId], label: newLabel }
                    }
                }
            }
        };
        updateSchema(next);
    };

    // Table Row deleter
    const deleteRow = (boxId, rowId) => {
        const box = boxes[boxId];
        if (!box || !box.rows) return;

        const next = {
            ...schema,
            boxes: {
                ...boxes,
                [boxId]: {
                    ...box,
                    rows: box.rows.filter(r => r.id !== rowId)
                }
            }
        };
        updateSchema(next);
    };

    // Table Row updater
    const updateRowCell = (boxId, rowId, cellKey, newVal) => {
        const box = boxes[boxId];
        if (!box || !box.rows) return;

        const next = {
            ...schema,
            boxes: {
                ...boxes,
                [boxId]: {
                    ...box,
                    rows: box.rows.map(r => r.id === rowId ? { ...r, [cellKey]: newVal } : r)
                }
            }
        };
        updateSchema(next);
    };

    // Custom Box Deleter (for user-added custom boxes)
    const deleteCustomBox = (boxId) => {
        const nextBoxes = { ...boxes };
        delete nextBoxes[boxId];
        updateSchema({ ...schema, boxes: nextBoxes });
    };

    // Helper to extract metadata fields for the top-right card in A4 mode
    const docBadgeFields = boxes.docBadge?.fields || {};
    const statusEntry = Object.entries(docBadgeFields).find(([k]) => k === 'paymentStatus' || k === 'status');
    const statusKey = statusEntry ? statusEntry[0] : null;
    const statusField = statusEntry ? statusEntry[1] : null;

    // The metadata entries for the top-right card (exclude badge title, sub-badge, and status)
    const metaEntries = Object.entries(docBadgeFields).filter(([k, f]) => {
        if (!f || f.enabled === false) return false;
        if (k === 'badgeTitle' || k === 'subBadge' || k === 'paymentStatus' || k === 'status') return false;
        return true;
    });

    // Helper for status badge styling
    const getStatusBadgeClass = (statusStr) => {
        const s = String(statusStr || "").toUpperCase();
        if (s.includes('DUE') || s.includes('PENDING') || s.includes('CLAIM')) {
            return 'bg-amber-100 text-amber-900 border-amber-300';
        }
        if (s.includes('PAID') || s.includes('SETTLED')) {
            return 'bg-emerald-100 text-emerald-900 border-emerald-300';
        }
        if (s.includes('PREPAID') || s.includes('PARTNER')) {
            return 'bg-blue-100 text-blue-900 border-blue-300';
        }
        return 'bg-zinc-100 text-zinc-900 border-zinc-300';
    };

    // Compute lab initials tile for header
    const labLegalName = boxes.header?.fields?.legalName?.value || labSettings.labLegalName || 'Sri Divya Diagnostic Centre';
    const labWords = labLegalName.split(/\s+/).filter(w => !['AND', '&', 'THE', 'OF', 'CENTRE', 'CENTER', 'LABORATORY', 'LAB'].includes(w.toUpperCase()));
    const labInitials = (labWords.length >= 2 ? labWords.slice(0, 2).map(w => w[0]).join('') : labLegalName.slice(0, 2)).toUpperCase();

    // Financial fields split: normal summary items vs highlighted net due item
    const finFields = Object.entries(boxes.financialSummary?.fields || {}).filter(([_, f]) => f && f.enabled !== false);
    const netKeysPriority = ['balanceDue', 'netDue', 'totalDue', 'netPayable', 'netSalary', 'counterPayable', 'totalAmount'];
    let summaryNetEntry = null;
    for (const key of netKeysPriority) {
        const found = finFields.find(([k]) => k === key);
        if (found) {
            summaryNetEntry = found;
            break;
        }
    }
    if (!summaryNetEntry && finFields.length > 0) {
        summaryNetEntry = finFields[finFields.length - 1];
    }
    const summaryNormalEntries = finFields.filter(([k]) => !summaryNetEntry || k !== summaryNetEntry[0]);

    const isNumericCol = (colKey) => {
        return ['price', 'amount', 'grossAmount', 'netDue', 'received', 'labBilled', 'labTariff', 'rate', 'unitPrice', 'total', 'totalAmount', 'paidAmount', 'pendingAmount', 'dueAmount', 'tariff', 'discount', 'concession', 'b2bRate', 'patientPaid', 'referralAmount', 'billedAmount', 'approvedAmount', 'patientCoPay', 'claimAmount', 'counterDue', 'patientDue', 'coveredBy'].includes(colKey);
    };

    return (
        <CanvasContext.Provider value={{ readOnly, isThermal }}>
            <div className={`w-full flex flex-col justify-between leading-tight ${
                isThermal 
                    ? 'w-[70mm] max-w-[70mm] mx-auto font-sans text-[10.5px] text-black bg-white p-0' 
                    : 'text-zinc-900 text-xs font-sans leading-normal'
            }`}>
            
            {/* 1. LETTERHEAD & BRAND HEADER BOX */}
            {boxes.header?.enabled && (
                <ModularBoxWrapper 
                    boxId="header" 
                    boxName={boxes.header.name || "Brand Header"}
                    onDeleteBox={() => deleteBox('header')}
                    onAddCustomLine={(line) => addCustomLine('header', line)}
                >
                    {letterheadMode === 'preprinted' ? (
                        <div style={{ height: `${topMarginMm}mm` }} className="w-full flex items-center justify-center border border-dashed border-zinc-300 rounded text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                            Pre-Printed Stationery Clearance ({topMarginMm} mm)
                        </div>
                    ) : isThermal ? (
                        <div className="border-b-2 border-black pb-1 mb-1 text-center">
                            {effectiveLogo && (
                                <div className="flex justify-center mb-1">
                                    <img 
                                        src={effectiveLogo} 
                                        alt="Diagnostic Brand Logo" 
                                        className="max-h-11 max-w-[140px] object-contain filter grayscale contrast-200" 
                                    />
                                </div>
                            )}
                            {boxes.header.fields?.legalName?.enabled && (
                                <div className="block">
                                    <EditableField 
                                        value={boxes.header.fields.legalName.value || labSettings.labLegalName}
                                        onSave={(_, val) => updateField('header', 'legalName', undefined, val)}
                                        onDelete={() => deleteField('header', 'legalName')}
                                        valueClassName="text-[15px] font-black text-black tracking-tight uppercase leading-tight"
                                    />
                                </div>
                            )}
                            {boxes.header.fields?.tagline?.enabled && (
                                <div className="block mt-0.5">
                                    <EditableField 
                                        value={boxes.header.fields.tagline.value || labSettings.labTradeName}
                                        onSave={(_, val) => updateField('header', 'tagline', undefined, val)}
                                        onDelete={() => deleteField('header', 'tagline')}
                                        valueClassName="text-[9.5px] font-bold text-black uppercase block tracking-wider"
                                    />
                                </div>
                            )}
                            {boxes.header.fields?.address?.enabled && (
                                <div className="block mt-0.5">
                                    <EditableField 
                                        value={boxes.header.fields.address.value || labSettings.address}
                                        onSave={(_, val) => updateField('header', 'address', undefined, val)}
                                        onDelete={() => deleteField('header', 'address')}
                                        valueClassName="text-[9.5px] font-semibold text-black block leading-tight"
                                    />
                                </div>
                            )}
                            <div className="flex justify-center flex-wrap items-center gap-x-1.5 text-[9.5px] text-black font-bold mt-0.5">
                                {boxes.header.fields?.gstin?.enabled && (
                                    <EditableField 
                                        label="GSTIN:"
                                        value={boxes.header.fields.gstin.value || labSettings.gstin}
                                        onSave={(lbl, val) => updateField('header', 'gstin', lbl, val)}
                                        onDelete={() => deleteField('header', 'gstin')}
                                        labelClassName="text-black font-bold"
                                        valueClassName="font-mono font-bold text-black"
                                    />
                                )}
                                {boxes.header.fields?.phone?.enabled && (
                                    <EditableField 
                                        label=" | Ph:"
                                        value={boxes.header.fields.phone.value || labSettings.phone}
                                        onSave={(lbl, val) => updateField('header', 'phone', lbl, val)}
                                        onDelete={() => deleteField('header', 'phone')}
                                        labelClassName="text-black font-bold"
                                        valueClassName="text-black font-bold"
                                    />
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-2">
                            {/* Top-Left Diagnostics Brand Logo & Lab Identity */}
                            <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                <div className="shrink-0 pt-0.5">
                                    {effectiveLogo ? (
                                        <div className="w-14 h-14 p-1 rounded-xl border border-zinc-200 bg-white flex items-center justify-center overflow-hidden shadow-2xs">
                                            <img 
                                                src={effectiveLogo} 
                                                alt="Diagnostic Centre Brand Logo" 
                                                className="w-full h-full object-contain" 
                                            />
                                        </div>
                                    ) : (
                                        <div 
                                            title="Brand Logo Tile"
                                            className="w-14 h-14 rounded-xl bg-teal-800 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-2xs uppercase tracking-wider select-none"
                                        >
                                            {labInitials}
                                        </div>
                                    )}
                                </div>

                                {/* Header Particulars */}
                                <div className="flex-1 min-w-0 space-y-0.5">
                                    {boxes.header.fields?.legalName?.enabled && (
                                        <div className="block">
                                            <EditableField 
                                                value={boxes.header.fields.legalName.value || labSettings.labLegalName}
                                                onSave={(_, val) => updateField('header', 'legalName', undefined, val)}
                                                onDelete={() => deleteField('header', 'legalName')}
                                                valueClassName="text-lg font-black text-zinc-900 tracking-tight uppercase block leading-tight"
                                            />
                                        </div>
                                    )}
                                    {boxes.header.fields?.tagline?.enabled && (
                                        <div className="block">
                                            <EditableField 
                                                value={boxes.header.fields.tagline.value || labSettings.labTradeName}
                                                onSave={(_, val) => updateField('header', 'tagline', undefined, val)}
                                                onDelete={() => deleteField('header', 'tagline')}
                                                valueClassName="text-[10px] text-zinc-500 block leading-tight"
                                            />
                                        </div>
                                    )}
                                    {boxes.header.fields?.address?.enabled && (
                                        <div className="block">
                                            <EditableField 
                                                value={boxes.header.fields.address.value || labSettings.address}
                                                onSave={(_, val) => updateField('header', 'address', undefined, val)}
                                                onDelete={() => deleteField('header', 'address')}
                                                valueClassName="text-[10.5px] text-zinc-600 block leading-relaxed"
                                            />
                                        </div>
                                    )}
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[10px] text-zinc-600 font-semibold pt-0.5">
                                        {boxes.header.fields?.phone?.enabled && (
                                            <div className="inline-flex items-center gap-1">
                                                <Phone size={10} className="text-zinc-400 shrink-0" />
                                                <EditableField 
                                                    value={boxes.header.fields.phone.value || labSettings.phone}
                                                    onSave={(lbl, val) => updateField('header', 'phone', lbl, val)}
                                                    onDelete={() => deleteField('header', 'phone')}
                                                    valueClassName="font-mono text-zinc-800"
                                                />
                                            </div>
                                        )}
                                        {boxes.header.fields?.email?.enabled && (
                                            <div className="inline-flex items-center gap-1">
                                                <Mail size={10} className="text-zinc-400 shrink-0" />
                                                <EditableField 
                                                    value={boxes.header.fields.email.value || labSettings.email}
                                                    onSave={(lbl, val) => updateField('header', 'email', lbl, val)}
                                                    onDelete={() => deleteField('header', 'email')}
                                                    valueClassName="text-zinc-800"
                                                />
                                            </div>
                                        )}
                                        {boxes.header.fields?.gstin?.enabled && (
                                            <EditableField 
                                                label="GSTIN"
                                                value={boxes.header.fields.gstin.value || labSettings.gstin}
                                                onSave={(lbl, val) => updateField('header', 'gstin', lbl, val)}
                                                onDelete={() => deleteField('header', 'gstin')}
                                                valueClassName="font-mono font-bold text-zinc-900"
                                            />
                                        )}
                                        {boxes.header.fields?.pan?.enabled && (
                                            <EditableField 
                                                label="PAN"
                                                value={boxes.header.fields.pan.value || labSettings.pan}
                                                onSave={(lbl, val) => updateField('header', 'pan', lbl, val)}
                                                onDelete={() => deleteField('header', 'pan')}
                                                valueClassName="font-mono font-bold text-zinc-900"
                                            />
                                        )}
                                    </div>

                                    {/* Custom Lines in Header */}
                                    {boxes.header.customLines?.map(line => (
                                        <div key={line.id} className="pt-0.5">
                                            <EditableField 
                                                label={line.label ? `${line.label}:` : ""}
                                                value={line.value}
                                                onSave={(lbl, val) => {
                                                    const nextLines = boxes.header.customLines.map(l => l.id === line.id ? { ...l, label: lbl, value: val } : l);
                                                    updateSchema({ ...schema, boxes: { ...boxes, header: { ...boxes.header, customLines: nextLines } } });
                                                }}
                                                onDelete={() => deleteCustomLine('header', line.id)}
                                                valueClassName="text-[10px] text-zinc-700 font-medium"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Top-Right Shaded Metadata Card */}
                            {boxes.docBadge?.enabled && metaEntries.length > 0 && (
                                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 min-w-[260px] max-w-[320px] text-[11px] shadow-2xs space-y-1 shrink-0">
                                    {metaEntries.map(([key, field]) => {
                                        const isNum = key.toLowerCase().includes('number') || key.toLowerCase().includes('no') || key === 'billNumber' || key === 'tokenNumber' || key === 'receiptNumber';
                                        return (
                                            <div key={key} className="flex justify-between items-center gap-3">
                                                <span className="text-zinc-500 font-medium shrink-0">
                                                    {field.label ? field.label.trim().replace(/[:\s]+$/, '') + ':' : ''}
                                                </span>
                                                <EditableField 
                                                    value={field.value}
                                                    onSave={(_, val) => updateField('docBadge', key, undefined, val)}
                                                    onDelete={() => deleteField('docBadge', key)}
                                                    valueClassName={`text-right truncate ${isNum ? 'font-mono font-bold text-zinc-900' : 'font-semibold text-zinc-800'}`}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </ModularBoxWrapper>
            )}

            {/* Divider line below header */}
            {!isThermal && <div className="border-b border-zinc-200 my-2.5" />}

            {/* 2. DOCUMENT BADGE & INVOICE META NUMBERS BOX */}
            {boxes.docBadge?.enabled && (
                <ModularBoxWrapper 
                    boxId="docBadge" 
                    boxName={boxes.docBadge.name || "Document Title & Badges"}
                    onDeleteBox={() => deleteBox('docBadge')}
                    onAddCustomLine={(line) => addCustomLine('docBadge', line)}
                >
                    {isThermal ? (
                        <div className="text-center mb-1.5 border-b-[1.5px] border-black pb-1.5">
                            {boxes.docBadge.fields?.badgeTitle?.enabled && (
                                <div className="mb-1">
                                    <EditableField 
                                        value={boxes.docBadge.fields.badgeTitle.value}
                                        onSave={(_, val) => updateField('docBadge', 'badgeTitle', undefined, val)}
                                        onDelete={() => deleteField('docBadge', 'badgeTitle')}
                                        valueClassName="bg-black text-white px-2.5 py-0.5 rounded-xs font-black text-[11px] uppercase tracking-wider inline-block"
                                    />
                                </div>
                            )}
                            <div className="flex justify-between items-center text-[9.5px] font-bold text-black px-0.5">
                                {boxes.docBadge.fields?.date?.enabled && (
                                    <EditableField 
                                        label="Date:"
                                        value={boxes.docBadge.fields.date.value}
                                        onSave={(lbl, val) => updateField('docBadge', 'date', lbl, val)}
                                        onDelete={() => deleteField('docBadge', 'date')}
                                        labelClassName="text-black font-normal"
                                        valueClassName="font-bold text-black"
                                    />
                                )}
                                {boxes.docBadge.fields?.receiptNumber?.enabled && (
                                    <EditableField 
                                        label="Rcpt:"
                                        value={boxes.docBadge.fields.receiptNumber.value}
                                        onSave={(lbl, val) => updateField('docBadge', 'receiptNumber', lbl, val)}
                                        onDelete={() => deleteField('docBadge', 'receiptNumber')}
                                        labelClassName="text-black font-normal"
                                        valueClassName="font-mono font-bold text-black"
                                    />
                                )}
                            </div>
                            {boxes.docBadge.fields?.tokenNumber?.enabled && (
                                <div className="mt-1.5 p-1 border-2 border-black text-center bg-white">
                                    <span className="text-[9.5px] font-black uppercase text-black tracking-wider block">Token Number</span>
                                    <div className="text-2xl font-black font-mono leading-none mt-0.5 text-black">
                                        <EditableField 
                                            value={boxes.docBadge.fields.tokenNumber.value?.replace(/^TOKEN\s*#\s*/i, '') || 'T-0142'}
                                            onSave={(_, val) => updateField('docBadge', 'tokenNumber', undefined, `TOKEN # ${val}`)}
                                            onDelete={() => deleteField('docBadge', 'tokenNumber')}
                                            valueClassName="text-2xl font-black font-mono leading-none text-black"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="pb-2.5 mb-2.5 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                {boxes.docBadge.fields?.badgeTitle?.enabled && (
                                    <EditableField 
                                        value={boxes.docBadge.fields.badgeTitle.value}
                                        onSave={(_, val) => updateField('docBadge', 'badgeTitle', undefined, val)}
                                        onDelete={() => deleteField('docBadge', 'badgeTitle')}
                                        valueClassName="inline-block px-3.5 py-1 bg-zinc-900 text-white rounded-md font-black text-xs uppercase tracking-wider shadow-2xs"
                                    />
                                )}
                                {statusField && statusField.enabled && (
                                    <EditableField 
                                        value={statusField.value}
                                        onSave={(_, val) => updateField('docBadge', statusKey, undefined, val)}
                                        onDelete={() => deleteField('docBadge', statusKey)}
                                        valueClassName={`inline-block px-3 py-1 rounded-md font-black text-xs uppercase tracking-wider border shadow-2xs ${getStatusBadgeClass(statusField.value)}`}
                                    />
                                )}
                            </div>

                            {boxes.docBadge.fields?.subBadge?.enabled && (
                                <EditableField 
                                    value={boxes.docBadge.fields.subBadge.value}
                                    onSave={(_, val) => updateField('docBadge', 'subBadge', undefined, val)}
                                    onDelete={() => deleteField('docBadge', 'subBadge')}
                                    valueClassName="text-xs text-zinc-600 font-medium"
                                />
                            )}

                            {/* If header was disabled or in preprinted mode, render metadata inline here */}
                            {(!boxes.header?.enabled || letterheadMode === 'preprinted') && (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] w-full pt-1.5 border-t border-zinc-100">
                                    {metaEntries.map(([key, field]) => (
                                        <EditableField 
                                            key={key}
                                            label={field.label}
                                            value={field.value}
                                            onSave={(lbl, val) => updateField('docBadge', key, lbl, val)}
                                            onDelete={() => deleteField('docBadge', key)}
                                            labelClassName="text-zinc-500 font-medium text-[10px]"
                                            valueClassName="font-mono font-bold text-zinc-900"
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Custom Lines in Badge */}
                            {boxes.docBadge.customLines?.map(line => (
                                <div key={line.id} className="w-full text-right">
                                    <EditableField 
                                        label={line.label ? `${line.label}:` : ""}
                                        value={line.value}
                                        onSave={(lbl, val) => {
                                            const nextLines = boxes.docBadge.customLines.map(l => l.id === line.id ? { ...l, label: lbl, value: val } : l);
                                            updateSchema({ ...schema, boxes: { ...boxes, docBadge: { ...boxes.docBadge, customLines: nextLines } } });
                                        }}
                                        onDelete={() => deleteCustomLine('docBadge', line.id)}
                                        valueClassName="text-[10px] text-zinc-600 font-semibold"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </ModularBoxWrapper>
            )}

            {/* 3. BILLED-TO PARTY / PATIENT / DOCTOR / VENDOR DETAILS BOX */}
            {boxes.partyDetails?.enabled && (
                <ModularBoxWrapper 
                    boxId="partyDetails" 
                    boxName={boxes.partyDetails.name || "Party Details Box"}
                    onDeleteBox={() => deleteBox('partyDetails')}
                    onAddCustomLine={(line) => addCustomLine('partyDetails', line)}
                >
                    <div className={isThermal ? "border-b border-dashed border-black pb-1 mb-1 text-[10.5px] leading-tight text-black" : "rounded-xl border border-zinc-200 overflow-hidden mb-3 bg-white shadow-2xs"}>
                        <div className={isThermal ? "mb-0.5" : "bg-slate-100/90 px-3.5 py-1.5 border-b border-zinc-200 flex justify-between items-center"}>
                            <span className={isThermal ? "text-[9.5px] font-black uppercase text-black tracking-wider block" : "text-[10.5px] font-black uppercase text-zinc-700 tracking-wider"}>
                                {boxes.partyDetails.title || "Party Particulars"}
                            </span>
                        </div>

                        <div className={`grid ${isThermal ? 'grid-cols-1 gap-y-0.5' : 'grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 px-4 py-2.5'} text-[11px]`}>
                            {Object.entries(boxes.partyDetails.fields || {}).map(([key, field]) => {
                                if (!field.enabled) return null;
                                const isName = key === 'fullName';
                                const isMrn = key === 'uhid' || key === 'mrn' || key === 'partnerId' || key === 'policyNumber' || key === 'preAuthApprovalNumber';
                                const displayLabel = (isMrn && (!field.label || field.label === 'UHID')) ? 'MRN' : field.label;
                                return (
                                    <div key={key} className={isThermal ? (isName || isMrn ? "py-0.5" : "py-0") : "py-0.5"}>
                                        <EditableField 
                                            label={displayLabel}
                                            value={field.value}
                                            isBlock={false}
                                            onSave={(lbl, val) => updateField('partyDetails', key, lbl, val)}
                                            onDelete={() => deleteField('partyDetails', key)}
                                            labelClassName={isThermal ? (isMrn ? "text-black font-black uppercase text-[10px]" : "text-black font-medium") : "text-zinc-500 font-medium"}
                                            valueClassName={
                                                isThermal 
                                                    ? (isName 
                                                        ? "font-black text-black text-[12px] uppercase tracking-tight block" 
                                                        : isMrn 
                                                            ? "font-black font-mono text-black text-[11.5px]" 
                                                            : "font-bold text-black") 
                                                    : (isName 
                                                        ? "font-black text-zinc-900 text-sm" 
                                                        : isMrn 
                                                            ? "font-mono font-bold text-zinc-900" 
                                                            : "font-bold text-zinc-900")
                                            }
                                        />
                                    </div>
                                );
                            })}

                            {/* Custom Lines in Party Box */}
                            {boxes.partyDetails.customLines?.map(line => (
                                <div key={line.id} className={`py-0.5 ${isThermal ? '' : 'sm:col-span-2'}`}>
                                    <EditableField 
                                        label={line.label}
                                        value={line.value}
                                        isBlock={false}
                                        onSave={(lbl, val) => {
                                            const nextLines = boxes.partyDetails.customLines.map(l => l.id === line.id ? { ...l, label: lbl, value: val } : l);
                                            updateSchema({ ...schema, boxes: { ...boxes, partyDetails: { ...boxes.partyDetails, customLines: nextLines } } });
                                        }}
                                        onDelete={() => deleteCustomLine('partyDetails', line.id)}
                                        labelClassName="text-zinc-500 font-medium"
                                        valueClassName="font-bold text-zinc-900"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Optional integrated biller details bar at bottom of card */}
                        {!isThermal && boxes.billerDetails?.enabled && (
                            <div className="bg-slate-50/70 border-t border-zinc-200 px-3.5 py-1.5 flex flex-wrap items-center gap-x-6 gap-y-1 text-[10.5px]">
                                {Object.entries(boxes.billerDetails.fields || {}).map(([key, field]) => {
                                    if (!field || !field.enabled) return null;
                                    return (
                                        <EditableField 
                                            key={key}
                                            label={field.label}
                                            value={field.value}
                                            onSave={(lbl, val) => updateField('billerDetails', key, lbl, val)}
                                            onDelete={() => deleteField('billerDetails', key)}
                                            labelClassName="text-zinc-500 font-medium"
                                            valueClassName="font-bold text-zinc-800"
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </ModularBoxWrapper>
            )}

            {/* 3B. BILLER / DESK AUDIT DETAILS BOX (Thermal or Standalone) */}
            {boxes.billerDetails?.enabled && (isThermal || !boxes.partyDetails?.enabled) && (
                <ModularBoxWrapper 
                    boxId="billerDetails" 
                    boxName={boxes.billerDetails.name || "Billing Desk Box"}
                    onDeleteBox={() => deleteBox('billerDetails')}
                    onAddCustomLine={(line) => addCustomLine('billerDetails', line)}
                >
                    <div className={isThermal ? "border-b border-dashed border-black pb-1 mb-1 text-[10px] leading-tight text-black" : "border border-zinc-200 rounded-xl p-3 mb-3.5 bg-slate-50/60 shadow-2xs"}>
                        <div className={isThermal ? "mb-0.5" : "flex justify-between items-center mb-1.5 pb-1 border-b border-zinc-200"}>
                            <span className={isThermal ? "text-[9.5px] font-black uppercase text-black tracking-wider block" : "text-[10px] font-black uppercase text-zinc-600 tracking-wider"}>
                                {boxes.billerDetails.title || "Billing Desk"}
                            </span>
                        </div>

                        <div className={`grid ${isThermal ? 'grid-cols-1 gap-y-0.5' : 'grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1'} text-[11px]`}>
                            {Object.entries(boxes.billerDetails.fields || {}).map(([key, field]) => {
                                if (!field.enabled) return null;
                                return (
                                    <div key={key} className={isThermal ? "py-0" : "py-0.5"}>
                                        <EditableField 
                                            label={field.label}
                                            value={field.value}
                                            isBlock={false}
                                            onSave={(lbl, val) => updateField('billerDetails', key, lbl, val)}
                                            onDelete={() => deleteField('billerDetails', key)}
                                            labelClassName={isThermal ? "text-black font-normal" : "text-zinc-500 font-medium"}
                                            valueClassName={isThermal ? "font-bold text-black" : "font-bold text-zinc-900"}
                                        />
                                    </div>
                                );
                            })}

                            {/* Custom Lines in Biller Box */}
                            {boxes.billerDetails.customLines?.map(line => (
                                <div key={line.id} className={`py-0.5 ${isThermal ? '' : 'sm:col-span-2'}`}>
                                    <EditableField 
                                        label={line.label}
                                        value={line.value}
                                        isBlock={false}
                                        onSave={(lbl, val) => {
                                            const nextLines = boxes.billerDetails.customLines.map(l => l.id === line.id ? { ...l, label: lbl, value: val } : l);
                                            updateSchema({ ...schema, boxes: { ...boxes, billerDetails: { ...boxes.billerDetails, customLines: nextLines } } });
                                        }}
                                        onDelete={() => deleteCustomLine('billerDetails', line.id)}
                                        labelClassName="text-zinc-500 font-medium"
                                        valueClassName="font-bold text-zinc-900"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </ModularBoxWrapper>
            )}

            {/* 4. LINE ITEMS / CHARGES TABLE BOX */}
            {boxes.itemsTable?.enabled && (() => {
                const activeColumns = Object.entries(boxes.itemsTable.columns || {}).filter(([_, col]) => col.enabled);
                const colCount = activeColumns.length;
                const isDense = colCount >= 8;

                const getColWeight = (key) => {
                    const weights = {
                        index: 5,
                        description: 36,
                        testDescription: 36,
                        testName: 36,
                        itemDescription: 36,
                        name: 26,
                        serviceDescription: 36,
                        investigations: 36,
                        prescribedInvestigations: 36,
                        testNames: 36,
                        expenseHead: 25,
                        
                        department: 16,
                        patientName: 22,
                        doctorName: 20,
                        prescribingDoctor: 20,
                        corporateName: 22,
                        tpaName: 20,
                        insuranceCompany: 20,
                        referenceLab: 20,
                        labName: 18,
                        branchName: 14,
                        specialty: 14,
                        employeeId: 12,
                        sampleType: 18,
                        tat: 18,
                        policyNumber: 16,
                        
                        token: 10,
                        visitToken: 10,
                        billNumber: 14,
                        date: 15,
                        visitDate: 15,
                        occurredAt: 14,
                        period: 14,
                        sacCode: 10,
                        code: 10,
                        itemCode: 10,
                        sampleBarcode: 14,
                        tpaClaimNo: 14,
                        claimId: 14,
                        sourceReferenceId: 14,
                        paymentMode: 12,
                        mode: 12,
                        sourceType: 12,
                        status: 10,
                        partnerCategory: 12,
                        uom: 8,
                        quantity: 8,
                        qty: 8,
                        poQty: 8,
                        receivedQty: 8,
                        acceptedQty: 8,
                        rejectedQty: 8,
                        totalReferrals: 10,
                        pendingBills: 10,
                        claimsCount: 10,
                        testsReferred: 10,
                        activeClaims: 10,
                        visitsCount: 10,
                        employeesTested: 10,
                        samplesCount: 10,
                        
                        price: 14,
                        tariff: 14,
                        labTariff: 14,
                        b2bTariff: 14,
                        rate: 12,
                        unitPrice: 14,
                        b2bRate: 14,
                        discount: 12,
                        concession: 12,
                        coPay: 12,
                        commissionRate: 12,
                        taxRate: 10,
                        tdsDeducted: 12,
                        tdsAmount: 12,
                        amount: 14,
                        total: 14,
                        totalAmount: 14,
                        grossAmount: 14,
                        grossCommission: 14,
                        grossClaimed: 14,
                        grossDue: 14,
                        netAmount: 14,
                        netPayout: 14,
                        netDue: 14,
                        netPayable: 14,
                        paidAmount: 14,
                        pendingAmount: 14,
                        dueAmount: 14,
                        amountDue: 14,
                        received: 14,
                        receivedAmount: 14,
                        settledAmount: 14,
                        billedToCorp: 14,
                        preAuthAmount: 14,
                        approvedAmount: 14,
                        approved: 14,
                        patientShare: 12,
                        patientPaid: 14,
                        referralAmount: 14,
                        claimAmount: 14,
                        claimedAmount: 14,
                        deniedAmount: 14,
                        billedByLab: 14,
                        billedAmount: 14,
                        outstandingBalance: 14,
                        labBilled: 14,
                        realizationDue: 14,
                        notes: 16
                    };

                    if (weights[key]) return weights[key];
                    const lower = String(key || "").toLowerCase();
                    if (lower.includes('investigation') || lower.includes('desc') || lower.includes('name') || lower.includes('service') || lower.includes('item')) return 36;
                    if (lower.includes('date') || lower.includes('token') || lower.includes('time') || lower.includes('code') || lower.includes('num') || lower.includes('no')) return 14;
                    if (lower.includes('price') || lower.includes('amt') || lower.includes('amount') || lower.includes('rate') || lower.includes('due') || lower.includes('disc') || lower.includes('tariff') || lower.includes('fee') || lower.includes('claim')) return 14;
                    return 12;
                };

                const getColumnWidth = (key) => {
                    if (isThermal) {
                        if (key === 'index') return '10%';
                        if (['price', 'amount', 'total', 'totalAmount', 'netDue', 'paidAmount', 'discount', 'balanceDue'].includes(key)) {
                            return !readOnly ? '28%' : '30%';
                        }
                        const otherCols = activeColumns.filter(([cKey]) => cKey !== 'index' && !['price', 'amount', 'total', 'totalAmount', 'netDue', 'paidAmount', 'discount', 'balanceDue'].includes(cKey));
                        const remainingPct = !readOnly ? 58.5 : 60;
                        const perCol = (remainingPct / (otherCols.length || 1)).toFixed(1);
                        return `${perCol}%`;
                    }

                    const totalWeight = activeColumns.reduce((sum, [cKey]) => sum + getColWeight(cKey), 0);
                    const colWeight = getColWeight(key);
                    const availablePercent = !readOnly ? 96.5 : 100;
                    const pct = ((colWeight / totalWeight) * availablePercent).toFixed(1);
                    return `${pct}%`;
                };

                return (
                    <ModularBoxWrapper 
                        boxId="itemsTable" 
                        boxName={boxes.itemsTable.name || "Items & Charges Table"}
                        onDeleteBox={() => deleteBox('itemsTable')}
                        extraToolbarActions={
                            <div className="relative">
                                <button 
                                    type="button"
                                    onClick={() => setShowColumnManager(prev => !prev)}
                                    className={`px-1.5 py-0.5 rounded ${showColumnManager ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300' : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600'} font-bold flex items-center gap-0.5 cursor-pointer`}
                                    title="Manage table columns"
                                >
                                    <Columns size={10} /> Columns ({activeColumns.length})
                                </button>
                                {showColumnManager && (
                                    <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl p-2.5 z-40 text-left normal-case tracking-normal">
                                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-200 dark:border-zinc-800">
                                            <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">Table Columns</span>
                                            <button 
                                                type="button" 
                                                onClick={() => setShowColumnManager(false)}
                                                className="text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-zinc-500 mb-2">Check or uncheck columns to display on the invoice:</p>
                                        <div className="max-h-48 overflow-y-auto space-y-1 mb-2">
                                            {Object.entries(boxes.itemsTable.columns || {}).map(([cKey, colObj]) => {
                                                const isColActive = colObj.enabled !== false;
                                                return (
                                                    <div key={cKey} className="flex items-center justify-between p-1 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded">
                                                        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                                            <input
                                                                type="checkbox"
                                                                checked={isColActive}
                                                                onChange={(e) => toggleColumn('itemsTable', cKey, e.target.checked)}
                                                                className="rounded border-zinc-300 text-indigo-600 focus:ring-0 cursor-pointer"
                                                            />
                                                            <span className={`text-[11px] truncate ${isColActive ? 'text-zinc-800 dark:text-zinc-200 font-medium' : 'text-zinc-400 line-through'}`}>
                                                                {colObj.label || cKey}
                                                            </span>
                                                        </label>
                                                        {isColActive && (
                                                            <button
                                                                type="button"
                                                                onClick={() => deleteColumn('itemsTable', cKey)}
                                                                className="text-zinc-400 hover:text-rose-600 p-0.5 cursor-pointer shrink-0 ml-1"
                                                                title="Delete column"
                                                            >
                                                                <Trash2 size={11} />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex gap-1">
                                            <input
                                                type="text"
                                                value={newColName}
                                                onChange={(e) => setNewColName(e.target.value)}
                                                placeholder="New Column..."
                                                className="px-1.5 py-0.5 text-[11px] border border-zinc-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 flex-1 outline-none"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        if (newColName.trim()) {
                                                            addColumn('itemsTable', newColName.trim());
                                                            setNewColName("");
                                                        }
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (newColName.trim()) {
                                                        addColumn('itemsTable', newColName.trim());
                                                        setNewColName("");
                                                    }
                                                }}
                                                className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        }
                        onAddCustomLine={(line) => {
                            const newRow = {
                                id: `row-${Date.now()}`,
                                index: (boxes.itemsTable.rows?.length || 0) + 1,
                                description: line.label || line.value || 'Custom Diagnostic Service',
                                price: 500,
                                amount: 500
                            };
                            const next = {
                                ...schema,
                                boxes: {
                                    ...boxes,
                                    itemsTable: {
                                        ...boxes.itemsTable,
                                        rows: [...(boxes.itemsTable.rows || []), newRow]
                                    }
                                }
                            };
                            updateSchema(next);
                        }}
                    >
                        <div className={isThermal ? "border-b border-dashed border-black pb-1 mb-1 overflow-x-auto print:overflow-visible" : "mb-3.5 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xs"}>
                            <table className="w-full text-left border-collapse table-fixed">
                                <colgroup>
                                    {activeColumns.map(([colKey]) => (
                                        <col key={colKey} style={{ width: getColumnWidth(colKey) }} />
                                    ))}
                                    {!readOnly && <col style={{ width: '3.5%' }} />}
                                </colgroup>
                                <thead>
                                    <tr className={isThermal ? "border-b-[1.5px] border-black font-black uppercase text-black text-[9.5px]" : `bg-slate-100/75 border-b border-zinc-200 font-black uppercase text-zinc-700 tracking-wider ${isDense ? 'text-[8.5px]' : 'text-[10px]'}`}>
                                        {activeColumns.map(([colKey, col]) => {
                                            const isNumeric = ['price', 'amount', 'grossAmount', 'netDue', 'received', 'labBilled', 'rate', 'unitPrice', 'total', 'totalAmount', 'paidAmount', 'pendingAmount', 'dueAmount', 'tariff', 'labTariff', 'b2bTariff', 'discount', 'concession', 'b2bRate', 'patientPaid', 'referralAmount', 'billedAmount', 'claimAmount', 'claimedAmount', 'realizationDue'].includes(colKey);
                                            const isShortCol = isNumeric || ['date', 'visitDate', 'index', 'token', 'visitToken', 'claimId', 'sacCode', 'code', 'status', 'uom', 'qty', 'quantity'].includes(colKey);
                                            return (
                                                <th 
                                                    key={colKey} 
                                                    style={{ width: getColumnWidth(colKey) }}
                                                    onClick={() => {
                                                        if (!readOnly) {
                                                            setEditingColumn({ boxId: 'itemsTable', colKey, label: col.label });
                                                            setEditColLabel(col.label || "");
                                                        }
                                                    }}
                                                    className={isThermal 
                                                        ? `py-0.5 px-0.5 align-middle ${isNumeric ? 'text-right' : 'text-left'}` 
                                                        : `${isDense ? 'px-2 py-2' : 'px-3.5 py-2.5'} group/colhead relative align-middle overflow-hidden box-border ${!readOnly ? 'cursor-pointer hover:bg-indigo-50/70 transition-colors' : ''} ${isNumeric ? 'text-right' : 'text-left'}`}
                                                    title={!readOnly ? `Click to edit "${col.label || colKey}" column heading` : undefined}
                                                >
                                                    <div className={`flex items-center gap-1 w-full min-w-0 ${isNumeric ? 'justify-end' : 'justify-between'}`}>
                                                        <span className={isThermal 
                                                            ? "font-black text-black uppercase text-[9.5px]" 
                                                            : `font-black text-zinc-700 uppercase ${isDense ? 'text-[8.5px]' : 'text-[10px]'} tracking-wider ${isShortCol ? 'whitespace-nowrap' : 'whitespace-normal break-words leading-tight'} block flex-1 min-w-0`
                                                        }>
                                                            {col.label}
                                                        </span>
                                                        {!readOnly && (
                                                            <div className="opacity-0 group-hover/colhead:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0 no-print ml-0.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingColumn({ boxId: 'itemsTable', colKey, label: col.label });
                                                                        setEditColLabel(col.label || "");
                                                                    }}
                                                                    className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded cursor-pointer transition-colors"
                                                                    title={`Edit "${col.label || colKey}" heading`}
                                                                >
                                                                    <Edit2 size={10} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        deleteColumn('itemsTable', colKey);
                                                                    }}
                                                                    className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                                                                    title={`Delete column "${col.label || colKey}"`}
                                                                >
                                                                    <Trash2 size={10} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </th>
                                            );
                                        })}
                                        {!readOnly && <th style={{ width: '3.5%' }} className={isThermal ? "p-0.5 text-center text-zinc-400" : "p-1 text-center text-zinc-400"}>✕</th>}
                                    </tr>
                                </thead>
                                <tbody className={isThermal ? "text-[10.5px] text-black" : `divide-y divide-zinc-100 ${isDense ? 'text-[9.5px]' : 'text-[11px]'}`}>
                                    {(boxes.itemsTable.rows || []).map((row, idx) => (
                                        <React.Fragment key={row.id || idx}>
                                            {/* A4 Sheet Demarcation Guide (Visual aid in screen preview, strictly hidden in print) */}
                                            {isDense && idx === 18 && (
                                                <tr className="no-print select-none bg-amber-50/70 border-y-2 border-dashed border-amber-300">
                                                    <td colSpan={colCount + (readOnly ? 0 : 1)} className="px-3 py-1.5 text-center text-amber-800 font-bold text-[9px]">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <span className="w-12 h-px bg-amber-300"></span>
                                                            <span>✂ A4 Sheet 1 Boundary (~18 Rows) • Subsequent Rows Continue on Sheet 2</span>
                                                            <span className="w-12 h-px bg-amber-300"></span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            {isDense && idx > 18 && (idx - 18) % 28 === 0 && (
                                                <tr className="no-print select-none bg-amber-50/70 border-y-2 border-dashed border-amber-300">
                                                    <td colSpan={colCount + (readOnly ? 0 : 1)} className="px-3 py-1.5 text-center text-amber-800 font-bold text-[9px]">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <span className="w-12 h-px bg-amber-300"></span>
                                                            <span>✂ A4 Sheet {1 + Math.ceil((idx - 18) / 28)} Boundary (~28 Rows) • Continues on Next Sheet</span>
                                                            <span className="w-12 h-px bg-amber-300"></span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            <tr className={isThermal ? "border-b border-dotted border-black hover:bg-zinc-50" : "hover:bg-slate-50/60 group/row break-inside-avoid print:break-inside-avoid transition-colors"}>
                                                {activeColumns.map(([colKey, col]) => {
                                                    const cellVal = row[colKey] !== undefined ? row[colKey] : (row[col.id] ?? '');
                                                    const isNumeric = ['price', 'amount', 'grossAmount', 'netDue', 'received', 'labBilled', 'rate', 'unitPrice', 'total', 'totalAmount', 'paidAmount', 'pendingAmount', 'dueAmount', 'tariff', 'labTariff', 'b2bTariff', 'discount', 'concession', 'b2bRate', 'patientPaid', 'referralAmount', 'billedAmount', 'claimAmount', 'claimedAmount', 'realizationDue'].includes(colKey);
                                                    return (
                                                        <td 
                                                            key={colKey} 
                                                            style={{ width: getColumnWidth(colKey) }}
                                                            className={isThermal 
                                                                ? `py-0.5 px-0.5 align-top ${isNumeric ? 'text-right font-mono font-bold' : 'font-bold'}` 
                                                                : `${isDense ? 'px-2 py-1.5 text-[9.5px]' : 'px-3.5 py-2.5 text-[11px]'} align-middle overflow-hidden box-border ${isNumeric ? 'text-right font-mono font-bold text-zinc-900' : 'text-zinc-800'}`}
                                                        >
                                                            <div className="min-w-0 overflow-hidden">
                                                                <EditableField 
                                                                    value={String(cellVal)}
                                                                    onSave={(_, val) => updateRowCell('itemsTable', row.id, colKey, val)}
                                                                    canDelete={false}
                                                                    className="w-full min-w-0"
                                                                    valueClassName={isThermal 
                                                                        ? `font-bold text-black ${isNumeric ? 'font-mono' : 'whitespace-normal break-words'} block` 
                                                                        : `${isNumeric ? 'font-mono font-bold text-zinc-900' : (colKey === 'patientName' || colKey === 'fullName' ? 'font-bold text-zinc-900' : 'font-medium text-zinc-800')} whitespace-normal break-words leading-tight block`}
                                                                />
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                {!readOnly && (
                                                    <td style={{ width: '3.5%' }} className={isThermal ? "p-0.5 text-center" : "p-1 text-center"}>
                                                        <button 
                                                            type="button"
                                                            onClick={() => deleteRow('itemsTable', row.id)}
                                                            className="opacity-0 group-hover/row:opacity-100 p-0.5 text-rose-500 hover:text-rose-700 rounded cursor-pointer"
                                                            title="Delete line item row"
                                                        >
                                                            <Trash2 size={11} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </ModularBoxWrapper>
                );
            })()}

            {/* 5. A4 DUAL LOWER BLOCK: PAYMENT DETAILS (LEFT) & FINANCIAL SUMMARY (RIGHT) */}
            {!isThermal && (boxes.bankAndUpi?.enabled || boxes.financialSummary?.enabled) && (
                <div className={
                    boxes.bankAndUpi?.enabled && boxes.financialSummary?.enabled
                        ? "grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5 items-stretch"
                        : (boxes.financialSummary?.isPrepaidNotice ? "w-full mb-3.5" : "max-w-md ml-auto mb-3.5")
                }>
                    {/* LEFT CARD: PAYMENT DETAILS & BHARAT UPI QR */}
                    {boxes.bankAndUpi?.enabled && (
                        <ModularBoxWrapper 
                            boxId="bankAndUpi" 
                            boxName={boxes.bankAndUpi.name || "Payment Details & UPI QR"}
                            onDeleteBox={() => deleteBox('bankAndUpi')}
                            onAddCustomLine={(line) => addCustomLine('bankAndUpi', line)}
                            extraToolbarActions={!readOnly && (
                                <div className="flex items-center gap-1">
                                    <label className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-0.5 cursor-pointer text-[10px]">
                                        <Upload size={10} />
                                        <span>{effectiveQrImage ? 'Change QR' : 'Upload QR'}</span>
                                        <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleQrUpload} className="hidden" />
                                    </label>
                                    {effectiveQrImage && (
                                        <button
                                            type="button"
                                            onClick={handleRemoveQr}
                                            className="px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold flex items-center gap-0.5 cursor-pointer text-[10px]"
                                            title="Reset to dynamic QR"
                                        >
                                            <X size={10} /> Reset
                                        </button>
                                    )}
                                </div>
                            )}
                        >
                            <div className="border border-zinc-200 rounded-xl p-3.5 bg-white shadow-2xs flex items-center gap-4 h-full">
                                {/* Dynamic or Custom UPI QR Code */}
                                {boxes.bankAndUpi.fields?.showQr?.enabled !== false && (
                                    <div className="relative group/qr shrink-0 flex flex-col items-center">
                                        <div className="w-24 h-24 bg-white p-1 rounded-lg border border-zinc-200 flex flex-col items-center justify-center shadow-2xs">
                                            {effectiveQrImage ? (
                                                <img 
                                                    src={effectiveQrImage} 
                                                    alt="Custom UPI QR" 
                                                    className="w-20 h-20 object-contain rounded filter contrast-125" 
                                                />
                                            ) : (
                                                <img 
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`upi://pay?pa=${encodeURIComponent(boxes.bankAndUpi.fields?.upiId?.value || labSettings.upiId || 'divyalab@okicicibank')}&pn=SynOS`)}`}
                                                    alt="UPI QR"
                                                    className="w-20 h-20 object-contain"
                                                />
                                            )}
                                            {!readOnly && (
                                                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/qr:opacity-100 flex flex-col items-center justify-center text-white text-[8px] font-bold rounded cursor-pointer transition-opacity">
                                                    <Upload size={12} className="mb-0.5" />
                                                    <span>{effectiveQrImage ? "Change" : "Upload"}</span>
                                                    <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleQrUpload} className="hidden" />
                                                </label>
                                            )}
                                        </div>
                                        <span className="text-[9px] font-bold text-zinc-500 mt-1">
                                            Scan to Pay
                                        </span>
                                    </div>
                                )}

                                {/* Vertical Divider */}
                                <div className="w-px self-stretch bg-zinc-200 shrink-0" />

                                {/* Bank & UPI Details */}
                                <div className="flex-1 min-w-0 space-y-1 text-[11px]">
                                    <EditableField 
                                        value={boxes.bankAndUpi.title || "Payment Details"}
                                        onSave={(_, val) => updateSchema({ ...schema, boxes: { ...boxes, bankAndUpi: { ...boxes.bankAndUpi, title: val } } })}
                                        valueClassName="text-xs font-black uppercase tracking-wider text-zinc-800 block mb-1"
                                    />

                                    {boxes.bankAndUpi.fields?.bankName?.enabled && (
                                        <div className="flex items-center gap-2">
                                            <EditableField 
                                                label="Bank:"
                                                value={boxes.bankAndUpi.fields.bankName.value || labSettings.bankName || 'HDFC Bank'}
                                                onSave={(lbl, val) => updateField('bankAndUpi', 'bankName', lbl, val)}
                                                onDelete={() => deleteField('bankAndUpi', 'bankName')}
                                                labelClassName="text-zinc-500 font-medium min-w-[50px]"
                                                valueClassName="font-bold text-zinc-800"
                                            />
                                        </div>
                                    )}
                                    {boxes.bankAndUpi.fields?.accountNumber?.enabled && (
                                        <div className="flex items-center gap-2">
                                            <EditableField 
                                                label="A/C No.:"
                                                value={boxes.bankAndUpi.fields.accountNumber.value || labSettings.accountNumber || '50200012345678'}
                                                onSave={(lbl, val) => updateField('bankAndUpi', 'accountNumber', lbl, val)}
                                                onDelete={() => deleteField('bankAndUpi', 'accountNumber')}
                                                labelClassName="text-zinc-500 font-medium min-w-[50px]"
                                                valueClassName="font-mono font-bold text-zinc-900"
                                            />
                                        </div>
                                    )}
                                    {boxes.bankAndUpi.fields?.ifsc?.enabled && (
                                        <div className="flex items-center gap-2">
                                            <EditableField 
                                                label="IFSC:"
                                                value={boxes.bankAndUpi.fields.ifsc.value || labSettings.ifscCode || 'HDFC0001234'}
                                                onSave={(lbl, val) => updateField('bankAndUpi', 'ifsc', lbl, val)}
                                                onDelete={() => deleteField('bankAndUpi', 'ifsc')}
                                                labelClassName="text-zinc-500 font-medium min-w-[50px]"
                                                valueClassName="font-mono font-bold text-zinc-900"
                                            />
                                        </div>
                                    )}
                                    {boxes.bankAndUpi.fields?.upiId?.enabled && (
                                        <div className="flex items-center gap-2">
                                            <EditableField 
                                                label="UPI ID:"
                                                value={boxes.bankAndUpi.fields.upiId.value || labSettings.upiId || 'divyalab@okicicibank'}
                                                onSave={(lbl, val) => updateField('bankAndUpi', 'upiId', lbl, val)}
                                                onDelete={() => deleteField('bankAndUpi', 'upiId')}
                                                labelClassName="text-zinc-500 font-medium min-w-[50px]"
                                                valueClassName="font-mono font-bold text-zinc-800 break-all"
                                            />
                                        </div>
                                    )}

                                    {/* Custom Lines */}
                                    {boxes.bankAndUpi.customLines?.map(line => (
                                        <div key={line.id} className="flex items-center gap-2">
                                            <EditableField 
                                                label={line.label}
                                                value={line.value}
                                                onSave={(lbl, val) => {
                                                    const nextLines = boxes.bankAndUpi.customLines.map(l => l.id === line.id ? { ...l, label: lbl, value: val } : l);
                                                    updateSchema({ ...schema, boxes: { ...boxes, bankAndUpi: { ...boxes.bankAndUpi, customLines: nextLines } } });
                                                }}
                                                onDelete={() => deleteCustomLine('bankAndUpi', line.id)}
                                                labelClassName="text-zinc-500 font-medium min-w-[50px]"
                                                valueClassName="font-medium text-zinc-800"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </ModularBoxWrapper>
                    )}

                    {/* RIGHT CARD: FINANCIAL SUMMARY BREAKDOWN & RED NET DUE BAR */}
                    {boxes.financialSummary?.enabled && (
                        <ModularBoxWrapper 
                            boxId="financialSummary" 
                            boxName={boxes.financialSummary.name || "Financial Totals Box"}
                            className="break-inside-avoid print:break-inside-avoid synos-avoid-page-break"
                            onDeleteBox={() => deleteBox('financialSummary')}
                            onAddCustomLine={(line) => addCustomLine('financialSummary', line)}
                        >
                            <div className="border border-zinc-200 rounded-xl p-3.5 bg-white shadow-2xs flex flex-col justify-between h-full">
                                {/* Normal Financial Entries */}
                                <div className="space-y-1.5 mb-2">
                                    {summaryNormalEntries.map(([key, field]) => (
                                        <div key={key} className="flex justify-between items-center py-0.5 text-[11px]">
                                            <EditableField 
                                                label={field.label}
                                                value={field.value}
                                                isBlock={true}
                                                onSave={(lbl, val) => updateField('financialSummary', key, lbl, val)}
                                                onDelete={() => deleteField('financialSummary', key)}
                                                labelClassName="text-zinc-600 font-medium"
                                                valueClassName="font-mono font-bold text-zinc-900"
                                            />
                                        </div>
                                    ))}
                                    {boxes.financialSummary.customLines?.map(line => (
                                        <div key={line.id} className="flex justify-between items-center py-0.5 text-[11px]">
                                            <EditableField 
                                                label={line.label}
                                                value={line.value}
                                                isBlock={true}
                                                onSave={(lbl, val) => {
                                                    const nextLines = boxes.financialSummary.customLines.map(l => l.id === line.id ? { ...l, label: lbl, value: val } : l);
                                                    updateSchema({ ...schema, boxes: { ...boxes, financialSummary: { ...boxes.financialSummary, customLines: nextLines } } });
                                                }}
                                                onDelete={() => deleteCustomLine('financialSummary', line.id)}
                                                labelClassName="text-zinc-600 font-medium"
                                                valueClassName="font-mono font-bold text-zinc-900"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Net Due / Highlighted Total Bottom Row */}
                                {summaryNetEntry && (
                                    <div className="bg-rose-50/90 border border-rose-100 rounded-lg p-2.5 flex items-center justify-between mt-auto">
                                        <EditableField 
                                            label={summaryNetEntry[1].label}
                                            value={summaryNetEntry[1].value}
                                            isBlock={true}
                                            onSave={(lbl, val) => updateField('financialSummary', summaryNetEntry[0], lbl, val)}
                                            onDelete={() => deleteField('financialSummary', summaryNetEntry[0])}
                                            labelClassName="text-xs font-black text-zinc-900 tracking-tight"
                                            valueClassName="font-mono font-black text-rose-600 text-lg"
                                        />
                                    </div>
                                )}
                            </div>
                        </ModularBoxWrapper>
                    )}
                </div>
            )}

            {/* 5B. THERMAL FINANCIAL TOTALS BOX */}
            {isThermal && boxes.financialSummary?.enabled && (
                <ModularBoxWrapper 
                    boxId="financialSummary" 
                    boxName={boxes.financialSummary.name || "Financial Totals Box"}
                    className="break-inside-avoid print:break-inside-avoid synos-avoid-page-break"
                    onDeleteBox={() => deleteBox('financialSummary')}
                    onAddCustomLine={(line) => addCustomLine('financialSummary', line)}
                >
                    {(boxes.financialSummary.isPrepaidNotice || boxes.financialSummary.fields?.counterPayable || schema.slotId === 'patient_thermal_prepaid_slip' || schema.slotId === 'patient_thermal_prepaid_billed_doctor' || boxes.financialSummary.title?.includes('REFERRAL PARTNER')) ? (
                        <div className="border-[1.5px] border-black p-1.5 mb-1.5 text-center bg-white">
                            <div className="text-[10px] font-black uppercase tracking-wider text-black">
                                <EditableField 
                                    value={boxes.financialSummary.title || "BILLED TO REFERRAL PARTNER ACCOUNT"}
                                    onSave={(_, val) => updateSchema({ ...schema, boxes: { ...boxes, financialSummary: { ...boxes.financialSummary, title: val } } })}
                                    onDelete={() => deleteBox('financialSummary')}
                                    valueClassName="text-[10px] font-black uppercase tracking-wider text-black block text-center"
                                />
                            </div>
                            {boxes.financialSummary.fields?.counterPayable?.enabled !== false && (
                                <div className="text-[9.5px] font-bold text-black mt-0.5">
                                    <EditableField 
                                        label={boxes.financialSummary.fields?.counterPayable?.label ? `${boxes.financialSummary.fields.counterPayable.label}:` : "Amount Payable at Counter:"}
                                        value={boxes.financialSummary.fields?.counterPayable?.value || "₹0.00 (Prepaid)"}
                                        onSave={(lbl, val) => updateField('financialSummary', 'counterPayable', lbl, val)}
                                        onDelete={() => deleteField('financialSummary', 'counterPayable')}
                                        valueClassName="font-bold text-black font-mono text-[9.5px]"
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="border-b-[1.5px] border-black pb-1 mb-1 text-[11px] text-black w-full">
                            {Object.entries(boxes.financialSummary.fields || {}).map(([key, field]) => {
                                if (!field.enabled) return null;
                                const isNet = key === 'totalAmount' || key === 'netSalary';
                                return (
                                    <div key={key} className={`flex justify-between items-center ${
                                        isNet ? 'border-y border-dashed border-black py-0.5 my-0.5 font-black text-[13.5px]' : 'py-0 font-bold text-[10.5px]'
                                    }`}>
                                        <EditableField 
                                            label={field.label}
                                            value={field.value}
                                            isBlock={true}
                                            onSave={(lbl, val) => updateField('financialSummary', key, lbl, val)}
                                            onDelete={() => deleteField('financialSummary', key)}
                                            labelClassName={isNet ? 'text-black font-black uppercase' : 'text-black font-normal'}
                                            valueClassName="font-mono font-black text-black"
                                        />
                                    </div>
                                );
                            })}

                            {/* Custom Lines in Financial Box */}
                            {boxes.financialSummary.customLines?.map(line => (
                                <div key={line.id} className="flex justify-between items-center py-0.5 border-t border-dashed border-zinc-200">
                                    <EditableField 
                                        label={line.label}
                                        value={line.value}
                                        isBlock={true}
                                        onSave={(lbl, val) => {
                                            const nextLines = boxes.financialSummary.customLines.map(l => l.id === line.id ? { ...l, label: lbl, value: val } : l);
                                            updateSchema({ ...schema, boxes: { ...boxes, financialSummary: { ...boxes.financialSummary, customLines: nextLines } } });
                                        }}
                                        onDelete={() => deleteCustomLine('financialSummary', line.id)}
                                        labelClassName="text-zinc-600 font-medium"
                                        valueClassName="font-mono font-bold text-zinc-900"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </ModularBoxWrapper>
            )}

            {/* 6. AMOUNT IN WORDS BOX */}
            {boxes.amountInWords?.enabled && (
                <ModularBoxWrapper 
                    boxId="amountInWords" 
                    boxName={boxes.amountInWords.name || "Amount in Words"}
                    onDeleteBox={() => deleteBox('amountInWords')}
                >
                    <div className={isThermal ? "p-1 bg-zinc-50 border-y border-dashed border-black mb-1 text-[9.5px]" : "p-2.5 bg-slate-50/70 rounded-xl border border-zinc-200/80 mb-3.5 space-y-0.5 shadow-2xs"}>
                        <span className={isThermal ? "text-[8.5px] font-bold uppercase text-black block tracking-wider" : "text-[9.5px] font-bold uppercase text-zinc-500 block tracking-wider"}>
                            {boxes.amountInWords.label || "Amount in Words"}
                        </span>
                        <EditableField 
                            value={boxes.amountInWords.value}
                            onSave={(_, val) => {
                                const next = {
                                    ...schema,
                                    boxes: {
                                        ...boxes,
                                        amountInWords: { ...boxes.amountInWords, value: val }
                                    }
                                };
                                updateSchema(next);
                            }}
                            onDelete={() => deleteBox('amountInWords')}
                            valueClassName={isThermal ? "text-[9.5px] font-black text-black italic block" : "text-xs font-bold text-zinc-900 italic block"}
                        />
                    </div>
                </ModularBoxWrapper>
            )}

            {/* 7. RECEIPT HISTORY STRIP */}
            {boxes.receiptHistory?.enabled && (
                <ModularBoxWrapper 
                    boxId="receiptHistory" 
                    boxName={boxes.receiptHistory.name || "Receipt History"}
                    onDeleteBox={() => deleteBox('receiptHistory')}
                >
                    <div className={isThermal ? "p-1 bg-zinc-50 border border-black text-[9.5px] mb-1" : "p-2.5 bg-slate-50/70 rounded-xl border border-zinc-200 text-[10px] space-y-1 mb-3.5 shadow-2xs"}>
                        <span className={isThermal ? "font-black uppercase text-black block" : "font-bold uppercase text-zinc-500 tracking-wider text-[9.5px]"}>
                            {boxes.receiptHistory.title || "Settlement Receipt History"}
                        </span>
                        <div className="flex flex-wrap gap-3 text-zinc-700">
                            {(boxes.receiptHistory.entries || []).map((rcpt, idx) => (
                                <div key={rcpt.id || idx} className="inline-flex items-center gap-1 font-mono">
                                    <span>• {rcpt.mode}:</span>
                                    <strong>{rcpt.amount}</strong>
                                    <span>({rcpt.date})</span>
                                    {rcpt.ref && <span className="text-zinc-400">[{rcpt.ref}]</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </ModularBoxWrapper>
            )}

            {/* 8. THERMAL STANDALONE BANK WIRE & DYNAMIC BHARAT UPI QR */}
            {isThermal && boxes.bankAndUpi?.enabled && (
                <ModularBoxWrapper 
                    boxId="bankAndUpi" 
                    boxName={boxes.bankAndUpi.name || "Instant Payment QR"}
                    onDeleteBox={() => deleteBox('bankAndUpi')}
                    onAddCustomLine={(line) => addCustomLine('bankAndUpi', line)}
                    className="mt-1"
                >
                    <div className="border border-dashed border-black p-1.5 mb-1 text-center">
                        <div className="flex items-center justify-center gap-2">
                            {boxes.bankAndUpi.fields?.showQr?.enabled !== false && (
                                <div className="relative group/qr shrink-0">
                                    {effectiveQrImage ? (
                                        <img 
                                            src={effectiveQrImage} 
                                            alt="Custom UPI QR" 
                                            className="w-16 h-16 object-contain rounded border border-zinc-200 filter contrast-125" 
                                        />
                                    ) : (
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`upi://pay?pa=${encodeURIComponent(boxes.bankAndUpi.fields?.upiId?.value || labSettings.upiId || 'synoslab@hdfcbank')}&pn=SynOS`)}`}
                                            alt="UPI QR"
                                            className="w-16 h-16 object-contain"
                                        />
                                    )}
                                </div>
                            )}
                            <div className="text-left text-black space-y-0.5 flex-1 min-w-0">
                                <EditableField 
                                    value={boxes.bankAndUpi.title || "SCAN QR TO PAY"}
                                    onSave={(_, val) => {
                                        const next = {
                                            ...schema,
                                            boxes: {
                                                ...boxes,
                                                bankAndUpi: { ...boxes.bankAndUpi, title: val }
                                            }
                                        };
                                        updateSchema(next);
                                    }}
                                    onDelete={() => deleteBox('bankAndUpi')}
                                    valueClassName="text-[9.5px] font-black uppercase tracking-wider text-black block leading-tight"
                                />
                                <EditableField 
                                    value={boxes.bankAndUpi.fields?.upiId?.value || labSettings.upiId || 'synoslab@hdfcbank'}
                                    onSave={(_, val) => {
                                        updateField('bankAndUpi', 'upiId', undefined, val);
                                        if (onUpdateLabSetting) onUpdateLabSetting('upiId', val);
                                    }}
                                    onDelete={() => deleteField('bankAndUpi', 'upiId')}
                                    valueClassName="text-[8.5px] font-mono font-bold text-black block break-all leading-tight"
                                />
                                <EditableField 
                                    value={boxes.bankAndUpi.subtitle || "Instant Bharat UPI"}
                                    onSave={(_, val) => {
                                        const next = {
                                            ...schema,
                                            boxes: {
                                                ...boxes,
                                                bankAndUpi: { ...boxes.bankAndUpi, subtitle: val }
                                            }
                                        };
                                        updateSchema(next);
                                    }}
                                    valueClassName="text-[8px] font-bold text-black block leading-tight"
                                />
                            </div>
                        </div>
                    </div>
                </ModularBoxWrapper>
            )}

            {/* 9. TERMS & CONDITIONS AND DECLARATIONS */}
            {boxes.termsAndConditions?.enabled && (
                <ModularBoxWrapper 
                    boxId="termsAndConditions" 
                    boxName={boxes.termsAndConditions.name || "Terms & Conditions"}
                    onDeleteBox={() => deleteBox('termsAndConditions')}
                >
                    {isThermal ? (
                        <div className="text-center text-[9px] font-bold text-black leading-tight mt-1 space-y-0.5">
                            {boxes.termsAndConditions.text && (
                                <EditableField 
                                    value={boxes.termsAndConditions.text}
                                    onSave={(_, val) => {
                                        const next = {
                                            ...schema,
                                            boxes: {
                                                ...boxes,
                                                termsAndConditions: { ...boxes.termsAndConditions, text: val }
                                            }
                                        };
                                        updateSchema(next);
                                    }}
                                    onDelete={() => deleteBox('termsAndConditions')}
                                    valueClassName="text-[9px] font-bold text-black leading-tight whitespace-pre-line block"
                                />
                            )}
                            {boxes.termsAndConditions.systemNote && (
                                <div className="pt-0.5">
                                    <EditableField 
                                        value={boxes.termsAndConditions.systemNote}
                                        onSave={(_, val) => {
                                            const next = {
                                                ...schema,
                                                boxes: {
                                                    ...boxes,
                                                    termsAndConditions: { ...boxes.termsAndConditions, systemNote: val }
                                                }
                                            };
                                            updateSchema(next);
                                        }}
                                        onDelete={() => {
                                            const next = { ...schema, boxes: { ...boxes, termsAndConditions: { ...boxes.termsAndConditions, systemNote: "" } } };
                                            updateSchema(next);
                                        }}
                                        valueClassName="text-[8.5px] font-black text-black tracking-wider block"
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="pt-2 mb-3.5">
                            <span className="text-xs font-black uppercase text-zinc-900 block tracking-wide mb-1">
                                {boxes.termsAndConditions.title || "Commercial Settlement Terms"}
                            </span>
                            <EditableField 
                                value={boxes.termsAndConditions.text}
                                onSave={(_, val) => {
                                    const next = {
                                        ...schema,
                                        boxes: {
                                            ...boxes,
                                            termsAndConditions: { ...boxes.termsAndConditions, text: val }
                                        }
                                    };
                                    updateSchema(next);
                                }}
                                onDelete={() => deleteBox('termsAndConditions')}
                                valueClassName="text-[10px] text-zinc-600 leading-relaxed whitespace-pre-line block"
                            />
                            {boxes.termsAndConditions.systemNote ? (
                                <div className="pt-1">
                                    <EditableField 
                                        value={boxes.termsAndConditions.systemNote}
                                        onSave={(_, val) => {
                                            const next = {
                                                ...schema,
                                                boxes: {
                                                    ...boxes,
                                                    termsAndConditions: { ...boxes.termsAndConditions, systemNote: val }
                                                }
                                            };
                                            updateSchema(next);
                                        }}
                                        onDelete={() => {
                                            const next = {
                                                ...schema,
                                                boxes: {
                                                    ...boxes,
                                                    termsAndConditions: { ...boxes.termsAndConditions, systemNote: "" }
                                                }
                                            };
                                            updateSchema(next);
                                        }}
                                        canDelete={!readOnly}
                                        valueClassName="italic text-[8px] text-zinc-400 block"
                                    />
                                </div>
                            ) : (!readOnly && (
                                <div className="pt-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const next = {
                                                ...schema,
                                                boxes: {
                                                    ...boxes,
                                                    termsAndConditions: { 
                                                        ...boxes.termsAndConditions, 
                                                        systemNote: "This is an authentic computer-generated Tax Invoice generated by SynOS Diagnostic OS." 
                                                    }
                                                }
                                            };
                                            updateSchema(next);
                                        }}
                                        className="text-[8px] italic text-zinc-400 hover:text-indigo-600 cursor-pointer border border-dashed border-zinc-300 hover:border-indigo-400 rounded px-1.5 py-0.5"
                                    >
                                        + Add Watermark / Footer Note
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </ModularBoxWrapper>
            )}

            {/* 10. AUTHORISED SIGNATORY STAMP BOX */}
            {boxes.signatory?.enabled && (
                <ModularBoxWrapper 
                    boxId="signatory" 
                    boxName={boxes.signatory.name || "Signatory Stamp"}
                    className="break-inside-avoid print:break-inside-avoid synos-avoid-page-break"
                    onDeleteBox={() => deleteBox('signatory')}
                >
                    <div className="text-right space-y-6 min-w-[150px] ml-auto mb-2">
                        <div className="h-6" />
                        <div className="border-t border-zinc-400 pt-1 inline-block text-center min-w-[160px]">
                            <EditableField 
                                value={boxes.signatory?.title || labSettings.signatoryTitle || "Authorised Signatory"}
                                onSave={(_, val) => {
                                    if (onUpdateLabSetting) {
                                        onUpdateLabSetting('signatoryTitle', val);
                                    }
                                    const next = {
                                        ...schema,
                                        boxes: {
                                            ...boxes,
                                            signatory: { ...boxes.signatory, title: val }
                                        }
                                    };
                                    updateSchema(next);
                                }}
                                onDelete={() => deleteBox('signatory')}
                                valueClassName="text-[10px] font-bold text-zinc-900 uppercase block"
                            />
                            {boxes.signatory.subtitle && (
                                <p className="text-[8px] text-zinc-400 uppercase tracking-wider">{boxes.signatory.subtitle}</p>
                            )}
                        </div>
                    </div>
                </ModularBoxWrapper>
            )}

            {/* 11. USER-ADDED CUSTOM DOCUMENT BOXES */}
            {Object.entries(boxes).map(([boxKey, customBox]) => {
                // If it's not a standard predefined box key
                const standardKeys = ['header', 'docBadge', 'partyDetails', 'billerDetails', 'itemsTable', 'financialSummary', 'amountInWords', 'receiptHistory', 'bankAndUpi', 'termsAndConditions', 'signatory'];
                if (standardKeys.includes(boxKey) || !customBox.enabled) return null;

                return (
                    <ModularBoxWrapper 
                        key={boxKey}
                        boxId={boxKey}
                        boxName={customBox.name || "Custom Document Section"}
                        onDeleteBox={() => deleteCustomBox(boxKey)}
                        onAddCustomLine={(line) => addCustomLine(boxKey, line)}
                    >
                        <div className="p-3 border border-zinc-200 rounded-lg mb-3 bg-zinc-50/40 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-zinc-700 tracking-wider block">
                                {customBox.name}
                            </span>
                            {customBox.content && (
                                <EditableField 
                                    value={customBox.content}
                                    onSave={(_, val) => {
                                        const next = {
                                            ...schema,
                                            boxes: {
                                                ...boxes,
                                                [boxKey]: { ...customBox, content: val }
                                            }
                                        };
                                        updateSchema(next);
                                    }}
                                    onDelete={() => deleteCustomBox(boxKey)}
                                    valueClassName="text-xs text-zinc-800"
                                />
                            )}
                            {customBox.customLines?.map(line => (
                                <div key={line.id} className="py-0.5">
                                    <EditableField 
                                        label={line.label ? `${line.label}:` : ""}
                                        value={line.value}
                                        onSave={(lbl, val) => {
                                            const nextLines = customBox.customLines.map(l => l.id === line.id ? { ...l, label: lbl, value: val } : l);
                                            updateSchema({ ...schema, boxes: { ...boxes, [boxKey]: { ...customBox, customLines: nextLines } } });
                                        }}
                                        onDelete={() => deleteCustomLine(boxKey, line.id)}
                                        valueClassName="text-[10px] text-zinc-700 font-medium"
                                    />
                                </div>
                            ))}
                        </div>
                    </ModularBoxWrapper>
                );
            })}

            {/* 12. UNIFIED A4 DOCUMENT FOOTER */}
            {!isThermal && (
                <div className="border-t border-zinc-200 pt-3 mt-4 flex items-center justify-between text-[9.5px] text-zinc-500 font-medium">
                    <span>Generated by SynOS Diagnostics OS</span>
                    <span>Page 1 of 1</span>
                    <span>Printed on {boxes.docBadge?.fields?.date?.value || '14-Oct-2026, 01:05 PM'}</span>
                </div>
            )}

            {/* FLOATING COLUMN EDITOR MODAL */}
            {editingColumn && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs no-print p-4"
                    onClick={() => setEditingColumn(null)}
                >
                    <div 
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl p-5 w-full max-w-md animate-in fade-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <Columns size={18} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Edit Column Heading</h4>
                                    <p className="text-[11px] text-zinc-500">Customize the label as it appears on bills and printouts</p>
                                </div>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setEditingColumn(null)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (editColLabel.trim()) {
                                    updateColumnLabel(editingColumn.boxId, editingColumn.colKey, editColLabel.trim());
                                }
                                setEditingColumn(null);
                            }}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                                    Column Heading Title
                                </label>
                                <input
                                    type="text"
                                    value={editColLabel}
                                    onChange={(e) => setEditColLabel(e.target.value)}
                                    autoFocus
                                    placeholder="e.g. Investigation / Service Description"
                                    className="w-full px-3.5 py-2 text-sm font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <p className="text-[10px] text-zinc-400 mt-1">
                                    Long titles wrap naturally onto multiple lines on bills without cutting off.
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => {
                                        deleteColumn(editingColumn.boxId, editingColumn.colKey);
                                        setEditingColumn(null);
                                    }}
                                    className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                                >
                                    <Trash2 size={14} /> Delete Column
                                </button>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditingColumn(null)}
                                        className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold text-xs cursor-pointer transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                                    >
                                        <Check size={14} /> Save Changes
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </div>
        </CanvasContext.Provider>
    );
};
