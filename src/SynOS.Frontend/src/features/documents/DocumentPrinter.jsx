import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReportA4 } from './templates/ReportA4';
import { useAuth } from '@/context/AuthContext';
import { ReportsApi } from '@/api/reports';

/**
 * DocumentPrinter - The delivery pipe for clinical documents.
 * Fetches the V2 data contract and initiates the hardware print sequence.
 */
export const DocumentPrinter = () => {
  const { id } = useParams(); // visitId
  const navigate = useNavigate();
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReportData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const reportData = await ReportsApi.getReportData(id);
        setData(reportData);
        setError(null);
      } catch (err) {
        console.error('Print Engine Fault:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [id, token]);

  useEffect(() => {
    if (!loading && data && !error) {
      // Allow time for styles, fonts, and signature images to settle
      const timer = setTimeout(() => {
        window.print();
        // Option: navigate back or close tab after print dialog closes
        // window.close(); 
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [loading, data, error]);

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

      <div className="relative shadow-[0_0_100px_rgba(0,0,0,0.1)]">
        <ReportA4 reportData={data} />
      </div>

      <footer className="no-print mt-12 mb-12 text-zinc-400 text-[10px] uppercase tracking-[0.3em]">
        SynOS Enterprise Document Engine v2.0
      </footer>
    </div>
  );
};

export default DocumentPrinter;
