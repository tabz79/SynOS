import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  History
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

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
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Demographic & Phone History
  const [patient, setPatient] = useState(null);
  const [phoneHistory, setPhoneHistory] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

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
    if (activeTab === 'visits') fetchVisits();
    if (activeTab === 'ledger') fetchFinancials();
    if (activeTab === 'merge') {
      fetchDuplicates();
      setSelectedDuplicate(null);
      setMergePreview(null);
      setMergeConfirmed(false);
    }
  }, [id, activeTab]);

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
          onClick={() => navigate('/admin/patients')}
          className="p-2 border border-zinc-250 dark:border-zinc-850 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all shadow-sm shadow-black/5 active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
        </button>
        {patient && (
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] font-semibold text-synos-primary bg-synos-primary/10 px-2 py-0.5 rounded border border-synos-primary/20 uppercase tracking-wider">
                {patient.mrn}
              </span>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-850 dark:text-zinc-100">
                {patient.firstName} {patient.lastName}
              </h1>
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
          { id: 'visits', label: 'Visits Record', icon: FileText },
          { id: 'ledger', label: 'Financial Ledger', icon: DollarSign },
          { id: 'merge', label: 'Deduplication & Merge', icon: Merge }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 -mb-px ${
              activeTab === tab.id
                ? 'border-synos-primary text-synos-primary'
                : 'border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Box */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900/60 rounded-2xl p-8 shadow-sm" style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}>
        {loading && <div className="text-center py-12 text-zinc-500 font-bold uppercase tracking-widest text-xs">Accessing clinical index...</div>}

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
                      "p-4 rounded-xl border transition-all duration-200 cursor-pointer text-xxs flex flex-col justify-between hover:scale-[1.01] shadow-sm",
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
