import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
    Search, 
    Filter, 
    Download, 
    MoreHorizontal, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    User,
    UserCheck,
    ArrowRight,
    LayoutDashboard,
    IndianRupee,
    History,
    TrendingUp,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Building2,
    Beaker,
    Activity,
    FileSpreadsheet,
    Receipt,
    FileText,
    Share2,
    Printer,
    ShieldCheck,
    Ban,
    RotateCcw,
    RefreshCw,
    Check,
    Sparkles,
    Coins,
    Banknote,
    QrCode,
    CreditCard,
    X,
    Scan,
    Waves,
    Microscope,
    BarChart3,
    Layers,
    SlidersHorizontal,
    ArrowUpDown,
    ChevronDown
} from 'lucide-react';
import { RecordCollectionModal } from './components/RecordCollectionModal';
import { BulkSettleModal } from './components/BulkSettleModal';
import { DepartmentOverview } from './components/FinanceShared';
import { FinanceApi } from '@/api/finance';
import { FinanceUtils, isWithinTimeRange, formatCanonicalBillNo, isDraftEntity, getReceivableStatus, isReceivableSettled, getEffectiveBalanceDue } from './components/FinanceUtils';
import { SignalRService } from '@/lib/signalr';
import { useAuth } from '@/context/AuthContext';
import { AdminApi } from '@/api/admin';
import { CommercialDocumentViewer } from './components/documents/CommercialDocumentViewer';
import { DynamicDocumentRenderer } from './components/documents/DynamicDocumentRenderer';
import { FinancePrintableSummaryModal } from './components/FinancePrintableSummaryModal';
import { FinanceFilterBar } from './components/FinanceFilterBar';
import { useGlobalFilter } from '@/context/GlobalFilterContext';
import { StandardFilterBar } from '@/components/layout/StandardFilterBar';

import { cn, formatDateCompact } from '@/lib/utils';

const classifyInvestigation = (testName) => {
    if (!testName || typeof testName !== 'string') return { department: 'Pathology', modality: 'General' };
    const lower = testName.toLowerCase().trim();

    // 1. Radiology Modalities
    if (lower.includes('mri') || 
        lower.includes('magnetic') || 
        lower.includes('mrcp') || 
        lower.includes('mrv') || 
        lower.includes('mra') || 
        lower.includes('mr ') || 
        lower.includes('mr-') || 
        lower.includes('mr_') ||
        lower.includes('brain plain') || 
        lower.includes('cervical spine') || 
        lower.includes('lumbar spine') || 
        lower.includes('dorsal spine') || 
        lower.includes('whole spine') || 
        lower.includes('spine screening') ||
        lower.includes('brain stroke') ||
        lower.includes('mr angiogram') || 
        lower.includes('mr neurography') || 
        lower.includes('mr venogram') ||
        lower.includes('defecography') ||
        lower.includes('dementia') ||
        lower.includes('cp angle') ||
        lower.includes('cpangle') ||
        lower.includes('cv junction') ||
        lower.includes('cvjunction') ||
        lower.includes('dwi') ||
        lower.includes('swi') ||
        lower.includes('dti')) {
        if ((lower.includes('ct ') || lower.includes('ct_') || lower.includes('ct-') || lower.includes('ct scan')) &&
            !lower.includes('mri') && !lower.includes('mr ') && !lower.includes('mra') && !lower.includes('mrv') && !lower.includes('magnetic')) {
            return { department: 'Radiology', modality: 'CT Scan' };
        }
        return { department: 'Radiology', modality: 'MRI' };
    }
    if (lower.includes('ct scan') || 
        lower.includes('computed') || 
        lower.includes('hrct') || 
        lower.includes('cect') || 
        lower.includes('ncct') || 
        lower.includes(' ct ') || 
        lower.startsWith('ct ') || 
        lower.includes('ct-') || 
        lower.includes('ct_') ||
        lower.includes('ct contrast') || 
        lower.includes('ct brain') || 
        lower.includes('ct facial') || 
        lower.includes('ct abdomen') || 
        lower.includes('ct chest') || 
        lower.includes('ct angio')) {
        return { department: 'Radiology', modality: 'CT Scan' };
    }
    if (lower.includes('ultrasound') || 
        lower.includes('usg') || 
        lower.includes('u/s') || 
        lower.includes('echo') || 
        lower.includes('sonography') || 
        lower.includes('doppler') || 
        lower.includes('fibroscan') ||
        lower.includes('anomaly scan') ||
        lower.includes('nt scan')) {
        return { department: 'Radiology', modality: 'Ultrasound' };
    }
    if (lower.includes('x-ray') || 
        lower.includes('xray') || 
        lower.includes('radiograph') || 
        lower.includes('chest pa') || 
        lower.includes('c.spine') || 
        lower.includes('foot ap') || 
        lower.includes('views') || 
        lower.includes('routine xray') ||
        lower.includes('kub') ||
        lower.includes('barium')) {
        return { department: 'Radiology', modality: 'X-Ray' };
    }

    // 2. Pathology - Hematology
    if (lower.includes('cbp') || lower.includes('cbc') || lower.includes('blood count') || lower.includes('hemogram') ||
        lower.includes('haemogram') || lower.includes('haemoglobin') || lower.includes('hemoglobin') || lower.includes('platelet') ||
        lower.includes('esr') || lower.includes('aec') || lower.includes('blood group') || lower.includes('rh typing') ||
        lower.includes('wbc') || lower.includes('rbc') || lower.includes('peripheral smear') || lower.includes('reticulocyte') ||
        lower.includes('pt/inr') || lower.includes('prothrombin') || lower.includes('tc,dc') || lower.includes('tc dc')) {
        return { department: 'Pathology', modality: 'Hematology' };
    }

    // 3. Pathology - Microbiology
    if (lower.includes('culture') || lower.includes('sensitivity') || lower.includes('c/s') || lower.includes('fungal') ||
        lower.includes('afb') || lower.includes('sputum') || lower.includes('gram stain') || lower.includes('mantoux') ||
        lower.includes('pyogenic')) {
        return { department: 'Pathology', modality: 'Microbiology' };
    }

    // 4. Pathology - Histopathology / Cytology
    if (lower.includes('biopsy') || lower.includes('fnac') || lower.includes('pap smear') || lower.includes('histopath') || lower.includes('cytology')) {
        return { department: 'Pathology', modality: 'Histopathology' };
    }

    // 5. Pathology - Clinical Pathology & Serology
    if (lower.includes('stool') || lower.includes('urine routine') || lower.includes('r.u.a') || lower.includes('occult') ||
        lower.includes('widal') || lower.includes('typhoid') || lower.includes('dengue') || lower.includes('malaria') ||
        lower.includes('hiv') || lower.includes('hbsag') || lower.includes('hcv') || lower.includes('vdrl') ||
        lower.includes('crp') || lower.includes('aso') || lower.includes('streptolysin') || lower.includes('ra factor') || lower.includes('rafactor')) {
        return { department: 'Pathology', modality: 'Clinical Pathology' };
    }

    // 6. Pathology - Biochemistry
    if (lower.includes('lft') || lower.includes('liver') || lower.includes('bilirubin') || lower.includes('sgot') ||
        lower.includes('sgpt') || lower.includes('kft') || lower.includes('rft') || lower.includes('renal') ||
        lower.includes('urea') || lower.includes('creatinine') || lower.includes('uric acid') || lower.includes('lipid') ||
        lower.includes('cholesterol') || lower.includes('triglyceride') || lower.includes('glucose') || lower.includes('fbs') ||
        lower.includes('ppbs') || lower.includes('rbs') || lower.includes('hba1c') || lower.includes('thyroid') ||
        lower.includes('t3') || lower.includes('t4') || lower.includes('tsh') || lower.includes('calcium') ||
        lower.includes('electrolytes') || lower.includes('sodium') || lower.includes('potassium') || lower.includes('amylase') ||
        lower.includes('lipase') || lower.includes('vitamin') || lower.includes('b12') || lower.includes('d3') ||
        lower.includes('ferritin') || lower.includes('iron') || lower.includes('bun') || lower.includes('biochem')) {
        return { department: 'Pathology', modality: 'Biochemistry' };
    }

    // Cardiology / General Diagnostics
    if (lower.includes('ecg') || lower.includes('tmt') || lower.includes('echo')) {
        return { department: 'Diagnostics', modality: 'Cardiology' };
    }

    return { department: 'Pathology', modality: 'General' };
};

/**
 * Robust Canonical Payer Mode Resolver
 * Accurately classifies a bill into: 'Standard / Direct', 'Corporate B2B', or 'Insurance'
 * Handles both canonical modern DTOs and legacy partner payloads.
 */
export const getPayerModeInfo = (bill) => {
    if (!bill) return { mode: 'Standard / Direct', isCorporate: false, isInsurance: false, isStandard: true };

    const pCat = (bill.partnerCategory || '').toLowerCase();
    const pMode = (bill.payerMode || '').toLowerCase();
    const bType = (bill.billingType || '').toLowerCase();
    const pcm = (bill.paymentCollectionModel || '').toLowerCase();
    const pName = (bill.partnerName || '').toLowerCase();
    const collected = Number(bill.collectedAmount || (Number(bill.cashAmount || 0) + Number(bill.onlineAmount || 0)));
    const pending = Number(bill.pendingAmount || 0);
    const prepaid = Number(bill.prepaidAmount || 0);

    // 1. Insurance Check
    const isInsurance = pCat === 'insurance' || pMode === 'insurance' || bType.includes('insurance') || pName.includes('insurance');
    if (isInsurance) {
        return { mode: 'Insurance', isCorporate: false, isInsurance: true, isStandard: false };
    }

    // 2. Corporate B2B Check
    // A bill is Corporate B2B if explicitly tagged as Corporate/PrepaidPartner,
    // OR if associated with an institutional/referral partner where patient paid ₹0 at counter desk
    const isInstitutionalName = pName.includes('hospital') || pName.includes('clinic') || pName.includes('corporate') || pName.includes('center') || pName.includes('centre');
    const isCorporate = (
        pCat === 'corporate' ||
        pMode.includes('corporate') ||
        bType.includes('corporate') ||
        bType.includes('prepaidpartner') ||
        pcm.includes('partnercollects') ||
        pcm.includes('corporateb2b') ||
        pcm.includes('partnermonthlybilling') ||
        (pCat === 'partner' && (isInstitutionalName || (collected === 0 && (pending > 0 || prepaid > 0))) && pName !== 'direct patient')
    );

    if (isCorporate) {
        return { mode: 'Corporate B2B', isCorporate: true, isInsurance: false, isStandard: false };
    }

    // 3. Otherwise Standard / Direct (Desk collections, doctor referrals with counter cash/UPI payment or counter dues)
    return { mode: 'Standard / Direct', isCorporate: false, isInsurance: false, isStandard: true };
};

// --- SCREENS ---

export const RevenueOverviewTab = ({ stats, onRefresh }) => {
  const navigate = useNavigate();
  const { 
    presetRange, 
    customDates, 
    isConsolidated, 
    effectiveBranchId, 
    isAdmin 
  } = useGlobalFilter();

  const [volumeData, setVolumeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModality, setSelectedModality] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [sortBy, setSortBy] = useState('count'); // 'count' | 'name' | 'share'
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchVolumeData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const bId = isConsolidated && isAdmin ? null : effectiveBranchId;
      
      const params = {
        branchId: bId,
        preset: presetRange || 'today'
      };

      if (presetRange === 'custom') {
        params.startDate = customDates?.start;
        params.endDate = customDates?.end;
      } else if (presetRange === 'singleDate') {
        params.startDate = customDates?.start || customDates?.single;
        params.endDate = customDates?.end || customDates?.start || customDates?.single;
      }

      const res = await FinanceApi.getTestVolumeAnalytics(params);
      setVolumeData(res);
    } catch (err) {
      console.error('Failed to load test volume analytics:', err);
      setError(err?.message || 'Failed to load test volume analytics');
    } finally {
      setLoading(false);
    }
  }, [presetRange, customDates?.start, customDates?.end, customDates?.single, isConsolidated, effectiveBranchId, isAdmin]);

  useEffect(() => {
    fetchVolumeData();
  }, [fetchVolumeData]);

  // Derived metrics
  const totalTests = volumeData?.totalTests || 0;
  const totalVisits = volumeData?.totalVisits || 0;
  const totalPatients = volumeData?.totalPatients || 0;
  const mriCount = volumeData?.modalityCounts?.mri || 0;
  const ctCount = volumeData?.modalityCounts?.ct || 0;
  const xrayCount = volumeData?.modalityCounts?.xray || 0;
  const usgCount = volumeData?.modalityCounts?.usg || 0;
  const pathologyCount = volumeData?.modalityCounts?.pathology || 0;

  const departments = volumeData?.departments || [];
  const rawTests = volumeData?.tests || [];

  // Radiology group
  const radiologyDept = departments.find(d => (d.department || '').toLowerCase() === 'radiology');
  const radiologyTotal = mriCount + ctCount + xrayCount + usgCount;
  const radiologyShare = totalTests > 0 ? ((radiologyTotal / totalTests) * 100).toFixed(1) : '0';

  // Pathology group
  const pathologyDept = departments.find(d => (d.department || '').toLowerCase() === 'pathology');
  const pathologyTotal = pathologyCount;
  const pathologyShare = totalTests > 0 ? ((pathologyTotal / totalTests) * 100).toFixed(1) : '0';

  // Filtered & sorted tests
  const filteredTests = useMemo(() => {
    let list = [...rawTests];

    // Search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(t => 
        (t.testName || '').toLowerCase().includes(q) ||
        (t.testCode || '').toLowerCase().includes(q)
      );
    }

    // Modality filter
    if (selectedModality !== 'All') {
      const targetMod = selectedModality.toLowerCase();
      list = list.filter(t => {
        const m = (t.modality || '').toLowerCase();
        if (targetMod === 'mri') return m.includes('mri');
        if (targetMod === 'ct scan' || targetMod === 'ct') return m.includes('ct');
        if (targetMod === 'x-ray') return m.includes('x-ray') || m.includes('xray');
        if (targetMod === 'ultrasound' || targetMod === 'usg') return m.includes('ultra') || m.includes('us');
        if (targetMod === 'pathology') return (t.department || '').toLowerCase() === 'pathology';
        return m === targetMod;
      });
    }

    // Department filter
    if (selectedDepartment !== 'All') {
      const targetDept = selectedDepartment.toLowerCase();
      list = list.filter(t => (t.department || '').toLowerCase() === targetDept);
    }

    // Sorting
    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'count') {
        comparison = (b.count || 0) - (a.count || 0);
      } else if (sortBy === 'name') {
        comparison = (a.testName || '').localeCompare(b.testName || '');
      } else if (sortBy === 'share') {
        comparison = (b.overallShare || 0) - (a.overallShare || 0);
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });

    return list;
  }, [rawTests, searchTerm, selectedModality, selectedDepartment, sortBy, sortOrder]);

  // Export CSV handler
  const handleExportCsv = () => {
    if (!filteredTests.length) return;
    const headers = ['Test Name', 'Test Code', 'Department', 'Modality', 'Volume (Count)', 'Unique Patients', 'Dept Share %', 'Overall Workload %'];
    const rows = filteredTests.map(t => [
      `"${(t.testName || '').replace(/"/g, '""')}"`,
      `"${(t.testCode || '').replace(/"/g, '""')}"`,
      `"${(t.department || '').replace(/"/g, '""')}"`,
      `"${(t.modality || '').replace(/"/g, '""')}"`,
      t.count || 0,
      t.uniquePatients || 0,
      `${t.departmentShare || 0}%`,
      `${t.overallShare || 0}%`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(',')).join('\n')];
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SynOS_Test_Volume_${presetRange || 'period'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const getModalityBadgeStyle = (mod) => {
    const m = (mod || '').toLowerCase();
    if (m.includes('mri')) return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20';
    if (m.includes('ct')) return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
    if (m.includes('x-ray') || m.includes('xray')) return 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20';
    if (m.includes('ultra') || m.includes('us')) return 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20';
    if (m.includes('hem') || m.includes('cbc') || m.includes('blood')) return 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20';
    if (m.includes('bio') || m.includes('lipid') || m.includes('lft')) return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
    return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';
  };

  const modalityKpiCards = [
    {
      id: 'All',
      label: 'TOTAL TESTS',
      count: totalTests,
      unit: 'Tests',
      subtitle: `${totalVisits} visits • ${totalPatients} patients`,
      icon: Layers,
      color: 'indigo'
    },
    {
      id: 'MRI',
      label: 'MRI SCANS',
      count: mriCount,
      unit: 'Scans',
      subtitle: totalTests > 0 ? `${((mriCount / totalTests) * 100).toFixed(1)}% of total workload` : 'Magnetic Resonance',
      icon: Scan,
      color: 'cyan'
    },
    {
      id: 'CT Scan',
      label: 'CT SCANS',
      count: ctCount,
      unit: 'Scans',
      subtitle: totalTests > 0 ? `${((ctCount / totalTests) * 100).toFixed(1)}% of total workload` : 'Computed Tomography',
      icon: Scan,
      color: 'amber'
    },
    {
      id: 'X-Ray',
      label: 'X-RAYS',
      count: xrayCount,
      unit: 'Scans',
      subtitle: totalTests > 0 ? `${((xrayCount / totalTests) * 100).toFixed(1)}% of total workload` : 'Digital Radiography',
      icon: Activity,
      color: 'violet'
    },
    {
      id: 'Ultrasound',
      label: 'ULTRASOUND',
      count: usgCount,
      unit: 'Scans',
      subtitle: totalTests > 0 ? `${((usgCount / totalTests) * 100).toFixed(1)}% of total workload` : 'Sonography / USG',
      icon: Waves,
      color: 'teal'
    },
    {
      id: 'Pathology',
      label: 'PATHOLOGY & LAB',
      count: pathologyCount,
      unit: 'Tests',
      subtitle: totalTests > 0 ? `${((pathologyCount / totalTests) * 100).toFixed(1)}% of total workload` : 'Clinical Laboratory',
      icon: Beaker,
      color: 'emerald'
    }
  ];

  return (
    <div className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* TIER 1: HIGH-IMPACT MODALITY WORKLOAD CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {modalityKpiCards.map((card) => {
          const isSelected = selectedModality === card.id || (card.id === 'All' && selectedModality === 'All');
          return (
            <button
              key={card.id}
              onClick={() => setSelectedModality(card.id === selectedModality && card.id !== 'All' ? 'All' : card.id)}
              className={cn(
                "p-5 synos-kpi-card rounded-2xl flex flex-col justify-between text-left transition-all cursor-pointer relative overflow-hidden group",
                isSelected
                  ? "ring-2 ring-synos-primary shadow-md bg-synos-primary/5 dark:bg-synos-primary/10"
                  : "hover:border-zinc-300 dark:hover:border-zinc-700"
              )}
            >
              <div className="flex items-center justify-between w-full mb-3">
                <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest truncate">
                  {card.label}
                </span>
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                  card.color === 'cyan' ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" :
                  card.color === 'amber' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                  card.color === 'violet' ? "bg-violet-500/10 text-violet-600 dark:text-violet-400" :
                  card.color === 'teal' ? "bg-teal-500/10 text-teal-600 dark:text-teal-400" :
                  card.color === 'emerald' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                  "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                )}>
                  <card.icon size={16} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                    {loading ? '...' : card.count.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 lowercase">
                    {card.unit}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
                  {card.subtitle}
                </p>
              </div>

              {isSelected && card.id !== 'All' && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-synos-primary animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* TIER 2: DEPARTMENT WORKLOAD & MODALITY DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* RADIOLOGY DEPARTMENT PANEL */}
        <div className="synos-dept-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
                <Scan size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                  Radiology & Diagnostic Imaging
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    {radiologyShare}% of lab workload
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-500">MRI, CT Scan, X-Ray, and Ultrasonography throughput</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                {radiologyTotal}
              </span>
              <span className="text-xs text-zinc-400 font-bold ml-1">Scans</span>
            </div>
          </div>

          {/* Modality throughput bars */}
          <div className="space-y-3.5">
            {[
              { name: 'MRI', label: 'MRI (Magnetic Resonance)', count: mriCount, color: 'bg-cyan-500', barColor: 'bg-cyan-500' },
              { name: 'CT Scan', label: 'CT Scan (Computed Tomography)', count: ctCount, color: 'bg-amber-500', barColor: 'bg-amber-500' },
              { name: 'X-Ray', label: 'X-Ray (Digital Radiography)', count: xrayCount, color: 'bg-violet-500', barColor: 'bg-violet-500' },
              { name: 'Ultrasound', label: 'Ultrasound & Sonography (USG)', count: usgCount, color: 'bg-teal-500', barColor: 'bg-teal-500' }
            ].map(item => {
              const shareOfRadiology = radiologyTotal > 0 ? Math.round((item.count / radiologyTotal) * 100) : 0;
              return (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", item.color)} />
                      {item.label}
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-extrabold text-zinc-900 dark:text-white">{item.count}</span>
                      <span className="text-[10px] text-zinc-400">({shareOfRadiology}%)</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800/80 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-700", item.barColor)} 
                      style={{ width: `${shareOfRadiology}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PATHOLOGY DEPARTMENT PANEL */}
        <div className="synos-dept-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Beaker size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                  Pathology & Clinical Laboratory
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {pathologyShare}% of lab workload
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-500">Biochemistry, Hematology, Serology, and Clinical Pathology</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                {pathologyTotal}
              </span>
              <span className="text-xs text-zinc-400 font-bold ml-1">Tests</span>
            </div>
          </div>

          {/* Sub-discipline throughput bars */}
          <div className="space-y-3.5">
            {(pathologyDept?.disciplines?.length ? pathologyDept.disciplines : [
              { modality: 'Biochemistry', count: Math.round(pathologyTotal * 0.45) },
              { modality: 'Hematology', count: Math.round(pathologyTotal * 0.35) },
              { modality: 'Clinical Pathology', count: Math.max(0, pathologyTotal - Math.round(pathologyTotal * 0.45) - Math.round(pathologyTotal * 0.35)) }
            ]).map(item => {
              const shareOfPathology = pathologyTotal > 0 ? Math.round((item.count / pathologyTotal) * 100) : 0;
              return (
                <div key={item.modality} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {item.modality}
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-extrabold text-zinc-900 dark:text-white">{item.count}</span>
                      <span className="text-[10px] text-zinc-400">({shareOfPathology}%)</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800/80 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-emerald-500 transition-all duration-700" 
                      style={{ width: `${shareOfPathology}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* TIER 3: GRANULAR TEST WORKLOAD LEDGER TABLE */}
      <div className="synos-dept-card rounded-2xl overflow-hidden border border-slate-200/80 dark:border-zinc-800 shadow-sm space-y-4 p-6">
        
        {/* Table Controls Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
          <div>
            <h2 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <BarChart3 size={16} className="text-synos-primary" />
              Granular Test Workload Ledger
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                {filteredTests.length} Tests
              </span>
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Ranked test utilization and modality distribution for the selected time horizon.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              <input 
                type="text"
                placeholder="Search test name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-synos-primary transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Department Filter Dropdown */}
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold focus:outline-none focus:ring-2 focus:ring-synos-primary transition-all cursor-pointer"
            >
              <option value="All">All Departments</option>
              <option value="Radiology">Radiology</option>
              <option value="Pathology">Pathology</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('_');
                setSortBy(sb);
                setSortOrder(so);
              }}
              className="px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold focus:outline-none focus:ring-2 focus:ring-synos-primary transition-all cursor-pointer"
            >
              <option value="count_desc">Sort: Highest Volume</option>
              <option value="count_asc">Sort: Lowest Volume</option>
              <option value="share_desc">Sort: Highest % Share</option>
              <option value="name_asc">Sort: Name (A-Z)</option>
            </select>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCsv}
              disabled={!filteredTests.length}
              className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download size={13} /> Export CSV
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => fetchVolumeData()}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all cursor-pointer"
              title="Refresh Test Volume Data"
            >
              <RefreshCw size={14} className={cn(loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Quick Modality Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mr-1">
            Modality Filter:
          </span>
          {[
            { id: 'All', label: 'All Tests', count: totalTests },
            { id: 'MRI', label: 'MRI', count: mriCount },
            { id: 'CT Scan', label: 'CT Scan', count: ctCount },
            { id: 'X-Ray', label: 'X-Ray', count: xrayCount },
            { id: 'Ultrasound', label: 'Ultrasound', count: usgCount },
            { id: 'Pathology', label: 'Pathology / Lab', count: pathologyCount }
          ].map(chip => (
            <button
              key={chip.id}
              onClick={() => setSelectedModality(chip.id)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5",
                selectedModality === chip.id
                  ? "bg-synos-primary text-white shadow-sm"
                  : "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700/60"
              )}
            >
              <span>{chip.label}</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px]",
                selectedModality === chip.id
                  ? "bg-white/20 text-white"
                  : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
              )}>
                {chip.count}
              </span>
            </button>
          ))}
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw size={24} className="animate-spin text-synos-primary mx-auto" />
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Aggregating test throughput from SSOT orders...</p>
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-2">
            <Activity size={28} className="text-zinc-300 dark:text-zinc-600 mx-auto" />
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No matching test volume found</p>
            <p className="text-xs text-zinc-400">
              Try clearing filters or switching the date horizon.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50/70 dark:bg-zinc-900/60 border-b border-zinc-200/80 dark:border-zinc-800 text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                  <th className="py-3 px-4 font-extrabold">Test Item & Identification</th>
                  <th className="py-3 px-3 font-extrabold">Department</th>
                  <th className="py-3 px-3 font-extrabold">Modality / Discipline</th>
                  <th className="py-3 px-4 text-center font-extrabold">
                    <button 
                      onClick={() => {
                        if (sortBy === 'count') setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                        else { setSortBy('count'); setSortOrder('desc'); }
                      }}
                      className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                    >
                      Volume (Count)
                      <ArrowUpDown size={11} />
                    </button>
                  </th>
                  <th className="py-3 px-3 text-center font-extrabold">Unique Patients</th>
                  <th className="py-3 px-4 text-left font-extrabold">Dept Share</th>
                  <th className="py-3 px-4 text-left font-extrabold">Overall Workload Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80 font-medium">
                {filteredTests.map((test, idx) => (
                  <tr 
                    key={`${test.testCode}_${idx}`} 
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    {/* Test Name & Code */}
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-zinc-900 dark:text-white text-xs">
                        {test.testName}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        {test.testCode || 'STD-TEST'}
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                        {test.department}
                      </span>
                    </td>

                    {/* Modality */}
                    <td className="py-3.5 px-3">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                        getModalityBadgeStyle(test.modality)
                      )}>
                        {test.modality}
                      </span>
                    </td>

                    {/* Volume (Count) - Primary Focus */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[56px] px-3 py-1 rounded-xl text-sm font-black bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm">
                        {test.count}
                      </span>
                    </td>

                    {/* Unique Patients */}
                    <td className="py-3.5 px-3 text-center font-bold text-zinc-600 dark:text-zinc-400 font-mono">
                      {test.uniquePatients}
                    </td>

                    {/* Department Share % */}
                    <td className="py-3.5 px-4">
                      <div className="w-28 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                          <span>{test.departmentShare}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full" 
                            style={{ width: `${Math.min(100, test.departmentShare)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Overall Workload Share % */}
                    <td className="py-3.5 px-4">
                      <div className="w-32 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                          <span>{test.overallShare}% of total</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-synos-primary rounded-full" 
                            style={{ width: `${Math.min(100, test.overallShare)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};

export const RevenueTerminal = () => {
  const { tab = 'overview' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isReceptionView = user?.role === 'Receptionist' || 
                          (typeof window !== 'undefined' && window.location.search.includes('source=reception'));

  useEffect(() => {
    if (isReceptionView && tab === 'overview') {
      navigate('/finance/revenue/bills', { replace: true });
    }
  }, [isReceptionView, tab]);

  const { presetRange, customDates, isConsolidated, effectiveBranchId, isAdmin } = useGlobalFilter();
  const [stats, setStats] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const dynamicCacheRef = React.useRef({});
  const tabsRef = React.useRef(null);

  const loadStats = React.useCallback(async () => {
    const bId = isConsolidated && isAdmin ? null : effectiveBranchId;
    const isCons = isConsolidated && isAdmin;
    const start = presetRange === 'custom' ? customDates?.start : null;
    const end = presetRange === 'custom' ? customDates?.end : null;
    const cacheKey = `${bId || 'consolidated'}_${presetRange}_${start || ''}_${end || ''}`;

    if (dynamicCacheRef.current[cacheKey]) {
      setStats(dynamicCacheRef.current[cacheKey]);
      return;
    }

    if (!isInitialLoading) {
      setIsUpdating(true);
    }

    try {
      const data = await FinanceApi.getProfitabilitySummary(start, end, bId, isCons, presetRange);
      dynamicCacheRef.current[cacheKey] = data;
      setStats(data);
    } catch (err) {
      console.error("Failed to load revenue overview:", err);
    } finally {
      setIsInitialLoading(false);
      setIsUpdating(false);
    }
  }, [isConsolidated, effectiveBranchId, presetRange, customDates, isAdmin, isInitialLoading]);

  useEffect(() => {
    loadStats();
  }, [presetRange, customDates?.start, customDates?.end, isConsolidated, effectiveBranchId, isAdmin]);

  useEffect(() => {
    if (tabsRef.current) {
      const activeTabEl = tabsRef.current.querySelector('[data-active-tab="true"]');
      if (activeTabEl) {
        activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [tab]);

  const rawTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'bills', label: 'Bills & Collections', icon: IndianRupee },
    { id: 'dues', label: 'Due Bills', icon: AlertCircle },
    { id: 'receivables', label: 'Pending Receivables', icon: Clock },
    { id: 'corrections', label: 'Visit Corrections', icon: ShieldCheck },
    { id: 'cancellations', label: 'Cancellations & Refunds', icon: Ban },
    { id: 'refunds', label: 'Change Due & Patient Refunds', icon: RotateCcw },
    { id: 'history', label: 'Collection History', icon: History },
    { id: 'drawers', label: 'Cash Drawer Ledgers', icon: Wallet }
  ];

  const tabs = isReceptionView ? rawTabs.filter(t => t.id !== 'overview') : rawTabs;

  const tabTitles = {
    overview: {
      title: "Revenue Overview",
      subtitle: "Clinical test volume, modality throughput, and department workload breakdown."
    },
    bills: {
      title: "Bills & Collections",
      subtitle: "Real-time operational ledger with branch, department, and modality transaction breakdowns."
    },
    dues: {
      title: "Due Bills & Counter Balances",
      subtitle: "Track outstanding patient dues from walk-in and standard billing. Record desk collections and download due reports."
    },
    receivables: {
      title: "Pending Receivables & Aging Ledger",
      subtitle: "Institutional A/R aging profiles, credit recovery liabilities, and debtor bulk settlements."
    },
    corrections: {
      title: "Visit Corrections Audit",
      subtitle: "Immutable audit log of historical invoice adjustments and rate changes."
    },
    cancellations: {
      title: "Cancellations & Refunds",
      subtitle: "Track voided investigations, refunded receipts, and cancelled invoices."
    },
    refunds: {
      title: "Change Due & Patient Refunds Terminal",
      subtitle: "Track, disburse, and settle counter change due & outstanding patient refund claims with audit slip printing."
    },
    history: {
      title: "Collection History",
      subtitle: "Chronological ledger of counter drawer receipts and digital settlements."
    },
    drawers: {
      title: "Cash Drawer Shift Ledgers",
      subtitle: "Comprehensive shift cash reconciliation, cashier drawer journals, and handover verification."
    }
  };

  const currentTabMeta = tabTitles[tab] || tabTitles.bills;

  if (isInitialLoading && !stats) return (
    <div className="p-20 text-center animate-pulse text-zinc-500 font-bold uppercase tracking-widest text-xs flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-synos-primary border-t-transparent rounded-full animate-spin" />
      <span>Synchronizing revenue intelligence...</span>
    </div>
  );
  
  if (!stats) return (
    <div className="p-20 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="text-rose-500 w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-rose-500 uppercase tracking-widest">Economic Position Unavailable</p>
        <p className="text-xs text-zinc-500 max-w-xs mx-auto">The system could not retrieve the revenue summary. Please try reconnecting.</p>
        <button onClick={() => loadStats()} className="text-[10px] font-bold text-synos-primary hover:underline uppercase tracking-widest cursor-pointer">Retry Synchronization</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden animate-in fade-in duration-500">
      {/* UNIFIED ACTIVE HEADER (REPLACES REDUNDANT COMMAND CENTER BANNER) */}
      <div className="px-8 pt-6 pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-black dark:text-white text-zinc-900 tracking-tight">{currentTabMeta.title}</h1>
            <p className="text-xs text-zinc-500 font-medium">{currentTabMeta.subtitle}</p>
          </div>

          {/* Minimal Pulsing Radar Loading Badge */}
          {isUpdating && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-synos-primary/10 border border-synos-primary/25 text-synos-primary shadow-xs animate-in fade-in duration-150">
              <div className="relative flex items-center justify-center w-3 h-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-synos-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-synos-primary"></span>
              </div>
              <span className="text-xs font-bold tracking-wide uppercase">Updating...</span>
            </div>
          )}
        </div>

        {/* Unified Standard Filter Bar (Today, Month, Quarter, Year, Custom Range & Branch Selectors) */}
        <StandardFilterBar />
      </div>

      {/* TAB NAVIGATION (SEGMENTED PILL ON NATIVE CANVAS) */}
      <div ref={tabsRef} className="px-8 pb-3 flex items-center gap-1 overflow-x-auto scrollbar-thin shrink-0">
        <div className="flex items-center bg-slate-200/60 dark:bg-zinc-800/80 p-1 rounded-xl">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate(`/finance/revenue/${t.id}`)}
              data-active-tab={tab === t.id ? "true" : "false"}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                tab === t.id
                  ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ACTIVE TAB CONTENT */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'overview' && (
          <RevenueOverviewTab 
            stats={stats} 
            presetRange={presetRange}
            onRefresh={() => loadStats()} 
          />
        )}
        {tab === 'bills' && <BillsCollectionsScreen />}
        {tab === 'dues' && <DueBillsScreen />}
        {tab === 'receivables' && <PendingReceivablesScreen />}
        {tab === 'corrections' && <VisitCorrectionsScreen />}
        {tab === 'cancellations' && <CancellationsRefundsScreen />}
        {tab === 'refunds' && <RefundClaimsTerminalScreen />}
        {tab === 'history' && <CollectionHistoryScreen />}
        {tab === 'drawers' && <CashDrawerLedgersScreen />}
      </div>
    </div>
  );
};


// --- SHARED COMPONENTS ---

const StatusBadge = ({ status }) => {
    const styles = {
        Settled: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        Partial: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        Pending: "bg-rose-500/10 text-rose-500 border-rose-500/20",
        Overdue: "bg-rose-600/10 text-rose-600 border-rose-600/20 font-bold",
        Cancelled: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20 line-through font-medium"
    };

    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${styles[status] || "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"}`}>
            {status}
        </span>
    );
};

const FilterTab = ({ label, count, isActive, onClick, className = '' }) => (
    <button 
        onClick={onClick}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${isActive ? 'bg-white dark:bg-zinc-900 shadow-sm text-synos-primary' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'} ${className}`}
    >
        {label} {count !== undefined && <span className="ml-1.5 opacity-50">({count})</span>}
    </button>
);

// --- CANONICAL IDENTIFIER & INVESTIGATION SANITIZERS ---

export const isDraftBill = (b) => {
    if (!b) return false;
    return isDraftEntity(b);
};

const PANEL_CHILDREN_MAP = {
    // Liver Function Test
    'lft': ['albumin', 'globulin', 'a:g ratio', 'albumin : globulin', 'albumin:globulin', 'bilirubin', 'serum bilirubin', 'sgot', 'sgpt', 'alkaline phosphatase', 'ast', 'alt', 'total protein', 'ggtp', 'gamma gt', 'aspartate aminotransferase', 'alanine aminotransferase'],
    'liver': ['albumin', 'globulin', 'a:g ratio', 'albumin : globulin', 'albumin:globulin', 'bilirubin', 'serum bilirubin', 'sgot', 'sgpt', 'alkaline phosphatase', 'ast', 'alt', 'total protein', 'ggtp', 'gamma gt', 'aspartate aminotransferase', 'alanine aminotransferase'],
    // Lipid Profile
    'lipid': ['cholesterol', 'triglycerides', 'hdl', 'ldl', 'vldl', 'ratio'],
    // Complete Blood Count
    'cbc': ['hemoglobin', 'haemoglobin', 'rbc', 'wbc', 'platelet', 'pcv', 'hematocrit', 'mcv', 'mch', 'mchc', 'rdw', 'neutrophil', 'lymphocyte', 'monocyte', 'eosinophil', 'basophil', 'esr'],
    'complete blood': ['hemoglobin', 'haemoglobin', 'rbc', 'wbc', 'platelet', 'pcv', 'hematocrit', 'mcv', 'mch', 'mchc', 'rdw', 'neutrophil', 'lymphocyte', 'monocyte', 'eosinophil', 'basophil', 'esr'],
    'hemogram': ['hemoglobin', 'haemoglobin', 'rbc', 'wbc', 'platelet', 'pcv', 'hematocrit', 'mcv', 'mch', 'mchc', 'rdw', 'neutrophil', 'lymphocyte', 'monocyte', 'eosinophil', 'basophil', 'esr'],
    // Renal / Kidney Function Test
    'kft': ['urea', 'bun', 'creatinine', 'uric acid', 'sodium', 'potassium', 'chloride'],
    'rft': ['urea', 'bun', 'creatinine', 'uric acid', 'sodium', 'potassium', 'chloride'],
    'renal': ['urea', 'bun', 'creatinine', 'uric acid', 'sodium', 'potassium', 'chloride'],
    'kidney': ['urea', 'bun', 'creatinine', 'uric acid', 'sodium', 'potassium', 'chloride'],
    // Thyroid Profile
    'tft': ['triiodothyronine', 't3', 'thyroxine', 't4', 'tsh', 'thyroid stimulating'],
    'thyroid': ['triiodothyronine', 't3', 'thyroxine', 't4', 'tsh', 'thyroid stimulating']
};

const sanitizeInvestigationItems = (rawItems) => {
    if (!Array.isArray(rawItems) || rawItems.length === 0) return [];

    // Deduplicate and trim
    const items = Array.from(new Set(rawItems.map(t => (typeof t === 'string' ? t.trim() : '')).filter(Boolean)));
    if (items.length <= 1) return items;

    // Detect which panels are present in this invoice
    const activePanelKeys = [];
    items.forEach(item => {
        const lower = item.toLowerCase();
        for (const panelKey of Object.keys(PANEL_CHILDREN_MAP)) {
            if (lower.includes(panelKey)) {
                activePanelKeys.push(panelKey);
            }
        }
    });

    if (activePanelKeys.length === 0) return items;

    // Build the set of child terms to suppress because their parent panel is present
    const suppressTerms = [];
    activePanelKeys.forEach(pKey => {
        (PANEL_CHILDREN_MAP[pKey] || []).forEach(term => suppressTerms.push(term));
    });

    // Filter out items that are sub-components of an active panel
    const filtered = items.filter(item => {
        const lower = item.toLowerCase();
        // Always retain the panel test itself
        for (const pKey of activePanelKeys) {
            if (lower.includes(pKey)) return true;
        }
        // If it matches a sub-component term of an active panel, suppress it
        for (const term of suppressTerms) {
            if (lower.includes(term)) return false;
        }
        return true;
    });

    return filtered.length > 0 ? filtered : items;
};

// --- SCREENS ---

export const BillsCollectionsScreen = () => {
    const { user } = useAuth();
    const { presetRange: globalPreset, customDates: globalCustomDates, isConsolidated, effectiveBranchId, isAdmin } = useGlobalFilter();
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Read pre-filtered parameters from URL query params (e.g. from FinanceOverview clicks)
    const initialDept = searchParams.get('department') || 'All';
    const initialMod = searchParams.get('modality') || 'All';

    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);
    
    // Enterprise Document Modal States
    const [docModalType, setDocModalType] = useState(null); // 'invoice' | 'claim' | null
    const [docData, setDocData] = useState(null);
    const [loadingDoc, setLoadingDoc] = useState(false);
    const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false);

    // Filter states
    const [statusFilter, setStatusFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [departmentFilter, setDepartmentFilter] = useState(initialDept);
    const [modalityFilter, setModalityFilter] = useState(initialMod);
    const [testFilter, setTestFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadBills();
    }, [departmentFilter, modalityFilter, globalPreset, globalCustomDates?.start, globalCustomDates?.end, isConsolidated, effectiveBranchId]);

    const loadBills = async () => {
        try {
            setLoading(true);
            const params = {};
            const bId = isConsolidated && isAdmin ? null : effectiveBranchId;
            if (bId) params.branchId = bId;
            if (departmentFilter !== 'All') params.department = departmentFilter;
            if (modalityFilter !== 'All') params.modality = modalityFilter;
            if (globalPreset && globalPreset !== 'all' && globalPreset !== 'custom' && globalPreset !== 'singleDate') {
                params.preset = globalPreset;
            } else if ((globalPreset === 'custom' || globalPreset === 'singleDate') && globalCustomDates?.start) {
                params.startDate = globalCustomDates.start;
                params.endDate = globalCustomDates.end || globalCustomDates.start;
            }
            const [data, cancellationsData] = await Promise.all([
                FinanceApi.getFinanceBills(params),
                FinanceApi.getVisitCancellations({ preset: 'year' }).catch(() => [])
            ]);

            const cancelledVisitIds = new Set((cancellationsData || []).map(c => c.visitId).filter(Boolean));
            const rawBills = Array.isArray(data) ? data : (data?.bills || []);
            const validBills = rawBills.filter(b => !isDraftBill(b));
            const normalizedBills = validBills.map(b => {
                const isCancelled = b.isCancelled || 
                                    (b.status || '').toUpperCase() === 'CANCELLED' ||
                                    cancelledVisitIds.has(b.visitId);
                return {
                    ...b,
                    isCancelled,
                    pendingAmount: isCancelled ? 0 : Number(b.pendingAmount || 0),
                    status: isCancelled ? 'Cancelled' : b.status,
                    billNumber: formatCanonicalBillNo(b),
                    testItems: sanitizeInvestigationItems(b.testItems)
                };
            });
            setBills(normalizedBills);
        } catch (err) {
            console.error("Failed to load bills:", err);
        } finally {
            setLoading(false);
        }
    };

    // Dynamic test options: strictly tests populated in the current dataset matching department & modality
    const dynamicTestOptions = useMemo(() => {
        const testSet = new Set();
        bills.forEach(b => {
            (b.testItems || []).forEach(t => {
                if (!t || typeof t !== 'string' || !t.trim()) return;
                const cleanTest = t.trim();
                const classified = classifyInvestigation(cleanTest);

                // Strict Department match
                if (departmentFilter !== 'All') {
                    if (classified.department.toLowerCase() !== departmentFilter.toLowerCase()) return;
                }

                // Modality / Discipline match
                if (modalityFilter !== 'All') {
                    const targetMod = modalityFilter.toLowerCase();
                    const isModMatch = classified.modality.toLowerCase() === targetMod ||
                                       (targetMod === 'ct' && classified.modality.toLowerCase().includes('ct')) ||
                                       (targetMod === 'ct scan' && classified.modality.toLowerCase().includes('ct')) ||
                                       (targetMod === 'mri' && classified.modality.toLowerCase() === 'mri') ||
                                       (targetMod === 'ultrasound' && classified.modality.toLowerCase().includes('ultra')) ||
                                       (targetMod === 'x-ray' && classified.modality.toLowerCase().includes('x-ray'));
                    if (!isModMatch) return;
                }

                testSet.add(cleanTest);
            });
        });

        return Array.from(testSet).sort((a, b) => a.localeCompare(b));
    }, [bills, departmentFilter, modalityFilter]);

    const handleRecordCollection = (bill) => {
        setSelectedBill(bill);
        setIsModalOpen(true);
    };

    const handleOpenInvoiceDoc = async (billId) => {
        try {
            setLoadingDoc(true);
            const data = await FinanceApi.getInvoiceDocument(billId);
            setDocData(data);
            setDocModalType('invoice');
        } catch (err) {
            alert("Failed to load patient invoice: " + err.message);
        } finally {
            setLoadingDoc(false);
        }
    };

    const handleOpenPartnerClaim = async (partnerId, visitIds = null) => {
        try {
            setLoadingDoc(true);
            const payload = {};
            if (partnerId) payload.partnerId = partnerId;
            if (visitIds && visitIds.length > 0) payload.visitIds = visitIds;
            const data = await FinanceApi.getPartnerClaimStatement(payload);
            setDocData(data);
            setDocModalType('claim');
        } catch (err) {
            alert("Failed to generate doctor claim statement: " + err.message);
        } finally {
            setLoadingDoc(false);
        }
    };

    const handleWhatsAppClaimShare = () => {
        if (!docData) return;
        const partner = docData.partner?.name || "Doctor";
        const net = (docData.summary?.netClaimDue || 0).toLocaleString();
        const count = docData.summary?.totalVisitsCount || 0;
        const upi = docData.lab?.upiId || "";
        const ref = docData.statementNumber || "";
        const msg = `Dear ${partner},\nGreetings from ${docData.lab?.labLegalName || 'SynOS Lab'}.\n\nPlease find your referral settlement claim statement (${ref}) for ${count} patient visits.\n*Net Payable to Lab: ₹${net}*\n\nYou can remit directly via UPI: ${upi}\nThank you!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const confirmCollection = async (amount, paymentMethod = 'BankTransfer', notes = '') => {
        if (!selectedBill) return;
        const response = await fetch(`/api/v1/visits/${selectedBill.visitId}/payment`, {
            method: 'POST',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify({ 
                amount, 
                paymentMethod: paymentMethod || 'BankTransfer',
                notes: notes || `Settlement from Finance Hub (${selectedBill.patientName || 'Visit'})`
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || "Failed to record payment");
        }
        await loadBills();
    };

    // Client-side filtration for fast reactive updates
    const filteredBills = bills.filter(b => {
        if (isDraftBill(b)) return false;

        // Strict Date Preset Verification (Guards against timezone drift or broad backend returns)
        if (!isWithinTimeRange(b.date || b.createdAt, globalPreset, globalCustomDates)) {
            return false;
        }

        // 1. Status Filter
        const isCancelled = b.isCancelled || (b.status || '').toUpperCase() === 'CANCELLED';
        if (statusFilter !== 'All') {
            if (statusFilter === 'Pending') {
                if (isCancelled || (b.status || '').toUpperCase() !== 'PENDING') return false;
            } else if (statusFilter === 'Partial') {
                if (isCancelled || (b.status || '').toUpperCase() !== 'PARTIAL') return false;
            } else if (statusFilter === 'Settled') {
                if (isCancelled || (b.status || '').toUpperCase() !== 'SETTLED') return false;
            } else if (statusFilter === 'Cancelled') {
                if (!isCancelled) return false;
            }
        }

        // 2. Category / Bill Type Filter (Standard/Direct, Corporate B2B, Insurance)
        if (categoryFilter !== 'All') {
            const payerInfo = getPayerModeInfo(b);

            if (categoryFilter === 'Standard/Direct' || categoryFilter === 'Direct' || categoryFilter === 'Standard') {
                if (!payerInfo.isStandard) return false;
            } else if (categoryFilter === 'Corporate B2B' || categoryFilter === 'Corporate') {
                if (!payerInfo.isCorporate) return false;
            } else if (categoryFilter === 'Insurance') {
                if (!payerInfo.isInsurance) return false;
            }
        }

        // 3. Department Filter
        if (departmentFilter !== 'All') {
            const targetDept = departmentFilter.toLowerCase();
            const hasMatchingDept = (b.testItems || []).some(t => {
                const c = classifyInvestigation(t);
                return c.department.toLowerCase() === targetDept;
            }) || (b.department || '').toLowerCase().includes(targetDept);
            if (!hasMatchingDept) return false;
        }

        // 4. Modality Filter
        if (modalityFilter !== 'All') {
            const targetMod = modalityFilter.toLowerCase();
            const hasMatchingMod = (b.modalities || []).some(m => {
                const ml = m.toLowerCase();
                return ml === targetMod || 
                       ml.includes(targetMod) || 
                       (targetMod === 'ct' && ml.includes('ct')) ||
                       (targetMod === 'ct scan' && ml.includes('ct'));
            }) || (b.modality && (() => {
                const ml = b.modality.toLowerCase();
                return ml === targetMod || 
                       ml.includes(targetMod) ||
                       (targetMod === 'ct' && ml.includes('ct')) ||
                       (targetMod === 'ct scan' && ml.includes('ct'));
            })()) || (b.testItems || []).some(t => {
                const c = classifyInvestigation(t);
                const ml = c.modality.toLowerCase();
                return ml === targetMod || 
                       (targetMod === 'ct' && ml.includes('ct')) ||
                       (targetMod === 'ct scan' && ml.includes('ct'));
            });
            if (!hasMatchingMod) return false;
        }

        // 5. Dynamic Test-wise Filter (Item 3)
        if (testFilter !== 'All') {
            const hasTest = (b.testItems || []).some(t => t && t.toLowerCase() === testFilter.toLowerCase());
            if (!hasTest) return false;
        }

        // 6. Omnibox Search Query (Patient Name, Bill No / OG ID, Token, MRN, Partner, or Test Name)
        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            const queryClean = query.replace(/[^a-z0-9]/g, '');

            const matchName = (b.patientName || '').toLowerCase().includes(query);
            const matchBill = (b.billNumber || '').toLowerCase().includes(query) || (b.billNumber || '').toLowerCase().replace(/[^a-z0-9]/g, '').includes(queryClean);
            const matchToken = (b.token || '').toLowerCase().includes(query) || (b.token || '').toLowerCase().replace(/[^a-z0-9]/g, '').includes(queryClean);
            const matchMrn = (b.mrn || b.uhid || '').toLowerCase().includes(query);
            const matchPartner = (b.partnerName || '').toLowerCase().includes(query);
            const matchTests = (b.testItems || []).some(t => t && t.toLowerCase().includes(query));

            if (!matchName && !matchBill && !matchToken && !matchMrn && !matchPartner && !matchTests) return false;
        }

        return true;
    });

    // Summary calculation for the filtered dataset
    const totalBilled = filteredBills.reduce((sum, b) => {
        if (b.isCancelled || (b.status || '').toUpperCase() === 'CANCELLED') return sum;
        return sum + (Number(b.totalAmount) || 0);
    }, 0);
    const totalCollected = filteredBills.reduce((sum, b) => sum + (Number(b.collectedAmount) || 0), 0);
    const totalCash = filteredBills.reduce((sum, b) => sum + (Number(b.cashAmount) || 0), 0);
    const totalOnline = filteredBills.reduce((sum, b) => sum + (Number(b.onlineAmount) || 0), 0);
    const totalPrepaid = 0;
    const totalPending = filteredBills.reduce((sum, b) => {
        if (b.isCancelled || (b.status || '').toUpperCase() === 'CANCELLED') return sum;
        return sum + (Number(b.pendingAmount) || 0);
    }, 0);
    const totalReferralCut = filteredBills.reduce((sum, b) => {
        if (b.isCancelled || (b.status || '').toUpperCase() === 'CANCELLED') return sum;
        const payerInfo = getPayerModeInfo(b);
        if (payerInfo.isCorporate || payerInfo.isInsurance) return sum;
        if ((b.partnerName || '').trim().toUpperCase() === 'SELF') return sum;
        return sum + (Number(b.referralCommissionCut) || 0);
    }, 0);

    // Download Summary CSV Export
    const handleDownloadSummary = () => {
        const headers = [
            "Bill Number",
            "Date",
            "Patient Name",
            "Facility / Branch",
            "Department",
            "Modality",
            "Account / Partner",
            "Billing Model",
            "Total Billed (INR)",
            "Cash Collected (INR)",
            "Online / Digital (INR)",
            "Patient Wallet / Advance (INR)",
            "Pending Due (INR)",
            "Pending Due Source",
            "Doctor / Partner Cut (INR)",
            "Status"
        ];

        const rows = filteredBills.map(b => {
            const payerInfo = getPayerModeInfo(b);
            const billingModel = payerInfo.mode;
            const dueSource = b.pendingAmount > 0 
                ? (payerInfo.isCorporate ? `Partner: ${b.partnerName}` : (payerInfo.isInsurance ? `Insurance: ${b.partnerName}` : 'Direct Patient Counter'))
                : 'Settled';

            return [
                `"${b.billNumber || ''}"`,
                `"${new Date(b.date).toLocaleDateString()}"`,
                `"${(b.patientName || '').replace(/"/g, '""')}"`,
                `"${(b.branchName || 'Main Facility').replace(/"/g, '""')}"`,
                `"${b.department || ''}"`,
                `"${b.modality || ''}"`,
                `"${(b.partnerName || '').replace(/"/g, '""')}"`,
                `"${billingModel}"`,
                b.totalAmount || 0,
                b.cashAmount || 0,
                b.onlineAmount || 0,
                b.prepaidAmount || 0,
                b.pendingAmount || 0,
                `"${dueSource}"`,
                payerInfo.isCorporate || payerInfo.isInsurance ? 0 : (b.referralCommissionCut || 0),
                `"${b.status || ''}"`
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        const dateTag = (globalPreset === 'custom' ? `${globalCustomDates?.start || ''}_to_${globalCustomDates?.end || ''}` : globalPreset).toLowerCase().replace(/\s+/g, '_');
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `synos_bills_summary_${dateTag}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Find any pending partner for header claim generation
    const partnerBillsWithPending = filteredBills.filter(b => {
        const payerInfo = getPayerModeInfo(b);
        return (payerInfo.isCorporate || b.partnerCategory === 'Partner') && b.pendingAmount > 0;
    });

    return (
        <div className="px-8 pt-1 pb-8 w-full space-y-4 animate-in fade-in duration-500">
            {/* Action Bar (Aligned Right) */}
            <div className="flex items-center justify-end flex-wrap gap-2.5">
                {/* B2B DOCTOR CLAIM STATEMENT BUTTON */}
                {partnerBillsWithPending.length > 0 && (
                    <button
                        onClick={() => {
                            const target = partnerBillsWithPending[0];
                            const samePartnerBills = partnerBillsWithPending.filter(b => b.partnerName === target.partnerName);
                            handleOpenPartnerClaim(target.partnerId || target.referralPartnerId, samePartnerBills.map(b => b.visitId));
                        }}
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                        <Receipt size={14} />
                        <span>Doctor Invoice ({partnerBillsWithPending.length})</span>
                    </button>
                )}

                <button
                    onClick={handleDownloadSummary}
                    disabled={filteredBills.length === 0}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-synos-primary text-white text-xs font-bold hover:bg-synos-primary/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    <Download size={14} />
                    <span>Download Summary ({filteredBills.length})</span>
                </button>

                <button
                    onClick={() => setIsPrintSummaryOpen(true)}
                    disabled={filteredBills.length === 0}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    <Printer size={14} />
                    <span>Print Summary</span>
                </button>
            </div>

            {/* KPI METRIC STRIP (Cash vs Online vs Referral Cut vs Pending Dues) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Billed</p>
                    <p className="text-lg font-black text-zinc-900 dark:text-white mt-1">₹{totalBilled.toLocaleString()}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">{filteredBills.length} Invoices</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Cash Collected</p>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{totalCash.toLocaleString()}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">Physical Drawer</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Digital / Online</p>
                    <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">₹{totalOnline.toLocaleString()}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">UPI / POS / Cards</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Referral Cut</p>
                    <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1">₹{totalReferralCut.toLocaleString()}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">Doctor Commissions</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Pending Dues</p>
                    <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">₹{totalPending.toLocaleString()}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">Receivables Balance</span>
                </div>
            </div>

            {/* Comprehensive Multi-Dimensional Filters Bar */}
            <div className="space-y-3 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border dark:border-zinc-800 border-zinc-200">
                {/* Top Row: Search on Left (1), Payment Status & Bill Type Groups to the Right (2) */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                        {/* Search Input - First on Left */}
                        <div className="relative min-w-[240px] sm:min-w-[280px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Search patient, bill no (e.g. MAI001-261102), token, MRN..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-synos-primary transition-all"
                            />
                        </div>

                        {/* Status & Bill Type Filter Groups */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0 no-scrollbar flex-wrap">
                            {/* Payment Status */}
                            <div className="flex items-center gap-1.5 bg-zinc-200/50 dark:bg-zinc-950/40 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
                                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-1.5 select-none whitespace-nowrap">
                                    Payment Status
                                </span>
                                <div className="flex items-center gap-0.5">
                                    {['All', 'Pending', 'Partial', 'Settled'].map(f => (
                                        <FilterTab key={f} label={f} isActive={statusFilter === f} onClick={() => setStatusFilter(f)} />
                                    ))}
                                </div>
                            </div>

                            <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-800 mx-1 hidden sm:block" />

                            {/* Bill Type */}
                            <div className="flex items-center gap-1.5 bg-zinc-200/50 dark:bg-zinc-950/40 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
                                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-1.5 select-none whitespace-nowrap">
                                    Bill Type
                                </span>
                                <div className="flex items-center gap-0.5">
                                    {['All', 'Standard/Direct', 'Corporate B2B', 'Insurance'].map(f => (
                                        <FilterTab key={f} label={f} isActive={categoryFilter === f} onClick={() => setCategoryFilter(f)} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Department, Modality, & Dynamic Test Selectors */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                    {/* Department Selector */}
                    <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <Beaker size={13} className="text-zinc-400" />
                        <select
                            value={departmentFilter}
                            onChange={(e) => {
                                setDepartmentFilter(e.target.value);
                                setModalityFilter('All');
                                setTestFilter('All');
                            }}
                            className="bg-transparent text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                        >
                            <option value="All">All Departments</option>
                            <option value="Pathology">Pathology</option>
                            <option value="Radiology">Radiology</option>
                        </select>
                    </div>

                    {/* Modality Selector */}
                    <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <Activity size={13} className="text-zinc-400" />
                        <select
                            value={modalityFilter}
                            onChange={(e) => {
                                setModalityFilter(e.target.value);
                                setTestFilter('All');
                            }}
                            className="bg-transparent text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                        >
                            <option value="All">All Modalities / Disciplines</option>
                            {departmentFilter !== 'Radiology' && (
                                <optgroup label="Pathology Disciplines">
                                    <option value="Biochemistry">Biochemistry</option>
                                    <option value="Hematology">Hematology</option>
                                    <option value="Microbiology">Microbiology</option>
                                    <option value="Histopathology">Histopathology</option>
                                </optgroup>
                            )}
                            {departmentFilter !== 'Pathology' && (
                                <optgroup label="Radiology Modalities">
                                    <option value="X-Ray">X-Ray</option>
                                    <option value="CT Scan">CT Scan</option>
                                    <option value="Ultrasound">Ultrasound</option>
                                    <option value="MRI">MRI</option>
                                </optgroup>
                            )}
                        </select>
                    </div>

                    {/* Dynamic Test Selector (Item 3) */}
                    <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <FileText size={13} className="text-zinc-400" />
                        <select
                            value={testFilter}
                            onChange={(e) => setTestFilter(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer max-w-[220px] truncate"
                        >
                            <option value="All">
                                {dynamicTestOptions.length === 0 ? 'All Tests (0)' : `All Tests (${dynamicTestOptions.length})`}
                            </option>
                            {dynamicTestOptions.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Table Surface */}
            <div className="synos-dept-card rounded-2xl overflow-hidden border border-slate-200/80 dark:border-zinc-800 shadow-sm">
                {loading ? (
                    <div className="p-20 text-center text-zinc-500 animate-pulse text-xs font-bold uppercase tracking-wider">
                        Synchronizing bill ledger...
                    </div>
                ) : filteredBills.length === 0 ? (
                    <div className="p-16 text-center space-y-2">
                        <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto opacity-40" />
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">No matching bills found</p>
                        <p className="text-[11px] text-zinc-400">Try adjusting the department, modality, branch, or date range filter.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-380px)] min-h-[380px] relative">
                        <table className="w-full text-left border-collapse synos-table">
                            <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-zinc-900/95 border-b border-slate-200 dark:border-zinc-800 backdrop-blur-md shadow-sm">
                                <tr>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Bill No</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Patient</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Investigations / Dept</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Partner / Account</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Total</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Payment Breakup</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Pending</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">Status</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Date</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/80 dark:divide-zinc-800/80">
                                {filteredBills.map((bill) => {
                                    const payerInfo = getPayerModeInfo(bill);
                                    return (
                                    <tr key={bill.billId} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 block tracking-tight">
                                                    {bill.billNumber}
                                                </span>
                                                {bill.branchName && (
                                                    <span className="text-[10px] font-normal text-zinc-400 mt-0.5">{bill.branchName}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">
                                                    {(bill.patientName || 'PA').substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <span className="text-xs font-semibold dark:text-zinc-200 block">{bill.patientName}</span>
                                                    <div className="flex items-center gap-1.5 text-[9px] text-zinc-400 font-mono mt-0.5">
                                                        {bill.token && <span className="font-bold text-zinc-600 dark:text-zinc-300">Token: {bill.token}</span>}
                                                        {bill.mrn && <span>• MRN: {bill.mrn}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1.5 max-w-[320px]">
                                                {/* Test / Investigation Badges */}
                                                {bill.testItems && bill.testItems.length > 0 ? (
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {bill.testItems.map((t, idx) => (
                                                            <span 
                                                                key={idx} 
                                                                className="bg-synos-primary/10 text-synos-primary border border-synos-primary/20 text-[10px] px-1.5 py-0.5 rounded font-mono leading-none truncate max-w-[150px]" 
                                                                title={t}
                                                            >
                                                                {t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-semibold dark:text-zinc-200">
                                                        General Investigation
                                                    </span>
                                                )}

                                                {/* Dept & Modality Meta Tag */}
                                                <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
                                                    <span>{bill.department || 'Pathology'}</span>
                                                    {(() => {
                                                        const displayModality = (bill.modalities && bill.modalities.length > 0)
                                                            ? (bill.modalities.length > 1 ? bill.modalities.join(', ') : bill.modalities[0])
                                                            : (bill.modality || (bill.testItems && bill.testItems[0] ? classifyInvestigation(bill.testItems[0]).modality : null));
                                                        if (displayModality && displayModality !== 'General' && displayModality !== bill.department) {
                                                            return (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="font-mono text-zinc-500 dark:text-zinc-400">{displayModality}</span>
                                                                </>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs text-zinc-500">
                                            <span className="font-semibold text-zinc-700 dark:text-zinc-200">{bill.partnerName || "Direct Patient"}</span>
                                            {bill.referralCommissionCut > 0 && !payerInfo.isCorporate && !payerInfo.isInsurance && (
                                                <p className="text-[10px] text-amber-500 font-medium mt-0.5">
                                                    Cut: ₹{bill.referralCommissionCut.toLocaleString()}
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-4 text-xs font-black text-right dark:text-zinc-200">
                                            ₹{bill.totalAmount.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <p className="text-xs font-bold text-emerald-500">
                                                ₹{bill.collectedAmount.toLocaleString()}
                                            </p>
                                            <div className="flex items-center justify-end gap-1.5 text-[9px] font-medium text-zinc-400 mt-0.5">
                                                {bill.cashAmount > 0 && <span>Cash: ₹{bill.cashAmount.toLocaleString()}</span>}
                                                {bill.onlineAmount > 0 && <span>Online: ₹{bill.onlineAmount.toLocaleString()}</span>}
                                                {bill.prepaidAmount > 0 && <span>Prepaid: ₹{bill.prepaidAmount.toLocaleString()}</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap">
                                            <span className={cn(
                                                "text-sm font-bold block",
                                                bill.pendingAmount > 0 
                                                    ? "text-rose-600 dark:text-rose-400" 
                                                    : "text-zinc-400 dark:text-zinc-500 font-medium"
                                            )}>
                                                ₹{bill.pendingAmount.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <StatusBadge status={bill.status} />
                                        </td>
                                        <td className="p-4 text-xs text-zinc-400 font-mono whitespace-nowrap">
                                            {formatDateCompact(bill.date)}
                                        </td>
                                        {/* ALWAYS VISIBLE ACTIONS WITH ENTERPRISE DOCUMENT GENERATION */}
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {/* A4 Patient Tax Invoice */}
                                                <button
                                                    onClick={() => handleOpenInvoiceDoc(bill.billId)}
                                                    title="View & Print A4 Patient Tax Invoice"
                                                    className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                                >
                                                    <FileText size={12} className="text-synos-primary" />
                                                    <span className="hidden sm:inline">A4 Bill</span>
                                                </button>

                                                {/* B2B Doctor Invoice (For Partner bills) */}
                                                {(payerInfo.isCorporate || bill.partnerCategory === 'Partner') && !bill.isCancelled && (
                                                    <button
                                                        onClick={() => handleOpenPartnerClaim(bill.partnerId || bill.referralPartnerId, [bill.visitId])}
                                                        title="Generate B2B Diagnostic Invoice for this visit"
                                                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                                                    >
                                                        <Receipt size={12} />
                                                        <span>Invoice</span>
                                                    </button>
                                                )}

                                                {bill.pendingAmount > 0 && !bill.isCancelled ? (
                                                    <button 
                                                        onClick={() => handleRecordCollection(bill)}
                                                        className="px-3 py-1.5 rounded-lg bg-synos-primary text-white text-[10px] font-bold uppercase tracking-wider hover:bg-synos-primary/90 transition-all shadow-sm cursor-pointer"
                                                    >
                                                        {payerInfo.isCorporate ? 'Settle' : 'Collect'}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleRecordCollection(bill)}
                                                        className="px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/20 transition-all cursor-pointer"
                                                    >
                                                        Details
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selectedBill && (
                <RecordCollectionModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onConfirm={confirmCollection}
                    entityName={selectedBill.patientName}
                    totalAmount={selectedBill.totalAmount}
                    pendingAmount={selectedBill.pendingAmount}
                />
            )}

            {/* ENTERPRISE COMMERCIAL DOCUMENT VIEWER & PRINT ENGINE */}
            {docModalType && docData && (
                <CommercialDocumentViewer
                    isOpen={Boolean(docModalType)}
                    onClose={() => { setDocModalType(null); setDocData(null); }}
                    title={docModalType === 'claim' ? "B2B Diagnostic Tax Invoice" : "Patient Tax Invoice (A4)"}
                    onWhatsAppShare={docModalType === 'claim' ? handleWhatsAppClaimShare : null}
                    defaultLetterheadMode={docData?.lab?.defaultLetterheadMode || "digital"}
                    topMarginMm={docData?.lab?.topMarginMm || 40}
                >
                    <DynamicDocumentRenderer 
                        slotId={docModalType === 'claim' ? "partner_b2b_invoice" : "patient_tax_invoice"} 
                        data={docData} 
                    />
                </CommercialDocumentViewer>
            )}

            {/* A4 PRINTABLE FINANCIAL SUMMARY MODAL */}
            <FinancePrintableSummaryModal
                isOpen={isPrintSummaryOpen}
                onClose={() => setIsPrintSummaryOpen(false)}
                slotId="summary_bills_daybook"
                title="Bills & Collections Revenue Ledger"
                subtitle="Operational ledger with branch, department, and modality transaction breakdowns"
                dateRangeText={globalPreset === 'custom' ? `${globalCustomDates?.start || ''} to ${globalCustomDates?.end || ''}` : globalPreset}
                categoryLabel="REVENUE LEDGER AUDIT"
                filterTags={[
                    departmentFilter !== 'All' ? `Dept: ${departmentFilter}` : null,
                    modalityFilter !== 'All' ? `Modality: ${modalityFilter}` : null,
                    statusFilter !== 'All' ? `Status: ${statusFilter}` : null,
                    categoryFilter !== 'All' ? `Bill Type: ${categoryFilter}` : null,
                    searchQuery ? `Search: "${searchQuery}"` : null
                ].filter(Boolean)}
                kpis={[
                    { label: "Total Billed", value: `₹${totalBilled.toLocaleString()}`, color: "text-zinc-900", subtext: `${filteredBills.length} Invoices` },
                    { label: "Cash Collected", value: `₹${totalCash.toLocaleString()}`, color: "text-emerald-600", subtext: "Physical Currency" },
                    { label: "Online / Digital", value: `₹${totalOnline.toLocaleString()}`, color: "text-sky-600", subtext: "UPI & Cards" },
                    { label: "Doctor Commissions", value: `₹${totalReferralCut.toLocaleString()}`, color: "text-purple-600", subtext: "Referral Liability" },
                    { label: "Pending Dues", value: `₹${totalPending.toLocaleString()}`, color: "text-rose-600", subtext: "Receivables Balance" }
                ]}
                columns={[
                    { key: 'billNumber', label: 'Bill / Inv No' },
                    { key: 'date', label: 'Date', render: (v) => formatDateCompact(v) },
                    { key: 'patientName', label: 'Patient Name' },
                    { key: 'branchName', label: 'Branch', render: (v) => v || 'Main Facility' },
                    { key: 'department', label: 'Dept / Modality', render: (_, r) => {
                        const dept = r.department || 'Pathology';
                        const mod = r.modality && r.modality !== 'General' && r.modality !== dept ? ` / ${r.modality}` : '';
                        return `${dept}${mod}`;
                    }},
                    { key: 'partnerCategory', label: 'Billing Model', render: (v) => v || 'Direct Counter' },
                    { key: 'totalAmount', label: 'Billed (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'paidAmount', label: 'Paid (₹)', align: 'right', render: (_, r) => `₹${Number((r.cashAmount || 0) + (r.onlineAmount || 0) + (r.prepaidAmount || 0)).toLocaleString()}` },
                    { key: 'pendingAmount', label: 'Due (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'status', label: 'Status', align: 'center', render: (v) => v || 'Pending' }
                ]}
                data={filteredBills}
                summaryTotals={{
                    totalAmount: `₹${totalBilled.toLocaleString()}`,
                    paidAmount: `₹${(totalCash + totalOnline).toLocaleString()}`,
                    pendingAmount: `₹${totalPending.toLocaleString()}`
                }}
                onDownloadCsv={handleDownloadSummary}
            />
        </div>
    );
};

export const DueBillsScreen = () => {
    const { user } = useAuth();
    const { presetRange, customDates, isConsolidated, effectiveBranchId, isAdmin } = useGlobalFilter();
    const [dueBills, setDueBills] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Partial' | 'Pending'

    // Collection Modal State
    const [selectedDueBill, setSelectedDueBill] = useState(null);
    const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
    const [collectAmount, setCollectAmount] = useState('');
    const [collectMethod, setCollectMethod] = useState('Cash');
    const [collectNotes, setCollectNotes] = useState('');
    const [isSubmittingCollect, setIsSubmittingCollect] = useState(false);
    const [collectError, setCollectError] = useState(null);

    // Document Modal State
    const [docData, setDocData] = useState(null);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [loadingDoc, setLoadingDoc] = useState(false);
    const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [presetRange, isConsolidated, effectiveBranchId, customDates?.start, customDates?.end]);

    const loadData = async () => {
        try {
            setLoading(true);
            const bId = isConsolidated && isAdmin ? null : effectiveBranchId;
            const params = {
                preset: presetRange,
                branchId: bId || undefined
            };
            if (presetRange === 'custom' && customDates?.start && customDates?.end) {
                params.startDate = customDates.start;
                params.endDate = customDates.end;
            }
            const data = await FinanceApi.getDueBills(params);
            const list = Array.isArray(data) ? data : [];
            const sanitized = list.filter(b => !isDraftBill(b)).map(b => ({
                ...b,
                tests: sanitizeInvestigationItems(b.tests)
            }));
            setDueBills(sanitized);
        } catch (err) {
            console.error("Failed to load patient due bills:", err);
            setDueBills([]);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCollectModal = (bill) => {
        setSelectedDueBill(bill);
        setCollectAmount(String(bill.balanceDue || ''));
        setCollectMethod('Cash');
        setCollectNotes('');
        setCollectError(null);
        setIsCollectModalOpen(true);
    };

    const handleConfirmCollect = async (e) => {
        e?.preventDefault();
        if (!selectedDueBill || !collectAmount || Number(collectAmount) <= 0) return;

        try {
            setIsSubmittingCollect(true);
            setCollectError(null);
            await FinanceApi.collectDuePayment(selectedDueBill.invoiceId, {
                amount: Number(collectAmount),
                method: collectMethod,
                notes: collectNotes
            });
            setIsCollectModalOpen(false);
            setSelectedDueBill(null);
            await loadData();
        } catch (err) {
            setCollectError(err.message || "Failed to record payment");
        } finally {
            setIsSubmittingCollect(false);
        }
    };

    const handleViewInvoiceDoc = async (invoiceId) => {
        try {
            setLoadingDoc(true);
            const doc = await FinanceApi.getInvoiceDocument(invoiceId);
            setDocData(doc);
            setIsDocModalOpen(true);
        } catch (err) {
            console.error("Failed to fetch tax invoice:", err);
        } finally {
            setLoadingDoc(false);
        }
    };

    // Filter Logic
    const filteredBills = useMemo(() => {
        return dueBills.filter(b => {
            if (isDraftBill(b)) return false;
            if (!isWithinTimeRange(b.createdAt || b.date, presetRange, customDates)) return false;
            if (statusFilter === 'Partial' && b.status !== 'Partial') return false;
            if (statusFilter === 'Pending' && b.status !== 'Pending') return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = (b.patientName || '').toLowerCase().includes(q);
                const matchToken = (b.token || '').toLowerCase().includes(q);
                const matchPhone = (b.patientMobile || '').includes(q);
                const matchMrn = (b.patientMrn || '').toLowerCase().includes(q);
                const matchDoc = (b.referralDoctor || '').toLowerCase().includes(q);
                if (!matchName && !matchToken && !matchPhone && !matchMrn && !matchDoc) return false;
            }

            return true;
        });
    }, [dueBills, statusFilter, searchQuery]);

    const totalDue = filteredBills.reduce((sum, b) => sum + (Number(b.balanceDue) || 0), 0);
    const totalPaid = filteredBills.reduce((sum, b) => sum + (Number(b.totalPaid) || 0), 0);
    const totalInvoiced = filteredBills.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const recoveryRate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;

    // CSV Export
    const handleDownloadSummary = () => {
        const headers = [
            "Bill No",
            "Visit Token",
            "Date",
            "Patient Name",
            "MRN",
            "Phone",
            "Facility / Branch",
            "Referring Doctor",
            "Tests Invoiced",
            "Total Invoiced (INR)",
            "Paid Amount (INR)",
            "Balance Due (INR)",
            "Status",
            "Last Payment Date",
            "Last Payment Method"
        ];

        const rows = filteredBills.map(b => [
            `"${b.billNumber || b.token || ''}"`,
            `"${b.token || ''}"`,
            `"${b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ''}"`,
            `"${(b.patientName || '').replace(/"/g, '""')}"`,
            `"${b.patientMrn || ''}"`,
            `"${b.patientMobile || ''}"`,
            `"${(b.branchName || 'Main Facility').replace(/"/g, '""')}"`,
            `"${(b.referralDoctor || 'Direct Patient').replace(/"/g, '""')}"`,
            `"${(b.tests?.join('; ') || '').replace(/"/g, '""')}"`,
            b.totalAmount || 0,
            b.totalPaid || 0,
            b.balanceDue || 0,
            `"${b.status || ''}"`,
            `"${b.lastPaymentDate ? new Date(b.lastPaymentDate).toLocaleString() : 'N/A'}"`,
            `"${b.lastPaymentMethod || 'N/A'}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Due_Bills_Summary_${presetRange}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="w-full px-8 pt-1 pb-8 space-y-4">
            {/* Actions Bar (Aligned Right) */}
            <div className="flex items-center justify-end gap-2">
                <button
                    onClick={handleDownloadSummary}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Export CSV</span>
                </button>
                <button
                    onClick={() => setIsPrintSummaryOpen(true)}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                    <Printer className="w-3.5 h-3.5 text-synos-primary" />
                    <span>Print Summary</span>
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl synos-kpi-card border border-rose-500/20 bg-rose-500/5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Total Patient Dues</p>
                    <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">₹{totalDue.toLocaleString()}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">{filteredBills.length} Active Due Bills</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Collected So Far</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{totalPaid.toLocaleString()}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">Partially Paid at Counter</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Billed Volume</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">₹{totalInvoiced.toLocaleString()}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">Original Invoiced Value</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Recovery Rate</p>
                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{recoveryRate}%</p>
                    <span className="text-[10px] text-zinc-400 font-medium">Realized Settlement Ratio</span>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="space-y-3 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border dark:border-zinc-800 border-zinc-200">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
                        {['All', 'Partial', 'Pending'].map(f => (
                            <FilterTab key={f} label={f === 'All' ? 'All Due Bills' : (f === 'Partial' ? 'Partially Paid' : 'Full Due (Unpaid)')} isActive={statusFilter === f} onClick={() => setStatusFilter(f)} />
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Search Input */}
                        <div className="relative min-w-[220px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Search patient, token, phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:border-synos-primary transition-all shadow-xs"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Due Bills Table */}
            <div className="rounded-2xl border dark:border-zinc-800 border-zinc-200 overflow-hidden bg-white dark:bg-zinc-900/30 shadow-xs">
                {loading ? (
                    <div className="p-16 text-center animate-pulse text-zinc-500 font-bold uppercase tracking-widest text-xs flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <span>Scanning outstanding patient dues...</span>
                    </div>
                ) : filteredBills.length === 0 ? (
                    <div className="p-16 text-center space-y-3">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-75" />
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">Zero Patient Dues Outstanding</p>
                        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                            All patient counter bills are fully settled for the selected time horizon. Great financial health!
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b dark:border-zinc-800 border-zinc-200 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                                    <th className="py-3 px-4">Bill No</th>
                                    <th className="py-3 px-4">Date & Time</th>
                                    <th className="py-3 px-4">Token & Patient</th>
                                    <th className="py-3 px-4">Facility</th>
                                    <th className="py-3 px-4">Referring Doctor</th>
                                    <th className="py-3 px-4">Tests</th>
                                    <th className="py-3 px-4 text-right">Total Bill</th>
                                    <th className="py-3 px-4 text-right">Paid So Far</th>
                                    <th className="py-3 px-4 text-right">Balance Due</th>
                                    <th className="py-3 px-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                                {filteredBills.map((b) => (
                                    <tr key={b.invoiceId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                                        <td className="py-3.5 px-4 font-mono font-bold text-xs text-synos-primary dark:text-sky-400 whitespace-nowrap">
                                            {b.billNumber || formatCanonicalBillNo(b)}
                                        </td>
                                        <td className="py-3.5 px-4 whitespace-nowrap text-zinc-500 font-mono text-[11px]">
                                            {b.createdAt ? new Date(b.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-black/5 dark:border-white/5">
                                                    {b.token}
                                                </span>
                                                {b.totalPaid > 0 ? (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
                                                        Partial Due
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 whitespace-nowrap">
                                                        Full Due
                                                    </span>
                                                )}
                                                <div>
                                                    <p className="font-bold text-zinc-900 dark:text-white leading-tight">{b.patientName}</p>
                                                    <p className="text-[11px] text-zinc-400 font-medium">
                                                        {b.patientGender || ''} {b.patientAge ? `• ${b.patientAge}y` : ''} {b.patientMobile ? `• ${b.patientMobile}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 font-medium">
                                            {b.branchName || 'Main Facility'}
                                        </td>
                                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400">
                                            {b.referralDoctor || 'Direct Patient'}
                                        </td>
                                        <td className="py-3.5 px-4 max-w-[200px] truncate text-zinc-500 text-[11px]">
                                            {b.tests?.join(', ') || 'Diagnostic Tests'}
                                        </td>
                                        <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-900 dark:text-white">
                                            ₹{Number(b.totalAmount || 0).toLocaleString()}
                                        </td>
                                        <td className="py-3.5 px-4 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                            ₹{Number(b.totalPaid || 0).toLocaleString()}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <span className="font-mono font-black text-xs px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                                ₹{Number(b.balanceDue || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => handleOpenCollectModal(b)}
                                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                                                >
                                                    <IndianRupee className="w-3 h-3" />
                                                    <span>Collect Due</span>
                                                </button>
                                                <button
                                                    onClick={() => handleViewInvoiceDoc(b.invoiceId)}
                                                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                                                    title="View Patient Tax Invoice"
                                                >
                                                    <Receipt className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* COLLECT DUE MODAL */}
            {isCollectModalOpen && selectedDueBill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b dark:border-zinc-800 border-zinc-200 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                                    <IndianRupee className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Collect Patient Due</h3>
                                    <p className="text-[11px] text-zinc-400">Token: {selectedDueBill.token} • {selectedDueBill.patientName}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCollectModalOpen(false)}
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {collectError && (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-600 dark:text-rose-400">
                                {collectError}
                            </div>
                        )}

                        {/* Balance Overview */}
                        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-center">
                            <div>
                                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Total Invoiced</span>
                                <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white">₹{selectedDueBill.totalAmount?.toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-emerald-500 uppercase font-bold block">Paid So Far</span>
                                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">₹{selectedDueBill.totalPaid?.toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-rose-500 uppercase font-bold block">Current Due</span>
                                <span className="font-mono text-xs font-black text-rose-600 dark:text-rose-400">₹{selectedDueBill.balanceDue?.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Amount Input */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Amount Collecting Now (₹)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">₹</span>
                                <input
                                    type="number"
                                    min="1"
                                    max={selectedDueBill.balanceDue}
                                    value={collectAmount}
                                    onChange={(e) => setCollectAmount(e.target.value)}
                                    className="w-full pl-8 pr-4 py-2.5 text-sm font-mono font-bold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-amber-500"
                                />
                            </div>
                            {Number(collectAmount) < selectedDueBill.balanceDue && Number(collectAmount) > 0 && (
                                <p className="text-[11px] text-amber-500 font-medium">
                                    * Remaining due after this payment: ₹{(selectedDueBill.balanceDue - Number(collectAmount)).toLocaleString()}
                                </p>
                            )}
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Payment Channel</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Cash', 'UPI', 'Card'].map(m => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setCollectMethod(m)}
                                        className={cn(
                                            "py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-1",
                                            collectMethod === m
                                                ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                                                : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100"
                                        )}
                                    >
                                        {m === 'Cash' && <IndianRupee className="w-3.5 h-3.5" />}
                                        {m === 'UPI' && <Smartphone className="w-3.5 h-3.5" />}
                                        {m === 'Card' && <CreditCard className="w-3.5 h-3.5" />}
                                        <span>{m}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Notes / Transaction Ref (Optional)</label>
                            <input
                                type="text"
                                placeholder="e.g. UPI txn id or receipt memo"
                                value={collectNotes}
                                onChange={(e) => setCollectNotes(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-amber-500"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t dark:border-zinc-800 border-zinc-200">
                            <button
                                type="button"
                                onClick={() => setIsCollectModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isSubmittingCollect || !collectAmount || Number(collectAmount) <= 0}
                                onClick={handleConfirmCollect}
                                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                            >
                                {isSubmittingCollect ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Recording...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Confirm Collection (₹{Number(collectAmount || 0).toLocaleString()})</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Commercial Document Modal */}
            {isDocModalOpen && docData && (
                <CommercialDocumentViewer
                    isOpen={isDocModalOpen}
                    onClose={() => {
                        setIsDocModalOpen(false);
                        setDocData(null);
                    }}
                    title={`Patient Tax Invoice - ${docData.patient?.name || ''}`}
                    defaultLetterheadMode="digital"
                    paperSize="a4"
                >
                    <DynamicDocumentRenderer
                        slotId="patient_tax_invoice"
                        data={docData}
                        forceRefresh={true}
                    />
                </CommercialDocumentViewer>
            )}

            {/* Printable Summary Modal */}
            <FinancePrintableSummaryModal
                isOpen={isPrintSummaryOpen}
                onClose={() => setIsPrintSummaryOpen(false)}
                title="Patient Due Bills & Balances Report"
                timeRange={presetRange}
                dateRangeText={presetRange === 'custom' ? `${customDates?.start || ''} to ${customDates?.end || ''}` : presetRange}
                columns={[
                    { key: 'token', label: 'Token' },
                    { key: 'patientName', label: 'Patient Name' },
                    { key: 'patientMobile', label: 'Phone' },
                    { key: 'branchName', label: 'Facility' },
                    { key: 'referralDoctor', label: 'Referring Doctor' },
                    { key: 'totalAmount', label: 'Total Invoiced', align: 'right', format: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'totalPaid', label: 'Paid Amount', align: 'right', format: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'balanceDue', label: 'Balance Due', align: 'right', format: (v) => `₹${Number(v || 0).toLocaleString()}` }
                ]}
                data={filteredBills}
                summaryTotals={{
                    totalAmount: `₹${totalInvoiced.toLocaleString()}`,
                    paidAmount: `₹${totalPaid.toLocaleString()}`,
                    pendingAmount: `₹${totalDue.toLocaleString()}`
                }}
                onDownloadCsv={handleDownloadSummary}
            />
        </div>
    );
};

export const PendingReceivablesScreen = () => {
    const { user } = useAuth();
    const { presetRange, customDates, isConsolidated, effectiveBranchId, isAdmin } = useGlobalFilter();
    const [partnerSummaries, setPartnerSummaries] = useState([]);
    const [allBills, setAllBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [selectedBillIds, setSelectedBillIds] = useState([]);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [expandedPartnerId, setExpandedPartnerId] = useState(null);

    // Enterprise Claim Bill State
    const [claimDocData, setClaimDocData] = useState(null);
    const [isClaimDocOpen, setIsClaimDocOpen] = useState(false);
    const [generatingClaim, setGeneratingClaim] = useState(false);
    const [selectedFactIds, setSelectedFactIds] = useState(new Set());

    // Multi-dimensional filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [doctorFilter, setDoctorFilter] = useState('All');
    const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [presetRange, isConsolidated, effectiveBranchId, customDates?.start, customDates?.end]);

    useEffect(() => {
        SignalRService.startConnection().catch(console.error);
        const conn = SignalRService._getConnection();
        const handleLiveSync = () => {
            loadData();
        };
        conn.on("ReceivableUpdated", handleLiveSync);
        conn.on("ActionQueueUpdated", handleLiveSync);
        return () => {
            conn.off("ReceivableUpdated", handleLiveSync);
            conn.off("ActionQueueUpdated", handleLiveSync);
        };
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const bId = isConsolidated && isAdmin ? null : effectiveBranchId;
            const start = presetRange === 'custom' ? customDates?.start : null;
            const end = presetRange === 'custom' ? customDates?.end : null;
            const [summaries, bills] = await Promise.all([
                FinanceApi.getPartnerReceivablesSummary(bId, presetRange, start, end),
                FinanceApi.getReceivables(null, bId, presetRange, start, end)
            ]);
            setPartnerSummaries(summaries || []);
            setAllBills((bills || []).filter(b => !isDraftBill(b)).map(b => ({
                ...b,
                billNumber: formatCanonicalBillNo(b)
            })));
        } catch (err) {
            console.error("Failed to load receivables:", err);
        } finally {
            setLoading(false);
        }
    };

    const timeFilteredBills = useMemo(() => {
        return allBills.filter(b => isWithinTimeRange(b.occurredAt || b.date, presetRange, customDates));
    }, [allBills, presetRange, customDates]);

    // AR Clearing Workbench strictly tracks open / unsettled receivables
    const openBills = useMemo(() => {
        return timeFilteredBills.filter(b => !isReceivableSettled(b));
    }, [timeFilteredBills]);

    const computedPartnerSummaries = useMemo(() => {
        const groups = new Map();
        openBills.forEach(b => {
            const partnerName = b.partnerName || b.debtorName || 'Unknown Partner';
            const partnerId = b.referralPartnerId || b.debtorId || b.partnerId || partnerName;
            const safeDue = getEffectiveBalanceDue(b);
            if (safeDue <= 0) return;

            const billDate = b.occurredAt || b.date;
            const days = billDate ? Math.floor((new Date() - new Date(billDate)) / (1000 * 60 * 60 * 24)) : 0;

            if (!groups.has(partnerId)) {
                groups.set(partnerId, {
                    partnerId,
                    partnerName,
                    totalOutstanding: 0,
                    billCount: 0,
                    oldestDueDate: billDate || new Date().toISOString(),
                    aging_0_7: 0,
                    aging_7_30: 0,
                    aging_30_Plus: 0
                });
            }
            const p = groups.get(partnerId);
            p.totalOutstanding += safeDue;
            p.billCount += 1;
            if (billDate && new Date(billDate) < new Date(p.oldestDueDate)) {
                p.oldestDueDate = billDate;
            }
            if (days <= 7) p.aging_0_7 += safeDue;
            else if (days <= 30) p.aging_7_30 += safeDue;
            else p.aging_30_Plus += safeDue;
        });
        return Array.from(groups.values()).filter(p => p.totalOutstanding > 0);
    }, [openBills]);

    const handleOpenPartnerClaim = async (partner, specificFactIds = null) => {
        try {
            setGeneratingClaim(true);
            const partnerBills = openBills.filter(b => b.partnerName === partner.partnerName);
            const targetFactIds = specificFactIds && specificFactIds.length > 0 
                ? specificFactIds 
                : partnerBills.map(b => b.receivableFactId);

            const res = await FinanceApi.getPartnerClaimStatement({
                partnerId: partner.partnerId,
                receivableFactIds: targetFactIds
            });
            setClaimDocData(res);
            setIsClaimDocOpen(true);
        } catch (err) {
            console.error("Failed to load partner claim:", err);
            alert("Could not load invoice: " + (err.response?.data?.message || err.message));
        } finally {
            setGeneratingClaim(false);
        }
    };

    const handleWhatsAppClaimShare = () => {
        if (!claimDocData) return;
        const phone = claimDocData?.partner?.phone || '';
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const netDue = claimDocData?.summary?.netClaimDue || 0;
        const count = claimDocData?.items?.length || 0;
        const msg = `Dear ${claimDocData?.partner?.name || 'Doctor'},\n\nDiagnostic B2B Invoice from ${claimDocData?.lab?.labLegalName || 'SynOS Healthcare'}:\n• Selected Patient Visits: ${count}\n• Total Diagnostic Charges: ₹${netDue.toLocaleString()}\n• Net Amount Payable: ₹${netDue.toLocaleString()}\n\nRemittance details and UPI QR are attached in the invoice. Please verify and settle dues at your earliest convenience. Thank you!`;
        window.open(`https://wa.me/${cleanPhone ? (cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone) : ''}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleBulkSettle = (partner, specificFactIds = null) => {
        setSelectedPartner(partner);
        const partnerBills = openBills.filter(b => b.partnerName === partner.partnerName);
        const targetIds = specificFactIds && specificFactIds.length > 0
            ? specificFactIds
            : partnerBills.map(b => b.receivableFactId);
        setSelectedBillIds(targetIds);
        setIsBulkModalOpen(true);
    };

    const confirmBulkSettlement = async (totalAmount, paymentMode, reference = null) => {
        try {
            await FinanceApi.settleBulkPartnerReceivables(selectedPartner.partnerId, selectedBillIds, totalAmount, paymentMode, reference);
            setIsBulkModalOpen(false);
            setSelectedBillIds([]);
            setSelectedFactIds(new Set());
            loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    const toggleExpand = (partnerId) => {
        setExpandedPartnerId(expandedPartnerId === partnerId ? null : partnerId);
    };

    // Extract list of all referring doctors / clinical partners for filter dropdown
    const doctorOptions = useMemo(() => {
        const names = new Set();
        computedPartnerSummaries.forEach(p => {
            if (p.partnerName) names.add(p.partnerName);
        });
        timeFilteredBills.forEach(b => {
            if (b.partnerName) names.add(b.partnerName);
        });
        return Array.from(names).sort();
    }, [computedPartnerSummaries, timeFilteredBills]);

    // Filter partners based on search, doctor, status, and aging
    const filteredPartnerSummaries = computedPartnerSummaries.filter(p => {
        if (doctorFilter !== 'All' && p.partnerName !== doctorFilter) {
            return false;
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchName = (p.partnerName || '').toLowerCase().includes(q);
            const matchId = (p.partnerId || '').toString().toLowerCase().includes(q);
            if (!matchName && !matchId) return false;
        }
        if (statusFilter === 'Critical (>30d)' && !(p.aging_30_Plus > 0)) return false;
        if (statusFilter === 'Moderate (7-30d)' && !(p.aging_7_30 > 0)) return false;
        if (statusFilter === 'Recent (0-7d)' && !(p.aging_0_7 > 0)) return false;
        return true;
    });

    const totals = {
        outstanding: filteredPartnerSummaries.reduce((acc, p) => acc + (p.totalOutstanding || 0), 0),
        count: filteredPartnerSummaries.reduce((acc, p) => acc + (p.billCount || 0), 0),
        overdue: filteredPartnerSummaries.reduce((acc, p) => acc + (p.aging_30_Plus || 0), 0)
    };

    // Prepare itemized bills breakdown (including individual tests) for Printable Summary
    const itemizedBillsForPrint = useMemo(() => {
        const partnerNames = new Set(filteredPartnerSummaries.map(p => p.partnerName));
        return timeFilteredBills
            .filter(b => partnerNames.has(b.partnerName) && !b.settledAt)
            .map(b => ({
                id: b.id || b.receivableFactId,
                partnerName: b.partnerName,
                billNumber: b.billNumber || formatCanonicalBillNo(b),
                token: b.token || b.visitToken || '-',
                patientName: b.patientName || 'Unknown Patient',
                testsSummary: b.testsSummary || (b.testNames?.join(', ')) || (b.tests?.join(', ')) || '-',
                date: b.occurredAt || b.date ? new Date(b.occurredAt || b.date).toLocaleDateString() : '-',
                totalAmount: b.totalAmount || b.amount || 0,
                balanceDue: b.balanceDue !== undefined && !isNaN(b.balanceDue) ? b.balanceDue : (b.amount || 0) - (b.amountReceived || 0)
            }));
    }, [filteredPartnerSummaries, timeFilteredBills]);

    // Tab-Aware CSV Download for Partner Receivables (includes itemized individual tests)
    const handleDownloadSummary = () => {
        const headers = [
            "Referring Doctor / Partner Name",
            "Bill No",
            "Token / Visit Ref",
            "Patient Name",
            "Tests / Investigations Billed",
            "Bill Date",
            "Gross Amount (INR)",
            "Paid / Recovered (INR)",
            "Balance Due (INR)",
            "Aging (Days)",
            "Overdue Category"
        ];
        const partnerNames = new Set(filteredPartnerSummaries.map(p => p.partnerName));
        const relevantBills = timeFilteredBills.filter(b => partnerNames.has(b.partnerName) && !b.settledAt);
        
        let rows = [];
        if (relevantBills.length > 0) {
            rows = relevantBills.map(b => {
                const total = b.totalAmount || b.amount || 0;
                const paid = b.paidAmount || b.amountReceived || 0;
                const due = b.balanceDue !== undefined && !isNaN(b.balanceDue) ? b.balanceDue : (total - paid);
                const billDate = b.occurredAt || b.date;
                const agingDays = billDate ? Math.max(0, Math.floor((new Date() - new Date(billDate)) / (1000 * 60 * 60 * 24))) : 0;
                const tests = b.testsSummary || (b.testNames?.join('; ')) || (b.tests?.join('; ')) || 'N/A';
                return [
                    `"${(b.partnerName || '').replace(/"/g, '""')}"`,
                    `"${b.billNumber || formatCanonicalBillNo(b)}"`,
                    `"${b.token || b.visitToken || ''}"`,
                    `"${(b.patientName || '').replace(/"/g, '""')}"`,
                    `"${tests.replace(/"/g, '""')}"`,
                    `"${billDate ? new Date(billDate).toLocaleDateString() : 'N/A'}"`,
                    total,
                    paid,
                    due,
                    agingDays,
                    `"${FinanceUtils.getAgingCategory(billDate)}"`
                ];
            });
        } else {
            // Fallback to partner aging rollups if no individual bills
            rows = filteredPartnerSummaries.map(p => [
                `"${(p.partnerName || '').replace(/"/g, '""')}"`,
                `"ALL"`,
                `"ALL"`,
                `"ALL REFERRED TESTS"`,
                `"${p.oldestDueDate ? new Date(p.oldestDueDate).toLocaleDateString() : 'N/A'}"`,
                p.totalOutstanding || 0,
                0,
                p.totalOutstanding || 0,
                `"-"`,
                `"${FinanceUtils.getAgingCategory(p.oldestDueDate)}"`
            ]);
        }

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `synos_partner_receivables_with_tests_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="px-8 pt-1 pb-8 w-full space-y-4 animate-in fade-in duration-500">
            {/* Actions Bar (Aligned Right) */}
            <div className="flex items-center justify-end flex-wrap gap-2.5">
                <button
                    onClick={handleDownloadSummary}
                    disabled={filteredPartnerSummaries.length === 0}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-synos-primary text-white text-xs font-bold hover:bg-synos-primary/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    <Download size={14} />
                    <span>Download Summary ({filteredPartnerSummaries.length})</span>
                </button>

                <button
                    onClick={() => setIsPrintSummaryOpen(true)}
                    disabled={filteredPartnerSummaries.length === 0}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    <Printer size={14} />
                    <span>Print Summary</span>
                </button>
            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Outstanding</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{FinanceUtils.formatCurrency(totals.outstanding)}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">{totals.count} Open Investigation Invoices</span>
                </div>
                <div className="p-5 rounded-2xl synos-kpi-card border-rose-300 dark:border-rose-900/50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Critical Overdue (&gt;30d)</p>
                    <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{FinanceUtils.formatCurrency(totals.overdue)}</p>
                    <span className="text-[10px] text-rose-500/70 font-medium">Overdue Recovery Liabilities</span>
                </div>
                <div className="p-5 rounded-2xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active Debtors</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{filteredPartnerSummaries.length}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">Contracted Clinical Partners</span>
                </div>
            </div>

            {/* Multi-Dimensional Filters Bar */}
            <FinanceFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search partner name or account ID..."
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                statusOptions={['All', 'Critical (>30d)', 'Moderate (7-30d)', 'Recent (0-7d)']}
                doctorFilter={doctorFilter}
                onDoctorChange={setDoctorFilter}
                doctorOptions={doctorOptions}
            />

            <div className="synos-dept-card rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center text-zinc-500 animate-pulse">Reconciling partner ledgers...</div>
                ) : (
                    <table className="w-full text-left border-collapse synos-table">
                        <thead>
                            <tr className="bg-slate-50/80 dark:bg-zinc-900/80 border-b border-slate-200 dark:border-zinc-800">
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Partner / Account</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">Open Bills</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Total Outstanding</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Oldest Dues</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Aging Profile</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80 dark:divide-zinc-800/80">
                            {filteredPartnerSummaries.map((partner) => (
                                <React.Fragment key={partner.partnerId}>
                                    <tr className={`group transition-all ${expandedPartnerId === partner.partnerId ? 'bg-synos-primary/5' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/30'}`}>
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => toggleExpand(partner.partnerId)}
                                                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${expandedPartnerId === partner.partnerId ? 'bg-synos-primary text-white rotate-90' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'}`}
                                                >
                                                    <ArrowRight size={12} />
                                                </button>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold dark:text-zinc-200">{partner.partnerName}</span>
                                                    <span className="text-[10px] text-zinc-400 uppercase tracking-tighter">ID: {partner.partnerId.toString().substring(0, 8)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center text-sm font-semibold dark:text-zinc-400">{partner.billCount}</td>
                                        <td className="p-6 text-right">
                                            <div className="text-sm font-bold text-rose-500">{FinanceUtils.formatCurrency(partner.totalOutstanding)}</div>
                                        </td>
                                        <td className="p-6">
                                            <div className={`text-xs font-medium ${FinanceUtils.getAgingColor(partner.oldestDueDate)}`}>
                                                {new Date(partner.oldestDueDate).toLocaleDateString()}
                                                <span className="ml-2 opacity-50 italic">({FinanceUtils.getAgingCategory(partner.oldestDueDate)})</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex gap-1 h-1.5 w-32 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                                                <div style={{ width: `${(partner.aging_0_7 / partner.totalOutstanding) * 100}%` }} className="bg-emerald-500 h-full" />
                                                <div style={{ width: `${(partner.aging_7_30 / partner.totalOutstanding) * 100}%` }} className="bg-amber-500 h-full" />
                                                <div style={{ width: `${(partner.aging_30_Plus / partner.totalOutstanding) * 100}%` }} className="bg-rose-500 h-full" />
                                            </div>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenPartnerClaim(partner)}
                                                    disabled={generatingClaim}
                                                    title="Generate B2B Diagnostic Tax Invoice for Referral Partner"
                                                    className="px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 dark:hover:bg-indigo-900/60 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                                                >
                                                    <Receipt size={12} />
                                                    <span>B2B Invoice</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleBulkSettle(partner)}
                                                    className="px-4 py-2 rounded-xl bg-synos-primary text-white text-[10px] font-bold uppercase tracking-wider hover:shadow-lg hover:shadow-synos-primary/30 transition-all cursor-pointer"
                                                >
                                                    Bulk Settle
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedPartnerId === partner.partnerId && (() => {
                                        const partnerBills = openBills.filter(b => b.partnerName === partner.partnerName);
                                        const partnerItemIds = partnerBills.map(b => b.receivableFactId);
                                        const selectedInPartner = partnerBills.filter(b => selectedFactIds.has(b.receivableFactId));
                                        const selectedCount = selectedInPartner.length;
                                        const selectedSum = selectedInPartner.reduce((sum, b) => sum + getEffectiveBalanceDue(b), 0);
                                        const allPartnerSelected = partnerBills.length > 0 && selectedCount === partnerBills.length;

                                        return (
                                            <tr>
                                                <td colSpan="6" className="p-0 bg-zinc-50/50 dark:bg-zinc-950/50">
                                                    <div className="p-6 border-x border-b dark:border-zinc-900 border-zinc-100">
                                                        
                                                        {/* BATCH ACTION BAR */}
                                                        {selectedCount > 0 && (
                                                            <div className="flex items-center justify-between p-3.5 mb-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 animate-in fade-in duration-200">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                                                                        {selectedCount}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                                                                            {selectedCount} of {partnerBills.length} Bills Selected
                                                                        </p>
                                                                        <p className="text-[10px] text-zinc-500 font-medium">
                                                                            Total Selected Due: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">₹{selectedSum.toLocaleString()}</strong>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            const next = new Set(selectedFactIds);
                                                                            partnerItemIds.forEach(id => next.delete(id));
                                                                            setSelectedFactIds(next);
                                                                        }}
                                                                        className="px-3 py-1.5 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-[10px] font-bold cursor-pointer transition-all"
                                                                    >
                                                                        Clear Selection
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleOpenPartnerClaim(partner, selectedInPartner.map(b => b.receivableFactId))}
                                                                        disabled={generatingClaim}
                                                                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer transition-all disabled:opacity-50"
                                                                    >
                                                                        <Receipt size={13} />
                                                                        <span>Generate B2B Invoice ({selectedCount})</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleBulkSettle(partner, selectedInPartner.map(b => b.receivableFactId))}
                                                                        className="px-4 py-2 rounded-xl bg-synos-primary hover:bg-synos-primary/90 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-synos-primary/20 active:scale-95 cursor-pointer transition-all"
                                                                    >
                                                                        <span>Settle Selected ({selectedCount})</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <table className="w-full text-left">
                                                            <thead>
                                                                <tr className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 border-b dark:border-zinc-900 pb-2">
                                                                    <th className="pb-2 w-8 text-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={allPartnerSelected}
                                                                            onChange={(e) => {
                                                                                const next = new Set(selectedFactIds);
                                                                                if (e.target.checked) {
                                                                                    partnerItemIds.forEach(id => next.add(id));
                                                                                } else {
                                                                                    partnerItemIds.forEach(id => next.delete(id));
                                                                                }
                                                                                setSelectedFactIds(next);
                                                                            }}
                                                                            className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                            title={allPartnerSelected ? "Deselect all" : "Select all open bills"}
                                                                        />
                                                                    </th>
                                                                    <th className="pb-2">Bill No</th>
                                                                    <th className="pb-2">Patient</th>
                                                                    <th className="pb-2">Tests / Investigations</th>
                                                                    <th className="pb-2">Date</th>
                                                                    <th className="pb-2 text-right">Original</th>
                                                                    <th className="pb-2 text-right">Recovered</th>
                                                                    <th className="pb-2 text-right">Outstanding</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-200/80 dark:divide-zinc-800/80">
                                                                {partnerBills.map(bill => {
                                                                    const isChecked = selectedFactIds.has(bill.receivableFactId);
                                                                    return (
                                                                        <tr key={bill.receivableFactId} className={isChecked ? 'bg-indigo-50/40 dark:bg-indigo-950/30' : ''}>
                                                                            <td className="py-3 w-8 text-center">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isChecked}
                                                                                    onChange={(e) => {
                                                                                        const next = new Set(selectedFactIds);
                                                                                        if (e.target.checked) {
                                                                                            next.add(bill.receivableFactId);
                                                                                        } else {
                                                                                            next.delete(bill.receivableFactId);
                                                                                        }
                                                                                        setSelectedFactIds(next);
                                                                                    }}
                                                                                    className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                                />
                                                                            </td>
                                                                            <td className="py-3 text-[10px] font-mono font-bold">
                                                                                <div className="text-synos-primary dark:text-sky-400 font-bold">{bill.billNumber || formatCanonicalBillNo(bill)}</div>
                                                                                <div className="text-[9px] text-zinc-400 font-normal">Token: {bill.token || bill.visitToken || '-'}</div>
                                                                            </td>
                                                                            <td className="py-3 text-[10px] font-bold dark:text-zinc-300">{bill.patientName || 'Unknown Patient'}</td>
                                                                            <td className="py-3 text-[10px] text-zinc-600 dark:text-zinc-400 max-w-[220px] truncate" title={bill.testsSummary || (bill.testNames?.join(', ')) || (bill.tests?.join(', ')) || '-'}>
                                                                                {bill.testsSummary || (bill.testNames?.join(', ')) || (bill.tests?.join(', ')) || '-'}
                                                                            </td>
                                                                            <td className="py-3 text-[10px] text-zinc-400">{new Date(bill.occurredAt || bill.date).toLocaleDateString()}</td>
                                                                            <td className="py-3 text-[10px] font-bold text-right dark:text-zinc-300">₹{(bill.totalAmount || bill.amount || 0).toLocaleString()}</td>
                                                                            <td className="py-3 text-[10px] font-bold text-right text-emerald-500">₹{(bill.paidAmount || bill.amountReceived || 0).toLocaleString()}</td>
                                                                            <td className="py-3 text-[10px] font-bold text-right text-rose-500">₹{(bill.balanceDue !== undefined && !isNaN(bill.balanceDue) ? bill.balanceDue : (bill.amount || 0) - (bill.amountReceived || 0)).toLocaleString()}</td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })()}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {selectedPartner && (
                <BulkSettleModal 
                    isOpen={isBulkModalOpen}
                    onClose={() => {
                        setIsBulkModalOpen(false);
                        setSelectedBillIds([]);
                    }}
                    onConfirm={confirmBulkSettlement}
                    partnerName={selectedPartner.partnerName}
                    selectedBills={openBills.filter(b => b.partnerName === selectedPartner.partnerName && (selectedBillIds.length === 0 || selectedBillIds.includes(b.receivableFactId)))}
                />
            )}

            {/* ENTERPRISE B2B PARTNER CLAIM BILL VIEWER */}
            {isClaimDocOpen && claimDocData && (
                <CommercialDocumentViewer
                    isOpen={isClaimDocOpen}
                    onClose={() => {
                        setIsClaimDocOpen(false);
                        setClaimDocData(null);
                    }}
                    title={`B2B Diagnostic Invoice - ${claimDocData?.partner?.name || 'Partner'}`}
                    onWhatsAppShare={handleWhatsAppClaimShare}
                    defaultLetterheadMode={claimDocData?.lab?.defaultLetterheadMode || "digital"}
                    topMarginMm={claimDocData?.lab?.topMarginMm || 40}
                >
                    <DynamicDocumentRenderer slotId="partner_b2b_invoice" data={claimDocData} />
                </CommercialDocumentViewer>
            )}

            {/* A4 PRINTABLE FINANCIAL SUMMARY MODAL */}
            <FinancePrintableSummaryModal
                isOpen={isPrintSummaryOpen}
                onClose={() => setIsPrintSummaryOpen(false)}
                slotId="summary_bills_daybook"
                title="Institutional & Referral Partner Receivables Ledger"
                subtitle="B2B credit balances, aging distribution, and recovery liabilities"
                dateRangeText={presetRange === 'custom' ? `${customDates?.start || ''} to ${customDates?.end || ''}` : presetRange}
                categoryLabel="RECEIVABLES LEDGER AUDIT"
                filterTags={[
                    statusFilter !== 'All' ? `Status: ${statusFilter}` : null,
                    doctorFilter !== 'All' ? `Doctor / Referrer: ${doctorFilter}` : null,
                    searchQuery ? `Search: "${searchQuery}"` : null
                ].filter(Boolean)}
                kpis={[
                    { label: "Total Outstanding", value: `₹${totals.outstanding.toLocaleString()}`, color: "text-zinc-900", subtext: `${totals.count} Open Invoices` },
                    { label: "Critical Overdue (>30d)", value: `₹${totals.overdue.toLocaleString()}`, color: "text-rose-600", subtext: "Immediate Action Required" },
                    { label: "Debtor Partners", value: filteredPartnerSummaries.length, color: "text-indigo-600", subtext: "Referred Clinic Accounts" }
                ]}
                columns={[
                    { key: 'partnerName', label: 'Partner / Account Name' },
                    { key: 'partnerId', label: 'Account ID', render: (v) => (v || '').toString().substring(0, 10) },
                    { key: 'billCount', label: 'Open Invoices', align: 'center' },
                    { key: 'totalOutstanding', label: 'Outstanding (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'aging_0_7', label: '0-7 Days (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'aging_7_30', label: '7-30 Days (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'aging_30_Plus', label: '>30 Days Overdue (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'oldestDueDate', label: 'Oldest Due', render: (v) => v ? new Date(v).toLocaleDateString() : 'N/A' }
                ]}
                data={filteredPartnerSummaries}
                summaryTotals={{
                    totalOutstanding: `₹${totals.outstanding.toLocaleString()}`,
                    aging_30_Plus: `₹${totals.overdue.toLocaleString()}`
                }}
                secondaryTable={{
                    title: "Itemized Investigations & Clinical Partner Bills",
                    subtitle: `Complete breakdown of tests referred across ${itemizedBillsForPrint.length} open visit records`,
                    columns: [
                        { key: 'partnerName', label: 'Referring Doctor / Partner' },
                        { key: 'billNumber', label: 'Bill No' },
                        { key: 'token', label: 'Token' },
                        { key: 'patientName', label: 'Patient Name' },
                        { key: 'testsSummary', label: 'Tests / Investigations Billed' },
                        { key: 'date', label: 'Date' },
                        { key: 'totalAmount', label: 'Total (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                        { key: 'balanceDue', label: 'Balance Due (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` }
                    ],
                    data: itemizedBillsForPrint,
                    summaryTotals: {
                        totalAmount: `₹${itemizedBillsForPrint.reduce((acc, b) => acc + Number(b.totalAmount || 0), 0).toLocaleString()}`,
                        balanceDue: `₹${itemizedBillsForPrint.reduce((acc, b) => acc + Number(b.balanceDue || 0), 0).toLocaleString()}`
                    }
                }}
                onDownloadCsv={handleDownloadSummary}
            />
        </div>
    );
};

export const VisitCorrectionsScreen = () => {
    const { user } = useAuth();
    const { presetRange, customDates, isConsolidated, effectiveBranchId, isAdmin } = useGlobalFilter();
    const [corrections, setCorrections] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [shiftFilter, setShiftFilter] = useState('All'); // 'All' | 'Upward' | 'Downward' | 'Zero'

    // Details Modal State
    const [selectedCorrection, setSelectedCorrection] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    // Document Modal State
    const [docData, setDocData] = useState(null);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [loadingDoc, setLoadingDoc] = useState(false);
    const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [presetRange, isConsolidated, effectiveBranchId, customDates?.start, customDates?.end]);

    const loadData = async () => {
        try {
            setLoading(true);
            const bId = isConsolidated && isAdmin ? null : effectiveBranchId;
            const params = {
                preset: presetRange,
                branchId: bId || undefined
            };
            if (presetRange === 'custom' && customDates?.start && customDates?.end) {
                params.startDate = customDates.start;
                params.endDate = customDates.end;
            }
            const data = await FinanceApi.getVisitCorrections(params);
            setCorrections(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load visit correction audit trail:", err);
            setCorrections([]);
        } finally {
            setLoading(false);
        }
    };

    const handleViewInvoiceDoc = async (invoiceId) => {
        if (!invoiceId) return;
        try {
            setLoadingDoc(true);
            const doc = await FinanceApi.getInvoiceDocument(invoiceId);
            setDocData(doc);
            setIsDocModalOpen(true);
        } catch (err) {
            console.error("Failed to fetch tax invoice for corrected visit:", err);
        } finally {
            setLoadingDoc(false);
        }
    };

    // Filter Logic
    const filteredCorrections = useMemo(() => {
        return corrections.filter(c => {
            const diff = Number(c.differenceAmount || 0);
            if (shiftFilter === 'Upward' && diff <= 0) return false;
            if (shiftFilter === 'Downward' && diff >= 0) return false;
            if (shiftFilter === 'Zero' && diff !== 0) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchToken = (c.visitToken || '').toLowerCase().includes(q);
                const matchPatient = (c.patientName || '').toLowerCase().includes(q);
                const matchStaff = (c.createdByName || '').toLowerCase().includes(q);
                const matchReason = (c.reason || '').toLowerCase().includes(q);
                const matchPhone = (c.patientPhone || '').includes(q);
                if (!matchToken && !matchPatient && !matchStaff && !matchReason && !matchPhone) return false;
            }

            return true;
        });
    }, [corrections, shiftFilter, searchQuery]);

    const totalAmendments = filteredCorrections.length;
    const netShift = filteredCorrections.reduce((sum, c) => sum + (Number(c.differenceAmount) || 0), 0);
    const upwardCount = filteredCorrections.filter(c => Number(c.differenceAmount || 0) > 0).length;
    const downwardCount = filteredCorrections.filter(c => Number(c.differenceAmount || 0) < 0).length;

    // CSV Export
    const handleDownloadSummary = () => {
        const headers = [
            "Visit Token",
            "Correction Date",
            "Patient Name",
            "MRN",
            "Phone",
            "Facility / Branch",
            "Amended By Staff",
            "Audit Justification / Reason",
            "Previous Bill (INR)",
            "New Bill (INR)",
            "Net Difference (INR)"
        ];

        const rows = filteredCorrections.map(c => [
            `"${c.visitToken || ''}"`,
            `"${c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}"`,
            `"${(c.patientName || '').replace(/"/g, '""')}"`,
            `"${c.patientMrn || ''}"`,
            `"${c.patientPhone || ''}"`,
            `"${(c.branchName || 'Main Facility').replace(/"/g, '""')}"`,
            `"${(c.createdByName || 'Front Desk Staff').replace(/"/g, '""')}"`,
            `"${(c.reason || '').replace(/"/g, '""')}"`,
            c.previousAmount || 0,
            c.newAmount || 0,
            c.differenceAmount || 0
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Visit_Corrections_Audit_${presetRange}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Helper to parse audit payload JSON safely
    const parsePayload = (jsonStr) => {
        if (!jsonStr) return null;
        try {
            return JSON.parse(jsonStr);
        } catch {
            return null;
        }
    };

    return (
        <div className="w-full px-8 pt-1 pb-8 space-y-4">
            {/* Actions Bar (Aligned Right) */}
            <div className="flex items-center justify-end gap-2">
                <button
                    onClick={handleDownloadSummary}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Export CSV</span>
                </button>
                <button
                    onClick={() => setIsPrintSummaryOpen(true)}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                    <Printer className="w-3.5 h-3.5 text-synos-primary" />
                    <span>Print Summary</span>
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Amendments</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{totalAmendments}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">Recorded Revision Events</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-synos-primary">Net Revenue Shift</p>
                    <p className={cn("text-2xl font-black mt-1", netShift >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                        {netShift >= 0 ? `+₹${netShift.toLocaleString()}` : `-₹${Math.abs(netShift).toLocaleString()}`}
                    </p>
                    <span className="text-[10px] text-zinc-400 font-medium">Cumulative Balance Impact</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Upward Revisions</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{upwardCount}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">Tests Added / Rates Raised</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Downward / Refunds</p>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{downwardCount}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">Tests Cancelled / Rates Lowered</span>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="space-y-3 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border dark:border-zinc-800 border-zinc-200">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
                        {['All', 'Upward', 'Downward', 'Zero'].map(f => (
                            <FilterTab 
                                key={f} 
                                label={f === 'All' ? 'All Amendments' : (f === 'Upward' ? 'Value Increases (+)' : (f === 'Downward' ? 'Value Decreases (-)' : 'Zero Shift'))} 
                                isActive={shiftFilter === f} 
                                onClick={() => setShiftFilter(f)} 
                            />
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Search Input */}
                        <div className="relative min-w-[240px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Search token, patient, staff, reason..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:border-synos-primary transition-all shadow-xs"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Corrections Table */}
            <div className="rounded-2xl border dark:border-zinc-800 border-zinc-200 overflow-hidden bg-white dark:bg-zinc-900/30 shadow-xs">
                {loading ? (
                    <div className="p-16 text-center animate-pulse text-zinc-500 font-bold uppercase tracking-widest text-xs flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-synos-primary border-t-transparent rounded-full animate-spin" />
                        <span>Retrieving forensic revision log...</span>
                    </div>
                ) : filteredCorrections.length === 0 ? (
                    <div className="p-16 text-center space-y-3">
                        <CheckCircle2 className="w-10 h-10 text-zinc-400 mx-auto opacity-75" />
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">No Visit Corrections Logged</p>
                        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                            No visits have undergone post-registration amendments or test revisions for the selected time horizon.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b dark:border-zinc-800 border-zinc-200 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                                    <th className="py-3 px-4">Date & Time</th>
                                    <th className="py-3 px-4">Token & Patient</th>
                                    <th className="py-3 px-4">Facility</th>
                                    <th className="py-3 px-4">Amended By</th>
                                    <th className="py-3 px-4">Audit Justification</th>
                                    <th className="py-3 px-4 text-right">Previous → New Bill</th>
                                    <th className="py-3 px-4 text-center">Net Shift</th>
                                    <th className="py-3 px-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                                {filteredCorrections.map((c) => {
                                    const diff = Number(c.differenceAmount || 0);
                                    return (
                                        <tr key={c.correctionId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                                            <td className="py-3.5 px-4 whitespace-nowrap text-zinc-500 font-mono text-[11px]">
                                                {c.createdAt ? new Date(c.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-black/5 dark:border-white/5">
                                                        {c.visitToken}
                                                    </span>
                                                    <div>
                                                        <p className="font-bold text-zinc-900 dark:text-white leading-tight">{c.patientName}</p>
                                                        <p className="text-[11px] text-zinc-400 font-medium">
                                                            {c.patientPhone || c.patientMrn || ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 font-medium">
                                                {c.branchName || 'Main Facility'}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-bold">
                                                    <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                                    <span>{c.createdByName || 'Front Desk Staff'}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 min-w-[240px] max-w-[340px]">
                                                <p className="text-zinc-800 dark:text-zinc-200 font-medium" title={c.reason}>
                                                    {c.reason || 'Administrative visit amendment'}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                                    {Array.isArray(c.changeSummary) && c.changeSummary.length > 0 ? (
                                                        c.changeSummary.map((pill, idx) => (
                                                            <span 
                                                                key={idx}
                                                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 leading-none"
                                                            >
                                                                {pill}
                                                            </span>
                                                        ))
                                                    ) : c.referralPartnerName ? (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 leading-none">
                                                            Doctor: {c.referralPartnerName}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold">
                                                <span className="text-zinc-400 line-through mr-1.5">₹{Number(c.previousAmount || 0).toLocaleString()}</span>
                                                <span className="text-zinc-900 dark:text-white">→ ₹{Number(c.newAmount || 0).toLocaleString()}</span>
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className={cn(
                                                    "font-mono font-black text-xs px-2.5 py-0.5 rounded-full border",
                                                    diff > 0 
                                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                        : diff < 0 
                                                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                                            : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                                                )}>
                                                    {diff > 0 ? `+₹${diff.toLocaleString()}` : (diff < 0 ? `-₹${Math.abs(diff).toLocaleString()}` : "₹0")}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCorrection(c);
                                                            setIsDetailsModalOpen(true);
                                                        }}
                                                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                                    >
                                                        <FileText className="w-3 h-3 text-synos-primary" />
                                                        <span>Audit Details</span>
                                                    </button>
                                                    {c.invoiceId && (
                                                        <button
                                                            onClick={() => handleViewInvoiceDoc(c.invoiceId)}
                                                            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                                                            title="View Current Tax Invoice"
                                                        >
                                                            <Receipt className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* AUDIT DETAILS MODAL */}
            {isDetailsModalOpen && selectedCorrection && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b dark:border-zinc-800 border-zinc-200 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-synos-primary/10 flex items-center justify-center text-synos-primary">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Correction Audit Record</h3>
                                    <p className="text-[11px] text-zinc-400">Token: {selectedCorrection.visitToken} • {selectedCorrection.patientName}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDetailsModalOpen(false)}
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Top Meta Grid */}
                        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-xs">
                            <div>
                                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Amended By</span>
                                <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1 mt-0.5">
                                    <User className="w-3.5 h-3.5 text-zinc-400" />
                                    {selectedCorrection.createdByName || 'Front Desk Staff'}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Timestamp</span>
                                <span className="font-mono text-zinc-800 dark:text-zinc-200 mt-0.5 block">
                                    {new Date(selectedCorrection.createdAt).toLocaleString()}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Previous Bill</span>
                                <span className="font-mono font-bold text-zinc-600 dark:text-zinc-400 mt-0.5 block">
                                    ₹{Number(selectedCorrection.previousAmount || 0).toLocaleString()}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] text-zinc-400 uppercase font-bold block">New Bill (After Correction)</span>
                                <span className="font-mono font-bold text-zinc-900 dark:text-white mt-0.5 block">
                                    ₹{Number(selectedCorrection.newAmount || 0).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Reason / Justification */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Mandatory Audit Reason</label>
                            <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                                {selectedCorrection.reason || 'No justification entered.'}
                            </div>
                        </div>

                        {/* Dynamic Change Badges */}
                        {(() => {
                            const p = parsePayload(selectedCorrection.payloadJson);
                            const summaryList = selectedCorrection.changeSummary || p?.ChangeSummary || p?.changeSummary || [];
                            const detailedDiff = selectedCorrection.detailedDiff || p?.DetailedDiff || p?.detailedDiff;

                            return (
                                <div className="space-y-3 pt-1 border-t dark:border-zinc-800 border-zinc-200">
                                    <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Forensic Audit Diff & System Context</label>
                                    
                                    {summaryList && summaryList.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {summaryList.map((pill, idx) => {
                                                const isDoc = pill.startsWith('Doctor:');
                                                const isRec = pill.startsWith('Partner Receivable:');
                                                const isAdd = pill.startsWith('Added:');
                                                const isCancel = pill.startsWith('Cancelled:') || pill.startsWith('Removed:');
                                                const isMode = pill.startsWith('Mode:');
                                                return (
                                                    <span 
                                                        key={idx}
                                                        className={cn(
                                                            "px-2 py-1 rounded-md text-[11px] font-bold border",
                                                            isDoc ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30" :
                                                            isRec ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" :
                                                            isAdd ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" :
                                                            isCancel ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30" :
                                                            isMode ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30" :
                                                            "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                                                        )}
                                                    >
                                                        {pill}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Detailed Diff Cards */}
                                    {detailedDiff ? (
                                        <div className="space-y-2 text-xs">
                                            {detailedDiff.doctorChange && (
                                                <div className="p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-between">
                                                    <span className="font-bold text-indigo-700 dark:text-indigo-300">Referring Partner / Doctor</span>
                                                    <span className="font-mono text-zinc-800 dark:text-zinc-200">
                                                        <span className="line-through text-zinc-400 mr-1">{detailedDiff.doctorChange.previous || 'None'}</span>
                                                        <span>→ {detailedDiff.doctorChange.current || 'None'}</span>
                                                    </span>
                                                </div>
                                            )}

                                            {detailedDiff.receivableChange && (
                                                <div className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 flex items-center justify-between">
                                                    <span className="font-bold text-amber-700 dark:text-amber-300">Partner Receivable Shift</span>
                                                    <span className="font-mono font-bold">
                                                        <span className="text-zinc-400 line-through mr-1">₹{Number(detailedDiff.receivableChange.previous || 0).toLocaleString()}</span>
                                                        <span className="text-zinc-900 dark:text-white">→ ₹{Number(detailedDiff.receivableChange.current || 0).toLocaleString()}</span>
                                                        <span className={cn("ml-2 text-[10px] px-1.5 py-0.5 rounded", Number(detailedDiff.receivableChange.shift || 0) >= 0 ? "bg-emerald-500/20 text-emerald-600" : "bg-rose-500/20 text-rose-600")}>
                                                            {Number(detailedDiff.receivableChange.shift || 0) >= 0 ? `+₹${detailedDiff.receivableChange.shift}` : `-₹${Math.abs(detailedDiff.receivableChange.shift)}`}
                                                        </span>
                                                    </span>
                                                </div>
                                            )}

                                            {detailedDiff.billingModeChange && (
                                                <div className="p-2.5 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 flex items-center justify-between">
                                                    <span className="font-bold text-purple-700 dark:text-purple-300">Billing Mode</span>
                                                    <span className="font-mono text-zinc-800 dark:text-zinc-200">
                                                        <span className="line-through text-zinc-400 mr-1">{detailedDiff.billingModeChange.previous}</span>
                                                        <span>→ {detailedDiff.billingModeChange.current}</span>
                                                    </span>
                                                </div>
                                            )}

                                            {detailedDiff.addedTests && detailedDiff.addedTests.length > 0 && (
                                                <div className="p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-1">
                                                    <span className="font-bold text-emerald-700 dark:text-emerald-300 block">Tests Added:</span>
                                                    <div className="space-y-0.5">
                                                        {detailedDiff.addedTests.map((t, idx) => (
                                                            <div key={idx} className="flex justify-between text-[11px] text-zinc-800 dark:text-zinc-200">
                                                                <span>+{t.name}</span>
                                                                <span className="font-mono font-bold text-emerald-600">+₹{Number(t.price || 0).toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {detailedDiff.cancelledTests && detailedDiff.cancelledTests.length > 0 && (
                                                <div className="p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 space-y-1">
                                                    <span className="font-bold text-rose-700 dark:text-rose-300 block">Tests Cancelled / Removed:</span>
                                                    <div className="space-y-0.5">
                                                        {detailedDiff.cancelledTests.map((t, idx) => (
                                                            <div key={idx} className="flex justify-between text-[11px] text-zinc-800 dark:text-zinc-200">
                                                                <span className="line-through text-zinc-400">-{t.name}</span>
                                                                <span className="font-mono font-bold text-rose-600">-₹{Number(t.price || 0).toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {detailedDiff.demographicsChange && detailedDiff.demographicsChange.length > 0 && (
                                                <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 space-y-0.5">
                                                    <span className="font-bold text-zinc-700 dark:text-zinc-300 block">Demographics Updated:</span>
                                                    {detailedDiff.demographicsChange.map((d, idx) => (
                                                        <div key={idx} className="text-[11px] text-zinc-600 dark:text-zinc-400">
                                                            • {d}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* Fallback to raw payload actions */
                                        p && (
                                            <div className="space-y-2">
                                                {p.AddTestCodes && p.AddTestCodes.length > 0 && (
                                                    <div className="space-y-1">
                                                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Tests Added:</span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {p.AddTestCodes.map((code, idx) => (
                                                                <span key={idx} className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                                    +{code}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {p.RemoveOrderIds && p.RemoveOrderIds.length > 0 && (
                                                    <div className="space-y-1">
                                                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">Orders Cancelled / Removed:</span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {p.RemoveOrderIds.map((id, idx) => (
                                                                <span key={idx} className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 line-through">
                                                                    Order #{idx + 1}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {p.SettlementAction && (
                                                    <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                                                        <span className="text-zinc-500 font-medium">Settlement Action:</span>
                                                        <span className="font-bold text-zinc-900 dark:text-white capitalize">{p.SettlementAction}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    )}
                                </div>
                            );
                        })()}

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t dark:border-zinc-800 border-zinc-200">
                            <button
                                type="button"
                                onClick={() => setIsDetailsModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                            >
                                Close
                            </button>
                            {selectedCorrection.invoiceId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDetailsModalOpen(false);
                                        handleViewInvoiceDoc(selectedCorrection.invoiceId);
                                    }}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-synos-primary hover:bg-synos-primary/90 text-white transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                                >
                                    <Receipt className="w-3.5 h-3.5" />
                                    <span>View Current Tax Invoice</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Commercial Document Modal */}
            {isDocModalOpen && docData && (
                <CommercialDocumentViewer
                    isOpen={isDocModalOpen}
                    onClose={() => {
                        setIsDocModalOpen(false);
                        setDocData(null);
                    }}
                    title={`Patient Tax Invoice - ${docData.patient?.name || ''}`}
                    defaultLetterheadMode="digital"
                    paperSize="a4"
                >
                    <DynamicDocumentRenderer
                        slotId="patient_tax_invoice"
                        data={docData}
                        forceRefresh={true}
                    />
                </CommercialDocumentViewer>
            )}

            {/* Printable Summary Modal */}
            <FinancePrintableSummaryModal
                isOpen={isPrintSummaryOpen}
                onClose={() => setIsPrintSummaryOpen(false)}
                title="Visit Revision & Correction Audit Report"
                timeRange={presetRange}
                dateRangeText={presetRange === 'custom' ? `${customDates?.start || ''} to ${customDates?.end || ''}` : presetRange}
                columns={[
                    { key: 'visitToken', label: 'Token' },
                    { key: 'patientName', label: 'Patient Name' },
                    { key: 'createdByName', label: 'Amended By' },
                    { key: 'reason', label: 'Audit Reason' },
                    { key: 'previousAmount', label: 'Previous (₹)', align: 'right', format: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'newAmount', label: 'New (₹)', align: 'right', format: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'differenceAmount', label: 'Difference (₹)', align: 'right', format: (v) => `${Number(v || 0) >= 0 ? '+' : ''}₹${Number(v || 0).toLocaleString()}` }
                ]}
                data={filteredCorrections}
                summaryTotals={{
                    totalAmount: `Net Shift: ${netShift >= 0 ? '+' : ''}₹${netShift.toLocaleString()}`,
                    paidAmount: `${totalAmendments} Events`,
                    pendingAmount: `${upwardCount} Up / ${downwardCount} Down`
                }}
                onDownloadCsv={handleDownloadSummary}
            />
        </div>
    );
};

export const CollectionHistoryScreen = () => {
    const { presetRange, customDates, isConsolidated, effectiveBranchId, isAdmin } = useGlobalFilter();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const presetToLabel = useMemo(() => ({
        today: 'Today',
        month: 'This Month',
        quarter: 'This Quarter',
        year: 'This Year',
        all: 'All Time'
    }), []);

    // Multi-dimensional filters
    const [searchQuery, setSearchQuery] = useState('');
    const [paymentModeFilter, setPaymentModeFilter] = useState('All');
    const [sourceFilter, setSourceFilter] = useState('All');
    const [cashierFilter, setCashierFilter] = useState('All');
    const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false);

    useEffect(() => {
        loadHistory();
    }, [isConsolidated, effectiveBranchId, presetRange, customDates?.start, customDates?.end]);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const bId = isConsolidated && isAdmin ? null : effectiveBranchId;
            const start = presetRange === 'custom' ? customDates?.start : null;
            const end = presetRange === 'custom' ? customDates?.end : null;
            const data = await FinanceApi.getRevenueHistory(bId, presetRange, start, end);
            setHistory(data || []);
        } catch (err) {
            console.error("Failed to load collection history:", err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate aggregated cashier breakdown across the active time window
    const cashierSummaries = useMemo(() => {
        const map = new Map();
        history.forEach(r => {
            if (!isWithinTimeRange(r.occurredAt, presetRange, customDates)) return;

            const name = (r.cashierName || r.collectedBy || 'Staff Desk').trim();
            const role = (r.cashierRole || 'Reception Staff').trim();
            const id = r.cashierId || name;
            const existing = map.get(name) || {
                id,
                name,
                role,
                total: 0,
                count: 0,
                cash: 0,
                digital: 0,
                bank: 0
            };
            const isReversal = (r.direction || '').toLowerCase() === 'reversal';
            const rawAmt = Number(r.amount) || 0;
            const amt = isReversal ? -Math.abs(rawAmt) : rawAmt;
            existing.total += amt;
            existing.count += 1;
            const mode = (r.paymentMode || '').toLowerCase();
            if (mode.includes('cash')) existing.cash += amt;
            else if (mode.includes('upi') || mode.includes('online')) existing.digital += amt;
            else existing.bank += amt;

            map.set(name, existing);
        });
        return Array.from(map.values()).sort((a, b) => b.total - a.total);
    }, [history, presetRange, customDates]);

    const staffOptions = useMemo(() => {
        const opts = [{ value: 'All', label: `All Staff (${cashierSummaries.length})` }];
        cashierSummaries.forEach(s => {
            opts.push({
                value: s.name,
                label: `${s.name} (₹${s.total.toLocaleString()})`
            });
        });
        return opts;
    }, [cashierSummaries]);

    const filteredHistory = history.filter(row => {
        // Strict client-side date boundary verification
        if (!isWithinTimeRange(row.occurredAt, presetRange, customDates)) return false;

        // Cashier filter
        if (cashierFilter !== 'All') {
            const rowCashier = (row.cashierName || row.collectedBy || 'Staff Desk').trim();
            if (rowCashier.toLowerCase() !== cashierFilter.toLowerCase() && row.cashierId !== cashierFilter) return false;
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchBill = (row.canonicalBillNo || row.billNumber || '').toLowerCase().includes(q);
            const matchToken = (row.token || '').toLowerCase().includes(q);
            const matchPatient = (row.patientName || '').toLowerCase().includes(q);
            const matchRef = (row.sourceReferenceId || '').toLowerCase().includes(q);
            const matchNotes = (row.cleanNotes || row.notes || '').toLowerCase().includes(q);
            const matchType = (row.sourceType || '').toLowerCase().includes(q);
            const matchCashier = (row.cashierName || row.collectedBy || '').toLowerCase().includes(q);
            if (!matchBill && !matchToken && !matchPatient && !matchRef && !matchNotes && !matchType && !matchCashier) return false;
        }
        if (paymentModeFilter !== 'All') {
            const mode = (row.paymentMode || '').toLowerCase();
            if (!mode.includes(paymentModeFilter.toLowerCase())) return false;
        }
        if (sourceFilter !== 'All') {
            const src = (row.sourceType || '').toLowerCase();
            if (sourceFilter === 'Doctor Partner' && !src.includes('partner')) return false;
            if (sourceFilter === 'Counter' && (src.includes('partner') || src.includes('corporate') || src.includes('insurance'))) return false;
            if (sourceFilter === 'Corporate' && !src.includes('corporate')) return false;
            if (sourceFilter === 'Insurance' && !src.includes('insurance')) return false;
        }
        return true;
    });

    const getRowAmount = (r) => {
        const isReversal = (r.direction || '').toLowerCase() === 'reversal';
        const rawAmt = Number(r.amount) || 0;
        return isReversal ? -Math.abs(rawAmt) : rawAmt;
    };
    const totalCollected = filteredHistory.reduce((sum, r) => sum + getRowAmount(r), 0);
    const cashTotal = filteredHistory.filter(r => (r.paymentMode || '').toLowerCase().includes('cash')).reduce((sum, r) => sum + getRowAmount(r), 0);
    const digitalTotal = filteredHistory.filter(r => (r.paymentMode || '').toLowerCase().includes('upi') || (r.paymentMode || '').toLowerCase().includes('online')).reduce((sum, r) => sum + getRowAmount(r), 0);
    const bankTotal = filteredHistory.filter(r => (r.paymentMode || '').toLowerCase().includes('bank') || (r.paymentMode || '').toLowerCase().includes('card') || (r.paymentMode || '').toLowerCase().includes('transfer')).reduce((sum, r) => sum + getRowAmount(r), 0);

    // Tab-Aware CSV Download for Collection History
    const handleDownloadSummary = () => {
        const headers = ["Date & Time", "Collected By (Staff)", "Staff Role", "Source Category", "Collected Amount (INR)", "Payment Mode", "Bill Number", "Token", "Patient Name", "Audit / Notes"];
        const rows = filteredHistory.map(r => [
            `"${new Date(r.occurredAt).toLocaleString()}"`,
            `"${(r.cashierName || r.collectedBy || 'Staff Desk').replace(/"/g, '""')}"`,
            `"${(r.cashierRole || 'Reception Staff').replace(/"/g, '""')}"`,
            `"${(r.sourceType || '').replace(/"/g, '""')}"`,
            r.amount || 0,
            `"${(r.paymentMode || '').replace(/"/g, '""')}"`,
            `"${(r.canonicalBillNo || r.billNumber || '').replace(/"/g, '""')}"`,
            `"${(r.token || '').replace(/"/g, '""')}"`,
            `"${(r.patientName || '').replace(/"/g, '""')}"`,
            `"${(r.cleanNotes || r.notes || '').replace(/"/g, '""')}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `synos_collection_history_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="px-8 pt-1 pb-8 w-full space-y-4 animate-in fade-in duration-500">
            {/* Actions Bar (Aligned Right) */}
            <div className="flex items-center justify-end flex-wrap gap-2.5">
                <button
                    onClick={handleDownloadSummary}
                    disabled={filteredHistory.length === 0}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-synos-primary text-white text-xs font-bold hover:bg-synos-primary/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    <Download size={14} />
                    <span>Download Summary ({filteredHistory.length})</span>
                </button>

                <button
                    onClick={() => setIsPrintSummaryOpen(true)}
                    disabled={filteredHistory.length === 0}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    <Printer size={14} />
                    <span>Print Summary</span>
                </button>
            </div>

            {/* KPI Metric Strip (Reflects Filtered Cashier if Selected) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Collections</p>
                    <p className="text-xl font-black text-zinc-900 dark:text-white mt-1">₹{totalCollected.toLocaleString()}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">
                        {cashierFilter !== 'All' ? `${filteredHistory.length} Receipts (${cashierFilter})` : `${filteredHistory.length} Receipts Reconciled`}
                    </span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Cash Collections</p>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{cashTotal.toLocaleString()}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">Physical Intake</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-500">Digital / UPI</p>
                    <p className="text-xl font-black text-sky-600 dark:text-sky-400 mt-1">₹{digitalTotal.toLocaleString()}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">Instant Settlements</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">Bank / Card</p>
                    <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">₹{bankTotal.toLocaleString()}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">POS & Direct Transfers</span>
                </div>
            </div>

            {/* Staff Collection & Cash Drawer Breakdown (Lab Owner & Admin Oversight) */}
            {cashierSummaries.length > 0 && (
                <div className="p-4 rounded-2xl synos-dept-card space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-synos-primary/10 text-synos-primary dark:bg-synos-primary/20">
                                <UserCheck size={16} />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                                    Staff Cash Drawer & Intake Breakdown
                                </h3>
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                    Counter receipts, patient bills, and B2B settlements segmented by cashier
                                </p>
                            </div>
                        </div>
                        {cashierFilter !== 'All' && (
                            <button
                                type="button"
                                onClick={() => setCashierFilter('All')}
                                className="text-[10px] font-bold text-synos-primary hover:underline cursor-pointer flex items-center gap-1"
                            >
                                Reset to All Staff ({cashierSummaries.length})
                            </button>
                        )}
                    </div>

                    {/* Cashier Breakdown Cards Strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                        {/* All Staff Master Pill */}
                        <button
                            type="button"
                            onClick={() => setCashierFilter('All')}
                            className={cn(
                                "flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer",
                                cashierFilter === 'All'
                                    ? "bg-synos-primary/10 border-synos-primary dark:bg-synos-primary/20 shadow-xs"
                                    : "bg-white dark:bg-zinc-950/70 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                            )}
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
                                    cashierFilter === 'All'
                                        ? "bg-synos-primary text-white"
                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                                )}>
                                    ALL
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">All Staff</p>
                                    <p className="text-[10px] text-zinc-500 truncate">{cashierSummaries.length} Cashier Handlers</p>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-xs font-black text-zinc-900 dark:text-white font-mono">
                                    ₹{cashierSummaries.reduce((acc, s) => acc + s.total, 0).toLocaleString()}
                                </p>
                                <p className="text-[10px] text-zinc-500 font-mono">
                                    {cashierSummaries.reduce((acc, s) => acc + s.count, 0)} txns
                                </p>
                            </div>
                        </button>

                        {/* Individual Staff Cards */}
                        {cashierSummaries.map((staff) => {
                            const isSelected = cashierFilter.toLowerCase() === staff.name.toLowerCase() || cashierFilter === staff.id;
                            const initials = staff.name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'ST';
                            return (
                                <button
                                    key={staff.name}
                                    type="button"
                                    onClick={() => setCashierFilter(isSelected ? 'All' : staff.name)}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden",
                                        isSelected
                                            ? "bg-synos-primary/10 border-synos-primary dark:bg-synos-primary/20 shadow-xs ring-1 ring-synos-primary"
                                            : "bg-white dark:bg-zinc-950/70 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                                    )}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
                                            isSelected
                                                ? "bg-synos-primary text-white"
                                                : "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900"
                                        )}>
                                            {initials}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate" title={staff.name}>
                                                {staff.name}
                                            </p>
                                            <p className="text-[10px] text-zinc-500 truncate" title={staff.role}>
                                                {staff.role}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={cn(
                                            "text-xs font-black font-mono",
                                            isSelected ? "text-synos-primary" : "text-emerald-600 dark:text-emerald-400"
                                        )}>
                                            ₹{staff.total.toLocaleString()}
                                        </p>
                                        <div className="flex items-center gap-1 justify-end text-[9px] text-zinc-400 font-mono">
                                            <span>{staff.count} rpts</span>
                                            {staff.cash > 0 && <span className="text-emerald-500 font-semibold">• ₹{staff.cash} C</span>}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Multi-Dimensional Filters Bar */}
            <FinanceFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search cashier, patient, bill, reference, or notes..."
                statusFilter={sourceFilter}
                onStatusChange={setSourceFilter}
                statusOptions={['All', 'Counter', 'Doctor Partner', 'Corporate', 'Insurance']}
                categoryFilter={paymentModeFilter}
                onCategoryChange={setPaymentModeFilter}
                categoryOptions={['All', 'Cash', 'UPI', 'BankTransfer', 'Card']}
                staffFilter={cashierFilter}
                onStaffChange={setCashierFilter}
                staffOptions={staffOptions}
            />

            {/* Collection History Table */}
            <div className="synos-dept-card rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center text-zinc-500 animate-pulse">Scanning history facts...</div>
                ) : (
                    <table className="w-full text-left synos-table">
                        <thead>
                            <tr className="bg-slate-50/80 dark:bg-zinc-900/50 border-b dark:border-zinc-800 border-slate-300">
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Date & Time</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Collected By</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Source Category</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Amount</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">Payment Mode</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Bill Number / Patient</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Audit / Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80 dark:divide-zinc-800/80">
                            {filteredHistory.map((row) => (
                                <tr key={row.revenueFactId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                                    <td className="p-4 text-xs text-zinc-500 font-mono whitespace-nowrap">{formatDateCompact(row.occurredAt)}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 max-w-[170px]">
                                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-center font-bold text-[9px] shrink-0 border border-slate-300 dark:border-zinc-700">
                                                {(row.cashierName || row.collectedBy || 'SD').split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate" title={row.cashierName || row.collectedBy || 'Staff Desk'}>
                                                    {row.cashierName || row.collectedBy || 'Staff Desk'}
                                                </span>
                                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium truncate" title={row.cashierRole || 'Reception Staff'}>
                                                    {row.cashierRole || 'Reception Staff'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs font-bold dark:text-zinc-200 uppercase tracking-tighter text-synos-primary">
                                        {row.sourceType === 'Partner' && row.notes?.includes('Partner:') 
                                            ? row.notes.split('|')[0].replace('Partner:', '').trim()
                                            : FinanceUtils.mapRevenueSource(row.sourceType)}
                                    </td>
                                    <td className="p-4 text-xs font-bold text-right dark:text-zinc-300">
                                        {(() => {
                                            const displayAmt = getRowAmount(row);
                                            return (
                                                <span className={displayAmt < 0 ? "text-rose-500 font-mono" : "text-emerald-600 dark:text-emerald-400 font-mono"}>
                                                    {displayAmt < 0 ? `-₹${Math.abs(displayAmt).toLocaleString()}` : `₹${displayAmt.toLocaleString()}`}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                                            {FinanceUtils.mapPaymentMode(row.paymentMode)}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-0.5 max-w-[220px]">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-mono font-bold text-xs text-synos-primary">
                                                    {row.canonicalBillNo || formatCanonicalBillNo(row) || row.billNumber || '—'}
                                                </span>
                                                {row.token && (
                                                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded border border-zinc-200 dark:border-zinc-700">
                                                        {row.token}
                                                    </span>
                                                )}
                                            </div>
                                            {row.patientName && (
                                                <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium truncate" title={row.patientName}>
                                                    {row.patientName}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs text-zinc-600 dark:text-zinc-400">
                                        <span className="line-clamp-2" title={row.cleanNotes || row.notes}>
                                            {row.cleanNotes || (row.notes && !row.notes.includes('-') ? row.notes : (row.sourceType === 'Partner' ? 'B2B Partner Settlement' : 'Patient Visit Collection'))}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filteredHistory.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-zinc-500 text-sm italic">No collection history found for the selected period.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* A4 PRINTABLE FINANCIAL SUMMARY MODAL */}
            <FinancePrintableSummaryModal
                isOpen={isPrintSummaryOpen}
                onClose={() => setIsPrintSummaryOpen(false)}
                slotId="summary_bills_daybook"
                title="Revenue Collection & Cashier Receipts Ledger"
                subtitle="Itemized settlement audit trail across counter, digital, and institutional receipts"
                dateRangeText={presetRange === 'custom' ? `${customDates?.start || ''} to ${customDates?.end || ''}` : presetRange}
                categoryLabel="COLLECTION AUDIT TRAIL"
                filterTags={[
                    cashierFilter !== 'All' ? `Cashier: ${cashierFilter}` : null,
                    sourceFilter !== 'All' ? `Source: ${sourceFilter}` : null,
                    paymentModeFilter !== 'All' ? `Mode: ${paymentModeFilter}` : null,
                    searchQuery ? `Search: "${searchQuery}"` : null
                ].filter(Boolean)}
                kpis={[
                    { label: "Total Collections", value: `₹${totalCollected.toLocaleString()}`, color: "text-zinc-900", subtext: `${filteredHistory.length} Receipts` },
                    { label: "Cash Collections", value: `₹${cashTotal.toLocaleString()}`, color: "text-emerald-600", subtext: "Physical Currency" },
                    { label: "Digital / UPI", value: `₹${digitalTotal.toLocaleString()}`, color: "text-sky-600", subtext: "Instant Settlements" },
                    { label: "Bank / POS", value: `₹${bankTotal.toLocaleString()}`, color: "text-purple-600", subtext: "Direct Transfers" }
                ]}
                columns={[
                    { key: 'occurredAt', label: 'Date & Time', render: (v) => formatDateCompact(v) },
                    { key: 'cashierName', label: 'Collected By', render: (v, r) => `${r.cashierName || r.collectedBy || 'Staff Desk'} (${r.cashierRole || 'Staff'})` },
                    { key: 'sourceType', label: 'Source Category', render: (v, r) => r.sourceType === 'Partner' && r.notes?.includes('Partner:') ? r.notes.split('|')[0].replace('Partner:', '').trim() : (v || 'Counter') },
                    { key: 'amount', label: 'Collected (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'paymentMode', label: 'Payment Mode', align: 'center', render: (v) => v || 'Cash' },
                    { key: 'sourceReferenceId', label: 'Ref / Fact ID', render: (v) => (v || '').toString().substring(0, 12) },
                    { key: 'notes', label: 'Notes / Attendant', render: (v) => v || '-' }
                ]}
                data={filteredHistory}
                summaryTotals={{
                    amount: `₹${totalCollected.toLocaleString()}`
                }}
                onDownloadCsv={handleDownloadSummary}
            />
        </div>
    );
};

export const CancellationsRefundsScreen = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { presetRange, customDates, isConsolidated, effectiveBranchId, isAdmin } = useGlobalFilter();
    const [cancellations, setCancellations] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [refundFilter, setRefundFilter] = useState('All'); // 'All' | 'WithRefund' | 'WithoutRefund'

    // Details Modal State
    const [selectedCancellation, setSelectedCancellation] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false);
    const [disburseModalCancellation, setDisburseModalCancellation] = useState(null);

    useEffect(() => {
        loadData();
    }, [presetRange, isConsolidated, effectiveBranchId, customDates?.start, customDates?.end]);

    const loadData = async () => {
        try {
            setLoading(true);
            const bId = isConsolidated && isAdmin ? null : effectiveBranchId;
            const params = {
                preset: presetRange,
                branchId: bId || undefined
            };
            if (presetRange === 'custom' && customDates?.start && customDates?.end) {
                params.startDate = customDates.start;
                params.endDate = customDates.end;
            }
            const data = await FinanceApi.getVisitCancellations(params);
            setCancellations(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load visit cancellations audit feed:", err);
            setCancellations([]);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredCancellations = useMemo(() => {
        return cancellations.filter(c => {
            const hasRef = Number(c.refundedAmount || 0) > 0;
            const pendingDue = Number(c.balancePendingRefund || 0);
            const isPending = pendingDue > 0 || c.refundStatus === 'Pending' || c.refundStatus === 'PartiallySettled';

            if (refundFilter === 'PendingRefund' && !isPending) return false;
            if (refundFilter === 'WithRefund' && !hasRef) return false;
            if (refundFilter === 'WithoutRefund' && (hasRef || isPending)) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchToken = (c.visitToken || '').toLowerCase().includes(q);
                const matchPatient = (c.patientName || '').toLowerCase().includes(q);
                const matchStaff = (c.cancelledByName || '').toLowerCase().includes(q);
                const matchReason = (c.reason || '').toLowerCase().includes(q);
                const matchNotes = (c.notes || '').toLowerCase().includes(q);
                const matchPhone = (c.patientPhone || '').includes(q);
                if (!matchToken && !matchPatient && !matchStaff && !matchReason && !matchNotes && !matchPhone) return false;
            }

            return true;
        });
    }, [cancellations, refundFilter, searchQuery]);

    const totalCancelled = filteredCancellations.length;
    const totalRefunded = filteredCancellations.reduce((sum, c) => sum + (Number(c.refundedAmount) || 0), 0);
    const totalBilled = filteredCancellations.reduce((sum, c) => sum + (Number(c.totalBilled) || 0), 0);
    const withRefundCount = cancellations.filter(c => Number(c.refundedAmount || 0) > 0).length;
    const pendingRefundCount = cancellations.filter(c => Number(c.balancePendingRefund || 0) > 0 || c.refundStatus === 'Pending' || c.refundStatus === 'PartiallySettled').length;
    const totalPendingAmount = cancellations.reduce((sum, c) => sum + Number(c.balancePendingRefund || 0), 0);

    // CSV Export
    const handleDownloadSummary = () => {
        const headers = [
            "Visit Token",
            "Cancellation Date",
            "Patient Name",
            "MRN",
            "Phone",
            "Facility / Branch",
            "Cancelled By Staff",
            "Cancellation Reason",
            "Administrative Notes",
            "Original Bill (INR)",
            "Refunded Amount (INR)",
            "Refund Method"
        ];

        const rows = filteredCancellations.map(c => [
            `"${c.visitToken || ''}"`,
            `"${c.cancelledAt ? new Date(c.cancelledAt).toLocaleString() : ''}"`,
            `"${(c.patientName || '').replace(/"/g, '""')}"`,
            `"${c.patientMrn || ''}"`,
            `"${c.patientPhone || ''}"`,
            `"${(c.branchName || 'Main Facility').replace(/"/g, '""')}"`,
            `"${(c.cancelledByName || 'Front Desk Staff').replace(/"/g, '""')}"`,
            `"${(c.reason || '').replace(/"/g, '""')}"`,
            `"${(c.notes || '').replace(/"/g, '""')}"`,
            c.totalBilled || 0,
            c.refundedAmount || 0,
            `"${c.refundMethod || 'None'}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Visit_Cancellations_Refunds_${presetRange}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="w-full px-8 pt-1 pb-8 space-y-4">
            {/* Actions Bar (Aligned Right) */}
            <div className="flex items-center justify-end gap-2">
                <button
                    onClick={() => navigate('/finance/revenue/refunds')}
                    className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold text-amber-700 dark:text-amber-400 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    title="Open Change Due & Patient Refunds Terminal"
                >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Change Due & Refunds {pendingRefundCount > 0 ? `(${pendingRefundCount} Due)` : ''}</span>
                </button>
                <button
                    onClick={handleDownloadSummary}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Export CSV</span>
                </button>
                <button
                    onClick={() => setIsPrintSummaryOpen(true)}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                    <Printer className="w-3.5 h-3.5 text-synos-primary" />
                    <span>Print Summary</span>
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Cancellations</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{totalCancelled}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">Voided Patient Registrations</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Total Refunds Issued</p>
                    <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">₹{totalRefunded.toLocaleString()}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">Outbound Customer Settlements</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Visits with Refund</p>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{withRefundCount}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">Paid Prior to Cancellation</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Gross Billed Voided</p>
                    <p className="text-2xl font-black text-zinc-600 dark:text-zinc-300 mt-1">₹{totalBilled.toLocaleString()}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">Gross Reversed Volume</span>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="space-y-3 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border dark:border-zinc-800 border-zinc-200">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
                        {['All', 'PendingRefund', 'WithRefund', 'WithoutRefund'].map(f => (
                            <FilterTab 
                                key={f} 
                                label={f === 'All' ? 'All Cancellations' : (f === 'PendingRefund' ? 'Pending Refund Later' : (f === 'WithRefund' ? 'Refunds Issued' : 'Zero Refund / Unpaid'))} 
                                count={f === 'All' ? cancellations.length : (f === 'PendingRefund' ? pendingRefundCount : (f === 'WithRefund' ? withRefundCount : (cancellations.length - (withRefundCount + pendingRefundCount))))} 
                                isActive={refundFilter === f} 
                                onClick={() => setRefundFilter(f)} 
                            />
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search token, patient, reason, staff..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:border-synos-primary transition-all shadow-xs"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Cancellations Table */}
            <div className="rounded-2xl border dark:border-zinc-800 border-zinc-200 overflow-hidden bg-white dark:bg-zinc-900/30 shadow-xs">
                {loading ? (
                    <div className="p-16 text-center animate-pulse text-zinc-500 font-bold uppercase tracking-widest text-xs flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
                        <span>Retrieving cancellation records...</span>
                    </div>
                ) : filteredCancellations.length === 0 ? (
                    <div className="p-16 text-center space-y-3">
                        <CheckCircle2 className="w-10 h-10 text-zinc-400 mx-auto opacity-75" />
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">No Cancelled Visits Logged</p>
                        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                            No visits have been cancelled or refunded for the selected period.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b dark:border-zinc-800 border-zinc-200 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                                    <th className="py-3 px-4">Date & Time</th>
                                    <th className="py-3 px-4">Token & Patient</th>
                                    <th className="py-3 px-4">Facility</th>
                                    <th className="py-3 px-4">Cancelled By</th>
                                    <th className="py-3 px-4">Cancellation Reason & Notes</th>
                                    <th className="py-3 px-4 text-right">Gross Billed</th>
                                    <th className="py-3 px-4 text-right">Refund Amount</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                                {filteredCancellations.map((c) => {
                                    const hasRefund = Number(c.refundedAmount || 0) > 0;
                                    return (
                                        <tr key={c.cancelId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                                            <td className="py-3.5 px-4 whitespace-nowrap text-zinc-500 font-mono text-[11px]">
                                                {c.cancelledAt ? new Date(c.cancelledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-black/5 dark:border-white/5">
                                                        {c.visitToken}
                                                    </span>
                                                    <div>
                                                        <p className="font-bold text-zinc-900 dark:text-white leading-tight">{c.patientName}</p>
                                                        <p className="text-[11px] text-zinc-400 font-medium">
                                                            {c.patientPhone || c.patientMrn || ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 font-medium">
                                                {c.branchName || 'Main Facility'}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-bold">
                                                    <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                                    <span>{c.cancelledByName || 'Staff Desk'}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 min-w-[220px] max-w-[320px]">
                                                <p className="text-zinc-800 dark:text-zinc-200 font-medium" title={c.reason}>
                                                    {c.reason || 'Patient cancelled visit'}
                                                </p>
                                                {c.notes && (
                                                    <p className="text-[11px] text-zinc-400 italic mt-0.5 truncate" title={c.notes}>
                                                        Note: {c.notes}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-zinc-500 line-through">
                                                ₹{Number(c.totalBilled || 0).toLocaleString()}
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-black">
                                                {hasRefund ? (
                                                    <span className="text-rose-600 dark:text-rose-400">
                                                        -₹{Number(c.refundedAmount || 0).toLocaleString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-400 font-normal">₹0</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                {Number(c.balancePendingRefund || 0) > 0 ? (
                                                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25">
                                                        ₹{Number(c.balancePendingRefund).toLocaleString()} Due
                                                    </span>
                                                ) : hasRefund ? (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
                                                        Refunded
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider bg-zinc-500/10 text-zinc-500 border-zinc-500/20">
                                                        Cancelled
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCancellation(c);
                                                            setIsDetailsModalOpen(true);
                                                        }}
                                                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                                    >
                                                        <FileText className="w-3 h-3 text-rose-500" />
                                                        <span>Audit</span>
                                                    </button>
                                                    {Number(c.balancePendingRefund || 0) > 0 && (
                                                        <button
                                                            onClick={() => setDisburseModalCancellation(c)}
                                                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                                            title="Disburse Remaining Refund"
                                                        >
                                                            <Coins className="w-3 h-3" />
                                                            <span>Disburse</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* AUDIT DETAILS MODAL */}
            {isDetailsModalOpen && selectedCancellation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b dark:border-zinc-800 border-zinc-200 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                                    <Ban className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Cancellation Audit Particulars</h3>
                                    <p className="text-[11px] text-zinc-400">Token: {selectedCancellation.visitToken} • {selectedCancellation.patientName}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDetailsModalOpen(false)}
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Top Meta Grid */}
                        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-xs">
                            <div>
                                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Cancelled By</span>
                                <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1 mt-0.5">
                                    <User className="w-3.5 h-3.5 text-zinc-400" />
                                    {selectedCancellation.cancelledByName || 'Staff Desk'}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Timestamp</span>
                                <span className="font-mono text-zinc-800 dark:text-zinc-200 mt-0.5 block">
                                    {new Date(selectedCancellation.cancelledAt).toLocaleString()}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Original Billed</span>
                                <span className="font-mono font-bold text-zinc-500 line-through mt-0.5 block">
                                    ₹{Number(selectedCancellation.totalBilled || 0).toLocaleString()}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] text-rose-500 uppercase font-bold block">Refund Settled</span>
                                <span className="font-mono font-black text-rose-600 dark:text-rose-400 mt-0.5 block">
                                    ₹{Number(selectedCancellation.refundedAmount || 0).toLocaleString()} ({selectedCancellation.refundMethod || 'Cash'})
                                </span>
                            </div>
                        </div>

                        {/* Reason / Justification */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Cancellation Reason</label>
                            <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                {selectedCancellation.reason || 'Patient cancelled visit.'}
                            </div>
                        </div>

                        {selectedCancellation.notes && (
                            <div className="space-y-1">
                                <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Administrative Notes</label>
                                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
                                    {selectedCancellation.notes}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t dark:border-zinc-800 border-zinc-200">
                            <button
                                type="button"
                                onClick={() => setIsDetailsModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DISBURSE REFUND MODAL */}
            {disburseModalCancellation && (
                <FinanceDisburseRefundModal
                    cancellation={disburseModalCancellation}
                    onClose={() => setDisburseModalCancellation(null)}
                    onSuccess={() => {
                        setDisburseModalCancellation(null);
                        loadData();
                    }}
                />
            )}

            {/* A4 PRINTABLE FINANCIAL SUMMARY MODAL */}
            <FinancePrintableSummaryModal
                isOpen={isPrintSummaryOpen}
                onClose={() => setIsPrintSummaryOpen(false)}
                slotId="summary_cancellations_daybook"
                title="Cancelled Visits & Customer Refunds Ledger"
                subtitle="Forensic settlement ledger of all revoked orders, visit voidings, and cash/digital refunds"
                dateRangeText={presetRange === 'custom' ? `${customDates?.start || ''} to ${customDates?.end || ''}` : presetRange}
                categoryLabel="CANCELLATION & REFUND AUDIT"
                filterTags={[
                    refundFilter !== 'All' ? `Refunds: ${refundFilter}` : null,
                    searchQuery ? `Search: "${searchQuery}"` : null
                ].filter(Boolean)}
                kpis={[
                    { label: "Total Cancellations", value: totalCancelled.toString(), color: "text-zinc-900", subtext: "Revoked Visits" },
                    { label: "Total Refunds", value: `₹${totalRefunded.toLocaleString()}`, color: "text-rose-600", subtext: "Outbound Settled" },
                    { label: "With Refunds", value: withRefundCount.toString(), color: "text-amber-600", subtext: "Pre-collected Visits" },
                    { label: "Voided Gross", value: `₹${totalBilled.toLocaleString()}`, color: "text-zinc-600", subtext: "Cancelled Billed Volume" }
                ]}
                columns={[
                    { key: 'cancelledAt', label: 'Date & Time', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
                    { key: 'visitToken', label: 'Token', render: (v) => v || '—' },
                    { key: 'patientName', label: 'Patient Name', render: (v) => v || 'Direct Patient' },
                    { key: 'reason', label: 'Reason', render: (v) => v || '-' },
                    { key: 'cancelledByName', label: 'Cancelled By', render: (v) => v || 'Staff Desk' },
                    { key: 'totalBilled', label: 'Billed (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'refundedAmount', label: 'Refunded (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` }
                ]}
                data={filteredCancellations}
                summaryTotals={{
                    totalBilled: `₹${totalBilled.toLocaleString()}`,
                    refundedAmount: `₹${totalRefunded.toLocaleString()}`
                }}
                onDownloadCsv={handleDownloadSummary}
            />
        </div>
    );
};

// =========================================================================
// 8. REFUND CLAIMS TERMINAL & LIABILITIES SCREEN
// =========================================================================
export const RefundClaimsTerminalScreen = () => {
    const { user } = useAuth();
    const { presetRange, customDates, isConsolidated, effectiveBranchId, isAdmin } = useGlobalFilter();
    const [cancellations, setCancellations] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('Pending'); // 'Pending' | 'All' | 'Settled'
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [disburseModalClaim, setDisburseModalClaim] = useState(null);
    const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [presetRange, isConsolidated, effectiveBranchId, customDates?.start, customDates?.end]);

    const loadData = async () => {
        try {
            setLoading(true);
            const bId = isConsolidated && isAdmin ? null : effectiveBranchId;
            const params = {
                preset: presetRange,
                branchId: bId || undefined
            };
            if (presetRange === 'custom' && customDates?.start && customDates?.end) {
                params.startDate = customDates.start;
                params.endDate = customDates.end;
            }
            const data = await FinanceApi.getVisitCancellations(params);
            setCancellations(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load refund claims feed:", err);
            setCancellations([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredClaims = useMemo(() => {
        return cancellations.filter(c => {
            const pendingDue = Number(c.balancePendingRefund || 0);
            const isPending = pendingDue > 0 || c.refundStatus === 'Pending' || c.refundStatus === 'PartiallySettled';
            const isSettled = !isPending && (Number(c.refundedAmount || 0) > 0 || c.refundStatus === 'Settled');

            if (statusFilter === 'Pending' && !isPending) return false;
            if (statusFilter === 'Settled' && !isSettled) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchToken = (c.visitToken || '').toLowerCase().includes(q);
                const matchPatient = (c.patientName || '').toLowerCase().includes(q);
                const matchStaff = (c.cancelledByName || '').toLowerCase().includes(q);
                const matchPhone = (c.patientPhone || '').includes(q);
                const matchReceipt = (c.settlementReceiptNo || '').toLowerCase().includes(q);
                if (!matchToken && !matchPatient && !matchStaff && !matchPhone && !matchReceipt) return false;
            }

            return true;
        });
    }, [cancellations, statusFilter, searchQuery]);

    // KPI Metrics
    const totalPendingLiability = useMemo(() => {
        return cancellations.reduce((sum, c) => sum + Number(c.balancePendingRefund || 0), 0);
    }, [cancellations]);

    const totalDisbursed = useMemo(() => {
        return cancellations.reduce((sum, c) => sum + Number(c.refundedAmount || 0), 0);
    }, [cancellations]);

    const pendingClaimsCount = useMemo(() => {
        return cancellations.filter(c => Number(c.balancePendingRefund || 0) > 0 || c.refundStatus === 'Pending' || c.refundStatus === 'PartiallySettled').length;
    }, [cancellations]);

    const settledClaimsCount = useMemo(() => {
        return cancellations.filter(c => Number(c.refundedAmount || 0) > 0 && Number(c.balancePendingRefund || 0) <= 0).length;
    }, [cancellations]);

    const handleDownloadCsv = () => {
        const headers = [
            "Visit Token",
            "Cancelled Date",
            "Patient Name",
            "MRN",
            "Phone",
            "Gross Billed",
            "Amount Paid",
            "Refunded So Far",
            "Pending Refund Due",
            "Refund Status",
            "Payment Method",
            "Settled Receipt No",
            "Cancelled By"
        ];

        const rows = filteredClaims.map(c => [
            `"${c.visitToken || ''}"`,
            `"${c.cancelledAt ? new Date(c.cancelledAt).toLocaleString() : ''}"`,
            `"${(c.patientName || '').replace(/"/g, '""')}"`,
            `"${c.patientMrn || ''}"`,
            `"${c.patientPhone || ''}"`,
            c.totalBilled || 0,
            c.totalAmountPaid || 0,
            c.refundedAmount || 0,
            c.balancePendingRefund || 0,
            `"${c.refundStatus || 'Pending'}"`,
            `"${c.refundMethod || 'Cash'}"`,
            `"${c.settlementReceiptNo || ''}"`,
            `"${(c.cancelledByName || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Refund_Claims_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="w-full px-8 pt-1 pb-8 space-y-4">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        Change Due & Patient Refunds Terminal
                        <span className="text-xs font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            #POS-REFUNDS
                        </span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                        Settle counter drawer change due, process visit cancellation claims, and print settlement slips.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownloadCsv}
                        className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Export Claims</span>
                    </button>
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 cursor-pointer"
                        title="Refresh Claims Feed"
                    >
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl synos-kpi-card border border-amber-500/20 bg-amber-500/5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Outstanding Refund Liability</p>
                    <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">₹{totalPendingLiability.toLocaleString()}</p>
                    <span className="text-[10px] text-amber-600/80 font-medium">{pendingClaimsCount} Patients Awaiting Settle</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Disbursed Outbound</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{totalDisbursed.toLocaleString()}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">{settledClaimsCount} Claims Settled</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Claims</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{cancellations.length}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">Recorded Visit Revocations</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Settlement Health</p>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                        {cancellations.length > 0 ? `${Math.round((settledClaimsCount / cancellations.length) * 100)}%` : '100%'}
                    </p>
                    <span className="text-[10px] text-zinc-400 font-medium">Claims Fully Cleared</span>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="space-y-3 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border dark:border-zinc-800 border-zinc-200">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
                        {[
                            { id: 'Pending', label: 'Pending Liabilities Due', count: pendingClaimsCount },
                            { id: 'All', label: 'All Refund Claims', count: cancellations.length },
                            { id: 'Settled', label: 'Fully Disbursed', count: settledClaimsCount }
                        ].map(f => (
                            <FilterTab 
                                key={f.id} 
                                label={f.label} 
                                count={f.count} 
                                isActive={statusFilter === f.id} 
                                onClick={() => setStatusFilter(f.id)} 
                            />
                        ))}
                    </div>

                    <div className="relative flex-1 sm:w-72">
                        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search token, patient name, phone, MRN..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:border-synos-primary transition-all shadow-xs"
                        />
                    </div>
                </div>
            </div>

            {/* Claims Table */}
            <div className="rounded-2xl border dark:border-zinc-800 border-zinc-200 overflow-hidden bg-white dark:bg-zinc-900/30 shadow-xs">
                {loading ? (
                    <div className="p-16 text-center animate-pulse text-zinc-500 font-bold uppercase tracking-widest text-xs flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <span>Loading refund claims journal...</span>
                    </div>
                ) : filteredClaims.length === 0 ? (
                    <div className="p-16 text-center space-y-3">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-75" />
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">Zero Outstanding Refund Claims</p>
                        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                            All patient refund liabilities for this period are fully disbursed and settled.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b dark:border-zinc-800 border-zinc-200 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                                    <th className="py-3 px-4">Claim Date</th>
                                    <th className="py-3 px-4">Token & Patient</th>
                                    <th className="py-3 px-4">Facility</th>
                                    <th className="py-3 px-4 text-right">Gross Billed</th>
                                    <th className="py-3 px-4 text-right">Disbursed</th>
                                    <th className="py-3 px-4 text-right">Balance Due</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                                {filteredClaims.map((c) => {
                                    const pendingDue = Number(c.balancePendingRefund || 0);
                                    const isPending = pendingDue > 0 || c.refundStatus === 'Pending' || c.refundStatus === 'PartiallySettled';

                                    return (
                                        <tr key={c.cancelId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                                            <td className="py-3.5 px-4 whitespace-nowrap text-zinc-500 font-mono text-[11px]">
                                                {c.cancelledAt ? new Date(c.cancelledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-black/5 dark:border-white/5">
                                                        #{c.visitToken}
                                                    </span>
                                                    <div>
                                                        <p className="font-bold text-zinc-900 dark:text-white leading-tight">{c.patientName}</p>
                                                        <p className="text-[11px] text-zinc-400 font-medium">
                                                            {c.patientPhone || c.patientMrn || ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 font-medium">
                                                {c.branchName || 'Main Lab'}
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-medium text-zinc-500 line-through">
                                                ₹{Number(c.totalBilled || 0).toLocaleString()}
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-rose-600 dark:text-rose-400">
                                                ₹{Number(c.refundedAmount || 0).toLocaleString()}
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-black">
                                                {pendingDue > 0 ? (
                                                    <span className="text-amber-600 dark:text-amber-400 text-sm">
                                                        ₹{pendingDue.toLocaleString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-emerald-600 font-bold">₹0.00</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                {isPending ? (
                                                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25">
                                                        Refund Due
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                                        Settled
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {isPending ? (
                                                        <button
                                                            onClick={() => setDisburseModalClaim(c)}
                                                            className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
                                                        >
                                                            <Coins className="w-3.5 h-3.5" />
                                                            <span>Disburse Refund</span>
                                                        </button>
                                                    ) : (
                                                        <span className="text-[11px] font-mono text-slate-400">
                                                            {c.settlementReceiptNo || 'Cleared'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Disburse Modal */}
            {disburseModalClaim && (
                <FinanceDisburseRefundModal
                    cancellation={disburseModalClaim}
                    onClose={() => setDisburseModalClaim(null)}
                    onSuccess={() => {
                        setDisburseModalClaim(null);
                        loadData();
                    }}
                />
            )}
        </div>
    );
};

// =========================================================================
// 9. CASH DRAWER SHIFT LEDGERS SCREEN
// =========================================================================
export const CashDrawerLedgersScreen = () => {
    const { user } = useAuth();
    const { presetRange, customDates, isConsolidated, effectiveBranchId, isAdmin } = useGlobalFilter();

    const [cashiers, setCashiers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [useCustomSingleDate, setUseCustomSingleDate] = useState(false);
    const [ledgerData, setLedgerData] = useState(null);
    const [ledgerError, setLedgerError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All'); // 'All' | 'Inflows' | 'Outflows' | 'Refunds'
    const [searchQuery, setSearchQuery] = useState('');
    const [isPrintSlipOpen, setIsPrintSlipOpen] = useState(false);

    // 1. Load active cashiers/staff
    useEffect(() => {
        loadCashiers();
    }, [effectiveBranchId]);

    const loadCashiers = async () => {
        try {
            const bId = isConsolidated && isAdmin ? null : effectiveBranchId;
            const history = await FinanceApi.getRevenueHistory(bId, 'today').catch(() => []);
            const map = new Map();
            if (user?.id) {
                map.set(user.id, { id: user.id, name: user.name || user.username || "My Drawer", role: "Current Cashier" });
            }
            (history || []).forEach(r => {
                if (r.cashierId) {
                    map.set(r.cashierId, {
                        id: r.cashierId,
                        name: r.cashierName || r.collectedBy || "Cashier",
                        role: r.cashierRole || "Staff Desk"
                    });
                }
            });
            const list = Array.from(map.values());
            setCashiers(list);
            if (!selectedUserId && list.length > 0) {
                setSelectedUserId(list[0].id);
            }
        } catch (err) {
            console.error("Failed to load cashiers list:", err);
        }
    };

    // 2. Load Drawer Ledger for selected cashier and date/range
    useEffect(() => {
        loadLedger();
    }, [selectedUserId, selectedDate, useCustomSingleDate, presetRange, customDates, isConsolidated, effectiveBranchId]);

    const loadLedger = async () => {
        try {
            setLoading(true);
            setLedgerError(null);
            const bId = isConsolidated && isAdmin ? undefined : (effectiveBranchId || undefined);
            const data = await FinanceApi.getMyCashDrawerLedger({
                userId: selectedUserId || undefined,
                branchId: bId,
                isConsolidated: isConsolidated && isAdmin,
                date: useCustomSingleDate ? selectedDate : undefined,
                preset: !useCustomSingleDate ? presetRange : undefined,
                startDate: (!useCustomSingleDate && customDates?.from) ? (customDates.from instanceof Date ? customDates.from.toISOString() : customDates.from) : undefined,
                endDate: (!useCustomSingleDate && customDates?.to) ? (customDates.to instanceof Date ? customDates.to.toISOString() : customDates.to) : undefined,
            });
            setLedgerData(data);
        } catch (err) {
            console.error("Failed to load shift cash ledger:", err);
            setLedgerError(err.message || "Failed to load cash drawer shift ledger");
            setLedgerData(null);
        } finally {
            setLoading(false);
        }
    };

    const transactions = ledgerData?.transactions || [];

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (filter === 'Inflows' && t.category !== 'Inflow') return false;
            if (filter === 'Outflows' && t.category !== 'Outflow') return false;
            if (filter === 'Refunds' && t.type !== 'PATIENT_REFUND') return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const refMatch = (t.referenceNo || '').toLowerCase().includes(q);
                const tokenMatch = (t.token || '').toLowerCase().includes(q);
                const partMatch = (t.particulars || '').toLowerCase().includes(q);
                const notesMatch = (t.notes || '').toLowerCase().includes(q);
                if (!refMatch && !tokenMatch && !partMatch && !notesMatch) return false;
            }

            return true;
        });
    }, [transactions, filter, searchQuery]);

    const handleDownloadCsv = () => {
        const headers = [
            "Time",
            "Reference / Receipt",
            "Event Category",
            "Event Type",
            "Particulars",
            "Patient Token",
            "Amount (INR)",
            "Cashier",
            "Notes"
        ];

        const rows = filteredTransactions.map(t => [
            `"${t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : ''}"`,
            `"${t.referenceNo || ''}"`,
            `"${t.category || ''}"`,
            `"${t.type || ''}"`,
            `"${(t.particulars || '').replace(/"/g, '""')}"`,
            `"${t.token || ''}"`,
            t.amount || 0,
            `"${(t.receivedBy || ledgerData?.userName || '').replace(/"/g, '""')}"`,
            `"${(t.notes || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Cash_Drawer_${ledgerData?.userName || 'Shift'}_${selectedDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="w-full px-8 pt-1 pb-8 space-y-4">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        Cash Drawer Shift Ledgers & Reconciliation
                        <span className="text-xs font-mono font-bold bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded-full">
                            #POS-DRAWER
                        </span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                        Shift cash journal, petty-cash breakdown, outbound refunds, and official counter handover reconciliation slips.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsPrintSlipOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Handover Slip</span>
                    </button>
                    <button
                        onClick={handleDownloadCsv}
                        className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Export CSV</span>
                    </button>
                    <button
                        onClick={loadLedger}
                        disabled={loading}
                        className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 cursor-pointer"
                        title="Refresh Shift Ledger"
                    >
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Cashier & Date Selection Deck */}
            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border dark:border-zinc-800 border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider shrink-0 mr-1">
                        Select Cashier:
                    </span>
                    {cashiers.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedUserId(c.id)}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0",
                                selectedUserId === c.id
                                    ? "bg-slate-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm"
                                    : "bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700"
                            )}
                        >
                            <User className="w-3.5 h-3.5" />
                            <span>{c.name}</span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {!useCustomSingleDate ? (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 font-mono">
                                Range: {presetRange === 'thisMonth' ? 'This Month' : presetRange === 'today' ? 'Today' : presetRange || 'Global Filter'}
                            </span>
                            <button
                                type="button"
                                onClick={() => setUseCustomSingleDate(true)}
                                className="px-2 py-1 text-xs font-semibold rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 cursor-pointer"
                                title="Select a single shift date"
                            >
                                Pick Date
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-zinc-500">Date:</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white outline-none focus:border-synos-primary shadow-xs"
                            />
                            <button
                                type="button"
                                onClick={() => setUseCustomSingleDate(false)}
                                className="px-2 py-1 text-xs font-bold rounded-lg bg-teal-500/15 text-teal-700 dark:text-teal-300 hover:bg-teal-500/25 cursor-pointer"
                                title="Sync with Global Range Filter"
                            >
                                Use Global Range
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Shift KPI Deck */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Opening Cash Float</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">
                        ₹{(ledgerData?.openingFloat || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <span className="text-[10px] text-zinc-400 font-medium">Drawer Base Float</span>
                </div>

                <div className="p-4 rounded-xl synos-kpi-card border border-emerald-500/20 bg-emerald-500/5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Cash Inflow</p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                        +₹{(ledgerData?.totalInflow ?? ledgerData?.inflowBreakdown?.totalInflow ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <span className="text-[10px] text-emerald-600/80 font-medium">
                        Patient Desk (₹{(ledgerData?.inflowBreakdown?.patientDeskCash || 0).toLocaleString()}) + B2B (₹{(ledgerData?.inflowBreakdown?.b2bPartnerCash || 0).toLocaleString()})
                    </span>
                </div>

                <div className="p-4 rounded-xl synos-kpi-card border border-rose-500/20 bg-rose-500/5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Total Cash Outflows</p>
                    <p className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">
                        -₹{(ledgerData?.totalOutflow ?? ledgerData?.outflowBreakdown?.totalOutflow ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <span className="text-[10px] text-rose-600/80 font-medium">
                        Expenses (₹{(ledgerData?.outflowBreakdown?.dailyExpensesCash || 0).toLocaleString()}) + Refunds (₹{(ledgerData?.outflowBreakdown?.refundsCash || 0).toLocaleString()})
                    </span>
                </div>

                <div className="p-4 rounded-xl synos-kpi-card border-2 border-teal-500/40 bg-teal-500/10">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">Net Cash In Hand / Drawer</p>
                    <p className="text-2xl font-black text-teal-900 dark:text-teal-100 mt-1 font-mono">
                        ₹{(ledgerData?.netCashInDrawer || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <span className="text-[10px] text-teal-700 dark:text-teal-300 font-bold">Physical Cash Handover Target</span>
                </div>
            </div>

            {/* Transactions Journal Filter Bar */}
            <div className="space-y-3 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border dark:border-zinc-800 border-zinc-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                        {[
                            { id: 'All', label: 'All Transactions', count: transactions.length },
                            { id: 'Inflows', label: 'Cash Inflow Only', count: transactions.filter(t => t.category === 'Inflow').length },
                            { id: 'Outflows', label: 'Expenses Only', count: transactions.filter(t => t.category === 'Outflow').length },
                            { id: 'Refunds', label: 'Refunds Only', count: transactions.filter(t => t.type === 'PATIENT_REFUND').length }
                        ].map(f => (
                            <FilterTab 
                                key={f.id} 
                                label={f.label} 
                                count={f.count} 
                                isActive={filter === f.id} 
                                onClick={() => setFilter(f.id)} 
                            />
                        ))}
                    </div>

                    <div className="relative flex-1 sm:w-72">
                        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search receipt, token, patient particulars..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:border-synos-primary transition-all shadow-xs"
                        />
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="rounded-2xl border dark:border-zinc-800 border-zinc-200 overflow-hidden bg-white dark:bg-zinc-900/30 shadow-xs">
                {loading ? (
                    <div className="p-16 text-center animate-pulse text-zinc-500 font-bold uppercase tracking-widest text-xs flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
                        <span>Loading drawer shift transactions...</span>
                    </div>
                ) : ledgerError ? (
                    <div className="p-16 text-center space-y-3">
                        <div className="p-3 bg-rose-500/10 text-rose-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-rose-600 dark:text-rose-400">Failed to Load Cash Drawer Ledger</p>
                        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                            {ledgerError}
                        </p>
                        <button
                            type="button"
                            onClick={loadLedger}
                            className="mt-2 px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-all cursor-pointer"
                        >
                            Retry Loading
                        </button>
                    </div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="p-16 text-center space-y-3">
                        <Wallet className="w-10 h-10 text-zinc-400 mx-auto opacity-75" />
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">No Cash Drawer Transactions Recorded</p>
                        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                            No physical cash collections, expenses, or patient refunds logged for this cashier and shift date.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b dark:border-zinc-800 border-zinc-200 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                                    <th className="py-3 px-4">Time</th>
                                    <th className="py-3 px-4">Receipt / Ref</th>
                                    <th className="py-3 px-4">Category</th>
                                    <th className="py-3 px-4">Particulars & Patient Token</th>
                                    <th className="py-3 px-4">Notes</th>
                                    <th className="py-3 px-4 text-right">Cash Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                                {filteredTransactions.map((t, idx) => {
                                    const isInflow = t.category === 'Inflow';
                                    const isRefund = t.type === 'PATIENT_REFUND';

                                    return (
                                        <tr key={t.id || idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                                            <td className="py-3.5 px-4 whitespace-nowrap text-zinc-500 font-mono text-[11px]">
                                                {t.timestamp ? new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-black/5 dark:border-white/5">
                                                    {t.referenceNo || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                                    isInflow
                                                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                        : isRefund
                                                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                            : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                                )}>
                                                    {t.category}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-2">
                                                    {t.token && (
                                                        <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                                            #{t.token}
                                                        </span>
                                                    )}
                                                    <span className="font-medium text-slate-900 dark:text-white">
                                                        {t.particulars}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-500 dark:text-zinc-400 text-[11px] truncate max-w-[200px]">
                                                {t.notes || '—'}
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-black text-sm">
                                                <span className={isInflow ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                                                    {isInflow ? '+' : '-'}₹{Number(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Printable Slip Modal */}
            {isPrintSlipOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b pb-3 dark:border-zinc-800 border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Shift Cash Handover Slip</h3>
                                    <p className="text-[11px] text-slate-500">Official POS Register Settlement Sheet</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPrintSlipOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Slip Paper Preview */}
                        <div className="p-5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-dashed border-slate-300 dark:border-zinc-700 font-mono text-xs space-y-3">
                            <div className="text-center pb-2 border-b border-dashed border-slate-300 dark:border-zinc-700">
                                <span className="font-bold text-sm block">SYN-OS CLINICAL LABORATORY</span>
                                <span className="text-[11px] text-slate-500 block">DESK CASH REGISTER SHIFT SETTLEMENT</span>
                                <span className="text-[10px] text-slate-400 block mt-1">Generated: {new Date().toLocaleString()}</span>
                            </div>

                            <div className="space-y-1 text-[11px]">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Cashier:</span>
                                    <span className="font-bold">{ledgerData?.userName || 'Desk Staff'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Shift Date:</span>
                                    <span className="font-bold">{selectedDate}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Total Transactions:</span>
                                    <span className="font-bold">{transactions.length} events</span>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-dashed border-slate-300 dark:border-zinc-700 space-y-1.5 text-xs">
                                <div className="flex justify-between">
                                    <span>Opening Float:</span>
                                    <span>₹{(ledgerData?.openingFloat || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-600 font-bold">
                                    <span>(+) Patient Desk Cash:</span>
                                    <span>₹{(ledgerData?.inflowBreakdown?.patientDeskCash || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-600 font-bold">
                                    <span>(+) B2B Partner Inflow:</span>
                                    <span>₹{(ledgerData?.inflowBreakdown?.b2bPartnerCash || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-rose-600 font-bold">
                                    <span>(-) Daily Cash Expenses:</span>
                                    <span>-₹{(ledgerData?.outflowBreakdown?.dailyExpensesCash || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-amber-600 font-bold">
                                    <span>(-) Cash Refunds Disbursed:</span>
                                    <span>-₹{(ledgerData?.outflowBreakdown?.refundsCash || 0).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="pt-2 border-t-2 border-slate-400 dark:border-zinc-600 flex justify-between text-sm font-black">
                                <span>NET PHYSICAL CASH:</span>
                                <span className="text-teal-700 dark:text-teal-300 font-mono">₹{(ledgerData?.netCashInDrawer || 0).toFixed(2)}</span>
                            </div>

                            {/* Signatures */}
                            <div className="pt-6 grid grid-cols-2 gap-4 text-center text-[10px]">
                                <div>
                                    <div className="border-b border-slate-300 dark:border-zinc-700 pb-6 mb-1"></div>
                                    <span className="text-slate-500 font-semibold">Cashier Signature</span>
                                </div>
                                <div>
                                    <div className="border-b border-slate-300 dark:border-zinc-700 pb-6 mb-1"></div>
                                    <span className="text-slate-500 font-semibold">Supervisor / Receiver</span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Print Slip</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsPrintSlipOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// =========================================================================
// 10. FINANCE DISBURSE REFUND MODAL
// =========================================================================
export const FinanceDisburseRefundModal = ({ cancellation, onClose, onSuccess }) => {
    const { user } = useAuth();
    const pendingBalance = Number(cancellation?.balancePendingRefund || 0);
    const [amount, setAmount] = useState(pendingBalance > 0 ? pendingBalance.toString() : '');
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [completedSlip, setCompletedSlip] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmt = parseFloat(amount) || 0;
        if (numAmt <= 0) {
            alert("Please enter a valid refund amount.");
            return;
        }

        try {
            setIsSubmitting(true);
            const res = await FinanceApi.disburseCancellationRefund(cancellation.cancelId, {
                amount: numAmt,
                paymentMode: paymentMode,
                notes: notes.trim(),
                authorizerName: user?.name || "Finance Manager"
            });
            setCompletedSlip(res);
            onSuccess?.(res);
        } catch (err) {
            console.error("Disbursement failed:", err);
            alert("Disbursement failed: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b pb-3 dark:border-zinc-800 border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                            <Coins className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                Disburse Patient Refund
                            </h3>
                            <p className="text-[11px] text-slate-500">
                                Settle claim liability for token #{cancellation?.visitToken}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {completedSlip ? (
                    <div className="py-6 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
                            <Check className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-slate-900 dark:text-white">
                                Refund Disbursed Successfully!
                            </h4>
                            <p className="text-xs text-slate-500 font-mono mt-1">
                                Receipt #{completedSlip.settlementReceiptNo} • ₹{Number(completedSlip.disbursedAmount).toLocaleString()} via {completedSlip.paymentMode}
                            </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white flex items-center gap-1.5 cursor-pointer"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Print Voucher</span>
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white cursor-pointer"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Patient & Due Details Pod */}
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 text-xs space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Patient:</span>
                                <span className="font-bold text-slate-900 dark:text-white">{cancellation?.patientName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Original Amount Paid:</span>
                                <span className="font-mono">₹{Number(cancellation?.totalAmountPaid || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Already Refunded:</span>
                                <span className="font-mono text-rose-600">₹{Number(cancellation?.refundedAmount || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-200 dark:border-zinc-700">
                                <span className="text-amber-700 dark:text-amber-400">Balance Pending Due:</span>
                                <span className="font-mono text-amber-700 dark:text-amber-400">₹{pendingBalance.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Amount Input */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                                    Disbursement Amount (₹) *
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setAmount(pendingBalance.toString())}
                                    className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer"
                                >
                                    Full Settle (₹{pendingBalance.toLocaleString()})
                                </button>
                            </div>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400">₹</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    max={pendingBalance > 0 ? pendingBalance : undefined}
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full pl-8 pr-4 py-2 text-xl font-black rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Payment Mode Selector */}
                        <div className="space-y-1.5">
                            <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                                Payment Channel *
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'Cash', label: 'Cash Drawer', icon: Wallet },
                                    { id: 'UPI', label: 'UPI / Online', icon: QrCode },
                                    { id: 'BankTransfer', label: 'Bank / Card', icon: CreditCard }
                                ].map(m => {
                                    const Icon = m.icon;
                                    const isSel = paymentMode === m.id;
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => setPaymentMode(m.id)}
                                            className={cn(
                                                "p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer",
                                                isSel
                                                    ? "bg-slate-900 dark:bg-white text-white dark:text-zinc-900 border-slate-900 dark:border-white shadow-xs"
                                                    : "bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700"
                                            )}
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span>{m.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-1">
                            <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                                Settlement Notes / Attendant *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Returned ₹1000 cash to patient relative"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t dark:border-zinc-800">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || (parseFloat(amount) || 0) <= 0}
                                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                            >
                                {isSubmitting ? "Disbursing..." : `Confirm & Disburse ₹${amount || '0'}`}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
