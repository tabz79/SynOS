import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PatientApi } from '@/api/patient';
import { 
  ArrowLeft, 
  User, 
  FileText, 
  DollarSign, 
  Merge, 
  Edit2, 
  X, 
  Check, 
  Loader2, 
  Phone, 
  Calendar, 
  Info,
  CalendarDays,
  CreditCard,
  History,
  UserPlus,
  Trash2,
  Sparkles,
  UserCheck,
  Lock,
  ShieldCheck,
  Ban
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { HealthCardApi } from '@/api/healthCards';
import { HealthCardDeskDrawer } from '@/features/reception/components/HealthCardDeskDrawer';

// Native date helpers to avoid external dayjs dependency
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateInput(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

function dateToISOString(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? '' : date.toISOString();
}

export function PatientDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();

  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Demographic & Phone History
  const [patient, setPatient] = useState(null);
  const [phoneHistory, setPhoneHistory] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Health Card Membership State
  const [membershipCard, setMembershipCard] = useState(null);
  const [isMembershipLoading, setIsMembershipLoading] = useState(false);
  const [isIssueDrawerOpen, setIsIssueDrawerOpen] = useState(false);
  const [selectedCardForEdit, setSelectedCardForEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({ discountType: 'Percentage', discountValue: 30, validityDays: 365, status: 'Active' });
  const [isUpdatingCard, setIsUpdatingCard] = useState(false);
  const [selectedCardForCancel, setSelectedCardForCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancellingCard, setIsCancellingCard] = useState(false);
  const [selectedCardForEnroll, setSelectedCardForEnroll] = useState(null);
  const [enrollFormData, setEnrollFormData] = useState({ name: '', age: '', gender: 'Female', relationship: 'Spouse' });
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Visits
  const [visits, setVisits] = useState([]);

  // Financials
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);

  // Deduplication & Merge
  const [duplicates, setDuplicates] = useState([]);
  const [selectedDuplicate, setSelectedDuplicate] = useState(null);
  const [mergePreview, setMergePreview] = useState(null);
  const [mergeConfirmed, setMergeConfirmed] = useState(false);

  const fetchMembership = async () => {
    setIsMembershipLoading(true);
    try {
      const card = await HealthCardApi.getCardByPatient(id);
      setMembershipCard(card);
    } catch (err) {
      console.error(err);
    } finally {
      setIsMembershipLoading(false);
    }
  };

  const fetchPatientData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [patientData, phoneData] = await Promise.all([
        PatientApi.getPatientById(id),
        PatientApi.getPhoneHistory(id)
      ]);
      setPatient(patientData);
      setEditForm(patientData || {});
      setPhoneHistory(phoneData || []);
      // Also silently load health card membership in background for header badge
      fetchMembership();
    } catch (err) {
      console.error(err);
      setError('Failed to fetch patient demographic file.');
    } finally {
      setLoading(false);
    }
  };

  const fetchVisits = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await PatientApi.getVisits(id);
      setVisits(data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch patient visits list.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancials = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await PatientApi.getFinancials(id);
      setInvoices(data?.invoices || []);
      setPayments(data?.payments || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch patient financial records ledger.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDuplicates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await PatientApi.getPossibleDuplicates(id);
      setDuplicates(data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch possible duplicate records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    setSuccess(null);
    setError(null);
    if (activeTab === 'profile') fetchPatientData();
    if (activeTab === 'membership') fetchMembership();
    if (activeTab === 'visits') fetchVisits();
    if (activeTab === 'ledger') fetchFinancials();
    if (activeTab === 'merge') {
      fetchDuplicates();
      setSelectedDuplicate(null);
      setMergePreview(null);
      setMergeConfirmed(false);
    }
  }, [id, activeTab]);

  const handleOpenEdit = (card) => {
    setSelectedCardForEdit(card);
    setEditFormData({
      discountType: card.configuredDiscountType || 'Percentage',
      discountValue: card.configuredDiscountValue || 30,
      validityDays: 365,
      status: card.status || 'Active'
    });
  };

  const handleUpdateCardSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCardForEdit) return;
    setIsUpdatingCard(true);
    try {
      await HealthCardApi.updateCard(selectedCardForEdit.cardId, {
        discountType: editFormData.discountType,
        discountValue: Number(editFormData.discountValue),
        validityDays: Number(editFormData.validityDays),
        status: editFormData.status
      });
      setSelectedCardForEdit(null);
      await fetchMembership();
      setSuccess(`Health Card ${selectedCardForEdit.cardNumber} updated successfully.`);
    } catch (err) {
      setError(err.message || 'Failed to update health card.');
    } finally {
      setIsUpdatingCard(false);
    }
  };

  const handleCancelCardSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCardForCancel) return;
    setIsCancellingCard(true);
    try {
      await HealthCardApi.cancelCard(selectedCardForCancel.cardId, cancelReason);
      setSelectedCardForCancel(null);
      setCancelReason('');
      await fetchMembership();
      setSuccess(`Health Card ${selectedCardForCancel.cardNumber} has been cancelled.`);
    } catch (err) {
      setError(err.message || 'Failed to cancel health card.');
    } finally {
      setIsCancellingCard(false);
    }
  };

  const handleRemoveBeneficiary = async (beneficiaryId, name) => {
    if (!membershipCard) return;
    if (!window.confirm(`Are you sure you want to remove ${name || 'this family member'} from the health card? The open slot will become available again.`)) {
      return;
    }
    try {
      await HealthCardApi.removeBeneficiary(membershipCard.cardId, beneficiaryId);
      await fetchMembership();
      setSuccess('Family member removed successfully. Slot restored.');
    } catch (err) {
      setError(err.message || 'Failed to remove beneficiary.');
    }
  };

  const handleEnrollBeneficiarySubmit = async (e) => {
    e.preventDefault();
    if (!membershipCard || !enrollFormData.name.trim()) return;
    setIsEnrolling(true);
    try {
      await HealthCardApi.enrollBeneficiary(membershipCard.cardId, {
        fullName: enrollFormData.name.trim(),
        age: enrollFormData.age ? Number(enrollFormData.age) : null,
        gender: enrollFormData.gender,
        relationship: enrollFormData.relationship
      });
      setSelectedCardForEnroll(null);
      setEnrollFormData({ name: '', age: '', gender: 'Female', relationship: 'Spouse' });
      await fetchMembership();
      setSuccess('Family member enrolled successfully.');
    } catch (err) {
      setError(err.message || 'Failed to enroll family member.');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleDemographicsUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await PatientApi.updatePatient(id, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        currentPhoneNumber: editForm.currentPhoneNumber,
        dateOfBirth: editForm.dateOfBirth,
        gender: editForm.gender
      });
      setPatient(updated);
      setIsEditing(false);
      setSuccess('Demographics details updated successfully.');
      
      // Reload phone history in case phone changed
      const phoneData = await PatientApi.getPhoneHistory(id);
      setPhoneHistory(phoneData || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error occurred while saving patient demographics.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDuplicate = async (dup) => {
    setLoading(true);
    setError(null);
    try {
      const dupDetail = await PatientApi.getPatientById(dup.patientId);
      setSelectedDuplicate({ ...dup, ...dupDetail });
      
      const preview = await PatientApi.getMergePreview(id, dup.patientId);
      setMergePreview(preview);
      setMergeConfirmed(false);
    } catch (err) {
      console.error(err);
      setError('Failed to load merge preview counts.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteMerge = async () => {
    if (!selectedDuplicate || !mergeConfirmed) return;
    setLoading(true);
    setError(null);
    try {
      await PatientApi.mergePatients(id, selectedDuplicate.patientId);
      setSuccess(`Merge successful! Patient '${selectedDuplicate.firstName} ${selectedDuplicate.lastName}' has been merged into this profile.`);
      setSelectedDuplicate(null);
      setMergePreview(null);
      setMergeConfirmed(false);
      setActiveTab('profile');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Merge execution failed.');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} Y`;
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 text-zinc-800 dark:text-zinc-100 font-sans">
      {/* Back button & Title Header */}
      <div className="flex items-center gap-4 mb-6 border-b dark:border-zinc-800 border-zinc-200 pb-5">
        <button
          onClick={() => {
            const basePath = location.pathname.startsWith('/admin') ? '/admin/patients' : '/patients';
            navigate(`${basePath}${location.search ? location.search : ''}`);
          }}
          className="p-2 border border-zinc-250 dark:border-zinc-850 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all shadow-sm shadow-black/5 active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
        </button>
        {patient && (
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-[10px] font-semibold text-synos-primary bg-synos-primary/10 px-2 py-0.5 rounded border border-synos-primary/20 uppercase tracking-wider">
                {patient.mrn}
              </span>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-850 dark:text-zinc-100">
                {patient.firstName} {patient.lastName}
              </h1>
              {(patient.hasActiveHealthCard || membershipCard?.status === 'Active') && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-blue-500/15 via-indigo-500/15 to-purple-500/15 text-blue-700 dark:text-blue-300 border border-blue-400/30">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>💎 Health Card Member ({membershipCard?.cardNumber || patient.healthCardNumber})</span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">• {membershipCard?.planName || patient.healthCardPlanName}</span>
                </span>
              )}
            </div>
            <p className="text-zinc-400 dark:text-zinc-500 text-[10px] font-medium mt-1 uppercase tracking-wider">
              Active Patient Demographics File
            </p>
          </div>
        )}
      </div>

      {/* Success/Error Alerts */}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-650 dark:text-emerald-450 text-xs font-semibold flex justify-between items-center animate-fadeIn">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="hover:font-black">×</button>
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 text-xs font-semibold flex justify-between items-center animate-fadeIn">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="hover:font-black">×</button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap border-b dark:border-zinc-850 border-zinc-200 pb-px mb-8 gap-1">
        {[
          { id: 'profile', label: 'Demographics & History', icon: User },
          { 
            id: 'membership', 
            label: 'Health Card Membership', 
            icon: CreditCard,
            badge: (patient?.hasActiveHealthCard || membershipCard?.status === 'Active') ? 'Active' : null 
          },
          { id: 'visits', label: 'Visits Record', icon: FileText },
          { id: 'ledger', label: 'Financial Ledger', icon: DollarSign },
          { id: 'merge', label: 'Deduplication & Merge', icon: Merge }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 -mb-px ${
              activeTab === tab.id
                ? 'border-synos-primary text-synos-primary font-bold'
                : 'border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content Box */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900/60 rounded-2xl p-8 shadow-sm" style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}>
        {loading && <div className="text-center py-12 text-zinc-500 font-bold uppercase tracking-widest text-xs">Accessing clinical index...</div>}

        {/* Tab: Health Card Membership */}
        {activeTab === 'membership' && (
          <div className="space-y-6 animate-fadeIn">
            {isMembershipLoading ? (
              <div className="text-center py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-xs font-semibold">Loading membership records...</span>
              </div>
            ) : membershipCard ? (
              <div className="space-y-6">
                {/* Active Membership Pass Card */}
                <div className="rounded-[24px] border p-6 bg-gradient-to-b from-[#FFFFFF] via-[#F8FBFE] to-[#F1F6FA] dark:bg-zinc-900 border-slate-300 dark:border-zinc-800 shadow-sm space-y-6">
                  {/* Top Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0 border border-blue-200 dark:border-blue-800 shadow-2xs">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {membershipCard.planName}
                          </h3>
                          <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                            {membershipCard.cardNumber}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                          Primary Subscriber: <strong className="text-slate-800 dark:text-zinc-200">{membershipCard.primaryPatientName}</strong> ({membershipCard.primaryPhoneNumber})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-500/15 to-orange-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>{membershipCard.configuredDiscountValue}{membershipCard.configuredDiscountType === 'Percentage' ? '%' : '₹'} Off</span>
                      </div>

                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border flex items-center gap-1.5",
                        membershipCard.isExpired
                          ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                          : membershipCard.status === 'Cancelled'
                            ? "bg-slate-500/10 text-slate-600 border-slate-500/20"
                            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      )}>
                        <span className={cn("w-2 h-2 rounded-full", membershipCard.isExpired || membershipCard.status === 'Cancelled' ? "bg-rose-500" : "bg-emerald-500 animate-pulse")} />
                        {membershipCard.status}
                      </span>
                    </div>
                  </div>

                  {/* 4 Stat Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/40 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Plan Quota</span>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {membershipCard.enrolledMembersCount} / {membershipCard.maxMembers} Members
                      </p>
                      <span className="text-[10px] text-blue-600 font-semibold">{membershipCard.availableSlots} open slot{membershipCard.availableSlots !== 1 ? 's' : ''}</span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/40 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Total Saved</span>
                      <p className="text-sm font-extrabold text-emerald-600">
                        ₹{Number(membershipCard.totalSavedToDate || 0).toLocaleString()}
                      </p>
                      <span className="text-[10px] text-slate-400">Cumulative Concession</span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/40 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Visits Billed</span>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {membershipCard.totalVisitsBilled || 0}
                      </p>
                      <span className="text-[10px] text-slate-400">Card-billed visits</span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/40 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Validity Period</span>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {new Date(membershipCard.validUntil).toLocaleDateString()}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        From {new Date(membershipCard.effectiveFrom).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Beneficiaries List */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
                        Enrolled Beneficiaries ({membershipCard.beneficiaries?.length || 0})
                      </h4>
                      {membershipCard.availableSlots > 0 && membershipCard.status === 'Active' && !membershipCard.isExpired && (
                        <button
                          type="button"
                          onClick={() => setSelectedCardForEnroll(membershipCard)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0D6EFD] hover:bg-blue-600 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>+ Enroll Family Member ({membershipCard.availableSlots} Open)</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {membershipCard.beneficiaries?.map(ben => (
                        <div
                          key={ben.beneficiaryId}
                          className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                              <UserCheck className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {ben.displayName}
                                </p>
                                {ben.isSlotLocked && (
                                  <Lock className="w-3 h-3 text-slate-400 shrink-0" title="Locked after test billing" />
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">
                                {ben.relationship}
                              </span>
                            </div>
                          </div>

                          {ben.relationship !== 'Self' && (
                            <button
                              type="button"
                              title="Remove family member"
                              onClick={() => handleRemoveBeneficiary(ben.beneficiaryId, ben.displayName)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(membershipCard)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-blue-600 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 hover:border-blue-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit Concession / Validity</span>
                      </button>
                    </div>

                    {membershipCard.status !== 'Cancelled' && (
                      <button
                        type="button"
                        onClick={() => { setSelectedCardForCancel(membershipCard); setCancelReason(''); }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancel Subscription</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Empty State: No Active Health Card */
              <div className="rounded-[24px] border border-dashed border-slate-300 dark:border-zinc-800 p-12 text-center space-y-4 bg-slate-50/50 dark:bg-zinc-900/30">
                <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 shadow-sm">
                  <CreditCard className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    No Active Health Card Subscription
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                    {patient ? `${patient.firstName} ${patient.lastName}` : 'This patient'} is currently not enrolled under any active health card discount subscription.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsIssueDrawerOpen(true)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0D6EFD] hover:bg-blue-600 text-white transition-all flex items-center gap-2 mx-auto cursor-pointer shadow-sm active:scale-95"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Issue Health Card to this Patient</span>
                  </button>
                </div>
              </div>
            )}

            {/* MODAL: EDIT CARD SETTINGS */}
            {selectedCardForEdit && (
              <div className="p-4 rounded-[20px] border bg-gradient-to-b from-[#FFFFFF] via-[#F8FBFE] to-[#F1F6FA] dark:bg-zinc-900 border-blue-200 dark:border-blue-800 space-y-3.5 shadow-xl animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-blue-600" />
                    Edit Settings: {selectedCardForEdit.cardNumber}
                  </h4>
                  <button type="button" onClick={() => setSelectedCardForEdit(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleUpdateCardSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Discount Concession Mode</label>
                      <div className="flex rounded-xl border border-slate-300 dark:border-zinc-700 p-0.5 bg-slate-100 dark:bg-zinc-800">
                        <button
                          type="button"
                          onClick={() => setEditFormData(prev => ({ ...prev, discountType: 'Percentage' }))}
                          className={cn(
                            "flex-1 py-1 text-[11px] font-bold rounded-lg transition-all",
                            editFormData.discountType === 'Percentage' ? "bg-blue-600 text-white shadow-2xs" : "text-slate-600 dark:text-zinc-400"
                          )}
                        >
                          % Percentage
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditFormData(prev => ({ ...prev, discountType: 'Flat' }))}
                          className={cn(
                            "flex-1 py-1 text-[11px] font-bold rounded-lg transition-all",
                            editFormData.discountType === 'Flat' ? "bg-blue-600 text-white shadow-2xs" : "text-slate-600 dark:text-zinc-400"
                          )}
                        >
                          ₹ Flat
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
                        Concession Value ({editFormData.discountType === 'Percentage' ? '%' : '₹'})
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={editFormData.discountType === 'Percentage' ? 100 : 50000}
                        value={editFormData.discountValue}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, discountValue: e.target.value }))}
                        className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Card Status</label>
                      <select
                        value={editFormData.status}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs"
                      >
                        <option value="Active">Active</option>
                        <option value="Suspended">Suspended</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Extend Validity</label>
                      <select
                        value={editFormData.validityDays}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, validityDays: e.target.value }))}
                        className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs"
                      >
                        <option value={180}>6 Months (180 Days)</option>
                        <option value={365}>1 Year (365 Days)</option>
                        <option value={730}>2 Years (730 Days)</option>
                        <option value={1095}>3 Years (1095 Days)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCardForEdit(null)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdatingCard}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {isUpdatingCard ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* MODAL: ENROLL FAMILY MEMBER */}
            {selectedCardForEnroll && (
              <div className="p-4 rounded-[20px] border bg-gradient-to-b from-[#FFFFFF] via-[#F8FBFE] to-[#F1F6FA] dark:bg-zinc-900 border-blue-200 dark:border-blue-800 space-y-3.5 shadow-xl animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-blue-600" />
                    Enroll Member into {selectedCardForEnroll.cardNumber}
                  </h4>
                  <button type="button" onClick={() => setSelectedCardForEnroll(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleEnrollBeneficiarySubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={enrollFormData.name}
                        onChange={(e) => setEnrollFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Full Name"
                        className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Relationship</label>
                      <select
                        value={enrollFormData.relationship}
                        onChange={(e) => setEnrollFormData(prev => ({ ...prev, relationship: e.target.value }))}
                        className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs"
                      >
                        <option value="Spouse">Spouse</option>
                        <option value="Son">Son</option>
                        <option value="Daughter">Daughter</option>
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Brother">Brother</option>
                        <option value="Sister">Sister</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Age (Years)</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={enrollFormData.age}
                        onChange={(e) => setEnrollFormData(prev => ({ ...prev, age: e.target.value }))}
                        placeholder="Age"
                        className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Gender</label>
                      <select
                        value={enrollFormData.gender}
                        onChange={(e) => setEnrollFormData(prev => ({ ...prev, gender: e.target.value }))}
                        className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCardForEnroll(null)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isEnrolling}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {isEnrolling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Enroll Family Member</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* MODAL: CANCEL / REVOKE CARD */}
            {selectedCardForCancel && (
              <div className="p-4 rounded-[20px] border bg-gradient-to-b from-[#FFFFFF] via-[#FFF5F5] to-[#FFEBEB] dark:bg-zinc-900 border-rose-300 dark:border-rose-800 space-y-3.5 shadow-xl animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-2">
                    <Ban className="w-4 h-4 text-rose-600" />
                    Revoke Health Card: {selectedCardForCancel.cardNumber}
                  </h4>
                  <button type="button" onClick={() => setSelectedCardForCancel(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-rose-700 dark:text-rose-400 font-medium">
                  Are you sure you want to cancel the subscription for <strong>{selectedCardForCancel.primaryPatientName}</strong>? All associated beneficiaries will lose health card discount privileges.
                </p>
                <form onSubmit={handleCancelCardSubmit} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Reason for Cancellation (Optional)</label>
                    <input
                      type="text"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="e.g. Patient requested refund, duplicate issue, etc."
                      className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-rose-500 shadow-2xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedCardForCancel(null)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      Dismiss
                    </button>
                    <button
                      type="submit"
                      disabled={isCancellingCard}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {isCancellingCard ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                      <span>Confirm Revocation</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Global Issue Health Card Drawer inside Patient File */}
        {isIssueDrawerOpen && (
          <HealthCardDeskDrawer
            isOpen={isIssueDrawerOpen}
            onClose={() => {
              setIsIssueDrawerOpen(false);
              fetchMembership();
              fetchPatientData();
            }}
            onCardIssued={(createdCard) => {
              setMembershipCard(createdCard);
              setIsIssueDrawerOpen(false);
              setSuccess(`Health card ${createdCard.cardNumber} issued successfully to this patient!`);
            }}
          />
        )}

        {/* Tab 1: Profile & Demographics */}
        {activeTab === 'profile' && patient && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn text-xs">
            {/* Demographics details / Form */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-center border-b dark:border-zinc-900 border-zinc-100 pb-3 mb-4">
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Demographic Profile</h3>
                {!isEditing ? (
                  <button
                    onClick={() => {
                      setEditForm(patient);
                      setIsEditing(true);
                    }}
                    className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-synos-primary hover:text-synos-primary/80 text-[11px] font-semibold rounded-xl transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit Demographics
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-red-500/20 hover:bg-red-500/15 text-red-400 text-[11px] font-semibold rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {!isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-xl border border-zinc-150 dark:border-zinc-900/50" style={{ backgroundColor: theme === 'dark' ? '#18181b' : '#fafafa' }}>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">First Name</label>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{patient.firstName}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Last Name</label>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{patient.lastName || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Phone Number</label>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{patient.currentPhoneNumber || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Gender</label>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 capitalize">{patient.gender || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Date of Birth</label>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {formatDate(patient.dateOfBirth)}
                      <span className="text-zinc-400 dark:text-zinc-500 ml-2 font-normal">({calculateAge(patient.dateOfBirth)})</span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Registration Date</label>
                    <p className="text-sm font-mono font-medium text-zinc-700 dark:text-zinc-300">{formatDate(patient.createdAt || patient.dateOfBirth)}</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleDemographicsUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1">FIRST NAME</label>
                      <input
                        type="text"
                        required
                        value={editForm.firstName || ''}
                        onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 outline-none text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-synos-primary focus:border-synos-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1">LAST NAME</label>
                      <input
                        type="text"
                        value={editForm.lastName || ''}
                        onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 outline-none text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-synos-primary focus:border-synos-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1">PHONE NUMBER</label>
                      <input
                        type="text"
                        required
                        value={editForm.currentPhoneNumber || ''}
                        onChange={e => setEditForm({ ...editForm, currentPhoneNumber: e.target.value })}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 outline-none text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-synos-primary focus:border-synos-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-550 mb-1">GENDER</label>
                      <select
                        value={editForm.gender || ''}
                        onChange={e => setEditForm({ ...editForm, gender: e.target.value })}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 outline-none text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-synos-primary focus:border-synos-primary transition-all"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1">DATE OF BIRTH</label>
                      <input
                        type="date"
                        value={editForm.dateOfBirth ? formatDateInput(editForm.dateOfBirth) : ''}
                        onChange={e => setEditForm({ ...editForm, dateOfBirth: e.target.value ? dateToISOString(e.target.value) : undefined })}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 outline-none text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-synos-primary focus:border-synos-primary transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-synos-primary hover:bg-synos-primary/90 text-white font-bold rounded-xl active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Save Changes
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Telephone Number Audit History */}
            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 border-b dark:border-zinc-900 border-zinc-100 pb-3">
                Phone Number History
              </h3>
              <div className="space-y-3">
                {phoneHistory.map(h => (
                  <div key={h.phoneHistoryId} className="border border-zinc-100 dark:border-zinc-900 p-4 rounded-xl text-xxs" style={{ backgroundColor: theme === 'dark' ? '#18181b' : '#fafafa' }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Phone className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{h.phoneNumber}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-medium font-mono">
                      Active: {formatDate(h.startDate)} – {h.endDate ? formatDate(h.endDate) : 'Current'}
                    </p>
                  </div>
                ))}
                {phoneHistory.length === 0 && (
                  <p className="text-zinc-400 text-xxs font-medium italic">No phone audit history logs registered.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Visits Record */}
        {activeTab === 'visits' && !loading && (
          <div className="animate-fadeIn space-y-6 text-xs">
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 border-b dark:border-zinc-900 border-zinc-100 pb-3">
              Longitudinal Visits History
            </h3>
            <div className="space-y-4">
              {visits.map(v => (
                <div key={v.visitId} className="border border-zinc-100 dark:border-zinc-900 rounded-xl bg-zinc-50/10 dark:bg-zinc-900/5 overflow-hidden shadow-sm">
                  {/* Header summary of visit */}
                  <div className="bg-zinc-50/30 dark:bg-zinc-900/10 p-4 flex flex-wrap justify-between items-center border-b border-zinc-150 dark:border-zinc-900 gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-medium text-zinc-650 dark:text-zinc-300">#{v.tokenNumber}</span>
                      <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[11px]">({formatDateTime(v.tokenDate)})</span>
                      <span className={cn(
                        "text-[9px] px-2 py-0.5 rounded font-mono font-semibold border uppercase tracking-wider leading-none",
                        v.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                        v.status === 'Draft' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700' :
                        'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      )}>
                        {v.status}
                      </span>
                    </div>

                    <div className="flex gap-4 font-mono text-[11px] font-semibold text-zinc-550 dark:text-zinc-400">
                      <p>Total: <strong className="text-zinc-800 dark:text-zinc-200">₹{v.totalAmount.toLocaleString()}</strong></p>
                      <p>Paid: <strong className="text-emerald-600 dark:text-emerald-400">₹{v.amountPaid.toLocaleString()}</strong></p>
                      <p>Due: <strong className={v.outstandingBalance > 0 ? 'text-red-500 dark:text-red-400' : 'text-zinc-400 dark:text-zinc-500'}>₹{v.outstandingBalance.toLocaleString()}</strong></p>
                    </div>
                  </div>

                  {/* Orders/Tests List */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {v.tests.map(t => (
                      <div key={t.orderId} className="p-3 bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-lg flex justify-between items-center text-xxs font-medium shadow-inner shadow-black/[0.02]">
                        <div>
                          <span className="font-mono text-zinc-400 dark:text-zinc-500 font-semibold block mb-0.5">{t.testCode}</span>
                          <span className="text-zinc-750 dark:text-zinc-200 text-xs font-semibold leading-tight block">{t.testName}</span>
                        </div>
                        <span className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded font-semibold border uppercase tracking-wider leading-none",
                          t.status === 'Completed' || t.status === 'Finalized' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                          t.status === 'SampleCollected' ? 'bg-synos-primary/10 text-synos-primary border-synos-primary/20' :
                          'bg-zinc-100 dark:bg-zinc-800 text-zinc-550 dark:text-zinc-450 border-zinc-200 dark:border-zinc-700'
                        )}>
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {visits.length === 0 && (
                <p className="text-zinc-550 font-medium py-4">No historical clinic visits found for this patient.</p>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Financial Ledger */}
        {activeTab === 'ledger' && !loading && (
          <div className="animate-fadeIn space-y-10 text-xs">
            {/* Invoices List */}
            <div>
              <h3 className="text-sm font-bold text-synos-primary uppercase tracking-widest border-b dark:border-zinc-800 border-zinc-200 pb-3 mb-4">
                Billing Invoices
              </h3>
              <div className="overflow-x-auto border dark:border-zinc-850 border-zinc-200/10 rounded-xl">
                <table className="min-w-full text-left border-collapse text-xxs font-medium">
                  <thead>
                    <tr className="bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-200 dark:border-zinc-800">
                      <th className="p-4 text-zinc-550 dark:text-zinc-400 uppercase tracking-wider font-semibold">Invoice No</th>
                      <th className="p-4 text-zinc-550 dark:text-zinc-400 uppercase tracking-wider font-semibold">Date</th>
                      <th className="p-4 text-zinc-550 dark:text-zinc-400 uppercase tracking-wider text-right font-semibold">Gross</th>
                      <th className="p-4 text-zinc-550 dark:text-zinc-400 uppercase tracking-wider text-right font-semibold">Tax</th>
                      <th className="p-4 text-zinc-550 dark:text-zinc-400 uppercase tracking-wider text-right font-semibold">Discount</th>
                      <th className="p-4 text-zinc-550 dark:text-zinc-400 uppercase tracking-wider text-right font-semibold">Net Total</th>
                      <th className="p-4 text-zinc-550 dark:text-zinc-400 uppercase tracking-wider text-right font-semibold">Paid</th>
                      <th className="p-4 text-zinc-550 dark:text-zinc-400 uppercase tracking-wider text-right font-semibold">Balance Due</th>
                      <th className="p-4 text-zinc-550 dark:text-zinc-400 uppercase tracking-wider text-center font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                    {invoices.map(inv => (
                      <tr key={inv.invoiceId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/25 transition-colors">
                        <td className="p-4 font-mono font-semibold text-zinc-800 dark:text-zinc-200">{inv.invoiceNumber}</td>
                        <td className="p-4 font-mono text-zinc-450 dark:text-zinc-500">{formatDateTime(inv.createdAt)}</td>
                        <td className="p-4 text-right font-mono text-zinc-700 dark:text-zinc-300">₹{inv.grossAmount.toLocaleString()}</td>
                        <td className="p-4 text-right font-mono text-zinc-450 dark:text-zinc-550">₹{inv.taxAmount.toLocaleString()}</td>
                        <td className="p-4 text-right font-mono text-red-500 dark:text-red-400">₹{inv.discountAmount.toLocaleString()}</td>
                        <td className="p-4 text-right font-mono font-semibold text-zinc-850 dark:text-zinc-150">₹{inv.totalAmount.toLocaleString()}</td>
                        <td className="p-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">₹{inv.paidAmount.toLocaleString()}</td>
                        <td className="p-4 text-right font-mono font-semibold text-zinc-850 dark:text-zinc-150">
                          <span className={inv.outstandingAmount > 0 ? 'text-red-500 dark:text-red-400 font-bold' : 'text-zinc-450 dark:text-zinc-500'}>
                            ₹{inv.outstandingAmount.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={cn(
                            "text-[8px] px-2 py-0.5 rounded font-mono font-semibold border uppercase tracking-wider leading-none",
                            inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                            inv.status === 'Partial' ? 'bg-amber-500/10 text-amber-650 dark:text-amber-450 border-amber-500/20' :
                            'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20'
                          )}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-zinc-555 uppercase tracking-wider font-bold">
                          No invoices found for this patient profile.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payments List */}
            <div>
              <h3 className="text-sm font-bold text-synos-primary uppercase tracking-widest border-b dark:border-zinc-800 border-zinc-200 pb-3 mb-4">
                Received Receipts
              </h3>
              <div className="overflow-x-auto border dark:border-zinc-850 border-zinc-200/10 rounded-xl">
                <table className="min-w-full text-left border-collapse text-xxs font-medium">
                  <thead>
                    <tr className="bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-200 dark:border-zinc-800">
                      <th className="p-4 text-zinc-550 dark:text-zinc-400 uppercase tracking-wider font-semibold">Receipt No</th>
                      <th className="p-4 text-zinc-550 dark:text-zinc-400 uppercase tracking-wider font-semibold">Timestamp</th>
                      <th className="p-4 text-zinc-550 dark:text-zinc-400 uppercase tracking-wider font-semibold">Payment Mode</th>
                      <th className="p-4 text-zinc-550 dark:text-zinc-400 uppercase tracking-wider font-semibold">Collector ID</th>
                      <th className="p-4 text-zinc-550 dark:text-zinc-400 uppercase tracking-wider text-right font-semibold">Amount Collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                    {payments.map(pay => (
                      <tr key={pay.paymentId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/25 transition-colors">
                        <td className="p-4 font-mono font-semibold text-zinc-850 dark:text-zinc-200">{pay.receiptNumber}</td>
                        <td className="p-4 font-mono text-zinc-450 dark:text-zinc-550">{formatDateTime(pay.createdAt)}</td>
                        <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200">{pay.paymentMode}</td>
                        <td className="p-4 font-mono text-zinc-450 dark:text-zinc-500">{pay.receivedByUserId || 'System'}</td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-450">₹{pay.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-zinc-555 uppercase tracking-wider font-bold">
                          No transactions or receipts recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Deduplication & Merge */}
        {activeTab === 'merge' && !loading && (
          <div className="animate-fadeIn space-y-6 text-xs text-zinc-800 dark:text-zinc-200">
            <h3 className="text-sm font-bold text-synos-primary uppercase tracking-widest border-b dark:border-zinc-800 border-zinc-200 pb-3 mb-4">
              Patient Registry Deduplication Panel
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Duplicate List */}
              <div className="space-y-4">
                <h4 className="font-semibold text-xxs text-zinc-450 uppercase tracking-widest mb-2">Potential Duplicates</h4>
                {duplicates.map(dup => (
                  <div
                    key={dup.patientId}
                    onClick={() => handleSelectDuplicate(dup)}
                    className={cn(
                      "p-4 rounded-xl border transition-all duration-200 cursor-pointer text-xxs flex flex-col justify-between hover:-translate-y-0.5 shadow-sm",
                      selectedDuplicate?.patientId === dup.patientId
                        ? 'bg-synos-primary/10 border-synos-primary/35 shadow-md shadow-synos-primary/5'
                        : 'bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-850/80 hover:border-synos-primary/15'
                    )}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-850">
                          {dup.mrn}
                        </span>
                        <span className="text-[10px] font-bold text-synos-primary font-mono">
                          {dup.matchPercentage}% match
                        </span>
                      </div>
                      <h4 className="font-bold text-zinc-800 dark:text-zinc-150 text-xs mb-2">{dup.firstName} {dup.lastName}</h4>
                      {dup.currentPhoneNumber && <p className="text-zinc-450 dark:text-zinc-500">Phone: {dup.currentPhoneNumber}</p>}
                      {dup.dateOfBirth && <p className="text-zinc-450 dark:text-zinc-500">DOB: {formatDate(dup.dateOfBirth)} ({calculateAge(dup.dateOfBirth)})</p>}
                    </div>
                  </div>
                ))}
                {duplicates.length === 0 && (
                  <p className="text-zinc-550 font-medium italic">No duplicate candidates detected in the records registry.</p>
                )}
              </div>

              {/* Side-by-side Demographic Comparison & Preview */}
              <div className="lg:col-span-2 space-y-6">
                {selectedDuplicate && mergePreview ? (
                  <div className="space-y-6">
                    <h4 className="font-bold text-xxs text-zinc-450 uppercase tracking-widest">Profile Comparison & Merge Preview</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Target/Survivor (This Profile) */}
                      <div className="border border-emerald-500/25 bg-emerald-500/5 p-5 rounded-xl text-xxs space-y-3 shadow-inner">
                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded leading-none">
                          Survivor Profile (Keep)
                        </span>
                        <div>
                          <p className="text-zinc-450 dark:text-zinc-500 font-bold">NAME</p>
                          <p className="text-zinc-800 dark:text-zinc-200 font-bold text-xs">{patient.firstName} {patient.lastName}</p>
                        </div>
                        <div>
                          <p className="text-zinc-455 dark:text-zinc-500 font-bold">MRN</p>
                          <p className="text-zinc-800 dark:text-zinc-200 font-mono font-bold">{patient.mrn}</p>
                        </div>
                        <div>
                          <p className="text-zinc-455 dark:text-zinc-500 font-bold">PHONE</p>
                          <p className="text-zinc-800 dark:text-zinc-200 font-bold">{patient.currentPhoneNumber || '—'}</p>
                        </div>
                        <div>
                          <p className="text-zinc-455 dark:text-zinc-500 font-bold">DOB / GENDER</p>
                          <p className="text-zinc-800 dark:text-zinc-200 font-bold">{formatDate(patient.dateOfBirth)} ({patient.gender})</p>
                        </div>
                      </div>

                      {/* Source/Duplicate (Merge & Delete) */}
                      <div className="border border-red-500/25 bg-red-500/5 p-5 rounded-xl text-xxs space-y-3 animate-slideIn shadow-inner">
                        <span className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded leading-none">
                          Duplicate Profile (Delete)
                        </span>
                        <div>
                          <p className="text-zinc-455 dark:text-zinc-500 font-bold">NAME</p>
                          <p className="text-zinc-800 dark:text-zinc-200 font-bold text-xs">{selectedDuplicate.firstName} {selectedDuplicate.lastName}</p>
                        </div>
                        <div>
                          <p className="text-zinc-455 dark:text-zinc-500 font-bold">MRN</p>
                          <p className="text-zinc-800 dark:text-zinc-200 font-mono font-bold">{selectedDuplicate.mrn}</p>
                        </div>
                        <div>
                          <p className="text-zinc-455 dark:text-zinc-500 font-bold">PHONE</p>
                          <p className="text-zinc-800 dark:text-zinc-200 font-bold">{selectedDuplicate.currentPhoneNumber || '—'}</p>
                        </div>
                        <div>
                          <p className="text-zinc-455 dark:text-zinc-500 font-bold">DOB / GENDER</p>
                          <p className="text-zinc-800 dark:text-zinc-200 font-bold">{formatDate(selectedDuplicate.dateOfBirth)} ({selectedDuplicate.gender})</p>
                        </div>
                      </div>
                    </div>

                    {/* Merge Preview Counts */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-900/25 border border-zinc-200 dark:border-zinc-850 p-5 rounded-xl space-y-3">
                      <h5 className="font-bold text-zinc-700 dark:text-zinc-300">Merge Migration Preview</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xxs">
                        <div className="bg-white dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-850 text-center shadow-sm">
                          <p className="text-zinc-400 dark:text-zinc-500 font-semibold mb-1">Visits</p>
                          <p className="text-synos-primary font-bold text-lg">{mergePreview.visitsToMove}</p>
                        </div>
                        <div className="bg-white dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-850 text-center shadow-sm">
                          <p className="text-zinc-400 dark:text-zinc-500 font-semibold mb-1">Samples</p>
                          <p className="text-synos-primary font-bold text-lg">{mergePreview.samplesToMove}</p>
                        </div>
                        <div className="bg-white dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-850 text-center shadow-sm">
                          <p className="text-zinc-400 dark:text-zinc-500 font-semibold mb-1">Phone History</p>
                          <p className="text-synos-primary font-bold text-lg">{mergePreview.phoneHistoryToMove}</p>
                        </div>
                        <div className="bg-white dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-850 text-center shadow-sm">
                          <p className="text-zinc-400 dark:text-zinc-500 font-semibold mb-1">Referrer Links</p>
                          <p className="text-synos-primary font-bold text-lg">{mergePreview.referrerLinksToMove}</p>
                        </div>
                      </div>
                      <p className="text-zinc-500 text-[10px] leading-tight pt-2">
                        All records, transactions, samples, and phone history links belonging to the duplicate profile will be transactionally moved to the survivor profile. The duplicate profile will be permanently deleted.
                      </p>
                    </div>

                    {/* Checkbox and Action */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-850 p-5 rounded-xl space-y-4">
                      <label className="flex items-start space-x-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={mergeConfirmed}
                          onChange={e => setMergeConfirmed(e.target.checked)}
                          className="form-checkbox h-4.5 w-4.5 text-synos-primary rounded bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 focus:ring-0 mt-0.5 cursor-pointer"
                        />
                        <span className="font-semibold text-zinc-650 dark:text-zinc-300 text-xxs leading-snug">
                          I confirm that I have verified the demographics of both patient files. I authorize SynOS to permanently merge the duplicate profile into the survivor profile. This operation is irreversible.
                        </span>
                      </label>

                      <div className="flex justify-end">
                        <button
                          onClick={handleExecuteMerge}
                          disabled={!mergeConfirmed}
                          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl active:scale-95 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-red-650/15"
                        >
                          <Merge className="w-4 h-4" />
                          Execute Profile Merge
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center p-12 border border-dashed border-zinc-250 dark:border-zinc-850 rounded-xl bg-zinc-50/20 dark:bg-zinc-900/10">
                    <div className="text-center">
                      <Info className="w-10 h-10 text-zinc-400 dark:text-zinc-500 mx-auto mb-2" />
                      <p className="text-zinc-500 dark:text-zinc-400 font-semibold text-xxs uppercase tracking-wider">No duplicate candidate selected</p>
                      <p className="text-zinc-400 dark:text-zinc-500 text-[10px] mt-1 max-w-xs leading-normal">
                        Select a potential matching patient from the duplicate candidates list on the left to verify details and configure profile merge settings.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
