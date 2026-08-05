import { initCornerstone, cornerstone, cornerstoneTools, cornerstoneDICOMImageLoader } from './cornerstoneSetup';

// Mappings from React tool actions to Cornerstone3D tool names
const TOOL_MAPPING = {
    'Wwwc': 'WindowLevel',
    'WindowLevel': 'WindowLevel',
    'Length': 'Length',
    'Pan': 'Pan',
    'Zoom': 'Zoom',
    'Angle': 'Angle',
    'RectangleROI': 'RectangleROI',
    'EllipticalROI': 'EllipticalROI',
    'Crosshairs': 'Crosshairs'
};

let toolsAdded = false;

function getToolClass(name) {
    if (!cornerstoneTools) return null;
    
    if (cornerstoneTools[name]) return cornerstoneTools[name];
    
    if (cornerstoneTools.tools && cornerstoneTools.tools[name]) {
        return cornerstoneTools.tools[name];
    }
    
    if (cornerstoneTools.default && cornerstoneTools.default[name]) {
        return cornerstoneTools.default[name];
    }
    
    if (cornerstoneTools.default && cornerstoneTools.default.tools && cornerstoneTools.default.tools[name]) {
        return cornerstoneTools.default.tools[name];
    }
    
    return null;
}

function addToolsOnce() {
    if (toolsAdded) return;
    toolsAdded = true;
    const tools = [
        getToolClass('WindowLevelTool'),
        getToolClass('PanTool'),
        getToolClass('ZoomTool'),
        getToolClass('StackScrollMouseWheelTool'),
        getToolClass('SlabScrollMouseWheelTool'),
        getToolClass('LengthTool'),
        getToolClass('AngleTool'),
        getToolClass('RectangleROITool'),
        getToolClass('EllipticalROITool'),
        getToolClass('CrosshairsTool'),
        getToolClass('TrackballRotateTool')
    ].filter(Boolean);

    tools.forEach(tool => {
        try {
            cornerstoneTools.addTool(tool);
        } catch (e) {
            console.warn(`Tool ${tool?.toolName || 'unknown'} might already be registered:`, e);
        }
    });
}

export class DicomViewportManager {
    constructor(container, modality) {
        this.container = container;
        this.modality = modality || 'X-Ray';
        
        // Cache loaded imageIds
        this.imageIds = [];
        this.currentSliceIndex = 0;
        this.layout = '1x1';
        this.activeToolName = 'WindowLevel';
        
        this.renderingEngine = null;
        this.toolGroup = null;
        this.toolGroupId = null;
        this.onSliceChange = null;

        // Async initialization promise
        this.initPromise = this.init();
    }

    setOnSliceChange(callback) {
        this.onSliceChange = callback;
    }

    async init() {
        try {
            await initCornerstone();
            addToolsOnce();
        } catch (error) {
            console.error("Failed to initialize Cornerstone viewport manager:", error);
        }
    }

    async setImages(urls) {
        await this.initPromise;
        if (!urls || urls.length === 0) return;

        const token = localStorage.getItem('synos_jwt');
        // Map relative public URLs to standard WADO-URI loader scheme with auth token fallback
        const rawImageIds = urls.map(url => {
            const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
            const authUrl = token ? `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : fullUrl;
            return `wadouri:${authUrl}`;
        });

        // Diagnostic Instrumentation for DICOM Metadata & Decoded Image Dimensions requested by User
        if (rawImageIds.length > 0) {
            const testId = rawImageIds[0];
            try {
                console.log("=== DICOM METADATA & DECODER DIAGNOSTIC INSTRUMENTATION ===");
                console.log("Target ImageId:", testId);
                const loadedImage = await cornerstone.imageLoader.loadImage(testId);
                if (loadedImage) {
                    const pixelData = loadedImage.getPixelData?.();
                    const imagePlane = cornerstone.metaData.get('imagePlaneModule', testId) || {};

                    console.log("DICOM Header Metadata:", {
                        Rows: loadedImage.rows || imagePlane.rows,
                        Columns: loadedImage.columns || imagePlane.columns,
                        BitsAllocated: loadedImage.bitsAllocated,
                        BitsStored: loadedImage.bitsStored,
                        SamplesPerPixel: loadedImage.samplesPerPixel,
                        PhotometricInterpretation: loadedImage.photometricInterpretation
                    });

                    console.log("Decoded Image Object Properties:", {
                        width: loadedImage.width,
                        height: loadedImage.height,
                        color: loadedImage.color,
                        rgba: loadedImage.rgba,
                        numComps: loadedImage.numComps,
                        pixelDataLength: pixelData ? pixelData.length : 0,
                        pixelDataByteLength: pixelData ? pixelData.byteLength : 0
                    });

                    const rows = loadedImage.rows || 512;
                    const cols = loadedImage.columns || 512;
                    const allocatedPixels = rows * cols;
                    const returnedPixels = pixelData ? pixelData.length : 0;

                    console.log("Pixel Count Comparison:", {
                        allocatedPixelsRowsTimesCols: allocatedPixels,
                        returnedPixelsFromDecoder: returnedPixels,
                        difference: returnedPixels - allocatedPixels
                    });
                }
                console.log("===========================================================");
            } catch (err) {
                console.error("DICOM Load/Decode Diagnostic Error:", err);
            }
        }

        // Preload/cache metadata for all images in parallel
        await Promise.all(rawImageIds.map(id => {
            return cornerstone.imageLoader.loadImage(id).catch(err => {
                console.warn(`Failed to load image/metadata for ID: ${id}`, err);
                return null;
            });
        }));

        // Sort imageIds by physical position (Z-axis) to ensure correct orthogonal MPR reconstruction
        this.imageIds = rawImageIds.filter(Boolean);
        this.imageIds.sort((a, b) => {
            const metaA = cornerstone.metaData.get('imagePlaneModule', a);
            const metaB = cornerstone.metaData.get('imagePlaneModule', b);
            const posA = metaA?.imagePositionPatient?.[2] ?? 0;
            const posB = metaB?.imagePositionPatient?.[2] ?? 0;
            return posA - posB;
        });

        this.currentSliceIndex = 0;
        await this.updateLayout();
    }

    async setLayout(layout) {
        await this.initPromise;
        this.layout = layout;
        await this.updateLayout();
    }

    async updateLayout() {
        if (!this.imageIds || this.imageIds.length === 0) return;

        // Clean up current viewports and engine to prevent context leaks
        this.cleanupViewports();

        // Query grid viewport containers rendered by React
        let elements = this.container.querySelectorAll('.viewport-element');
        let attempts = 0;
        while (elements.length === 0 && attempts < 15) {
            await new Promise(resolve => setTimeout(resolve, 40));
            elements = this.container.querySelectorAll('.viewport-element');
            attempts++;
        }

        if (elements.length === 0) {
            console.error("No .viewport-element containers found in DOM!");
            return;
        }

        const renderingEngineId = `SynosRenderingEngine_${Date.now()}`;
        this.renderingEngine = new cornerstone.RenderingEngine(renderingEngineId);

        const viewportInputs = [];
        const isMPR = this.layout === 'MPR';

        if (isMPR) {
            // MPR Viewport Configuration
            let axialEl = document.getElementById('synos-viewport-axial') || this.container.querySelector('#synos-viewport-axial');
            let sagittalEl = document.getElementById('synos-viewport-sagittal') || this.container.querySelector('#synos-viewport-sagittal');
            let coronalEl = document.getElementById('synos-viewport-coronal') || this.container.querySelector('#synos-viewport-coronal');

            let attempts = 0;
            while ((!axialEl || !sagittalEl || !coronalEl) && attempts < 15) {
                await new Promise(resolve => setTimeout(resolve, 40));
                axialEl = document.getElementById('synos-viewport-axial') || this.container.querySelector('#synos-viewport-axial');
                sagittalEl = document.getElementById('synos-viewport-sagittal') || this.container.querySelector('#synos-viewport-sagittal');
                coronalEl = document.getElementById('synos-viewport-coronal') || this.container.querySelector('#synos-viewport-coronal');
                attempts++;
            }

            if (!axialEl || !sagittalEl || !coronalEl) {
                console.error("MPR Viewport elements not found in DOM yet");
                return;
            }

            const volumeId = `cornerstoneStreamingImageVolume:volume_${Date.now()}`;
            let isVolumeLoaded = false;
            try {
                const volume = await cornerstone.volumeLoader.createAndCacheVolume(volumeId, {
                    imageIds: this.imageIds
                });
                if (volume) {
                    volume.load();
                    isVolumeLoaded = true;
                }
            } catch (vErr) {
                console.warn("Volume loading exception, falling back to 2D stack orthographic rendering:", vErr);
            }

            const vpType = isVolumeLoaded ? cornerstone.Enums.ViewportType.ORTHOGRAPHIC : cornerstone.Enums.ViewportType.STACK;

            viewportInputs.push(
                {
                    viewportId: 'axial',
                    type: vpType,
                    element: axialEl,
                    defaultOptions: {
                        orientation: cornerstone.Enums.OrientationAxis.AXIAL,
                        background: [0, 0, 0]
                    }
                },
                {
                    viewportId: 'sagittal',
                    type: vpType,
                    element: sagittalEl,
                    defaultOptions: {
                        orientation: cornerstone.Enums.OrientationAxis.SAGITTAL,
                        background: [0, 0, 0]
                    }
                },
                {
                    viewportId: 'coronal',
                    type: vpType,
                    element: coronalEl,
                    defaultOptions: {
                        orientation: cornerstone.Enums.OrientationAxis.CORONAL,
                        background: [0, 0, 0]
                    }
                }
            );

            this.renderingEngine.setViewports(viewportInputs);

            // Audit Active RenderingEngine and Viewports after MPR Initialization
            try {
                const activeViewports = this.renderingEngine.getViewports();
                const enabledElements = cornerstone.getEnabledElements ? cornerstone.getEnabledElements() : [];
                console.log("=== PROOF OF ENABLED VIEWPORTS AFTER setViewports() ===");
                console.log("Total registered viewports in RenderingEngine:", activeViewports.length);
                console.log("Viewport IDs:", activeViewports.map(v => v.id));
                console.log("Viewport Elements:", activeViewports.map(v => ({ viewportId: v.id, elementId: v.element?.id, elementTag: v.element?.tagName, elementClass: v.element?.className })));
                console.log("Enabled Elements in Cornerstone:", enabledElements.map(e => ({ viewportId: e.viewport?.id, elementId: e.element?.id })));
                console.log("=======================================================");
            } catch (e) {
                console.warn("Post-initialization audit error:", e);
            }

            this.volumeId = volumeId;
            // Load volumes or 2D image stacks into each viewport
            for (const vInput of viewportInputs) {
                const viewport = this.renderingEngine.getViewport(vInput.viewportId);
                if (viewport) {
                    if (isVolumeLoaded && typeof viewport.setVolumes === 'function') {
                        try {
                            await viewport.setVolumes([{ volumeId }]);
                        } catch (e) {
                            console.warn("Could not set volume on viewport:", vInput.viewportId, e);
                        }
                    } else if (typeof viewport.setStack === 'function' && this.imageIds.length > 0) {
                        try {
                            const sliceOffset = vInput.viewportId === 'sagittal' ? Math.floor(this.imageIds.length / 3) : (vInput.viewportId === 'coronal' ? Math.floor(this.imageIds.length * 2 / 3) : 0);
                            await viewport.setStack(this.imageIds, sliceOffset);
                        } catch (e) {
                            console.warn("Could not set stack on viewport:", vInput.viewportId, e);
                        }
                    }
                    try {
                        viewport.resetCamera();
                        viewport.render();
                    } catch (e) {}

                    const element = vInput.element;
                    const vId = vInput.viewportId;
                    if (element) {
                        try {
                            element.addEventListener(cornerstone.Enums.Events.CAMERA_MODIFIED, () => {
                                try {
                                    const currentIndex = viewport.getCurrentImageIdIndex?.() ?? 0;
                                    let numSlices = this.imageIds.length;
                                    if (this.onViewportSliceChange) {
                                        this.onViewportSliceChange(vId, currentIndex, numSlices);
                                    }
                                } catch (err) {}
                            });
                        } catch (err) {}
                    }
                }
            }
        } else {
            // Stack Viewports (1x1, 1x2, 2x2)
            elements.forEach((el, index) => {
                viewportInputs.push({
                    viewportId: `viewport-${index}`,
                    type: cornerstone.Enums.ViewportType.STACK,
                    element: el,
                    defaultOptions: {
                        background: [0, 0, 0]
                    }
                });
            });

            this.renderingEngine.setViewports(viewportInputs);

            // Populate each viewport with image stack
            for (let i = 0; i < viewportInputs.length; i++) {
                const viewport = this.renderingEngine.getViewport(viewportInputs[i].viewportId);
                await viewport.setStack(this.imageIds, this.currentSliceIndex);
                
                const element = viewportInputs[i].element;
                const vId = viewportInputs[i].viewportId;
                if (element) {
                    element.addEventListener(cornerstone.Enums.Events.STACK_NEW_IMAGE, (evt) => {
                        const { imageIdIndex } = evt.detail;
                        if (vId === 'viewport-0') {
                            this.currentSliceIndex = imageIdIndex;
                            if (this.onSliceChange) {
                                this.onSliceChange(imageIdIndex);
                            }
                        }
                        if (this.onViewportSliceChange) {
                            this.onViewportSliceChange(vId, imageIdIndex, this.imageIds.length);
                        }
                    });
                    
                    // Initialize state
                    if (this.onViewportSliceChange) {
                        this.onViewportSliceChange(vId, this.currentSliceIndex, this.imageIds.length);
                    }
                }
            }
        }

        // Configure tool group
        const toolGroupId = `toolGroup_${Date.now()}`;
        this.toolGroupId = toolGroupId;
        this.toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(toolGroupId);

        const tools = [
            'WindowLevel', 'Pan', 'Zoom',
            'Length', 'Angle', 'RectangleROI', 'EllipticalROI',
            'Crosshairs', 'StackScrollMouseWheel'
        ];
        
        tools.forEach(tName => {
            try {
                this.toolGroup.addTool(tName);
            } catch (e) {
                console.warn(`Could not add tool ${tName} to toolGroup:`, e);
            }
        });

        // Assign viewports to tool group (except 3D)
        viewportInputs.forEach(v => {
            if (v.viewportId !== '3d') {
                try {
                    this.toolGroup.addViewport(v.viewportId, this.renderingEngine.id);
                } catch (e) {}
            }
        });

        // Activate tools safely according to viewport mode
        try {
            this.setToolActive(this.activeToolName);
            if (!isMPR) {
                this.toolGroup.setToolActive('StackScrollMouseWheel');
            }
        } catch (e) {
            console.warn("Could not set active tool in toolGroup:", e);
        }

        try {
            this.renderingEngine.render();
            // Force explicit resize & camera reset after DOM stabilization
            setTimeout(() => {
                if (this.renderingEngine) {
                    try {
                        this.renderingEngine.resize(true, true);
                        const viewports = this.renderingEngine.getViewports();
                        viewports.forEach(vp => {
                            try {
                                vp.resetCamera();
                                vp.render();
                            } catch (err) {}
                        });
                    } catch (err) {}
                }
            }, 100);
        } catch (e) {
            console.error("Error during initial renderingEngine render:", e);
        }
    }

    setToolActive(toolName) {
        const mappedName = TOOL_MAPPING[toolName] || toolName;
        this.activeToolName = mappedName;
        if (!this.toolGroup) return;

        const actionTools = [
            'WindowLevel', 'Pan', 'Zoom', 'Length',
            'Angle', 'RectangleROI', 'EllipticalROI'
        ];
        if (this.layout === 'MPR') {
            actionTools.push('Crosshairs');
        }

        const MouseBindings = cornerstoneTools.Enums.MouseBindings;
        const KeyboardBindings = cornerstoneTools.Enums.KeyboardBindings;

        actionTools.forEach(t => {
            if (t === mappedName) {
                if (t === 'Zoom') {
                    this.toolGroup.setToolActive(t, {
                        bindings: [
                            { mouseButton: MouseBindings.Primary },
                            {
                                mouseButton: MouseBindings.Wheel,
                                modifierKey: KeyboardBindings.Ctrl
                            }
                        ]
                    });
                } else {
                    this.toolGroup.setToolActive(t, {
                        bindings: [{ mouseButton: MouseBindings.Primary }]
                    });
                }
            } else {
                // Secondary mappings
                if (t === 'Pan') {
                    this.toolGroup.setToolActive(t, {
                        bindings: [{ mouseButton: MouseBindings.Secondary }]
                    });
                } else if (t === 'Zoom') {
                    this.toolGroup.setToolActive(t, {
                        bindings: [
                            { mouseButton: MouseBindings.Auxiliary },
                            {
                                mouseButton: MouseBindings.Wheel,
                                modifierKey: KeyboardBindings.Ctrl
                            }
                        ]
                    });
                } else {
                    this.toolGroup.setToolPassive(t);
                }
            }
        });
    }

    async setActiveSlice(index) {
        await this.initPromise;
        if (index < 0 || index >= this.imageIds.length) return;
        this.currentSliceIndex = index;

        if (this.renderingEngine && this.layout !== 'MPR') {
            const viewports = this.renderingEngine.getViewports();
            viewports.forEach(viewport => {
                if (viewport.type === cornerstone.Enums.ViewportType.STACK) {
                    try {
                        viewport.setImageIdIndex(index);
                    } catch (e) {
                        console.warn("Failed to set slice index on stack viewport:", e);
                    }
                }
            });
        }
    }

    resize() {
        if (this.renderingEngine) {
            try {
                this.renderingEngine.resize(true, true);
                const viewports = this.renderingEngine.getViewports();
                viewports.forEach(vp => {
                    try {
                        vp.render();
                    } catch (e) {}
                });
            } catch (error) {
                console.error("Failed to resize Cornerstone3D rendering engine:", error);
            }
        }
    }

    resetCamera() {
        if (!this.renderingEngine) return;
        try {
            const viewports = this.renderingEngine.getViewports();
            viewports.forEach(vp => {
                try {
                    vp.resetCamera();
                    vp.render();
                } catch (e) {}
            });
        } catch (error) {}
    }

    setZoom(zoomFactor) {
        if (!this.renderingEngine) return;
        try {
            const viewports = this.renderingEngine.getViewports();
            viewports.forEach(vp => {
                try {
                    if (typeof vp.setZoom === 'function') {
                        vp.setZoom(zoomFactor / 100);
                    } else {
                        const camera = vp.getCamera();
                        if (camera && camera.parallelScale) {
                            if (!vp.initialParallelScale) vp.initialParallelScale = camera.parallelScale;
                            camera.parallelScale = vp.initialParallelScale / (zoomFactor / 100);
                            vp.setCamera(camera);
                        }
                    }
                    vp.render();
                } catch (e) {}
            });
        } catch (e) {}
    }

    setSlabThickness(thickness) {
        if (!this.renderingEngine || this.layout !== 'MPR') return;
        try {
            const viewports = this.renderingEngine.getViewports();
            viewports.forEach(vp => {
                if (vp.type === cornerstone.Enums.ViewportType.ORTHOGRAPHIC) {
                    try {
                        if (typeof vp.setSlabThickness === 'function') {
                            vp.setSlabThickness(thickness);
                        }
                        vp.render();
                    } catch (e) {}
                }
            });
        } catch (e) {}
    }

    setProjectionMode(mode) {
        if (!this.renderingEngine || this.layout !== 'MPR') return;
        // Blend mode numeric constants: 0 = Maximum Intensity (MIP), 1 = Minimum Intensity (MinIP), 2 = Average (AvgIP)
        let blendMode = 0;
        if (mode === 'MinIP') blendMode = 1;
        else if (mode === 'AvgIP') blendMode = 2;
        else blendMode = 0;
        try {
            const viewports = this.renderingEngine.getViewports();
            viewports.forEach(vp => {
                if (vp.type === cornerstone.Enums.ViewportType.ORTHOGRAPHIC) {
                    try {
                        if (typeof vp.setBlendMode === 'function') {
                            vp.setBlendMode(blendMode);
                        }
                        vp.render();
                    } catch (e) {}
                }
            });
        } catch (e) {}
    }

    setFilters(brightness, contrast) {
        if (!this.renderingEngine) return;
        try {
            const viewports = this.renderingEngine.getViewports();
            viewports.forEach(viewport => {
                const props = viewport.getProperties();
                if (!viewport.defaultWindowWidth) {
                    viewport.defaultWindowWidth = props.voi?.windowWidth || 400;
                    viewport.defaultWindowCenter = props.voi?.windowCenter || 40;
                }
                
                const newCenter = viewport.defaultWindowCenter * (brightness / 100);
                const newWidth = viewport.defaultWindowWidth * (contrast / 100);
                
                viewport.setProperties({
                    voi: {
                        windowWidth: newWidth,
                        windowCenter: newCenter
                    }
                });
                viewport.render();
            });
        } catch (error) {
            console.error("Failed to apply windowing/leveling adjustments:", error);
        }
    }

    clearMeasurements() {
        try {
            cornerstoneTools.annotation.state.removeAllAnnotations();
            if (this.renderingEngine) {
                this.renderingEngine.render();
            }
        } catch (error) {
            console.error("Failed to clear caliper measurements:", error);
        }
    }

    setViewportSlice(viewportId, index) {
        if (!this.renderingEngine) return;
        const viewport = this.renderingEngine.getViewport(viewportId);
        if (!viewport) return;

        try {
            if (viewport.type === cornerstone.Enums.ViewportType.STACK) {
                viewport.setImageIdIndex(index);
            } else if (viewport.type === cornerstone.Enums.ViewportType.ORTHOGRAPHIC) {
                cornerstoneTools.utilities.jumpToSlice(viewport.element, { imageIndex: index });
            }
        } catch (e) {
            console.error(`Failed to set slice index on viewport ${viewportId}:`, e);
        }
    }

    cleanupViewports() {
        // Step 1: Remove Viewports from ToolGroups first
        if (this.toolGroup) {
            try {
                if (this.renderingEngine) {
                    const viewports = this.renderingEngine.getViewports();
                    viewports.forEach(viewport => {
                        try {
                            if (viewport.id !== '3d') {
                                this.toolGroup.removeViewport(viewport.id, this.renderingEngine.id);
                            }
                        } catch (err) {}
                    });
                }
                cornerstoneTools.ToolGroupManager.destroyToolGroup(this.toolGroupId);
            } catch (e) {
                console.error("Error during tool group destruction:", e);
            }
            this.toolGroup = null;
            this.toolGroupId = null;
        }

        if (this.toolGroup3D) {
            try {
                if (this.renderingEngine) {
                    try {
                        this.toolGroup3D.removeViewport('3d', this.renderingEngine.id);
                    } catch (err) {}
                }
                cornerstoneTools.ToolGroupManager.destroyToolGroup(this.toolGroup3DId);
            } catch (e) {
                console.error("Error during 3D tool group destruction:", e);
            }
            this.toolGroup3D = null;
            this.toolGroup3DId = null;
        }

        // Step 2: Safely destroy RenderingEngine and release WebGL GPU memory
        if (this.renderingEngine) {
            try {
                const viewports = this.renderingEngine.getViewports();
                viewports.forEach(vp => {
                    try {
                        if (vp && vp.element && vp.canvas && vp.element.contains(vp.canvas)) {
                            vp.element.removeChild(vp.canvas);
                        }
                    } catch (err) {}
                });
                this.renderingEngine.destroy();
            } catch (e) {
                console.warn("RenderingEngine cleanup exception:", e);
            }
            this.renderingEngine = null;
        }
    }

    destroy() {
        this.cleanupViewports();
    }
}
