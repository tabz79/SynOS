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
    Square,
    Play,
    Pause,
    RotateCcw,
    RotateCw,
    Star,
    Tag,
    Triangle,
    Target,
    ListOrdered,
    Search,
    ChevronDown,
    FlipHorizontal,
    FlipVertical,
    Trash2,
    Download,
    Eye,
    SlidersHorizontal,
    Link2,
    ArrowUpRight,
    FileSpreadsheet,
    Activity,
    FolderArchive,
    X,
    Box
} from 'lucide-react';

export function DicomViewerContainer({ 
    urls = [], 
    imageIds = [],
    modality = 'CT',
    studyMetadata = null,
    seriesList = [],
    height = '100%',
    className = '',
    showToolbar = true
}) {
    const containerRef = useRef(null);
    const viewportManager = useRef(null);

    // Saince PACS Workstation Tool States
    const [activeTool, setActiveTool] = useState('WindowLevel');
    const [layout, setLayout] = useState('1x1');
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [activeSliceIndex, setActiveSliceIndex] = useState(0);
    const [totalSlices, setTotalSlices] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Saince PACS Suite UI Controls
    const [showSeriesSidebar, setShowSeriesSidebar] = useState(true);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showWlPresets, setShowWlPresets] = useState(false);
    const [showLayoutMenu, setShowLayoutMenu] = useState(false);
    const [isCinePlaying, setIsCinePlaying] = useState(false);
    const [cineFps, setCineFps] = useState(10);
    const [isInverted, setIsInverted] = useState(false);
    const [keyImageSet, setKeyImageSet] = useState(new Set());
    const [activeSeriesIndex, setActiveSeriesIndex] = useState(0);
    const [zoomLevel, setZoomLevel] = useState(100);

    // 2D MPR & Projection States
    const [isMprActive, setIsMprActive] = useState(false);
    const [slabThickness, setSlabThickness] = useState(0.1);
    const [projectionMode, setProjectionMode] = useState('MIP'); // 'MIP', 'MinIP', 'AvgIP'
    const [showProjectionMenu, setShowProjectionMenu] = useState(false);

    // Mouse Drag Zoom & Pan Tracking
    const isDraggingRef = useRef(false);
    const dragStartYRef = useRef(0);
    const startZoomRef = useRef(100);

    const effectiveUrls = (urls && urls.length > 0) ? urls : (imageIds && imageIds.length > 0 ? imageIds : []);

    // Initialize DicomViewportManager
    useEffect(() => {
        if (!containerRef.current) return;

        viewportManager.current = new DicomViewportManager(containerRef.current, modality);
        viewportManager.current.setOnSliceChange((index, total) => {
            setActiveSliceIndex(index);
            if (total) setTotalSlices(total);
        });

        // ResizeObserver to automatically recalculate canvas center & dimensions on container resize
        const resizeObserver = new ResizeObserver(() => {
            if (viewportManager.current) {
                viewportManager.current.resize();
            }
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            if (viewportManager.current) {
                viewportManager.current.destroy();
                viewportManager.current = null;
            }
        };
    }, [modality]);

    // Load DICOM Image URLs into DicomViewportManager
    useEffect(() => {
        if (viewportManager.current && effectiveUrls && effectiveUrls.length > 0) {
            viewportManager.current.setImages(effectiveUrls).then(() => {
                setTotalSlices(effectiveUrls.length);
            }).catch(err => {
                console.error("Failed to load DICOM images into DicomViewerContainer:", err);
            });
        }
    }, [effectiveUrls]);

    // CINE Loop Animation
    useEffect(() => {
        let interval = null;
        if (isCinePlaying && totalSlices > 1) {
            interval = setInterval(() => {
                setActiveSliceIndex((prevIndex) => {
                    const nextIndex = (prevIndex + 1) % totalSlices;
                    if (viewportManager.current) {
                        viewportManager.current.setActiveSlice(nextIndex);
                    }
                    return nextIndex;
                });
            }, 1000 / cineFps);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isCinePlaying, totalSlices, cineFps]);

    // Sync Cornerstone layout after React has updated the DOM grid viewports
    useEffect(() => {
        const timer = setTimeout(() => {
            if (viewportManager.current) {
                viewportManager.current.setLayout(layout).then(() => {
                    viewportManager.current.resize();
                    viewportManager.current.resetCamera();
                });
            }
        }, 60);
        return () => clearTimeout(timer);
    }, [showSeriesSidebar, layout, isMprActive]);

    // Runtime Layout Geometry Instrumentation Logging requested by User
    useEffect(() => {
        if (!isMprActive) return;
        const timer = setTimeout(() => {
            const axial = document.getElementById('synos-viewport-axial');
            const container = containerRef.current;

            console.log("=== LIVE ANCESTOR WALK FROM synos-viewport-axial UP TO document.body ===");
            if (axial) {
                let current = axial;
                let step = 0;
                while (current && current !== document.documentElement) {
                    const rect = current.getBoundingClientRect();
                    console.log(`[Ancestor Step #${step}]`, {
                        tagName: current.tagName,
                        id: current.id || '(none)',
                        className: current.className || '(none)',
                        clientWidth: current.clientWidth,
                        offsetWidth: current.offsetWidth,
                        boundingRectWidth: rect.width,
                        boundingRectX: rect.x,
                        boundingRectY: rect.y
                    });
                    current = current.parentElement;
                    step++;
                }
            } else {
                console.log("synos-viewport-axial NOT FOUND IN DOM");
            }
            console.log("=========================================================================");

            if (container) {
                const mprRow = container.children[0];
                console.log("=== MPR ROW DIRECT CHILDREN AUDIT ===");
                if (mprRow) {
                    console.log("mprRow Tag:", mprRow.tagName, "Class:", mprRow.className, "Children Count:", mprRow.children.length);
                    Array.from(mprRow.children).forEach((child, idx) => {
                        const r = child.getBoundingClientRect();
                        console.log(`[MPR Row Child #${idx}]`, {
                            tagName: child.tagName,
                            id: child.id || '(none)',
                            className: child.className || '(none)',
                            clientWidth: child.clientWidth,
                            offsetWidth: child.offsetWidth,
                            boundingRectWidth: r.width,
                            boundingRectX: r.x,
                            boundingRectY: r.y
                        });
                    });
                } else {
                    console.log("mprRow NOT FOUND");
                }
                console.log("=====================================");

                console.log("=== FULL DOM SUBTREE BENEATH containerRef ===");
                console.log(container.innerHTML);
                console.log("=============================================");
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [isMprActive, showSeriesSidebar]);

    // Toggle 2D MPR Mode
    const toggle2dMprMode = () => {
        if (viewportManager.current) {
            viewportManager.current.cleanupViewports();
        }
        const nextMprState = !isMprActive;
        setIsMprActive(nextMprState);
        const nextLayout = nextMprState ? 'MPR' : '1x1';
        setLayout(nextLayout);
        if (nextMprState) {
            setActiveTool('Crosshairs');
        } else {
            setActiveTool('WindowLevel');
        }
    };

    // Slab Thickness Slider Handler
    const handleSlabThicknessChange = (e) => {
        const val = parseFloat(e.target.value);
        setSlabThickness(val);
        if (viewportManager.current) {
            viewportManager.current.setSlabThickness(val);
        }
    };

    // Projection Mode Handler (MIP, MinIP, AvgIP)
    const handleProjectionModeSelect = (mode) => {
        setProjectionMode(mode);
        setShowProjectionMenu(false);
        if (viewportManager.current) {
            viewportManager.current.setProjectionMode(mode);
        }
    };

    // Interactive Drag Zoom Handlers
    const handlePointerDown = (e) => {
        if (activeTool === 'Zoom') {
            isDraggingRef.current = true;
            dragStartYRef.current = e.clientY;
            startZoomRef.current = zoomLevel;
            e.currentTarget.setPointerCapture(e.pointerId);
        }
    };

    const handlePointerMove = (e) => {
        if (isDraggingRef.current && activeTool === 'Zoom') {
            const deltaY = dragStartYRef.current - e.clientY;
            const newZoom = Math.max(30, Math.min(1000, startZoomRef.current + deltaY * 1.5));
            const roundedZoom = Math.round(newZoom);
            setZoomLevel(roundedZoom);
            if (viewportManager.current) {
                viewportManager.current.setZoom(roundedZoom);
            }
        }
    };

    const handlePointerUp = (e) => {
        if (isDraggingRef.current) {
            isDraggingRef.current = false;
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch (err) {}
        }
    };

    // Layout changes
    const handleLayoutChange = (newLayout) => {
        if (viewportManager.current) {
            viewportManager.current.cleanupViewports();
        }
        setLayout(newLayout);
        setShowLayoutMenu(false);
        setIsMprActive(newLayout === 'MPR');
    };

    // Window / Level Presets (Soft Tissue, Bone, Lung, Brain, Vascular)
    const handleWlPreset = (presetName, bVal, cVal) => {
        setBrightness(bVal);
        setContrast(cVal);
        setShowWlPresets(false);
        if (viewportManager.current) {
            viewportManager.current.setFilters(bVal, cVal);
        }
    };

    // Reset Viewport
    const handleReset = () => {
        setBrightness(100);
        setContrast(100);
        setIsInverted(false);
        setZoomLevel(100);
        setIsCinePlaying(false);
        setActiveTool('WindowLevel');
        if (viewportManager.current) {
            viewportManager.current.setToolActive('WindowLevel');
            viewportManager.current.setFilters(100, 100);
            viewportManager.current.setZoom(100);
            viewportManager.current.resetCamera();
        }
    };

    // Slice Slider Change
    const handleSliceChange = (e) => {
        const index = parseInt(e.target.value, 10);
        setActiveSliceIndex(index);
        if (viewportManager.current) {
            viewportManager.current.setActiveSlice(index);
        }
    };

    // Toggle Key Image Bookmark
    const toggleKeyImage = () => {
        setKeyImageSet(prev => {
            const next = new Set(prev);
            if (next.has(activeSliceIndex)) next.delete(activeSliceIndex);
            else next.add(activeSliceIndex);
            return next;
        });
    };

    // Invert Colors
    const toggleInvert = () => {
        setIsInverted(!isInverted);
        setShowMoreMenu(false);
    };

    // Clear Measurements
    const handleClearMeasurements = () => {
        if (viewportManager.current) {
            viewportManager.current.clearMeasurements();
        }
        setShowMoreMenu(false);
    };

    // Download Current Viewport Frame
    const handleDownloadFrame = () => {
        const canvas = containerRef.current?.querySelector('canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = `DICOM_Slice_${activeSliceIndex + 1}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } else {
            alert('Viewport canvas not ready for capture.');
        }
        setShowMoreMenu(false);
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    // Default mock series list if not provided
    const displaySeriesList = seriesList.length > 0 ? seriesList : [
        {
            seriesId: 's1',
            seriesDescription: `${modality} Primary Series`,
            modality: modality,
            instanceCount: totalSlices || effectiveUrls.length || 1,
            date: '8/3/2026'
        }
    ];

    return (
        <div className={`relative flex flex-col bg-zinc-950 text-zinc-100 font-sans overflow-hidden select-none flex-1 h-full w-full min-h-0 ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''} ${className}`}>
            
            {/* SAINCE PACS PRO TOP WORKSTATION TOOLBAR (No overflow-x-auto so dropdown popovers break out cleanly!) */}
            {showToolbar && (
                <div className="bg-zinc-900 border-b border-cyan-950/60 px-3 py-1.5 flex items-center justify-between z-[100] shadow-md text-xs relative shrink-0">
                    
                    {/* Left Tools Group */}
                    <div className="flex flex-wrap items-center space-x-1.5 py-0.5">
                        
                        {/* 1. Series Sidebar Toggle Button */}
                        <button
                            onClick={() => setShowSeriesSidebar(!showSeriesSidebar)}
                            className={`flex flex-col items-center justify-center px-3 py-1 rounded-lg border text-xxs font-bold transition ${
                                showSeriesSidebar 
                                    ? 'bg-cyan-500 text-zinc-950 border-cyan-400 font-extrabold shadow-sm' 
                                    : 'bg-zinc-800/80 hover:bg-zinc-700 text-cyan-400 border-zinc-700'
                            }`}
                            title="Toggle Series Thumbnail Sidebar"
                        >
                            <Grid className="w-4 h-4 mb-0.5" />
                            <span>Series</span>
                        </button>

                        {/* 2. 2D MPR Mode Toggle Button */}
                        <button
                            onClick={toggle2dMprMode}
                            className={`flex flex-col items-center justify-center px-3 py-1 rounded-lg border text-xxs font-bold transition ${
                                isMprActive 
                                    ? 'bg-amber-500 text-zinc-950 border-amber-400 font-extrabold shadow-sm' 
                                    : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border-indigo-500/40'
                            }`}
                            title="Toggle 2D Multi-Planar Reconstruction (MPR)"
                        >
                            {isMprActive ? <X className="w-4 h-4 mb-0.5 text-red-950 font-bold" /> : <Box className="w-4 h-4 mb-0.5" />}
                            <span>{isMprActive ? 'Exit 2D MPR' : '2D MPR'}</span>
                        </button>

                        <div className="h-6 w-px bg-zinc-800 mx-1" />

                        {/* 2D MPR Specific Tools (Slab Thickness & MIP/MinIP/AvgIP Mode) */}
                        {isMprActive && (
                            <>
                                {/* Slab Thickness Slider */}
                                <div className="flex flex-col items-center justify-center px-2 py-0.5 bg-zinc-950 rounded-lg border border-cyan-900/60 text-xxs font-mono">
                                    <div className="flex items-center space-x-1.5 text-cyan-300 font-bold">
                                        <span>Slab Thickness:</span>
                                        <span className="text-amber-400">{slabThickness}mm</span>
                                    </div>
                                    <input 
                                        type="range"
                                        min={0.1}
                                        max={50}
                                        step={0.5}
                                        value={slabThickness}
                                        onChange={handleSlabThicknessChange}
                                        className="w-20 h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-cyan-400 mt-1"
                                    />
                                </div>

                                {/* Projection Mode Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowProjectionMenu(!showProjectionMenu)}
                                        className="flex flex-col items-center justify-center px-2.5 py-1 rounded-lg border text-xxs font-bold bg-cyan-950 text-cyan-300 border-cyan-700/60 hover:bg-cyan-900 transition"
                                        title="Projection Mode (MIP / MinIP / AvgIP)"
                                    >
                                        <span className="text-zinc-400 text-[9px] uppercase font-mono">Mode</span>
                                        <span className="flex items-center text-amber-400 font-extrabold">{projectionMode} <ChevronDown className="w-3 h-3 ml-0.5" /></span>
                                    </button>

                                    {showProjectionMenu && (
                                        <div className="absolute left-0 top-full mt-1.5 w-36 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-[999] p-1 space-y-1 text-xs">
                                            <button onClick={() => handleProjectionModeSelect('MIP')} className={`w-full text-left px-3 py-1.5 rounded-lg font-bold ${projectionMode === 'MIP' ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-300 hover:bg-zinc-800'}`}>MIP (Max Intensity)</button>
                                            <button onClick={() => handleProjectionModeSelect('MinIP')} className={`w-full text-left px-3 py-1.5 rounded-lg font-bold ${projectionMode === 'MinIP' ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-300 hover:bg-zinc-800'}`}>MinIP (Min Intensity)</button>
                                            <button onClick={() => handleProjectionModeSelect('AvgIP')} className={`w-full text-left px-3 py-1.5 rounded-lg font-bold ${projectionMode === 'AvgIP' ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-300 hover:bg-zinc-800'}`}>AvgIP (Average)</button>
                                        </div>
                                    )}
                                </div>

                                <div className="h-6 w-px bg-zinc-800 mx-1" />
                            </>
                        )}

                        {/* Crosshairs & Sync */}
                        <button
                            onClick={() => handleToolChange('Crosshairs')}
                            className={`flex flex-col items-center justify-center px-2.5 py-1 rounded-lg border text-xxs font-bold transition ${
                                activeTool === 'Crosshairs'
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' 
                                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                            }`}
                            title="3D Crosshairs & Multi-Viewport Sync"
                        >
                            <Link2 className="w-4 h-4 mb-0.5" />
                            <span>Crosshairs</span>
                        </button>

                        {/* Stack Scroll */}
                        {!isMprActive && (
                            <button
                                onClick={() => handleToolChange('StackScrollMouseWheel')}
                                className={`flex flex-col items-center justify-center px-2.5 py-1 rounded-lg border text-xxs font-bold transition ${
                                    activeTool === 'StackScrollMouseWheel'
                                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' 
                                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                                }`}
                                title="Stack Scroll Mode"
                            >
                                <Layers className="w-4 h-4 mb-0.5" />
                                <span>Stack Scroll</span>
                            </button>
                        )}

                        {/* Zoom */}
                        <button
                            onClick={() => handleToolChange('Zoom')}
                            className={`flex flex-col items-center justify-center px-2.5 py-1 rounded-lg border text-xxs font-bold transition ${
                                activeTool === 'Zoom'
                                    ? 'bg-cyan-500 text-zinc-950 font-extrabold border-cyan-400 shadow-sm' 
                                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                            }`}
                            title="Interactive Zoom Tool"
                        >
                            <ZoomIn className="w-4 h-4 mb-0.5" />
                            <span>Zoom</span>
                        </button>

                        {/* Levels (W/L Presets) */}
                        <div className="relative">
                            <button
                                onClick={() => setShowWlPresets(!showWlPresets)}
                                className={`flex flex-col items-center justify-center px-2.5 py-1 rounded-lg border text-xxs font-bold transition ${
                                    activeTool === 'WindowLevel' || showWlPresets
                                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' 
                                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                                }`}
                                title="Window / Level Presets"
                            >
                                <Sun className="w-4 h-4 mb-0.5" />
                                <span>Levels</span>
                            </button>

                            {showWlPresets && (
                                <div className="absolute left-0 top-full mt-1.5 w-44 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-[999] p-1 space-y-1 text-xs">
                                    <button onClick={() => handleWlPreset('Default', 100, 100)} className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 rounded-lg text-zinc-200 font-bold">Default W/L</button>
                                    <button onClick={() => handleWlPreset('Soft Tissue', 110, 130)} className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 rounded-lg text-cyan-400 font-bold">Soft Tissue (W:400 L:40)</button>
                                    <button onClick={() => handleWlPreset('Bone', 80, 200)} className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 rounded-lg text-amber-400 font-bold">Bone (W:2000 L:500)</button>
                                    <button onClick={() => handleWlPreset('Lung', 140, 180)} className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 rounded-lg text-emerald-400 font-bold">Lung (W:1500 L:-600)</button>
                                    <button onClick={() => handleWlPreset('Brain', 100, 110)} className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 rounded-lg text-indigo-400 font-bold">Brain (W:80 L:40)</button>
                                </div>
                            )}
                        </div>

                        {/* Pan */}
                        <button
                            onClick={() => handleToolChange('Pan')}
                            className={`flex flex-col items-center justify-center px-2.5 py-1 rounded-lg border text-xxs font-bold transition ${
                                activeTool === 'Pan'
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' 
                                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                            }`}
                            title="Pan Canvas Tool"
                        >
                            <Move className="w-4 h-4 mb-0.5" />
                            <span>Pan</span>
                        </button>

                        {/* Length (Ruler) */}
                        <button
                            onClick={() => handleToolChange('Length')}
                            className={`flex flex-col items-center justify-center px-2.5 py-1 rounded-lg border text-xxs font-bold transition ${
                                activeTool === 'Length'
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' 
                                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                            }`}
                            title="Linear Distance Ruler"
                        >
                            <Ruler className="w-4 h-4 mb-0.5" />
                            <span>Length</span>
                        </button>

                        {/* Angle */}
                        <button
                            onClick={() => handleToolChange('Angle')}
                            className={`flex flex-col items-center justify-center px-2.5 py-1 rounded-lg border text-xxs font-bold transition ${
                                activeTool === 'Angle'
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' 
                                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                            }`}
                            title="3-Point Angle Measurement"
                        >
                            <Triangle className="w-4 h-4 mb-0.5 rotate-90" />
                            <span>Angle</span>
                        </button>

                        {/* Key Image */}
                        <button
                            onClick={toggleKeyImage}
                            className={`flex flex-col items-center justify-center px-2.5 py-1 rounded-lg border text-xxs font-bold transition ${
                                keyImageSet.has(activeSliceIndex)
                                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' 
                                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                            }`}
                            title="Bookmark Current Key Image"
                        >
                            <Star className={`w-4 h-4 mb-0.5 ${keyImageSet.has(activeSliceIndex) ? 'fill-amber-400' : ''}`} />
                            <span>Key Image</span>
                        </button>

                        {/* Reset */}
                        <button
                            onClick={handleReset}
                            className="flex flex-col items-center justify-center px-2.5 py-1 rounded-lg border text-xxs font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800 transition"
                            title="Reset Zoom, Pan & W/L"
                        >
                            <RotateCcw className="w-4 h-4 mb-0.5" />
                            <span>Reset</span>
                        </button>

                        {/* CINE Loop */}
                        {!isMprActive && (
                            <button
                                onClick={() => setIsCinePlaying(!isCinePlaying)}
                                className={`flex flex-col items-center justify-center px-2.5 py-1 rounded-lg border text-xxs font-bold transition ${
                                    isCinePlaying
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 animate-pulse' 
                                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                                }`}
                                title="Toggle Automated CINE Slice Playback"
                            >
                                {isCinePlaying ? <Pause className="w-4 h-4 mb-0.5" /> : <Play className="w-4 h-4 mb-0.5" />}
                                <span>CINE</span>
                            </button>
                        )}

                        {/* More Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowMoreMenu(!showMoreMenu)}
                                className="flex flex-col items-center justify-center px-2.5 py-1 rounded-lg border text-xxs font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800 transition"
                                title="More Advanced Measurements & Controls"
                            >
                                <Search className="w-4 h-4 mb-0.5" />
                                <span className="flex items-center">More <ChevronDown className="w-3 h-3 ml-0.5" /></span>
                            </button>

                            {showMoreMenu && (
                                <div className="absolute left-0 top-full mt-1.5 w-52 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-[999] p-1.5 space-y-1 text-xs">
                                    <button onClick={() => handleToolChange('EllipticalROI')} className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 rounded-lg flex items-center justify-between text-zinc-200">
                                        <span className="flex items-center"><Circle className="w-3.5 h-3.5 mr-2 text-cyan-400" /> Ellipse ROI</span>
                                    </button>
                                    <button onClick={() => handleToolChange('RectangleROI')} className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 rounded-lg flex items-center justify-between text-zinc-200">
                                        <span className="flex items-center"><Square className="w-3.5 h-3.5 mr-2 text-cyan-400" /> Rectangle ROI</span>
                                    </button>
                                    <button onClick={toggleInvert} className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 rounded-lg flex items-center justify-between text-zinc-200">
                                        <span className="flex items-center"><Contrast className="w-3.5 h-3.5 mr-2 text-amber-400" /> Invert Grayscale</span>
                                        <span className="text-xxs text-zinc-500 font-mono">{isInverted ? 'ON' : 'OFF'}</span>
                                    </button>
                                    <button onClick={handleClearMeasurements} className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 rounded-lg flex items-center text-red-400">
                                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Clear Annotations
                                    </button>
                                    <button onClick={handleDownloadFrame} className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 rounded-lg flex items-center text-emerald-400">
                                        <Download className="w-3.5 h-3.5 mr-2" /> Download Frame Image
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Layout Dropdown (1x1, 1x2, 2x2, MPR) */}
                        <div className="relative">
                            <button
                                onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                                className="flex flex-col items-center justify-center px-3 py-1 rounded-lg border text-xxs font-bold bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/30 transition"
                                title="Multi-Viewport Grid Layout"
                            >
                                <Grid className="w-4 h-4 mb-0.5" />
                                <span className="flex items-center">Layout ({layout})</span>
                            </button>

                            {showLayoutMenu && (
                                <div className="absolute right-0 top-full mt-1.5 w-36 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-[999] p-1 space-y-1 text-xs">
                                    <button onClick={() => handleLayoutChange('1x1')} className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 rounded-lg font-bold text-zinc-200">1x1 Single Frame</button>
                                    <button onClick={() => handleLayoutChange('1x2')} className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 rounded-lg font-bold text-zinc-200">1x2 Dual Grid</button>
                                    <button onClick={() => handleLayoutChange('2x2')} className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 rounded-lg font-bold text-zinc-200">2x2 Quad Grid</button>
                                    <button onClick={() => handleLayoutChange('MPR')} className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 rounded-lg font-bold text-cyan-400">2D MPR Orthogonal</button>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Right Action: Fullscreen */}
                    <div className="flex items-center space-x-2 shrink-0 ml-2">
                        <button
                            onClick={toggleFullscreen}
                            className="p-1.5 hover:bg-zinc-800 text-zinc-300 rounded-lg transition"
                            title={isFullscreen ? "Exit Fullscreen" : "Full Screen Mode"}
                        >
                            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                    </div>

                </div>
            )}

            {/* MAIN WORKSPACE CANVAS + LEFT SERIES THUMBNAIL SIDEBAR */}
            <div className="flex-1 flex overflow-hidden relative min-h-0 h-full w-full">

                {/* LEFT SERIES THUMBNAIL SIDEBAR */}
                {showSeriesSidebar && (
                    <div className="w-56 bg-zinc-950 border-r border-zinc-800/80 flex flex-col p-2 space-y-2 overflow-y-auto shrink-0 z-20 h-full">
                        <div className="text-xxs uppercase tracking-wider font-extrabold text-cyan-400 px-1 py-1 flex items-center justify-between border-b border-zinc-800/60 mb-1">
                            <span>Image Series</span>
                            <span className="bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded font-mono">{displaySeriesList.length}</span>
                        </div>

                        {displaySeriesList.map((ser, index) => {
                            const isSerActive = index === activeSeriesIndex;
                            return (
                                <div 
                                    key={ser.seriesId || index}
                                    onClick={() => setActiveSeriesIndex(index)}
                                    className={`p-2 rounded-xl border cursor-pointer transition flex flex-col space-y-1.5 ${
                                        isSerActive 
                                            ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200 ring-1 ring-cyan-500/40' 
                                            : 'bg-zinc-900/60 hover:bg-zinc-800 border-zinc-800 text-zinc-400'
                                    }`}
                                >
                                    <div className="flex items-center justify-between text-xxs font-mono text-zinc-400">
                                        <span>• {ser.date || '8/3/2026'}</span>
                                        <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-cyan-300 font-bold">{ser.instanceCount || totalSlices || 1} Slices</span>
                                    </div>

                                    {/* Thumbnail Image Box */}
                                    <div className="w-full h-24 bg-black rounded-lg border border-zinc-800 overflow-hidden flex items-center justify-center relative group">
                                        {effectiveUrls.length > 0 ? (
                                            <img 
                                                src={effectiveUrls[0]} 
                                                alt="Series Thumbnail" 
                                                className="w-full h-full object-contain group-hover:scale-105 transition"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ) : null}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-cyan-400 font-mono text-xs font-bold">
                                            {ser.modality || modality}
                                        </div>
                                    </div>

                                    <div className="text-xxs font-bold text-zinc-200 truncate">
                                        {ser.seriesDescription || `${modality} Diagnostic Series`}
                                    </div>
                                    <div className="text-xxs font-mono text-zinc-500">
                                        s: {index + 1}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* VIEWPORT CANVAS CONTAINER WITH POINTER INTERACTIVE ZOOM DRAG */}
                <div 
                    ref={containerRef}
                    className="relative flex-1 h-full w-full bg-black overflow-hidden touch-none flex flex-col min-h-0"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    style={{ cursor: activeTool === 'Zoom' ? 'ns-resize' : 'default' }}
                >
                    
                    {/* Render 2D MPR 3-Viewport Grid, 1x2 Dual Grid, 2x2 Quad Grid, or Standard Single Stack Viewport */}
                    {layout === 'MPR' ? (
                        <div key="mpr-3viewport-grid-container" className="flex flex-row w-full h-full divide-x divide-zinc-900 overflow-hidden flex-1 min-h-0 bg-black">
                            {/* Axial Viewport (Column 1 of 3 - Red Indicator) */}
                            <div key="mpr-col-axial" className="relative bg-black h-full flex-1 overflow-hidden flex flex-col" style={{ flex: '1 1 33.333%', width: '33.333%', minWidth: '150px' }}>
                                <div className="absolute top-3 right-3 z-20 w-3.5 h-3.5 rounded-full bg-red-500 shadow-md shadow-red-500/50" />
                                
                                <div className="absolute top-2 inset-x-0 text-center z-10 text-xs font-mono text-cyan-300 font-bold pointer-events-none">A</div>
                                <div className="absolute bottom-2 inset-x-0 text-center z-10 text-xs font-mono text-cyan-300 font-bold pointer-events-none">P</div>
                                <div className="absolute left-2 inset-y-0 flex items-center z-10 text-xs font-mono text-cyan-300 font-bold pointer-events-none">R</div>
                                <div className="absolute right-2 inset-y-0 flex items-center z-10 text-xs font-mono text-cyan-300 font-bold pointer-events-none">L</div>

                                <div className="absolute bottom-3 right-3 z-10 text-xxs font-mono text-cyan-400 font-bold">W: 300 L: 40</div>

                                <div id="synos-viewport-axial" className="viewport-element relative w-full h-full flex-1 block" style={{ width: '100%', height: '100%', minWidth: '150px', minHeight: '150px' }} />
                            </div>

                            {/* Sagittal Viewport (Column 2 of 3 - Yellow Indicator) */}
                            <div key="mpr-col-sagittal" className="relative bg-black h-full flex-1 overflow-hidden flex flex-col" style={{ flex: '1 1 33.333%', width: '33.333%', minWidth: '150px' }}>
                                <div className="absolute top-3 right-3 z-20 w-3.5 h-3.5 rounded-full bg-yellow-400 shadow-md shadow-yellow-400/50" />

                                <div className="absolute top-2 inset-x-0 text-center z-10 text-xs font-mono text-cyan-300 font-bold pointer-events-none">S</div>
                                <div className="absolute bottom-2 inset-x-0 text-center z-10 text-xs font-mono text-cyan-300 font-bold pointer-events-none">I</div>
                                <div className="absolute left-2 inset-y-0 flex items-center z-10 text-xs font-mono text-cyan-300 font-bold pointer-events-none">A</div>
                                <div className="absolute right-2 inset-y-0 flex items-center z-10 text-xs font-mono text-cyan-300 font-bold pointer-events-none">P</div>

                                <div className="absolute bottom-3 right-3 z-10 text-xxs font-mono text-cyan-400 font-bold">W: 300 L: 40</div>

                                <div id="synos-viewport-sagittal" className="viewport-element relative w-full h-full flex-1 block" style={{ width: '100%', height: '100%', minWidth: '150px', minHeight: '150px' }} />
                            </div>

                            {/* Coronal Viewport (Column 3 of 3 - Green Indicator) */}
                            <div key="mpr-col-coronal" className="relative bg-black h-full flex-1 overflow-hidden flex flex-col" style={{ flex: '1 1 33.333%', width: '33.333%', minWidth: '150px' }}>
                                <div className="absolute top-3 right-3 z-20 w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/50" />

                                <div className="absolute top-2 inset-x-0 text-center z-10 text-xs font-mono text-cyan-300 font-bold pointer-events-none">S</div>
                                <div className="absolute bottom-2 inset-x-0 text-center z-10 text-xs font-mono text-cyan-300 font-bold pointer-events-none">I</div>
                                <div className="absolute left-2 inset-y-0 flex items-center z-10 text-xs font-mono text-cyan-300 font-bold pointer-events-none">R</div>
                                <div className="absolute right-2 inset-y-0 flex items-center z-10 text-xs font-mono text-cyan-300 font-bold pointer-events-none">L</div>

                                <div className="absolute bottom-3 right-3 z-10 text-xxs font-mono text-cyan-400 font-bold">W: 300 L: 40</div>

                                <div id="synos-viewport-coronal" className="viewport-element relative w-full h-full flex-1 block" style={{ width: '100%', height: '100%', minWidth: '150px', minHeight: '150px' }} />
                            </div>
                        </div>
                    ) : layout === '1x2' ? (
                        <div key="grid-1x2-container" className="flex flex-row w-full h-full divide-x divide-zinc-900 overflow-hidden flex-1 min-h-0 bg-black">
                            <div key="vp-1x2-0" className="viewport-element relative w-full h-full flex-1 min-h-0 block" />
                            <div key="vp-1x2-1" className="viewport-element relative w-full h-full flex-1 min-h-0 block" />
                        </div>
                    ) : layout === '2x2' ? (
                        <div key="grid-2x2-container" className="grid grid-cols-2 grid-rows-2 w-full h-full divide-x divide-y divide-zinc-900 overflow-hidden flex-1 min-h-0 bg-black">
                            <div key="vp-2x2-0" className="viewport-element relative w-full h-full flex-1 min-h-0 block" />
                            <div key="vp-2x2-1" className="viewport-element relative w-full h-full flex-1 min-h-0 block" />
                            <div key="vp-2x2-2" className="viewport-element relative w-full h-full flex-1 min-h-0 block" />
                            <div key="vp-2x2-3" className="viewport-element relative w-full h-full flex-1 min-h-0 block" />
                        </div>
                    ) : (
                        <div 
                            key="single-viewport-stack-container"
                            id="synos-viewport-single"
                            className="viewport-element relative w-full h-full flex-1 min-h-0 block"
                            style={{ 
                                width: '100%',
                                height: '100%',
                                filter: `brightness(${brightness}%) contrast(${contrast}%) ${isInverted ? 'invert(100%)' : ''}`
                            }}
                        />
                    )}

                    {/* SAINCE PACS MEDICAL HUD OVERLAYS (4-CORNER TEXT) */}
                    {totalSlices > 0 && !isMprActive && (
                        <>
                            {/* Top Left Overlay: Patient Demographics */}
                            <div className="absolute top-3 left-4 pointer-events-none text-xs font-mono text-cyan-300 space-y-0.5 drop-shadow-md z-10 font-bold">
                                <div className="text-sm font-extrabold text-white tracking-wide">{studyMetadata?.patientName || 'RANGA RAO P 76Y/M'}</div>
                                <div className="text-xxs text-cyan-400">MRN: {studyMetadata?.uhid || 'R-001'}</div>
                            </div>

                            {/* Top Right Overlay: Study Info */}
                            <div className="absolute top-3 right-4 pointer-events-none text-xxs font-mono text-cyan-300 text-right space-y-0.5 drop-shadow-md z-10">
                                <div className="font-bold text-white text-xs">{studyMetadata?.testName || '01_Thorax Plain (Adult)'}</div>
                                <div className="text-zinc-400">Aug 3, 2026 21:47:18</div>
                                <div className="text-amber-400 font-bold text-xxs uppercase tracking-wider">INVESTIGATIONAL USE ONLY</div>
                            </div>

                            {/* Bottom Left Overlay: Positioned safely at bottom-20 (above scrubber) */}
                            <div className="absolute bottom-20 left-4 pointer-events-none text-xxs font-mono text-cyan-400 space-y-0.5 drop-shadow-md z-10">
                                <div>Ser: {activeSeriesIndex + 1}</div>
                                <div>Matrix: 512 x 512</div>
                                <div>Loc: -750.50 mm</div>
                                <div className="text-zinc-300 font-bold">Series: {displaySeriesList[activeSeriesIndex]?.seriesDescription || `${modality} Stack`}</div>
                            </div>

                            {/* Bottom Right Overlay: Positioned safely at bottom-20 (above scrubber) */}
                            <div className="absolute bottom-20 right-4 pointer-events-none text-xxs font-mono text-cyan-400 text-right space-y-0.5 drop-shadow-md z-10">
                                <div>Zoom: {zoomLevel}%</div>
                                <div>W: {Math.round(contrast * 3.5)} L: {Math.round(brightness * 0.5)}</div>
                                <div className="text-emerald-400 font-bold">Lossless / Uncompressed</div>
                            </div>
                        </>
                    )}

                    {/* Empty State Banner when no DICOM slices exist */}
                    {totalSlices === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 text-zinc-400 z-30 p-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-cyan-400 shadow-inner">
                                <Layers className="w-7 h-7" />
                            </div>
                            <h3 className="text-sm font-bold text-zinc-100">No DICOM Scans Uploaded Yet</h3>
                            <p className="text-xs text-zinc-500 max-w-sm mt-1 leading-relaxed">
                                No DICOM image series (.dcm files) have been uploaded for this study. Use the DICOM Upload action in PACS Archive or Technician workstation to ingest DICOM scans.
                            </p>
                        </div>
                    )}

                    {/* SLICE NAVIGATION BOTTOM SCRUBBER BAR */}
                    {totalSlices > 1 && !isMprActive && (
                        <div className="absolute bottom-2 inset-x-4 bg-zinc-900/90 border border-zinc-800/80 rounded-xl px-4 py-2 flex items-center justify-between z-20 backdrop-blur-sm shadow-xl">
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setIsCinePlaying(!isCinePlaying)}
                                    className="p-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg border border-cyan-500/40 transition"
                                >
                                    {isCinePlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                </button>
                                <span className="text-xxs font-mono text-zinc-400">
                                    {isCinePlaying ? `CINE (${cineFps} FPS)` : 'Manual Stack Scroll'}
                                </span>
                            </div>

                            <div className="flex items-center space-x-3 flex-1 mx-6">
                                <span className="text-xxs font-mono text-cyan-400 font-bold shrink-0">1</span>
                                <input
                                    type="range"
                                    min={0}
                                    max={totalSlices - 1}
                                    value={activeSliceIndex}
                                    onChange={handleSliceChange}
                                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                />
                                <span className="text-xxs font-mono text-cyan-400 font-bold shrink-0">{totalSlices}</span>
                            </div>

                            <div className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950 px-2.5 py-1 rounded-md border border-cyan-800/60">
                                Slice {activeSliceIndex + 1} / {totalSlices}
                            </div>
                        </div>
                    )}

                </div>
            </div>

        </div>
    );
}
