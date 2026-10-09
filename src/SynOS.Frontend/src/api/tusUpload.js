import * as tus from 'tus-js-client';

/**
 * Resumable Chunked DICOM Upload using the tus protocol.
 * Specifically configured with 10MB chunking to comfortably bypass Cloudflare Tunnel's
 * 100MB HTTP request body limit (HTTP 413) on free/pro tiers.
 * 
 * @param {File} file - The DICOM file or .zip archive to upload
 * @param {string} radiologyStudyId - Target study GUID to associate with
 * @param {Object} callbacks - { onProgress(bytesSent, bytesTotal, percentage), onSuccess(), onError(error) }
 * @returns {tus.Upload} The active upload instance with .start() and .abort() controls
 */
export function uploadDicomTus(file, radiologyStudyId, { onProgress, onSuccess, onError }) {
    const token = localStorage.getItem('synos_jwt') || '';

    const upload = new tus.Upload(file, {
        endpoint: '/api/v1/radiology/pacs/upload-tus',
        // 10 MB chunks strictly stay under Cloudflare's 100MB proxy boundary
        chunkSize: 10 * 1024 * 1024,
        retryDelays: [0, 2000, 5000, 10000, 20000],
        headers: {
            'Authorization': token ? `Bearer ${token}` : ''
        },
        metadata: {
            radiologyStudyId: String(radiologyStudyId),
            filename: file.name,
            filetype: file.type || (file.name.endsWith('.zip') ? 'application/zip' : 'application/dicom')
        },
        onError: (error) => {
            console.error('[Tus Upload Error]:', error);
            if (onError) onError(error);
        },
        onProgress: (bytesSent, bytesTotal) => {
            const percentage = Math.round((bytesSent / bytesTotal) * 100);
            if (onProgress) {
                onProgress(bytesSent, bytesTotal, percentage);
            }
        },
        onSuccess: () => {
            if (onSuccess) onSuccess();
        }
    });

    upload.start();
    return upload;
}
