import cornerstone from 'cornerstone-core';
import dicomParser from 'dicom-parser';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import cornerstoneTools from 'cornerstone-tools';
import Hammer from 'hammerjs';
import * as cornerstoneMath from 'cornerstone-math';

// Register global Hammer for tool gestural handlers
window.Hammer = Hammer;

// Register low-level DICOM parsing and core libraries with WADO loader
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

// Wire cornerstone reference inside tool orchestration suite
cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.Hammer = Hammer;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
cornerstoneTools.init();

export { cornerstone, cornerstoneTools, cornerstoneWADOImageLoader };
