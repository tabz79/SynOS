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

        // Preload/cache metadata for all images in parallel
        // WadoURI loader will parse DICOM headers and cache metadata automatically
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
        if (this.layout === layout) return;
        this.layout = layout;
        await this.updateLayout();
    }

    async updateLayout() {
        if (!this.imageIds || this.imageIds.length === 0) return;

        // Clean up current viewports and engine to prevent context leaks
        this.cleanupViewports();

        // Query grid viewport containers rendered by React
        let elements = this.container.querySelectorAll('.viewport-element');
        if (elements.length === 0) {
            // Fallback: if React has not updated DOM yet, wait a frame and retry
            await new Promise(resolve => setTimeout(resolve, 50));
            elements = this.container.querySelectorAll('.viewport-element');
            if (elements.length === 0) {
                // If still not found, use container itself as a fallback
                elements = [this.container];
            }
        }

        const renderingEngineId = `SynosRenderingEngine_${Date.now()}`;
        this.renderingEngine = new cornerstone.RenderingEngine(renderingEngineId);

        const viewportInputs = [];
        const isMPR = this.layout === 'MPR';

        if (isMPR) {
            // MPR Viewport Configuration
            const volumeId = `cornerstoneStreamingImageVolume:volume_${Date.now()}`;
            const volume = await cornerstone.volumeLoader.createAndCacheVolume(volumeId, {
                imageIds: this.imageIds
            });
            volume.load();

            const axialEl = this.container.querySelector('#synos-viewport-axial') || elements[0];
            const sagittalEl = this.container.querySelector('#synos-viewport-sagittal') || elements[1];
            const coronalEl = this.container.querySelector('#synos-viewport-coronal') || elements[2];
            const volume3dEl = this.container.querySelector('#synos-viewport-3d') || elements[3];

            viewportInputs.push(
                {
                    viewportId: 'axial',
                    type: cornerstone.Enums.ViewportType.ORTHOGRAPHIC,
                    element: axialEl,
                    defaultOptions: {
                        orientation: cornerstone.Enums.OrientationAxis.AXIAL,
                        background: [0, 0, 0]
                    }
                },
                {
                    viewportId: 'sagittal',
                    type: cornerstone.Enums.ViewportType.ORTHOGRAPHIC,
                    element: sagittalEl,
                    defaultOptions: {
                        orientation: cornerstone.Enums.OrientationAxis.SAGITTAL,
                        background: [0, 0, 0]
                    }
                },
                {
                    viewportId: 'coronal',
                    type: cornerstone.Enums.ViewportType.ORTHOGRAPHIC,
                    element: coronalEl,
                    defaultOptions: {
                        orientation: cornerstone.Enums.OrientationAxis.CORONAL,
                        background: [0, 0, 0]
                    }
                }
            );

            if (volume3dEl) {
                viewportInputs.push({
                    viewportId: '3d',
                    type: cornerstone.Enums.ViewportType.VOLUME_3D,
                    element: volume3dEl,
                    defaultOptions: {
                        orientation: cornerstone.Enums.OrientationAxis.CORONAL,
                        background: [0, 0, 0]
                    }
                });
            }

            this.renderingEngine.setViewports(viewportInputs);

            this.volumeId = volumeId;
            // Set volumes on each volume viewport
            for (const vInput of viewportInputs) {
                const viewport = this.renderingEngine.getViewport(vInput.viewportId);
                await viewport.setVolumes([{ volumeId }]);
                
                if (vInput.viewportId === '3d') {
                    try {
                        viewport.setProperties({ preset: 'CT-Bone' });
                    } catch (e) {
                        console.warn("Could not set volume rendering preset:", e);
                    }
                }
                
                viewport.resetCamera();
                
                const element = vInput.element;
                const vId = vInput.viewportId;
                if (element && vId !== '3d') {
                    element.addEventListener(cornerstone.Enums.Events.CAMERA_MODIFIED, () => {
                        try {
                            const currentIndex = viewport.getCurrentImageIdIndex();
                            let numSlices = this.imageIds.length;
                            
                            const sliceRangeInfo = cornerstone.utilities.getVolumeSliceRangeInfo(viewport, volumeId);
                            if (sliceRangeInfo && sliceRangeInfo.sliceRange) {
                                numSlices = sliceRangeInfo.sliceRange.max - sliceRangeInfo.sliceRange.min + 1;
                            }
                            
                            if (this.onViewportSliceChange) {
                                this.onViewportSliceChange(vId, currentIndex, numSlices);
                            }
                        } catch (err) {
                            console.warn("Failed to update slice details:", err);
                        }
                    });
                    
                    // Initialize state
                    setTimeout(() => {
                        try {
                            const currentIndex = viewport.getCurrentImageIdIndex();
                            let numSlices = this.imageIds.length;
                            const sliceRangeInfo = cornerstone.utilities.getVolumeSliceRangeInfo(viewport, volumeId);
                            if (sliceRangeInfo && sliceRangeInfo.sliceRange) {
                                numSlices = sliceRangeInfo.sliceRange.max - sliceRangeInfo.sliceRange.min + 1;
                            }
                            if (this.onViewportSliceChange) {
                                this.onViewportSliceChange(vId, currentIndex, numSlices);
                            }
                        } catch (e) {}
                    }, 500);
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
            'Length', 'Angle', 'RectangleROI', 'EllipticalROI'
        ];
        if (isMPR) {
            tools.push('Crosshairs');
            tools.push('SlabScrollMouseWheel');
        } else {
            tools.push('StackScrollMouseWheel');
        }
        tools.forEach(tName => this.toolGroup.addTool(tName));

        // Assign viewports to tool group (except 3D)
        viewportInputs.forEach(v => {
            if (v.viewportId !== '3d') {
                this.toolGroup.addViewport(v.viewportId, this.renderingEngine.id);
            }
        });

        // Configure 3D tool group if we have a 3D viewport
        const has3D = viewportInputs.some(v => v.viewportId === '3d');
        if (has3D) {
            const toolGroup3DId = `toolGroup3D_${Date.now()}`;
            this.toolGroup3DId = toolGroup3DId;
            this.toolGroup3D = cornerstoneTools.ToolGroupManager.createToolGroup(toolGroup3DId);
            
            const tools3D = ['TrackballRotate', 'Pan', 'Zoom'];
            tools3D.forEach(tName => this.toolGroup3D.addTool(tName));
            
            this.toolGroup3D.addViewport('3d', this.renderingEngine.id);
            
            const MouseBindings = cornerstoneTools.Enums.MouseBindings;
            
            // Set TrackballRotate active on left mouse drag
            this.toolGroup3D.setToolActive('TrackballRotate', {
                bindings: [{ mouseButton: MouseBindings.Primary }]
            });
            // Set Pan active on middle mouse drag
            this.toolGroup3D.setToolActive('Pan', {
                bindings: [{ mouseButton: MouseBindings.Secondary }]
            });
            // Set Zoom active on right mouse drag
            this.toolGroup3D.setToolActive('Zoom', {
                bindings: [{ mouseButton: MouseBindings.Auxiliary }]
            });
        }

        // Activate tools
        this.setToolActive(this.activeToolName);
        if (isMPR) {
            this.toolGroup.setToolConfiguration('SlabScrollMouseWheel', {
                invert: true
            });
            this.toolGroup.setToolActive('SlabScrollMouseWheel');
        } else {
            this.toolGroup.setToolActive('StackScrollMouseWheel');
        }

        this.renderingEngine.render();
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
                this.renderingEngine.resize();
            } catch (error) {
                console.error("Failed to resize Cornerstone3D rendering engine:", error);
            }
        }
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

        if (this.renderingEngine) {
            try {
                this.renderingEngine.destroy();
            } catch (e) {
                console.error("Error during rendering engine destruction:", e);
            }
            this.renderingEngine = null;
        }
    }

    destroy() {
        this.cleanupViewports();
    }
}
