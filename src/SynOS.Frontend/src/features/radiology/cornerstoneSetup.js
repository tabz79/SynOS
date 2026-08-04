// Polyfill SharedArrayBuffer if not supported/enabled by browser security context
if (typeof window !== 'undefined' && !window.SharedArrayBuffer) {
  window.SharedArrayBuffer = ArrayBuffer;
}

import * as cornerstone from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import { cornerstoneStreamingImageVolumeLoader } from '@cornerstonejs/streaming-image-volume-loader';
import dicomParser from 'dicom-parser';

// Register low-level parser and core dependencies
cornerstoneDICOMImageLoader.external.cornerstone = cornerstone;
cornerstoneDICOMImageLoader.external.dicomParser = dicomParser;

// Register Cornerstone3D streaming volume loader
cornerstone.volumeLoader.registerVolumeLoader(
  'cornerstoneStreamingImageVolume',
  cornerstoneStreamingImageVolumeLoader
);

// Configure beforeSend HTTP headers to include JWT token for DICOM streaming
cornerstoneDICOMImageLoader.configure({
  beforeSend: function(xhr) {
    const token = localStorage.getItem('synos_jwt');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
  }
});

// Configure WADO loader Web Workers for high-performance multithreaded decoding
cornerstoneDICOMImageLoader.webWorkerManager.initialize({
  maxWebWorkers: Math.min(navigator.hardwareConcurrency || 4, 4),
  startWebWorkersOnDemand: true,
  taskConfiguration: {
    decodeTask: {
      initializeCodecsOnStartup: false,
      usePDFJS: false,
      strict: false,
    },
  },
});

let initPromise = null;

export async function initCornerstone() {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    await cornerstone.init();
    cornerstoneTools.init();
  })();
  
  return initPromise;
}

export { cornerstone, cornerstoneTools, cornerstoneDICOMImageLoader };
