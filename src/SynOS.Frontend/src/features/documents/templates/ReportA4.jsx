import React, { Fragment } from 'react';
import { DEFAULT_TEMPLATES, sanitizeTemplates } from './defaultTemplates';

// Dynamic Variables Resolution Helper (Supports Patient and Parameter Variables)
const resolveVariables = (text, patient, metadata, results, calculateAge) => {
    if (!text) return '';
    let resolved = text;
    
    // Resolve patient name
    if (patient?.name) {
        resolved = resolved.replace(/\{\{patientName\}\}/gi, patient.name);
    }
    // Resolve patient age
    if (patient?.age) {
        resolved = resolved.replace(/\{\{age\}\}/gi, String(patient.age));
    } else if (patient?.dateOfBirth) {
        resolved = resolved.replace(/\{\{age\}\}/gi, String(calculateAge(patient.dateOfBirth)));
    }
    // Resolve gender
    if (patient?.gender) {
        resolved = resolved.replace(/\{\{gender\}\}/gi, patient.gender);
    }
    // Resolve token
    if (metadata?.token) {
        resolved = resolved.replace(/\{\{token\}\}/gi, metadata.token);
    }
    
    // Resolve specific parameter values like {{testValue:HB}} or {{HB}}
    if (results && results.length > 0) {
        // e.g., {{testValue:HB}}
        resolved = resolved.replace(/\{\{testValue:([a-zA-Z0-9_-]+)\}\}/gi, (match, code) => {
            const found = results.find(r => r.parameterCode?.toUpperCase() === code.toUpperCase() || r.code?.toUpperCase() === code.toUpperCase());
            return found?.value ?? '-';
        });
        
        // e.g., {{HB}}
        resolved = resolved.replace(/\{\{([a-zA-Z0-9_-]+)\}\}/gi, (match, code) => {
            if (['patientName', 'age', 'gender', 'token'].includes(code)) return match;
            const found = results.find(r => r.parameterCode?.toUpperCase() === code.toUpperCase() || r.code?.toUpperCase() === code.toUpperCase());
            return found ? (found.value ?? '-') : match;
        });
    }
    
    return resolved;
};

// Recursive TipTap JSON-to-JSX renderer
const renderTipTapJSON = (node) => {
    if (!node) return null;

    if (node.type === 'text') {
        let element = <span>{node.text}</span>;
        if (node.marks) {
            for (const mark of node.marks) {
                if (mark.type === 'bold') {
                    element = <strong className="font-bold">{element}</strong>;
                } else if (mark.type === 'italic') {
                    element = <em className="italic">{element}</em>;
                } else if (mark.type === 'underline') {
                    element = <u className="underline">{element}</u>;
                } else if (mark.type === 'highlight') {
                    const color = mark.attrs?.color || '#fef08a';
                    element = <mark style={{ backgroundColor: color }} className="px-0.5 rounded-sm">{element}</mark>;
                }
            }
        }
        return element;
    }

    const children = node.content ? node.content.map((child, idx) => (
        <React.Fragment key={idx}>{renderTipTapJSON(child)}</React.Fragment>
    )) : null;

    switch (node.type) {
        case 'doc':
            return <div className="space-y-1 my-1">{children}</div>;
        case 'paragraph':
            return <p className="leading-normal min-h-4">{children}</p>;
        case 'heading':
            const Tag = `h${node.attrs?.level || 3}`;
            return <Tag className="font-black uppercase tracking-tight my-1.5">{children}</Tag>;
        case 'bulletList':
            return <ul className="list-disc pl-4 space-y-0.5 my-1">{children}</ul>;
        case 'orderedList':
            return <ol className="list-decimal pl-4 space-y-0.5 my-1">{children}</ol>;
        case 'listItem':
            return <li className="leading-tight">{children}</li>;
        case 'table':
            return <table className="w-full border-collapse border-2 border-zinc-200 my-1"><tbody>{children}</tbody></table>;
        case 'tableRow':
            return <tr className="border-b border-zinc-150">{children}</tr>;
        case 'tableHeader':
            return <th className="border border-zinc-200 p-1 bg-zinc-50 font-bold text-left text-[11px]">{children}</th>;
        case 'tableCell':
            return <td className="border border-zinc-200 p-1 text-[11px]">{children}</td>;
        default:
            return children;
    }
};


/**
 * ReportA4 - DYNAMIC TEMPLATE RENDERER
 * Supports pre-printed letterhead overlays or full digital layouts.
 */
export const ReportA4 = ({ reportData }) => {
  if (!reportData) return null;

  const { 
    metadata = {}, 
    lab = {},
    modality, 
    reportTitle, 
    patient = {}, 
    results = [], 
    comments, 
    interpretation, 
    recommendations, 
    signatures = [], 
    verification = {} 
  } = reportData;

  const calculateAge = (dobString) => {
    if (!dobString) return "N/A";
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) {
      const num = parseInt(dobString);
      if (!isNaN(num)) return num;
      return dobString;
    }
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const renderRichContent = (contentStr) => {
    if (!contentStr) return null;
    
    const resolvedStr = resolveVariables(contentStr, patient, metadata, results, calculateAge);
    
    const trimmed = resolvedStr.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && parsed.type === 'doc') {
          return renderTipTapJSON(parsed);
        }
      } catch (e) {
        console.error("TipTap JSON parse failed", e);
      }
    }
    
    if (resolvedStr.trim().startsWith('<') || resolvedStr.includes('<h3') || resolvedStr.includes('<p')) {
      return <div dangerouslySetInnerHTML={{ __html: resolvedStr }} />;
    }
    
    return <div className="whitespace-pre-wrap">{resolvedStr}</div>;
  };

  // Resolve template from local storage
  const getTemplate = () => {
    let savedTemplates = localStorage.getItem("synos_report_templates");
    let templates = [];
    if (savedTemplates) {
      try {
        templates = JSON.parse(savedTemplates);
      } catch (e) {
        console.error("Failed to parse templates from localStorage:", e);
      }
    }

    if (!templates || templates.length === 0) {
      templates = sanitizeTemplates(DEFAULT_TEMPLATES);
      localStorage.setItem("synos_report_templates", JSON.stringify(templates));
    }
    
    const savedCatalog = localStorage.getItem("synos_test_catalog");
    let catalog = [];
    if (savedCatalog) {
      try {
        catalog = JSON.parse(savedCatalog);
      } catch (e) {
        console.error("Failed to parse catalog from localStorage:", e);
      }
    }

    const testCode = metadata?.testCode;
    const test = catalog.find(t => t.code === testCode);

    let found = null;
    if (test && test.templateId) {
      found = templates.find(t => t.id === test.templateId);
    }
    if (!found) {
      // Fallback: match by department/modality case-insensitively
      const dept = (modality || "").toLowerCase().trim();
      found = templates.find(t => {
        const modalityName = (t.modality || "").toLowerCase().trim();
        return modalityName && (dept.includes(modalityName) || modalityName.includes(dept));
      });
    }
    
    const rawTemplate = found || templates[0];
    if (!rawTemplate) return null;

    return {
      ...rawTemplate,
      backgroundPath: rawTemplate.backgroundPath || (
        rawTemplate.modality === "Hematology" ? "/assets/report-masters/hematology-master.svg" :
        rawTemplate.modality === "Biochemistry" ? "/assets/report-masters/biochemistry-master.svg" :
        rawTemplate.modality === "Radiology" ? "/assets/report-masters/radiology-master.svg" :
        rawTemplate.modality === "Histopathology" ? "/assets/report-masters/histopathology-master.svg" :
        "/assets/report-masters/default-master.svg"
      )
    };
  };

  const activeTemplate = getTemplate();

  const getCoordinates = (template) => {
    if (!template) return {};
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
      testTitleY: template.testTitleY !== undefined ? template.testTitleY : (tY - 12),
      
      resultsTableX: template.resultsTableX !== undefined ? template.resultsTableX : margin,
      resultsTableY: template.resultsTableY !== undefined ? template.resultsTableY : tY,
      
      signatureX: template.signatureX !== undefined ? template.signatureX : margin,
      signatureY: template.signatureY !== undefined ? template.signatureY : sY,
    };
  };

  const coords = getCoordinates(activeTemplate);

  const activeColumns = activeTemplate?.columns || [
    { code: "Parameter", title: "Test Name", weight: 3, alignment: "Left" },
    { code: "Value", title: "Results", weight: 2, alignment: "Center" },
    { code: "Unit", title: "Unit", weight: 1, alignment: "Center" },
    { code: "ReferenceRange", title: "Normal Range", weight: 3, alignment: "Right" }
  ];

  const visibleColumns = activeColumns.map(c => c.code);
  const columnWeights = activeColumns.map(c => c.weight);
  const totalWeight = columnWeights.reduce((sum, w) => sum + w, 0);

  const getColWidthStyle = (index) => {
    const weight = columnWeights[index] || 1;
    return { width: `${(weight / totalWeight) * 100}%` };
  };

  const getColHeaderName = (col) => {
    const matched = activeColumns.find(c => c.code === col);
    return matched ? matched.title : col;
  };

  const getAlignClass = (col) => {
    const matched = activeColumns.find(c => c.code === col);
    if (!matched) return "text-left";
    const align = matched.alignment?.toLowerCase() || "left";
    if (align === "center") return "text-center";
    if (align === "right") return "text-right";
    return "text-left";
  };

  // Compute Page Styles
  const pageStyle = activeTemplate ? {
    paddingLeft: activeTemplate.enableAbsolutePositioning ? '0mm' : `${activeTemplate.leftRightMargin || 12}mm`,
    paddingRight: activeTemplate.enableAbsolutePositioning ? '0mm' : `${activeTemplate.leftRightMargin || 12}mm`,
    paddingBottom: activeTemplate.enableAbsolutePositioning ? '0mm' : `${activeTemplate.bottomMargin || 35}mm`,
    borderWidth: `${activeTemplate.borderWidth !== undefined ? activeTemplate.borderWidth : 1}px`,
    borderStyle: activeTemplate.borderStyle || 'solid',
    borderColor: activeTemplate.borderColor || '#e2e8f0',
    borderRadius: `${activeTemplate.borderRadius !== undefined ? activeTemplate.borderRadius : 12}px`,
    backgroundColor: activeTemplate.bgType === 'solid' ? activeTemplate.bgColor : '#ffffff',
    background: activeTemplate.bgType === 'gradient' 
      ? `linear-gradient(${activeTemplate.bgGradientAngle || 135}deg, ${activeTemplate.bgGradientStart || '#ffffff'}, ${activeTemplate.bgGradientEnd || '#ffffff'})`
      : undefined
  } : {
    paddingLeft: '12mm',
    paddingRight: '12mm',
    paddingBottom: '35mm'
  };

  return (
    <div 
      id="printable-report" 
      className="mx-auto bg-white text-black font-sans w-[210mm] min-h-[297mm] print:w-[210mm] print:min-h-[296.5mm] print:h-[296.5mm] relative selection:bg-none print:m-0 print:border-none print:rounded-none print:shadow-none print:overflow-hidden"
      style={pageStyle}
    >
      {/* 🖼️ BACKGROUND IMAGE BACKDROP */}
      {activeTemplate && activeTemplate.bgType === 'image' && activeTemplate.backgroundPath && (
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{
            backgroundImage: `url(${activeTemplate.backgroundPath})`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundSize: '100% 100%',
            opacity: activeTemplate.bgImageOpacity || 0.05,
            mixBlendMode: 'multiply',
            zIndex: 0
          }}
        />
      )}

      {/* 🌊 WATERMARK */}
      {activeTemplate && activeTemplate.includeWatermark && activeTemplate.watermarkText && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
          style={{ zIndex: 0 }}
        >
          <div 
            style={{
              color: 'black',
              opacity: activeTemplate.watermarkOpacity || 0.05,
              fontSize: `${activeTemplate.watermarkSize || 32}px`,
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              transform: `rotate(-${activeTemplate.watermarkRotation || 12}deg)`,
              whiteSpace: 'nowrap'
            }}
          >
            {activeTemplate.watermarkText}
          </div>
        </div>
      )}

      {/* 🏥 HEADER RESERVATION (Pre-printed spacer or Digital Branding) */}
      {activeTemplate && activeTemplate.usePreprinted ? (
        <div style={{ height: `${activeTemplate.topMargin || 48}mm` }} className="w-full shrink-0 relative z-10" />
      ) : (
        <>
          <div style={{ height: '10mm' }} className="w-full shrink-0 relative z-10" />
          <div className="w-full flex flex-col mb-6 relative z-10 shrink-0" style={{ paddingBottom: '10px' }}>
            <div className={`flex items-center gap-4 ${activeTemplate?.logoPosition === 'Right' ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
              {activeTemplate?.includeLogo && (
                <div className="shrink-0" style={{ width: `${activeTemplate.logoSize || 40}px`, height: `${activeTemplate.logoSize || 40}px` }}>
                  {activeTemplate.logoUrl ? (
                    <img src={activeTemplate.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full rounded bg-zinc-100 flex items-center justify-center text-zinc-400 font-black text-xs">
                      LOGO
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex-1">
                <h1 
                  style={{
                    color: activeTemplate?.brandNameColor || '#312e81',
                    fontSize: `${activeTemplate?.brandNameSize || 16}px`,
                    fontWeight: activeTemplate?.brandNameWeight || '900',
                    textTransform: 'uppercase',
                    margin: 0,
                    lineHeight: 1.2
                  }}
                >
                  {activeTemplate?.brandNameText || lab?.name || "SynOS Diagnostics Lab"}
                </h1>
                {activeTemplate?.brandSubtitleText && (
                  <p 
                    style={{
                      color: activeTemplate?.brandSubtitleColor || '#71717a',
                      fontSize: `${activeTemplate?.brandSubtitleSize || 9}px`,
                      margin: '2px 0 0 0',
                      lineHeight: 1.2
                    }}
                  >
                    {activeTemplate?.brandSubtitleText}
                  </p>
                )}
              </div>
            </div>
            
            {activeTemplate?.showHeaderDivider && (
              <div 
                style={{
                  height: `${activeTemplate.headerDividerThickness || 2}px`,
                  borderBottomStyle: activeTemplate.headerDividerStyle || 'solid',
                  borderBottomWidth: `${activeTemplate.headerDividerThickness || 2}px`,
                  borderBottomColor: activeTemplate.headerDividerColor || '#4f46e5',
                  marginTop: '12px',
                  width: '100%'
                }}
              />
            )}
          </div>
        </>
      )}

      {/* 👤 PATIENT INFO BOXES */}
      {activeTemplate && activeTemplate.enableAbsolutePositioning ? (
        <>
          {/* 1. Patient Name */}
          <div
            style={{
              position: 'absolute',
              left: `${coords.patientNameX}mm`,
              top: `${coords.patientNameY}mm`,
              zIndex: 20
            }}
            className="text-[10px] text-zinc-900 select-none font-bold"
          >
            {patient?.name}
          </div>

          {/* 2. Age / Sex */}
          <div
            style={{
              position: 'absolute',
              left: `${coords.patientAgeSexX}mm`,
              top: `${coords.patientAgeSexY}mm`,
              zIndex: 20
            }}
            className="text-[10px] text-zinc-900 select-none font-semibold"
          >
            {calculateAge(patient?.dateOfBirth)} Yrs / {patient?.gender}
          </div>

          {/* 3. Ref Doctor */}
          <div
            style={{
              position: 'absolute',
              left: `${coords.refDoctorX}mm`,
              top: `${coords.refDoctorY}mm`,
              zIndex: 20
            }}
            className="text-[10px] text-zinc-900 select-none font-bold"
          >
            {metadata?.referenceDoctor}
          </div>

          {/* 4. Patient ID */}
          <div
            style={{
              position: 'absolute',
              left: `${coords.patientIdX}mm`,
              top: `${coords.patientIdY}mm`,
              zIndex: 20
            }}
            className="text-[10px] text-zinc-900 select-none font-semibold font-mono"
          >
            {patient?.patientId}
          </div>

          {/* 5. Billing Date */}
          <div
            style={{
              position: 'absolute',
              left: `${coords.billingDateX}mm`,
              top: `${coords.billingDateY}mm`,
              zIndex: 20
            }}
            className="text-[10px] text-zinc-900 select-none font-semibold"
          >
            {metadata?.billingDateFormatted}
          </div>

          {/* 6. Report Date */}
          <div
            style={{
              position: 'absolute',
              left: `${coords.reportDateX}mm`,
              top: `${coords.reportDateY}mm`,
              zIndex: 20
            }}
            className="text-[10px] text-zinc-900 select-none font-bold"
          >
            {metadata?.generatedAtFormatted?.split(',')[0]}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-x-12 text-[12px] leading-relaxed mb-4 relative z-10">
          <div className="space-y-1">
             <div className="flex">
                <span className="w-24 font-bold text-zinc-600 uppercase text-[10px]">Patient Name</span>
                <span className="font-bold">: {patient?.name}</span>
             </div>
             <div className="flex">
                <span className="w-24 font-bold text-zinc-600 uppercase text-[10px]">Ref. by Dr.</span>
                <span className="font-medium">: {metadata?.referenceDoctor}</span>
             </div>
             <div className="flex">
                <span className="w-24 font-bold text-zinc-600 uppercase text-[10px]">Age / Sex</span>
                <span className="font-medium">: {calculateAge(patient?.dateOfBirth)} Yrs / {patient?.gender}</span>
             </div>
          </div>
          <div className="space-y-1 pl-4 uppercase">
             <div className="flex">
                <span className="w-20 font-bold text-zinc-600 uppercase text-[10px]">Patient ID</span>
                <span className="font-bold">: {patient?.patientId}</span>
             </div>
             <div className="flex">
                <span className="w-20 font-bold text-zinc-600 uppercase text-[10px]">Bill Date</span>
                <span className="font-medium">: {metadata?.billingDateFormatted}</span>
             </div>
             <div className="flex">
                <span className="w-20 font-bold text-zinc-600 uppercase text-[10px]">Report Date</span>
                <span className="font-medium">: {metadata?.generatedAtFormatted?.split(',')[0]}</span>
             </div>
          </div>
        </div>
      )}

      {/* 📄 REPORT TITLE */}
      <div 
        className="text-center relative z-10"
        style={activeTemplate && activeTemplate.enableAbsolutePositioning ? {
          position: 'absolute',
          left: `${coords.testTitleX}mm`,
          top: `${coords.testTitleY}mm`,
          width: `calc(210mm - ${(activeTemplate.leftRightMargin ?? 15) * 2}mm)`
        } : {
          marginBottom: '16px',
          marginTop: '8px'
        }}
      >
        <h2 className="text-[14px] font-bold underline decoration-1 underline-offset-4 uppercase tracking-wider">
          {reportTitle}
        </h2>
      </div>

      {/* 🧪 RESULTS TABLE (Skeleton Mode - No Borders) */}
      <div 
        className="relative z-10"
        style={activeTemplate && activeTemplate.enableAbsolutePositioning ? {
          position: 'absolute',
          left: `${coords.resultsTableX}mm`,
          top: `${coords.resultsTableY}mm`,
          width: `calc(210mm - ${(activeTemplate.leftRightMargin ?? 15) * 2}mm)`
        } : {
          flex: 1
        }}
      >
        {results && results.length > 0 && (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-t border-b border-black text-[11px] font-bold uppercase">
              {visibleColumns.map((col, idx) => (
                <th key={col} className={`py-1 ${getAlignClass(col)}`} style={getColWidthStyle(idx)}>
                  {getColHeaderName(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-[12px]">
            {results.map((group) => (
              <Fragment key={(group.groupName || 'NoGroup') + group.sequence}>
                {/* Group Header */}
                {group.groupName && (
                  <tr>
                    <td colSpan={visibleColumns.length} className="pt-4 pb-1 font-bold text-black border-none uppercase underline underline-offset-2">
                      {group.groupName}
                    </td>
                  </tr>
                )}
                {/* Parameters */}
                {group.parameters?.map((param) => (
                  <tr key={param.code + param.sequence} className="break-inside-avoid">
                    {visibleColumns.map((col, idx) => {
                      if (col === "Parameter") {
                        return (
                          <td key={col} className="py-1 pr-2 text-left" style={getColWidthStyle(idx)}>
                             <span className="font-medium uppercase">{param.name}</span>
                             {param.method && <div className="text-[9px] text-zinc-500 italic lowercase print:hidden">Method: {param.method}</div>}
                          </td>
                        );
                      }
                      if (col === "Value") {
                        const showSeparateUnit = visibleColumns.includes("Unit");
                        return (
                          <td key={col} className={`py-1 text-center ${param.isAbnormal ? 'font-black text-[13px] border-b border-zinc-200' : 'font-semibold'}`} style={getColWidthStyle(idx)}>
                            {param.displayValue || param.value} {!showSeparateUnit && param.unit}
                          </td>
                        );
                      }
                      if (col === "Unit") {
                        return (
                          <td key={col} className="py-1 text-center font-medium text-zinc-600" style={getColWidthStyle(idx)}>
                            {param.unit}
                          </td>
                        );
                      }
                      if (col === "ReferenceRange") {
                        return (
                          <td key={col} className="py-1 text-right font-medium" style={getColWidthStyle(idx)}>
                            {param.referenceRangeText || param.referenceRange}
                          </td>
                        );
                      }
                      return <td key={col} className="py-1" style={getColWidthStyle(idx)}></td>;
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
        )}

        {/* 🧠 CLINICAL INTERPRETATION / COMMENTS */}
        <div className="mt-6 space-y-4">
           {interpretation && (
             <div className="break-inside-avoid">
                <div className="font-bold text-[10px] uppercase mb-1">Observation / Inference :</div>
                <div className="text-[12px] leading-tight select-text">
                  {renderRichContent(interpretation)}
                </div>
             </div>
           )}
           
           {comments && (
             <div className="grid grid-cols-1 gap-2 text-[11px] select-text break-inside-avoid mt-2">
                <div className="flex gap-2">
                  <span className="font-bold uppercase">Comments :</span>
                  <div className="flex-1 font-medium">{renderRichContent(comments)}</div>
                </div>
             </div>
           )}
        </div>

        {/* 🖋️ SIGNATURE QUAD */}
        {activeTemplate?.includeSignatures !== false && (
          <div className="mt-12 pt-8 break-inside-avoid">
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((slotIdx) => {
                const sig = signatures[slotIdx];
                const isTampered = sig?.isTampered;

                return (
                  <div key={slotIdx} className="text-center min-h-[40mm] flex flex-col justify-end relative">
                     {sig ? (
                       <>
                          {isTampered && (
                            <div className="absolute inset-0 flex items-center justify-center -rotate-12 pointer-events-none z-20">
                              <div className="border-4 border-red-600 text-red-600 font-black text-[12px] px-2 py-1 bg-white/90 shadow-lg animate-pulse uppercase tracking-tighter">
                                DATA TAMPERED
                              </div>
                            </div>
                          )}

                          <div className={`h-10 flex items-center justify-center mb-1 ${isTampered ? 'opacity-30 grayscale blur-[1px]' : ''}`}>
                            {sig.signatureImage && (
                              <img 
                                src={`data:image/png;base64,${sig.signatureImage}`} 
                                alt="Sig" 
                                className="max-h-full opacity-90 mix-blend-multiply" 
                              />
                            )}
                          </div>
                          <div className={`font-bold text-[10px] leading-tight mb-0.5 ${isTampered ? 'line-through text-red-900' : ''}`}>
                            {sig.doctorName}
                          </div>
                          <div className="text-[9px] font-medium leading-tight">{sig.credentials}</div>
                          <div className="font-bold text-[9px] uppercase mt-0.5">{sig.role?.split(' ')[1] || 'Pathologist'}</div>
                       </>
                     ) : (
                       <div className="h-[40mm] opacity-0 text-[1px]">Empty Slot</div>
                     )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ReportA4;
