import React, { useState, createContext, useContext } from 'react';
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
    FileText
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

    if (isReadOnly) {
        return (
            <div className={`inline-flex items-center gap-1.5 ${className} ${isBlock ? 'flex justify-between w-full' : ''}`}>
                <div className="flex items-center gap-1 truncate">
                    {label && <span className={labelClassName}>{label}</span>}
                    <span className={valueClassName}>{value}</span>
                </div>
            </div>
        );
    }

    if (isEditing) {
        return (
            <div className={`inline-flex items-center gap-1.5 p-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 rounded shadow-xs text-xs z-20 ${isBlock ? 'w-full' : ''}`}>
                {label !== undefined && (
                    <input 
                        type="text" 
                        value={tempLabel}
                        onChange={(e) => setTempLabel(e.target.value)}
                        placeholder="Label"
                        className="px-1.5 py-0.5 text-[10px] font-bold border border-zinc-300 rounded bg-white w-24 text-zinc-700 outline-none"
                    />
                )}
                <input 
                    type="text" 
                    value={tempValue}
                    autoFocus
                    onChange={(e) => setTempValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Value / Text"
                    className="px-1.5 py-0.5 text-xs font-semibold border border-zinc-300 rounded bg-white flex-1 text-zinc-900 outline-none"
                />
                <button 
                    type="button" 
                    onClick={handleSave} 
                    className="p-1 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
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
                    className="p-1 text-zinc-500 hover:bg-zinc-200 rounded cursor-pointer"
                    title="Cancel (Esc)"
                >
                    <X size={12} />
                </button>
            </div>
        );
    }

    return (
        <div className={`group/field relative inline-flex items-center gap-1.5 rounded px-1 -mx-1 transition-all hover:bg-indigo-50/70 hover:ring-1 hover:ring-indigo-300/60 ${className} ${isBlock ? 'flex justify-between w-full' : ''}`}>
            <div className="flex items-center gap-1 truncate">
                {label && <span className={labelClassName}>{label}</span>}
                <span className={valueClassName}>{value}</span>
            </div>

            {/* HOVER ACTIONS */}
            <div className="opacity-0 group-hover/field:opacity-100 transition-opacity inline-flex items-center gap-0.5 bg-white/95 shadow-xs border border-zinc-200 rounded px-1 py-0.5 ml-1 shrink-0">
                {canEdit && (
                    <button 
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setTempValue(value || "");
                            setTempLabel(label || "");
                            setIsEditing(true);
                        }}
                        className="p-0.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded cursor-pointer"
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
                        className="p-0.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
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
    children, 
    className = "",
    allowDelete = true,
    readOnly
}) => {
    const ctx = useContext(CanvasContext);
    const isReadOnly = readOnly !== undefined ? readOnly : ctx.readOnly;
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
        <div className={`group/box relative border border-dashed border-transparent hover:border-indigo-400 rounded-xl transition-all p-2 -m-2 mb-3 ${className}`}>
            {/* FLOATING BOX HOVER TOOLBAR */}
            <div className="absolute -top-3 right-3 opacity-0 group-hover/box:opacity-100 transition-all flex items-center gap-1 bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 shadow-md rounded-lg px-2 py-0.5 text-[10px] z-30 select-none">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mr-1">
                    <Layers size={10} /> {boxName}
                </span>

                <button 
                    type="button"
                    onClick={() => setShowAddForm(prev => !prev)}
                    className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 font-bold flex items-center gap-0.5 cursor-pointer"
                    title="Add custom line or field to this box"
                >
                    <Plus size={10} /> Add Field
                </button>

                {allowDelete && onDeleteBox && (
                    <button 
                        type="button"
                        onClick={onDeleteBox}
                        className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 font-bold flex items-center gap-0.5 cursor-pointer ml-1"
                        title="Remove this entire box from the bill"
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
    onToggleBox,
    readOnly = false
}) => {
    if (!schema || !schema.boxes) {
        return <div className="p-8 text-center text-zinc-400">Loading document canvas...</div>;
    }

    const { boxes } = schema;
    const isThermal = schema.isThermal || letterheadMode === 'raw_thermal';

    // Helper to update schema immutably
    const updateSchema = (newSchema) => {
        if (onUpdateSchema) onUpdateSchema(newSchema);
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

    return (
        <CanvasContext.Provider value={{ readOnly }}>
            <div className={`w-full flex flex-col justify-between text-zinc-900 text-xs font-sans leading-normal ${isThermal ? 'max-w-[340px] mx-auto font-mono text-[11px]' : ''}`}>
            
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
                    ) : (
                        <div className="border-b-2 border-zinc-900 pb-3 mb-3">
                            <div className="space-y-1">
                                {boxes.header.fields?.legalName?.enabled && (
                                    <div className="block">
                                        <EditableField 
                                            value={labSettings.labLegalName || boxes.header.fields.legalName.value}
                                            onSave={(_, val) => updateField('header', 'legalName', undefined, val)}
                                            onDelete={() => deleteField('header', 'legalName')}
                                            valueClassName="text-lg font-black text-zinc-900 tracking-tight uppercase"
                                        />
                                    </div>
                                )}
                                {boxes.header.fields?.tagline?.enabled && (
                                    <div className="block">
                                        <EditableField 
                                            value={labSettings.labTradeName || boxes.header.fields.tagline.value}
                                            onSave={(_, val) => updateField('header', 'tagline', undefined, val)}
                                            onDelete={() => deleteField('header', 'tagline')}
                                            valueClassName="text-[11px] font-bold text-zinc-600 block"
                                        />
                                    </div>
                                )}
                                {boxes.header.fields?.address?.enabled && (
                                    <div className="block">
                                        <EditableField 
                                            value={labSettings.address || boxes.header.fields.address.value}
                                            onSave={(_, val) => updateField('header', 'address', undefined, val)}
                                            onDelete={() => deleteField('header', 'address')}
                                            valueClassName="text-[10px] text-zinc-500 leading-relaxed block"
                                        />
                                    </div>
                                )}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] text-zinc-600 font-semibold pt-0.5">
                                    {boxes.header.fields?.phone?.enabled && (
                                        <EditableField 
                                            label="Phone:"
                                            value={labSettings.phone || boxes.header.fields.phone.value}
                                            onSave={(lbl, val) => updateField('header', 'phone', lbl, val)}
                                            onDelete={() => deleteField('header', 'phone')}
                                            valueClassName="font-mono text-zinc-800"
                                        />
                                    )}
                                    {boxes.header.fields?.email?.enabled && (
                                        <EditableField 
                                            label="Email:"
                                            value={labSettings.email || boxes.header.fields.email.value}
                                            onSave={(lbl, val) => updateField('header', 'email', lbl, val)}
                                            onDelete={() => deleteField('header', 'email')}
                                            valueClassName="text-zinc-800"
                                        />
                                    )}
                                    {boxes.header.fields?.gstin?.enabled && (
                                        <EditableField 
                                            label="GSTIN:"
                                            value={labSettings.gstin || boxes.header.fields.gstin.value}
                                            onSave={(lbl, val) => updateField('header', 'gstin', lbl, val)}
                                            onDelete={() => deleteField('header', 'gstin')}
                                            valueClassName="font-mono font-bold text-zinc-900"
                                        />
                                    )}
                                    {boxes.header.fields?.pan?.enabled && (
                                        <EditableField 
                                            label="PAN:"
                                            value={labSettings.pan || boxes.header.fields.pan.value}
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
                    )}
                </ModularBoxWrapper>
            )}

            {/* 2. DOCUMENT BADGE & INVOICE META NUMBERS BOX */}
            {boxes.docBadge?.enabled && (
                <ModularBoxWrapper 
                    boxId="docBadge" 
                    boxName={boxes.docBadge.name || "Document Title & Badges"}
                    onDeleteBox={() => deleteBox('docBadge')}
                    onAddCustomLine={(line) => addCustomLine('docBadge', line)}
                >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-zinc-200">
                        <div className="flex items-center gap-2">
                            {boxes.docBadge.fields?.badgeTitle?.enabled && (
                                <EditableField 
                                    value={boxes.docBadge.fields.badgeTitle.value}
                                    onSave={(_, val) => updateField('docBadge', 'badgeTitle', undefined, val)}
                                    onDelete={() => deleteField('docBadge', 'badgeTitle')}
                                    valueClassName="inline-block px-3 py-1 bg-zinc-900 text-white rounded font-black text-[11px] tracking-wider uppercase"
                                />
                            )}
                            {boxes.docBadge.fields?.subBadge?.enabled && (
                                <EditableField 
                                    value={boxes.docBadge.fields.subBadge.value}
                                    onSave={(_, val) => updateField('docBadge', 'subBadge', undefined, val)}
                                    onDelete={() => deleteField('docBadge', 'subBadge')}
                                    valueClassName="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider"
                                />
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[10px]">
                            {boxes.docBadge.fields?.billNumber?.enabled && (
                                <EditableField 
                                    label={boxes.docBadge.fields.billNumber.label ? `${boxes.docBadge.fields.billNumber.label}:` : "Invoice No:"}
                                    value={boxes.docBadge.fields.billNumber.value}
                                    onSave={(lbl, val) => updateField('docBadge', 'billNumber', lbl, val)}
                                    onDelete={() => deleteField('docBadge', 'billNumber')}
                                    valueClassName="font-mono font-black text-zinc-900"
                                />
                            )}
                            {boxes.docBadge.fields?.date?.enabled && (
                                <EditableField 
                                    label={boxes.docBadge.fields.date.label ? `${boxes.docBadge.fields.date.label}:` : "Date:"}
                                    value={boxes.docBadge.fields.date.value}
                                    onSave={(lbl, val) => updateField('docBadge', 'date', lbl, val)}
                                    onDelete={() => deleteField('docBadge', 'date')}
                                    valueClassName="text-zinc-800"
                                />
                            )}
                            {boxes.docBadge.fields?.paymentStatus?.enabled && (
                                <EditableField 
                                    value={boxes.docBadge.fields.paymentStatus.value}
                                    onSave={(_, val) => updateField('docBadge', 'paymentStatus', undefined, val)}
                                    onDelete={() => deleteField('docBadge', 'paymentStatus')}
                                    valueClassName="px-2 py-0.5 rounded font-black text-[9px] uppercase border tracking-wider bg-amber-50 text-amber-800 border-amber-300"
                                />
                            )}
                        </div>

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
                    <div className="border border-zinc-300 rounded-lg p-3 mb-3 bg-zinc-50/50">
                        <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-zinc-200">
                            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                                {boxes.partyDetails.title || "Party Particulars"}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                            {Object.entries(boxes.partyDetails.fields || {}).map(([key, field]) => {
                                if (!field.enabled) return null;
                                return (
                                    <div key={key} className="py-0.5">
                                        <EditableField 
                                            label={field.label ? `${field.label}:` : ""}
                                            value={field.value}
                                            isBlock={true}
                                            onSave={(lbl, val) => updateField('partyDetails', key, lbl, val)}
                                            onDelete={() => deleteField('partyDetails', key)}
                                            labelClassName="text-zinc-500 font-medium"
                                            valueClassName="font-bold text-zinc-900"
                                        />
                                    </div>
                                );
                            })}

                            {/* Custom Lines in Party Box */}
                            {boxes.partyDetails.customLines?.map(line => (
                                <div key={line.id} className="py-0.5 sm:col-span-2">
                                    <EditableField 
                                        label={line.label ? `${line.label}:` : ""}
                                        value={line.value}
                                        isBlock={true}
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
                    </div>
                </ModularBoxWrapper>
            )}

            {/* 4. LINE ITEMS / CHARGES TABLE BOX */}
            {boxes.itemsTable?.enabled && (() => {
                const activeColumns = Object.entries(boxes.itemsTable.columns || {}).filter(([_, col]) => col.enabled);
                const colCount = activeColumns.length;
                const isDense = colCount >= 7;

                return (
                    <ModularBoxWrapper 
                        boxId="itemsTable" 
                        boxName={boxes.itemsTable.name || "Items & Charges Table"}
                        onDeleteBox={() => deleteBox('itemsTable')}
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
                        <div className="mb-3 overflow-x-auto print:overflow-visible rounded-lg border border-zinc-300">
                            <table className="w-full text-left border-collapse table-auto">
                                <thead>
                                    <tr className={`bg-zinc-100 border-b border-zinc-300 font-black uppercase text-zinc-700 tracking-wider ${isDense ? 'text-[8.5px]' : 'text-[10px]'}`}>
                                        {activeColumns.map(([colKey, col]) => {
                                            const isNumeric = ['price', 'amount', 'grossAmount', 'netDue', 'received', 'labBilled', 'rate', 'unitPrice', 'total'].includes(colKey);
                                            return (
                                                <th 
                                                    key={colKey} 
                                                    className={`${isDense ? 'px-1.5 py-1' : 'p-2'} border-r last:border-r-0 border-zinc-200 ${isNumeric ? 'text-right' : 'text-left'}`}
                                                >
                                                    <EditableField 
                                                        value={col.label}
                                                        onSave={(_, val) => updateColumnLabel('itemsTable', colKey, val)}
                                                        onDelete={() => deleteColumn('itemsTable', colKey)}
                                                        valueClassName={`font-black text-zinc-800 uppercase ${isDense ? 'text-[8.5px]' : 'text-[10px]'}`}
                                                    />
                                                </th>
                                            );
                                        })}
                                        {!readOnly && <th className="p-1 w-6 text-center text-zinc-400">✕</th>}
                                    </tr>
                                </thead>
                                <tbody className={`divide-y divide-zinc-200 ${isDense ? 'text-[9.5px]' : 'text-[11px]'}`}>
                                    {(boxes.itemsTable.rows || []).map((row, idx) => (
                                        <tr key={row.id || idx} className="hover:bg-zinc-50 group/row">
                                            {activeColumns.map(([colKey, col]) => {
                                                const cellVal = row[colKey] !== undefined ? row[colKey] : (row[col.id] ?? '');
                                                const isNumeric = ['price', 'amount', 'grossAmount', 'netDue', 'received', 'labBilled', 'rate', 'unitPrice', 'total'].includes(colKey);
                                                return (
                                                    <td 
                                                        key={colKey} 
                                                        className={`${isDense ? 'px-1.5 py-1' : 'p-2'} border-r last:border-r-0 border-zinc-200 break-words whitespace-normal ${isNumeric ? 'text-right font-mono font-semibold' : ''}`}
                                                    >
                                                        <EditableField 
                                                            value={String(cellVal)}
                                                            onSave={(_, val) => updateRowCell('itemsTable', row.id, colKey, val)}
                                                            canDelete={false}
                                                            valueClassName={`font-medium text-zinc-800 ${isNumeric ? 'font-mono' : ''}`}
                                                        />
                                                    </td>
                                                );
                                            })}
                                            {!readOnly && (
                                                <td className="p-1 text-center">
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
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </ModularBoxWrapper>
                );
            })()}

            {/* 5. FINANCIAL TOTALS & TAX BREAKUP BOX */}
            {boxes.financialSummary?.enabled && (
                <ModularBoxWrapper 
                    boxId="financialSummary" 
                    boxName={boxes.financialSummary.name || "Financial Totals Box"}
                    onDeleteBox={() => deleteBox('financialSummary')}
                    onAddCustomLine={(line) => addCustomLine('financialSummary', line)}
                >
                    <div className="bg-zinc-50 rounded-lg border border-zinc-300 p-3 mb-3 space-y-1.5 text-[11px] max-w-sm ml-auto">
                        {Object.entries(boxes.financialSummary.fields || {}).map(([key, field]) => {
                            if (!field.enabled) return null;
                            const isNet = key === 'totalAmount' || key === 'netSalary';
                            const isDue = key === 'balanceDue';
                            return (
                                <div key={key} className={`flex justify-between items-center py-0.5 ${isNet ? 'border-t-2 border-zinc-900 pt-1.5 font-black text-sm' : ''} ${isDue ? 'border-t border-zinc-200 pt-1 font-black text-rose-600' : ''}`}>
                                    <EditableField 
                                        label={field.label ? `${field.label}:` : ""}
                                        value={field.value}
                                        isBlock={true}
                                        onSave={(lbl, val) => updateField('financialSummary', key, lbl, val)}
                                        onDelete={() => deleteField('financialSummary', key)}
                                        labelClassName="text-zinc-600 font-medium"
                                        valueClassName={`font-mono font-bold ${isDue ? 'text-rose-600' : 'text-zinc-900'}`}
                                    />
                                </div>
                            );
                        })}

                        {/* Custom Lines in Financial Box */}
                        {boxes.financialSummary.customLines?.map(line => (
                            <div key={line.id} className="flex justify-between items-center py-0.5 border-t border-dashed border-zinc-200">
                                <EditableField 
                                    label={line.label ? `${line.label}:` : ""}
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
                </ModularBoxWrapper>
            )}

            {/* 6. AMOUNT IN WORDS BOX */}
            {boxes.amountInWords?.enabled && (
                <ModularBoxWrapper 
                    boxId="amountInWords" 
                    boxName={boxes.amountInWords.name || "Amount in Words"}
                    onDeleteBox={() => deleteBox('amountInWords')}
                >
                    <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200 mb-3 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase text-zinc-400 block tracking-wider">
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
                            valueClassName="text-xs font-bold text-zinc-900 italic block"
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
                    <div className="p-2.5 bg-zinc-50/80 rounded border border-zinc-200 text-[10px] space-y-1 mb-3">
                        <span className="font-bold uppercase text-zinc-400 tracking-wider">
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

            {/* 8. BANK WIRE & DYNAMIC BHARAT UPI QR */}
            {boxes.bankAndUpi?.enabled && (
                <ModularBoxWrapper 
                    boxId="bankAndUpi" 
                    boxName={boxes.bankAndUpi.name || "Bank Wire & Dynamic UPI"}
                    onDeleteBox={() => deleteBox('bankAndUpi')}
                    onAddCustomLine={(line) => addCustomLine('bankAndUpi', line)}
                >
                    <div className="p-3 rounded-lg border border-zinc-200 mb-3 flex gap-3 items-center bg-zinc-50/30">
                        {/* Dynamic UPI QR Code */}
                        {boxes.bankAndUpi.fields?.showQr?.enabled && (
                            <div className="w-20 h-20 bg-white p-1 rounded border border-zinc-300 flex flex-col items-center justify-center shrink-0">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`upi://pay?pa=${encodeURIComponent(labSettings.upiId || 'synoslab@hdfcbank')}&pn=SynOS`)}`}
                                    alt="UPI QR"
                                    className="w-16 h-16 object-contain"
                                />
                                <span className="text-[7px] font-extrabold uppercase text-zinc-500 mt-0.5">Scan to Pay</span>
                            </div>
                        )}

                        {/* Bank Text */}
                        <div className="space-y-0.5 text-[10px] text-zinc-600 flex-1">
                            <strong className="text-zinc-900 uppercase block tracking-wider text-[10px]">
                                {boxes.bankAndUpi.title || "Bank Transfer Details"}
                            </strong>
                            {boxes.bankAndUpi.fields?.bankName?.enabled && (
                                <EditableField 
                                    label="Bank:"
                                    value={labSettings.bankName || boxes.bankAndUpi.fields.bankName.value}
                                    onSave={(lbl, val) => updateField('bankAndUpi', 'bankName', lbl, val)}
                                    onDelete={() => deleteField('bankAndUpi', 'bankName')}
                                    valueClassName="font-bold text-zinc-800"
                                />
                            )}
                            {boxes.bankAndUpi.fields?.accountNumber?.enabled && (
                                <EditableField 
                                    label="A/C No:"
                                    value={labSettings.accountNumber || boxes.bankAndUpi.fields.accountNumber.value}
                                    onSave={(lbl, val) => updateField('bankAndUpi', 'accountNumber', lbl, val)}
                                    onDelete={() => deleteField('bankAndUpi', 'accountNumber')}
                                    valueClassName="font-mono font-bold text-zinc-900"
                                />
                            )}
                            {boxes.bankAndUpi.fields?.ifsc?.enabled && (
                                <EditableField 
                                    label="IFSC:"
                                    value={labSettings.ifscCode || boxes.bankAndUpi.fields.ifsc.value}
                                    onSave={(lbl, val) => updateField('bankAndUpi', 'ifsc', lbl, val)}
                                    onDelete={() => deleteField('bankAndUpi', 'ifsc')}
                                    valueClassName="font-mono font-bold text-zinc-900"
                                />
                            )}
                            {boxes.bankAndUpi.fields?.upiId?.enabled && (
                                <EditableField 
                                    label="UPI ID:"
                                    value={labSettings.upiId || boxes.bankAndUpi.fields.upiId.value}
                                    onSave={(lbl, val) => updateField('bankAndUpi', 'upiId', lbl, val)}
                                    onDelete={() => deleteField('bankAndUpi', 'upiId')}
                                    valueClassName="font-mono font-bold text-indigo-700"
                                />
                            )}

                            {/* Custom Lines */}
                            {boxes.bankAndUpi.customLines?.map(line => (
                                <div key={line.id} className="pt-0.5">
                                    <EditableField 
                                        label={line.label ? `${line.label}:` : ""}
                                        value={line.value}
                                        onSave={(lbl, val) => {
                                            const nextLines = boxes.bankAndUpi.customLines.map(l => l.id === line.id ? { ...l, label: lbl, value: val } : l);
                                            updateSchema({ ...schema, boxes: { ...boxes, bankAndUpi: { ...boxes.bankAndUpi, customLines: nextLines } } });
                                        }}
                                        onDelete={() => deleteCustomLine('bankAndUpi', line.id)}
                                        valueClassName="font-medium text-zinc-800"
                                    />
                                </div>
                            ))}
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
                    <div className="border-t border-zinc-300 pt-2 mb-3">
                        <span className="text-[10px] font-bold uppercase text-zinc-700 block tracking-wider mb-1">
                            {boxes.termsAndConditions.title || "Terms & Conditions"}
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
                            valueClassName="text-[9px] text-zinc-600 leading-relaxed whitespace-pre-line block"
                        />
                        {boxes.termsAndConditions.systemNote && (
                            <p className="italic text-[8px] text-zinc-400 pt-1">
                                {boxes.termsAndConditions.systemNote}
                            </p>
                        )}
                    </div>
                </ModularBoxWrapper>
            )}

            {/* 10. AUTHORISED SIGNATORY STAMP BOX */}
            {boxes.signatory?.enabled && (
                <ModularBoxWrapper 
                    boxId="signatory" 
                    boxName={boxes.signatory.name || "Signatory Stamp"}
                    onDeleteBox={() => deleteBox('signatory')}
                >
                    <div className="text-right space-y-6 min-w-[150px] ml-auto mb-2">
                        <div className="h-6" />
                        <div className="border-t border-zinc-400 pt-1 inline-block text-center min-w-[160px]">
                            <EditableField 
                                value={labSettings.signatoryTitle || boxes.signatory.title}
                                onSave={(_, val) => {
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
                const standardKeys = ['header', 'docBadge', 'partyDetails', 'itemsTable', 'financialSummary', 'amountInWords', 'receiptHistory', 'bankAndUpi', 'termsAndConditions', 'signatory'];
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

            </div>
        </CanvasContext.Provider>
    );
};
