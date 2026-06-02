import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Beaker, 
  IndianRupee, 
  Settings, 
  Calculator, 
  Check, 
  AlertCircle,
  Edit2,
  Trash2,
  List,
  Layers,
  ChevronRight,
  X,
  Sparkles,
  Percent,
  FileText,
  Sliders,
  CheckSquare,
  Shield,
  ArrowRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { AdminApi } from '../../api/admin';

// Seed default templates matching ReportTemplatesScreen.jsx
const DEFAULT_TEMPLATES = [
  {
    id: "temp-hematology",
    modality: "Hematology",
    title: "Hematology Compact",
    density: "Compact",
    usePreprinted: true,
    topMargin: 45,
    bottomMargin: 35,
    leftRightMargin: 15,
    includeBranding: false,
    clinicName: "SynOS Diagnostics Lab",
    themeColor: "Indigo",
    watermarkText: "SYNOS DIAGNOSTICS",
    watermarkOpacity: 0.05,
    footerText: "Sector 4, Phase 2, Health City | Email: reports@synos.in",
    logoUrl: "",
    logoPosition: "Left",
    logoLayout: "logo-left",
    logoSize: 40,
    brandNameText: "SynOS Diagnostics Lab",
    brandNameSize: 16,
    brandNameWeight: "900",
    brandNameColor: "#312e81",
    brandSubtitleText: "Accredited Diagnostics Lab",
    brandSubtitleSize: 9,
    brandSubtitleColor: "#71717a",
    showHeaderDivider: true,
    headerDividerThickness: 2,
    headerDividerStyle: "solid",
    headerDividerColor: "#4f46e5",
    watermarkSize: 32,
    watermarkRotation: 12,
    bgType: "solid",
    bgColor: "#ffffff",
    bgGradientStart: "#ffffff",
    bgGradientEnd: "#f1f5f9",
    bgGradientAngle: 135,
    bgImageUrl: "",
    bgImageOpacity: 0.05,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    borderRadius: 12,
    pagePadding: 24,
    columns: [
      { code: "Parameter", title: "Test Parameter", weight: 3, alignment: "Left", bold: true },
      { code: "Value", title: "Observed Value", weight: 2, alignment: "Center", bold: false },
      { code: "Unit", title: "Unit", weight: 1, alignment: "Center", bold: false },
      { code: "ReferenceRange", title: "Reference Ranges", weight: 3, alignment: "Right", bold: false }
    ],
    signatureSlots: [
      { slotId: 0, title: "Default Pathologist (Lab Owner)", required: true }
    ]
  },
  {
    id: "temp-biochemistry",
    modality: "Biochemistry",
    title: "Biochemistry Standard",
    density: "Comfortable",
    usePreprinted: false,
    topMargin: 40,
    bottomMargin: 30,
    leftRightMargin: 20,
    includeBranding: true,
    clinicName: "SynOS Clinical Chemistry",
    themeColor: "Emerald",
    watermarkText: "VERIFIED REPORT",
    watermarkOpacity: 0.04,
    footerText: "Chemical Division, SynOS Labs | Hotline: 1800-SYNOS",
    logoUrl: "",
    logoPosition: "Left",
    logoLayout: "logo-left",
    logoSize: 40,
    brandNameText: "SynOS Clinical Chemistry",
    brandNameSize: 16,
    brandNameWeight: "900",
    brandNameColor: "#065f46",
    brandSubtitleText: "Accredited Diagnostics Lab",
    brandSubtitleSize: 9,
    brandSubtitleColor: "#71717a",
    showHeaderDivider: true,
    headerDividerThickness: 2,
    headerDividerStyle: "solid",
    headerDividerColor: "#10b981",
    watermarkSize: 32,
    watermarkRotation: 12,
    bgType: "solid",
    bgColor: "#ffffff",
    bgGradientStart: "#ffffff",
    bgGradientEnd: "#ecfdf5",
    bgGradientAngle: 135,
    bgImageUrl: "",
    bgImageOpacity: 0.05,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    borderRadius: 12,
    pagePadding: 24,
    columns: [
      { code: "Parameter", title: "Analysis", weight: 4, alignment: "Left", bold: true },
      { code: "Value", title: "Result", weight: 3, alignment: "Center", bold: false },
      { code: "Unit", title: "Biological Unit", weight: 2, alignment: "Center", bold: false },
      { code: "ReferenceRange", title: "Biological Reference Interval", weight: 4, alignment: "Right", bold: false },
      { code: "Methodology", title: "Methodology", weight: 3, alignment: "Right", bold: false }
    ],
    signatureSlots: [
      { slotId: 0, title: "Default Pathologist (Lab Owner)", required: true }
    ]
  },
  {
    id: "temp-radiology",
    modality: "Radiology",
    title: "Radiology Narrative",
    density: "Comfortable",
    usePreprinted: false,
    topMargin: 40,
    bottomMargin: 35,
    leftRightMargin: 20,
    includeBranding: true,
    clinicName: "SynOS Imaging Center",
    themeColor: "Dark Zinc",
    watermarkText: "RADIOLOGY COPY",
    watermarkOpacity: 0.03,
    footerText: "Imaging Wing, SynOS Diagnostics | Tel: 011-224466",
    logoUrl: "",
    logoPosition: "Left",
    logoLayout: "logo-left",
    logoSize: 40,
    brandNameText: "SynOS Imaging Center",
    brandNameSize: 16,
    brandNameWeight: "900",
    brandNameColor: "#18181b",
    brandSubtitleText: "Accredited Diagnostics Lab",
    brandSubtitleSize: 9,
    brandSubtitleColor: "#71717a",
    showHeaderDivider: true,
    headerDividerThickness: 2,
    headerDividerStyle: "solid",
    headerDividerColor: "#27272a",
    watermarkSize: 32,
    watermarkRotation: 12,
    bgType: "solid",
    bgColor: "#ffffff",
    bgGradientStart: "#ffffff",
    bgGradientEnd: "#fafafa",
    bgGradientAngle: 135,
    bgImageUrl: "",
    bgImageOpacity: 0.05,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    borderRadius: 12,
    pagePadding: 24,
    columns: [
      { code: "Parameter", title: "Investigation", weight: 3, alignment: "Left", bold: true },
      { code: "Value", title: "Findings / Commentary", weight: 8, alignment: "Left", bold: false }
    ],
    signatureSlots: [
      { slotId: 0, title: "Default Pathologist (Lab Owner)", required: true },
      { slotId: 1, title: "Radiologist", required: true }
    ]
  },
  {
    id: "temp-histopathology",
    modality: "Histopathology",
    title: "Histopathology Detailed",
    density: "Large-print",
    usePreprinted: false,
    topMargin: 45,
    bottomMargin: 40,
    leftRightMargin: 25,
    includeBranding: true,
    clinicName: "SynOS Pathological Institute",
    themeColor: "Amber",
    watermarkText: "HISTOLOGY REPORT",
    watermarkOpacity: 0.05,
    footerText: "Advanced Histology Wing, SynOS Labs",
    logoUrl: "",
    logoPosition: "Left",
    logoLayout: "logo-left",
    logoSize: 40,
    brandNameText: "SynOS Pathological Institute",
    brandNameSize: 16,
    brandNameWeight: "900",
    brandNameColor: "#78350f",
    brandSubtitleText: "Accredited Diagnostics Lab",
    brandSubtitleSize: 9,
    brandSubtitleColor: "#71717a",
    showHeaderDivider: true,
    headerDividerThickness: 2,
    headerDividerStyle: "solid",
    headerDividerColor: "#f59e0b",
    watermarkSize: 32,
    watermarkRotation: 12,
    bgType: "solid",
    bgColor: "#ffffff",
    bgGradientStart: "#ffffff",
    bgGradientEnd: "#fffbeb",
    bgGradientAngle: 135,
    bgImageUrl: "",
    bgImageOpacity: 0.05,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    borderRadius: 12,
    pagePadding: 24,
    columns: [
      { code: "Parameter", title: "Tissue / Specimen", weight: 3, alignment: "Left", bold: true },
      { code: "Value", title: "Microscopic Description", weight: 8, alignment: "Left", bold: false }
    ],
    signatureSlots: [
      { slotId: 0, title: "Default Pathologist (Lab Owner)", required: true }
    ]
  }
];

// Helper to look up active template case-insensitively using test department Modality
const getActiveTemplate = (test, templatesList) => {
  if (!test) return DEFAULT_TEMPLATES[0];
  let list = templatesList;
  if (!list) {
    const saved = localStorage.getItem("synos_report_templates");
    list = DEFAULT_TEMPLATES;
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse templates from localStorage:", e);
      }
    }
  }

  let found = null;
  // If manual templateId override exists, match by exact template ID
  if (test.templateId) {
    found = list.find(t => t.id === test.templateId);
  }

  // Fallback to case-insensitive modality matching
  if (!found) {
    const dept = (test.department || "").toLowerCase().trim();
    found = list.find(t => {
      const modality = (t.modality || "").toLowerCase().trim();
      return modality && (dept.includes(modality) || modality.includes(dept));
    });
  }

  const rawTemplate = found || list[0] || DEFAULT_TEMPLATES[0];

  return {
    ...rawTemplate,
    enableAbsolutePositioning: rawTemplate.enableAbsolutePositioning !== undefined ? rawTemplate.enableAbsolutePositioning : true,
    patientBlockY: rawTemplate.patientBlockY !== undefined ? rawTemplate.patientBlockY : 55,
    tableBlockY: rawTemplate.tableBlockY !== undefined ? rawTemplate.tableBlockY : 95,
    signatureBlockY: rawTemplate.signatureBlockY !== undefined ? rawTemplate.signatureBlockY : 25,
    includeLogo: rawTemplate.includeLogo !== undefined ? rawTemplate.includeLogo : true,
    includeHeaderName: rawTemplate.includeHeaderName !== undefined ? rawTemplate.includeHeaderName : true,
    includeHeaderSubtitle: rawTemplate.includeHeaderSubtitle !== undefined ? rawTemplate.includeHeaderSubtitle : true,
    includeWatermark: rawTemplate.includeWatermark !== undefined ? rawTemplate.includeWatermark : true,
    includeFooter: rawTemplate.includeFooter !== undefined ? rawTemplate.includeFooter : true,
    includeSignatures: rawTemplate.includeSignatures !== undefined ? rawTemplate.includeSignatures : true,
    backgroundPath: rawTemplate.backgroundPath || (
      rawTemplate.modality === "Hematology" ? "/assets/report-masters/hematology-master.svg" :
      rawTemplate.modality === "Biochemistry" ? "/assets/report-masters/biochemistry-master.svg" :
      rawTemplate.modality === "Radiology" ? "/assets/report-masters/radiology-master.svg" :
      rawTemplate.modality === "Histopathology" ? "/assets/report-masters/histopathology-master.svg" :
      "/assets/report-masters/default-master.svg"
    )
  };
};

const getCoordinates = (template) => {
  const margin = template.leftRightMargin ?? 15;
  const pY = template.patientBlockY ?? 55;
  const tY = template.tableBlockY ?? 95;
  const sY = template.signatureBlockY ?? 25;
  
  return {
    patientNameX: template.patientNameX !== undefined ? template.patientNameX : margin,
    patientNameY: template.patientNameY !== undefined ? template.patientNameY : pY,
    
    patientAgeSexX: template.patientAgeSexX !== undefined ? template.patientAgeSexX : margin,
    patientAgeSexY: template.patientAgeSexY !== undefined ? template.patientAgeSexY : (pY + 12),
    
    refDoctorX: template.refDoctorX !== undefined ? template.refDoctorX : (margin + 60),
    refDoctorY: template.refDoctorY !== undefined ? template.refDoctorY : pY,
    
    patientIdX: template.patientIdX !== undefined ? template.patientIdX : (margin + 60),
    patientIdY: template.patientIdY !== undefined ? template.patientIdY : (pY + 12),
    
    billingDateX: template.billingDateX !== undefined ? template.billingDateX : (margin + 120),
    billingDateY: template.billingDateY !== undefined ? template.billingDateY : pY,
    
    reportDateX: template.reportDateX !== undefined ? template.reportDateX : (margin + 120),
    reportDateY: template.reportDateY !== undefined ? template.reportDateY : (pY + 12),
    
    testTitleX: template.testTitleX !== undefined ? template.testTitleX : margin,
    testTitleY: template.testTitleY !== undefined ? template.testTitleY : tY,
    
    resultsTableX: template.resultsTableX !== undefined ? template.resultsTableX : margin,
    resultsTableY: template.resultsTableY !== undefined ? template.resultsTableY : (tY + 8),
    
    interpretationX: template.interpretationX !== undefined ? template.interpretationX : margin,
    interpretationY: template.interpretationY !== undefined ? template.interpretationY : (tY + 55),
    
    signatureX: template.signatureX !== undefined ? template.signatureX : margin,
    signatureY: template.signatureY !== undefined ? template.signatureY : sY,
  };
};

// Seed Catalog with extended operational structures
const INITIAL_TEST_CATALOG = [
  {
    id: "cbc-001",
    name: "Complete Blood Count (CBC)",
    code: "CBC",
    department: "Hematology",
    basePrice: 450,
    isProfile: false,
    includedTestIds: [],
    specimenTypeCode: "EDTA",
    parameters: [
      { 
        code: "HB", 
        name: "Hemoglobin", 
        unit: "g/dL", 
        minRange: 12.0, 
        maxRange: 16.0, 
        method: "Spectrophotometry",
        hasFormula: false,
        formula: "",
        analyzerModel: "Sysmex XN-1000",
        analyzerChannel: "CH-HB-01",
        narrativeTemplate: "Hemoglobin levels indicate oxygen-carrying capacity. Low levels suggest anemia.",
        genderRanges: { maleMin: 13.5, maleMax: 17.5, femaleMin: 12.0, femaleMax: 15.5 }
      },
      { 
        code: "RBC", 
        name: "Red Blood Cell Count", 
        unit: "M/uL", 
        minRange: 4.0, 
        maxRange: 5.5, 
        method: "Impedance",
        hasFormula: false,
        formula: "",
        analyzerModel: "Sysmex XN-1000",
        analyzerChannel: "CH-RBC-02",
        narrativeTemplate: "",
        genderRanges: { maleMin: 4.5, maleMax: 5.9, femaleMin: 4.0, femaleMax: 5.2 }
      },
      { 
        code: "WBC", 
        name: "White Blood Cell Count", 
        unit: "K/uL", 
        minRange: 4.0, 
        maxRange: 11.0, 
        method: "Impedance",
        hasFormula: false,
        formula: "",
        analyzerModel: "Sysmex XN-1000",
        analyzerChannel: "CH-WBC-03",
        narrativeTemplate: "Elevated WBC counts suggest active infection or inflammation.",
        genderRanges: { maleMin: 4.0, maleMax: 11.0, femaleMin: 4.0, femaleMax: 11.0 }
      },
      { 
        code: "PLT", 
        name: "Platelet Count", 
        unit: "K/uL", 
        minRange: 150, 
        maxRange: 450, 
        method: "Impedance",
        hasFormula: false,
        formula: "",
        analyzerModel: "Sysmex XN-1000",
        analyzerChannel: "CH-PLT-04",
        narrativeTemplate: "",
        genderRanges: { maleMin: 150, maleMax: 450, femaleMin: 150, femaleMax: 450 }
      }
    ],
    reportStyle: "Standard A4",
    signatureSlots: ["Default Pathologist (Lab Owner)"],
    showRange: true,
    showMethod: true,
    showInterpretation: true,
    pricing: { branchA: 480, branchB: 450, corporate: 400 },
    outsource: { enabled: false, partnerLab: "", fee: 0, instructions: "" }
  },
  {
    id: "lft-002",
    name: "Liver Function Test (LFT)",
    code: "LFT",
    department: "Biochemistry",
    basePrice: 900,
    isProfile: false,
    includedTestIds: [],
    specimenTypeCode: "SERUM",
    parameters: [
      { 
        code: "BIL_T", 
        name: "Total Bilirubin", 
        unit: "mg/dL", 
        minRange: 0.2, 
        maxRange: 1.2, 
        method: "Diazo",
        hasFormula: false,
        formula: "",
        analyzerModel: "Cobas c501",
        analyzerChannel: "C-BIL-T",
        narrativeTemplate: "",
        genderRanges: { maleMin: 0.2, maleMax: 1.2, femaleMin: 0.2, femaleMax: 1.2 }
      },
      { 
        code: "BIL_D", 
        name: "Direct Bilirubin", 
        unit: "mg/dL", 
        minRange: 0.0, 
        maxRange: 0.3, 
        method: "Diazo",
        hasFormula: false,
        formula: "",
        analyzerModel: "Cobas c501",
        analyzerChannel: "C-BIL-D",
        narrativeTemplate: "",
        genderRanges: { maleMin: 0.0, maleMax: 0.3, femaleMin: 0.0, femaleMax: 0.3 }
      },
      { 
        code: "BIL_I", 
        name: "Indirect Bilirubin", 
        unit: "mg/dL", 
        minRange: 0.1, 
        maxRange: 0.8, 
        method: "Calculated",
        hasFormula: true,
        formula: "BIL_T - BIL_D",
        analyzerModel: "Software Calculation",
        analyzerChannel: "CALC",
        narrativeTemplate: "Calculated as Total Bilirubin minus Direct Bilirubin.",
        genderRanges: { maleMin: 0.1, maleMax: 0.8, femaleMin: 0.1, femaleMax: 0.8 }
      },
      { 
        code: "SGOT", 
        name: "SGOT (AST)", 
        unit: "U/L", 
        minRange: 5, 
        maxRange: 40, 
        method: "Kinetic UV",
        hasFormula: false,
        formula: "",
        analyzerModel: "Cobas c501",
        analyzerChannel: "C-AST",
        narrativeTemplate: "",
        genderRanges: { maleMin: 8, maleMax: 46, femaleMin: 7, femaleMax: 34 }
      },
      { 
        code: "SGPT", 
        name: "SGPT (ALT)", 
        unit: "U/L", 
        minRange: 5, 
        maxRange: 40, 
        method: "Kinetic UV",
        hasFormula: false,
        formula: "",
        analyzerModel: "Cobas c501",
        analyzerChannel: "C-ALT",
        narrativeTemplate: "",
        genderRanges: { maleMin: 7, maleMax: 55, femaleMin: 7, femaleMax: 45 }
      }
    ],
    reportStyle: "Modern Tabular",
    signatureSlots: ["Default Pathologist (Lab Owner)"],
    showRange: true,
    showMethod: true,
    showInterpretation: true,
    pricing: { branchA: 950, branchB: 900, corporate: 800 },
    outsource: { enabled: false, partnerLab: "", fee: 0, instructions: "" }
  },
  {
    id: "lipid-003",
    name: "Lipid Profile",
    code: "LIPID",
    department: "Biochemistry",
    basePrice: 850,
    isProfile: false,
    includedTestIds: [],
    specimenTypeCode: "SERUM",
    parameters: [
      { 
        code: "CHO", 
        name: "Total Cholesterol", 
        unit: "mg/dL", 
        minRange: 100, 
        maxRange: 200, 
        method: "Enzymatic CHOD-PAP",
        hasFormula: false,
        formula: "",
        analyzerModel: "Cobas c501",
        analyzerChannel: "C-CHO",
        narrativeTemplate: "",
        genderRanges: { maleMin: 100, maleMax: 200, femaleMin: 100, femaleMax: 200 }
      },
      { 
        code: "TRIG", 
        name: "Triglycerides", 
        unit: "mg/dL", 
        minRange: 50, 
        maxRange: 150, 
        method: "Enzymatic GPO-PAP",
        hasFormula: false,
        formula: "",
        analyzerModel: "Cobas c501",
        analyzerChannel: "C-TRIG",
        narrativeTemplate: "",
        genderRanges: { maleMin: 50, maleMax: 150, femaleMin: 50, femaleMax: 150 }
      },
      { 
        code: "HDL", 
        name: "HDL Cholesterol", 
        unit: "mg/dL", 
        minRange: 40, 
        maxRange: 60, 
        method: "Direct Selective",
        hasFormula: false,
        formula: "",
        analyzerModel: "Cobas c501",
        analyzerChannel: "C-HDL",
        narrativeTemplate: "",
        genderRanges: { maleMin: 40, maleMax: 50, femaleMin: 50, femaleMax: 60 }
      },
      { 
        code: "LDL", 
        name: "LDL Cholesterol", 
        unit: "mg/dL", 
        minRange: 50, 
        maxRange: 130, 
        method: "Calculated",
        hasFormula: true,
        formula: "CHO - HDL - (TRIG / 5)",
        analyzerModel: "Software Calculation",
        analyzerChannel: "CALC",
        narrativeTemplate: "Calculated via Friedewald Formula. Subject to error when Triglycerides > 400 mg/dL.",
        genderRanges: { maleMin: 50, maleMax: 130, femaleMin: 50, femaleMax: 130 }
      }
    ],
    reportStyle: "Modern Tabular",
    signatureSlots: ["Default Pathologist (Lab Owner)"],
    showRange: true,
    showMethod: true,
    showInterpretation: true,
    pricing: { branchA: 890, branchB: 850, corporate: 750 },
    outsource: { enabled: false, partnerLab: "", fee: 0, instructions: "" }
  },
  {
    id: "executive-health-004",
    name: "Executive Health Package",
    code: "EHP01",
    department: "Health Panels",
    basePrice: 2000,
    isProfile: true,
    includedTestIds: ["cbc-001", "lft-002", "lipid-003"],
    parameters: [],
    reportStyle: "Standard A4",
    signatureSlots: ["Default Pathologist (Lab Owner)"],
    showRange: true,
    showMethod: true,
    showInterpretation: true,
    pricing: { branchA: 2100, branchB: 2000, corporate: 1700 },
    outsource: { enabled: false, partnerLab: "", fee: 0, instructions: "" }
  }
];

const SIGNATURE_SLOT_PRESETS = [
  "Default Pathologist (Lab Owner)",
  "Additional Pathologist",
  "Radiologist"
];

const DEPARTMENTS = ["All", "Hematology", "Biochemistry", "Health Panels", "Microbiology", "Serology", "Radiology"];

const SPECIMEN_TYPES = [
  { code: "SERUM", name: "Serum (Red Cap)" },
  { code: "EDTA", name: "EDTA Whole Blood (Purple Cap)" },
  { code: "PLASMA", name: "Plasma (Green/Grey Cap)" },
  { code: "URINE", name: "Urine Sample" },
  { code: "CSF", name: "Cerebrospinal Fluid" },
  { code: "SST", name: "Serum Separator Tube (Gold Cap)" },
  { code: "SWAB", name: "Swab Sample" }
];

const sanitizeCatalogSigs = (catalogList) => {
  return catalogList.map(test => {
    let currentSlots = test.signatureSlots || [];
    if (!Array.isArray(currentSlots)) {
      currentSlots = [];
    }
    
    const newSlots = new Set();
    // Default Pathologist (Lab Owner) must always be present
    newSlots.add("Default Pathologist (Lab Owner)");
    
    currentSlots.forEach(sig => {
      const lower = sig.toLowerCase();
      if (lower.includes("radiologist")) {
        newSlots.add("Radiologist");
      } else if (lower.includes("additional pathologist")) {
        newSlots.add("Additional Pathologist");
      }
    });
    
    return {
      ...test,
      signatureSlots: Array.from(newSlots)
    };
  });
};

const getInitialCatalog = () => {
  const saved = localStorage.getItem("synos_test_catalog");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return sanitizeCatalogSigs(parsed);
    } catch (e) {
      console.error("Failed to parse catalog from localStorage:", e);
    }
  }
  return sanitizeCatalogSigs(INITIAL_TEST_CATALOG);
};

const getInitialSelectedTest = (catalogList) => {
  const savedSelectedId = localStorage.getItem("synos_selected_test_id");
  if (savedSelectedId) {
    const found = catalogList.find(t => t.id === savedSelectedId);
    if (found) return found;
  }
  return catalogList[0] || INITIAL_TEST_CATALOG[0];
};

const formatReferenceRange = (p) => {
  if (!p) return "";
  const parts = [];
  if (p.useMale && p.maleMin !== undefined && p.maleMax !== undefined && p.maleMin !== "" && p.maleMax !== "" && p.maleMin !== null && p.maleMax !== null) {
    parts.push(`M: ${p.maleMin}-${p.maleMax}`);
  }
  if (p.useFemale && p.femaleMin !== undefined && p.femaleMax !== undefined && p.femaleMin !== "" && p.femaleMax !== "" && p.femaleMin !== null && p.femaleMax !== null) {
    parts.push(`F: ${p.femaleMin}-${p.femaleMax}`);
  }
  if (p.useInfant && p.infantMin !== undefined && p.infantMax !== undefined && p.infantMin !== "" && p.infantMax !== "" && p.infantMin !== null && p.infantMax !== null) {
    parts.push(`Infant: ${p.infantMin}-${p.infantMax}`);
  }
  if (p.useChild && p.childMin !== undefined && p.childMax !== undefined && p.childMin !== "" && p.childMax !== "" && p.childMin !== null && p.childMax !== null) {
    parts.push(`Child: ${p.childMin}-${p.childMax}`);
  }
  if (p.useAdult && p.adultMin !== undefined && p.adultMax !== undefined && p.adultMin !== "" && p.adultMax !== "" && p.adultMin !== null && p.adultMax !== null) {
    parts.push(`Adult: ${p.adultMin}-${p.adultMax}`);
  }

  if (parts.length > 0) {
    return parts.join(", ");
  }

  if (p.referenceRange && p.referenceRange.trim() !== "") {
    return p.referenceRange;
  }

  if (p.minRange !== undefined && p.maxRange !== undefined && p.minRange !== "" && p.maxRange !== "" && p.minRange !== null && p.maxRange !== null) {
    const minNum = Number(p.minRange);
    const maxNum = Number(p.maxRange);
    if (!isNaN(minNum) && !isNaN(maxNum)) {
      return `${minNum} - ${maxNum}`;
    }
  }
  return "";
};

const getParamMidpoint = (p) => {
  if (!p) return "0.0";
  const minVal = p.minRange !== undefined && p.minRange !== null && p.minRange !== "" ? Number(p.minRange) : 0;
  const maxVal = p.maxRange !== undefined && p.maxRange !== null && p.maxRange !== "" ? Number(p.maxRange) : 0;
  const min = isNaN(minVal) ? 0 : minVal;
  const max = isNaN(maxVal) ? 0 : maxVal;
  return (min + (max - min) / 2).toFixed(1);
};

const normalizeDbTest = (dbTest) => {
  if (!dbTest) return null;
  const testId = dbTest.testId || dbTest.TestId || dbTest.id;
  const testCode = dbTest.testCode || dbTest.TestCode || dbTest.code;
  const testName = dbTest.testName || dbTest.TestName || dbTest.name;
  const department = dbTest.department || dbTest.Department;
  const basePrice = dbTest.basePrice !== undefined ? dbTest.basePrice : (dbTest.BasePrice !== undefined ? dbTest.BasePrice : 0);
  const category = dbTest.category || dbTest.Category || "";
  const tatHours = dbTest.tat_Hours || dbTest.TAT_Hours || dbTest.tatHours || dbTest.TaT_Hours || 24;
  const isOutsourced = dbTest.isOutsourced !== undefined ? dbTest.isOutsourced : (dbTest.IsOutsourced !== undefined ? dbTest.IsOutsourced : false);
  const isActive = dbTest.isActive !== undefined ? dbTest.isActive : (dbTest.IsActive !== undefined ? dbTest.IsActive : true);
  const specimenTypeCode = dbTest.specimenTypeCode || dbTest.SpecimenTypeCode || "";

  return {
    id: testId,
    code: testCode,
    name: testName,
    department: department,
    basePrice: Number(basePrice) || 0,
    category: category,
    tatHours: Number(tatHours) || 24,
    isOutsourced: !!isOutsourced,
    isActive: !!isActive,
    specimenTypeCode: specimenTypeCode,
    isProfile: !!dbTest.isProfile,
    parameters: (dbTest.parameters || []).map(p => {
      let minRange = undefined;
      let maxRange = undefined;
      if (p.referenceRange && p.referenceRange.includes(" - ")) {
        const parts = p.referenceRange.split(" - ");
        if (parts.length === 2 && !isNaN(parts[0].trim()) && !isNaN(parts[1].trim())) {
          minRange = Number(parts[0].trim());
          maxRange = Number(parts[1].trim());
        }
      }
      return {
        code: p.parameterCode,
        name: p.parameterName,
        unit: p.unit || "",
        minRange: minRange,
        maxRange: maxRange,
        referenceRange: p.referenceRange || "",
        method: p.methodology || "",
        formula: p.formula || "",
        hasFormula: !!p.isCalculated,
        dataType: p.dataType || "Numeric",
        sortOrder: p.sortOrder || 1,
        useMale: !!p.useMale,
        maleMin: p.maleMin !== null && p.maleMin !== undefined ? p.maleMin : "",
        maleMax: p.maleMax !== null && p.maleMax !== undefined ? p.maleMax : "",
        useFemale: !!p.useFemale,
        femaleMin: p.femaleMin !== null && p.femaleMin !== undefined ? p.femaleMin : "",
        femaleMax: p.femaleMax !== null && p.femaleMax !== undefined ? p.femaleMax : "",
        useInfant: !!p.useInfant,
        infantMin: p.infantMin !== null && p.infantMin !== undefined ? p.infantMin : "",
        infantMax: p.infantMax !== null && p.infantMax !== undefined ? p.infantMax : "",
        useChild: !!p.useChild,
        childMin: p.childMin !== null && p.childMin !== undefined ? p.childMin : "",
        childMax: p.childMax !== null && p.childMax !== undefined ? p.childMax : "",
        useAdult: !!p.useAdult,
        adultMin: p.adultMin !== null && p.adultMin !== undefined ? p.adultMin : "",
        adultMax: p.adultMax !== null && p.adultMax !== undefined ? p.adultMax : ""
      };
    }),
    dbIncludedTestCodes: dbTest.includedTestCodes || []
  };
};

const mergeCatalog = (dbTestsList, localCatalog) => {
  const normalizedDbTests = (dbTestsList || []).map(normalizeDbTest).filter(Boolean);
  
  // Prune local catalog items that have GUID IDs but are missing from the active db list
  const activeLocalCatalog = (localCatalog || []).filter(localTest => {
    const isGuid = localTest.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(localTest.id);
    if (!isGuid) return true; // Keep temporary unsaved items in memory
    
    // Check if it exists in the active DB list
    const exists = normalizedDbTests.some(
      dbTest => (dbTest.id && dbTest.id === localTest.id) ||
                (dbTest.code && dbTest.code.toLowerCase() === localTest.code.toLowerCase())
    );
    return exists;
  });

  const merged = [...activeLocalCatalog];

  normalizedDbTests.forEach(dbTest => {
    // 1. Search for a local test with the EXACT SAME ID
    let existingIndex = merged.findIndex(
      localTest => localTest.id && dbTest.id && localTest.id === dbTest.id
    );

    // 2. If not found by ID, search by CODE
    if (existingIndex === -1) {
      existingIndex = merged.findIndex(
        localTest => localTest.code && localTest.code.toLowerCase() === dbTest.code.toLowerCase()
      );
    }

    if (existingIndex > -1) {
      merged[existingIndex] = {
        ...merged[existingIndex],
        id: dbTest.id,
        name: dbTest.name,
        code: dbTest.code,
        department: dbTest.department,
        basePrice: dbTest.basePrice,
        tatHours: dbTest.tatHours,
        isOutsourced: dbTest.isOutsourced,
        isActive: dbTest.isActive,
        category: dbTest.category,
        specimenTypeCode: dbTest.specimenTypeCode || merged[existingIndex].specimenTypeCode || "SERUM",
        isProfile: dbTest.isProfile,
        parameters: dbTest.parameters && dbTest.parameters.length > 0 ? dbTest.parameters : merged[existingIndex].parameters,
        dbIncludedTestCodes: dbTest.dbIncludedTestCodes
      };
    } else {
      merged.push({
        id: dbTest.id,
        name: dbTest.name,
        code: dbTest.code,
        department: dbTest.department || "Biochemistry",
        basePrice: dbTest.basePrice || 0,
        isProfile: dbTest.isProfile,
        includedTestIds: [],
        dbIncludedTestCodes: dbTest.dbIncludedTestCodes,
        parameters: dbTest.parameters || [],
        reportStyle: "Standard A4",
        signatureSlots: ["Default Pathologist (Lab Owner)"],
        showRange: true,
        showMethod: true,
        showInterpretation: true,
        pricing: { branchA: dbTest.basePrice, branchB: dbTest.basePrice, corporate: dbTest.basePrice },
        outsource: { enabled: dbTest.isOutsourced, partnerLab: "", fee: 0, instructions: "" },
        tatHours: dbTest.tatHours,
        isOutsourced: dbTest.isOutsourced,
        isActive: dbTest.isActive,
        category: dbTest.category,
        specimenTypeCode: dbTest.specimenTypeCode || ((dbTest.department === "Radiology" || dbTest.department === "RAD") ? "NO_SPECIMEN" : "SERUM")
      });
    }
  });

  // Resolve includedTestIds from dbIncludedTestCodes
  merged.forEach(item => {
    if (item.dbIncludedTestCodes && item.dbIncludedTestCodes.length > 0) {
      item.includedTestIds = item.dbIncludedTestCodes.map(code => {
        const found = merged.find(t => t.code && t.code.toLowerCase() === code.toLowerCase());
        return found ? found.id : null;
      }).filter(Boolean);
    }
  });

  // Self-healing post-merge deduplication stage
  const seenIds = new Set();
  const seenCodes = new Set();
  const uniqueMerged = [];

  merged.forEach(test => {
    const testId = test.id;
    const testCode = (test.code || "").toUpperCase().trim();
    if (!seenIds.has(testId) && !seenCodes.has(testCode)) {
      uniqueMerged.push(test);
      seenIds.add(testId);
      seenCodes.add(testCode);
    }
  });

  return uniqueMerged;
};

export function TestMasterScreen() {
  const [catalog, setCatalog] = useState(getInitialCatalog);

  const getCompiledProfileParameters = (test, catalogList) => {
    if (!test || !test.isProfile) {
      return test?.parameters || [];
    }
    const compiled = [];
    const includedIds = test.includedTestIds || [];
    includedIds.forEach(childId => {
      const childTest = (catalogList || []).find(t => t.id === childId);
      if (childTest && childTest.parameters) {
        childTest.parameters.forEach(p => {
          compiled.push({
            ...p,
            childTestName: childTest.name,
            childTestCode: childTest.code,
            isFromChild: true
          });
        });
      }
    });
    return compiled;
  };

  const [selectedTest, setSelectedTest] = useState(() => getInitialSelectedTest(catalog));
  const [originalDbTests, setOriginalDbTests] = useState([]);
  const [isLoadingTests, setIsLoadingTests] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [departments, setDepartments] = useState(["All", "Hematology", "Biochemistry", "Health Panels", "Microbiology", "Serology", "Radiology"]);

  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);
  
  // Workspace UI States
  const [activeTab, setActiveTab] = useState("parameters"); // parameters | report-setup | pricing | profile-builder
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [previewMode, setPreviewMode] = useState("digital"); // digital | physical
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);

  // Dynamic Template List Hook
  const [reportTemplatesList, setReportTemplatesList] = useState(() => {
    const saved = localStorage.getItem("synos_report_templates");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse templates from localStorage:", e);
      }
    }
    return DEFAULT_TEMPLATES;
  });

  useEffect(() => {
    const saved = localStorage.getItem("synos_report_templates");
    if (saved) {
      try {
        setReportTemplatesList(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse templates from localStorage:", e);
      }
    }
  }, [activeTab]);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const handleResize = (entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        const baseWidth = 794;
        const newScale = Math.min(1, width / baseWidth);
        setScale(newScale);
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);

    // Initial check
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width > 0) {
      setScale(Math.min(1, rect.width / 794));
    }

    return () => observer.disconnect();
  }, [showLivePreview]);

  useEffect(() => {
    const loadDbTestsAndMerge = async () => {
      setIsLoadingTests(true);
      try {
        const dbTests = await AdminApi.getTests();
        setOriginalDbTests(dbTests || []);
        
        try {
          const dbDepts = await AdminApi.getDepartments();
          if (dbDepts && dbDepts.length > 0) {
            const mappedDepts = ["All", ...dbDepts.map(d => d.name)];
            setDepartments(mappedDepts);
          }
        } catch (deptErr) {
          console.error("Failed to fetch database departments on mount:", deptErr);
        }
        
        const savedCatalog = localStorage.getItem("synos_test_catalog");
        let localCatalogList = INITIAL_TEST_CATALOG;
        if (savedCatalog) {
          try {
            localCatalogList = JSON.parse(savedCatalog);
          } catch (e) {
            console.error("Failed to parse catalog from localStorage:", e);
          }
        }
        
        localCatalogList = sanitizeCatalogSigs(localCatalogList);
        
        const merged = mergeCatalog(dbTests, localCatalogList);
        setCatalog(merged);
        localStorage.setItem("synos_test_catalog", JSON.stringify(merged));
        
        const savedSelectedId = localStorage.getItem("synos_selected_test_id");
        let currentSelected = selectedTest;
        if (!currentSelected && savedSelectedId) {
          currentSelected = merged.find(t => t.id === savedSelectedId);
        }
        
        if (currentSelected) {
          const updatedSelected = merged.find(t => t.code === currentSelected.code) || 
                                  merged.find(t => t.id === currentSelected.id) || 
                                  merged[0];
          if (updatedSelected) {
            setSelectedTest(updatedSelected);
            localStorage.setItem("synos_selected_test_id", updatedSelected.id);
          }
        } else if (merged.length > 0) {
          setSelectedTest(merged[0]);
          localStorage.setItem("synos_selected_test_id", merged[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch database tests on mount:", err);
      } finally {
        setIsLoadingTests(false);
      }
    };
    
    loadDbTestsAndMerge();
  }, []);

  const handleStartDrag = (e, activeTemplateId, fieldX, fieldY, initValX, initValY, isBottom = false) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    
    const currentScale = scale || 1;
    const mmPerPixel = 1 / (currentScale * 3.78095);
    
    const handlePointerMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      
      const deltaXMm = dx * mmPerPixel;
      const deltaYMm = dy * mmPerPixel;
      
      let nextX = initValX + deltaXMm;
      let nextY = isBottom ? (initValY - deltaYMm) : (initValY + deltaYMm);
      
      nextX = Math.max(0, Math.min(210, nextX));
      nextY = Math.max(0, Math.min(297, nextY));
      
      setReportTemplatesList(prevList => 
        prevList.map(t => t.id === activeTemplateId ? {
          ...t,
          [fieldX]: Math.round(nextX * 10) / 10,
          [fieldY]: Math.round(nextY * 10) / 10
        } : t)
      );
    };
    
    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      
      setReportTemplatesList(currentTemplates => {
        localStorage.setItem("synos_report_templates", JSON.stringify(currentTemplates));
        return currentTemplates;
      });
    };
    
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  // Metadata Edit States
  const [metaName, setMetaName] = useState(selectedTest?.name || "");
  const [metaCode, setMetaCode] = useState(selectedTest?.code || "");
  const [metaDept, setMetaDept] = useState(selectedTest?.department || "");
  const [metaIsProfile, setMetaIsProfile] = useState(selectedTest?.isProfile || false);
  const [metaSpecimenTypeCode, setMetaSpecimenTypeCode] = useState(selectedTest?.specimenTypeCode || "SERUM");
  const [metaCategory, setMetaCategory] = useState(selectedTest?.category || "General");

  // Right Drawer Contextual States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("formula"); // formula | ranges | analyzer | narrative
  const [drawerParamCode, setDrawerParamCode] = useState("");
  
  // Drawer Editing Temporary Values
  const [editFormula, setEditFormula] = useState("");
  const [editHasFormula, setEditHasFormula] = useState(false);
  const [editNarrative, setEditNarrative] = useState("");
  const [editAnalyzerModel, setEditAnalyzerModel] = useState("");
  const [editAnalyzerChannel, setEditAnalyzerChannel] = useState("");
  const [editUseMale, setEditUseMale] = useState(false);
  const [editMaleMin, setEditMaleMin] = useState("");
  const [editMaleMax, setEditMaleMax] = useState("");
  const [editUseFemale, setEditUseFemale] = useState(false);
  const [editFemaleMin, setEditFemaleMin] = useState("");
  const [editFemaleMax, setEditFemaleMax] = useState("");
  const [editUseInfant, setEditUseInfant] = useState(false);
  const [editInfantMin, setEditInfantMin] = useState("");
  const [editInfantMax, setEditInfantMax] = useState("");
  const [editUseChild, setEditUseChild] = useState(false);
  const [editChildMin, setEditChildMin] = useState("");
  const [editChildMax, setEditChildMax] = useState("");
  const [editUseAdult, setEditUseAdult] = useState(false);
  const [editAdultMin, setEditAdultMin] = useState("");
  const [editAdultMax, setEditAdultMax] = useState("");

  const handleSelectTest = (test) => {
    setSelectedTest(test);
    localStorage.setItem("synos_selected_test_id", test.id);
    setMetaName(test.name);
    setMetaCode(test.code);
    setMetaDept(test.department);
    setMetaIsProfile(test.isProfile);
    setMetaSpecimenTypeCode(test.specimenTypeCode || "SERUM");
    setMetaCategory(test.category || "General");
    setIsEditingMetadata(false);
    setDrawerOpen(false);

    // If switching to a non-profile test while on profile tab, default back to parameters
    if (!test.isProfile && activeTab === "profile-builder") {
      setActiveTab("parameters");
    }
  };

  const handleSaveMetadata = () => {
    const updated = catalog.map(t => {
      if (t.id === selectedTest.id) {
        const isRadiology = metaDept === "Radiology" || metaDept === "RAD";
        let cleanedParams = t.parameters || [];
        if (isRadiology) {
          const existingFindings = cleanedParams.find(p => p.code === "FINDINGS") || cleanedParams[0];
          cleanedParams = [
            {
              code: existingFindings?.code === "FINDINGS" ? "FINDINGS" : (existingFindings?.code || "FINDINGS"),
              name: existingFindings?.name || "Findings & Impressions",
              unit: "",
              minRange: "",
              maxRange: "",
              method: existingFindings?.method || "Dictation",
              hasFormula: false,
              formula: "",
              analyzerModel: "",
              analyzerChannel: "",
              narrativeTemplate: existingFindings?.narrativeTemplate || t.interpretationComment || "FINDINGS:\n\nIMPRESSION:",
              genderRanges: {}
            }
          ];
        }
        return {
          ...t,
          name: metaName,
          code: metaCode.toUpperCase(),
          department: metaDept,
          isProfile: metaIsProfile,
          specimenTypeCode: isRadiology ? "NO_SPECIMEN" : metaSpecimenTypeCode,
          category: isRadiology ? metaCategory : "General",
          parameters: cleanedParams
        };
      }
      return t;
    });
    setCatalog(updated);
    const updatedTest = updated.find(t => t.id === selectedTest.id);
    setSelectedTest(updatedTest);
    setIsEditingMetadata(false);

    if (metaIsProfile) {
      setActiveTab("profile-builder");
    } else if (activeTab === "profile-builder") {
      setActiveTab("parameters");
    }
  };

  const handleAddTest = () => {
    const newId = `test-${Date.now()}`;
    const isRadiology = selectedDept === "Radiology" || selectedDept === "RAD";
    const newTest = {
      id: newId,
      name: "New Diagnostics Test",
      code: `NEW_${Math.floor(100 + Math.random() * 900)}`,
      department: selectedDept !== "All" ? selectedDept : "Hematology",
      basePrice: 500,
      isProfile: false,
      includedTestIds: [],
      specimenTypeCode: isRadiology ? "NO_SPECIMEN" : "SERUM",
      category: isRadiology ? "X-Ray" : "General",
      parameters: [
        { 
          code: "PARAM1", 
          name: "Sample Parameter", 
          unit: "mg/dL", 
          minRange: 0, 
          maxRange: 100, 
          method: "Spectrophotometry",
          hasFormula: false,
          formula: "",
          analyzerModel: "",
          analyzerChannel: "",
          narrativeTemplate: "",
          genderRanges: { maleMin: 0, maleMax: 100, femaleMin: 0, femaleMax: 100 }
        }
      ],
      reportStyle: "Standard A4",
      signatureSlots: ["Default Pathologist (Lab Owner)"],
      showRange: true,
      showMethod: true,
      showInterpretation: true,
      pricing: { branchA: 500, branchB: 500, corporate: 450 }
    };

    const newCatalog = [...catalog, newTest];
    setCatalog(newCatalog);
    
    // Select the new test and open the metadata editing fields by default
    setSelectedTest(newTest);
    setMetaName(newTest.name);
    setMetaCode(newTest.code);
    setMetaDept(newTest.department);
    setMetaIsProfile(newTest.isProfile);
    setMetaSpecimenTypeCode(isRadiology ? "NO_SPECIMEN" : "SERUM");
    setMetaCategory(isRadiology ? "X-Ray" : "General");
    setIsEditingMetadata(true);
    setDrawerOpen(false);
  };

  const handleDeleteTest = async (testId, e) => {
    e.stopPropagation();
    if (catalog.length <= 1) return;

    const testToDelete = catalog.find(t => t.id === testId);
    if (!testToDelete) return;

    const isConfirmed = window.confirm(`Are you sure you want to permanently delete "${testToDelete.name}"?`);
    if (!isConfirmed) return;

    setIsLoadingTests(true);
    try {
      const isPersisted = testId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(testId);
      if (isPersisted) {
        // Call the backend API immediately to delete it
        await AdminApi.deleteTest(testId);
      }

      const remaining = catalog.filter(t => t.id !== testId);
      setCatalog(remaining);
      
      // Update originalDbTests state as well to sync deleted list
      setOriginalDbTests(prev => prev.filter(ot => {
        const otId = ot.testId || ot.TestId || ot.id;
        return otId !== testId;
      }));

      // Update localStorage immediately
      localStorage.setItem("synos_test_catalog", JSON.stringify(remaining));

      if (selectedTest && selectedTest.id === testId) {
        const fallback = remaining[0] || null;
        if (fallback) {
          handleSelectTest(fallback);
        }
      }

      // Show temporary save success micro-animation
      setIsSavedSuccessfully(true);
      setTimeout(() => setIsSavedSuccessfully(false), 2000);
    } catch (err) {
      console.error(`Failed to permanently delete test ${testId}:`, err);
      alert(`Error deleting test: ${err.message || err}`);
    } finally {
      setIsLoadingTests(false);
    }
  };

  // Spreadsheet Inline Edit Actions
  const handleParamCellChange = (paramIdx, field, val) => {
    let finalVal = val;
    if (field === 'minRange' || field === 'maxRange') {
      if (val !== "" && !/^-?\d*\.?\d*$/.test(val)) {
        return;
      }
      finalVal = val;
    }
    if (field === 'code') {
      finalVal = val.toUpperCase();
    }

    const updatedParams = [...selectedTest.parameters];
    updatedParams[paramIdx] = {
      ...updatedParams[paramIdx],
      [field]: finalVal
    };

    const updatedTest = {
      ...selectedTest,
      parameters: updatedParams
    };

    const updatedCatalog = catalog.map(t => t.id === selectedTest.id ? updatedTest : t);
    setCatalog(updatedCatalog);
    setSelectedTest(updatedTest);
  };

  const handleAddParameterRow = () => {
    const newParam = {
      code: `P${selectedTest.parameters.length + 1}`,
      name: `Parameter ${selectedTest.parameters.length + 1}`,
      unit: "mg/dL",
      minRange: 0,
      maxRange: 100,
      method: "Spectrophotometry",
      hasFormula: false,
      formula: "",
      analyzerModel: "",
      analyzerChannel: "",
      narrativeTemplate: "",
      genderRanges: { maleMin: 0, maleMax: 100, femaleMin: 0, femaleMax: 100 }
    };

    const updatedTest = {
      ...selectedTest,
      parameters: [...selectedTest.parameters, newParam]
    };

    const updatedCatalog = catalog.map(t => t.id === selectedTest.id ? updatedTest : t);
    setCatalog(updatedCatalog);
    setSelectedTest(updatedTest);
  };

  const handleDeleteParameterRow = (paramIdx) => {
    const updatedParams = selectedTest.parameters.filter((_, idx) => idx !== paramIdx);
    const updatedTest = {
      ...selectedTest,
      parameters: updatedParams
    };

    const updatedCatalog = catalog.map(t => t.id === selectedTest.id ? updatedTest : t);
    setCatalog(updatedCatalog);
    setSelectedTest(updatedTest);
  };

  // Open Contextual Slide Drawer
  const openDrawer = (paramCode, mode) => {
    const param = selectedTest.parameters.find(p => p.code === paramCode);
    if (!param) return;

    setDrawerParamCode(paramCode);
    setDrawerMode(mode);
    setEditFormula(param.formula || "");
    setEditHasFormula(param.hasFormula || false);
    setEditNarrative(param.narrativeTemplate || "");
    setEditAnalyzerModel(param.analyzerModel || "");
    setEditAnalyzerChannel(param.analyzerChannel || "");
    setEditMaleMin(param.maleMin !== undefined && param.maleMin !== null && param.maleMin !== "" ? param.maleMin : (param.genderRanges?.maleMin ?? ""));
    setEditMaleMax(param.maleMax !== undefined && param.maleMax !== null && param.maleMax !== "" ? param.maleMax : (param.genderRanges?.maleMax ?? ""));
    setEditFemaleMin(param.femaleMin !== undefined && param.femaleMin !== null && param.femaleMin !== "" ? param.femaleMin : (param.genderRanges?.femaleMin ?? ""));
    setEditFemaleMax(param.femaleMax !== undefined && param.femaleMax !== null && param.femaleMax !== "" ? param.femaleMax : (param.genderRanges?.femaleMax ?? ""));
    
    setEditUseMale(param.useMale ?? (param.maleMin !== undefined && param.maleMin !== "" && param.maleMin !== null) ?? (param.genderRanges?.maleMin !== undefined && param.genderRanges?.maleMin !== 0));
    setEditUseFemale(param.useFemale ?? (param.femaleMin !== undefined && param.femaleMin !== "" && param.femaleMin !== null) ?? (param.genderRanges?.femaleMin !== undefined && param.genderRanges?.femaleMin !== 0));
    setEditUseInfant(!!param.useInfant);
    setEditInfantMin(param.infantMin !== undefined && param.infantMin !== null ? param.infantMin : "");
    setEditInfantMax(param.infantMax !== undefined && param.infantMax !== null ? param.infantMax : "");
    setEditUseChild(!!param.useChild);
    setEditChildMin(param.childMin !== undefined && param.childMin !== null ? param.childMin : "");
    setEditChildMax(param.childMax !== undefined && param.childMax !== null ? param.childMax : "");
    setEditUseAdult(!!param.useAdult);
    setEditAdultMin(param.adultMin !== undefined && param.adultMin !== null ? param.adultMin : "");
    setEditAdultMax(param.adultMax !== undefined && param.adultMax !== null ? param.adultMax : "");

    setDrawerOpen(true);
  };

  // Save Drawer Settings Back to Selected Test Parameter
  const handleSaveDrawerSettings = () => {
    const updatedParams = selectedTest.parameters.map(p => {
      if (p.code === drawerParamCode) {
        return {
          ...p,
          hasFormula: editHasFormula,
          formula: editHasFormula ? editFormula : "",
          narrativeTemplate: editNarrative,
          analyzerModel: editAnalyzerModel,
          analyzerChannel: editAnalyzerChannel,
          useMale: editUseMale,
          maleMin: editUseMale ? (editMaleMin !== "" ? Number(editMaleMin) : null) : null,
          maleMax: editUseMale ? (editMaleMax !== "" ? Number(editMaleMax) : null) : null,
          useFemale: editUseFemale,
          femaleMin: editUseFemale ? (editFemaleMin !== "" ? Number(editFemaleMin) : null) : null,
          femaleMax: editUseFemale ? (editFemaleMax !== "" ? Number(editFemaleMax) : null) : null,
          useInfant: editUseInfant,
          infantMin: editUseInfant ? (editInfantMin !== "" ? Number(editInfantMin) : null) : null,
          infantMax: editUseInfant ? (editInfantMax !== "" ? Number(editInfantMax) : null) : null,
          useChild: editUseChild,
          childMin: editUseChild ? (editChildMin !== "" ? Number(editChildMin) : null) : null,
          childMax: editUseChild ? (editChildMax !== "" ? Number(editChildMax) : null) : null,
          useAdult: editUseAdult,
          adultMin: editUseAdult ? (editAdultMin !== "" ? Number(editAdultMin) : null) : null,
          adultMax: editUseAdult ? (editAdultMax !== "" ? Number(editAdultMax) : null) : null,
          genderRanges: {
            maleMin: editUseMale ? Number(editMaleMin) || 0 : 0,
            maleMax: editUseMale ? Number(editMaleMax) || 0 : 0,
            femaleMin: editUseFemale ? Number(editFemaleMin) || 0 : 0,
            femaleMax: editUseFemale ? Number(editFemaleMax) || 0 : 0
          }
        };
      }
      return p;
    });

    const updatedTest = {
      ...selectedTest,
      parameters: updatedParams
    };

    const updatedCatalog = catalog.map(t => t.id === selectedTest.id ? updatedTest : t);
    setCatalog(updatedCatalog);
    setSelectedTest(updatedTest);
    setDrawerOpen(false);
  };

  // Toggle Included Tests in Profile Builder
  const handleToggleProfileTest = (testId) => {
    const alreadyIncluded = selectedTest.includedTestIds.includes(testId);
    const newIncluded = alreadyIncluded 
      ? selectedTest.includedTestIds.filter(id => id !== testId)
      : [...selectedTest.includedTestIds, testId];

    const updatedTest = {
      ...selectedTest,
      includedTestIds: newIncluded
    };

    const updatedCatalog = catalog.map(t => t.id === selectedTest.id ? updatedTest : t);
    setCatalog(updatedCatalog);
    setSelectedTest(updatedTest);
  };

  // Report Setup Tab Edit Handlers
  const handleReportSetupFieldChange = (field, val) => {
    const updatedTest = {
      ...selectedTest,
      [field]: val
    };
    const updatedCatalog = catalog.map(t => t.id === selectedTest.id ? updatedTest : t);
    setCatalog(updatedCatalog);
    setSelectedTest(updatedTest);
  };

  const handleToggleSignatureSlot = (sig) => {
    if (sig === "Default Pathologist (Lab Owner)") return;
    const alreadySelected = selectedTest.signatureSlots.includes(sig);
    const newSigs = alreadySelected 
      ? selectedTest.signatureSlots.filter(s => s !== sig)
      : [...selectedTest.signatureSlots, sig];

    handleReportSetupFieldChange("signatureSlots", newSigs);
  };

  // Pricing Tab Edit Handlers
  const handlePricingChange = (key, val) => {
    const updatedPricing = {
      ...selectedTest.pricing,
      [key]: Number(val) || 0
    };

    const updatedTest = {
      ...selectedTest,
      pricing: updatedPricing
    };

    const updatedCatalog = catalog.map(t => t.id === selectedTest.id ? updatedTest : t);
    setCatalog(updatedCatalog);
    setSelectedTest(updatedTest);
  };


  const handleSetDefaultTemplate = () => {
    const currentTemplateId = selectedTest.templateId || "";
    const updatedTest = {
      ...selectedTest,
      templateId: currentTemplateId
    };
    const updatedCatalog = catalog.map(t => t.id === selectedTest.id ? updatedTest : t);
    setCatalog(updatedCatalog);
    setSelectedTest(updatedTest);
    localStorage.setItem("synos_test_catalog", JSON.stringify(updatedCatalog));
    localStorage.setItem("synos_selected_test_id", selectedTest.id);
    setIsSavedSuccessfully(true);
    setTimeout(() => setIsSavedSuccessfully(false), 2500);
  };

  const handleSaveAll = async () => {
    // 1. Client-side uniqueness validation
    const codeToTestMap = new Map();
    for (const item of catalog) {
      const normCode = (item.code || "").trim().toUpperCase();
      if (!normCode) {
        alert(`Test name "${item.name}" must have a valid test code.`);
        return;
      }
      if (codeToTestMap.has(normCode)) {
        alert(`Duplicate test code detected: "${normCode}". Each test must have a unique code.`);
        return;
      }
      codeToTestMap.set(normCode, item);
    }

    for (const item of catalog) {
      const normCode = (item.code || "").trim().toUpperCase();
      // Find if a test with the same code already exists in the database
      const dbConflict = originalDbTests.find(
        dt => (dt.testCode || dt.TestCode || dt.code || "").toUpperCase() === normCode
      );

      if (dbConflict && dbConflict.isActive !== false) {
        const dbConflictId = dbConflict.testId || dbConflict.TestId || dbConflict.id;
        const isTempId = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);
        if (isTempId || item.id !== dbConflictId) {
          alert(`The test code "${normCode}" is already registered in the system (associated with test "${dbConflict.testName || dbConflict.TestName || dbConflict.name}").\n\nPlease use a unique code.`);
          return;
        }
      }
    }

    setIsLoadingTests(true);
    try {
      const currentCatalog = catalog.map(item => ({
        ...item,
        parameters: (item.parameters || []).map(p => {
          const minNum = p.minRange !== undefined && p.minRange !== null && p.minRange !== "" ? Number(p.minRange) : null;
          const maxNum = p.maxRange !== undefined && p.maxRange !== null && p.maxRange !== "" ? Number(p.maxRange) : null;
          return {
            ...p,
            minRange: minNum !== null && !isNaN(minNum) ? minNum : undefined,
            maxRange: maxNum !== null && !isNaN(maxNum) ? maxNum : undefined
          };
        })
      }));
      const dbTestsMap = new Map();
      originalDbTests.forEach(t => {
        const id = t.testId || t.TestId || t.id;
        if (id) dbTestsMap.set(id, t);
      });

      // 1. Handle Deletions
      const deletedTests = originalDbTests.filter(ot => {
        const otId = ot.testId || ot.TestId || ot.id;
        return otId && !currentCatalog.some(ct => ct.id === otId);
      });

      for (const dt of deletedTests) {
        const dtId = dt.testId || dt.TestId || dt.id;
        try {
          await AdminApi.deleteTest(dtId);
        } catch (err) {
          console.error(`Failed to delete test ${dtId}:`, err);
        }
      }

      // We will construct the updated catalog with persisted IDs
      let updatedCatalog = [];
      let updatedSelectedTest = selectedTest ? { ...selectedTest } : null;

      const mapToDto = (item) => {
        return {
          TestCode: item.code,
          TestName: item.name,
          Department: item.department || "Biochemistry",
          Category: (item.department === "Radiology" || item.department === "RAD") ? (item.category || "X-Ray") : (item.category || "General"),
          BasePrice: Number(item.basePrice) || 0,
          TAT_Hours: Number(item.tatHours || item.TAT_Hours) || 24,
          IsOutsourced: !!(item.isOutsourced || (item.outsource && item.outsource.enabled)),
          SpecimenTypeCode: (item.department === "Radiology" || item.department === "RAD") ? "NO_SPECIMEN" : (item.specimenTypeCode || "SERUM"),
          IsProfile: !!item.isProfile,
          Parameters: (item.parameters || []).map((p, idx) => ({
            ParameterCode: p.code,
            ParameterName: p.name,
            Unit: p.unit || null,
            DataType: p.dataType || (p.minRange !== undefined || p.maxRange !== undefined ? "Numeric" : "Text"),
            SortOrder: Number(p.sortOrder || idx + 1),
            Methodology: p.method || null,
            Formula: p.formula || null,
            IsCalculated: !!(p.hasFormula || p.formula),
            ReferenceRange: formatReferenceRange(p),
            UseMale: !!p.useMale,
            MaleMin: p.useMale && p.maleMin !== undefined && p.maleMin !== "" && p.maleMin !== null ? Number(p.maleMin) : null,
            MaleMax: p.useMale && p.maleMax !== undefined && p.maleMax !== "" && p.maleMax !== null ? Number(p.maleMax) : null,
            UseFemale: !!p.useFemale,
            FemaleMin: p.useFemale && p.femaleMin !== undefined && p.femaleMin !== "" && p.femaleMin !== null ? Number(p.femaleMin) : null,
            FemaleMax: p.useFemale && p.femaleMax !== undefined && p.femaleMax !== "" && p.femaleMax !== null ? Number(p.femaleMax) : null,
            UseInfant: !!p.useInfant,
            InfantMin: p.useInfant && p.infantMin !== undefined && p.infantMin !== "" && p.infantMin !== null ? Number(p.infantMin) : null,
            InfantMax: p.useInfant && p.infantMax !== undefined && p.infantMax !== "" && p.infantMax !== null ? Number(p.infantMax) : null,
            UseChild: !!p.useChild,
            ChildMin: p.useChild && p.childMin !== undefined && p.childMin !== "" && p.childMin !== null ? Number(p.childMin) : null,
            ChildMax: p.useChild && p.childMax !== undefined && p.childMax !== "" && p.childMax !== null ? Number(p.childMax) : null,
            UseAdult: !!p.useAdult,
            AdultMin: p.useAdult && p.adultMin !== undefined && p.adultMin !== "" && p.adultMin !== null ? Number(p.adultMin) : null,
            AdultMax: p.useAdult && p.adultMax !== undefined && p.adultMax !== "" && p.adultMax !== null ? Number(p.adultMax) : null
          })),
          IncludedTestCodes: (item.includedTestIds || []).map(childId => {
            const childTest = currentCatalog.find(t => t.id === childId);
            return childTest ? childTest.code : null;
          }).filter(Boolean)
        };
      };

      // Sort to save individual tests first, and profiles last to prevent blank child test placeholders
      const sortedCatalog = [...currentCatalog].sort((a, b) => {
        if (a.isProfile && !b.isProfile) return 1;
        if (!a.isProfile && b.isProfile) return -1;
        return 0;
      });

      const savedItemsMap = new Map();

      // 2. Handle Insertions and Updates in dependency-safe order
      for (const item of sortedCatalog) {
        // Find if a test with the same code already exists in the DB (active or inactive) to prevent unique index constraint errors
        const matchingDbTest = originalDbTests.find(
          dt => (dt.testCode || dt.TestCode || dt.code || "").toLowerCase() === item.code.toLowerCase()
        );

        const dbId = matchingDbTest ? (matchingDbTest.testId || matchingDbTest.TestId || matchingDbTest.id) : null;
        const hasValidDbId = dbId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dbId);

        const isExistingInDb = (dbTestsMap.has(item.id) && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)) || hasValidDbId;
        const targetId = isExistingInDb ? (dbTestsMap.has(item.id) ? item.id : dbId) : item.id;

        if (isExistingInDb) {
          const dto = {
            ...mapToDto(item),
            IsActive: item.isActive !== false
          };
          try {
            await AdminApi.updateTest(targetId, dto);
          } catch (err) {
            console.error(`Failed to update test ${targetId}:`, err);
          }
          
          const updatedItem = {
            ...item,
            id: targetId
          };
          savedItemsMap.set(item.id, updatedItem);

          if (selectedTest && (selectedTest.id === item.id || selectedTest.code === item.code)) {
            updatedSelectedTest = updatedItem;
          }
        } else {
          const dto = mapToDto(item);
          try {
            const createdTest = await AdminApi.createTest(dto);
            const returnedId = createdTest.testId || createdTest.TestId || createdTest.id;
            
            const newlyCreatedItem = {
              ...item,
              id: returnedId
            };
            savedItemsMap.set(item.id, newlyCreatedItem);

            if (selectedTest && (selectedTest.id === item.id || selectedTest.code === item.code)) {
              updatedSelectedTest = newlyCreatedItem;
            }
          } catch (err) {
            console.error(`Failed to create test ${item.code}:`, err);
            savedItemsMap.set(item.id, item);
          }
        }
      }

      // Reconstruct updatedCatalog in original UI order
      updatedCatalog = currentCatalog.map(item => savedItemsMap.get(item.id) || item);

      // 3. Fetch fresh database list and update state
      const freshDbTests = await AdminApi.getTests();
      setOriginalDbTests(freshDbTests || []);

      // 4. Update catalog and selected test states
      setCatalog(updatedCatalog);
      localStorage.setItem("synos_test_catalog", JSON.stringify(updatedCatalog));

      if (updatedSelectedTest) {
        const found = updatedCatalog.find(t => t.id === updatedSelectedTest.id);
        if (found) {
          updatedSelectedTest = found;
        }
        setSelectedTest(updatedSelectedTest);
        localStorage.setItem("synos_selected_test_id", updatedSelectedTest.id);
      }

      setIsSavedSuccessfully(true);
      setTimeout(() => setIsSavedSuccessfully(false), 2500);

    } catch (error) {
      console.error("Critical error during catalog sync:", error);
    } finally {
      setIsLoadingTests(false);
    }
  };

  const filteredCatalog = catalog.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === "All" || t.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="w-full lg:h-[calc(100vh-56px)] flex flex-col overflow-hidden px-6 pt-4 pb-6 space-y-4 animate-in fade-in duration-500 relative">
      
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5 shrink-0">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <Beaker className="w-6 h-6 text-synos-primary" />
            Test Master
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            Configure reference parameters, simple templates, and customer prices.
          </p>
        </div>

        <button
          id="btn-save-catalog-master"
          onClick={handleSaveAll}
          disabled={isLoadingTests}
          className="px-6 py-2.5 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold text-sm uppercase tracking-wider rounded-xl shadow-md shadow-synos-primary/10 active:scale-95 transition-all flex items-center gap-2 self-start md:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoadingTests ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Saving Changes...
            </>
          ) : isSavedSuccessfully ? (
            <>
              <Check className="w-4 h-4 text-white animate-bounce" /> Catalog Saved Successfully
            </>
          ) : (
            <>
              <Check className="w-4 h-4" /> Save Catalog Changes
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 min-h-0 overflow-hidden pb-4">
        
        {/* Left Panel: Test Catalog */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 shadow-sm lg:h-full min-h-0 overflow-hidden">
          <div className="flex items-center justify-between shrink-0">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Test Catalog</h3>
            <button 
              onClick={handleAddTest}
              className="p-1.5 bg-synos-primary/10 text-synos-primary border border-synos-primary/20 rounded-lg hover:bg-synos-primary hover:text-white transition-colors flex items-center gap-1 text-xs font-bold px-3"
            >
              <Plus className="w-3.5 h-3.5" /> Create
            </button>
          </div>

          <div className="relative shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              id="test-catalog-search-input"
              type="text"
              placeholder="Search tests..."
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-synos-primary/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Department Quick Filter Badges */}
          <div className="flex flex-wrap gap-1.5 pb-1 shrink-0">
            {departments.map(dept => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                  selectedDept === dept
                    ? "bg-synos-primary/15 border-synos-primary/30 text-synos-primary"
                    : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
              >
                {dept}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
            {filteredCatalog.map(test => (
              <div
                key={test.id}
                onClick={() => handleSelectTest(test)}
                className={cn(
                  "w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group cursor-pointer",
                  selectedTest.id === test.id
                    ? "bg-synos-primary/10 border-synos-primary/30 text-zinc-900 dark:text-white"
                    : "bg-white dark:bg-zinc-900/10 border-zinc-200 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <span className="font-bold text-sm tracking-tight text-zinc-805 dark:text-zinc-200 block truncate">{test.name}</span>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-bold">
                    <span className="bg-synos-primary/10 text-synos-primary border border-synos-primary/20 px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">{test.code}</span>
                    <span className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider truncate max-w-[90px]">{test.department}</span>
                    {test.isProfile && (
                      <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5">
                        <Layers className="w-2.5 h-2.5" /> Panel
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-400 dark:group-hover:text-zinc-800 dark:group-hover:text-zinc-200">₹{test.basePrice}</span>
                  <button 
                    onClick={(e) => handleDeleteTest(test.id, e)}
                    className="p-1 hover:bg-rose-500/10 text-zinc-500 dark:text-zinc-400 hover:text-rose-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete test"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-synos-primary translate-x-0 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
            {filteredCatalog.length === 0 && (
              <div className="p-8 text-center text-sm text-zinc-600 dark:text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                No matching tests found.
              </div>
            )}
          </div>
        </div>

        {/* Center Workspace & Editor Area */}
        <div className="lg:col-span-9 flex flex-col lg:h-full min-h-0 space-y-4 overflow-hidden">
          
          {/* Metadata Top Bar */}
          <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center justify-between shrink-0">
            <div className="flex-1 min-w-0 pr-4">
              {isEditingMetadata ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Test Name</label>
                    <input 
                      type="text" 
                      className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm w-full text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary" 
                      value={metaName}
                      onChange={(e) => setMetaName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Code</label>
                    <input 
                      type="text" 
                      className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm w-full text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary" 
                      value={metaCode}
                      onChange={(e) => setMetaCode(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Department</label>
                    <select
                      className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl px-2.5 py-2 text-sm w-full text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary"
                      value={metaDept}
                      onChange={(e) => setMetaDept(e.target.value)}
                    >
                      {departments.filter(d => d !== "All").map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  {(metaDept === "Radiology" || metaDept === "RAD") ? (
                    <div>
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Imaging Modality</label>
                      <select
                        className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-2 text-sm w-full text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary"
                        value={metaCategory}
                        onChange={(e) => setMetaCategory(e.target.value)}
                      >
                        <option value="X-Ray">X-Ray</option>
                        <option value="MRI">MRI</option>
                        <option value="CT Scan">CT Scan</option>
                        <option value="Ultrasound">Ultrasound</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Specimen Type</label>
                      <select
                        className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-2 text-sm w-full text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary"
                        value={metaSpecimenTypeCode}
                        onChange={(e) => setMetaSpecimenTypeCode(e.target.value)}
                      >
                        {SPECIMEN_TYPES.map(spec => (
                          <option key={spec.code} value={spec.code}>{spec.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="md:col-span-1 flex items-center gap-6 py-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={metaIsProfile}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setMetaIsProfile(checked);
                          setSelectedTest(prev => ({ ...prev, isProfile: checked }));
                          if (checked) {
                            setActiveTab("profile-builder");
                          } else {
                            if (activeTab === "profile-builder") {
                              setActiveTab("parameters");
                            }
                          }
                        }}
                        className="rounded border-zinc-300 text-synos-primary focus:ring-synos-primary w-4.5 h-4.5"
                      />
                      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Is Profile</span>
                    </label>
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-2">
                    <button 
                      onClick={() => {
                        setIsEditingMetadata(false);
                        const originalTest = catalog.find(t => t.id === selectedTest.id);
                        if (originalTest) {
                          setMetaIsProfile(originalTest.isProfile);
                          setSelectedTest(originalTest);
                          if (!originalTest.isProfile && activeTab === "profile-builder") {
                            setActiveTab("parameters");
                          }
                        }
                      }}
                      className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm rounded-xl font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveMetadata}
                      className="px-4 py-2 bg-synos-primary hover:bg-synos-primary/95 text-white text-sm rounded-xl font-bold transition-all"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight leading-tight">{selectedTest.name}</h2>
                    <span className="bg-synos-primary/10 text-synos-primary border border-synos-primary/20 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider font-mono">
                      {selectedTest.code}
                    </span>
                    {selectedTest.isProfile && (
                      <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-0.5">
                        <Layers className="w-3 h-3" /> Profile/Panel
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wider mt-1.5">
                    Department: {selectedTest.department} &bull; Base Price: ₹{selectedTest.basePrice} 
                    {(selectedTest.department === "Radiology" || selectedTest.department === "RAD") ? (
                      <> &bull; Modality: {selectedTest.category || "X-Ray"}</>
                    ) : (
                      <> &bull; Specimen: {selectedTest.specimenTypeCode || "SERUM"}</>
                    )}
                  </p>
                </div>
              )}
            </div>

            {!isEditingMetadata && (
              <button
                id="btn-edit-metadata-active"
                onClick={() => setIsEditingMetadata(true)}
                className="py-2.5 px-4 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 transition-all flex items-center gap-1.5 text-xs font-bold shadow-xs shrink-0"
              >
                <Edit2 className="w-4 h-4" /> Modify Details
              </button>
            )}
          </div>

          {/* Central Workflow Tab Switchers & Preview Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 pb-px gap-2 shrink-0">
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setActiveTab("parameters")}
                className={cn(
                  "px-5 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 -mb-px",
                  activeTab === "parameters"
                    ? "border-synos-primary text-synos-primary"
                    : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                )}
              >
                <Beaker className="w-4 h-4" /> Parameters
              </button>
              <button
                onClick={() => setActiveTab("report-setup")}
                className={cn(
                  "px-5 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 -mb-px",
                  activeTab === "report-setup"
                    ? "border-synos-primary text-synos-primary"
                    : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                )}
              >
                <FileText className="w-4 h-4" /> Report Setup
              </button>
              <button
                onClick={() => setActiveTab("pricing")}
                className={cn(
                  "px-5 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 -mb-px",
                  activeTab === "pricing"
                    ? "border-synos-primary text-synos-primary"
                    : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                )}
              >
                <IndianRupee className="w-4 h-4" /> Pricing
              </button>
              {selectedTest.isProfile && (
                <button
                  onClick={() => setActiveTab("profile-builder")}
                  className={cn(
                    "px-5 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 -mb-px",
                    activeTab === "profile-builder"
                      ? "border-synos-primary text-synos-primary"
                      : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                  )}
                >
                  <Layers className="w-4 h-4 text-amber-500 animate-pulse" /> Profile Builder
                </button>
              )}
            </div>

            {/* Checkbox of Live Renderer Layout Preview */}
            <div className="flex items-center gap-2 px-3 py-2 self-end sm:self-auto select-none">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={showLivePreview}
                  onChange={(e) => setShowLivePreview(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-700 dark:border-zinc-700 text-synos-primary focus:ring-synos-primary w-4.5 h-4.5"
                />
                <span>Live Preview Layout</span>
              </label>
            </div>
          </div>

          {/* Tab Workspaces */}
          <div className="flex-1 min-h-0 overflow-hidden">
                      {/* Tab: Parameters (Excel spreadsheet structure) */}
            {activeTab === "parameters" && (() => {
              const isRadiology = metaDept === "Radiology" || metaDept === "RAD";
              
              if (isRadiology) {
                const currentParams = selectedTest.parameters || [];
                let dictationParam = currentParams[0];
                if (!dictationParam) {
                  dictationParam = {
                    code: "FINDINGS",
                    name: "Findings & Impressions",
                    unit: "",
                    minRange: "",
                    maxRange: "",
                    method: "Dictation",
                    hasFormula: false,
                    formula: "",
                    analyzerModel: "",
                    analyzerChannel: "",
                    narrativeTemplate: selectedTest.interpretationComment || "",
                    genderRanges: {}
                  };
                }

                const handleRadiologyParamChange = (field, val) => {
                  const updatedParams = [...currentParams];
                  if (updatedParams.length === 0) {
                    updatedParams.push({
                      code: "FINDINGS",
                      name: "Findings & Impressions",
                      unit: "",
                      minRange: "",
                      maxRange: "",
                      method: "Dictation",
                      hasFormula: false,
                      formula: "",
                      analyzerModel: "",
                      analyzerChannel: "",
                      narrativeTemplate: "",
                      genderRanges: {}
                    });
                  }
                  
                  let finalVal = val;
                  if (field === 'code') {
                    finalVal = val.toUpperCase();
                  }

                  updatedParams[0] = {
                    ...updatedParams[0],
                    [field]: finalVal
                  };

                  const updatedTest = {
                    ...selectedTest,
                    parameters: updatedParams
                  };
                  const updatedCatalog = catalog.map(t => t.id === selectedTest.id ? updatedTest : t);
                  setCatalog(updatedCatalog);
                  setSelectedTest(updatedTest);
                };

                return (
                  <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6 lg:h-full lg:overflow-y-auto custom-scrollbar">
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                      <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-sm font-black text-indigo-950 dark:text-indigo-200 tracking-tight">Radiology Dictation & Narrative Mode</h4>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                          Radiology examinations are narrative-based and do not contain individual numerical parameters, units, or reference ranges. 
                          The editor below configures the **default findings template** loaded on the radiologist's terminal during dictation.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Parameter Code</label>
                          <input
                            type="text"
                            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm w-full text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary uppercase font-bold"
                            value={dictationParam.code}
                            onChange={(e) => handleRadiologyParamChange("code", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Parameter Name</label>
                          <input
                            type="text"
                            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm w-full text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary"
                            value={dictationParam.name}
                            onChange={(e) => handleRadiologyParamChange("name", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Methodology</label>
                          <input
                            type="text"
                            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm w-full text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary"
                            value={dictationParam.method || "Dictation"}
                            onChange={(e) => handleRadiologyParamChange("method", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 ml-1">Default Findings & Impression Template</label>
                          <button
                            onClick={() => {
                              const templateText = "NORMAL STUDY:\n\nFINDINGS:\n- Lungs and airways are clear.\n- Heart size is normal.\n- Pleural spaces are free.\n\nIMPRESSION:\nNormal chest study.";
                              handleRadiologyParamChange("narrativeTemplate", templateText);
                              handleReportSetupFieldChange("interpretationComment", templateText);
                            }}
                            className="text-[10px] text-synos-primary font-bold hover:underline flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" /> Pre-fill Normal Template
                          </button>
                        </div>
                        <textarea
                          rows="12"
                          className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm w-full text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary font-mono leading-relaxed"
                          placeholder="Type normal study findings template here..."
                          value={dictationParam.narrativeTemplate || ""}
                          onChange={(e) => {
                            handleRadiologyParamChange("narrativeTemplate", e.target.value);
                            handleReportSetupFieldChange("interpretationComment", e.target.value);
                          }}
                        />
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium ml-1">
                          This template serves as the initial layout when the radiologist begins a new dictation session for this study.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              const childParams = getCompiledProfileParameters(selectedTest, catalog);
              const childCodes = new Set(childParams.map(cp => cp.code));
              const nativeParams = (selectedTest.parameters || []).filter(np => !childCodes.has(np.code));
              const combinedParams = [...childParams, ...nativeParams];

              return (
                <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4 lg:h-full lg:overflow-y-auto custom-scrollbar">
                  {selectedTest.isProfile && (
                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4 flex items-start gap-3">
                      <Sliders className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <h4 className="text-xs font-extrabold text-amber-800 dark:text-amber-400">Profile Parameter Integration Mode</h4>
                        <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1 font-medium leading-relaxed">
                          This is a composite Profile/Panel test. The parameters highlighted with source badges (e.g. <span className="bg-zinc-100 dark:bg-zinc-850 px-1 py-0.5 rounded font-bold font-mono">Child Test</span>) are dynamically compiled from child tests selected in the **Profile Builder** tab.
                          You can click **Add Parameter Row** to define native profile-level custom or calculated parameters (which can use the child parameter codes in formulas!).
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Parameters Specification Grid</span>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 dark:text-zinc-600 dark:text-zinc-400 font-bold flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-synos-primary" /> Changes are instantly recorded.
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                          {selectedTest.isProfile && <th className="py-3 px-4 font-bold text-zinc-500 dark:text-zinc-400 text-xs uppercase w-[150px]">Source</th>}
                          <th className="py-3 px-4 font-bold text-zinc-500 dark:text-zinc-400 text-xs uppercase w-[100px]">Code</th>
                          <th className="py-3 px-4 font-bold text-zinc-500 dark:text-zinc-400 text-xs uppercase min-w-[170px]">Parameter Name</th>
                          <th className="py-3 px-4 font-bold text-zinc-500 dark:text-zinc-400 text-xs uppercase w-[80px]">Unit</th>
                          <th className="py-3 px-4 font-bold text-zinc-500 dark:text-zinc-400 text-xs uppercase w-[80px]">Min</th>
                          <th className="py-3 px-4 font-bold text-zinc-500 dark:text-zinc-400 text-xs uppercase w-[80px]">Max</th>
                          <th className="py-3 px-4 font-bold text-zinc-500 dark:text-zinc-400 text-xs uppercase w-[150px]">Ref Range (Text Override)</th>
                          <th className="py-3 px-4 font-bold text-zinc-500 dark:text-zinc-400 text-xs uppercase w-[130px]">Methodology</th>
                          <th className="py-3 px-4 font-bold text-zinc-500 dark:text-zinc-400 text-xs uppercase w-[120px] text-center">Settings</th>
                          <th className="py-3 px-4 font-bold text-zinc-500 dark:text-zinc-400 text-xs uppercase w-[50px] text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white/50 dark:bg-zinc-900/10">
                        {combinedParams.map((p, idx) => {
                          const isFromChild = !!p.isFromChild;
                          const nativeIdx = idx - childParams.length;

                          return (
                            <tr key={idx} className={cn("hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 group transition-colors", isFromChild && "bg-zinc-50/20 dark:bg-zinc-950/5")}>
                              {selectedTest.isProfile && (
                                <td className="py-2.5 px-4">
                                  {isFromChild ? (
                                    <span className="bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wide inline-block max-w-[130px] truncate" title={p.childTestName}>
                                      {p.childTestName}
                                    </span>
                                  ) : (
                                    <span className="bg-synos-primary/10 border border-synos-primary/25 text-synos-primary px-2 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wide inline-block">
                                      Profile Native
                                    </span>
                                  )}
                                </td>
                              )}
                              <td className="py-1.5 px-1.5">
                                <input
                                  type="text"
                                  readOnly={isFromChild}
                                  className={cn(
                                    "w-full bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-950 focus:ring-1 focus:ring-synos-primary outline-none px-3 py-2 rounded font-mono font-bold text-zinc-800 dark:text-zinc-200 text-sm uppercase",
                                    isFromChild && "text-zinc-400 dark:text-zinc-500 font-medium cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent"
                                  )}
                                  value={p.code ?? ""}
                                  onChange={(e) => !isFromChild && handleParamCellChange(nativeIdx, 'code', e.target.value)}
                                />
                              </td>
                              <td className="py-1.5 px-1.5">
                                <input
                                  type="text"
                                  readOnly={isFromChild}
                                  className={cn(
                                    "w-full bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-950 focus:ring-1 focus:ring-synos-primary outline-none px-3 py-2 rounded text-zinc-800 dark:text-zinc-200 font-medium text-sm",
                                    isFromChild && "text-zinc-400 dark:text-zinc-500 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent"
                                  )}
                                  value={p.name ?? ""}
                                  onChange={(e) => !isFromChild && handleParamCellChange(nativeIdx, 'name', e.target.value)}
                                />
                              </td>
                              <td className="py-1.5 px-1.5">
                                <input
                                  type="text"
                                  readOnly={isFromChild}
                                  className={cn(
                                    "w-full bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-950 focus:ring-1 focus:ring-synos-primary outline-none px-3 py-2 rounded text-zinc-650 dark:text-zinc-400 text-sm",
                                    isFromChild && "text-zinc-400 dark:text-zinc-500 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent"
                                  )}
                                  value={p.unit ?? ""}
                                  onChange={(e) => !isFromChild && handleParamCellChange(nativeIdx, 'unit', e.target.value)}
                                />
                              </td>
                              <td className="py-1.5 px-1.5">
                                <input
                                  type="text"
                                  readOnly={isFromChild}
                                  className={cn(
                                    "w-full bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-950 focus:ring-1 focus:ring-synos-primary outline-none px-3 py-2 rounded font-mono text-zinc-700 dark:text-zinc-350 text-sm",
                                    isFromChild && "text-zinc-400 dark:text-zinc-500 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent"
                                  )}
                                  value={p.minRange ?? ""}
                                  onChange={(e) => !isFromChild && handleParamCellChange(nativeIdx, 'minRange', e.target.value)}
                                />
                              </td>
                              <td className="py-1.5 px-1.5">
                                <input
                                  type="text"
                                  readOnly={isFromChild}
                                  className={cn(
                                    "w-full bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-950 focus:ring-1 focus:ring-synos-primary outline-none px-3 py-2 rounded font-mono text-zinc-700 dark:text-zinc-300 text-sm",
                                    isFromChild && "text-zinc-400 dark:text-zinc-500 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent"
                                  )}
                                  value={p.maxRange ?? ""}
                                  onChange={(e) => !isFromChild && handleParamCellChange(nativeIdx, 'maxRange', e.target.value)}
                                />
                              </td>
                              <td className="py-1.5 px-1.5">
                                <input
                                  type="text"
                                  readOnly={isFromChild}
                                  className={cn(
                                    "w-full bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-950 focus:ring-1 focus:ring-synos-primary outline-none px-3 py-2 rounded text-zinc-700 dark:text-zinc-300 text-sm",
                                    isFromChild && "text-zinc-400 dark:text-zinc-500 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent"
                                  )}
                                  placeholder={p.minRange !== undefined && p.maxRange !== undefined && p.minRange !== "" && p.maxRange !== "" && p.minRange !== null && p.maxRange !== null ? `${p.minRange} - ${p.maxRange}` : "e.g. 1.2 - 2.5 : 1"}
                                  value={p.referenceRange ?? ""}
                                  onChange={(e) => !isFromChild && handleParamCellChange(nativeIdx, 'referenceRange', e.target.value)}
                                />
                              </td>
                              <td className="py-1.5 px-1.5">
                                <input
                                  type="text"
                                  readOnly={isFromChild}
                                  className={cn(
                                    "w-full bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-950 focus:ring-1 focus:ring-synos-primary outline-none px-3 py-2 rounded text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 text-sm",
                                    isFromChild && "text-zinc-400 dark:text-zinc-500 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent"
                                  )}
                                  value={p.method ?? ""}
                                  onChange={(e) => !isFromChild && handleParamCellChange(nativeIdx, 'method', e.target.value)}
                                />
                              </td>
                              <td className="py-1.5 px-1.5 text-center">
                                <div className="flex justify-center items-center">
                                  {isFromChild ? (
                                    <button
                                      disabled
                                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-300 dark:text-zinc-700 cursor-not-allowed flex items-center justify-center"
                                      title={`Configured on child test: ${p.childTestName}`}
                                    >
                                      <Settings className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => openDrawer(p.code, p.hasFormula ? 'formula' : 'ranges')}
                                      className={cn(
                                        "p-1.5 rounded-lg border transition-all active:scale-90 flex items-center justify-center relative",
                                        p.hasFormula
                                          ? "bg-purple-500/10 border-purple-500/35 text-purple-600 dark:text-purple-400"
                                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-synos-primary hover:border-synos-primary/20"
                                      )}
                                      title={p.hasFormula ? `Calculated formula: ${p.formula}. Click to modify.` : "Configure calculations, reference ranges, analyzer mapping, and comments."}
                                    >
                                      <Settings className="w-4 h-4" />
                                      {p.hasFormula && (
                                        <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-[7px] font-semibold px-0.5 rounded-md scale-75 leading-none">
                                          fx
                                        </span>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="py-1.5 px-1.5 text-center">
                                {!isFromChild && (
                                  <button
                                    onClick={() => handleDeleteParameterRow(nativeIdx)}
                                    className="p-1.5 hover:bg-rose-500/10 text-zinc-500 dark:text-zinc-400 hover:text-rose-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center mx-auto"
                                    title="Delete parameter"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                    <button
                      onClick={handleAddParameterRow}
                      className="px-5 py-2.5 border border-dashed border-zinc-300 dark:border-zinc-800 text-zinc-500 hover:text-synos-primary hover:border-synos-primary/40 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-4.5 h-4.5" /> Add Parameter Row
                    </button>
                    <p className="text-xs text-zinc-400 font-medium">
                      Note: Click the settings icon to configure calculations, reference range overrides, analyzer channels, and narrative templates.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Tab: Report Setup (Simple and Live Preview) */}
            {activeTab === "report-setup" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch lg:h-full min-h-0 overflow-hidden">
                
                {/* Style Pickers Form */}
                <div className={cn(
                  "bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6 lg:h-full lg:overflow-y-auto custom-scrollbar",
                  showLivePreview ? "lg:col-span-6" : "lg:col-span-12"
                )}>
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Report Presentation Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block ml-1">Report design template</label>
                      <div className="flex gap-2">
                        <select
                          className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm flex-1 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary font-bold"
                          value={selectedTest.templateId || ""}
                          onChange={(e) => handleReportSetupFieldChange("templateId", e.target.value)}
                        >
                          <option value="">Default (Auto-detect by modality)</option>
                          {reportTemplatesList.map(template => (
                            <option key={template.id} value={template.id}>
                              {template.title} ({template.modality})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleSetDefaultTemplate}
                          className="px-4 py-2.5 bg-synos-primary hover:bg-synos-primary/95 text-white text-xs rounded-xl font-bold shadow-md shadow-synos-primary/10 transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-[0.98]"
                          title="Set current template selection as default for this test"
                        >
                          <Check className="w-3.5 h-3.5" /> Set As Default Template
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block ml-1">Report layout style</label>
                      <select
                        className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm w-full text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary"
                        value={selectedTest.reportStyle || "Standard A4"}
                        onChange={(e) => handleReportSetupFieldChange("reportStyle", e.target.value)}
                      >
                        <option value="Standard A4">Standard A4 Layout</option>
                        <option value="Modern Tabular">Modern Tabular (Compact)</option>
                        <option value="Two Column Grid">Two Column Profile Grid</option>
                        <option value="Descriptive Narrative">Descriptive Narrative Format</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block ml-1">Pathologist / technician signature slots</label>
                      <div className="grid grid-cols-2 gap-2">
                        {SIGNATURE_SLOT_PRESETS.map(sig => {
                          const isDefaultPathologist = sig === "Default Pathologist (Lab Owner)";
                          const isChecked = isDefaultPathologist || selectedTest.signatureSlots?.includes(sig);
                          return (
                            <label
                              key={sig}
                              className={cn(
                                "flex items-center gap-2.5 px-4 py-3 border rounded-xl select-none transition-all",
                                isDefaultPathologist
                                  ? "bg-synos-primary/10 border-synos-primary/20 text-synos-primary opacity-60 cursor-not-allowed"
                                  : "cursor-pointer hover:bg-zinc-100/50",
                                !isDefaultPathologist && isChecked && "bg-synos-primary/10 border-synos-primary/20 text-synos-primary",
                                !isDefaultPathologist && !isChecked && "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isDefaultPathologist}
                                onChange={() => handleToggleSignatureSlot(sig)}
                                className="hidden"
                              />
                              <CheckSquare className={cn("w-4.5 h-4.5 shrink-0", isChecked ? "text-synos-primary" : "text-zinc-400")} />
                              <span className="text-sm font-bold">{sig}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-4">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block ml-1">Presentation details</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedTest.showRange}
                            onChange={(e) => handleReportSetupFieldChange("showRange", e.target.checked)}
                            className="rounded border-zinc-300 text-synos-primary focus:ring-synos-primary w-4.5 h-4.5"
                          />
                          <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">Biological Reference Interval</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedTest.showMethod}
                            onChange={(e) => handleReportSetupFieldChange("showMethod", e.target.checked)}
                            className="rounded border-zinc-300 text-synos-primary focus:ring-synos-primary w-4.5 h-4.5"
                          />
                          <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">Diagnostic Methodology</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer col-span-1 md:col-span-2">
                          <input
                            type="checkbox"
                            checked={selectedTest.showInterpretation}
                            onChange={(e) => handleReportSetupFieldChange("showInterpretation", e.target.checked)}
                            className="rounded border-zinc-300 text-synos-primary focus:ring-synos-primary w-4.5 h-4.5"
                          />
                          <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">Interpretation Commentaries</span>
                        </label>
                      </div>

                      {selectedTest.showInterpretation && (
                        <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block ml-1">Interpretation commentary text</label>
                          <textarea
                            rows="4"
                            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm w-full text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary placeholder-zinc-400 font-medium"
                            placeholder="Type standard medical commentaries or test explanations to render inside report..."
                            value={selectedTest.interpretationComment ?? (selectedTest.parameters?.[0]?.narrativeTemplate ?? "")}
                            onChange={(e) => handleReportSetupFieldChange("interpretationComment", e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Preview Card */}
                {showLivePreview && (
                  <div className="lg:col-span-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-inner space-y-4 lg:h-full lg:overflow-y-auto custom-scrollbar flex flex-col min-h-0">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Live Renderer Layout Preview</span>
                        <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> PDF WYSIWYG
                        </span>
                      </div>
                      
                      {/* Segmented Mode Selector Toggle */}
                      <div className="flex bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-0.5 rounded-xl text-[10px] font-bold">
                        <button
                          onClick={() => setPreviewMode("digital")}
                          className={cn(
                            "px-3 py-1 rounded-lg transition-all",
                            previewMode === "digital" 
                              ? "bg-white dark:bg-zinc-800 shadow-sm text-synos-primary font-extrabold" 
                              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200"
                          )}
                        >
                          Digital
                        </button>
                        <button
                          onClick={() => setPreviewMode("physical")}
                          className={cn(
                            "px-3 py-1 rounded-lg transition-all",
                            previewMode === "physical" 
                              ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-800 dark:text-zinc-200 font-extrabold" 
                              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200"
                          )}
                        >
                          Physical
                        </button>
                      </div>
                    </div>

                    {/* High-Fidelity preview box */}
                    {(() => {
                      const activeTemplate = getActiveTemplate(selectedTest, reportTemplatesList);
                      const coords = getCoordinates(activeTemplate);
                      const hasTemplateColumns = activeTemplate.columns && activeTemplate.columns.length > 0;
                      const totalWeight = hasTemplateColumns ? activeTemplate.columns.reduce((sum, c) => sum + c.weight, 0) : 1;
                      const childParams = getCompiledProfileParameters(selectedTest, catalog);
                      const childCodes = new Set(childParams.map(cp => cp.code));
                      const nativeParams = (selectedTest.parameters || []).filter(np => !childCodes.has(np.code));
                      const displayParams = [...childParams, ...nativeParams];
                      return (
                        <div ref={containerRef} className="w-full overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-100 dark:bg-zinc-950 p-4 flex justify-center">
                          <div 
                            className="relative transition-all" 
                            style={{ 
                              width: `${794 * scale}px`, 
                              height: `${1123 * scale + 32}px`, 
                              overflow: "hidden" 
                            }}
                          >
                            <div 
                              id="report-a4-canvas"
                              className={cn(
                                activeTemplate.enableAbsolutePositioning 
                                  ? "text-zinc-900 relative select-none transition-all box-border overflow-hidden text-left" 
                                  : "bg-white text-zinc-900 shadow-2xl relative select-none transition-all box-border overflow-hidden text-left",
                                activeTemplate.density === "Compact" ? "font-sans" : "font-serif"
                              )}
                              style={{
                                width: "794px",
                                height: "1123px",
                                transform: `scale(${scale})`,
                                transformOrigin: "top left",
                                padding: activeTemplate.enableAbsolutePositioning ? 0 : `${activeTemplate.pagePadding ?? 24}px`,
                                borderWidth: activeTemplate.enableAbsolutePositioning ? 0 : `${activeTemplate.borderWidth ?? 1}px`,
                                borderStyle: activeTemplate.enableAbsolutePositioning ? "none" : (activeTemplate.borderStyle || "solid"),
                                borderColor: activeTemplate.enableAbsolutePositioning ? "transparent" : (activeTemplate.borderColor || "#e2e8f0"),
                                borderRadius: activeTemplate.enableAbsolutePositioning ? 0 : `${activeTemplate.borderRadius ?? 0}px`,
                                backgroundColor: activeTemplate.enableAbsolutePositioning 
                                  ? "transparent" 
                                  : (activeTemplate.bgType === "solid" ? (activeTemplate.bgColor || "#ffffff") : "#ffffff"),
                                position: "absolute",
                                top: 0,
                                left: 0
                              }}
                            >
                              
                              {/* Background Backdrop Master Artwork */}
                              {((previewMode === "digital") || (previewMode === "physical" && !activeTemplate.usePreprinted)) && activeTemplate.backgroundPath && (
                                <div 
                                  className="absolute inset-0 bg-cover bg-center pointer-events-none"
                                  style={{ 
                                    backgroundImage: `url(${activeTemplate.backgroundPath})`, 
                                    opacity: activeTemplate.bgImageOpacity ?? 0.05,
                                    zIndex: 0 
                                  }} 
                                />
                              )}

                              {/* Background Gradient layer */}
                              {((previewMode === "digital") || (previewMode === "physical" && !activeTemplate.usePreprinted)) && activeTemplate.bgType === "gradient" && (
                                <div 
                                  className="absolute inset-0 pointer-events-none"
                                  style={{ 
                                    backgroundImage: `linear-gradient(${activeTemplate.bgGradientAngle || 135}deg, ${activeTemplate.bgGradientStart || '#ffffff'}, ${activeTemplate.bgGradientEnd || '#f1f5f9'})`,
                                    zIndex: 0 
                                  }} 
                                />
                              )}

                              {/* Digital mode Watermark overlay */}
                              {((previewMode === "digital") || (previewMode === "physical" && !activeTemplate.usePreprinted)) && activeTemplate.includeBranding && (activeTemplate.includeWatermark ?? true) && activeTemplate.watermarkText && (
                                <div 
                                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none font-semibold font-mono tracking-wider"
                                  style={{ 
                                    opacity: activeTemplate.watermarkOpacity || 0.05, 
                                    color: '#000',
                                    fontSize: `${activeTemplate.watermarkSize || 32}px`,
                                    transform: `rotate(${activeTemplate.watermarkRotation ?? 12}deg)`,
                                    zIndex: 5
                                  }}
                                >
                                  {activeTemplate.watermarkText}
                                </div>
                              )}

                              {/* Content Box */}
                              <div className="relative z-10 w-full h-full flex flex-col justify-between">
                                <div>
                                  {/* Brand headers with custom logo, positioning, colors and fonts */}
                                  {((previewMode === "digital") || (previewMode === "physical" && !activeTemplate.usePreprinted)) && activeTemplate.includeBranding && (() => {
                                    const hasLogo = (activeTemplate.includeLogo ?? true) && !!activeTemplate.logoUrl;
                                    const hasTitle = activeTemplate.includeHeaderName ?? true;
                                    const hasSubtitle = activeTemplate.includeHeaderSubtitle ?? true;

                                    if (!hasLogo && !hasTitle && !hasSubtitle) return null;

                                    const logoEl = hasLogo ? (
                                      <img 
                                        src={activeTemplate.logoUrl} 
                                        alt="Logo" 
                                        style={{ width: `${activeTemplate.logoSize || 40}px`, height: 'auto', objectFit: 'contain' }}
                                        className="max-h-12 relative z-10"
                                      />
                                    ) : (
                                      (activeTemplate.includeLogo ?? true) ? (
                                        <div 
                                          className="rounded-lg flex items-center justify-center font-semibold text-white select-none relative z-10 animate-pulse"
                                          style={{
                                            width: `${activeTemplate.logoSize || 32}px`,
                                            height: `${activeTemplate.logoSize || 32}px`,
                                            backgroundColor: activeTemplate.brandNameColor || "#4f46e5",
                                            fontSize: `${Math.max(10, (activeTemplate.logoSize || 32) * 0.35)}px`
                                          }}
                                        >
                                          {(activeTemplate.brandNameText || activeTemplate.clinicName || "SY").substring(0, 2).toUpperCase()}
                                        </div>
                                      ) : null
                                    );

                                    const brandTextEl = (hasTitle || hasSubtitle) ? (
                                      <div className="relative z-10 text-left">
                                        {hasTitle && (
                                          <h4 
                                            style={{
                                              fontSize: `${activeTemplate.brandNameSize || 14}px`,
                                              fontWeight: activeTemplate.brandNameWeight || "900",
                                              color: activeTemplate.brandNameColor || "#1e1b4b"
                                            }}
                                            className="uppercase tracking-tight leading-tight"
                                          >
                                            {activeTemplate.brandNameText || activeTemplate.clinicName || "SynOS Diagnostics"}
                                          </h4>
                                        )}
                                        {hasSubtitle && (
                                          <p 
                                            style={{
                                              fontSize: `${activeTemplate.brandSubtitleSize || 8}px`,
                                              color: activeTemplate.brandSubtitleColor || "#71717a"
                                            }}
                                            className="font-medium mt-0.5 leading-none"
                                          >
                                            {activeTemplate.brandSubtitleText || "Accredited Diagnostics Lab"}
                                          </p>
                                        )}
                                      </div>
                                    ) : null;

                                    const dividerStyle = activeTemplate.showHeaderDivider !== false ? {
                                      borderBottomWidth: `${activeTemplate.headerDividerThickness ?? 2}px`,
                                      borderBottomStyle: activeTemplate.headerDividerStyle || "solid",
                                      borderBottomColor: activeTemplate.headerDividerColor || "#e2e8f0"
                                    } : {};

                                    if (activeTemplate.logoPosition === "Center") {
                                      return (
                                        <div className="w-full pb-2 mb-3 space-y-2.5 relative z-10" style={dividerStyle}>
                                          <div className="flex flex-col items-center text-center gap-1.5">
                                            {logoEl}
                                            {brandTextEl}
                                          </div>
                                        </div>
                                      );
                                    } else if (activeTemplate.logoPosition === "Right") {
                                      return (
                                        <div className="w-full pb-2 mb-3 flex justify-between items-stretch gap-4 relative z-10" style={dividerStyle}>
                                          <div className="w-[10px]" />
                                          <div className="flex items-center gap-2.5 text-right">
                                            {brandTextEl}
                                            {logoEl}
                                          </div>
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <div className="w-full pb-2 mb-3 flex justify-between items-stretch gap-4 relative z-10" style={dividerStyle}>
                                          <div className="flex items-center gap-2.5">
                                            {logoEl}
                                            {brandTextEl}
                                          </div>
                                        </div>
                                      );
                                    }
                                  })()}

                                  {/* Physical Preprinted top space indicators in non-absolute layout */}
                                  {!activeTemplate.enableAbsolutePositioning && previewMode === "physical" && activeTemplate.usePreprinted && (
                                    <div className="h-[90px] border border-dashed border-zinc-200 bg-zinc-50/50 rounded-lg flex flex-col justify-center items-center mb-6 relative z-10">
                                      <span className="text-[8px] font-semibold tracking-wider text-zinc-650">Physical pre-printed sheet header region</span>
                                      <span className="text-[7px] text-zinc-400 font-mono mt-0.5">Top Safe Margins: {activeTemplate.topMargin}mm (~90px gap)</span>
                                    </div>
                                  )}

                                  {/* Patient Info block */}
                                  {activeTemplate.enableAbsolutePositioning ? (
                                    <>
                                      {/* Invisible placeholders for future workflow binding - mapping structure */}
                                      <span className="hidden" data-patient-name-placeholder={"{" + "{" + "PATIENT_NAME" + "}" + "}"} />
                                      <span className="hidden" data-ref-doctor-placeholder={"{" + "{" + "REF_DOCTOR" + "}" + "}"} />
                                      <span className="hidden" data-age-sex-placeholder={"{" + "{" + "AGE_SEX" + "}" + "}"} />
                                      <span className="hidden" data-patient-id-placeholder={"{" + "{" + "PATIENT_ID" + "}" + "}"} />
                                      <span className="hidden" data-billing-date-placeholder={"{" + "{" + "BILLING_DATE" + "}" + "}"} />
                                      <span className="hidden" data-report-date-placeholder={"{" + "{" + "REPORT_DATE" + "}" + "}"} />                                      {/* 1. Patient Name */}
                                      <div
                                        style={{
                                          position: 'absolute',
                                          left: `${coords.patientNameX}mm`,
                                          top: `${coords.patientNameY}mm`,
                                          cursor: 'grab',
                                          zIndex: 20
                                        }}
                                        onPointerDown={(e) => handleStartDrag(e, activeTemplate.id, 'patientNameX', 'patientNameY', coords.patientNameX, coords.patientNameY)}
                                        className="bg-transparent border-0 shadow-none p-1 text-[10px] text-zinc-850 dark:text-zinc-200 transition-all select-none hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 rounded"
                                      >
                                        <span className="font-bold text-zinc-800 dark:text-zinc-100">Rajesh Kumar</span>
                                      </div>
 
                                      {/* 2. Age / Sex */}
                                      <div
                                        style={{
                                          position: 'absolute',
                                          left: `${coords.patientAgeSexX}mm`,
                                          top: `${coords.patientAgeSexY}mm`,
                                          cursor: 'grab',
                                          zIndex: 20
                                        }}
                                        onPointerDown={(e) => handleStartDrag(e, activeTemplate.id, 'patientAgeSexX', 'patientAgeSexY', coords.patientAgeSexX, coords.patientAgeSexY)}
                                        className="bg-transparent border-0 shadow-none p-1 text-[10px] text-zinc-850 dark:text-zinc-200 transition-all select-none hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 rounded"
                                      >
                                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">32Y / Male</span>
                                      </div>
 
                                      {/* 3. Ref Doctor */}
                                      <div
                                        style={{
                                          position: 'absolute',
                                          left: `${coords.refDoctorX}mm`,
                                          top: `${coords.refDoctorY}mm`,
                                          cursor: 'grab',
                                          zIndex: 20
                                        }}
                                        onPointerDown={(e) => handleStartDrag(e, activeTemplate.id, 'refDoctorX', 'refDoctorY', coords.refDoctorX, coords.refDoctorY)}
                                        className="bg-transparent border-0 shadow-none p-1 text-[10px] text-zinc-850 dark:text-zinc-200 transition-all select-none hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 rounded"
                                      >
                                        <span className="font-bold text-zinc-850 dark:text-zinc-100">Dr. S. Sharma, MD</span>
                                      </div>
 
                                      {/* 4. Patient ID */}
                                      <div
                                        style={{
                                          position: 'absolute',
                                          left: `${coords.patientIdX}mm`,
                                          top: `${coords.patientIdY}mm`,
                                          cursor: 'grab',
                                          zIndex: 20
                                        }}
                                        onPointerDown={(e) => handleStartDrag(e, activeTemplate.id, 'patientIdX', 'patientIdY', coords.patientIdX, coords.patientIdY)}
                                        className="bg-transparent border-0 shadow-none p-1 text-[10px] text-zinc-850 dark:text-zinc-200 transition-all select-none hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 rounded"
                                      >
                                        <span className="font-semibold font-mono text-zinc-700 dark:text-zinc-300">PID-2026-8940</span>
                                      </div>
 
                                      {/* 5. Billing Date */}
                                      <div
                                        style={{
                                          position: 'absolute',
                                          left: `${coords.billingDateX}mm`,
                                          top: `${coords.billingDateY}mm`,
                                          cursor: 'grab',
                                          zIndex: 20
                                        }}
                                        onPointerDown={(e) => handleStartDrag(e, activeTemplate.id, 'billingDateX', 'billingDateY', coords.billingDateX, coords.billingDateY)}
                                        className="bg-transparent border-0 shadow-none p-1 text-[10px] text-zinc-850 dark:text-zinc-200 transition-all select-none hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 rounded"
                                      >
                                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">20-May-2026</span>
                                      </div>
 
                                      {/* 6. Report Date */}
                                      <div
                                        style={{
                                          position: 'absolute',
                                          left: `${coords.reportDateX}mm`,
                                          top: `${coords.reportDateY}mm`,
                                          cursor: 'grab',
                                          zIndex: 20
                                        }}
                                        onPointerDown={(e) => handleStartDrag(e, activeTemplate.id, 'reportDateX', 'reportDateY', coords.reportDateX, coords.reportDateY)}
                                        className="bg-transparent border-0 shadow-none p-1 text-[10px] text-zinc-850 dark:text-zinc-200 transition-all select-none hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 rounded"
                                      >
                                        <span className="font-bold text-zinc-800 dark:text-zinc-100">22-May-2026</span>
                                      </div>
                                    </>
                                  ) : (
                                    /* Default/Legacy Patient Info block */
                                    <div
                                      style={{
                                        marginTop: '10px',
                                        marginBottom: '15px'
                                      }}
                                      className="transition-all"
                                    >
                                      <div className="flex justify-between items-center text-[9px] border-b border-zinc-150 pb-1.5 font-semibold text-zinc-650 dark:text-zinc-400">
                                        <div>
                                          <span className="font-bold text-zinc-800">Patient:</span> Rajesh Kumar, M / 32Y
                                        </div>
                                        <div>
                                          <span className="font-bold text-zinc-800">Referrer:</span> Dr. S. Sharma, MD
                                        </div>
                                        <div>
                                          <span className="font-bold text-zinc-800">Date:</span> 20-May-2026
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* 7. Test Title */}
                                  {activeTemplate.enableAbsolutePositioning ? (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        left: `${coords.testTitleX}mm`,
                                        top: `${coords.testTitleY}mm`,
                                        cursor: 'grab',
                                        zIndex: 20
                                      }}
                                      onPointerDown={(e) => handleStartDrag(e, activeTemplate.id, 'testTitleX', 'testTitleY', coords.testTitleX, coords.testTitleY)}
                                      className="bg-transparent border-0 shadow-none p-1 transition-all select-none hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 rounded animate-in fade-in duration-200"
                                    >
                                      <div className="font-extrabold text-[10px] text-zinc-900 uppercase">
                                        {selectedTest.name} ({selectedTest.code})
                                      </div>
                                    </div>
                                  ) : null}

                                  {/* 8. Results Table */}
                                  <div
                                    style={activeTemplate.enableAbsolutePositioning ? {
                                      position: 'absolute',
                                      top: `${coords.resultsTableY}mm`,
                                      left: `${coords.resultsTableX}mm`,
                                      width: `calc(210mm - ${(activeTemplate.leftRightMargin ?? 15) * 2}mm)`,
                                      cursor: 'grab',
                                      zIndex: 10
                                    } : {
                                      marginTop: '20px',
                                      flex: 1
                                    }}
                                    onPointerDown={activeTemplate.enableAbsolutePositioning ? (e) => handleStartDrag(e, activeTemplate.id, 'resultsTableX', 'resultsTableY', coords.resultsTableX, coords.resultsTableY) : undefined}
                                    className={cn(
                                      "transition-all",
                                      activeTemplate.enableAbsolutePositioning && "hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 p-1 rounded"
                                    )}
                                  >
                                    {!activeTemplate.enableAbsolutePositioning && (
                                      <div className="font-extrabold text-[10px] text-zinc-900 uppercase mb-1">{selectedTest.name} ({selectedTest.code})</div>
                                    )}
                                                                      {selectedTest.reportStyle === "Two Column Grid" ? (
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[8px] mt-2">
                                        {displayParams && displayParams.map((p, i) => (
                                          <div key={i} className="border-b border-zinc-200 pb-1 flex justify-between items-center">
                                            <div>
                                              <span className="font-semibold block text-[8px]">{p.name}</span>
                                              {selectedTest.showMethod && p.method && <span className="text-[6px] text-zinc-655 italic">{p.method}</span>}
                                            </div>
                                            <div className="text-right">
                                              <span className="font-mono font-bold text-[8px]">{getParamMidpoint(p)} {p.unit}</span>
                                              {selectedTest.showRange && <span className="text-[6px] text-zinc-550 block">Ref: {formatReferenceRange(p)}</span>}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : selectedTest.reportStyle === "Descriptive Narrative" ? (
                                      <div className="space-y-2 text-[8px] text-zinc-700 mt-2">
                                        {displayParams && displayParams.map((p, i) => (
                                          <div 
                                            key={i} 
                                            className={cn(
                                              activeTemplate.enableAbsolutePositioning 
                                                ? "bg-transparent p-0 pb-2 border-b border-zinc-200 shadow-none rounded-none" 
                                                : "bg-zinc-50 p-2 rounded-lg border border-zinc-200"
                                            )}
                                          >
                                            <span className="font-bold text-zinc-900 block text-[8px]">{p.name} ({p.code})</span>
                                            <p className="mt-1 leading-normal text-[7.5px]">
                                              The analyte value is measured at <strong className="font-mono text-zinc-900">{getParamMidpoint(p)} {p.unit}</strong>.
                                              {selectedTest.showRange && ` The physiological biological reference interval is ${formatReferenceRange(p)} ${p.unit}.`}
                                              {selectedTest.showMethod && p.method && ` Methodology used for estimation: ${p.method}.`}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    ) : hasTemplateColumns ? (
                                      /* Dynamic Tabular layout utilizing active template's columns configuration */
                                      <table className={cn(
                                        "w-full text-left text-[8px] border-collapse mt-2",
                                        selectedTest.reportStyle === "Standard A4" && !activeTemplate.enableAbsolutePositioning && "border border-zinc-200"
                                      )}>
                                        <thead>
                                          <tr className={cn(
                                            selectedTest.reportStyle === "Modern Tabular"
                                              ? (activeTemplate.enableAbsolutePositioning ? "bg-transparent text-zinc-600 font-bold border-t border-b border-zinc-200" : "bg-zinc-100 text-zinc-600 font-bold border-t border-b border-zinc-200")
                                              : (activeTemplate.enableAbsolutePositioning ? "bg-transparent border-t border-b border-zinc-200 text-zinc-400 font-bold" : "bg-zinc-50 border-b border-zinc-200 text-zinc-400 font-bold")
                                          )}>
                                            {activeTemplate.columns.map((col, idx) => (
                                              <th
                                                key={idx}
                                                className={cn(
                                                  "py-1 px-2",
                                                  selectedTest.reportStyle === "Standard A4" && "border-r border-zinc-200 last:border-r-0",
                                                  col.alignment === "Left" ? "text-left" : col.alignment === "Center" ? "text-center" : "text-right"
                                                )}
                                                style={{ width: `${(col.weight / totalWeight) * 100}%` }}
                                              >
                                                {col.title}
                                              </th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-200 text-zinc-800">
                                          {displayParams && displayParams.map((p, i) => (
                                            <tr 
                                              key={i} 
                                              className={cn(
                                                selectedTest.reportStyle === "Modern Tabular" && i % 2 === 1 && !activeTemplate.enableAbsolutePositioning && "bg-zinc-50/30"
                                              )}
                                            >
                                              {activeTemplate.columns.map((col, idx) => {
                                                let text = "";
                                                if (col.code === "Parameter") text = p.name;
                                                else if (col.code === "Value") {
                                                  text = getParamMidpoint(p);
                                                }
                                                else if (col.code === "Unit") text = p.unit;
                                                else if (col.code === "ReferenceRange") text = selectedTest.showRange ? formatReferenceRange(p) : "";
                                                else if (col.code === "Methodology") text = selectedTest.showMethod ? p.method : "";

                                                return (
                                                  <td
                                                    key={idx}
                                                    className={cn(
                                                      "py-1 px-2",
                                                      selectedTest.reportStyle === "Standard A4" && "border-r border-zinc-200 last:border-r-0",
                                                      col.bold && "font-bold text-zinc-950",
                                                      col.alignment === "Left" ? "text-left" : col.alignment === "Center" ? "text-center" : "text-right"
                                                    )}
                                                  >
                                                    {text}
                                                  </td>
                                                );
                                              })}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    ) : (
                                      /* Fallback to simple tables if template columns are missing */
                                      <table className={cn(
                                        "w-full text-left text-[8px] border-collapse mt-2",
                                        selectedTest.reportStyle === "Standard A4" && !activeTemplate.enableAbsolutePositioning && "border border-zinc-200"
                                      )}>
                                        <thead>
                                          <tr className={cn(
                                            selectedTest.reportStyle === "Modern Tabular"
                                              ? (activeTemplate.enableAbsolutePositioning ? "bg-transparent text-zinc-600 font-bold border-t border-b border-zinc-200" : "bg-zinc-100 text-zinc-600 font-bold border-t border-b border-zinc-200")
                                              : (activeTemplate.enableAbsolutePositioning ? "bg-transparent border-t border-b border-zinc-200 text-zinc-400 font-bold" : "bg-zinc-50 border-b border-zinc-200 text-zinc-400 font-bold")
                                          )}>
                                            <th className={cn("py-1 px-2", selectedTest.reportStyle === "Standard A4" && !activeTemplate.enableAbsolutePositioning && "border-r border-zinc-200")}>Analyte</th>
                                            <th className={cn("py-1 px-2 text-center", selectedTest.reportStyle === "Standard A4" && !activeTemplate.enableAbsolutePositioning && "border-r border-zinc-200")}>Value</th>
                                            <th className={cn("py-1 px-2 text-center", selectedTest.reportStyle === "Standard A4" && !activeTemplate.enableAbsolutePositioning && "border-r border-zinc-200")}>Unit</th>
                                            {selectedTest.showRange && <th className={cn("py-1 px-2 text-right", selectedTest.reportStyle === "Standard A4" && !activeTemplate.enableAbsolutePositioning && "border-r border-zinc-200")}>Reference Interval</th>}
                                            {selectedTest.showMethod && <th className="py-1 px-2 text-right">Methodology</th>}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-200 text-zinc-800">
                                          {displayParams && displayParams.map((p, i) => (
                                            <tr 
                                              key={i} 
                                              className={cn(
                                                selectedTest.reportStyle === "Modern Tabular" && i % 2 === 1 && !activeTemplate.enableAbsolutePositioning && "bg-zinc-50/30"
                                              )}
                                            >
                                              <td className={cn("py-1 px-2 font-semibold", selectedTest.reportStyle === "Standard A4" && !activeTemplate.enableAbsolutePositioning && "border-r border-zinc-200")}>{p.name}</td>
                                              <td className={cn("py-1 px-2 text-center font-mono font-bold", selectedTest.reportStyle === "Standard A4" && !activeTemplate.enableAbsolutePositioning && "border-r border-zinc-200")}>{getParamMidpoint(p)}</td>
                                              <td className={cn("py-1 px-2 text-center font-mono text-zinc-500", selectedTest.reportStyle === "Standard A4" && !activeTemplate.enableAbsolutePositioning && "border-r border-zinc-200")}>{p.unit}</td>
                                              {selectedTest.showRange && (
                                                <td className={cn("py-1 px-2 text-right font-mono text-zinc-650", selectedTest.reportStyle === "Standard A4" && !activeTemplate.enableAbsolutePositioning && "border-r border-zinc-200")}>
                                                   {formatReferenceRange(p)}
                                                </td>
                                              )}
                                              {selectedTest.showMethod && (
                                                <td className="py-1 px-2 text-right text-zinc-650 italic text-[6.5px]">{p.method}</td>
                                              )}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}

                                    {/* Interpretations commentaries in legacy mode */}
                                    {!activeTemplate.enableAbsolutePositioning && selectedTest.showInterpretation && (selectedTest.interpretationComment || (displayParams && displayParams[0]?.narrativeTemplate)) && (
                                      <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 mt-3 text-left">
                                        <span className="font-bold block text-[7px] text-zinc-500 uppercase tracking-wide">Commentaries & Remarks</span>
                                        <p className="text-[7.5px] italic text-zinc-655 mt-0.5 leading-normal">
                                          {selectedTest.interpretationComment ?? displayParams[0]?.narrativeTemplate}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {/* 9. Interpretation Comments (Draggable absolute position mode) */}
                                  {activeTemplate.enableAbsolutePositioning && selectedTest.showInterpretation && (selectedTest.interpretationComment || (displayParams && displayParams[0]?.narrativeTemplate)) && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        top: `${coords.interpretationY}mm`,
                                        left: `${coords.interpretationX}mm`,
                                        width: `calc(210mm - ${(activeTemplate.leftRightMargin ?? 15) * 2}mm)`,
                                        cursor: 'grab',
                                        zIndex: 10
                                      }}
                                      onPointerDown={(e) => handleStartDrag(e, activeTemplate.id, 'interpretationX', 'interpretationY', coords.interpretationX, coords.interpretationY)}
                                      className="bg-transparent border-0 shadow-none p-1 transition-all select-none hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 rounded animate-in fade-in duration-200"
                                    >
                                      <div className="bg-transparent p-0 border-t border-dashed border-zinc-200 text-left pt-2">
                                        <span className="font-bold block text-[7px] text-zinc-500 uppercase tracking-wide">Commentaries & Remarks</span>
                                        <p className="text-[7.5px] italic text-zinc-655 mt-0.5 leading-normal">
                                          {selectedTest.interpretationComment ?? displayParams[0]?.narrativeTemplate}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>

                              {/* Footer & Signatures Region */}
                              <div>
                                {/* 10. Signature Area */}
                                {(activeTemplate.includeSignatures ?? true) && selectedTest.signatureSlots && selectedTest.signatureSlots.length > 0 && (
                                  <div 
                                    style={activeTemplate.enableAbsolutePositioning ? {
                                      position: 'absolute',
                                      bottom: `${coords.signatureY}mm`,
                                      left: `${coords.signatureX}mm`,
                                      width: `calc(210mm - ${(activeTemplate.leftRightMargin ?? 15) * 2}mm)`,
                                      cursor: 'grab',
                                      zIndex: 10
                                    } : {
                                      marginTop: '30px'
                                    }}
                                    onPointerDown={activeTemplate.enableAbsolutePositioning ? (e) => handleStartDrag(e, activeTemplate.id, 'signatureX', 'signatureY', coords.signatureX, coords.signatureY, true) : undefined}
                                    className={cn(
                                      "grid grid-cols-3 gap-6 pt-4 border-t border-dashed border-zinc-200 transition-all text-center",
                                      activeTemplate.enableAbsolutePositioning && "hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 p-1 rounded"
                                    )}
                                  >
                                    {selectedTest.signatureSlots.map((sig, sigIdx) => (
                                      <div key={sigIdx} className="text-center min-h-[45px] flex flex-col justify-end">
                                        {((previewMode === "digital") || (previewMode === "physical" && !activeTemplate.usePreprinted)) && activeTemplate.includeBranding && (
                                          <span className="font-mono text-[7px] text-zinc-500 italic block mb-0.5">/Signed digitally/</span>
                                        )}
                                        <div className="border-t border-zinc-300 pt-1 text-[8px] font-semibold text-zinc-650">
                                          {sig}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Physical Preprinted Bottom Margins indicator in non-absolute layout */}
                                {!activeTemplate.enableAbsolutePositioning && previewMode === "physical" && activeTemplate.usePreprinted && (
                                  <div className="h-[70px] border border-dashed border-zinc-200 bg-zinc-50/50 rounded-lg flex flex-col justify-center items-center mt-4 relative z-10">
                                    <span className="text-[8px] font-semibold tracking-wider text-zinc-600">Physical pre-printed sheet region</span>
                                    <span className="text-[7px] text-zinc-400 font-mono mt-0.5">Bottom Safe Margins: {activeTemplate.bottomMargin}mm (~70px gap)</span>
                                  </div>
                                )}

                                {/* Digital mode Footer bar */}
                                {((previewMode === "digital") || (previewMode === "physical" && !activeTemplate.usePreprinted)) && activeTemplate.includeBranding && (activeTemplate.includeFooter ?? true) && activeTemplate.footerText && (
                                  <div 
                                    style={activeTemplate.enableAbsolutePositioning ? {
                                      position: 'absolute',
                                      bottom: '8mm',
                                      left: `${activeTemplate.leftRightMargin ?? 15}mm`,
                                      width: `calc(210mm - ${(activeTemplate.leftRightMargin ?? 15) * 2}mm)`,
                                      zIndex: 10
                                    } : {}}
                                    className="mt-4 pt-2 border-t border-zinc-200 text-center text-[7px] text-zinc-400 font-medium"
                                  >
                                    {activeTemplate.footerText}
                                  </div>
                                )}
                              </div>
                              </div>

                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
            {/* Tab: Pricing */}
            {activeTab === "pricing" && (
              <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-6 lg:h-full lg:overflow-y-auto custom-scrollbar">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Tiered Pricing Catalog Setup</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block ml-1">Base price (global default)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">₹</span>
                      <input
                        type="number"
                        className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm w-full text-zinc-900 dark:text-zinc-100 font-bold outline-none focus:ring-1 focus:ring-synos-primary"
                        value={selectedTest.basePrice || 0}
                        onChange={(e) => {
                          const updatedTest = { ...selectedTest, basePrice: Number(e.target.value) || 0 };
                          setCatalog(catalog.map(t => t.id === selectedTest.id ? updatedTest : t));
                          setSelectedTest(updatedTest);
                        }}
                      />
                    </div>
                    <p className="text-xs text-zinc-400 leading-tight">Used as standard retail rate when no branch overrides are present.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block ml-1">Branch A clinic price</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">₹</span>
                      <input
                        type="number"
                        className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm w-full text-zinc-900 dark:text-zinc-100 font-bold outline-none focus:ring-1 focus:ring-synos-primary"
                        value={selectedTest.pricing?.branchA || 0}
                        onChange={(e) => handlePricingChange("branchA", e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-zinc-400 leading-tight">Pricing automatically applied to orders originating at Branch A.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block ml-1">Branch B diagnostic price</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">₹</span>
                      <input
                        type="number"
                        className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm w-full text-zinc-900 dark:text-zinc-100 font-bold outline-none focus:ring-1 focus:ring-synos-primary"
                        value={selectedTest.pricing?.branchB || 0}
                        onChange={(e) => handlePricingChange("branchB", e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-zinc-400 leading-tight">Pricing automatically applied to orders originating at Branch B.</p>
                  </div>
                </div>

                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5">
                  <div className="max-w-md space-y-3 bg-zinc-50 dark:bg-zinc-950 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block">Corporate / B2B Referral Partner Price</span>
                    <div className="flex gap-4 items-center">
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">₹</span>
                        <input
                          type="number"
                          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm w-full text-zinc-900 dark:text-zinc-100 font-bold outline-none focus:ring-1 focus:ring-synos-primary"
                          value={selectedTest.pricing?.corporate || 0}
                          onChange={(e) => handlePricingChange("corporate", e.target.value)}
                        />
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-snug">
                        <span className="font-bold block text-zinc-600 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400">Default Corporate B2B Tier</span>
                        Applied when diagnostic requests are billed directly to diagnostic referral networks.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Profile Builder (Conditional) */}
            {activeTab === "profile-builder" && selectedTest.isProfile && (
              <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4 lg:h-full lg:overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Compose Panel / Profiles</h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Select the individual tests that compile into this comprehensive panel package.</p>
                  </div>
                  <span className="bg-amber-500/10 text-amber-500 border border-amber-500/25 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                    {selectedTest.includedTestIds?.length || 0} Tests Selected
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {catalog
                    .filter(t => !t.isProfile)
                    .map(test => {
                      const isIncluded = selectedTest.includedTestIds?.includes(test.id);
                      return (
                        <div
                          key={test.id}
                          onClick={() => handleToggleProfileTest(test.id)}
                          className={cn(
                            "p-3 rounded-xl border cursor-pointer select-none transition-all flex items-center justify-between group",
                            isIncluded
                              ? "bg-amber-500/5 border-amber-500/30 text-zinc-800 dark:text-zinc-250"
                              : "bg-zinc-50 dark:bg-zinc-900/10 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100/50"
                          )}
                        >
                          <div>
                            <span className="font-bold text-xs block text-zinc-800 dark:text-zinc-200">{test.name}</span>
                            <span className="text-[9px] font-bold text-zinc-400 mt-1 uppercase tracking-wider bg-zinc-200/50 dark:bg-zinc-800 px-1.5 py-0.5 rounded inline-block">{test.code}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-400 font-semibold">{test.parameters?.length || 0} Parameters</span>
                            <div className={cn(
                              "w-4 h-4 rounded-md border flex items-center justify-center transition-all",
                              isIncluded ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-300 dark:border-zinc-700"
                            )}>
                              {isIncluded && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Drawer Slide-Over (Contextual Advanced Settings) */}
      <div className={cn(
        "fixed top-12 bottom-0 right-0 z-[100] w-full max-w-[360px] bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl transition-all duration-300 ease-in-out transform flex flex-col justify-between",
        drawerOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex-1 flex flex-col min-h-0">
          {/* Drawer Header */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/20">
            <div>
              <span className="bg-synos-primary/10 text-synos-primary border border-synos-primary/20 px-2 py-0.5 rounded text-[9px] font-mono font-semibold">
                {drawerParamCode}
              </span>
              <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mt-1">Advanced Parameter settings</h3>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:bg-zinc-950 rounded-lg text-zinc-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Navigation */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-900/10">
            <button
              onClick={() => setDrawerMode("formula")}
              className={cn(
                "flex-1 py-2 text-[10px] font-semibold tracking-wide border-b-2 text-center transition-all",
                drawerMode === "formula" ? "border-synos-primary text-synos-primary" : "border-transparent text-zinc-400 dark:text-zinc-500"
              )}
            >
              Calculations
            </button>
            <button
              onClick={() => setDrawerMode("ranges")}
              className={cn(
                "flex-1 py-2 text-[10px] font-semibold tracking-wide border-b-2 text-center transition-all",
                drawerMode === "ranges" ? "border-synos-primary text-synos-primary" : "border-transparent text-zinc-400 dark:text-zinc-500"
              )}
            >
              Overrides
            </button>
            <button
              onClick={() => setDrawerMode("analyzer")}
              className={cn(
                "flex-1 py-2 text-[10px] font-semibold tracking-wide border-b-2 text-center transition-all",
                drawerMode === "analyzer" ? "border-synos-primary text-synos-primary" : "border-transparent text-zinc-400 dark:text-zinc-500"
              )}
            >
              Analyzer
            </button>
            <button
              onClick={() => setDrawerMode("narrative")}
              className={cn(
                "flex-1 py-2 text-[10px] font-semibold tracking-wide border-b-2 text-center transition-all",
                drawerMode === "narrative" ? "border-synos-primary text-synos-primary" : "border-transparent text-zinc-400 dark:text-zinc-500"
              )}
            >
              Narrative
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* Drawer context: formula editor */}
            {drawerMode === "formula" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 block">Calculation expression</label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">
                    <input
                      type="checkbox"
                      checked={editHasFormula}
                      onChange={(e) => setEditHasFormula(e.target.checked)}
                      className="rounded border-zinc-300 text-synos-primary focus:ring-synos-primary w-3.5 h-3.5"
                    />
                    Enable Calculation
                  </label>
                </div>

                {editHasFormula ? (
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-150">
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs w-full text-zinc-900 dark:text-zinc-100 font-mono outline-none focus:ring-1 focus:ring-synos-primary"
                        placeholder="e.g. CHO - HDL - (TRIG / 5)"
                        value={editFormula}
                        onChange={(e) => setEditFormula(e.target.value)}
                      />
                      <p className="text-[9px] text-zinc-600 dark:text-zinc-400 leading-tight">Write mathematical expressions using the precise parameter codes listed below.</p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] font-semibold text-zinc-600 dark:text-zinc-400 block">Parameter Variables Chips</span>
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const childParams = getCompiledProfileParameters(selectedTest, catalog);
                          const childCodes = new Set(childParams.map(cp => cp.code));
                          const nativeParams = (selectedTest.parameters || []).filter(np => !childCodes.has(np.code));
                          const combined = [...childParams, ...nativeParams];

                          // Deduplicate combined by code to avoid duplicate React keys and redundant chips
                          const uniqueCombined = [];
                          const seenCodes = new Set();
                          combined.forEach(p => {
                            if (p && p.code && !seenCodes.has(p.code)) {
                              seenCodes.add(p.code);
                              uniqueCombined.push(p);
                            }
                          });

                          return uniqueCombined
                            .filter(p => p.code !== drawerParamCode)
                            .map(p => (
                              <button
                                key={p.code}
                                onClick={() => setEditFormula(prev => prev + (prev === "" ? "" : " ") + p.code)}
                                className="px-2 py-1 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[9px] font-bold font-mono text-zinc-600 dark:text-zinc-400 hover:text-synos-primary hover:border-synos-primary/30 transition-all flex items-center gap-1"
                              >
                                <Plus className="w-2 h-2" /> {p.code}
                              </button>
                            ));
                        })()}
                      </div>
                      <p className="text-[8px] text-zinc-400 mt-1">Tip: Click variable chips to insert them into the formula input box automatically.</p>
                    </div>

                    <div className="space-y-2 pt-1">
                      <span className="text-[9px] font-semibold text-zinc-600 dark:text-zinc-400 block">Math Operators Chips</span>
                      <div className="flex flex-wrap gap-1">
                        {["+", "-", "*", "/", "(", ")", "%"].map(op => (
                          <button
                            key={op}
                            onClick={() => setEditFormula(prev => prev + (prev === "" ? "" : " ") + op)}
                            className="px-2.5 py-1 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px] font-extrabold font-mono text-synos-primary hover:text-synos-primary/80 transition-all flex items-center justify-center min-w-[24px]"
                          >
                            {op}
                          </button>
                        ))}
                      </div>
                      <p className="text-[8px] text-zinc-400 mt-1">Tip: Click operator chips to insert basic math functions into the expression.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl bg-zinc-50/20 dark:bg-zinc-900/10">
                    <Calculator className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                    Turn on "Enable Calculation" to configure math formulas using other analytes.
                  </div>
                )}
              </div>
            )}

            {/* Drawer context: reference overrides */}
            {drawerMode === "ranges" && (
              <div className="space-y-4">
                <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 block">Biological Reference Intervals</span>
                
                {/* Male */}
                <div className="bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 block">Male Specific Overrides</span>
                    <input
                      type="checkbox"
                      checked={editUseMale}
                      onChange={(e) => setEditUseMale(e.target.checked)}
                      className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </div>
                  {editUseMale && (
                    <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-1 duration-100">
                      <div>
                        <label className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Male Min</label>
                        <input
                          type="number"
                          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs w-full text-zinc-900 dark:text-zinc-100 font-mono outline-none"
                          value={editMaleMin}
                          onChange={(e) => setEditMaleMin(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Male Max</label>
                        <input
                          type="number"
                          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs w-full text-zinc-900 dark:text-zinc-100 font-mono outline-none"
                          value={editMaleMax}
                          onChange={(e) => setEditMaleMax(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Female */}
                <div className="bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold text-rose-600 dark:text-rose-400 block">Female Specific Overrides</span>
                    <input
                      type="checkbox"
                      checked={editUseFemale}
                      onChange={(e) => setEditUseFemale(e.target.checked)}
                      className="rounded border-zinc-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </div>
                  {editUseFemale && (
                    <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-1 duration-100">
                      <div>
                        <label className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Female Min</label>
                        <input
                          type="number"
                          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs w-full text-zinc-900 dark:text-zinc-100 font-mono outline-none"
                          value={editFemaleMin}
                          onChange={(e) => setEditFemaleMin(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Female Max</label>
                        <input
                          type="number"
                          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs w-full text-zinc-900 dark:text-zinc-100 font-mono outline-none"
                          value={editFemaleMax}
                          onChange={(e) => setEditFemaleMax(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Infant */}
                <div className="bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold text-cyan-600 dark:text-cyan-400 block">Infant Specific Overrides</span>
                    <input
                      type="checkbox"
                      checked={editUseInfant}
                      onChange={(e) => setEditUseInfant(e.target.checked)}
                      className="rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </div>
                  {editUseInfant && (
                    <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-1 duration-100">
                      <div>
                        <label className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Infant Min</label>
                        <input
                          type="number"
                          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs w-full text-zinc-900 dark:text-zinc-100 font-mono outline-none"
                          value={editInfantMin}
                          onChange={(e) => setEditInfantMin(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Infant Max</label>
                        <input
                          type="number"
                          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs w-full text-zinc-900 dark:text-zinc-100 font-mono outline-none"
                          value={editInfantMax}
                          onChange={(e) => setEditInfantMax(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Child */}
                <div className="bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 block">Child Specific Overrides</span>
                    <input
                      type="checkbox"
                      checked={editUseChild}
                      onChange={(e) => setEditUseChild(e.target.checked)}
                      className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </div>
                  {editUseChild && (
                    <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-1 duration-100">
                      <div>
                        <label className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Child Min</label>
                        <input
                          type="number"
                          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs w-full text-zinc-900 dark:text-zinc-100 font-mono outline-none"
                          value={editChildMin}
                          onChange={(e) => setEditChildMin(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Child Max</label>
                        <input
                          type="number"
                          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs w-full text-zinc-900 dark:text-zinc-100 font-mono outline-none"
                          value={editChildMax}
                          onChange={(e) => setEditChildMax(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Adult */}
                <div className="bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 block">Adult Specific Overrides</span>
                    <input
                      type="checkbox"
                      checked={editUseAdult}
                      onChange={(e) => setEditUseAdult(e.target.checked)}
                      className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </div>
                  {editUseAdult && (
                    <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-1 duration-100">
                      <div>
                        <label className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Adult Min</label>
                        <input
                          type="number"
                          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs w-full text-zinc-900 dark:text-zinc-100 font-mono outline-none"
                          value={editAdultMin}
                          onChange={(e) => setEditAdultMin(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Adult Max</label>
                        <input
                          type="number"
                          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs w-full text-zinc-900 dark:text-zinc-100 font-mono outline-none"
                          value={editAdultMax}
                          onChange={(e) => setEditAdultMax(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-[8px] text-zinc-400 leading-tight">These overrides apply dynamically in report templates depending on the demographics configured inside patient records.</p>
              </div>
            )}

            {/* Drawer context: analyzer mapping */}
            {drawerMode === "analyzer" && (
              <div className="space-y-4">
                <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 block text-left">Analyzer Hardware Interface Mapping</span>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Analyzer Device Model</label>
                    <select
                      className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs w-full text-zinc-900 dark:text-zinc-100 outline-none"
                      value={editAnalyzerModel}
                      onChange={(e) => setEditAnalyzerModel(e.target.value)}
                    >
                      <option value="">-- Direct Hand Entry --</option>
                      <option value="Sysmex XN-1000">Sysmex XN-1000 Hematology Analyzer</option>
                      <option value="Cobas c501">Roche Cobas c501 Chemistry Module</option>
                      <option value="Abbott Alinity">Abbott Alinity Integrated System</option>
                      <option value="Software Calculation">Software Calculation (Virtual)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Instrument Channel / ID</label>
                    <input
                      type="text"
                      className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs w-full text-zinc-900 dark:text-zinc-100 font-mono outline-none"
                      placeholder="e.g. CH-HB-01"
                      value={editAnalyzerChannel}
                      onChange={(e) => setEditAnalyzerChannel(e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex gap-2 items-start text-[9px] text-zinc-500">
                  <Cpu className="w-5 h-5 text-synos-primary shrink-0" />
                  <p>When configured, values generated by laboratory diagnostic instruments will automatically map directly into patient reports via this interface code.</p>
                </div>
              </div>
            )}

            {/* Drawer context: narrative template */}
            {drawerMode === "narrative" && (
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 block">Default narrative / interpretation template</label>
                <textarea
                  rows="6"
                  className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs w-full text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary placeholder-zinc-400"
                  placeholder="Type standard medical commentaries or test explanations to render inside report PDF..."
                  value={editNarrative}
                  onChange={(e) => setEditNarrative(e.target.value)}
                />
                <p className="text-[9px] text-zinc-400 leading-tight">This comment will render at the bottom of the test results section if "Interpretation Commentaries" is enabled in Report Setup.</p>
              </div>
            )}
          </div>

          {/* Drawer Action Bar */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-2 bg-zinc-50/50 dark:bg-zinc-900/20">
            <button
              onClick={() => setDrawerOpen(false)}
              className="flex-1 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs rounded-xl font-bold transition-all text-center"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDrawerSettings}
              className="flex-1 py-2 bg-synos-primary hover:bg-synos-primary/95 text-white text-xs rounded-xl font-bold transition-all text-center shadow-md shadow-synos-primary/10"
            >
              Apply Settings
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

export default TestMasterScreen;
