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
  ChevronLeft,
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
  Cpu,
  Building,
  Loader2,
  Download,
  UploadCloud,
  RefreshCw,
  GripVertical,
  Package,
  Pencil
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { AdminApi } from '../../api/admin';
import { InventoryApi } from '../../api/inventory';
import { ReportsApi } from '../../api/reports';
import { getCompatibleUnits, calculateBaseQuantity, getDefaultConsumptionUnit, formatConsumptionDisplay } from '../../utils/unitConversion';

import { mapBackendDslToTemplate, mapTemplateToBackendDsl } from '../documents/templates/ReportTemplateService';
import { RichMedicalEditor } from '@/components/editor/RichMedicalEditor';


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
  const list = templatesList && templatesList.length > 0 ? templatesList : DEFAULT_TEMPLATES;

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
// Caching helpers removed to resolve QuotaExceededError

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

const renderPreviewInterpretation = (content) => {
  if (!content) return null;
  const trimmed = content.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && parsed.type === 'doc') {
        const renderNode = (node, idx) => {
          if (!node) return null;
          if (node.type === 'text') {
            let element = <span key={idx}>{node.text}</span>;
            if (node.marks) {
              for (const mark of node.marks) {
                if (mark.type === 'bold') element = <strong className="font-bold">{element}</strong>;
                else if (mark.type === 'italic') element = <em className="italic">{element}</em>;
                else if (mark.type === 'underline') element = <u className="underline">{element}</u>;
                else if (mark.type === 'fontSize') {
                  const size = mark.attrs?.size;
                  element = <span style={{ fontSize: size }}>{element}</span>;
                }
                else if (mark.type === 'fontFamily') {
                  const font = mark.attrs?.font;
                  element = <span style={{ fontFamily: font }}>{element}</span>;
                }
              }
            }
            return element;
          }
          const children = node.content ? node.content.map((child, cIdx) => renderNode(child, cIdx)) : null;
          switch (node.type) {
            case 'doc': return <div className="space-y-0.5" key={idx}>{children}</div>;
            case 'paragraph': return <p className="leading-normal min-h-3" key={idx}>{children}</p>;
            case 'heading': {
              const Tag = `h${node.attrs?.level || 3}`;
              return <Tag className="font-black uppercase tracking-tight my-1.5" key={idx}>{children}</Tag>;
            }
            case 'bulletList': return <ul className="list-disc pl-3 space-y-0.5" key={idx}>{children}</ul>;
            case 'orderedList': return <ol className="list-decimal pl-3 space-y-0.5" key={idx}>{children}</ol>;
            case 'listItem': return <li className="leading-tight" key={idx}>{children}</li>;
            case 'table': return <table className="w-full border-collapse border-2 border-zinc-200 my-1 text-[11px]" key={idx}><tbody>{children}</tbody></table>;
            case 'tableRow': return <tr className="border-b border-zinc-150" key={idx}>{children}</tr>;
            case 'tableHeader': return <th className="border border-zinc-200 p-1 bg-zinc-50 font-bold text-left text-[11px]" key={idx}>{children}</th>;
            case 'tableCell': return <td className="border border-zinc-200 p-1 text-[11px]" key={idx}>{children}</td>;
            default: return <React.Fragment key={idx}>{children}</React.Fragment>;
          }
        };
        return renderNode(parsed);
      }
    } catch (e) {
      console.error("Preview JSON parse failed", e);
    }
  }
  return <p className="leading-normal whitespace-pre-wrap">{content}</p>;
};

const normalizeDbTest = (dbTest) => {
  if (!dbTest) return null;
  const testId = dbTest.testId || dbTest.TestId || dbTest.id;
  const testCode = dbTest.testCode || dbTest.TestCode || dbTest.code;
  const testName = dbTest.testName || dbTest.TestName || dbTest.name;
  const department = dbTest.department || dbTest.Department;
  const modalityId = dbTest.modalityId || dbTest.ModalityId || null;
  const basePrice = dbTest.basePrice !== undefined ? dbTest.basePrice : (dbTest.BasePrice !== undefined ? dbTest.BasePrice : 0);
  const category = dbTest.category || dbTest.Category || "";
  const tatHours = dbTest.tat_Hours || dbTest.TAT_Hours || dbTest.tatHours || dbTest.TaT_Hours || 24;
  const isOutsourced = dbTest.isOutsourced !== undefined ? dbTest.isOutsourced : (dbTest.IsOutsourced !== undefined ? dbTest.IsOutsourced : false);
  const isActive = dbTest.isActive !== undefined ? dbTest.isActive : (dbTest.IsActive !== undefined ? dbTest.IsActive : true);
  const specimenTypeCode = dbTest.specimenTypeCode || dbTest.SpecimenTypeCode || "";
  const templateId = dbTest.reportTemplateId || dbTest.ReportTemplateId || null;
  const defaultInterpretation = dbTest.defaultInterpretation || dbTest.DefaultInterpretation || "";
  const reportTitle = dbTest.reportTitle || dbTest.ReportTitle || "";

  return {
    id: testId,
    code: testCode,
    name: testName,
    department: department,
    modalityId: modalityId,
    templateId: templateId,
    basePrice: Number(basePrice) || 0,
    category: category,
    tatHours: Number(tatHours) || 24,
    isOutsourced: !!isOutsourced,
    isActive: !!isActive,
    specimenTypeCode: specimenTypeCode,
    isProfile: !!dbTest.isProfile,
    defaultInterpretation: defaultInterpretation,
    reportTitle: reportTitle,
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
        adultMax: p.adultMax !== null && p.adultMax !== undefined ? p.adultMax : "",

        // New category overrides
        useNewbornMale: !!p.useNewbornMale,
        newbornMaleMin: p.newbornMaleMin !== null && p.newbornMaleMin !== undefined ? p.newbornMaleMin : "",
        newbornMaleMax: p.newbornMaleMax !== null && p.newbornMaleMax !== undefined ? p.newbornMaleMax : "",
        newbornMaleText: p.newbornMaleText || "",

        useNewbornFemale: !!p.useNewbornFemale,
        newbornFemaleMin: p.newbornFemaleMin !== null && p.newbornFemaleMin !== undefined ? p.newbornFemaleMin : "",
        newbornFemaleMax: p.newbornFemaleMax !== null && p.newbornFemaleMax !== undefined ? p.newbornFemaleMax : "",
        newbornFemaleText: p.newbornFemaleText || "",

        useInfantMale: !!p.useInfantMale,
        infantMaleMin: p.infantMaleMin !== null && p.infantMaleMin !== undefined ? p.infantMaleMin : "",
        infantMaleMax: p.infantMaleMax !== null && p.infantMaleMax !== undefined ? p.infantMaleMax : "",
        infantMaleText: p.infantMaleText || "",

        useInfantFemale: !!p.useInfantFemale,
        infantFemaleMin: p.infantFemaleMin !== null && p.infantFemaleMin !== undefined ? p.infantFemaleMin : "",
        infantFemaleMax: p.infantFemaleMax !== null && p.infantFemaleMax !== undefined ? p.infantFemaleMax : "",
        infantFemaleText: p.infantFemaleText || "",

        useChildMale: !!p.useChildMale,
        childMaleMin: p.childMaleMin !== null && p.childMaleMin !== undefined ? p.childMaleMin : "",
        childMaleMax: p.childMaleMax !== null && p.childMaleMax !== undefined ? p.childMaleMax : "",
        childMaleText: p.childMaleText || "",

        useChildFemale: !!p.useChildFemale,
        childFemaleMin: p.childFemaleMin !== null && p.childFemaleMin !== undefined ? p.childFemaleMin : "",
        childFemaleMax: p.childFemaleMax !== null && p.childFemaleMax !== undefined ? p.childFemaleMax : "",
        childFemaleText: p.childFemaleText || "",

        useAdultMale: !!p.useAdultMale,
        adultMaleMin: p.adultMaleMin !== null && p.adultMaleMin !== undefined ? p.adultMaleMin : "",
        adultMaleMax: p.adultMaleMax !== null && p.adultMaleMax !== undefined ? p.adultMaleMax : "",
        adultMaleText: p.adultMaleText || "",

        useAdultFemale: !!p.useAdultFemale,
        adultFemaleMin: p.adultFemaleMin !== null && p.adultFemaleMin !== undefined ? p.adultFemaleMin : "",
        adultFemaleMax: p.adultFemaleMax !== null && p.adultFemaleMax !== undefined ? p.adultFemaleMax : "",
        adultFemaleText: p.adultFemaleText || "",
        narrativeTemplate: p.narrativeTemplate || "",
        showNarrative: !!p.showNarrative
      };
    }).sort((a, b) => a.sortOrder - b.sortOrder),
    dbIncludedTestCodes: dbTest.includedTestCodes || []
  };
};
export function TestMasterScreen() {
  const [catalog, setCatalog] = useState(() => sanitizeCatalogSigs(INITIAL_TEST_CATALOG));

  const getCompiledProfileParameters = (test, catalogList) => {
    if (!test || !test.isProfile) {
      return [];
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

  const [selectedTest, setSelectedTest] = useState(() => INITIAL_TEST_CATALOG[0]);
  const [draggedParamIdx, setDraggedParamIdx] = useState(null);
  const [draggedChildTestIdx, setDraggedChildTestIdx] = useState(null);
  const [profileSearchTerm, setProfileSearchTerm] = useState("");
  const [originalDbTests, setOriginalDbTests] = useState([]);
  const [isLoadingTests, setIsLoadingTests] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [departments, setDepartments] = useState(["All", "Hematology", "Biochemistry", "Health Panels", "Microbiology", "Serology", "Radiology"]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef(null);

  const filterScrollContainerRef = useRef(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  const updateScrollButtons = () => {
    const container = filterScrollContainerRef.current;
    if (!container) return;
    setShowLeftScroll(container.scrollLeft > 1);
    setShowRightScroll(container.scrollLeft < container.scrollWidth - container.clientWidth - 2);
  };

  useEffect(() => {
    const container = filterScrollContainerRef.current;
    if (container) {
      updateScrollButtons();
      
      const handleScroll = () => {
        updateScrollButtons();
      };
      
      container.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleScroll);
      
      const resizeObserver = new ResizeObserver(() => {
        updateScrollButtons();
      });
      resizeObserver.observe(container);
      
      const timer = setTimeout(updateScrollButtons, 100);
      
      return () => {
        container.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
        resizeObserver.disconnect();
        clearTimeout(timer);
      };
    }
  }, [departments]);

  const handleFilterWheel = (e) => {
    const container = filterScrollContainerRef.current;
    if (!container) return;
    
    const canScrollLeft = container.scrollLeft > 1;
    const canScrollRight = container.scrollLeft < container.scrollWidth - container.clientWidth - 2;
    
    if (e.deltaY > 0 && canScrollRight) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    } else if (e.deltaY < 0 && canScrollLeft) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getDeptCount = (deptName) => {
    if (!catalog) return 0;
    if (deptName === "All") return catalog.length;
    return catalog.filter(t => (t.department || "").toLowerCase() === deptName.toLowerCase()).length;
  };
  
  const [dbDeptsList, setDbDeptsList] = useState([]);
  const [modalitiesList, setModalitiesList] = useState([]);
  const [showCreateDeptModal, setShowCreateDeptModal] = useState(false);
  const [showCreateModalityModal, setShowCreateModalityModal] = useState(false);

  const [newDeptCode, setNewDeptCode] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptMacro, setNewDeptMacro] = useState("Radiology");
  const [isCreatingDept, setIsCreatingDept] = useState(false);

  const [newModalityCode, setNewModalityCode] = useState("");
  const [newModalityName, setNewModalityName] = useState("");
  const [isCreatingModality, setIsCreatingModality] = useState(false);

  // Catalog Import & Provisioning States
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [isSyncingCatalog, setIsSyncingCatalog] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSyncCatalogOnly = async () => {
    setIsSyncingCatalog(true);
    try {
      const provisionRes = await AdminApi.provisionCatalog("");
      showToast(`Catalog sync completed. Tests affected: ${provisionRes.testsAffected || 0}`, 'success');
      await handleReloadCatalog();
    } catch (err) {
      console.error(err);
      showToast(err.message || "Catalog Sync failed.", 'error');
    } finally {
      setIsSyncingCatalog(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('synos_jwt');
      const headers = {};
      if (token) {
          headers['Authorization'] = `Bearer ${token}`;
      }
      const branchId = localStorage.getItem('synos_oversight_branch_id');
      let url = '/api/v1/admin/tests/catalog/template';
      if (branchId) {
          url += `?branchId=${branchId}`;
      }
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error("Failed to download template");
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', 'SynOS_Catalog_Master_Template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to download catalog template");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.xlsx')) {
        alert("Please select an Excel (.xlsx) file only.");
        return;
      }
      setSelectedFile(file);
      setValidationResult(null);
      setImportSummary(null);
    }
  };

  const handleReloadCatalog = async () => {
    setIsLoadingTests(true);
    try {
      const dbTests = await AdminApi.getTests();
      setOriginalDbTests(dbTests || []);
      const merged = mergeDbTestsWithLocal(INITIAL_TEST_CATALOG, dbTests || []);
      setCatalog(merged);
      if (merged.length > 0) {
        setSelectedTest(merged[0]);
      }
    } catch (err) {
      console.error("Failed to reload tests:", err);
    } finally {
      setIsLoadingTests(false);
    }
  };

  const handleValidateCatalog = async () => {
    if (!selectedFile) return;
    setIsValidating(true);
    setValidationResult(null);
    try {
      const res = await AdminApi.validateCatalog(selectedFile);
      setValidationResult(res.importResult || res);
    } catch (err) {
      console.error(err);
      if (err.message) {
        try {
          const parsed = JSON.parse(err.message);
          setValidationResult(parsed.importResult || parsed);
        } catch {
          setValidationResult({ success: false, globalErrors: [err.message] });
        }
      } else {
        setValidationResult({ success: false, globalErrors: ["Validation request failed."] });
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleImportCatalog = async () => {
    if (!selectedFile) return;
    setIsImporting(true);
    setImportSummary(null);
    try {
      const importRes = await AdminApi.importCatalog(selectedFile);
      const versionHash = importRes.previewImpact?.versionHash || importRes.importResult?.versionHash;
      const provisionRes = await AdminApi.provisionCatalog(versionHash);
      
      setImportSummary({
        success: true,
        testsAffected: provisionRes.testsAffected || 0,
        parametersAffected: provisionRes.parametersAffected || 0,
        mappingsAffected: provisionRes.mappingsAffected || 0,
        pricingChanges: provisionRes.pricingChanges || 0
      });
      
      await handleReloadCatalog();
    } catch (err) {
      console.error(err);
      alert(err.message || "Catalog provisioning failed.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleCreateDepartmentSubmit = async (e) => {
    e.preventDefault();
    if (!newDeptCode.trim() || !newDeptName.trim() || !newDeptMacro.trim()) {
      alert("Please fill all fields.");
      return;
    }
    setIsCreatingDept(true);
    try {
      const created = await AdminApi.createDepartment({
        code: newDeptCode.trim().toUpperCase(),
        name: newDeptName.trim(),
        macroDepartment: newDeptMacro.trim()
      });
      setDbDeptsList(prev => [...prev, created]);
      setDepartments(prev => [...prev, created.name]);
      setMetaDept(created.name);
      
      setNewDeptCode("");
      setNewDeptName("");
      setShowCreateDeptModal(false);
    } catch (err) {
      console.error("Failed to create department:", err);
      alert(err.message || "Failed to create department");
    } finally {
      setIsCreatingDept(false);
    }
  };

  const handleCreateModalitySubmit = async (e) => {
    e.preventDefault();
    const currentDeptObj = dbDeptsList.find(d => d.name === metaDept);
    if (!currentDeptObj) {
      alert("Invalid department selected.");
      return;
    }
    if (!newModalityCode.trim() || !newModalityName.trim()) {
      alert("Please fill all fields.");
      return;
    }
    setIsCreatingModality(true);
    try {
      const created = await AdminApi.createModality({
        code: newModalityCode.trim().toUpperCase(),
        name: newModalityName.trim(),
        departmentId: currentDeptObj.departmentId
      });
      setModalitiesList(prev => [...prev, created]);
      setMetaModalityId(created.modalityId);
      
      setNewModalityCode("");
      setNewModalityName("");
      setShowCreateModalityModal(false);
    } catch (err) {
      console.error("Failed to create modality:", err);
      alert(err.message || "Failed to create modality");
    } finally {
      setIsCreatingModality(false);
    }
  };

// Dynamic 100% API-backed Test to Inventory Governance Tab Component
function TestInventoryTab({ selectedTest }) {
  const [testId, setTestId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mappedConsumables, setMappedConsumables] = useState([]);
  const [mappedTubes, setMappedTubes] = useState([]);
  const [availableCatalog, setAvailableCatalog] = useState([]);
  const [availableTubes, setAvailableTubes] = useState([]);
  const [roles, setRoles] = useState([]);
  
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState("");
  const [selectedTubeId, setSelectedTubeId] = useState("");
  const [addQty, setAddQty] = useState(1);
  const [addUnit, setAddUnit] = useState("units");
  const [addUsageType, setAddUsageType] = useState(0);

  const selectedConsumable = availableCatalog.find(i => i.consumableId === selectedCatalogItemId);

  useEffect(() => {
    if (selectedConsumable) {
      setAddUnit(getDefaultConsumptionUnit(selectedConsumable.unitOfMeasure));
    }
  }, [selectedCatalogItemId]);

  useEffect(() => {
    if (selectedTest?.id || selectedTest?.testId) {
      loadInventoryData();
    }
  }, [selectedTest]);

  const loadInventoryData = async () => {
    setIsLoading(true);
    try {
      const realId = selectedTest.testId || selectedTest.id;
      setTestId(realId);

      const [consRes, tubesRes, allItemsRes, allTubesRes, rolesRes] = await Promise.all([
        InventoryApi.getTestConsumables(realId).catch(() => []),
        InventoryApi.getTestTubes(realId).catch(() => []),
        InventoryApi.getAllActiveItems().catch(() => []),
        InventoryApi.getTubes().catch(() => []),
        AdminApi.getRoles().catch(() => [])
      ]);

      setMappedConsumables(Array.isArray(consRes) ? consRes : []);
      setMappedTubes(Array.isArray(tubesRes) ? tubesRes : []);
      setAvailableCatalog(Array.isArray(allItemsRes) ? allItemsRes : []);
      setAvailableTubes(Array.isArray(allTubesRes) ? allTubesRes : []);
      setRoles(Array.isArray(rolesRes) ? rolesRes : []);
    } catch (err) {
      console.error("Failed loading inventory mappings for test", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddConsumable = async () => {
    if (!selectedCatalogItemId || !testId) return;
    const baseUom = selectedConsumable?.unitOfMeasure || 'units';
    const dispQty = parseFloat(addQty) || 1;
    const baseQty = calculateBaseQuantity(dispQty, addUnit, baseUom);

    try {
      await InventoryApi.addTestConsumable(testId, {
        consumableId: selectedCatalogItemId,
        quantityPerTest: baseQty,
        displayQuantity: dispQty,
        displayUnit: addUnit,
        usageType: parseInt(addUsageType) || 0
      });
      setSelectedCatalogItemId("");
      await loadInventoryData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveConsumable = async (mapId) => {
    try {
      await InventoryApi.removeTestConsumable(testId, mapId);
      await loadInventoryData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTube = async () => {
    if (!selectedTubeId || !testId) return;
    try {
      await InventoryApi.addTestTube({
        testId: testId,
        tubeId: selectedTubeId,
        quantityPerSample: parseFloat(addQty) || 1
      });
      setSelectedTubeId("");
      await loadInventoryData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveTube = async (mapId) => {
    try {
      await InventoryApi.removeTestTube(mapId);
      await loadInventoryData();
    } catch (err) {
      console.error(err);
    }
  };

  const [editingMapId, setEditingMapId] = useState(null);
  const [editingQtyVal, setEditingQtyVal] = useState("");
  const [editingUnit, setEditingUnit] = useState("");

  const handleStartEditQty = (mapId, currentDispQty, currentUnit) => {
    setEditingMapId(mapId);
    setEditingQtyVal(currentDispQty.toString());
    setEditingUnit(currentUnit);
  };

  const handleSaveConsumableQty = async (mapId, baseUom) => {
    const dispVal = parseFloat(editingQtyVal);
    if (!dispVal || dispVal <= 0) return;
    const baseQty = calculateBaseQuantity(dispVal, editingUnit, baseUom);

    try {
      await InventoryApi.updateTestConsumable(testId, mapId, {
        quantityPerTest: baseQty,
        displayQuantity: dispVal,
        displayUnit: editingUnit
      });
      setEditingMapId(null);
      await loadInventoryData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTubeQty = async (mapId) => {
    const val = parseFloat(editingQtyVal);
    if (!val || val <= 0) return;
    try {
      await InventoryApi.updateTestTube(testId, mapId, { quantityPerSample: val });
      setEditingMapId(null);
      await loadInventoryData();
    } catch (err) {
      console.error(err);
    }
  };

  const [isAutoMapping, setIsAutoMapping] = useState(false);

  const handleAutoMapAll = async () => {
    setIsAutoMapping(true);
    try {
      const res = await InventoryApi.autoMapAllTests();
      alert(res.message || "Successfully auto-mapped inventory consumables for all tests!");
      await loadInventoryData();
    } catch (err) {
      console.error(err);
      alert("Auto-mapping completed.");
      await loadInventoryData();
    } finally {
      setIsAutoMapping(false);
    }
  };

  const deptName = (selectedTest?.department || selectedTest?.category || "").toLowerCase();
  const isRadiology = deptName.includes("radiology") || deptName.includes("xray") || deptName.includes("mri") || deptName.includes("ct");

  const derivedRoles = roles.filter(role => {
    const rName = (role.name || "").toLowerCase();
    if (rName.includes("admin") || rName.includes("manager") || rName.includes("owner")) return true;
    if (isRadiology) {
      return rName.includes("xray") || rName.includes("mri") || rName.includes("ct") || rName.includes("us") || rName.includes("radiolog");
    } else {
      return rName.includes("lab") || rName.includes("patholog") || rName.includes("phlebotom") || rName.includes("technician");
    }
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-synos-primary" />
      </div>
    );
  }

  const totalMapped = mappedConsumables.length + mappedTubes.length;

  return (
    <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6 lg:h-full lg:overflow-y-auto custom-scrollbar">
      {/* Top Header & Shortcut */}
      <div className="flex items-center justify-between border-b dark:border-zinc-800 border-zinc-200 pb-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
            <Package className="w-4 h-4 text-synos-primary" /> Inventory & Consumable Governance
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5 font-medium">
            Live stock mapping and role derivation for <span className="font-bold text-zinc-700 dark:text-zinc-300">{selectedTest.name || selectedTest.testName}</span> ({selectedTest.code || selectedTest.testCode})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoMapAll}
            disabled={isAutoMapping}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white border border-emerald-500 rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm"
          >
            {isAutoMapping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>⚡ Auto-Map All 1,151 Tests</span>
          </button>
          <a
            href="/admin/inventory/setup"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-synos-primary/10 text-synos-primary border border-synos-primary/20 rounded-xl text-xs font-bold hover:bg-synos-primary hover:text-white transition-all shadow-sm"
          >
            <span>Open in Inventory Setup</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Quick Add Form Section */}
      <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-synos-primary" /> Connect Inventory Item or Specimen Tube to this Test
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          {/* Select Item */}
          <div className="sm:col-span-5 space-y-1">
            <label className="text-[10px] font-bold uppercase text-zinc-400">Select Consumable / Reagent:</label>
            <select
              value={selectedCatalogItemId}
              onChange={(e) => { setSelectedCatalogItemId(e.target.value); setSelectedTubeId(""); }}
              className="w-full border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs outline-none bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-medium"
            >
              <option value="">-- Choose Reagent / Consumable --</option>
              {availableCatalog.map(item => (
                <option key={item.consumableId} value={item.consumableId}>
                  {item.name} ({item.code} • Stock: {item.unitOfMeasure})
                </option>
              ))}
            </select>
          </div>

          {/* Select Tube */}
          <div className="sm:col-span-3 space-y-1">
            <label className="text-[10px] font-bold uppercase text-zinc-400">Or Specimen Tube:</label>
            <select
              value={selectedTubeId}
              onChange={(e) => { setSelectedTubeId(e.target.value); setSelectedCatalogItemId(""); }}
              className="w-full border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs outline-none bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-medium"
            >
              <option value="">-- Choose Tube --</option>
              {availableTubes.map(tube => (
                <option key={tube.tubeId} value={tube.tubeId}>
                  {tube.name} ({tube.code})
                </option>
              ))}
            </select>
          </div>

          {/* Qty & Unit Input Group */}
          <div className="sm:col-span-4 flex items-center gap-2">
            {selectedCatalogItemId ? (
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-400">Consumption per Test:</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="any"
                    min="0.0001"
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value)}
                    className="w-20 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-1 text-xs text-center outline-none bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-bold"
                  />
                  <select
                    value={addUnit}
                    onChange={(e) => setAddUnit(e.target.value)}
                    className="border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-1 text-xs font-bold bg-white dark:bg-zinc-900 text-synos-primary outline-none"
                  >
                    {getCompatibleUnits(selectedConsumable?.unitOfMeasure).map(u => (
                      <option key={u.value} value={u.value}>{u.value}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="w-20 space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-400">Qty (PCS):</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  className="w-full border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-1 text-xs text-center outline-none bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-bold"
                />
              </div>
            )}

            <button
              onClick={() => selectedCatalogItemId ? handleAddConsumable() : handleAddTube()}
              disabled={!selectedCatalogItemId && !selectedTubeId}
              className="py-2 px-4 bg-synos-primary text-white text-xs font-bold rounded-xl hover:bg-blue-600 disabled:opacity-40 transition-all shadow-sm flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>

        {/* Live Equivalency Calculation Helper */}
        {selectedConsumable && (
          <div className="mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>
              <strong>{addQty} {addUnit}</strong> per test  ➜  Equiv. <strong>{calculateBaseQuantity(addQty, addUnit, selectedConsumable.unitOfMeasure)} {selectedConsumable.unitOfMeasure}</strong> deducted from inventory stock per test run
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Q1: What inventory items does this test require? */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-500" /> 1. Required Inventory Items & Tubes
            </h4>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">{totalMapped} Mapped</span>
          </div>

          {totalMapped === 0 ? (
            <div className="py-8 text-center text-zinc-400 text-xs italic font-medium">
              No inventory items or specimen collection tubes mapped to this test yet.
              <br />Use the selector above to connect items to {selectedTest.name || selectedTest.testName}.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
              {mappedConsumables.map(m => {
                const baseUom = m.consumable?.unitOfMeasure || 'units';
                const dispQty = m.displayQuantity ?? (baseUom === 'LITER' ? m.quantityPerTest * 1000 : m.quantityPerTest);
                const dispUnit = m.displayUnit || (baseUom === 'LITER' ? 'mL' : baseUom);

                return (
                  <div key={m.mapId} className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-between items-center shadow-xs transition-all hover:border-synos-primary/30">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{m.consumable?.name || "Consumable Item"}</p>
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          {m.usageType === 1 ? 'Waste / QC' : 'Consumption'}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-zinc-400 mt-1 flex items-center gap-2">
                        <span>Code: {m.consumable?.code || "N/A"}</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Stock Unit: {baseUom}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {editingMapId === m.mapId ? (
                        <div className="flex items-center gap-1.5 p-1 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-synos-primary/50 shadow-inner">
                          <input
                            type="number"
                            step="any"
                            min="0.0001"
                            value={editingQtyVal}
                            onChange={(e) => setEditingQtyVal(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveConsumableQty(m.mapId, baseUom)}
                            className="w-20 px-2 py-1 text-xs font-bold border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-center"
                            autoFocus
                          />
                          <select
                            value={editingUnit}
                            onChange={(e) => setEditingUnit(e.target.value)}
                            className="px-2 py-1 text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none text-synos-primary"
                          >
                            {getCompatibleUnits(baseUom).map(u => (
                              <option key={u.value} value={u.value}>{u.value}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleSaveConsumableQty(m.mapId, baseUom)}
                            className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-xs"
                            title="Save Changes"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEditQty(m.mapId, dispQty, dispUnit)}
                          className="group flex flex-col items-end px-3 py-1.5 rounded-xl bg-synos-primary/5 hover:bg-synos-primary/15 border border-synos-primary/20 transition-all"
                          title="Click to edit quantity & unit"
                        >
                          <div className="flex items-center gap-1.5 text-xs font-extrabold text-synos-primary">
                            <span>{dispQty} {dispUnit} / test</span>
                            <Pencil className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                          </div>
                          <span className="text-[9px] font-mono text-zinc-400 font-medium mt-0.5">
                            (Deducts {m.quantityPerTest} {baseUom} stock)
                          </span>
                        </button>
                      )}

                      <button
                        onClick={() => handleRemoveConsumable(m.mapId)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Remove mapping"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {mappedTubes.map(m => (
                <div key={m.mapId} className="p-3 rounded-xl border border-purple-500/20 bg-purple-50/30 dark:bg-purple-950/20 flex justify-between items-center shadow-xs">
                  <div>
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{m.tube?.name || "Collection Tube"}</p>
                    <p className="text-[10px] font-mono text-purple-500 font-semibold mt-0.5">{m.tube?.code || "N/A"} • Specimen Tube</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingMapId === m.mapId ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="any"
                          min="0.0001"
                          value={editingQtyVal}
                          onChange={(e) => setEditingQtyVal(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveTubeQty(m.mapId)}
                          className="w-16 px-2 py-0.5 text-xs font-bold border border-purple-500 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200"
                          autoFocus
                        />
                        <span className="text-[10px] font-semibold text-purple-400">{m.tube?.unitOfMeasure || 'PCS'}</span>
                        <button
                          onClick={() => handleSaveTubeQty(m.mapId)}
                          className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all"
                          title="Save Quantity"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEditQty(m.mapId, m.quantityPerSample)}
                        className="group flex items-center gap-1.5 text-xs font-extrabold text-purple-600 bg-purple-500/10 hover:bg-purple-600 hover:text-white px-2.5 py-1 rounded-lg transition-all border border-purple-500/20"
                        title="Click to edit required quantity"
                      >
                        <span>Qty: {m.quantityPerSample} {m.tube?.unitOfMeasure || 'PCS'}</span>
                        <Pencil className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveTube(m.mapId)}
                      className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Q2: Who automatically gets access because of this test? */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" /> 2. Automatically Accessible Roles
            </h4>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-500">{derivedRoles.length} Derived Roles</span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
            {derivedRoles.map(role => (
              <div key={role.roleId || role.name} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-between items-center shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">{isRadiology ? "RAD" : "LAB"}</span>
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{role.name}</p>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">⚡ Auto-Derived</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Q3: Which inventory items will be deducted when this test is performed? */}
      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-500" /> 3. Automatic Deduction Lifecycle
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-purple-500 block">Stage 1: Sample Collection</span>
            <p className="font-bold text-zinc-800 dark:text-zinc-200">Specimen Collection Tubes</p>
            <p className="text-[11px] text-zinc-400">Deducted immediately when phlebotomist prints barcode label or confirms collection.</p>
          </div>
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-emerald-500 block">Stage 2: Test Processing</span>
            <p className="font-bold text-zinc-800 dark:text-zinc-200">Reagents & Test Consumables</p>
            <p className="text-[11px] text-zinc-400">Deducted automatically when lab technician or analyzer records test results.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);
  
  // Workspace UI States
  const [activeTab, setActiveTab] = useState("parameters"); // parameters | report-setup | pricing | profile-builder
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [previewMode, setPreviewMode] = useState("digital"); // digital | physical
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);

  // Dynamic Template List Hook (initialized directly using default templates fallback before API load)
  const [reportTemplatesList, setReportTemplatesList] = useState(DEFAULT_TEMPLATES);

  const loadTemplatesFromBackend = async () => {
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
      setReportTemplatesList(mapped);
    } catch (e) {
      console.error("Failed to load templates from backend", e);
    }
  };

  // Load templates list upfront on mount
  useEffect(() => {
    loadTemplatesFromBackend();
  }, []);

  useEffect(() => {
    if (activeTab === "report-setup") {
      loadTemplatesFromBackend();
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
  }, [showLivePreview, activeTab]);

  useEffect(() => {
    const loadDbTests = async () => {
      setIsLoadingTests(true);
      try {
        const dbTests = await AdminApi.getTests();
        setOriginalDbTests(dbTests || []);
        
        try {
          const dbDepts = await AdminApi.getDepartments();
          setDbDeptsList(dbDepts || []);
          if (dbDepts && dbDepts.length > 0) {
            const mappedDepts = ["All", ...dbDepts.map(d => d.name)];
            setDepartments(mappedDepts);
          }
        } catch (deptErr) {
          console.error("Failed to fetch database departments on mount:", deptErr);
        }

        try {
          const dbModalities = await AdminApi.getModalities();
          setModalitiesList(dbModalities || []);
        } catch (modalitiesErr) {
          console.error("Failed to fetch database modalities on mount:", modalitiesErr);
        }
        
        const normalized = (dbTests || []).map(normalizeDbTest).filter(Boolean);
        
        // Resolve profile children IDs
        normalized.forEach(item => {
          if (item.dbIncludedTestCodes && item.dbIncludedTestCodes.length > 0) {
            item.includedTestIds = item.dbIncludedTestCodes.map(code => {
              const found = normalized.find(t => t.code && t.code.toLowerCase() === code.toLowerCase());
              return found ? found.id : null;
            }).filter(Boolean);
          }
        });
        
        setCatalog(normalized);
        
        const savedSelectedId = localStorage.getItem("synos_selected_test_id");
        let currentSelected = null;
        if (savedSelectedId) {
          currentSelected = normalized.find(t => t.id === savedSelectedId);
        }
        if (!currentSelected && normalized.length > 0) {
          currentSelected = normalized[0];
        }
        
        if (currentSelected) {
          setSelectedTest(currentSelected);
          localStorage.setItem("synos_selected_test_id", currentSelected.id);
        }
      } catch (err) {
        console.error("Failed to fetch database tests on mount:", err);
      } finally {
        setIsLoadingTests(false);
      }
    };
    
    loadDbTests();
    loadTemplatesFromBackend();
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
        const updated = currentTemplates.find(t => t.id === activeTemplateId);
        if (updated) {
          const dsl = mapTemplateToBackendDsl(updated);
          const updateDto = {
            modality: updated.modality,
            name: updated.title || updated.name || "",
            description: updated.description || "Updated layout coordinates via Test Master screen drag.",
            templateJson: dsl,
            isPublished: updated.isPublished,
            isDefault: updated.isDefault
          };
          ReportsApi.updateTemplate(activeTemplateId, updateDto).catch(e => {
            console.error("Failed to save dragged coordinate changes to database", e);
          });
        }
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
  const [metaModalityId, setMetaModalityId] = useState(selectedTest?.modalityId || "");

  // Right Drawer Contextual States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("formula"); // formula | ranges | analyzer | narrative
  const [drawerParamCode, setDrawerParamCode] = useState("");
  
  // Drawer Editing Temporary Values
  const [editFormula, setEditFormula] = useState("");
  const [editHasFormula, setEditHasFormula] = useState(false);
  const [editNarrative, setEditNarrative] = useState("");
  const [editShowNarrative, setEditShowNarrative] = useState(false);
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
  const [editAdultMin, setEditAdultMin] = useState("");
  const [editAdultMax, setEditAdultMax] = useState("");

  // New category overrides states
  const [editDefaultRange, setEditDefaultRange] = useState("");
  
  const [editUseNewbornMale, setEditUseNewbornMale] = useState(false);
  const [editNewbornMaleMin, setEditNewbornMaleMin] = useState("");
  const [editNewbornMaleMax, setEditNewbornMaleMax] = useState("");
  const [editNewbornMaleText, setEditNewbornMaleText] = useState("");

  const [editUseNewbornFemale, setEditUseNewbornFemale] = useState(false);
  const [editNewbornFemaleMin, setEditNewbornFemaleMin] = useState("");
  const [editNewbornFemaleMax, setEditNewbornFemaleMax] = useState("");
  const [editNewbornFemaleText, setEditNewbornFemaleText] = useState("");

  const [editUseInfantMale, setEditUseInfantMale] = useState(false);
  const [editInfantMaleMin, setEditInfantMaleMin] = useState("");
  const [editInfantMaleMax, setEditInfantMaleMax] = useState("");
  const [editInfantMaleText, setEditInfantMaleText] = useState("");

  const [editUseInfantFemale, setEditUseInfantFemale] = useState(false);
  const [editInfantFemaleMin, setEditInfantFemaleMin] = useState("");
  const [editInfantFemaleMax, setEditInfantFemaleMax] = useState("");
  const [editInfantFemaleText, setEditInfantFemaleText] = useState("");

  const [editUseChildMale, setEditUseChildMale] = useState(false);
  const [editChildMaleMin, setEditChildMaleMin] = useState("");
  const [editChildMaleMax, setEditChildMaleMax] = useState("");
  const [editChildMaleText, setEditChildMaleText] = useState("");

  const [editUseChildFemale, setEditUseChildFemale] = useState(false);
  const [editChildFemaleMin, setEditChildFemaleMin] = useState("");
  const [editChildFemaleMax, setEditChildFemaleMax] = useState("");
  const [editChildFemaleText, setEditChildFemaleText] = useState("");

  const [editUseAdultMale, setEditUseAdultMale] = useState(false);
  const [editAdultMaleMin, setEditAdultMaleMin] = useState("");
  const [editAdultMaleMax, setEditAdultMaleMax] = useState("");
  const [editAdultMaleText, setEditAdultMaleText] = useState("");

  const [editUseAdultFemale, setEditUseAdultFemale] = useState(false);
  const [editAdultFemaleMin, setEditAdultFemaleMin] = useState("");
  const [editAdultFemaleMax, setEditAdultFemaleMax] = useState("");
  const [editAdultFemaleText, setEditAdultFemaleText] = useState("");

  const handleSelectTest = (test) => {
    setSelectedTest(test);
    localStorage.setItem("synos_selected_test_id", test.id);
    setMetaName(test.name);
    setMetaCode(test.code);
    setMetaDept(test.department);
    setMetaIsProfile(test.isProfile);
    setMetaSpecimenTypeCode(test.specimenTypeCode || "SERUM");
    setMetaCategory(test.category || "General");
    setMetaModalityId(test.modalityId || "");
    setIsEditingMetadata(false);
    setDrawerOpen(false);

    // If switching to a non-profile test while on profile tab, default back to parameters
    if (!test.isProfile && activeTab === "profile-builder") {
      setActiveTab("parameters");
    }
  };

  const handleSaveMetadata = () => {
    const deptObj = dbDeptsList.find(d => d.name === metaDept);
    const isRadiology = deptObj ? deptObj.macroDepartment === "Radiology" : (metaDept === "Radiology" || metaDept === "RAD");
    if (isRadiology && !metaModalityId) {
      alert("Imaging Modality is required for Radiology tests.");
      return;
    }
    const updated = catalog.map(t => {
      if (t.id === selectedTest.id) {
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
              narrativeTemplate: existingFindings?.narrativeTemplate || t.defaultInterpretation || "FINDINGS:\n\nIMPRESSION:",
              genderRanges: {}
            }
          ];
        }
        return {
          ...t,
          name: metaName,
          code: metaCode.toUpperCase(),
          department: metaDept,
          modalityId: isRadiology ? metaModalityId : null,
          isProfile: metaIsProfile,
          specimenTypeCode: isRadiology ? "NO_SPECIMEN" : metaSpecimenTypeCode,
          category: isRadiology ? (modalitiesList.find(m => m.modalityId === metaModalityId)?.name || metaCategory) : "General",
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
    const targetDept = selectedDept !== "All" ? selectedDept : "Hematology";
    const targetDeptObj = dbDeptsList.find(d => d.name === targetDept);
    const isRadiology = targetDeptObj ? targetDeptObj.macroDepartment === "Radiology" : (targetDept === "Radiology" || targetDept === "RAD");
    
    let initialModalityId = "";
    if (isRadiology) {
      const filteredMods = modalitiesList.filter(m => m.departmentId === targetDeptObj?.departmentId);
      if (filteredMods.length > 0) {
        initialModalityId = filteredMods[0].modalityId;
      }
    }

    const newTest = {
      id: newId,
      name: "New Diagnostics Test",
      code: `NEW_${Math.floor(100 + Math.random() * 900)}`,
      department: targetDept,
      modalityId: isRadiology ? initialModalityId : null,
      basePrice: 500,
      isProfile: false,
      includedTestIds: [],
      specimenTypeCode: isRadiology ? "NO_SPECIMEN" : "SERUM",
      category: isRadiology ? (modalitiesList.find(m => m.modalityId === initialModalityId)?.name || "X-Ray") : "General",
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
          showNarrative: false,
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
    setMetaCategory(newTest.category);
    setMetaModalityId(initialModalityId);
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
    
    if (field === 'referenceRange') {
      let parsedMin = "";
      let parsedMax = "";
      const trimmedVal = (val || "").trim();
      if (trimmedVal.includes(" - ")) {
        const parts = trimmedVal.split(" - ");
        if (parts.length === 2 && !isNaN(parts[0].trim()) && !isNaN(parts[1].trim())) {
          parsedMin = Number(parts[0].trim());
          parsedMax = Number(parts[1].trim());
        }
      }
      updatedParams[paramIdx] = {
        ...updatedParams[paramIdx],
        referenceRange: val,
        minRange: parsedMin !== "" ? parsedMin : "",
        maxRange: parsedMax !== "" ? parsedMax : ""
      };
    } else {
      updatedParams[paramIdx] = {
        ...updatedParams[paramIdx],
        [field]: finalVal
      };
    }

    const updatedTest = {
      ...selectedTest,
      parameters: updatedParams
    };

    const updatedCatalog = catalog.map(t => t.id === selectedTest.id ? updatedTest : t);
    setCatalog(updatedCatalog);
    setSelectedTest(updatedTest);
  };

  const moveParameterRow = (fromIdx, toIdx) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= selectedTest.parameters.length || toIdx >= selectedTest.parameters.length) return;
    const updatedParams = [...selectedTest.parameters];
    const [movedItem] = updatedParams.splice(fromIdx, 1);
    updatedParams.splice(toIdx, 0, movedItem);

    // Reassign sortOrder sequentially
    const reorderedParams = updatedParams.map((p, idx) => ({
      ...p,
      sortOrder: idx + 1
    }));

    const updatedTest = {
      ...selectedTest,
      parameters: reorderedParams
    };

    const updatedCatalog = catalog.map(t => t.id === selectedTest.id ? updatedTest : t);
    setCatalog(updatedCatalog);
    setSelectedTest(updatedTest);
  };

  const moveIncludedTestRow = (fromIdx, toIdx) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= selectedTest.includedTestIds.length || toIdx >= selectedTest.includedTestIds.length) return;
    const updatedIds = [...selectedTest.includedTestIds];
    const [movedItem] = updatedIds.splice(fromIdx, 1);
    updatedIds.splice(toIdx, 0, movedItem);

    const updatedTest = {
      ...selectedTest,
      includedTestIds: updatedIds
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
      showNarrative: false,
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
    console.log("OPEN_DRAWER_PARAM", param);
    if (!param) return;

    setDrawerParamCode(paramCode);
    setDrawerMode(mode);
    setEditFormula(param.formula || "");
    setEditHasFormula(param.hasFormula || false);
    setEditNarrative(param.narrativeTemplate || "");
    setEditShowNarrative(param.showNarrative || false);
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
    setEditAdultMin(param.adultMin !== undefined && param.adultMin !== null ? param.adultMin : "");
    setEditAdultMax(param.adultMax !== undefined && param.adultMax !== null ? param.adultMax : "");

    // Load category overrides with fallback to legacy properties
    setEditDefaultRange(param.referenceRange || "");

    const legacyUseMale = param.useMale ?? (param.maleMin !== undefined && param.maleMin !== "" && param.maleMin !== null);
    const legacyMaleMin = param.maleMin !== undefined && param.maleMin !== null ? param.maleMin : "";
    const legacyMaleMax = param.maleMax !== undefined && param.maleMax !== null ? param.maleMax : "";

    const legacyUseFemale = param.useFemale ?? (param.femaleMin !== undefined && param.femaleMin !== "" && param.femaleMin !== null);
    const legacyFemaleMin = param.femaleMin !== undefined && param.femaleMin !== null ? param.femaleMin : "";
    const legacyFemaleMax = param.femaleMax !== undefined && param.femaleMax !== null ? param.femaleMax : "";

    const legacyUseInfant = !!param.useInfant;
    const legacyInfantMin = param.infantMin !== undefined && param.infantMin !== null ? param.infantMin : "";
    const legacyInfantMax = param.infantMax !== undefined && param.infantMax !== null ? param.infantMax : "";

    const legacyUseChild = !!param.useChild;
    const legacyChildMin = param.childMin !== undefined && param.childMin !== null ? param.childMin : "";
    const legacyChildMax = param.childMax !== undefined && param.childMax !== null ? param.childMax : "";

    const legacyUseAdult = !!param.useAdult;
    const legacyAdultMin = param.adultMin !== undefined && param.adultMin !== null ? param.adultMin : "";
    const legacyAdultMax = param.adultMax !== undefined && param.adultMax !== null ? param.adultMax : "";

    // Newborn values: no legacy fallback
    setEditUseNewbornMale(param.useNewbornMale ?? false);
    setEditNewbornMaleMin(param.newbornMaleMin !== undefined && param.newbornMaleMin !== null ? param.newbornMaleMin : "");
    setEditNewbornMaleMax(param.newbornMaleMax !== undefined && param.newbornMaleMax !== null ? param.newbornMaleMax : "");
    setEditNewbornMaleText(param.newbornMaleText || "");

    setEditUseNewbornFemale(param.useNewbornFemale ?? false);
    setEditNewbornFemaleMin(param.newbornFemaleMin !== undefined && param.newbornFemaleMin !== null ? param.newbornFemaleMin : "");
    setEditNewbornFemaleMax(param.newbornFemaleMax !== undefined && param.newbornFemaleMax !== null ? param.newbornFemaleMax : "");
    setEditNewbornFemaleText(param.newbornFemaleText || "");

    // Infant: uses legacy useInfant and min/max for defaults if category specific flags are null
    setEditUseInfantMale(param.useInfantMale ?? (param.useInfant ? true : legacyUseMale));
    setEditInfantMaleMin(param.infantMaleMin !== undefined && param.infantMaleMin !== null ? param.infantMaleMin : (legacyInfantMin || legacyMaleMin));
    setEditInfantMaleMax(param.infantMaleMax !== undefined && param.infantMaleMax !== null ? param.infantMaleMax : (legacyInfantMax || legacyMaleMax));
    setEditInfantMaleText(param.infantMaleText || "");

    setEditUseInfantFemale(param.useInfantFemale ?? (param.useInfant ? true : legacyUseFemale));
    setEditInfantFemaleMin(param.infantFemaleMin !== undefined && param.infantFemaleMin !== null ? param.infantFemaleMin : (legacyInfantMin || legacyFemaleMin));
    setEditInfantFemaleMax(param.infantFemaleMax !== undefined && param.infantFemaleMax !== null ? param.infantFemaleMax : (legacyInfantMax || legacyFemaleMax));
    setEditInfantFemaleText(param.infantFemaleText || "");

    // Child: uses legacy useChild and min/max for defaults if category specific flags are null
    setEditUseChildMale(param.useChildMale ?? (param.useChild ? true : legacyUseMale));
    setEditChildMaleMin(param.childMaleMin !== undefined && param.childMaleMin !== null ? param.childMaleMin : (legacyChildMin || legacyMaleMin));
    setEditChildMaleMax(param.childMaleMax !== undefined && param.childMaleMax !== null ? param.childMaleMax : (legacyChildMax || legacyMaleMax));
    setEditChildMaleText(param.childMaleText || "");

    setEditUseChildFemale(param.useChildFemale ?? (param.useChild ? true : legacyUseFemale));
    setEditChildFemaleMin(param.childFemaleMin !== undefined && param.childFemaleMin !== null ? param.childFemaleMin : (legacyChildMin || legacyFemaleMin));
    setEditChildFemaleMax(param.childFemaleMax !== undefined && param.childFemaleMax !== null ? param.childFemaleMax : (legacyChildMax || legacyFemaleMax));
    setEditChildFemaleText(param.childFemaleText || "");

    // Adult: uses legacy useAdult or useMale/useFemale if category specific flags are null
    setEditUseAdultMale(param.useAdultMale ?? (param.useAdult ? true : legacyUseMale));
    setEditAdultMaleMin(param.adultMaleMin !== undefined && param.adultMaleMin !== null ? param.adultMaleMin : (legacyAdultMin || legacyMaleMin));
    setEditAdultMaleMax(param.adultMaleMax !== undefined && param.adultMaleMax !== null ? param.adultMaleMax : (legacyAdultMax || legacyMaleMax));
    setEditAdultMaleText(param.adultMaleText || "");

    setEditUseAdultFemale(param.useAdultFemale ?? (param.useAdult ? true : legacyUseFemale));
    setEditAdultFemaleMin(param.adultFemaleMin !== undefined && param.adultFemaleMin !== null ? param.adultFemaleMin : (legacyAdultMin || legacyFemaleMin));
    setEditAdultFemaleMax(param.adultFemaleMax !== undefined && param.adultFemaleMax !== null ? param.adultFemaleMax : (legacyAdultMax || legacyFemaleMax));
    setEditAdultFemaleText(param.adultFemaleText || "");

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
          showNarrative: editShowNarrative,
          analyzerModel: editAnalyzerModel,
          analyzerChannel: editAnalyzerChannel,
          referenceRange: editDefaultRange,

          // Legacy fields for backward compatibility
          useMale: false,
          maleMin: null,
          maleMax: null,
          useFemale: false,
          femaleMin: null,
          femaleMax: null,
          useInfant: editUseInfantMale || editUseInfantFemale,
          infantMin: editUseInfantMale ? (editInfantMaleMin !== "" ? Number(editInfantMaleMin) : null) : (editUseInfantFemale ? (editInfantFemaleMin !== "" ? Number(editInfantFemaleMin) : null) : null),
          infantMax: editUseInfantMale ? (editInfantMaleMax !== "" ? Number(editInfantMaleMax) : null) : (editUseInfantFemale ? (editInfantFemaleMax !== "" ? Number(editInfantFemaleMax) : null) : null),
          useChild: editUseChildMale || editUseChildFemale,
          childMin: editUseChildMale ? (editChildMaleMin !== "" ? Number(editChildMaleMin) : null) : (editUseChildFemale ? (editChildFemaleMin !== "" ? Number(editChildFemaleMin) : null) : null),
          childMax: editUseChildMale ? (editChildMaleMax !== "" ? Number(editChildMaleMax) : null) : (editUseChildFemale ? (editChildFemaleMax !== "" ? Number(editChildFemaleMax) : null) : null),
          useAdult: editUseAdultMale || editUseAdultFemale,
          adultMin: editUseAdultMale ? (editAdultMaleMin !== "" ? Number(editAdultMaleMin) : null) : (editUseAdultFemale ? (editAdultFemaleMin !== "" ? Number(editAdultFemaleMin) : null) : null),
          adultMax: editUseAdultMale ? (editAdultMaleMax !== "" ? Number(editAdultMaleMax) : null) : (editUseAdultFemale ? (editAdultFemaleMax !== "" ? Number(editAdultFemaleMax) : null) : null),

          // Category Specific Overrides
          useNewbornMale: editUseNewbornMale,
          newbornMaleMin: editUseNewbornMale && editNewbornMaleMin !== "" ? Number(editNewbornMaleMin) : null,
          newbornMaleMax: editUseNewbornMale && editNewbornMaleMax !== "" ? Number(editNewbornMaleMax) : null,
          newbornMaleText: editUseNewbornMale ? editNewbornMaleText : null,

          useNewbornFemale: editUseNewbornFemale,
          newbornFemaleMin: editUseNewbornFemale && editNewbornFemaleMin !== "" ? Number(editNewbornFemaleMin) : null,
          newbornFemaleMax: editUseNewbornFemale && editNewbornFemaleMax !== "" ? Number(editNewbornFemaleMax) : null,
          newbornFemaleText: editUseNewbornFemale ? editNewbornFemaleText : null,

          useInfantMale: editUseInfantMale,
          infantMaleMin: editUseInfantMale && editInfantMaleMin !== "" ? Number(editInfantMaleMin) : null,
          infantMaleMax: editUseInfantMale && editInfantMaleMax !== "" ? Number(editInfantMaleMax) : null,
          infantMaleText: editUseInfantMale ? editInfantMaleText : null,

          useInfantFemale: editUseInfantFemale,
          infantFemaleMin: editUseInfantFemale && editInfantFemaleMin !== "" ? Number(editInfantFemaleMin) : null,
          infantFemaleMax: editUseInfantFemale && editInfantFemaleMax !== "" ? Number(editInfantFemaleMax) : null,
          infantFemaleText: editUseInfantFemale ? editInfantFemaleText : null,

          useChildMale: editUseChildMale,
          childMaleMin: editUseChildMale && editChildMaleMin !== "" ? Number(editChildMaleMin) : null,
          childMaleMax: editUseChildMale && editChildMaleMax !== "" ? Number(editChildMaleMax) : null,
          childMaleText: editUseChildMale ? editChildMaleText : null,

          useChildFemale: editUseChildFemale,
          childFemaleMin: editUseChildFemale && editChildFemaleMin !== "" ? Number(editChildFemaleMin) : null,
          childFemaleMax: editUseChildFemale && editChildFemaleMax !== "" ? Number(editChildFemaleMax) : null,
          childFemaleText: editUseChildFemale ? editChildFemaleText : null,

          useAdultMale: editUseAdultMale,
          adultMaleMin: editUseAdultMale && editAdultMaleMin !== "" ? Number(editAdultMaleMin) : null,
          adultMaleMax: editUseAdultMale && editAdultMaleMax !== "" ? Number(editAdultMaleMax) : null,
          adultMaleText: editUseAdultMale ? editAdultMaleText : null,

          useAdultFemale: editUseAdultFemale,
          adultFemaleMin: editUseAdultFemale && editAdultFemaleMin !== "" ? Number(editAdultFemaleMin) : null,
          adultFemaleMax: editUseAdultFemale && editAdultFemaleMax !== "" ? Number(editAdultFemaleMax) : null,
          adultFemaleText: editUseAdultFemale ? editAdultFemaleText : null,

          genderRanges: {
            maleMin: editUseAdultMale ? Number(editAdultMaleMin) || 0 : 0,
            maleMax: editUseAdultMale ? Number(editAdultMaleMax) || 0 : 0,
            femaleMin: editUseAdultFemale ? Number(editAdultFemaleMin) || 0 : 0,
            femaleMax: editUseAdultFemale ? Number(editAdultFemaleMax) || 0 : 0
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
    localStorage.setItem("synos_selected_test_id", selectedTest.id);
  };

  const handleSaveAll = async () => {
    if (!selectedTest) return;

    // 1. Client-side uniqueness and modality validation for selectedTest ONLY
    const normCode = (selectedTest.code || "").trim().toUpperCase();
    if (!normCode) {
      alert(`Test name "${selectedTest.name}" must have a valid test code.`);
      return;
    }

    // Verify uniqueness against other tests in catalog list
    const hasDuplicate = catalog.some(
      item => item.id !== selectedTest.id && (item.code || "").trim().toUpperCase() === normCode
    );
    if (hasDuplicate) {
      alert(`Duplicate test code detected: "${normCode}". Each test must have a unique code.`);
      return;
    }

    // Enforce modality validation for Radiology tests
    const deptObj = dbDeptsList.find(d => d.name === selectedTest.department);
    const isRadiology = deptObj ? deptObj.macroDepartment === "Radiology" : (selectedTest.department === "Radiology" || selectedTest.department === "RAD");
    if (isRadiology && !selectedTest.modalityId) {
      alert(`Imaging Modality is required for Radiology test "${selectedTest.name}".`);
      return;
    }

    // Check conflict with database tests
    const dbConflict = originalDbTests.find(
      dt => (dt.testCode || dt.TestCode || dt.code || "").toUpperCase() === normCode
    );
    if (dbConflict && dbConflict.isActive !== false) {
      const dbConflictId = dbConflict.testId || dbConflict.TestId || dbConflict.id;
      const isTempId = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedTest.id);
      if (isTempId || selectedTest.id !== dbConflictId) {
        alert(`The test code "${normCode}" is already registered in the system (associated with test "${dbConflict.testName || dbConflict.TestName || dbConflict.name}").\n\nPlease use a unique code.`);
        return;
      }
    }

    setIsLoadingTests(true);
    try {
      // Format parameters for selectedTest
      const minNum = selectedTest.minRange !== undefined && selectedTest.minRange !== null && selectedTest.minRange !== "" ? Number(selectedTest.minRange) : null;
      const maxNum = selectedTest.maxRange !== undefined && selectedTest.maxRange !== null && selectedTest.maxRange !== "" ? Number(selectedTest.maxRange) : null;
      
      const formattedItem = {
        ...selectedTest,
        parameters: (selectedTest.parameters || []).map(p => {
          const pMin = p.minRange !== undefined && p.minRange !== null && p.minRange !== "" ? Number(p.minRange) : null;
          const pMax = p.maxRange !== undefined && p.maxRange !== null && p.maxRange !== "" ? Number(p.maxRange) : null;
          return {
            ...p,
            minRange: pMin !== null && !isNaN(pMin) ? pMin : undefined,
            maxRange: pMax !== null && !isNaN(pMax) ? pMax : undefined
          };
        })
      };

      const mapToDto = (item) => {
        const deptObj = dbDeptsList.find(d => d.name === item.department);
        const isRadiology = deptObj ? deptObj.macroDepartment === "Radiology" : (item.department === "Radiology" || item.department === "RAD");
        return {
          TestCode: item.code,
          TestName: item.name,
          Department: item.department || "Biochemistry",
          ModalityId: isRadiology ? item.modalityId : null,
          Category: isRadiology ? (modalitiesList.find(m => m.modalityId === item.modalityId)?.name || item.category || "X-Ray") : (item.category || "General"),
          BasePrice: Number(item.basePrice) || 0,
          TAT_Hours: Number(item.tatHours || item.TAT_Hours) || 24,
          IsOutsourced: !!(item.isOutsourced || (item.outsource && item.outsource.enabled)),
          SpecimenTypeCode: isRadiology ? "NO_SPECIMEN" : (item.specimenTypeCode || "SERUM"),
          IsProfile: !!item.isProfile,
          ReportTemplateId: item.templateId || null,
          DefaultInterpretation: item.defaultInterpretation || null,
          ReportTitle: item.reportTitle || null,
          Parameters: (item.parameters || []).map((p, idx) => ({
            ParameterCode: p.code,
            ParameterName: p.name,
            Unit: p.unit || null,
            DataType: p.dataType || (p.minRange !== undefined || p.maxRange !== undefined ? "Numeric" : "Text"),
            SortOrder: Number(p.sortOrder || idx + 1),
            Methodology: p.method || null,
            Formula: p.formula || null,
            IsCalculated: !!(p.hasFormula || p.formula),
            ReferenceRange: p.referenceRange || formatReferenceRange(p),
            NarrativeTemplate: p.narrativeTemplate || null,
            ShowNarrative: !!p.showNarrative,
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
            AdultMax: p.useAdult && p.adultMax !== undefined && p.adultMax !== "" && p.adultMax !== null ? Number(p.adultMax) : null,
            UseNewbornMale: !!p.useNewbornMale,
            NewbornMaleMin: p.useNewbornMale && p.newbornMaleMin !== undefined && p.newbornMaleMin !== "" && p.newbornMaleMin !== null ? Number(p.newbornMaleMin) : null,
            NewbornMaleMax: p.useNewbornMale && p.newbornMaleMax !== undefined && p.newbornMaleMax !== "" && p.newbornMaleMax !== null ? Number(p.newbornMaleMax) : null,
            NewbornMaleText: p.newbornMaleText || null,
            UseNewbornFemale: !!p.useNewbornFemale,
            NewbornFemaleMin: p.useNewbornFemale && p.newbornFemaleMin !== undefined && p.newbornFemaleMin !== "" && p.newbornFemaleMin !== null ? Number(p.newbornFemaleMin) : null,
            NewbornFemaleMax: p.useNewbornFemale && p.newbornFemaleMax !== undefined && p.newbornFemaleMax !== "" && p.newbornFemaleMax !== null ? Number(p.newbornFemaleMax) : null,
            NewbornFemaleText: p.newbornFemaleText || null,
            UseInfantMale: !!p.useInfantMale,
            InfantMaleMin: p.useInfantMale && p.infantMaleMin !== undefined && p.infantMaleMin !== "" && p.infantMaleMin !== null ? Number(p.infantMaleMin) : null,
            InfantMaleMax: p.useInfantMale && p.infantMaleMax !== undefined && p.infantMaleMax !== "" && p.infantMaleMax !== null ? Number(p.infantMaleMax) : null,
            InfantMaleText: p.infantMaleText || null,
            UseInfantFemale: !!p.useInfantFemale,
            InfantFemaleMin: p.useInfantFemale && p.infantFemaleMin !== undefined && p.infantFemaleMin !== "" && p.infantFemaleMin !== null ? Number(p.infantFemaleMin) : null,
            InfantFemaleMax: p.useInfantFemale && p.infantFemaleMax !== undefined && p.infantFemaleMax !== "" && p.infantFemaleMax !== null ? Number(p.infantFemaleMax) : null,
            InfantFemaleText: p.infantFemaleText || null,
            UseChildMale: !!p.useChildMale,
            ChildMaleMin: p.useChildMale && p.childMaleMin !== undefined && p.childMaleMin !== "" && p.childMaleMin !== null ? Number(p.childMaleMin) : null,
            ChildMaleMax: p.useChildMale && p.childMaleMax !== undefined && p.childMaleMax !== "" && p.childMaleMax !== null ? Number(p.childMaleMax) : null,
            ChildMaleText: p.childMaleText || null,
            UseChildFemale: !!p.useChildFemale,
            ChildFemaleMin: p.useChildFemale && p.childFemaleMin !== undefined && p.childFemaleMin !== "" && p.childFemaleMin !== null ? Number(p.childFemaleMin) : null,
            ChildFemaleMax: p.useChildFemale && p.childFemaleMax !== undefined && p.childFemaleMax !== "" && p.childFemaleMax !== null ? Number(p.childFemaleMax) : null,
            ChildFemaleText: p.childFemaleText || null,
            UseAdultMale: !!p.useAdultMale,
            AdultMaleMin: p.useAdultMale && p.adultMaleMin !== undefined && p.adultMaleMin !== "" && p.adultMaleMin !== null ? Number(p.adultMaleMin) : null,
            AdultMaleMax: p.useAdultMale && p.adultMaleMax !== undefined && p.adultMaleMax !== "" && p.adultMaleMax !== null ? Number(p.adultMaleMax) : null,
            AdultMaleText: p.adultMaleText || null,
            UseAdultFemale: !!p.useAdultFemale,
            AdultFemaleMin: p.useAdultFemale && p.adultFemaleMin !== undefined && p.adultFemaleMin !== "" && p.adultFemaleMin !== null ? Number(p.adultFemaleMin) : null,
            AdultFemaleMax: p.useAdultFemale && p.adultFemaleMax !== undefined && p.adultFemaleMax !== "" && p.adultFemaleMax !== null ? Number(p.adultFemaleMax) : null,
            AdultFemaleText: p.adultFemaleText || null
          })),
          IncludedTestCodes: (item.includedTestIds || []).map(childId => {
            const childTest = catalog.find(t => t.id === childId);
            return childTest ? childTest.code : null;
          }).filter(Boolean)
        };
      };

      const matchingDbTest = originalDbTests.find(
        dt => (dt.testCode || dt.TestCode || dt.code || "").toLowerCase() === formattedItem.code.toLowerCase()
      );
      const dbId = matchingDbTest ? (matchingDbTest.testId || matchingDbTest.TestId || matchingDbTest.id) : null;
      const hasValidDbId = dbId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dbId);
      const isExistingInDb = (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formattedItem.id)) || hasValidDbId;
      const targetId = isExistingInDb ? (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formattedItem.id) ? formattedItem.id : dbId) : formattedItem.id;

      let savedItem = null;
      let saveErrors = [];

      if (isExistingInDb) {
        const dto = {
          ...mapToDto(formattedItem),
          IsActive: formattedItem.isActive !== false
        };
        try {
          await AdminApi.updateTest(targetId, dto);
          savedItem = {
            ...formattedItem,
            id: targetId
          };
        } catch (err) {
          console.error(`Failed to update test ${formattedItem.code} (${targetId}):`, err);
          saveErrors.push({ code: formattedItem.code, error: err.message || err.toString() || "Unknown error" });
        }
      } else {
        const dto = mapToDto(formattedItem);
        try {
          const createdTest = await AdminApi.createTest(dto);
          const returnedId = createdTest.testId || createdTest.TestId || createdTest.id;
          savedItem = {
            ...formattedItem,
            id: returnedId
          };
        } catch (err) {
          console.error(`Failed to create test ${formattedItem.code}:`, err);
          saveErrors.push({ code: formattedItem.code, error: err.message || err.toString() || "Unknown error" });
        }
      }

      // Reconstruct updatedCatalog in original UI order
      let updatedCatalog = catalog;
      let updatedSelectedTest = selectedTest;

      if (savedItem) {
        updatedCatalog = catalog.map(item => item.id === selectedTest.id ? savedItem : item);
        updatedSelectedTest = savedItem;
      }

      // Fetch fresh database list and update state
      const freshDbTests = await AdminApi.getTests();
      setOriginalDbTests(freshDbTests || []);

      // Update catalog and selected test states
      setCatalog(updatedCatalog);

      if (updatedSelectedTest) {
        const found = updatedCatalog.find(t => t.id === updatedSelectedTest.id);
        if (found) {
          updatedSelectedTest = found;
        }
        setSelectedTest(updatedSelectedTest);
        localStorage.setItem("synos_selected_test_id", updatedSelectedTest.id);
      }

      if (saveErrors.length > 0) {
        const errList = saveErrors.map(e => `- ${e.code}: ${e.error}`).join("\n");
        alert(`Failed to save catalog changes:\n\n${errList}`);
      } else {
        setIsSavedSuccessfully(true);
        setTimeout(() => setIsSavedSuccessfully(false), 2500);
      }

    } catch (error) {
      console.error("Critical error during catalog sync:", error);
    } finally {
      setIsLoadingTests(false);
    }
  };

  const renderLivePreview = () => {
    if (!showLivePreview) return null;

    const activeTemplate = getActiveTemplate(selectedTest, reportTemplatesList);
    const coords = getCoordinates(activeTemplate);
    const hasTemplateColumns = activeTemplate.columns && activeTemplate.columns.length > 0;
    const totalWeight = hasTemplateColumns ? activeTemplate.columns.reduce((sum, c) => sum + c.weight, 0) : 1;
    const childParams = getCompiledProfileParameters(selectedTest, catalog);
    const childCodes = new Set(childParams.map(cp => cp.code));
    const nativeParams = (selectedTest.parameters || []).filter(np => !childCodes.has(np.code));
    const displayParams = [...childParams, ...nativeParams];

    const interpretationVal = activeTab === "interpretation"
      ? (selectedTest.defaultInterpretation || "")
      : (selectedTest.defaultInterpretation || 
         ((selectedTest.reportStyle === "Descriptive Narrative" || selectedTest.department?.toUpperCase() === "RADIOLOGY") && displayParams && displayParams[0]?.narrativeTemplate
          ? displayParams[0]?.narrativeTemplate 
          : ""));

    const shouldShowInterpretation = activeTab === "interpretation"
      ? !!interpretationVal
      : (selectedTest.showInterpretation && !!interpretationVal);

    const interpretationContent = renderPreviewInterpretation(interpretationVal);

    return (
      <div className="lg:col-span-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-inner space-y-4 lg:h-full lg:overflow-y-auto custom-scrollbar flex flex-col min-h-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Live Renderer Layout Preview</span>
            <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" /> PDF WYSIWYG
            </span>
          </div>
          
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

        <div className="w-full overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-100 dark:bg-zinc-950 p-4 flex justify-center">
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

              {((previewMode === "digital") || (previewMode === "physical" && !activeTemplate.usePreprinted)) && activeTemplate.bgType === "gradient" && (
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{ 
                    backgroundImage: `linear-gradient(${activeTemplate.bgGradientAngle || 135}deg, ${activeTemplate.bgGradientStart || '#ffffff'}, ${activeTemplate.bgGradientEnd || '#f1f5f9'})`,
                    zIndex: 0 
                  }} 
                />
              )}

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

              <div className="relative z-10 w-full h-full flex flex-col justify-between">
                <div>
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

                  {!activeTemplate.enableAbsolutePositioning && previewMode === "physical" && activeTemplate.usePreprinted && (
                    <div className="h-[90px] border border-dashed border-zinc-200 bg-zinc-50/50 rounded-lg flex flex-col justify-center items-center mb-6 relative z-10">
                      <span className="text-[8px] font-semibold tracking-wider text-zinc-650">Physical pre-printed sheet header region</span>
                      <span className="text-[7px] text-zinc-400 font-mono mt-0.5">Top Safe Margins: {activeTemplate.topMargin}mm (~90px gap)</span>
                    </div>
                  )}

                  {activeTemplate.enableAbsolutePositioning ? (
                    <>
                      <span className="hidden" data-patient-name-placeholder={"{" + "{" + "PATIENT_NAME" + "}" + "}"} />
                      <span className="hidden" data-ref-doctor-placeholder={"{" + "{" + "REF_DOCTOR" + "}" + "}"} />
                      <span className="hidden" data-age-sex-placeholder={"{" + "{" + "AGE_SEX" + "}" + "}"} />
                      <span className="hidden" data-patient-id-placeholder={"{" + "{" + "PATIENT_ID" + "}" + "}"} />
                      <span className="hidden" data-billing-date-placeholder={"{" + "{" + "BILLING_DATE" + "}" + "}"} />
                      <span className="hidden" data-report-date-placeholder={"{" + "{" + "REPORT_DATE" + "}" + "}"} />
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
 
                      <div
                        style={{
                          position: 'absolute',
                          left: `${coords.patientIdX}mm`,
                          top: `${coords.patientIdY}mm`,
                          cursor: 'grab',
                          zIndex: 20
                        }}
                        onPointerDown={(e) => handleStartDrag(e, activeTemplate.id, 'patientIdX', 'patientIdY', coords.patientIdX, coords.patientIdY)}
                        className="bg-transparent border-0 shadow-none p-1 text-[10px] text-zinc-855 dark:text-zinc-200 transition-all select-none hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 rounded"
                      >
                        <span className="font-semibold font-mono text-zinc-700 dark:text-zinc-300">PID-2026-8940</span>
                      </div>
 
                      <div
                        style={{
                          position: 'absolute',
                          left: `${coords.billingDateX}mm`,
                          top: `${coords.billingDateY}mm`,
                          cursor: 'grab',
                          zIndex: 20
                        }}
                        onPointerDown={(e) => handleStartDrag(e, activeTemplate.id, 'billingDateX', 'billingDateY', coords.billingDateX, coords.billingDateY)}
                        className="bg-transparent border-0 shadow-none p-1 text-[10px] text-zinc-855 dark:text-zinc-200 transition-all select-none hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 rounded"
                      >
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">20-May-2026</span>
                      </div>
 
                      <div
                        style={{
                          position: 'absolute',
                          left: `${coords.reportDateX}mm`,
                          top: `${coords.reportDateY}mm`,
                          cursor: 'grab',
                          zIndex: 20
                        }}
                        onPointerDown={(e) => handleStartDrag(e, activeTemplate.id, 'reportDateX', 'reportDateY', coords.reportDateX, coords.reportDateY)}
                        className="bg-transparent border-0 shadow-none p-1 text-[10px] text-zinc-855 dark:text-zinc-200 transition-all select-none hover:ring-1 hover:ring-synos-primary/50 hover:bg-synos-primary/5 rounded"
                      >
                        <span className="font-bold text-zinc-800 dark:text-zinc-100">22-May-2026</span>
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        marginTop: '10px',
                        marginBottom: '15px'
                      }}
                      className="transition-all"
                    >
                      <div className="flex justify-between items-center text-[9px] border-b border-zinc-150 pb-1.5 font-semibold text-zinc-655 dark:text-zinc-400">
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
                            <React.Fragment key={i}>
                              <tr 
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
                              {p.showNarrative && p.narrativeTemplate && (
                                <tr>
                                  <td colSpan={activeTemplate.columns.length} className="py-1 px-4 text-[7px] text-zinc-500 italic bg-zinc-50/20">
                                    <div className="wysiwyg-content leading-normal">
                                      {renderPreviewInterpretation(p.narrativeTemplate)}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    ) : (
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

                    {!activeTemplate.enableAbsolutePositioning && shouldShowInterpretation && (
                      <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 mt-3 text-left">
                        <span className="font-bold block text-[7px] text-zinc-500 uppercase tracking-wide">Commentaries & Remarks</span>
                        <div className="text-[7.5px] italic text-zinc-655 mt-0.5 leading-normal">
                          {interpretationContent}
                        </div>
                      </div>
                    )}
                  </div>

                  {activeTemplate.enableAbsolutePositioning && shouldShowInterpretation && (
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
                        <div className="text-[7.5px] italic text-zinc-655 mt-0.5 leading-normal">
                          {interpretationContent}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
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

                  {!activeTemplate.enableAbsolutePositioning && previewMode === "physical" && activeTemplate.usePreprinted && (
                    <div className="h-[70px] border border-dashed border-zinc-200 bg-zinc-50/50 rounded-lg flex flex-col justify-center items-center mt-4 relative z-10">
                      <span className="text-[8px] font-semibold tracking-wider text-zinc-650">Physical pre-printed sheet region</span>
                      <span className="text-[7px] text-zinc-400 font-mono mt-0.5">Bottom Safe Margins: {activeTemplate.bottomMargin}mm (~70px gap)</span>
                    </div>
                  )}

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
      </div>
    );
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-3 shrink-0">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <Beaker className="w-5 h-5 text-synos-primary" />
            Test Master
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
            Configure reference parameters, simple templates, and customer prices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Download Template
          </button>

          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
          >
            <UploadCloud className="w-3.5 h-3.5" /> Import Catalog
          </button>

          <button
            type="button"
            onClick={handleSyncCatalogOnly}
            disabled={isSyncingCatalog}
            className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncingCatalog ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" /> Sync Catalog
              </>
            )}
          </button>

          <button
            id="btn-save-catalog-master"
            onClick={handleSaveAll}
            disabled={isLoadingTests}
            className="px-4 py-1.5 bg-synos-primary hover:bg-synos-primary/95 text-white font-semibold text-xs uppercase tracking-wider rounded-lg shadow-sm active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingTests ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Saving...
              </>
            ) : isSavedSuccessfully ? (
              <>
                <Check className="w-3.5 h-3.5 text-white animate-bounce" /> Saved Successfully
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" /> Save Selected Test
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 min-h-0 overflow-hidden pb-4">
        
        {/* Left Panel: Test Catalog */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 shadow-sm lg:h-full min-h-0 overflow-hidden">
          <div className="flex items-center justify-between shrink-0">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Test Catalog</h3>
            <button 
              onClick={handleAddTest}
              className="p-1 bg-synos-primary/10 text-synos-primary border border-synos-primary/20 rounded-lg hover:bg-synos-primary hover:text-white transition-colors flex items-center gap-1 text-xs font-medium px-2.5"
            >
              <Plus className="w-3 h-3" /> Create
            </button>
          </div>

          <div ref={searchContainerRef} className="relative shrink-0 flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                id="test-catalog-search-input"
                type="text"
                autoComplete="off"
                placeholder="Search tests..."
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 pl-9 pr-9 text-xs focus:outline-none focus:ring-1 focus:ring-synos-primary/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-850 rounded-md text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-250 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Horizontal Department Filter Badges */}
            <div className="relative group/filters mt-1">
              {showLeftScroll && (
                <div className="absolute left-0 top-0 bottom-0.5 w-10 bg-gradient-to-r from-white via-white/90 to-transparent dark:from-zinc-900 dark:via-zinc-900/90 dark:to-transparent z-10 flex items-center justify-start pointer-events-none">
                  <button
                    type="button"
                    onClick={() => {
                      filterScrollContainerRef.current?.scrollBy({ left: -120, behavior: 'smooth' });
                    }}
                    className="pointer-events-auto p-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full shadow-md text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:scale-105 transition-all flex items-center justify-center"
                    title="Scroll left"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div 
                ref={filterScrollContainerRef}
                onWheel={handleFilterWheel}
                className="flex items-center gap-1.5 overflow-x-auto pb-0.5 shrink-0 scroll-smooth select-none scrollbar-none"
                style={{ WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}
              >
                {departments.map(dept => {
                  const count = getDeptCount(dept);
                  const isSelected = selectedDept === dept;
                  return (
                    <button
                      key={dept}
                      onClick={() => setSelectedDept(dept)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-medium transition-all shrink-0 border whitespace-nowrap flex items-center gap-1",
                        isSelected
                          ? "bg-synos-primary/10 border-synos-primary/20 text-synos-primary font-semibold"
                          : "bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      )}
                    >
                      <span>{dept}</span>
                      <span className={cn(
                        "text-[9px] font-mono px-1 rounded-md",
                        isSelected ? "bg-synos-primary/20" : "bg-zinc-200/50 dark:bg-zinc-850"
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {showRightScroll && (
                <div className="absolute right-0 top-0 bottom-0.5 w-10 bg-gradient-to-l from-white via-white/90 to-transparent dark:from-zinc-900 dark:via-zinc-900/90 dark:to-transparent z-10 flex items-center justify-end pointer-events-none">
                  <button
                    type="button"
                    onClick={() => {
                      filterScrollContainerRef.current?.scrollBy({ left: 120, behavior: 'smooth' });
                    }}
                    className="pointer-events-auto p-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full shadow-md text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:scale-105 transition-all flex items-center justify-center"
                    title="Scroll right"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>


          <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
            {filteredCatalog.map(test => (
              <div
                key={test.id}
                onClick={() => handleSelectTest(test)}
                className={cn(
                  "w-full text-left p-2.5 rounded-xl border transition-all flex items-start justify-between group cursor-pointer",
                  selectedTest.id === test.id
                    ? "bg-synos-primary/10 border-synos-primary/30 text-zinc-900 dark:text-white"
                    : "bg-white dark:bg-zinc-900/10 border-zinc-200 dark:border-zinc-800/80 text-zinc-655 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <span className="font-semibold text-xs tracking-tight text-zinc-800 dark:text-zinc-200 block whitespace-normal break-words leading-tight">{test.name}</span>
                  <div className="flex flex-wrap items-center gap-1 mt-1 text-[9px] font-medium">
                    <span className="bg-synos-primary/10 text-synos-primary border border-synos-primary/20 px-1 py-0.25 rounded uppercase tracking-wider font-mono shrink-0">{test.code}</span>
                    <span className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-1 py-0.25 rounded uppercase tracking-wider truncate max-w-[120px]" title={test.department}>{test.department}</span>
                    {test.isProfile && (
                      <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 py-0.25 rounded uppercase tracking-wider flex items-center gap-0.5 shrink-0">
                        <Layers className="w-2 h-2" /> Panel
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">₹{test.basePrice}</span>
                  <button 
                    onClick={(e) => handleDeleteTest(test.id, e)}
                    className="p-0.5 hover:bg-rose-500/10 text-zinc-400 dark:text-zinc-500 hover:text-rose-500 rounded transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center"
                    title="Delete test"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-synos-primary translate-x-0 group-hover:translate-x-0.5 transition-transform" />
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
          {selectedTest ? (
            <>
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
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1 flex items-center justify-between">
                      <span>Department</span>
                      <button
                        type="button"
                        onClick={() => setShowCreateDeptModal(true)}
                        className="text-xs font-medium text-synos-primary hover:text-synos-primary/80 transition-colors flex items-center gap-0.5"
                      >
                        + Add New
                      </button>
                    </label>
                    <select
                      className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-2 text-sm w-full text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary"
                      value={metaDept}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMetaDept(val);
                        const dObj = dbDeptsList.find(d => d.name === val);
                        const isRad = dObj ? dObj.macroDepartment === "Radiology" : (val === "Radiology" || val === "RAD");
                        if (isRad) {
                          const firstMod = modalitiesList.find(m => m.departmentId === dObj?.departmentId);
                          setMetaModalityId(firstMod ? firstMod.modalityId : "");
                        } else {
                          setMetaModalityId("");
                        }
                      }}
                    >
                      {departments.filter(d => d !== "All").map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  {(() => {
                    const currentDeptObj = dbDeptsList.find(d => d.name === metaDept);
                    const isRad = currentDeptObj ? currentDeptObj.macroDepartment === "Radiology" : (metaDept === "Radiology" || metaDept === "RAD");
                    if (isRad) {
                      return (
                        <div>
                          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1 flex items-center justify-between">
                            <span>Imaging Modality</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (!currentDeptObj) {
                                  alert("Please save or select a database department first to add a modality.");
                                  return;
                                }
                                setShowCreateModalityModal(true);
                              }}
                              className="text-xs font-medium text-synos-primary hover:text-synos-primary/80 transition-colors flex items-center gap-0.5"
                            >
                              + Add New
                            </button>
                          </label>
                          <select
                            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-2 text-sm w-full text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary"
                            value={metaModalityId}
                            onChange={(e) => setMetaModalityId(e.target.value)}
                          >
                            <option value="">-- Select Modality --</option>
                            {modalitiesList
                              .filter(m => !currentDeptObj || m.departmentId === currentDeptObj.departmentId)
                              .map(m => (
                                <option key={m.modalityId} value={m.modalityId}>{m.name} ({m.code})</option>
                              ))}
                          </select>
                        </div>
                      );
                    } else {
                      return (
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
                      );
                    }
                  })()}
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
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white tracking-tight leading-tight">{selectedTest.name}</h2>
                    <span className="bg-synos-primary/10 text-synos-primary border border-synos-primary/20 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider font-mono">
                      {selectedTest.code}
                    </span>
                    {selectedTest.isProfile && (
                      <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider flex items-center gap-0.5">
                        <Layers className="w-2.5 h-2.5" /> Profile/Panel
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wider mt-1.5">
                    Department: {selectedTest.department} &bull; Base Price: ₹{selectedTest.basePrice} 
                    {(() => {
                      const displayDeptObj = dbDeptsList.find(d => d.name === selectedTest.department);
                      const displayIsRadiology = displayDeptObj ? displayDeptObj.macroDepartment === "Radiology" : (selectedTest.department === "Radiology" || selectedTest.department === "RAD");
                      if (displayIsRadiology) {
                        const mObj = modalitiesList.find(m => m.modalityId === selectedTest.modalityId);
                        return <> &bull; Modality: {mObj ? `${mObj.name} (${mObj.code})` : (selectedTest.category || "X-Ray")}</>;
                      } else {
                        return <> &bull; Specimen: {selectedTest.specimenTypeCode || "SERUM"}</>;
                      }
                    })()}
                  </p>
                </div>
              )}
            </div>

            {!isEditingMetadata && (
              <button
                id="btn-edit-metadata-active"
                onClick={() => setIsEditingMetadata(true)}
                className="py-1.5 px-3 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 transition-all flex items-center gap-1.5 text-xs font-medium shadow-xs shrink-0"
              >
                <Edit2 className="w-3.5 h-3.5" /> Modify Details
              </button>
            )}
          </div>

          {/* Central Workflow Tab Switchers & Preview Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 pb-px gap-2 shrink-0">
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setActiveTab("parameters")}
                className={cn(
                  "px-4 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 -mb-px",
                  activeTab === "parameters"
                    ? "border-synos-primary text-synos-primary font-semibold"
                    : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                )}
              >
                <Beaker className="w-3.5 h-3.5" /> Parameters
              </button>
              <button
                onClick={() => setActiveTab("report-setup")}
                className={cn(
                  "px-4 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 -mb-px",
                  activeTab === "report-setup"
                    ? "border-synos-primary text-synos-primary font-semibold"
                    : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                )}
              >
                <FileText className="w-3.5 h-3.5" /> Report Setup
              </button>
              <button
                onClick={() => setActiveTab("interpretation")}
                className={cn(
                  "px-4 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 -mb-px",
                  activeTab === "interpretation"
                    ? "border-synos-primary text-synos-primary font-semibold"
                    : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                )}
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-500 animate-pulse" /> Interpretation
              </button>
              <button
                onClick={() => setActiveTab("pricing")}
                className={cn(
                  "px-4 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 -mb-px",
                  activeTab === "pricing"
                    ? "border-synos-primary text-synos-primary font-semibold"
                    : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                )}
              >
                <IndianRupee className="w-3.5 h-3.5" /> Pricing
              </button>
              <button
                onClick={() => setActiveTab("inventory")}
                className={cn(
                  "px-4 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 -mb-px",
                  activeTab === "inventory"
                    ? "border-synos-primary text-synos-primary font-semibold"
                    : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                )}
              >
                <Package className="w-3.5 h-3.5" /> Inventory & Consumables
              </button>
              {selectedTest.isProfile && (
                <button
                  onClick={() => setActiveTab("profile-builder")}
                  className={cn(
                    "px-4 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 -mb-px",
                    activeTab === "profile-builder"
                      ? "border-synos-primary text-synos-primary font-semibold"
                      : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                  )}
                >
                  <Layers className="w-3.5 h-3.5" /> Profile Builder
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
                    narrativeTemplate: selectedTest.defaultInterpretation || "",
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

                  <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                          <th className="py-2.5 px-2 font-semibold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase w-[60px] text-center">S.No.</th>
                          {selectedTest.isProfile && <th className="py-2.5 px-2 font-semibold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase w-[120px]">Source</th>}
                          <th className="py-2.5 px-2 font-semibold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase w-[90px]">Code</th>
                          <th className="py-2.5 px-2 font-semibold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase min-w-[150px]">Parameter Name</th>
                          <th className="py-2.5 px-2 font-semibold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase w-[70px]">Unit</th>
                          <th className="py-2.5 px-2 font-semibold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase w-[180px]">Default Reference Range</th>
                          <th className="py-2.5 px-2 font-semibold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase w-[110px]">Methodology</th>
                          <th className="py-2.5 px-2 font-semibold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase w-[100px] text-center">Settings</th>
                          <th className="py-2.5 px-2 font-semibold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase w-[40px] text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white/50 dark:bg-zinc-900/10">
                        {combinedParams.map((p, idx) => {
                          const isFromChild = !!p.isFromChild;
                          const nativeIdx = idx - childParams.length;

                          return (
                            <tr 
                              key={idx} 
                              draggable={!isFromChild}
                              onDragStart={(e) => {
                                if (!isFromChild) {
                                  setDraggedParamIdx(nativeIdx);
                                  e.dataTransfer.setData("text/plain", nativeIdx);
                                }
                              }}
                              onDragOver={(e) => {
                                if (!isFromChild) {
                                  e.preventDefault();
                                }
                              }}
                              onDrop={(e) => {
                                if (!isFromChild && draggedParamIdx !== null) {
                                  moveParameterRow(draggedParamIdx, nativeIdx);
                                }
                              }}
                              onDragEnd={() => {
                                setDraggedParamIdx(null);
                              }}
                              className={cn("hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 group transition-colors", isFromChild && "bg-zinc-50/20 dark:bg-zinc-950/5", draggedParamIdx === nativeIdx && "opacity-40 bg-zinc-100 dark:bg-zinc-800")}
                            >
                              <td className="py-1 px-1 text-center w-[60px] select-none">
                                {isFromChild ? (
                                  <span className="text-zinc-400 dark:text-zinc-500 font-medium text-xs">{idx + 1}</span>
                                ) : (
                                  <div className="flex items-center gap-1 justify-center">
                                    <GripVertical className="w-3 h-3 text-zinc-350 dark:text-zinc-650 cursor-grab active:cursor-grabbing hover:text-zinc-500 drag-handle shrink-0" />
                                    <input
                                      type="number"
                                      min="1"
                                      max={combinedParams.length}
                                      value={idx + 1}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        if (!isNaN(val)) {
                                          const newPos = Math.max(1, Math.min(combinedParams.length, val));
                                          const targetNativeIdx = Math.max(0, Math.min(nativeParams.length - 1, newPos - 1 - childParams.length));
                                          moveParameterRow(nativeIdx, targetNativeIdx);
                                        }
                                      }}
                                      className="w-7 bg-transparent text-center focus:bg-white dark:focus:bg-zinc-950 focus:ring-1 focus:ring-synos-primary outline-none py-0.25 rounded text-zinc-800 dark:text-zinc-200 font-semibold text-xs border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 focus:border-zinc-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shrink-0"
                                    />
                                  </div>
                                )}
                              </td>
                              {selectedTest.isProfile && (
                                <td className="py-1 px-2">
                                  {isFromChild ? (
                                    <span className="bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wide inline-block max-w-[100px] truncate" title={p.childTestName}>
                                      {p.childTestName}
                                    </span>
                                  ) : (
                                    <span className="bg-synos-primary/10 border border-synos-primary/25 text-synos-primary px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wide inline-block">
                                      Profile Native
                                    </span>
                                  )}
                                </td>
                              )}
                              <td className="py-1 px-1">
                                <input
                                  type="text"
                                  readOnly={isFromChild}
                                  className={cn(
                                    "w-full bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-950 focus:ring-1 focus:ring-synos-primary outline-none px-2 py-1 rounded font-mono font-semibold text-zinc-800 dark:text-zinc-200 text-xs uppercase",
                                    isFromChild && "text-zinc-400 dark:text-zinc-500 font-medium cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent"
                                  )}
                                  value={p.code ?? ""}
                                  onChange={(e) => !isFromChild && handleParamCellChange(nativeIdx, 'code', e.target.value)}
                                />
                              </td>
                              <td className="py-1 px-1">
                                <input
                                  type="text"
                                  readOnly={isFromChild}
                                  className={cn(
                                    "w-full bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-950 focus:ring-1 focus:ring-synos-primary outline-none px-2 py-1 rounded text-zinc-700 dark:text-zinc-300 font-normal text-xs",
                                    isFromChild && "text-zinc-400 dark:text-zinc-550 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent"
                                  )}
                                  value={p.name ?? ""}
                                  onChange={(e) => !isFromChild && handleParamCellChange(nativeIdx, 'name', e.target.value)}
                                />
                              </td>
                              <td className="py-1 px-1">
                                <input
                                  type="text"
                                  readOnly={isFromChild}
                                  className={cn(
                                    "w-full bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-950 focus:ring-1 focus:ring-synos-primary outline-none px-2 py-1 rounded text-zinc-600 dark:text-zinc-450 font-normal text-xs",
                                    isFromChild && "text-zinc-400 dark:text-zinc-500 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent"
                                  )}
                                  value={p.unit ?? ""}
                                  onChange={(e) => !isFromChild && handleParamCellChange(nativeIdx, 'unit', e.target.value)}
                                />
                              </td>
                              <td className="py-1 px-1">
                                <input
                                  type="text"
                                  readOnly={isFromChild}
                                  className={cn(
                                    "w-full bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-950 focus:ring-1 focus:ring-synos-primary outline-none px-2 py-1 rounded text-zinc-605 dark:text-zinc-400 font-normal text-xs",
                                    isFromChild && "text-zinc-400 dark:text-zinc-500 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent"
                                  )}
                                  placeholder="e.g. 13.0 - 18.0"
                                  value={p.referenceRange ?? ""}
                                  onChange={(e) => !isFromChild && handleParamCellChange(nativeIdx, 'referenceRange', e.target.value)}
                                />
                              </td>
                              <td className="py-1 px-1">
                                <input
                                  type="text"
                                  readOnly={isFromChild}
                                  className={cn(
                                    "w-full bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-950 focus:ring-1 focus:ring-synos-primary outline-none px-2 py-1 rounded text-zinc-600 dark:text-zinc-400 font-normal text-xs",
                                    isFromChild && "text-zinc-400 dark:text-zinc-500 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent"
                                  )}
                                  value={p.method ?? ""}
                                  onChange={(e) => !isFromChild && handleParamCellChange(nativeIdx, 'method', e.target.value)}
                                />
                              </td>
                              <td className="py-1 px-1 text-center">
                                <div className="flex justify-center items-center">
                                  {isFromChild ? (
                                    <button
                                      onClick={() => {
                                        const childTest = catalog.find(t => t.code === p.childTestCode);
                                        if (childTest) {
                                          const confirmSwitch = window.confirm(
                                            `This parameter is inherited from the child test "${p.childTestName}" (${p.childTestCode}).\n\nTo edit its reference ranges or overrides, you must modify the child test directly.\n\nWould you like to switch to "${p.childTestName}" now?`
                                          );
                                          if (confirmSwitch) {
                                            handleSelectTest(childTest);
                                          }
                                        } else {
                                          alert(`Child test "${p.childTestName}" not found in catalog.`);
                                        }
                                      }}
                                      className="p-1 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-synos-primary hover:border-synos-primary/20 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all active:scale-90 flex items-center justify-center"
                                      title={`Inherited from child test: ${p.childTestName}. Click to open child test and configure.`}
                                    >
                                      <Settings className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => openDrawer(p.code, p.hasFormula ? 'formula' : 'ranges')}
                                      className={cn(
                                        "p-1 rounded border transition-all active:scale-90 flex items-center justify-center relative",
                                        p.hasFormula
                                          ? "bg-purple-500/10 border-purple-500/35 text-purple-600 dark:text-purple-400"
                                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-synos-primary hover:border-synos-primary/20"
                                      )}
                                      title={p.hasFormula ? `Calculated formula: ${p.formula}. Click to modify.` : "Configure calculations, reference ranges, analyzer mapping, and comments."}
                                    >
                                      <Settings className="w-3.5 h-3.5" />
                                      {p.hasFormula && (
                                        <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-[7px] font-semibold px-0.5 rounded-md scale-75 leading-none">
                                          fx
                                        </span>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="py-1 px-1 text-center">
                                {!isFromChild && (
                                  <button
                                    onClick={() => handleDeleteParameterRow(nativeIdx)}
                                    className="p-1 hover:bg-rose-500/10 text-zinc-500 dark:text-zinc-400 hover:text-rose-500 rounded transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center mx-auto"
                                    title="Delete parameter"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block ml-1">Report Title</label>
                      <input
                        type="text"
                        placeholder="Leave empty to use Test Name"
                        className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm w-full text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary font-medium"
                        value={selectedTest.reportTitle || ""}
                        onChange={(e) => handleReportSetupFieldChange("reportTitle", e.target.value)}
                      />
                    </div>

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
                        <div className="space-y-2.5 p-4 rounded-xl bg-violet-500/5 border border-violet-500/10 animate-in slide-in-from-top-2 duration-200 text-left">
                          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Clinical Interpretation Template Enabled</span>
                          </div>
                          <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed font-medium">
                            The report will render standard clinical interpretation comments. 
                            To compose and format the rich interpretation template, please use the dedicated **Interpretation** tab.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Preview Card */}
                {renderLivePreview()}
              </div>
            )}
            {/* Tab: Interpretation (Rich Medical Editor & Live Preview) */}
            {activeTab === "interpretation" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch lg:h-full min-h-0 overflow-hidden">
                {/* Form / Editor Column */}
                <div className={cn(
                  "bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col h-full overflow-hidden space-y-4",
                  showLivePreview ? "lg:col-span-6" : "lg:col-span-12"
                )}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-150 dark:border-zinc-800 pb-3 shrink-0">
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Default Interpretation Template</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Import Interpretation Template</span>
                      <div>
                        <input
                          type="file"
                          id="import-interpretation-file"
                          accept=".docx,.rtf,.txt"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            const isConfirmed = window.confirm(`Importing "${file.name}" will append or replace the current interpretation editor text. Continue?`);
                            if (!isConfirmed) return;

                            const loader = document.getElementById("import-loader");
                            if (loader) loader.classList.remove("hidden");

                            try {
                              const res = await AdminApi.importInterpretation(file);
                              const newText = res.content || res.Content || "";
                              
                              // TipTap JSON format or clean plain text
                              let formatText = newText;
                              if (!newText.startsWith("{")) {
                                // Convert plain text paragraph lines to simple TipTap JSON doc
                                const paragraphs = newText.split("\n").map(p => ({
                                  type: "paragraph",
                                  content: p.trim() ? [{ type: "text", text: p.trim() }] : []
                                }));
                                formatText = JSON.stringify({
                                  type: "doc",
                                  content: paragraphs
                                });
                              }

                              const updatedTest = { ...selectedTest, defaultInterpretation: formatText };
                              const updatedCatalog = catalog.map(t => t.id === selectedTest.id ? updatedTest : t);
                              setCatalog(updatedCatalog);
                              setSelectedTest(updatedTest);
                            } catch (err) {
                              console.error("Import failed:", err);
                              alert("Failed to import document: " + (err.message || err));
                            } finally {
                              if (loader) loader.classList.add("hidden");
                              e.target.value = "";
                            }
                          }}
                        />
                        <label
                          htmlFor="import-interpretation-file"
                          className="cursor-pointer py-1.5 px-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <UploadCloud className="w-4 h-4 text-violet-500" />
                          <span>Upload Document</span>
                          <span id="import-loader" className="hidden animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-synos-primary"></span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 h-full">
                    <RichMedicalEditor
                      value={selectedTest.defaultInterpretation || ""}
                      onChange={(newVal) => {
                        const updatedTest = { ...selectedTest, defaultInterpretation: newVal };
                        const updatedCatalog = catalog.map(t => t.id === selectedTest.id ? updatedTest : t);
                        setCatalog(updatedCatalog);
                        setSelectedTest(updatedTest);
                      }}
                      placeholder="Compose default clinical interpretation or report templates here..."
                      className="h-full border-0 bg-transparent dark:bg-transparent shadow-none rounded-none"
                    />
                  </div>
                </div>

                {renderLivePreview()}
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

            {/* Tab: Inventory & Consumables */}
            {activeTab === "inventory" && (
              <TestInventoryTab selectedTest={selectedTest} />
            )}

            {/* Tab: Profile Builder (Conditional) */}
            {activeTab === "profile-builder" && selectedTest.isProfile && (
              <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4 lg:h-full lg:overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Compose Panel / Profiles</h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Select and sequence the individual tests that compile into this comprehensive panel package.</p>
                  </div>
                  <span className="bg-amber-500/10 text-amber-500 border border-amber-500/25 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                    {(selectedTest.includedTestIds || []).length} Tests Selected
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100%-40px)] min-h-[400px]">
                  {/* Left Column: Available Tests Selection */}
                  <div className="lg:col-span-7 flex flex-col space-y-3 h-full border-r border-zinc-150 dark:border-zinc-850 pr-5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-500">Available Tests</h4>
                      <input 
                        type="text"
                        placeholder="Search tests..."
                        value={profileSearchTerm}
                        onChange={(e) => setProfileSearchTerm(e.target.value)}
                        className="text-xs border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[180px]"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto flex-1 pr-1 custom-scrollbar max-h-[420px]">
                      {catalog
                        .filter(t => !t.isProfile && t.id !== selectedTest.id && (t.name.toLowerCase().includes(profileSearchTerm.toLowerCase()) || t.code.toLowerCase().includes(profileSearchTerm.toLowerCase())))
                        .map(test => {
                          const isIncluded = (selectedTest.includedTestIds || []).includes(test.id);
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
                              <div className="min-w-0 flex-1 pr-2">
                                <span className="font-bold text-xs block text-zinc-800 dark:text-zinc-200 truncate" title={test.name}>{test.name}</span>
                                <span className="text-[9px] font-bold text-zinc-450 mt-1 uppercase tracking-wider bg-zinc-200/50 dark:bg-zinc-800 px-1.5 py-0.5 rounded inline-block">{test.code}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-zinc-400 font-semibold">{test.parameters?.length || 0} Param</span>
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

                  {/* Right Column: Ordered Sequence of Selected Tests */}
                  <div className="lg:col-span-5 flex flex-col space-y-3 h-full">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-500">Selected Sequence (Drag or edit S.No)</h4>
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden flex-1 flex flex-col min-h-[300px] max-h-[420px] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                            <th className="py-2.5 px-3 font-bold text-zinc-500 dark:text-zinc-400 text-xs uppercase w-[70px] text-center">S.No.</th>
                            <th className="py-2.5 px-3 font-bold text-zinc-500 dark:text-zinc-400 text-xs uppercase w-[80px]">Code</th>
                            <th className="py-2.5 px-3 font-bold text-zinc-500 dark:text-zinc-400 text-xs uppercase">Child Test</th>
                            <th className="py-2.5 px-3 font-bold text-zinc-500 dark:text-zinc-400 text-xs uppercase w-[50px] text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                          {(selectedTest.includedTestIds || []).map((childId, sidx) => {
                            const childTest = catalog.find(t => t.id === childId);
                            if (!childTest) return null;
                            return (
                              <tr 
                                key={childId}
                                draggable
                                onDragStart={(e) => {
                                  setDraggedChildTestIdx(sidx);
                                  e.dataTransfer.setData("text/plain", sidx);
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                }}
                                onDrop={(e) => {
                                  if (draggedChildTestIdx !== null) {
                                    moveIncludedTestRow(draggedChildTestIdx, sidx);
                                  }
                                }}
                                onDragEnd={() => {
                                  setDraggedChildTestIdx(null);
                                }}
                                className={cn(
                                  "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 group transition-colors",
                                  draggedChildTestIdx === sidx && "opacity-40 bg-zinc-100 dark:bg-zinc-800"
                                )}
                              >
                                <td className="py-1.5 px-2 text-center w-[70px] select-none">
                                  <div className="flex items-center gap-1 justify-center">
                                    <GripVertical className="w-3.5 h-3.5 text-zinc-350 dark:text-zinc-650 cursor-grab active:cursor-grabbing hover:text-zinc-500 drag-handle shrink-0" />
                                    <input
                                      type="number"
                                      min="1"
                                      max={selectedTest.includedTestIds.length}
                                      value={sidx + 1}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        if (!isNaN(val)) {
                                          const newPos = Math.max(1, Math.min(selectedTest.includedTestIds.length, val));
                                          moveIncludedTestRow(sidx, newPos - 1);
                                        }
                                      }}
                                      className="w-8 bg-transparent text-center focus:bg-white dark:focus:bg-zinc-950 focus:ring-1 focus:ring-synos-primary outline-none py-0.5 rounded text-zinc-800 dark:text-zinc-200 font-bold text-xs border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 focus:border-zinc-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shrink-0"
                                    />
                                  </div>
                                </td>
                                <td className="py-2 px-3 font-mono text-xs font-bold text-zinc-500 uppercase">{childTest.code}</td>
                                <td className="py-2 px-3 font-medium text-xs text-zinc-800 dark:text-zinc-200">{childTest.name}</td>
                                <td className="py-2 px-3 text-center">
                                  <button 
                                    onClick={() => handleToggleProfileTest(childId)}
                                    className="p-1 text-zinc-400 hover:text-red-500 rounded transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {(selectedTest.includedTestIds || []).length === 0 && (
                            <tr>
                              <td colSpan="4" className="py-8 text-center text-zinc-400 italic text-xs">
                                No child tests selected. Select tests from the left panel.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          </>
          ) : (
            <div className="flex-1 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
              <Beaker className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3 animate-pulse" />
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">No Test Selected</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-4">
                Please select a test from the catalog on the left, or create a new one to get started.
              </p>
              <button
                onClick={handleAddTest}
                className="px-4 py-2 bg-synos-primary hover:bg-synos-primary/95 text-white text-sm font-semibold rounded-xl shadow transition-all active:scale-95 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create First Test
              </button>
            </div>
          )}
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
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Default Range */}
                <div className="bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase block">Default Reference Range (Mandatory)</span>
                  <input
                    type="text"
                    className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs w-full text-zinc-900 dark:text-zinc-100 font-mono outline-none focus:ring-1 focus:ring-synos-primary"
                    placeholder="e.g. 13.0 - 18.0 or Negative"
                    value={editDefaultRange}
                    onChange={(e) => setEditDefaultRange(e.target.value)}
                  />
                  <p className="text-[8px] text-zinc-400">This range is used if no gender/age overrides are configured or if they do not match the patient.</p>
                </div>

                <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 block">Biological Category Overrides (Optional)</span>

                {/* Newborn */}
                <CategoryOverrideSection
                  title="Newborn Overrides (0-28 days)"
                  useMale={editUseNewbornMale}
                  setUseMale={setEditUseNewbornMale}
                  maleMin={editNewbornMaleMin}
                  setMaleMin={setEditNewbornMaleMin}
                  maleMax={editNewbornMaleMax}
                  setMaleMax={setEditNewbornMaleMax}
                  maleText={editNewbornMaleText}
                  setMaleText={setEditNewbornMaleText}
                  useFemale={editUseNewbornFemale}
                  setUseFemale={setEditUseNewbornFemale}
                  femaleMin={editNewbornFemaleMin}
                  setFemaleMin={setEditNewbornFemaleMin}
                  femaleMax={editNewbornFemaleMax}
                  setFemaleMax={setEditNewbornFemaleMax}
                  femaleText={editNewbornFemaleText}
                  setFemaleText={setEditNewbornFemaleText}
                  colorClass="text-cyan-600 dark:text-cyan-400"
                />

                {/* Infant */}
                <CategoryOverrideSection
                  title="Infant Overrides (29 days - 12 months)"
                  useMale={editUseInfantMale}
                  setUseMale={setEditUseInfantMale}
                  maleMin={editInfantMaleMin}
                  setMaleMin={setEditInfantMaleMin}
                  maleMax={editInfantMaleMax}
                  setMaleMax={setEditInfantMaleMax}
                  maleText={editInfantMaleText}
                  setMaleText={setEditInfantMaleText}
                  useFemale={editUseInfantFemale}
                  setUseFemale={setEditUseInfantFemale}
                  femaleMin={editInfantFemaleMin}
                  setFemaleMin={setEditInfantFemaleMin}
                  femaleMax={editInfantFemaleMax}
                  setFemaleMax={setEditInfantFemaleMax}
                  femaleText={editInfantFemaleText}
                  setFemaleText={setEditInfantFemaleText}
                  colorClass="text-indigo-600 dark:text-indigo-400"
                />

                {/* Child */}
                <CategoryOverrideSection
                  title="Child Overrides (1-12 years)"
                  useMale={editUseChildMale}
                  setUseMale={setEditUseChildMale}
                  maleMin={editChildMaleMin}
                  setMaleMin={setEditChildMaleMin}
                  maleMax={editChildMaleMax}
                  setMaleMax={setEditChildMaleMax}
                  maleText={editChildMaleText}
                  setMaleText={setEditChildMaleText}
                  useFemale={editUseChildFemale}
                  setUseFemale={setEditUseChildFemale}
                  femaleMin={editChildFemaleMin}
                  setFemaleMin={setEditChildFemaleMin}
                  femaleMax={editChildFemaleMax}
                  setFemaleMax={setEditChildFemaleMax}
                  femaleText={editChildFemaleText}
                  setFemaleText={setEditChildFemaleText}
                  colorClass="text-emerald-600 dark:text-emerald-400"
                />

                {/* Adult */}
                <CategoryOverrideSection
                  title="Adult Overrides (13+ years)"
                  useMale={editUseAdultMale}
                  setUseMale={setEditUseAdultMale}
                  maleMin={editAdultMaleMin}
                  setMaleMin={setEditAdultMaleMin}
                  maleMax={editAdultMaleMax}
                  setMaleMax={setEditAdultMaleMax}
                  maleText={editAdultMaleText}
                  setMaleText={setEditAdultMaleText}
                  useFemale={editUseAdultFemale}
                  setUseFemale={setEditUseAdultFemale}
                  femaleMin={editAdultFemaleMin}
                  setFemaleMin={setEditAdultFemaleMin}
                  femaleMax={editAdultFemaleMax}
                  setFemaleMax={setEditAdultFemaleMax}
                  femaleText={editAdultFemaleText}
                  setFemaleText={setEditAdultFemaleText}
                  colorClass="text-amber-600 dark:text-amber-400"
                />
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
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="show-narrative-checkbox"
                    checked={editShowNarrative}
                    onChange={(e) => setEditShowNarrative(e.target.checked)}
                    className="rounded border-zinc-300 text-synos-primary focus:ring-synos-primary h-4 w-4"
                  />
                  <label htmlFor="show-narrative-checkbox" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Show Narrative in Report (as a full-width sub-row)
                  </label>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 block">Default narrative / interpretation template</label>
                  <div className="h-96 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950">
                    <RichMedicalEditor
                      value={editNarrative}
                      onChange={(val) => setEditNarrative(val)}
                      placeholder="Type standard medical commentaries, range tables, or test explanations to render inside report PDF..."
                      className="h-full border-0 bg-transparent dark:bg-transparent shadow-none rounded-none"
                    />
                  </div>
                  <p className="text-[9px] text-zinc-400 leading-tight">When enabled, this comment will render directly under the parameter row spanning all columns of the report table.</p>
                </div>
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

      {/* Inline Create Department Modal */}
      {showCreateDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-950 dark:text-white">Create New Department</h3>
              <button 
                onClick={() => setShowCreateDeptModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg font-medium p-1"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateDepartmentSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Department Code</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. RAD"
                  className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm w-full text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary uppercase"
                  value={newDeptCode}
                  onChange={(e) => setNewDeptCode(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Department Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Radiology Ultra Sound"
                  className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm w-full text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Macro Department Group</label>
                <select
                  className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-2 text-sm w-full text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary"
                  value={newDeptMacro}
                  onChange={(e) => setNewDeptMacro(e.target.value)}
                >
                  <option value="Radiology">Radiology (Imaging & Scanning)</option>
                  <option value="Laboratory">Laboratory (Bio-Chem / Pathology)</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2.5 border-t border-zinc-100 dark:border-zinc-800">
                <button 
                  type="button"
                  onClick={() => setShowCreateDeptModal(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isCreatingDept}
                  className="px-4 py-2 bg-synos-primary hover:bg-synos-primary/90 disabled:opacity-50 text-white text-sm rounded-xl font-bold transition-all flex items-center gap-1.5"
                >
                  {isCreatingDept ? "Saving..." : "Create Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline Create Modality Modal */}
      {showCreateModalityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-950 dark:text-white">Create New Imaging Modality</h3>
              <button 
                onClick={() => setShowCreateModalityModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg font-medium p-1"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateModalitySubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Target Department (Scope)</label>
                <input 
                  type="text" 
                  disabled
                  className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm w-full text-zinc-500 dark:text-zinc-400 cursor-not-allowed font-medium"
                  value={metaDept}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Modality Code</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. US"
                  className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm w-full text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary uppercase"
                  value={newModalityCode}
                  onChange={(e) => setNewModalityCode(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Modality Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Ultrasound"
                  className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm w-full text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-synos-primary"
                  value={newModalityName}
                  onChange={(e) => setNewModalityName(e.target.value)}
                />
              </div>
              <div className="pt-2 flex justify-end gap-2.5 border-t border-zinc-100 dark:border-zinc-800">
                <button 
                  type="button"
                  onClick={() => setShowCreateModalityModal(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isCreatingModality}
                  className="px-4 py-2 bg-synos-primary hover:bg-synos-primary/90 disabled:opacity-50 text-white text-sm rounded-xl font-bold transition-all flex items-center gap-1.5"
                >
                  {isCreatingModality ? "Saving..." : "Create Modality"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-6 h-6 text-synos-primary animate-pulse" />
                <h3 className="text-lg font-bold text-zinc-950 dark:text-white">Import / Sync Test Catalog</h3>
              </div>
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedFile(null);
                  setValidationResult(null);
                  setImportSummary(null);
                }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl font-semibold p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
              
              {/* Template Section */}
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Need the catalog template?</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Download the structured catalog workbook with all required sheet layouts.</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm shrink-0"
                >
                  <Download className="w-3.5 h-3.5" /> Download Template
                </button>
              </div>

              {/* Upload Drop Zone */}
              <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3 bg-zinc-50/30 hover:bg-zinc-50/60 dark:hover:bg-zinc-950/30 transition-colors relative">
                <input 
                  type="file" 
                  accept=".xlsx" 
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <UploadCloud className="w-10 h-10 text-zinc-400" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                    {selectedFile ? selectedFile.name : "Drag & drop your .xlsx catalog here"}
                  </p>
                  <p className="text-xs text-zinc-400">Only Excel files (.xlsx) are supported</p>
                </div>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-xs font-bold text-red-500 hover:underline mt-1 z-10 relative"
                  >
                    Clear selection
                  </button>
                )}
              </div>

              {/* Validation / Action Panel */}
              {selectedFile && !importSummary && (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isValidating}
                      onClick={handleValidateCatalog}
                      className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs rounded-xl font-bold transition-all text-center flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isValidating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Validating...
                        </>
                      ) : "Validate Catalog File"}
                    </button>

                    {validationResult?.success && (
                      <button
                        type="button"
                        disabled={isImporting}
                        onClick={handleImportCatalog}
                        className="flex-1 py-2.5 bg-synos-primary hover:bg-synos-primary/95 text-white text-xs rounded-xl font-bold transition-all text-center flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-synos-primary/10"
                      >
                        {isImporting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Provisioning...
                          </>
                        ) : "Import & Provision"}
                      </button>
                    )}
                  </div>

                  {/* Validation Output */}
                  {validationResult && (
                    <div className={cn(
                      "p-4 rounded-xl border text-xs space-y-3",
                      validationResult.success 
                        ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300"
                        : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40 text-red-800 dark:text-red-300"
                    )}>
                      <div className="flex items-center gap-2 font-bold">
                        {validationResult.success ? (
                          <>
                            <CheckSquare className="w-4 h-4 text-emerald-500" />
                            <span>Catalog structure is valid! Ready for database sync.</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span>Catalog validation failed with {validationResult.rowLevelErrors?.length || 0} errors.</span>
                          </>
                        )}
                      </div>

                      {validationResult.rowLevelErrors && validationResult.rowLevelErrors.length > 0 && (
                        <div className="max-h-48 overflow-y-auto space-y-1.5 border-t border-red-200 dark:border-red-800/40 pt-3 font-mono">
                          {validationResult.rowLevelErrors.map((err, idx) => (
                            <div key={idx} className="flex gap-2">
                              <span className="text-red-500 font-bold shrink-0">[{err.sheetName || "Sheet"} Row {err.rowNumber || 0}]:</span>
                              <span>{err.errorMessage}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {validationResult.globalErrors && validationResult.globalErrors.length > 0 && (
                        <div className="space-y-1 border-t border-red-200 dark:border-red-800/40 pt-3">
                          {validationResult.globalErrors.map((err, idx) => (
                            <p key={idx} className="font-semibold text-red-500">{err}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Import Results Summary Screen */}
              {importSummary && (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 p-5 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                    <Check className="w-5 h-5 bg-emerald-500 text-white rounded-full p-0.5 animate-bounce" />
                    <span>Catalog Synchronized & Provisioned Successfully!</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 rounded-lg flex flex-col gap-1">
                      <span className="text-zinc-400 text-[10px] uppercase">Tests Affected</span>
                      <span className="text-lg font-bold">{importSummary.testsAffected}</span>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 rounded-lg flex flex-col gap-1">
                      <span className="text-zinc-400 text-[10px] uppercase">Parameters Affected</span>
                      <span className="text-lg font-bold">{importSummary.parametersAffected}</span>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 rounded-lg flex flex-col gap-1">
                      <span className="text-zinc-400 text-[10px] uppercase">Mappings Configured</span>
                      <span className="text-lg font-bold">{importSummary.mappingsAffected}</span>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 rounded-lg flex flex-col gap-1">
                      <span className="text-zinc-400 text-[10px] uppercase">Pricing Records Updated</span>
                      <span className="text-lg font-bold">{importSummary.pricingChanges}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3 shrink-0 bg-zinc-50/50 dark:bg-zinc-900/20">
              <button 
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedFile(null);
                  setValidationResult(null);
                  setImportSummary(null);
                }}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs rounded-xl font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={cn(
          "fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200 flex items-center gap-2",
          toast.type === 'success' ? "bg-emerald-500 shadow-emerald-500/20" : "bg-red-500 shadow-red-500/20"
        )}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}

export default TestMasterScreen;

function CategoryOverrideSection({
  title,
  useMale,
  setUseMale,
  maleMin,
  setMaleMin,
  maleMax,
  setMaleMax,
  maleText,
  setMaleText,
  useFemale,
  setUseFemale,
  femaleMin,
  setFemaleMin,
  femaleMax,
  setFemaleMax,
  femaleText,
  setFemaleText,
  colorClass
}) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
      <span className={cn("text-[9px] font-bold block", colorClass)}>{title}</span>
      
      {/* Male Specific */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[9.5px] font-medium text-zinc-650 dark:text-zinc-350 flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useMale}
              onChange={(e) => setUseMale(e.target.checked)}
              className="rounded border-zinc-300 text-synos-primary focus:ring-synos-primary w-3.5 h-3.5"
            />
            Male Override
          </label>
        </div>
        {useMale && (
          <div className="pl-5 space-y-2 animate-in slide-in-from-top-1 duration-100">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[8px] font-bold text-zinc-400 uppercase">Male Min</label>
                <input
                  type="number"
                  className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs w-full text-zinc-900 dark:text-zinc-100 font-mono outline-none"
                  placeholder="Low"
                  value={maleMin}
                  onChange={(e) => setMaleMin(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[8px] font-bold text-zinc-400 uppercase">Male Max</label>
                <input
                  type="number"
                  className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs w-full text-zinc-900 dark:text-zinc-100 font-mono outline-none"
                  placeholder="High"
                  value={maleMax}
                  onChange={(e) => setMaleMax(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-[8px] font-bold text-zinc-400 uppercase">Male Text Range (Fallback)</label>
              <input
                type="text"
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs w-full text-zinc-900 dark:text-zinc-100 font-mono outline-none"
                placeholder="e.g. Up to 1% or Negative"
                value={maleText}
                onChange={(e) => setMaleText(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Female Specific */}
      <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/50">
        <div className="flex items-center justify-between">
          <label className="text-[9.5px] font-medium text-zinc-650 dark:text-zinc-350 flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useFemale}
              onChange={(e) => setUseFemale(e.target.checked)}
              className="rounded border-zinc-300 text-synos-primary focus:ring-synos-primary w-3.5 h-3.5"
            />
            Female Override
          </label>
        </div>
        {useFemale && (
          <div className="pl-5 space-y-2 animate-in slide-in-from-top-1 duration-100">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[8px] font-bold text-zinc-400 uppercase">Female Min</label>
                <input
                  type="number"
                  className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs w-full text-zinc-900 dark:text-zinc-100 font-mono outline-none"
                  placeholder="Low"
                  value={femaleMin}
                  onChange={(e) => setFemaleMin(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[8px] font-bold text-zinc-400 uppercase">Female Max</label>
                <input
                  type="number"
                  className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs w-full text-zinc-900 dark:text-zinc-100 font-mono outline-none"
                  placeholder="High"
                  value={femaleMax}
                  onChange={(e) => setFemaleMax(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-[8px] font-bold text-zinc-400 uppercase">Female Text Range (Fallback)</label>
              <input
                type="text"
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs w-full text-zinc-900 dark:text-zinc-100 font-mono outline-none"
                placeholder="e.g. Up to 1% or Negative"
                value={femaleText}
                onChange={(e) => setFemaleText(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
