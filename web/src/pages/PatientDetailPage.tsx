import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import dayjs from 'dayjs';

interface Patient {
  patientId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  currentPhoneNumber: string;
  dateOfBirth: string;
  gender: string;
}

interface PhoneHistory {
  phoneHistoryId: string;
  phoneNumber: string;
  startDate: string;
  endDate: string | null;
}

interface Visit {
  visitId: string;
  tokenNumber: string;
  tokenDate: string;
  status: string;
  totalAmount: number;
  amountPaid: number;
  outstandingBalance: number;
  tests: {
    orderId: string;
    testCode: string;
    testName: string;
    status: string;
  }[];
}

interface InvoiceLedger {
  invoiceId: string;
  invoiceNumber: string;
  grossAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  createdAt: string;
}

interface PaymentLedger {
  paymentId: string;
  receiptNumber: string;
  amount: number;
  paymentMode: string;
  receivedByUserId: string;
  createdAt: string;
}

interface DuplicatePatient {
  patientId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  currentPhoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  matchPercentage: number;
}

interface MergePreview {
  visitsToMove: number;
  samplesToMove: number;
  phoneHistoryToMove: number;
  aliasesToMove: number;
  referrerLinksToMove: number;
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'visits' | 'ledger' | 'merge'>('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Core Patient States
  const [patient, setPatient] = useState<Patient | null>(null);
  const [phoneHistory, setPhoneHistory] = useState<PhoneHistory[]>([]);
  const [isEditingDemographics, setIsEditingDemographics] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Patient>>({});

  // Visits State
  const [visits, setVisits] = useState<Visit[]>([]);

  // Financial Ledger State
  const [invoices, setInvoices] = useState<InvoiceLedger[]>([]);
  const [payments, setPayments] = useState<PaymentLedger[]>([]);

  // Merge Panel State
  const [duplicates, setDuplicates] = useState<DuplicatePatient[]>([]);
  const [selectedDuplicate, setSelectedDuplicate] = useState<DuplicatePatient | null>(null);
  const [mergePreview, setMergePreview] = useState<MergePreview | null>(null);
  const [mergeConfirmed, setMergeConfirmed] = useState(false);

  const fetchPatientData = async () => {
    setLoading(true);
    setError(null);
    try {
      const patientRes = await apiClient.get(`/patients/${id}`);
      setPatient(patientRes.data);
      setEditForm(patientRes.data);
      
      const phoneRes = await apiClient.get(`/patients/${id}/phone-history`);
      setPhoneHistory(phoneRes.data);
    } catch (err: any) {
      setError('Failed to fetch patient demographic data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchVisits = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/patients/${id}/visits`);
      setVisits(response.data);
    } catch (err) {
      setError('Failed to load visit history.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancials = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/patients/${id}/financials`);
      setInvoices(response.data.invoices);
      setPayments(response.data.payments);
    } catch (err) {
      setError('Failed to load financial records ledger.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/patients/${id}/possible-duplicates`);
      setDuplicates(response.data);
    } catch (err) {
      setError('Failed to query duplicate candidates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
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
    }
  }, [id, activeTab]);

  const handleDemographicsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !patient) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await apiClient.put(`/patients/${id}`, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        currentPhoneNumber: editForm.currentPhoneNumber,
        dateOfBirth: editForm.dateOfBirth,
        gender: editForm.gender
      });
      setPatient(response.data);
      setIsEditingDemographics(false);
      setSuccess('Demographics details updated successfully.');
      const phoneRes = await apiClient.get(`/patients/${id}/phone-history`);
      setPhoneHistory(phoneRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error updating patient demographics.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMergePreview = async (dup: DuplicatePatient) => {
    setLoading(true);
    setError(null);
    try {
      // Get detailed demographic summary of the duplicate candidate
      const dupDetail = await apiClient.get(`/patients/${dup.patientId}`);
      setSelectedDuplicate({ ...dup, ...dupDetail.data });

      const response = await apiClient.post('/patients/merge-preview', {
        targetId: id,
        sourceId: dup.patientId
      });
      setMergePreview(response.data);
      setMergeConfirmed(false);
    } catch (err) {
      setError('Failed to fetch merge projection details.');
    } finally {
      setLoading(false);
    }
  };

  const executeMerge = async () => {
    if (!selectedDuplicate || !id) return;
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/patients/merge', {
        targetId: id,
        sourceId: selectedDuplicate.patientId
      });
      setSuccess(`Merge successful! Patient '${selectedDuplicate.firstName} ${selectedDuplicate.lastName}' has been merged into this profile.`);
      setSelectedDuplicate(null);
      setMergePreview(null);
      setActiveTab('profile');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Merge action failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!patient && loading && activeTab === 'profile') {
    return <div className="text-center py-12 text-textSecondary font-semibold">Loading Patient File...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 text-textPrimary">
      {/* Patient Header Block */}
      {patient && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center bg-opacity-80 backdrop-blur-md">
          <div>
            <div className="flex items-center space-x-3.5 mb-2">
              <span className="bg-blue-600/30 text-blue-300 border border-blue-500/20 text-xxs font-bold px-2.5 py-0.5 rounded-full font-mono">
                {patient.mrn}
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight">
                {patient.firstName} {patient.lastName}
              </h1>
            </div>
            <p className="text-textSecondary text-xs">
              Registered Patient File • Gender: <strong>{patient.gender}</strong> • DOB: <strong>{dayjs(patient.dateOfBirth).format('MMM D, YYYY')}</strong>
            </p>
          </div>
          <button
            onClick={() => navigate('/patients')}
            className="mt-4 md:mt-0 px-4 py-2 border border-border hover:bg-elevated/45 text-textSecondary hover:text-textPrimary rounded-lg text-xs font-semibold transition-all"
          >
            ← Back to Directory
          </button>
        </div>
      )}

      {/* Success/Error Alerts */}
      {success && (
        <div className="mb-6 p-4 rounded-lg bg-success bg-opacity-20 border border-success text-success flex justify-between items-center transition-all animate-fadeIn">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-success hover:font-bold">×</button>
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-error bg-opacity-20 border border-error text-error flex justify-between items-center transition-all animate-fadeIn">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-error hover:font-bold">×</button>
        </div>
      )}

      {/* Tab Selectors */}
      <div className="flex border-b border-border mb-8 space-x-2">
        {(
          [
            { id: 'profile', label: 'Demographics & History' },
            { id: 'visits', label: 'Visits Record' },
            { id: 'ledger', label: 'Financial Ledger' },
            { id: 'merge', label: 'Deduplication & Merge' }
          ] as const
        ).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 font-semibold text-sm rounded-t-lg transition-all duration-200 border-t border-x -mb-[1px] ${
              activeTab === tab.id
                ? 'bg-card border-border text-activeTab border-b-background shadow-md'
                : 'border-transparent text-textSecondary hover:text-textPrimary hover:bg-elevated/45'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="bg-card border border-border rounded-xl p-8 shadow-2xl backdrop-blur-md bg-opacity-80">
        
        {/* PROFILE & DEMOGRAPHICS */}
        {activeTab === 'profile' && patient && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-lg font-bold text-blue-400">Demographic Records & Contact History</h3>
              {!isEditingDemographics && (
                <button
                  onClick={() => {
                    setEditForm(patient);
                    setIsEditingDemographics(true);
                  }}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
                >
                  Edit Demographics
                </button>
              )}
            </div>

            {isEditingDemographics ? (
              <form onSubmit={handleDemographicsUpdate} className="space-y-4 max-w-xl">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xxs font-bold text-textSecondary mb-1">FIRST NAME</label>
                    <input
                      type="text"
                      required
                      value={editForm.firstName || ''}
                      onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                      className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-textSecondary mb-1">LAST NAME</label>
                    <input
                      type="text"
                      required
                      value={editForm.lastName || ''}
                      onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                      className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xxs font-bold text-textSecondary mb-1">GENDER</label>
                    <select
                      value={editForm.gender || 'Male'}
                      onChange={e => setEditForm({ ...editForm, gender: e.target.value })}
                      className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-textSecondary mb-1">DATE OF BIRTH</label>
                    <input
                      type="date"
                      required
                      value={editForm.dateOfBirth ? dayjs(editForm.dateOfBirth).format('YYYY-MM-DD') : ''}
                      onChange={e => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                      className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xxs font-bold text-textSecondary mb-1">PHONE NUMBER</label>
                  <input
                    type="text"
                    required
                    value={editForm.currentPhoneNumber || ''}
                    onChange={e => setEditForm({ ...editForm, currentPhoneNumber: e.target.value })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm outline-none"
                  />
                </div>
                <div className="flex space-x-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsEditingDemographics(false)}
                    className="px-4 py-2 border border-border hover:bg-elevated/45 text-textSecondary text-xs rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg"
                  >
                    Update Demographic Record
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Visual Cards */}
                <div className="bg-elevated/10 border border-border rounded-2xl p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xxs font-bold text-textSecondary">MRN NUMBER</p>
                      <p className="font-mono text-sm font-bold text-indigo-300 mt-1">{patient.mrn}</p>
                    </div>
                    <div>
                      <p className="text-xxs font-bold text-textSecondary">GENDER</p>
                      <p className="text-sm font-semibold mt-1">{patient.gender}</p>
                    </div>
                    <div>
                      <p className="text-xxs font-bold text-textSecondary">DATE OF BIRTH</p>
                      <p className="text-sm font-semibold mt-1">
                        {dayjs(patient.dateOfBirth).format('MMM D, YYYY')} ({dayjs().diff(dayjs(patient.dateOfBirth), 'year')} years)
                      </p>
                    </div>
                    <div>
                      <p className="text-xxs font-bold text-textSecondary">PRIMARY PHONE</p>
                      <p className="text-sm font-semibold mt-1 font-mono">{patient.currentPhoneNumber}</p>
                    </div>
                  </div>
                </div>

                {/* Contact History */}
                <div>
                  <h4 className="text-sm font-bold uppercase text-textSecondary tracking-wider mb-3">Phone Number Audit Log</h4>
                  <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
                    {phoneHistory.map(ph => (
                      <div key={ph.phoneHistoryId} className="p-3.5 text-xs flex justify-between items-center bg-elevated/5">
                        <span className="font-mono font-bold text-textPrimary">{ph.phoneNumber}</span>
                        <span className="text-textSecondary font-semibold">
                          {dayjs(ph.startDate).format('MMM DD, YYYY')} – {ph.endDate ? dayjs(ph.endDate).format('MMM DD, YYYY') : 'Present'}
                        </span>
                      </div>
                    ))}
                    {phoneHistory.length === 0 && (
                      <p className="text-xs text-textSecondary p-4">No historical numbers recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VISITS HISTORY RECORD */}
        {activeTab === 'visits' && (
          <div className="animate-fadeIn space-y-6">
            <h3 className="text-lg font-bold border-b border-border pb-3 text-blue-400">Chronological Lab Visits</h3>
            <div className="space-y-6">
              {visits.map(v => (
                <div key={v.visitId} className="border border-border rounded-2xl p-6 bg-elevated/15 space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                    <div>
                      <div className="flex items-center space-x-3 mb-1">
                        <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                          Visit #{v.tokenNumber}
                        </span>
                        <span className={`text-xxs uppercase font-extrabold px-2 py-0.5 rounded-full ${
                          v.status === 'Finalized' ? 'bg-success bg-opacity-20 text-success' : 'bg-warning bg-opacity-20 text-warning'
                        }`}>
                          {v.status}
                        </span>
                      </div>
                      <p className="text-xxs text-textSecondary font-mono">
                        Date: {dayjs(v.tokenDate).format('YYYY-MM-DD HH:mm A')}
                      </p>
                    </div>
                    <div className="mt-2 md:mt-0 text-right">
                      <p className="text-xs text-textSecondary">Outstanding Balance</p>
                      <p className={`text-sm font-bold ${v.outstandingBalance > 0 ? 'text-error' : 'text-success'}`}>
                        ${v.outstandingBalance.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
                    {v.tests.map(t => (
                      <div key={t.orderId} className="p-3 text-xs flex justify-between items-center bg-card/60">
                        <div>
                          <span className="font-semibold">{t.testName}</span>
                          <span className="ml-2 font-mono text-xxs text-textSecondary font-bold">({t.testCode})</span>
                        </div>
                        <span className={`text-xxs font-bold px-2 py-0.5 rounded ${
                          t.status === 'Completed' || t.status === 'Resulted'
                            ? 'bg-success/20 text-success'
                            : t.status === 'Collected'
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'bg-elevated text-textSecondary border border-border'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {visits.length === 0 && (
                <p className="text-textSecondary text-sm py-4">No visits registered on file for this patient.</p>
              )}
            </div>
          </div>
        )}

        {/* FINANCIAL LEDGER */}
        {activeTab === 'ledger' && (
          <div className="animate-fadeIn space-y-10">
            {/* Invoices */}
            <div>
              <h3 className="text-lg font-bold border-b border-border pb-3 text-blue-400 mb-6">Patient Invoices Directory</h3>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="min-w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-elevated/60 border-b border-border">
                      <th className="p-4 font-bold text-textSecondary">Invoice Date</th>
                      <th className="p-4 font-bold text-textSecondary">Invoice ID</th>
                      <th className="p-4 font-bold text-textSecondary">Gross Amount</th>
                      <th className="p-4 font-bold text-textSecondary">Discount</th>
                      <th className="p-4 font-bold text-textSecondary">Tax</th>
                      <th className="p-4 font-bold text-textSecondary">Net Total</th>
                      <th className="p-4 font-bold text-textSecondary">Paid</th>
                      <th className="p-4 font-bold text-textSecondary">Outstanding</th>
                      <th className="p-4 font-bold text-center text-textSecondary">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoices.map(inv => (
                      <tr key={inv.invoiceId} className="hover:bg-elevated/20 transition-colors">
                        <td className="p-4 text-textSecondary font-mono">{dayjs(inv.createdAt).format('YYYY-MM-DD')}</td>
                        <td className="p-4 font-mono font-bold text-indigo-300 uppercase">{inv.invoiceNumber}</td>
                        <td className="p-4">${inv.grossAmount.toFixed(2)}</td>
                        <td className="p-4 text-error">-${inv.discountAmount.toFixed(2)}</td>
                        <td className="p-4">${inv.taxAmount.toFixed(2)}</td>
                        <td className="p-4 font-semibold">${inv.totalAmount.toFixed(2)}</td>
                        <td className="p-4 text-success">${inv.paidAmount.toFixed(2)}</td>
                        <td className={`p-4 font-semibold ${inv.outstandingAmount > 0 ? 'text-error' : 'text-success'}`}>
                          ${inv.outstandingAmount.toFixed(2)}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-xxs font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            inv.status === 'Paid' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-textSecondary text-sm font-semibold">
                          No invoice records loaded for this patient.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payments received */}
            <div>
              <h3 className="text-lg font-bold border-b border-border pb-3 text-blue-400 mb-6">Payment Receipts</h3>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="min-w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-elevated/60 border-b border-border">
                      <th className="p-4 font-bold text-textSecondary">Receipt Date</th>
                      <th className="p-4 font-bold text-textSecondary">Receipt Number</th>
                      <th className="p-4 font-bold text-textSecondary">Payment Mode</th>
                      <th className="p-4 font-bold text-textSecondary">Receiver ID</th>
                      <th className="p-4 font-bold text-textSecondary">Amount Collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map(p => (
                      <tr key={p.paymentId} className="hover:bg-elevated/20 transition-colors">
                        <td className="p-4 text-textSecondary font-mono">{dayjs(p.createdAt).format('YYYY-MM-DD HH:mm')}</td>
                        <td className="p-4 font-mono font-bold text-indigo-300">{p.receiptNumber}</td>
                        <td className="p-4 uppercase">{p.paymentMode}</td>
                        <td className="p-4 font-mono text-textSecondary">{p.receivedByUserId}</td>
                        <td className="p-4 font-bold text-success">${p.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-textSecondary text-sm font-semibold">
                          No payment receipts found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PATIENT DEDUPLICATION & MERGE PANEL */}
        {activeTab === 'merge' && (
          <div className="animate-fadeIn space-y-8">
            <div>
              <h3 className="text-lg font-bold text-blue-400">Patient Merge & Registry Deduplication</h3>
              <p className="text-textSecondary text-xs">Verify similar demographic signatures. Merge overlapping duplicates into a single record.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Duplicate List Candidates */}
              <div className="lg:col-span-1 border border-border rounded-2xl p-5 space-y-4 bg-elevated/5">
                <h4 className="text-xs font-bold uppercase text-textSecondary mb-3">Identified Candidates</h4>
                <div className="space-y-3">
                  {duplicates.map(dup => (
                    <button
                      key={dup.patientId}
                      onClick={() => handleLoadMergePreview(dup)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        selectedDuplicate?.patientId === dup.patientId
                          ? 'border-indigo-500 bg-indigo-500/10 shadow'
                          : 'border-border bg-card/60 hover:bg-elevated/25'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-bold text-sm text-textPrimary">{dup.firstName} {dup.lastName}</h5>
                        <span className="bg-amber-500/20 text-amber-300 text-xxs font-extrabold px-1.5 py-0.5 rounded">
                          {dup.matchPercentage}% Match
                        </span>
                      </div>
                      <p className="text-xxs font-mono text-textSecondary">MRN: {dup.mrn}</p>
                    </button>
                  ))}
                  {duplicates.length === 0 && (
                    <p className="text-xs text-textSecondary">No potential duplicates found for this profile.</p>
                  )}
                </div>
              </div>

              {/* Side-by-Side Merge comparison & preview impact */}
              <div className="lg:col-span-2 space-y-6">
                {selectedDuplicate && mergePreview && patient && (
                  <div className="border border-border rounded-2xl p-6 bg-elevated/10 space-y-6 animate-fadeIn">
                    <h4 className="text-sm font-bold text-indigo-400">Side-by-Side Verification</h4>
                    
                    <div className="grid grid-cols-2 gap-4 border border-border rounded-xl overflow-hidden divide-x divide-border">
                      {/* Target (Keep) */}
                      <div className="p-4 bg-indigo-500/5">
                        <span className="bg-indigo-600/30 text-indigo-300 text-xxs font-bold px-2 py-0.5 rounded">TARGET (KEEPS)</span>
                        <div className="mt-3 space-y-2">
                          <p className="font-bold text-sm">{patient.firstName} {patient.lastName}</p>
                          <p className="text-xs text-textSecondary font-mono">MRN: {patient.mrn}</p>
                          <p className="text-xs text-textSecondary">Gender: {patient.gender}</p>
                          <p className="text-xs text-textSecondary">DOB: {dayjs(patient.dateOfBirth).format('MMM D, YYYY')}</p>
                          <p className="text-xs text-textSecondary font-mono">Phone: {patient.currentPhoneNumber}</p>
                        </div>
                      </div>

                      {/* Source (Delete) */}
                      <div className="p-4 bg-red-500/5">
                        <span className="bg-red-600/30 text-red-300 text-xxs font-bold px-2 py-0.5 rounded">SOURCE (DELETED)</span>
                        <div className="mt-3 space-y-2">
                          <p className="font-bold text-sm">{selectedDuplicate.firstName} {selectedDuplicate.lastName}</p>
                          <p className="text-xs text-textSecondary font-mono">MRN: {selectedDuplicate.mrn}</p>
                          <p className="text-xs text-textSecondary">Gender: {selectedDuplicate.gender}</p>
                          <p className="text-xs text-textSecondary">DOB: {dayjs(selectedDuplicate.dateOfBirth).format('MMM D, YYYY')}</p>
                          <p className="text-xs text-textSecondary font-mono">Phone: {selectedDuplicate.currentPhoneNumber}</p>
                        </div>
                      </div>
                    </div>

                    {/* Preview details */}
                    <div className="bg-elevated/20 border border-border rounded-xl p-5 space-y-3">
                      <h5 className="font-bold text-xs uppercase text-textSecondary tracking-wider">Preview Merge Operations</h5>
                      <p className="text-xs">Merging the source profile into the target profile will permanently move:</p>
                      <ul className="text-xs space-y-1.5 list-disc pl-5 text-textSecondary">
                        <li><strong>{mergePreview.visitsToMove}</strong> Visits</li>
                        <li><strong>{mergePreview.samplesToMove}</strong> Samples</li>
                        <li><strong>{mergePreview.phoneHistoryToMove}</strong> Phone records</li>
                        <li><strong>{mergePreview.aliasesToMove}</strong> Aliases & demographic aliases</li>
                        <li><strong>{mergePreview.referrerLinksToMove}</strong> Referral links</li>
                      </ul>
                    </div>

                    {/* Confirmation Checkbox */}
                    <div className="pt-4 border-t border-border space-y-4">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mergeConfirmed}
                          onChange={e => setMergeConfirmed(e.target.checked)}
                          className="form-checkbox h-5 w-5 text-indigo-500 rounded bg-inputBackground border-border focus:ring-0 mt-0.5"
                        />
                        <span className="text-xs font-semibold text-textSecondary">
                          I verify that these profiles represent the same physical patient and authorize the permanent transfer of records. This action cannot be reversed.
                        </span>
                      </label>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={!mergeConfirmed}
                          onClick={executeMerge}
                          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:opacity-40 text-white text-xs font-bold rounded-lg shadow-lg disabled:cursor-not-allowed transition-all"
                        >
                          Execute Merge Now
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {!selectedDuplicate && (
                  <div className="text-center py-16 border border-dashed border-border rounded-2xl text-textSecondary text-sm font-semibold">
                    Select a duplicate patient candidate on the left to review comparison.
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
