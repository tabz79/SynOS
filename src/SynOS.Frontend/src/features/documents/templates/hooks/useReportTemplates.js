import { useState, useEffect } from 'react';
import { ReportsApi } from '../../../../api/reports';
import { AdminApi } from '../../../../api/admin';
import { DEFAULT_TEMPLATES, sanitizeTemplates } from '../defaultTemplates';
import { mapBackendDslToTemplate } from '../ReportTemplateService';

let cachedTemplatesPromise = null;
let cachedTestsPromise = null;

export function fetchTemplatesCached() {
  if (!cachedTemplatesPromise) {
    cachedTemplatesPromise = ReportsApi.getTemplates().catch(err => {
      cachedTemplatesPromise = null;
      throw err;
    });
  }
  return cachedTemplatesPromise;
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
  cachedTemplatesPromise = null;
  cachedTestsPromise = null;
}

// React hook to fetch and resolve the active template for a given report
export function useTemplateForReport(reportData) {
  const modality = reportData?.modality || reportData?.Modality;
  const testCode = reportData?.metadata?.testCode || reportData?.metadata?.TestCode || reportData?.testCode || reportData?.TestCode;
  const reportTemplateId = reportData?.reportTemplateId || reportData?.ReportTemplateId || reportData?.templateId || reportData?.TemplateId;

  // Resolve active template synchronously from default fallback list initially to prevent layout flash
  const [template, setTemplate] = useState(() => {
    if (!modality) return null;
    
    const mappedList = sanitizeTemplates(DEFAULT_TEMPLATES);
    let found = null;
    
    // 1. Check if report specifies a ReportTemplateId directly from backend
    if (reportTemplateId) {
      found = mappedList.find(t => t.id === reportTemplateId);
    }

    // 2. Default template for modality
    if (!found) {
      const normModality = (modality || "").toLowerCase().trim();
      const isRad = normModality.includes("rad");
      const targetModality = isRad ? "radiology" : "pathology";
      found = mappedList.find(t => t.isDefault && (t.modality || "").toLowerCase().trim() === targetModality);
    }

    // 3. Default template globally
    if (!found) {
      found = mappedList.find(t => t.isDefault);
    }

    // 4. First template in list
    if (!found) {
      found = mappedList[0];
    }

    // 5. Default fallback
    if (!found) {
      const dept = modality.toLowerCase().trim();
      const localTemplates = sanitizeTemplates(DEFAULT_TEMPLATES);
      return localTemplates.find(t => {
        const modalityName = (t.modality || "").toLowerCase().trim();
        return modalityName && (dept.includes(modalityName) || modalityName.includes(dept));
      }) || localTemplates[0];
    }

    return found;
  });

  const [loading, setLoading] = useState(() => !template);

  useEffect(() => {
    if (!modality) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function load() {
      try {
        const list = await fetchTemplatesCached();
        if (!isMounted) return;

        // Map DTOs to visual templates
        const mappedList = list.map(item => {
          let dsl = item.templateDsl;
          if (!dsl && item.templateJson) {
            try {
              dsl = JSON.parse(item.templateJson);
            } catch (e) {
              console.error(e);
            }
          }
          return mapBackendDslToTemplate(dsl, item.templateId, item.isDefault, item.isPublished);
        });

        // Resolve active template
        let found = null;
        
        // 1. Check if report specifies a ReportTemplateId directly from backend
        if (reportTemplateId) {
          found = mappedList.find(t => t.id === reportTemplateId);
        }

        // 2. Check catalog settings override directly from API to avoid localStorage
        if (!found && testCode) {
          try {
            const catalog = await fetchTestsCached();
            const test = catalog.find(t => (t.testCode || t.TestCode || t.code || "").toUpperCase() === (testCode || "").toUpperCase());
            const templateId = test?.reportTemplateId || test?.ReportTemplateId || test?.templateId;
            if (templateId) {
              found = mappedList.find(t => t.id === templateId);
            }
          } catch (catalogErr) {
            console.error("Failed to load catalog for template resolution", catalogErr);
          }
        }

        // 3. Default template for modality
        if (!found) {
          const normModality = (modality || "").toLowerCase().trim();
          const isRad = normModality.includes("rad");
          const targetModality = isRad ? "radiology" : "pathology";
          found = mappedList.find(t => t.isDefault && (t.modality || "").toLowerCase().trim() === targetModality);
        }

        // 4. Default template globally
        if (!found) {
          found = mappedList.find(t => t.isDefault);
        }

        // 5. First template in list
        if (!found) {
          found = mappedList[0];
        }

        // 6. Default fallback
        if (!found) {
          const dept = modality.toLowerCase().trim();
          const localTemplates = sanitizeTemplates(DEFAULT_TEMPLATES);
          found = localTemplates.find(t => {
            const modalityName = (t.modality || "").toLowerCase().trim();
            return modalityName && (dept.includes(modalityName) || modalityName.includes(dept));
          }) || localTemplates[0];
        }

        if (isMounted && found) {
          setTemplate(found);
        }
      } catch (err) {
        console.error("Failed to load active template from backend, using local fallback", err);
        if (!isMounted) return;
        const dept = modality.toLowerCase().trim();
        const localTemplates = sanitizeTemplates(DEFAULT_TEMPLATES);
        const fallback = localTemplates.find(t => {
          const modalityName = (t.modality || "").toLowerCase().trim();
          return modalityName && (dept.includes(modalityName) || modalityName.includes(dept));
        }) || localTemplates[0];
        setTemplate(fallback);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => { isMounted = false; };
  }, [modality, testCode, reportTemplateId]);

  return { template, loading };
}

// React hook to fetch all templates and expose mutation methods
export function useTemplatesList() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const list = await ReportsApi.getTemplates();
      const mapped = list.map(item => {
        let dsl = item.templateDsl;
        if (!dsl && item.templateJson) {
          try {
            dsl = JSON.parse(item.templateJson);
          } catch (e) {
            console.error(e);
          }
        }
        return mapBackendDslToTemplate(dsl, item.templateId, item.isDefault, item.isPublished);
      });
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
