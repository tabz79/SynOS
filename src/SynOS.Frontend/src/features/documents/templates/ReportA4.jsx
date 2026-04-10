import { Fragment } from 'react';

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

  return (
    <div id="printable-report" className="mx-auto bg-white text-zinc-900 font-serif w-[210mm] relative selection:bg-none">
      
      {/* 🏥 REPEATING HEADER (Fixed per page via CSS during print) */}
      <div className="absolute top-0 left-0 right-0 h-[35mm] px-[10mm] py-[5mm] bg-white z-50 border-b-2 border-zinc-900 flex justify-between items-start print:fixed">
        <div className="flex gap-4 items-center">
          <div className="w-16 h-16 bg-zinc-900 flex items-center justify-center text-white font-bold text-2xl rounded">
            S
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter leading-none italic uppercase">{lab?.name}</h1>
            <p className="text-[10px] mt-1 text-zinc-600 font-sans tracking-tight">{lab?.subtitle}</p>
          </div>
        </div>
        <div className="text-right font-sans text-[10px] text-zinc-600 leading-tight">
          <p>{lab?.address}</p>
          <p>{lab?.contact}</p>
          <p className="font-bold text-zinc-900 mt-1 uppercase">{lab?.accreditation}</p>
        </div>
      </div>

      {/* 🛡️ REPEATING FOOTER (Fixed per page via CSS during print) */}
      <div className="absolute bottom-0 left-0 right-0 h-[25mm] px-[10mm] py-[5mm] bg-white z-50 border-t border-zinc-900 flex justify-between items-end font-sans print:fixed">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 bg-zinc-100 flex items-center justify-center border border-zinc-200 p-1">
             <div className="text-[5px] text-center text-zinc-400 font-sans">SYN-SECURE<br/>VERIFIED</div>
          </div>
          <div>
            <div className="text-[7px] text-zinc-400 uppercase tracking-widest leading-none">Verification Hash</div>
            <div className="text-[6px] font-mono text-zinc-500 break-all max-w-[300px] leading-tight mt-1">
                {verification?.status === 'PENDING' ? 'PENDING_VERIFICATION' : (verification?.versionHash || 'NO_HASH_AVAILABLE')}
            </div>
            <div className="text-[8px] text-zinc-900 font-bold mt-1">Source: <span className="uppercase text-zinc-500">{metadata?.generatedFrom}</span> | Ver: {verification?.reportVersion}</div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[8px] italic text-zinc-400 mb-1">Confidential Clinical Report</p>
          <div className="text-[10px] font-bold text-zinc-900">Page 1 of 1</div>
        </div>
      </div>

      {/* 📄 MAIN CONTENT SCROLL (Offsets fixed header/footer) */}
      <div className="pt-[40mm] pb-[30mm] px-[10mm] min-h-[297mm]">
        
        {/* 👤 PATIENT & VISIT CONTEXT */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 font-sans border-b border-zinc-200 pb-4">
          <div className="space-y-1">
            <div className="flex">
              <span className="w-24 font-bold uppercase text-[9px] text-zinc-500">Patient Name</span>
              <span className="font-bold flex-1">: {patient?.name}</span>
            </div>
            <div className="flex">
              <span className="w-24 font-bold uppercase text-[9px] text-zinc-500">Patient ID / MRN</span>
              <span className="flex-1">: {patient?.patientId}</span>
            </div>
            <div className="flex">
              <span className="w-24 font-bold uppercase text-[9px] text-zinc-500">Gender / Age</span>
              <span className="flex-1">: {patient?.gender} / {patient?.dateOfBirth}</span>
            </div>
            <div className="flex">
              <span className="w-24 font-bold uppercase text-[9px] text-zinc-500">Contact</span>
              <span className="flex-1">: {patient?.contactInfo}</span>
            </div>
          </div>
          <div className="space-y-1 border-l border-zinc-100 pl-8">
            <div className="flex">
              <span className="w-32 font-bold uppercase text-[9px] text-zinc-500">Ref Doctor</span>
              <span className="font-bold flex-1">: {metadata?.referenceDoctor}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold uppercase text-[9px] text-zinc-500">Collected At</span>
              <span className="flex-1">: {metadata?.sampleCollectedAtFormatted}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold uppercase text-[9px] text-zinc-500">Received At</span>
              <span className="flex-1">: {metadata?.sampleReceivedAtFormatted}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold uppercase text-[9px] text-zinc-500">Report Gen. At</span>
              <span className="flex-1">: {metadata?.generatedAtFormatted}</span>
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-lg font-black underline decoration-zinc-300 underline-offset-4 uppercase tracking-widest">{reportTitle}</h2>
        </div>

        {/* 🧪 RESULTS TABLE */}
        <table className="w-full mb-8 font-sans border-collapse">
          <thead>
            <tr className="border-t border-b border-zinc-900 text-[10px] text-zinc-500 uppercase tracking-wider">
              <th className="py-2 text-left w-[40%]">Parameter</th>
              <th className="py-2 text-center w-[15%]">Result</th>
              <th className="py-2 text-center w-[15%]">Unit</th>
              <th className="py-2 text-right w-[30%]">Biological Reference Range</th>
            </tr>
          </thead>
          <tbody>
            {results.map((group) => (
              <Fragment key={(group.groupName || 'NoGroup') + group.sequence}>
                {/* Group Header */}
                <tr className="bg-zinc-50 break-after-avoid">
                  <td colSpan="4" className="py-2 px-2 font-black text-zinc-900 border-b border-zinc-100 uppercase text-[11px] tracking-wide">
                    {group.groupName}
                  </td>
                </tr>
                {/* Parameters */}
                {group.parameters?.map((param) => (
                  <tr key={param.code + param.sequence} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors break-inside-avoid">
                    <td className="py-2 pl-4 text-zinc-700">
                      <div className="font-semibold">{param.name}</div>
                      {param.method && <div className="text-[8px] text-zinc-400 italic">Method: {param.method}</div>}
                    </td>
                    <td className={`py-2 text-center text-sm ${param.isAbnormal ? 'font-black bg-zinc-100' : ''}`}>
                      {param.displayValue}
                      {param.flag && (
                          <span className="ml-1 text-[8px] font-bold border border-zinc-900 px-1 rounded-sm uppercase align-top">
                            {param.flag.charAt(0)}
                          </span>
                      )}
                    </td>
                    <td className="py-2 text-center text-zinc-600 font-light">{param.unit}</td>
                    <td className="py-2 text-right text-zinc-600 font-mono tracking-tighter whitespace-pre-wrap">{param.referenceRangeText}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>

        {/* 🧠 CLINICAL SUMMARY */}
        <div className="space-y-4 mb-12 font-sans border-t pt-4 break-inside-avoid">
          
          {interpretation && (
            <div>
              <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">Interpretation</h3>
              <div className="bg-zinc-50 p-3 rounded text-justify text-[11px] leading-relaxed italic border-l-2 border-zinc-200">
                {interpretation}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-8">
              {comments && (
                  <div>
                    <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">Pathologist Comments</h3>
                    <div className="text-[10px] text-zinc-700 whitespace-pre-wrap">{comments}</div>
                  </div>
              )}
              {recommendations && (
                  <div>
                    <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">Recommendations</h3>
                    <div className="text-[10px] text-zinc-700 whitespace-pre-wrap">{recommendations}</div>
                  </div>
              )}
          </div>
        </div>

        {/* 🖋️ SIGNATURES (Atomic Block) */}
        <div className="mt-8 border-t border-zinc-100 pt-8 no-break break-inside-avoid">
          <div className="grid grid-cols-3 gap-8">
            {signatures.length > 0 ? (
              signatures.map((sig, idx) => (
                <div key={idx} className="text-center group">
                  <div className="h-12 flex items-end justify-center mb-2 overflow-hidden">
                    {sig.signatureImage ? (
                      <img src={`data:image/png;base64,${sig.signatureImage}`} alt="Signature" className="max-h-full transition-transform group-hover:scale-110" />
                    ) : (
                      <div className="text-[9px] text-zinc-400 italic mb-2">Electronically Signed</div>
                    )}
                  </div>
                  <div className="font-bold uppercase text-[10px] tracking-tighter">{sig.doctorName}</div>
                  <div className="text-zinc-500 text-[8px] leading-none">{sig.credentials}</div>
                  <div className="text-zinc-400 text-[8px] uppercase tracking-widest mt-1 font-sans">{sig.role}</div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-4 border-2 border-dashed border-zinc-100 rounded text-zinc-300 font-sans uppercase tracking-[1rem] text-[8px]">
                Unsigned Draft Report
              </div>
            )}
          </div>
          <div className="text-center mt-8">
            <p className="text-[8px] italic text-zinc-400 uppercase tracking-[0.5em]">*** End of Report ***</p>
          </div>
        </div>

      </div>

      {/* Watermark for Drafts */}
      {metadata?.isDraft && (
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0 print:fixed">
          <div className="text-[120px] font-black uppercase rotate-[-45deg] border-[20px] border-zinc-900 p-8">DRAFT</div>
        </div>
      )}
    </div>
  );
};


export default ReportA4;
