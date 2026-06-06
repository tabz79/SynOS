import { DEFAULT_TEMPLATES, sanitizeTemplates } from './defaultTemplates';

// Map frontend flat template to backend TemplateModel JSON string
export const mapTemplateToBackendDsl = (t) => {
  return JSON.stringify({
    meta: {
      name: t.title || t.name || "",
      modality: t.modality || "",
      layout: t.density || "",
      pageSize: "A4",
      orientation: "Portrait"
    },
    sections: [
      {
        type: "Header",
        config: {
          Title: t.brandNameText || t.clinicName || "Report",
          ShowLogo: t.includeBranding !== false && t.includeLogo !== false,
          id: t.id,
          title: t.title,
          density: t.density,
          usePreprinted: t.usePreprinted,
          topMargin: t.topMargin,
          leftRightMargin: t.leftRightMargin,
          includeBranding: t.includeBranding,
          includeLogo: t.includeLogo,
          includeHeaderName: t.includeHeaderName,
          includeHeaderSubtitle: t.includeHeaderSubtitle,
          clinicName: t.clinicName,
          themeColor: t.themeColor,
          logoUrl: t.logoUrl,
          logoPosition: t.logoPosition,
          logoLayout: t.logoLayout,
          logoSize: t.logoSize,
          brandNameText: t.brandNameText,
          brandNameSize: t.brandNameSize,
          brandNameWeight: t.brandNameWeight,
          brandNameColor: t.brandNameColor,
          brandSubtitleText: t.brandSubtitleText,
          brandSubtitleSize: t.brandSubtitleSize,
          brandSubtitleColor: t.brandSubtitleColor,
          showHeaderDivider: t.showHeaderDivider,
          headerDividerThickness: t.headerDividerThickness,
          headerDividerStyle: t.headerDividerStyle,
          headerDividerColor: t.headerDividerColor,
          bgType: t.bgType,
          bgColor: t.bgColor,
          bgGradientStart: t.bgGradientStart,
          bgGradientEnd: t.bgGradientEnd,
          bgGradientAngle: t.bgGradientAngle,
          backgroundPath: t.backgroundPath,
          bgImageOpacity: t.bgImageOpacity,
          borderWidth: t.borderWidth,
          borderColor: t.borderColor,
          borderStyle: t.borderStyle,
          borderRadius: t.borderRadius,
          pagePadding: t.pagePadding
        }
      },
      {
        type: "PatientInfo",
        config: {
          ShowPatientName: true,
          ShowPatientId: true,
          ShowDateOfBirth: true,
          ShowGender: true,
          ShowContactInfo: true,
          enableAbsolutePositioning: t.enableAbsolutePositioning,
          patientBlockY: t.patientBlockY,
          patientNameX: t.patientNameX,
          patientNameY: t.patientNameY,
          patientAgeSexX: t.patientAgeSexX,
          patientAgeSexY: t.patientAgeSexY,
          refDoctorX: t.refDoctorX,
          refDoctorY: t.refDoctorY,
          patientIdX: t.patientIdX,
          patientIdY: t.patientIdY,
          billingDateX: t.billingDateX,
          billingDateY: t.billingDateY,
          reportDateX: t.reportDateX,
          reportDateY: t.reportDateY
        }
      },
      {
        type: "ParameterTable",
        config: {
          ShowReferenceRanges: true,
          HighlightCriticalValues: true,
          VisibleColumns: (t.columns || []).map(col => col.code),
          ColumnWeights: (t.columns || []).map(col => col.weight),
          tableBlockY: t.tableBlockY,
          testTitleX: t.testTitleX,
          testTitleY: t.testTitleY,
          resultsTableX: t.resultsTableX,
          resultsTableY: t.resultsTableY,
          columns: t.columns
        }
      },
      {
        type: "Interpretation",
        config: {
          Title: "Interpretation",
          VisibleIfEmpty: false,
          interpretationX: t.interpretationX,
          interpretationY: t.interpretationY,
          watermarkText: t.watermarkText,
          watermarkOpacity: t.watermarkOpacity,
          watermarkSize: t.watermarkSize,
          watermarkRotation: t.watermarkRotation,
          includeWatermark: t.includeWatermark
        }
      },
      {
        type: "SignatureBlock",
        config: {
          ShowDoctorName: true,
          ShowCredentials: true,
          ShowDigitalSignatureImage: true,
          signatureBlockY: t.signatureBlockY,
          signatureX: t.signatureX,
          signatureY: t.signatureY,
          signatureSlots: t.signatureSlots,
          includeSignatures: t.includeSignatures
        }
      },
      {
        type: "Footer",
        config: {
          LeftText: t.footerText || "",
          RightText: "Page {PageNumber} of {TotalPages}",
          bottomMargin: t.bottomMargin,
          footerText: t.footerText,
          includeFooter: t.includeFooter
        }
      }
    ]
  });
};

// Map backend TemplateModel back to frontend flat template object
export const mapBackendDslToTemplate = (dslObj, templateId, isDefault, isPublished) => {
  const meta = dslObj?.meta || {};
  const sections = dslObj?.sections || [];
  
  const headerSection = sections.find(s => s.type === "Header") || { config: {} };
  const patientInfoSection = sections.find(s => s.type === "PatientInfo") || { config: {} };
  const parameterTableSection = sections.find(s => s.type === "ParameterTable") || { config: {} };
  const interpretationSection = sections.find(s => s.type === "Interpretation") || { config: {} };
  const signatureSection = sections.find(s => s.type === "SignatureBlock") || { config: {} };
  const footerSection = sections.find(s => s.type === "Footer") || { config: {} };

  const hc = headerSection.config || {};
  const pic = patientInfoSection.config || {};
  const ptc = parameterTableSection.config || {};
  const ic = interpretationSection.config || {};
  const sc = signatureSection.config || {};
  const fc = footerSection.config || {};

  return {
    id: templateId || hc.id || `temp-${meta.modality?.toLowerCase()}`,
    modality: meta.modality || hc.modality || "Radiology",
    title: meta.name || hc.title || hc.brandNameText || "Standard Template",
    density: meta.layout || hc.density || "Comfortable",
    usePreprinted: hc.usePreprinted !== undefined ? hc.usePreprinted : false,
    topMargin: hc.topMargin !== undefined ? hc.topMargin : 40,
    bottomMargin: fc.bottomMargin !== undefined ? fc.bottomMargin : 35,
    leftRightMargin: hc.leftRightMargin !== undefined ? hc.leftRightMargin : 20,
    includeBranding: hc.includeBranding !== undefined ? hc.includeBranding : true,
    clinicName: hc.clinicName || "SynOS Diagnostic Lab",
    themeColor: hc.themeColor || "Dark Zinc",
    watermarkText: ic.watermarkText || "SYNOS COPY",
    watermarkOpacity: ic.watermarkOpacity !== undefined ? ic.watermarkOpacity : 0.03,
    watermarkSize: ic.watermarkSize !== undefined ? ic.watermarkSize : 32,
    watermarkRotation: ic.watermarkRotation !== undefined ? ic.watermarkRotation : 12,
    footerText: fc.footerText || hc.footerText || "",
    logoUrl: hc.logoUrl || "",
    logoPosition: hc.logoPosition || "Left",
    logoLayout: hc.logoLayout || "logo-left",
    logoSize: hc.logoSize !== undefined ? hc.logoSize : 40,
    brandNameText: hc.brandNameText || "",
    brandNameSize: hc.brandNameSize !== undefined ? hc.brandNameSize : 16,
    brandNameWeight: hc.brandNameWeight || "900",
    brandNameColor: hc.brandNameColor || "#18181b",
    brandSubtitleText: hc.brandSubtitleText || "",
    brandSubtitleSize: hc.brandSubtitleSize !== undefined ? hc.brandSubtitleSize : 9,
    brandSubtitleColor: hc.brandSubtitleColor || "#71717a",
    showHeaderDivider: hc.showHeaderDivider !== undefined ? hc.showHeaderDivider : true,
    headerDividerThickness: hc.headerDividerThickness !== undefined ? hc.headerDividerThickness : 2,
    headerDividerStyle: hc.headerDividerStyle || "solid",
    headerDividerColor: hc.headerDividerColor || "#27272a",
    bgType: hc.bgType || "image",
    bgColor: hc.bgColor || "#ffffff",
    bgGradientStart: hc.bgGradientStart || "#ffffff",
    bgGradientEnd: hc.bgGradientEnd || "#fafafa",
    bgGradientAngle: hc.bgGradientAngle !== undefined ? hc.bgGradientAngle : 135,
    backgroundPath: hc.backgroundPath || "",
    bgImageOpacity: hc.bgImageOpacity !== undefined ? hc.bgImageOpacity : 0.03,
    enableAbsolutePositioning: pic.enableAbsolutePositioning !== undefined ? pic.enableAbsolutePositioning : true,
    patientBlockY: pic.patientBlockY !== undefined ? pic.patientBlockY : 55,
    tableBlockY: ptc.tableBlockY !== undefined ? ptc.tableBlockY : 95,
    signatureBlockY: sc.signatureBlockY !== undefined ? sc.signatureBlockY : 25,
    patientNameX: pic.patientNameX,
    patientNameY: pic.patientNameY,
    patientAgeSexX: pic.patientAgeSexX,
    patientAgeSexY: pic.patientAgeSexY,
    refDoctorX: pic.refDoctorX,
    refDoctorY: pic.refDoctorY,
    patientIdX: pic.patientIdX,
    patientIdY: pic.patientIdY,
    billingDateX: pic.billingDateX,
    billingDateY: pic.billingDateY,
    reportDateX: pic.reportDateX,
    reportDateY: pic.reportDateY,
    testTitleX: ptc.testTitleX,
    testTitleY: ptc.testTitleY,
    resultsTableX: ptc.resultsTableX,
    resultsTableY: ptc.resultsTableY,
    interpretationX: ic.interpretationX,
    interpretationY: ic.interpretationY,
    signatureX: sc.signatureX,
    signatureY: sc.signatureY,
    borderWidth: hc.borderWidth !== undefined ? hc.borderWidth : 1,
    borderColor: hc.borderColor || "#e2e8f0",
    borderStyle: hc.borderStyle || "solid",
    borderRadius: hc.borderRadius !== undefined ? hc.borderRadius : 12,
    pagePadding: hc.pagePadding !== undefined ? hc.pagePadding : 24,
    columns: ptc.columns || [
      { code: "Parameter", title: "Parameter", weight: 3, alignment: "Left", bold: true },
      { code: "Value", title: "Findings / Commentary", weight: 8, alignment: "Left", bold: false }
    ],
    signatureSlots: sc.signatureSlots || [
      { slotId: 0, title: "Default Pathologist (Lab Owner)", required: true }
    ],
    includeLogo: hc.includeLogo !== undefined ? hc.includeLogo : true,
    includeHeaderName: hc.includeHeaderName !== undefined ? hc.includeHeaderName : true,
    includeHeaderSubtitle: hc.includeHeaderSubtitle !== undefined ? hc.includeHeaderSubtitle : true,
    includeWatermark: ic.includeWatermark !== undefined ? ic.includeWatermark : true,
    includeFooter: fc.includeFooter !== undefined ? fc.includeFooter : true,
    includeSignatures: sc.includeSignatures !== undefined ? sc.includeSignatures : true,
    isDefault: isDefault || false,
    isPublished: isPublished || false
  };
};
