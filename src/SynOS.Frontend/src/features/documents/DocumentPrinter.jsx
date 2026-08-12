import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReportA4 } from './templates/ReportA4';
import { useTemplateForReport, fetchTemplatesCached, fetchTestsCached } from './templates/hooks/useReportTemplates';
import { useAuth } from '@/context/AuthContext';
import { ReportsApi } from '@/api/reports';
import { AdminApi } from '@/api/admin';

import { mapBackendDslToTemplate } from './templates/ReportTemplateService';

/**
 * DocumentPrinter - The delivery pipe for clinical documents.
 * Fetches the V2 data contract and initiates the hardware print sequence.
 */
export const DocumentPrinter = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [reportsData, setReportsData] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const resolveTemplate = (reportData, mappedList = [], catalog = []) => {
    if (!mappedList || mappedList.length === 0) return null;

    const modality = reportData?.modality || reportData?.Modality || reportData?.department || reportData?.Department || "";
    const testCode = reportData?.metadata?.testCode || reportData?.metadata?.TestCode || reportData?.testCode || reportData?.TestCode;
    const reportTemplateId = reportData?.reportTemplateId || reportData?.ReportTemplateId || reportData?.templateId || reportData?.TemplateId;

    let found = null;
    
    // 1. Direct match by ID
    if (reportTemplateId) {
      found = mappedList.find(t => t.id === reportTemplateId || (t.id && reportTemplateId && String(t.id).toLowerCase() === String(reportTemplateId).toLowerCase()));
    }

    // 2. Catalog settings override from database
    if (!found && testCode) {
      const test = catalog.find(t => (t.testCode || t.TestCode || t.code || "").toUpperCase() === (testCode || "").toUpperCase());
      const templateId = test?.reportTemplateId || test?.ReportTemplateId || test?.templateId;
      if (templateId) {
        found = mappedList.find(t => t.id === templateId || (t.id && templateId && String(t.id).toLowerCase() === String(templateId).toLowerCase()));
      }
    }

    // 3. Default template for modality
    if (!found && modality) {
      const normModality = (modality || "").toLowerCase().trim();
      const isRad = normModality.includes("rad") || normModality.includes("mri") || normModality.includes("ct") || normModality.includes("xray") || normModality.includes("usg");
      const targetModality = isRad ? "radiology" : "pathology";
      found = mappedList.find(t => t.isDefault && (t.modality || "").toLowerCase().trim() === targetModality)
           || mappedList.find(t => (t.modality || "").toLowerCase().trim() === targetModality);
    }

    // 4. Default template globally
    if (!found) {
      found = mappedList.find(t => t.isDefault);
    }

    // 5. First template in list
    if (!found) {
      found = mappedList[0];
    }

    return found;
  };

  useEffect(() => {
    const fetchAllReportData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const urlParams = new URLSearchParams(window.location.search);
        const forceLive = urlParams.get('forceLive') === 'true';
        
        // 1. Fetch Primary Report
        const primaryData = await ReportsApi.getReportData(id, forceLive);
        const visitId = primaryData?.visitId || primaryData?.VisitId || primaryData?.metadata?.visitId;
        
        // 2. Fetch all reports to check for siblings
        let finalReportDataList = [primaryData];
        try {
          const allReports = await ReportsApi.getReportsByStatus('ReadyForVerification,Signed,ManualVerified,Draft');
          const siblingReportItems = allReports.filter(r => 
            r.visitId === visitId && 
            r.reportId !== id &&
            (r.status === 'Signed' || r.status === 'ManualVerified' || r.status === 'ReadyForVerification')
          );
          
          if (siblingReportItems.length > 0) {
            const siblingDataPromises = siblingReportItems.map(sibling => 
              ReportsApi.getReportData(sibling.reportId, forceLive).catch(err => {
                console.error(`Failed to fetch sibling report data for ${sibling.reportId}`, err);
                return null;
              })
            );
            const siblingsData = await Promise.all(siblingDataPromises);
            finalReportDataList = [
              primaryData,
              ...siblingsData.filter(d => d !== null)
            ];
          }
        } catch (siblingErr) {
          console.warn("Could not load sibling reports, rendering primary report only.", siblingErr);
        }

        // 3. Fetch all templates (cached with fallback)
        let templateDtos = [];
        try {
          templateDtos = await fetchTemplatesCached();
        } catch (fetchErr) {
          console.warn("fetchTemplatesCached failed, trying direct fetch", fetchErr);
          const res = await fetch('/api/v1/reports/templates');
          if (res.ok) {
            templateDtos = await res.json();
          }
        }

        const mappedTemplates = (templateDtos || []).map(item => {
          let dsl = item.templateDsl;
          if (!dsl && item.templateJson) {
            try {
              dsl = typeof item.templateJson === 'string' ? JSON.parse(item.templateJson) : item.templateJson;
            } catch (e) {
              console.error(e);
            }
          }
          if (!dsl && item.sections) {
            dsl = item;
          }
          return mapBackendDslToTemplate(dsl, item.templateId || item.id, item.isDefault, item.isPublished);
        });

        // 3.5 Fetch tests catalog for overrides (cached)
        let catalog = [];
        try {
          catalog = await fetchTestsCached();
        } catch (catalogErr) {
          console.warn("Failed to load catalog for printing overrides", catalogErr);
        }

        // 4. Resolve templates for all reports
        const resolvedTemplates = finalReportDataList.map(report => 
          resolveTemplate(report, mappedTemplates, catalog)
        );

        setReportsData(finalReportDataList);
        setTemplates(resolvedTemplates);
        setError(null);
      } catch (err) {
        console.error('Print Engine Fault:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllReportData();
  }, [id, token]);

  const [isPreprinted, setIsPreprinted] = useState(() => {
    const urlParam = new URLSearchParams(window.location.search).get('preprinted');
    if (urlParam !== null) return urlParam === 'true';
    return localStorage.getItem('synos_preprinted_mode') === 'true';
  });

  const handleTogglePreprinted = (checked) => {
    setIsPreprinted(checked);
    localStorage.setItem('synos_preprinted_mode', checked ? 'true' : 'false');
  };

  useEffect(() => {
    if (!loading && reportsData.length > 0 && templates.length === reportsData.length && !error) {
      // Generate descriptive, unique filename from primary report
      const primary = reportsData[0];
      const patientName = (primary.patient?.name || primary.Patient?.Name || 'Unknown_Patient').replace(/[^a-zA-Z0-9-]/g, '_');
      const mrn = (primary.patient?.patientId || primary.Patient?.PatientId || 'Unknown_MRN').replace(/[^a-zA-Z0-9-]/g, '_');
      const tokenNum = (primary.metadata?.token || primary.Metadata?.Token || 'Unknown_Token').replace(/[^a-zA-Z0-9-]/g, '_');
      const testCode = (primary.metadata?.testCode || primary.Metadata?.TestCode || primary.modality || primary.Modality || 'Report').replace(/[^a-zA-Z0-9-]/g, '_');
      
      const fileName = `${tokenNum}_${mrn}_${patientName}_${testCode}`;
      
      const originalTitle = document.title;
      document.title = fileName;

      // Allow time for styles, fonts, and signature images to settle
      const timer = setTimeout(() => {
        window.print();
        // Restore title after print dialog triggers
        document.title = originalTitle;
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [loading, reportsData, templates, error]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-zinc-900 flex flex-col items-center justify-center text-white no-print">
        <div className="w-16 h-16 border-4 border-synos-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold tracking-[0.2em] uppercase opacity-50">Synchronizing Clinical Integrity...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen bg-zinc-900 flex flex-col items-center justify-center text-white no-print p-8">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-xl font-black uppercase tracking-widest text-red-500 mb-2">Print Pipeline Breach</h1>
        <p className="text-zinc-500 max-w-md text-center mb-8">{error}</p>
        <button 
          onClick={() => navigate(-1)}
          className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 rounded text-xs font-bold uppercase tracking-widest transition-all"
        >
          Return to Terminal
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col items-center py-12 selection:bg-none">
      <div className="no-print mb-8 flex items-center justify-center w-[210mm]">
        <div className="bg-zinc-900 px-6 py-3 rounded-full flex items-center gap-6 shadow-2xl">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Pipeline Ready</span>
          </div>
          <div className="h-4 w-[1px] bg-zinc-800"></div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={isPreprinted} 
              onChange={(e) => handleTogglePreprinted(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded cursor-pointer" 
            />
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              Preprinted Sheet
            </span>
          </label>

          <div className="h-4 w-[1px] bg-zinc-800"></div>
          <button 
            onClick={() => window.print()}
            className="text-xs font-bold text-white uppercase tracking-widest hover:text-synos-primary transition-colors"
          >
            Re-trigger Print
          </button>
          <button 
            onClick={() => navigate(-1)}
            className="text-xs font-bold text-zinc-500 uppercase tracking-widest hover:text-white transition-colors"
          >
            Exit Printer
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {reportsData.map((report, idx) => (
          <div 
            key={report.ReportId || idx} 
            className="relative shadow-[0_0_100px_rgba(0,0,0,0.1)] print-page-container"
            style={{ pageBreakBefore: idx > 0 ? 'always' : 'auto' }}
          >
            <ReportA4 reportData={report} template={templates[idx]} forcePreprinted={isPreprinted} />
          </div>
        ))}
      </div>

      <footer className="no-print mt-12 mb-12 text-zinc-400 text-[10px] uppercase tracking-[0.3em]">
        SynOS Enterprise Document Engine v2.0
      </footer>
    </div>
  );
};

export default DocumentPrinter;
