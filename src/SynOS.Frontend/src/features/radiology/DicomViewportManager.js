import { cornerstone, cornerstoneTools, cornerstoneWADOImageLoader } from './cornerstoneSetup';

export class DicomViewportManager {
    constructor(element, modality) {
        this.element = element;
        this.modality = modality || 'X-Ray';
        
        // Cache loaded imageIds
        this.imageIds = [];
        this.currentSliceIndex = 0;

        this.init();
    }

    init() {
        try {
            // Enable the element in Cornerstone (mounts canvas wrapper dynamically inside the div)
            cornerstone.enable(this.element);

            // Add standard stack state manager for stack scrolling
            cornerstoneTools.addStackStateManager(this.element, ['stack']);

            // Configure standard medical workstation tools
            this.setupTools();
        } catch (error) {
            console.error("Failed to initialize Cornerstone viewport element:", error);
        }
    }

    setupTools() {
        const element = this.element;

        // Add tools to Cornerstone element
        cornerstoneTools.addToolForElement(element, cornerstoneTools.WwwcTool);
        cornerstoneTools.addToolForElement(element, cornerstoneTools.LengthTool);
        cornerstoneTools.addToolForElement(element, cornerstoneTools.PanTool);
        cornerstoneTools.addToolForElement(element, cornerstoneTools.ZoomTool);
        cornerstoneTools.addToolForElement(element, cornerstoneTools.ZoomMouseWheelTool);

        // Set default active tools
        cornerstoneTools.setToolActiveForElement(element, 'Wwwc', { mouseButtonMask: 1 }); // Left click drag adjusts window/level (contrast/brightness)
        cornerstoneTools.setToolActiveForElement(element, 'Pan', { mouseButtonMask: 2 });  // Right click drag pans
        cornerstoneTools.setToolActiveForElement(element, 'Zoom', { mouseButtonMask: 4 }); // Middle click drag zooms
        cornerstoneTools.setToolActiveForElement(element, 'ZoomMouseWheel', {});            // Scroll wheel zooms in/out
    }

    setToolActive(toolName) {
        const element = this.element;
        // Helper to switch active left-mouse action (e.g. switch between Windowing and Calipers)
        const tools = ['Wwwc', 'Length', 'Pan', 'Zoom'];
        tools.forEach(t => {
            if (t === toolName) {
                cornerstoneTools.setToolActiveForElement(element, t, { mouseButtonMask: 1 });
            } else {
                cornerstoneTools.setToolPassiveForElement(element, t);
            }
        });
    }

    async setImages(urls) {
        if (!urls || urls.length === 0) return;

        // Map relative public URLs to standard WADO-URI loader scheme
        this.imageIds = urls.map(url => {
            // cornerstone-wado-image-loader expects WADO-URI protocol: 'wadouri:' + url
            return url.startsWith('http') ? `wadouri:${url}` : `wadouri:${window.location.origin}${url}`;
        });

        this.currentSliceIndex = 0;

        // Setup image stack tool state
        const stackState = {
            currentImageIdIndex: 0,
            imageIds: this.imageIds
        };
        cornerstoneTools.clearToolState(this.element, 'stack');
        cornerstoneTools.addToolState(this.element, 'stack', stackState);

        await this.setActiveSlice(0);
    }

    async setActiveSlice(index) {
        if (index < 0 || index >= this.imageIds.length) return;
        this.currentSliceIndex = index;

        const imageId = this.imageIds[index];
        const element = this.element;

        try {
            // Load and cache the DICOM image from the static/WADO server
            const image = await cornerstone.loadAndCacheImage(imageId);
            
            // Display the DICOM image inside the real viewport canvas
            cornerstone.displayImage(element, image);

            // Re-center and fit the image to the current viewport dimensions
            cornerstone.resize(element, true);

            // Capture defaults if not captured yet
            this.defaultWindowCenter = image.windowCenter;
            this.defaultWindowWidth = image.windowWidth;

            // Synchronize active stack state index
            const stackData = cornerstoneTools.getToolState(element, 'stack');
            if (stackData && stackData.data && stackData.data.length > 0) {
                stackData.data[0].currentImageIdIndex = index;
            }
        } catch (error) {
            console.error(`Failed to load DICOM slice index ${index} (${imageId}):`, error);
        }
    }

    resize() {
        try {
            cornerstone.resize(this.element, true);
        } catch (error) {
            console.error("Failed to resize Cornerstone viewport element:", error);
        }
    }

    setFilters(brightness, contrast) {
        try {
            // Brightness and Contrast map relatively to Window Center (Level) and Window Width (Window)
            const viewport = cornerstone.getViewport(this.element);
            if (viewport && this.defaultWindowWidth && this.defaultWindowCenter) {
                viewport.voi.windowCenter = this.defaultWindowCenter * (brightness / 100);
                viewport.voi.windowWidth = this.defaultWindowWidth * (contrast / 100);
                cornerstone.setViewport(this.element, viewport);
            }
        } catch (error) {
            console.error("Failed to apply windowing/leveling adjustments:", error);
        }
    }

    clearMeasurements() {
        try {
            // Clears drawn length calipers safely from the tool state manager
            cornerstoneTools.clearToolState(this.element, 'Length');
            cornerstone.updateImage(this.element);
        } catch (error) {
            console.error("Failed to clear caliper measurements:", error);
        }
    }

    destroy() {
        try {
            const element = this.element;

            // 1. Evict only this study's imageIds from Cornerstone cache to prevent memory bloating
            this.imageIds.forEach(id => {
                try {
                    cornerstone.imageCache.removeImageLoadObject(id);
                } catch (e) {
                    // Fail silently on single eviction anomalies
                }
            });

            // 2. Unbind all active tools from this viewport element
            const loadedTools = ['Wwwc', 'Length', 'Pan', 'Zoom', 'ZoomMouseWheel'];
            loadedTools.forEach(tool => {
                try {
                    cornerstoneTools.removeToolForElement(element, tool);
                } catch (e) {}
            });

            // 3. Disable element and unmount cornerstone canvas from the DOM wrapper
            cornerstone.disable(element);
        } catch (error) {
            console.error("Error encountered during viewport memory lifecycle cleanup:", error);
        }
    }
}
