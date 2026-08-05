import React, { useState, useEffect } from 'react';
import { DicomViewerContainer } from './DicomViewerContainer';
import { Loader2, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';

export function SharedStudyViewer() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [seriesTree, setSeriesTree] = useState(null);
    const [selectedSeriesId, setSelectedSeriesId] = useState(null);
    const [activeImageIds, setActiveImageIds] = useState([]);

    // Extract token from URL path e.g. /r/:token/viewer
    const pathParts = window.location.pathname.split('/');
    const tokenIndex = pathParts.indexOf('r') + 1;
    const token = (tokenIndex > 0 && pathParts[tokenIndex]) 
        ? pathParts[tokenIndex] 
        : sessionStorage.getItem('synos_public_token');
    
    const phone = sessionStorage.getItem('synos_public_phone');

    useEffect(() => {
        if (!token || !phone) {
            setError("Session unverified. Please enter your mobile number on the landing page.");
            setLoading(false);
            return;
        }

        const fetchStudySeries = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/v1/public/reports/viewer/${token}/series-tree?phone=${encodeURIComponent(phone)}`);
                if (!res.ok) {
                    throw new Error("Unable to load DICOM study. Link may be expired or unverified.");
                }
                const data = await res.json();
                setSeriesTree(data);

                // Auto-select primary series
                if (data.series && data.series.length > 0) {
                    const firstSeries = data.series[0];
                    setSelectedSeriesId(firstSeries.seriesId);
                    const imageIds = firstSeries.instances.map(inst => {
                        const url = inst.wadouri || inst.dicomUrl;
                        return url.startsWith('wadouri:') ? url : `wadouri:${url}`;
                    });
                    setActiveImageIds(imageIds);
                }
            } catch (err) {
                console.error("Public DICOM viewer error:", err);
                setError(err.message || "Failed to load study");
            } finally {
                setLoading(false);
            }
        };

        fetchStudySeries();
    }, [token, phone]);

    const handleSeriesChange = (seriesId) => {
        if (!seriesTree) return;
        const targetSeries = seriesTree.series.find(s => s.seriesId === seriesId);
        if (targetSeries) {
            setSelectedSeriesId(seriesId);
            const imageIds = targetSeries.instances.map(inst => {
                const url = inst.wadouri || inst.dicomUrl;
                return url.startsWith('wadouri:') ? url : `wadouri:${url}`;
            });
            setActiveImageIds(imageIds);
        }
    };

    if (loading) {
        return (
            <div className="h-screen w-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-4 font-sans">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                <p className="text-sm font-semibold tracking-wide text-zinc-400">Loading Diagnostic DICOM Study...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen w-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mb-4 border border-red-500/20">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Access Verification Failed</h2>
                <p className="text-sm text-zinc-400 max-w-md mb-6">{error}</p>
                <button 
                    onClick={() => window.location.href = `/r/${token}`}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-600 transition-all flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" /> Return to Verification Page
                </button>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-zinc-950 flex flex-col overflow-hidden font-sans">
            {/* Top Bar for External Viewers */}
            <div className="h-12 bg-zinc-900 border-b border-white/10 px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => window.location.href = `/r/${token}`}
                        className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
                        title="Back to Report Portal"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold tracking-tight text-white">SynOS Diagnostic DICOM Viewer</span>
                    </div>
                </div>

                <div className="text-[11px] font-medium text-zinc-400">
                    Patient Study: <span className="text-zinc-200 font-semibold">{seriesTree?.patientName || 'Anonymous'}</span> • Accession: <span className="text-zinc-200 font-semibold">{seriesTree?.accessionNumber || 'N/A'}</span>
                </div>
            </div>

            {/* Reusable PACS Viewer Component in External Mode */}
            <div className="flex-1 overflow-hidden">
                <DicomViewerContainer 
                    imageIds={activeImageIds}
                    modality={seriesTree?.modality || 'CT'}
                    seriesList={seriesTree?.series || []}
                    mode="external"
                    onSeriesSelect={handleSeriesChange}
                />
            </div>
        </div>
    );
}
