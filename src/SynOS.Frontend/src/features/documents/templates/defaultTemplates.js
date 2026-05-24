export const DEFAULT_TEMPLATES = [
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
    bgType: "image",
    bgColor: "#ffffff",
    bgGradientStart: "#ffffff",
    bgGradientEnd: "#f1f5f9",
    bgGradientAngle: 135,
    backgroundPath: "/assets/report-masters/hematology-master.svg",
    bgImageOpacity: 0.05,
    enableAbsolutePositioning: true,
    patientBlockY: 55,
    tableBlockY: 95,
    signatureBlockY: 25,
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
    bgType: "image",
    bgColor: "#ffffff",
    bgGradientStart: "#ffffff",
    bgGradientEnd: "#ecfdf5",
    bgGradientAngle: 135,
    backgroundPath: "/assets/report-masters/biochemistry-master.svg",
    bgImageOpacity: 0.05,
    enableAbsolutePositioning: true,
    patientBlockY: 55,
    tableBlockY: 95,
    signatureBlockY: 25,
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
    bgType: "image",
    bgColor: "#ffffff",
    bgGradientStart: "#ffffff",
    bgGradientEnd: "#fafafa",
    bgGradientAngle: 135,
    backgroundPath: "/assets/report-masters/radiology-master.svg",
    bgImageOpacity: 0.03,
    enableAbsolutePositioning: true,
    patientBlockY: 55,
    tableBlockY: 95,
    signatureBlockY: 25,
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
    bgType: "image",
    bgColor: "#ffffff",
    bgGradientStart: "#ffffff",
    bgGradientEnd: "#fffbeb",
    bgGradientAngle: 135,
    backgroundPath: "/assets/report-masters/histopathology-master.svg",
    bgImageOpacity: 0.05,
    enableAbsolutePositioning: true,
    patientBlockY: 55,
    tableBlockY: 95,
    signatureBlockY: 25,
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

export const sanitizeTemplates = (list) => {
  return list.map(t => {
    let slots = t.signatureSlots || [];
    
    // Default Pathologist (Lab Owner) must always be at slotId 0 and required
    let newSlots = [
      { slotId: 0, title: "Default Pathologist (Lab Owner)", required: true }
    ];
    
    let hasAdditional = false;
    let hasRadio = false;
    
    slots.forEach(slot => {
      const titleLower = (slot.title || "").toLowerCase();
      if (titleLower.includes("additional pathologist")) {
        hasAdditional = true;
      } else if (titleLower.includes("radiologist")) {
        hasRadio = true;
      }
    });
    
    let currentId = 1;
    if (hasAdditional) {
      newSlots.push({ slotId: currentId++, title: "Additional Pathologist", required: false });
    }
    if (hasRadio) {
      const existingRadio = slots.find(s => (s.title || "").toLowerCase().includes("radiologist"));
      newSlots.push({ 
        slotId: currentId++, 
        title: "Radiologist", 
        required: existingRadio ? existingRadio.required : false 
      });
    }
    
    return {
      ...t,
      enableAbsolutePositioning: t.enableAbsolutePositioning !== undefined ? t.enableAbsolutePositioning : true,
      patientBlockY: t.patientBlockY !== undefined ? t.patientBlockY : 55,
      tableBlockY: t.tableBlockY !== undefined ? t.tableBlockY : 95,
      signatureBlockY: t.signatureBlockY !== undefined ? t.signatureBlockY : 25,
      includeLogo: t.includeLogo !== undefined ? t.includeLogo : true,
      includeHeaderName: t.includeHeaderName !== undefined ? t.includeHeaderName : true,
      includeHeaderSubtitle: t.includeHeaderSubtitle !== undefined ? t.includeHeaderSubtitle : true,
      includeWatermark: t.includeWatermark !== undefined ? t.includeWatermark : true,
      includeFooter: t.includeFooter !== undefined ? t.includeFooter : true,
      includeSignatures: t.includeSignatures !== undefined ? t.includeSignatures : true,
      backgroundPath: t.backgroundPath || (
        t.modality === "Hematology" ? "/assets/report-masters/hematology-master.svg" :
        t.modality === "Biochemistry" ? "/assets/report-masters/biochemistry-master.svg" :
        t.modality === "Radiology" ? "/assets/report-masters/radiology-master.svg" :
        t.modality === "Histopathology" ? "/assets/report-masters/histopathology-master.svg" :
        "/assets/report-masters/default-master.svg"
      ),
      signatureSlots: newSlots
    };
  });
};
