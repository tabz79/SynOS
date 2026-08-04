import React, { useState, useEffect, useRef } from 'react';
import { DicomViewportManager } from './DicomViewportManager';
import { 
    Sun, 
    Contrast, 
    Layers, 
    Maximize2, 
    Minimize2,
    Grid,
    Move,
    ZoomIn,
    Ruler,
    Sliders,
    RefreshCw,
    Circle,
    Square
} from 'lucide-react';

export function DicomViewerContainer({ 
    urls = [], 
    imageIds = [],
    modality = 'X-Ray',
    studyMetadata = null,
    height = '100%',
    className = '',
    showToolbar = true
}) {
    const containerRef = useRef(null);
    const viewportManager = useRef(null);

    const [activeTool, setActiveTool] = useState('WindowLevel');
    const [layout, setLayout] = useState('1x1');
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [activeSliceIndex, setActiveSliceIndex] = useState(0);
    const [totalSlices, setTotalSlices] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const effectiveUrls = (urls && urls.length > 0) ? urls : (imageIds && imageIds.length > 0 ? imageIds : []);

    // Initialize DicomViewportManager
    useEffect(() => {
        if (!containerRef.current) return;

        viewportManager.current = new DicomViewportManager(containerRef.current, modality);
        viewportManager.current.setOnSliceChange((index, total) => {
            setActiveSliceIndex(index);
            setTotalSlices(total);
        });

        return () => {
            if (viewportManager.current) {
                viewportManager.current.destroy();
                viewportManager.current = null;
            }
        };
    }, [modality]);

    // Load URLs when effectiveUrls prop changes
    useEffect(() => {
        if (viewportManager.current && effectiveUrls && effectiveUrls.length > 0) {
            viewportManager.current.setImages(effectiveUrls).then(() => {
                setTotalSlices(effectiveUrls.length);
            }).catch(err => {
                console.error("Failed to load DICOM images into DicomViewerContainer:", err);
            });
        }
    }, [effectiveUrls]);

    // Tool changes
    const handleToolChange = (toolName) => {
        setActiveTool(toolName);
        if (viewportManager.current) {
            viewportManager.current.setTool(toolName);
        }
    };

    // Layout changes
    const handleLayoutChange = (newLayout) => {
        setLayout(newLayout);
        if (viewportManager.current) {
            viewportManager.current.setLayout(newLayout);
        }
    };

    // Reset Viewport
    const handleReset = () => {
        setBrightness(100);
        setContrast(100);
        setActiveTool('WindowLevel');
        if (viewportManager.current) {
            viewportManager.current.setTool('WindowLevel');
            viewportManager.current.setLayout('1x1');
        }
    };

    // Slice Slider Change
    const handleSliceChange = (e) => {
        const index = parseInt(e.target.value, 10);
        setActiveSliceIndex(index);
        if (viewportManager.current) {
            viewportManager.current.jumpToSlice(index);
        }
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    return (
        <div className={`relative flex flex-col bg-black overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-full w-full'} ${className}`}>
            {/* Metadata Bar / Header */}
            {studyMetadata && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-950/90 border-b border-zinc-800/60 text-xs text-zinc-300">
                    <div className="flex items-center space-x-3">
                        <span className="font-semibold text-emerald-400 uppercase tracking-wider">{modality}</span>
                        {studyMetadata.patientName && (
                            <span className="font-medium text-white">{studyMetadata.patientName}</span>
                        )}
                        {studyMetadata.uhid && (
                            <span className="text-zinc-400 font-mono">({studyMetadata.uhid})</span>
                        )}
                    </div>
                    <div className="flex items-center space-x-3 text-xxs text-zinc-400 font-mono">
                        {studyMetadata.accessionNumber && <span>ACC: {studyMetadata.accessionNumber}</span>}
                        {studyMetadata.studyDate && <span>DATE: {studyMetadata.studyDate}</span>}
                    </div>
                </div>
            )}

            {/* Viewport Canvas Container */}
            <div className="relative flex-1 w-full bg-black min-h-[250px]">
                <div 
                    ref={containerRef}
                    className="w-full h-full"
                    style={{ 
                        filter: `brightness(${brightness}%) contrast(${contrast}%)`
                    }}
                />

                {/* Empty State Banner when no DICOM slices exist */}
                {totalSlices === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 text-zinc-400 z-30 p-6 text-center">
                        <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-emerald-400 shadow-inner">
                            <Layers className="w-7 h-7" />
                        </div>
                        <h3 className="text-sm font-bold text-zinc-100">No DICOM Scans Uploaded Yet</h3>
                        <p className="text-xs text-zinc-500 max-w-sm mt-1 leading-relaxed">
                            No DICOM image series (.dcm files) have been uploaded for this study. Use the DICOM Upload action in PACS Archive or Technician workstation to ingest DICOM scans.
                        </p>
                    </div>
                )}
            </div>

            {/* Interactive Overlay Info */}
            {totalSlices > 0 && (
                <div className="absolute top-10 left-3 pointer-events-none text-xxs font-mono text-emerald-400/80 space-y-0.5 z-10">
                    <div>W/L: {brightness}% / {contrast}%</div>
                    <div>Slice: {activeSliceIndex + 1} / {totalSlices}</div>
                    <div>Tool: {activeTool}</div>
                </div>
            )}

            {/* Interactive Control Toolbar */}
            {showToolbar && (
                <div className="flex items-center justify-between px-3 py-2 bg-zinc-950 border-t border-zinc-800 text-zinc-300 z-20 overflow-x-auto">
                    {/* Primary Tool Buttons */}
                    <div className="flex items-center space-x-1">
                        <button
                            onClick={() => handleToolChange('WindowLevel')}
                            title="Window / Level (W/L)"
                            className={`p-1.5 rounded transition ${activeTool === 'WindowLevel' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'hover:bg-zinc-800 text-zinc-400'}`}
                        >
                            <Sliders className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleToolChange('Pan')}
                            title="Pan Image"
                            className={`p-1.5 rounded transition ${activeTool === 'Pan' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'hover:bg-zinc-800 text-zinc-400'}`}
                        >
                            <Move className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleToolChange('Zoom')}
                            title="Zoom View"
                            className={`p-1.5 rounded transition ${activeTool === 'Zoom' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'hover:bg-zinc-800 text-zinc-400'}`}
                        >
                            <ZoomIn className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleToolChange('Length')}
                            title="Measure Length (Ruler)"
                            className={`p-1.5 rounded transition ${activeTool === 'Length' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'hover:bg-zinc-800 text-zinc-400'}`}
                        >
                            <Ruler className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleToolChange('EllipticalROI')}
                            title="Elliptical ROI"
                            className={`p-1.5 rounded transition ${activeTool === 'EllipticalROI' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'hover:bg-zinc-800 text-zinc-400'}`}
                        >
                            <Circle className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Slice Scroll Slider (for Multi-slice CT/MRI/US) */}
                    {totalSlices > 1 && (
                        <div className="flex items-center space-x-2 mx-3 min-w-[140px] max-w-[240px] flex-1">
                            <Layers className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <input
                                type="range"
                                min={0}
                                max={totalSlices - 1}
                                value={activeSliceIndex}
                                onChange={handleSliceChange}
                                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <span className="text-xxs font-mono text-zinc-400 shrink-0">
                                {activeSliceIndex + 1}/{totalSlices}
                            </span>
                        </div>
                    )}

                    {/* Brightness/Contrast & Layout Controls */}
                    <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1 px-2 border-l border-r border-zinc-800">
                            <Sun className="w-3.5 h-3.5 text-amber-400" />
                            <input
                                type="range"
                                min={50}
                                max={150}
                                value={brightness}
                                onChange={(e) => setBrightness(Number(e.target.value))}
                                className="w-16 h-1 bg-zinc-800 rounded appearance-none accent-amber-400 cursor-pointer"
                            />
                        </div>

                        {/* Reset & Fullscreen */}
                        <button
                            onClick={handleReset}
                            title="Reset View"
                            className="p-1.5 hover:bg-zinc-800 text-zinc-400 rounded transition"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={toggleFullscreen}
                            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
                            className="p-1.5 hover:bg-zinc-800 text-zinc-400 rounded transition"
                        >
                            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
