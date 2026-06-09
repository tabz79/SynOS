import { useState, useEffect } from 'react';
import { ReportsApi } from '../../../../api/reports';
import { DEFAULT_TEMPLATES, sanitizeTemplates } from '../defaultTemplates';
import { mapBackendDslToTemplate } from '../ReportTemplateService';

// React hook to fetch and resolve the active template for a given report
export function useTemplateForReport(reportData) {
  const modality = reportData?.modality || reportData?.Modality;
  const testCode = reportData?.metadata?.testCode || reportData?.metadata?.TestCode || reportData?.testCode || reportData?.TestCode;
  const reportTemplateId = reportData?.reportTemplateId || reportData?.ReportTemplateId || reportData?.templateId || reportData?.TemplateId;

  // Resolve active template synchronously from cache / localStorage to prevent layout flash
  const [template, setTemplate] = useState(() => {
    if (!modality) return null;
    
    // Resolve list from localStorage or DEFAULT_TEMPLATES
    let mappedList = [];
    const saved = localStorage.getItem("synos_report_templates");
    if (saved) {
      try {
        mappedList = JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    if (!mappedList || mappedList.length === 0) {
      mappedList = sanitizeTemplates(DEFAULT_TEMPLATES);
    }

    let found = null;
    
    // 1. Check if report specifies a ReportTemplateId directly from backend
    if (reportTemplateId) {
      found = mappedList.find(t => t.id === reportTemplateId);
    }

    // 2. Check local catalog settings override
    if (!found) {
      const savedCatalog = localStorage.getItem("synos_test_catalog");
      let catalog = [];
      if (savedCatalog) {
        try {
          catalog = JSON.parse(savedCatalog);
        } catch (e) {
          console.error(e);
        }
      }
      const test = catalog.find(t => t.code === testCode);
      if (test && test.templateId) {
        found = mappedList.find(t => t.id === test.templateId);
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
      return localTemplates.find(t => {
        const modalityName = (t.modality || "").toLowerCase().trim();
        return modalityName && (dept.includes(modalityName) || modalityName.includes(dept));
      }) || localTemplates[0];
    }

    return found;
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!modality) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function load() {
      try {
        const list = await ReportsApi.getTemplates();
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

        // Save fresh templates list to localStorage cache
        localStorage.setItem("synos_report_templates", JSON.stringify(mappedList));

        // Resolve active template
        let found = null;
        
        // 1. Check if report specifies a ReportTemplateId directly from backend
        if (reportTemplateId) {
          found = mappedList.find(t => t.id === reportTemplateId);
        }

        // 2. Check local catalog settings override
        if (!found) {
          const savedCatalog = localStorage.getItem("synos_test_catalog");
          let catalog = [];
          if (savedCatalog) {
            try {
              catalog = JSON.parse(savedCatalog);
            } catch (e) {
              console.error(e);
            }
          }
          const test = catalog.find(t => t.code === testCode);
          if (test && test.templateId) {
            found = mappedList.find(t => t.id === test.templateId);
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

        setTemplate(found);
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
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem("synos_report_templates");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });
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
      localStorage.setItem("synos_report_templates", JSON.stringify(mapped));
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
