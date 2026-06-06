import { useState, useEffect } from 'react';
import { ReportsApi } from '../../../../api/reports';
import { DEFAULT_TEMPLATES, sanitizeTemplates } from '../defaultTemplates';
import { mapBackendDslToTemplate } from '../ReportTemplateService';

// React hook to fetch and resolve the active template for a given report
export function useTemplateForReport(reportData) {
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  const modality = reportData?.modality;
  const testCode = reportData?.metadata?.testCode || reportData?.testCode;

  useEffect(() => {
    if (!modality) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function load() {
      try {
        const list = await ReportsApi.getTemplates(modality);
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
        // 1. Check local catalog settings override
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
        let found = null;
        if (test && test.templateId) {
          found = mappedList.find(t => t.id === test.templateId);
        }

        // 2. Default template
        if (!found) {
          found = mappedList.find(t => t.isDefault);
        }

        // 3. First template in list
        if (!found) {
          found = mappedList[0];
        }

        // 4. Default fallback
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
  }, [modality, testCode]);

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
