/**
 * =========================================================================================
 * SYNOS ENTERPRISE REPORT ENGINE - HIGH-PERFORMANCE TEMPLATE RESOLUTION HOOKS
 * =========================================================================================
 * ARCHITECTURAL LATENCY CONTRACT:
 * 1. ZERO-WAIT SYNCHRONOUS RESOLUTION:
 *    - `useTemplateForReport` MUST resolve templates synchronously in memory in 0ms.
 *    - NEVER block live preview rendering on heavy network calls like AdminApi.getTests().
 * 2. BACKGROUND PRE-WARMING:
 *    - Backend templates from ReportsApi.getTemplates() are pre-warmed once into memory.
 *    - Fallbacks from DEFAULT_TEMPLATES guarantee instant render with zero UI flicker.
 * =========================================================================================
 */

import { useState, useEffect } from 'react';
import { ReportsApi } from '../../../../api/reports';
import { AdminApi } from '../../../../api/admin';
import { DEFAULT_TEMPLATES, sanitizeTemplates } from '../defaultTemplates';
import { mapBackendDslToTemplate } from '../ReportTemplateService';

let cachedMappedTemplates = null;
let cachedFetchPromise = null;
let cachedTestsPromise = null;

const fallbackTemplates = sanitizeTemplates(DEFAULT_TEMPLATES);

function mapTemplates(list) {
  if (!Array.isArray(list)) return [];
  return list.map(item => {
    let dsl = item.templateDsl;
    if (!dsl && item.templateJson) {
      try {
        dsl = typeof item.templateJson === 'string' ? JSON.parse(item.templateJson) : item.templateJson;
      } catch (e) {
        console.error("Failed to parse templateJson", e);
      }
    }
    return mapBackendDslToTemplate(dsl, item.templateId || item.id, item.isDefault, item.isPublished);
  });
}

/**
 * Pre-warms template cache from backend in background on application start.
 */
export function prewarmTemplates() {
  if (cachedMappedTemplates || cachedFetchPromise) return cachedFetchPromise;
  cachedFetchPromise = ReportsApi.getTemplates()
    .then(list => {
      if (Array.isArray(list) && list.length > 0) {
        cachedMappedTemplates = mapTemplates(list);
      }
      cachedFetchPromise = null;
      return cachedMappedTemplates;
    })
    .catch(err => {
      console.warn("Background template prewarm note:", err);
      cachedFetchPromise = null;
    });
  return cachedFetchPromise;
}

// Kick off background pre-warming immediately
prewarmTemplates();

export function fetchTemplatesCached() {
  if (cachedMappedTemplates) return Promise.resolve(cachedMappedTemplates);
  if (cachedFetchPromise) return cachedFetchPromise;
  return prewarmTemplates();
}

export function fetchTestsCached() {
  if (!cachedTestsPromise) {
    cachedTestsPromise = AdminApi.getTests().catch(err => {
      cachedTestsPromise = null;
      throw err;
    });
  }
  return cachedTestsPromise;
}

export function clearTemplateCaches() {
  cachedMappedTemplates = null;
  cachedFetchPromise = null;
  cachedTestsPromise = null;
  ReportsApi._clearCache?.();
}

/**
 * Synchronously resolves the active template in < 1ms from in-memory pool.
 */
export function resolveTemplateSync(modality, reportTemplateId) {
  const pool = (cachedMappedTemplates && cachedMappedTemplates.length > 0)
    ? cachedMappedTemplates
    : fallbackTemplates;

  // 1. Exact ID Match (Primary fast path)
  if (reportTemplateId) {
    const foundById = pool.find(t => t.id === reportTemplateId);
    if (foundById) return foundById;
  }

  // 2. Modality Default Match
  const normModality = (modality || "").toLowerCase().trim();
  const isRad = normModality.includes("rad") || normModality.includes("x-ray") || normModality.includes("xray") || normModality.includes("mri") || normModality.includes("ct") || normModality.includes("us") || normModality.includes("ultra");
  const targetModality = isRad ? "radiology" : "pathology";

  const foundModalityDefault = pool.find(t => t.isDefault && (t.modality || "").toLowerCase().trim() === targetModality);
  if (foundModalityDefault) return foundModalityDefault;

  // 3. Any Modality Match
  const foundAnyModality = pool.find(t => (t.modality || "").toLowerCase().trim() === targetModality);
  if (foundAnyModality) return foundAnyModality;

  // 4. Global System Default
  const foundGlobalDefault = pool.find(t => t.isDefault);
  if (foundGlobalDefault) return foundGlobalDefault;

  // 5. Ultimate Fallback
  return pool[0] || fallbackTemplates[0];
}

/**
 * High-performance React hook for instant, sub-millisecond template resolution.
 */
export function useTemplateForReport(reportData) {
  const modality = reportData?.modality || reportData?.Modality;
  const reportTemplateId = reportData?.reportTemplateId || reportData?.ReportTemplateId || reportData?.templateId || reportData?.TemplateId;

  // 1. Instant Synchronous Evaluation: 0 milliseconds
  const syncTemplate = modality ? resolveTemplateSync(modality, reportTemplateId) : null;
  const [template, setTemplate] = useState(syncTemplate);

  // 2. Update synchronously whenever reportData or modality changes
  useEffect(() => {
    if (modality) {
      const resolved = resolveTemplateSync(modality, reportTemplateId);
      setTemplate(resolved);
    }
  }, [modality, reportTemplateId]);

  // 3. In the event background pre-warm completes, silently upgrade template in-place
  useEffect(() => {
    if (!cachedMappedTemplates && !cachedFetchPromise) {
      prewarmTemplates();
    }
    if (cachedFetchPromise) {
      cachedFetchPromise.then(() => {
        if (modality) {
          setTemplate(resolveTemplateSync(modality, reportTemplateId));
        }
      });
    }
  }, [modality, reportTemplateId]);

  // Guaranteed immediate return with loading: false
  return { 
    template: template || syncTemplate, 
    loading: false 
  };
}

/**
 * React hook to fetch all templates and expose mutation methods for management screens.
 */
export function useTemplatesList() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const list = await ReportsApi.getTemplates();
      const mapped = mapTemplates(list);
      cachedMappedTemplates = mapped;
      setTemplates(mapped);
    } catch (e) {
      console.error("Failed to load templates list", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  return { templates, setTemplates, loading, refresh: fetchAll };
}
