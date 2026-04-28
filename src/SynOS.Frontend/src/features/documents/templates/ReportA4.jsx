import { Fragment } from 'react';

/**
 * ReportA4 - SKELETON OVERLAY MODE
 * Dedicated to printing on pre-printed, colored clinic letterheads.
 * Logic: We print ONLY the data. Physical paper contains Branding, Watermarks, and Footer bars.
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

  // Formatting helper for Results
  const getFlagAbbreviation = (flag) => {
    if (!flag) return null;
    if (flag === 'High') return 'H';
    if (flag === 'Low') return 'L';
    return flag.charAt(0);
  };

  return (
    <div id="printable-report" className="mx-auto bg-white text-black font-sans w-[210mm] min-h-[297mm] print:min-h-0 relative selection:bg-none print:m-0 print:p-0">
      
      {/* 🏥 HEADER RESERVATION (48mm blank space for pre-printed logo/boxes) */}
      <div className="h-[48mm] w-full" />

      {/* 👤 PATIENT INFO BOXES - TRANSPARENT OVERLAY */}
      {/* We align the text precisely to land in the pre-printed 'Patient Name:', 'Age/Sex:' blanks */}
      <div className="px-[12mm] grid grid-cols-2 gap-x-12 text-[12px] leading-relaxed mb-4">
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
              <span className="font-medium">: {patient?.dateOfBirth?.split(' ')[0]} Yrs / {patient?.gender}</span>
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

      {/* 📄 REPORT TITLE */}
      <div className="text-center mb-4 mt-2">
        <h2 className="text-[14px] font-bold underline decoration-1 underline-offset-4 uppercase tracking-wider">
          {reportTitle}
        </h2>
      </div>

      {/* 🧪 RESULTS TABLE (Skeleton Mode - No Borders) */}
      <div className="px-[12mm] flex-1">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-t border-b border-black text-[11px] font-bold uppercase">
              <th className="py-1 text-left w-[45%]">Test Name</th>
              <th className="py-1 text-center w-[20%]">Results</th>
              <th className="py-1 text-right w-[35%]">Normal Range</th>
            </tr>
          </thead>
          <tbody className="text-[12px]">
            {results.map((group) => (
              <Fragment key={(group.groupName || 'NoGroup') + group.sequence}>
                {/* Group Header */}
                <tr>
                  <td colSpan="3" className="pt-4 pb-1 font-bold text-black border-none uppercase underline underline-offset-2">
                    {group.groupName}
                  </td>
                </tr>
                {/* Parameters */}
                {group.parameters?.map((param) => (
                  <tr key={param.code + param.sequence} className="break-inside-avoid">
                    <td className="py-1 pr-2">
                       <span className="font-medium uppercase">{param.name}</span>
                       {param.method && <div className="text-[9px] text-zinc-500 italic lowercase print:hidden">Method: {param.method}</div>}
                    </td>
                    <td className={`py-1 text-center ${param.isAbnormal ? 'font-black text-[13px] border-b border-zinc-200' : 'font-semibold'}`}>
                      {param.displayValue} {param.unit}
                    </td>
                    <td className="py-1 text-right font-medium">
                      {param.referenceRangeText}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>

        {/* 🧠 CLINICAL INTERPRETATION / COMMENTS */}
        <div className="mt-6 space-y-4">
           {interpretation && (
             <div className="break-inside-avoid">
                <div className="font-bold text-[10px] uppercase mb-1">Observation / Inference :</div>
                <div className="text-[12px] font-bold whitespace-pre-wrap uppercase leading-tight">
                  {interpretation}
                </div>
             </div>
           )}
           
           <div className="grid grid-cols-1 gap-2 text-[11px] font-bold uppercase">
              {comments && (
                <div className="flex gap-2">
                  <span>Comments :</span>
                  <div className="whitespace-pre-wrap">{comments}</div>
                </div>
              )}
           </div>
        </div>

        {/* 🖋️ SIGNATURE QUAD (Row of 4 at the very bottom) */}
        <div className="mt-12 pt-8 break-inside-avoid">
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((slotIdx) => {
              const sig = signatures[slotIdx];
              const isTampered = sig?.isTampered;
              const isSuperseded = sig?.isSuperseded;

              return (
                <div key={slotIdx} className="text-center min-h-[40mm] flex flex-col justify-end relative">
                   {sig ? (
                     <>
                        {/* 🚨 FORENSIC WATERMARKS */}
                        {isTampered && (
                          <div className="absolute inset-0 flex items-center justify-center -rotate-12 pointer-events-none z-20">
                            <div className="border-4 border-red-600 text-red-600 font-black text-[12px] px-2 py-1 bg-white/90 shadow-lg animate-pulse uppercase tracking-tighter">
                              DATA TAMPERED
                            </div>
                          </div>
                        )}
                        {/* Superseded stamp removed as per user request */}

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

      </div>
    </div>
  );
};

export default ReportA4;
