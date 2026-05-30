import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';
import dayjs from 'dayjs';

interface LabProfile {
  labProfileId: string;
  name: string;
  tagline: string;
  address: string;
  email: string;
  website: string;
  phone: string;
  accreditation: string;
  headerLogoUrl: string;
  watermarkUrl: string;
  footerDisclaimer: string;
  headerHeightMm: number;
  footerMarginMm: number;
  showWatermark: boolean;
  showHeaderOnReports: boolean;
  showDigitalSignatures: boolean;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  defaultTaxPercent: number;
  enableQrPayment: boolean;
  upiId: string;
  smsGatewayProvider: string;
  smsApiKey: string;
  whatsAppGatewayUrl: string;
  whatsAppApiKey: string;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword?: string;
  smtpEnableSsl: boolean;
  smtpSenderEmail: string;
  smtpSenderName: string;
  backupEnabled: boolean;
  backupFrequency: string;
  backupTime: string;
  backupPath: string;
}

interface Role {
  roleId: string;
  name: string;
}

interface Capability {
  capabilityId: string;
  name: string;
  module: string;
  action: string;
}

interface Mapping {
  roleId: string;
  capabilityId: string;
}

interface Department {
  departmentId: string;
  code: string;
  name: string;
  macroDepartment: string;
  isActive: boolean;
}

interface Policy {
  configId: string;
  roleName: string;
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  operatingHoursStart: string;
  operatingHoursEnd: string;
  defaultTATHours: number;
  canSearchAll: boolean;
}

interface AuditLog {
  auditId: string;
  actorUserId: string;
  actorName: string;
  actorUsername: string;
  action: string;
  resourceType: string;
  resourceId: string;
  payload: any;
  createdAt: string;
}

interface Discount {
  discountDefinitionId: string;
  code: string;
  name: string;
  type: number; // 0: Percentage, 1: Flat
  value: number;
  maxLimit?: number;
  isActive: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

interface ReferralPartner {
  referralPartnerId: string;
  name: string;
  partnerType: number; // 0: Doctor, 1: Clinic, 2: Hospital
  contactInfo?: string;
  defaultCommissionPercentage: number;
  calculationBase: number; // 0: BeforeDiscounts, 1: AfterDiscounts
  status: number;
  paymentCollectionModel?: string;
  isActive: boolean;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'settings' | 'permissions' | 'departments' | 'pricing' | 'audit'>('settings');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Global Settings State
  const [settings, setSettings] = useState<LabProfile | null>(null);

  // Roles & Permissions Matrix State
  const [roles, setRoles] = useState<Role[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);

  // Department Policies State
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [editingPolicy, setEditingPolicy] = useState<Partial<Policy> | null>(null);
  const [showPolicyForm, setShowPolicyForm] = useState(false);

  // Pricing & Discounts State
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [partners, setPartners] = useState<ReferralPartner[]>([]);
  const [editingDiscount, setEditingDiscount] = useState<Partial<Discount> | null>(null);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partial<ReferralPartner> | null>(null);
  const [showPartnerForm, setShowPartnerForm] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLimit] = useState(15);
  const [auditOffset, setAuditOffset] = useState(0);
  const [users, setUsers] = useState<{ userId: string; name: string }[]>([]);
  const [selectedActor, setSelectedActor] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLogPayload, setSelectedLogPayload] = useState<any | null>(null);

  // Load Settings Tab
  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/admin/settings');
      setSettings(response.data);
    } catch (err: any) {
      setSaveError(err.response?.data?.message || 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  // Load Permissions Matrix
  const loadPermissions = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/admin/roles/matrix');
      setRoles(response.data.roles);
      setCapabilities(response.data.capabilities);
      setMappings(response.data.mappings);
    } catch (err: any) {
      setSaveError('Failed to load capabilities matrix.');
    } finally {
      setLoading(false);
    }
  };

  // Load Department Policies & Departments
  const loadDepartmentPolicies = async () => {
    setLoading(true);
    try {
      const [policiesRes, deptsRes] = await Promise.all([
        apiClient.get('/admin/roles/department-policies'),
        apiClient.get('/admin/departments')
      ]);
      setPolicies(policiesRes.data);
      setDepartments(deptsRes.data);
    } catch (err: any) {
      setSaveError('Failed to load department configuration.');
    } finally {
      setLoading(false);
    }
  };

  // Load Pricing Rules
  const loadPricingData = async () => {
    setLoading(true);
    try {
      const [discountsRes, partnersRes] = await Promise.all([
        apiClient.get('/admin/discounts'),
        apiClient.get('/admin/referral-partners')
      ]);
      setDiscounts(discountsRes.data);
      setPartners(partnersRes.data);
    } catch (err: any) {
      setSaveError('Failed to load discounts and pricing.');
    } finally {
      setLoading(false);
    }
  };

  // Load Audit Logs
  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      let query = `?limit=${auditLimit}&offset=${auditOffset}`;
      if (selectedActor) query += `&actorUserId=${selectedActor}`;
      if (selectedResourceType) query += `&resourceType=${selectedResourceType}`;
      if (selectedAction) query += `&action=${selectedAction}`;
      if (startDate) query += `&startDate=${dayjs(startDate).toISOString()}`;
      if (endDate) query += `&endDate=${dayjs(endDate).toISOString()}`;

      const response = await apiClient.get(`/admin/audit-logs${query}`);
      setAuditLogs(response.data.logs);
      setAuditTotal(response.data.totalCount);

      // Fetch users once for filtering dropdown
      if (users.length === 0) {
        const usersRes = await apiClient.get('/admin/users');
        setUsers(usersRes.data);
      }
    } catch (err: any) {
      setSaveError('Failed to load audit history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSaveError(null);
    setSaveSuccess(null);
    if (activeTab === 'settings') loadSettings();
    if (activeTab === 'permissions') loadPermissions();
    if (activeTab === 'departments') loadDepartmentPolicies();
    if (activeTab === 'pricing') loadPricingData();
    if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab, auditOffset]);

  // Handle Settings Submit
  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setLoading(true);
    setSaveSuccess(null);
    setSaveError(null);
    try {
      await apiClient.put('/admin/settings', settings);
      setSaveSuccess('Global system configuration successfully updated.');
    } catch (err: any) {
      setSaveError(err.response?.data?.message || 'Error occurred while saving configurations.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Capability mapping
  const togglePermission = async (roleId: string, capabilityId: string) => {
    const isMapped = mappings.some(m => m.roleId === roleId && m.capabilityId === capabilityId);
    let updatedCapabilityIds: string[] = [];

    if (isMapped) {
      // Remove
      updatedCapabilityIds = mappings
        .filter(m => m.roleId === roleId && m.capabilityId !== capabilityId)
        .map(m => m.capabilityId);
    } else {
      // Add
      updatedCapabilityIds = [
        ...mappings.filter(m => m.roleId === roleId).map(m => m.capabilityId),
        capabilityId
      ];
    }

    try {
      await apiClient.post('/admin/roles/matrix', {
        roleId,
        capabilityIds: updatedCapabilityIds
      });
      // reload matrix locally
      setMappings(prev => {
        if (isMapped) {
          return prev.filter(m => !(m.roleId === roleId && m.capabilityId === capabilityId));
        } else {
          return [...prev, { roleId, capabilityId }];
        }
      });
    } catch (err) {
      setSaveError('Error occurred updating capabilities.');
    }
  };

  // Save/Delete Department Policy config
  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy) return;
    setLoading(true);
    try {
      await apiClient.post('/admin/roles/department-policies', editingPolicy);
      setShowPolicyForm(false);
      setEditingPolicy(null);
      setSaveSuccess('Department operating config saved.');
      loadDepartmentPolicies();
    } catch (err: any) {
      setSaveError(err.response?.data?.message || 'Conflict mapping or invalid database payload.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    setLoading(true);
    try {
      await apiClient.delete(`/admin/roles/department-policies/${id}`);
      setSaveSuccess('Config policy deleted.');
      loadDepartmentPolicies();
    } catch (err) {
      setSaveError('Error deleting mapping.');
    } finally {
      setLoading(false);
    }
  };

  // Save/Update Discount
  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDiscount) return;
    setLoading(true);
    try {
      if (editingDiscount.discountDefinitionId) {
        await apiClient.put(`/admin/discounts/${editingDiscount.discountDefinitionId}`, editingDiscount);
      } else {
        await apiClient.post('/admin/discounts', editingDiscount);
      }
      setShowDiscountForm(false);
      setEditingDiscount(null);
      setSaveSuccess('Discount record saved.');
      loadPricingData();
    } catch (err: any) {
      setSaveError(err.response?.data?.message || 'Error occurred saving discount rules.');
    } finally {
      setLoading(false);
    }
  };

  // Save/Update Referral Partner
  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;
    setLoading(true);
    try {
      if (editingPartner.referralPartnerId) {
        await apiClient.put(`/admin/referral-partners/${editingPartner.referralPartnerId}`, editingPartner);
      } else {
        await apiClient.post('/admin/referral-partners', editingPartner);
      }
      setShowPartnerForm(false);
      setEditingPartner(null);
      setSaveSuccess('Referral partner details saved.');
      loadPricingData();
    } catch (err: any) {
      setSaveError(err.response?.data?.message || 'Error saving referral details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivatePartner = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this referral partner?')) return;
    setLoading(true);
    try {
      await apiClient.delete(`/admin/referral-partners/${id}`);
      setSaveSuccess('Partner successfully deactivated.');
      loadPricingData();
    } catch (err) {
      setSaveError('Deactivation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 text-textPrimary">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Admin Configuration Dashboard
          </h1>
          <p className="text-textSecondary mt-1 text-sm">
            Manage system profiles, security matrices, department access, pricing configurations, and audit logs.
          </p>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {saveSuccess && (
        <div className="mb-6 p-4 rounded-lg bg-success bg-opacity-20 border border-success text-success flex justify-between items-center transition-all animate-fadeIn">
          <span>{saveSuccess}</span>
          <button onClick={() => setSaveSuccess(null)} className="text-success hover:font-bold">×</button>
        </div>
      )}
      {saveError && (
        <div className="mb-6 p-4 rounded-lg bg-error bg-opacity-20 border border-error text-error flex justify-between items-center transition-all animate-fadeIn">
          <span>{saveError}</span>
          <button onClick={() => setSaveError(null)} className="text-error hover:font-bold">×</button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap border-b border-border mb-8 space-x-2">
        {(
          [
            { id: 'settings', label: 'System Configuration' },
            { id: 'permissions', label: 'Roles Matrix' },
            { id: 'departments', label: 'Department Hours' },
            { id: 'pricing', label: 'Pricing & Discounts' },
            { id: 'audit', label: 'Audit Logs' }
          ] as const
        ).map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setAuditOffset(0);
            }}
            className={`px-6 py-3 font-semibold text-sm rounded-t-lg transition-all duration-200 border-t border-x -mb-[1px] ${
              activeTab === tab.id
                ? 'bg-card border-border text-activeTab border-b-background shadow-md'
                : 'border-transparent text-textSecondary hover:text-textPrimary hover:bg-elevated/45'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="bg-card border border-border rounded-xl p-8 shadow-2xl backdrop-blur-md bg-opacity-80">
        {loading && <div className="text-center py-12 text-textSecondary font-medium">Loading system configurations...</div>}

        {/* SYSTEM CONFIGURATION TAB */}
        {activeTab === 'settings' && settings && !loading && (
          <form onSubmit={handleSettingsSubmit} className="space-y-8 animate-fadeIn">
            {/* Lab Branding */}
            <div>
              <h3 className="text-lg font-semibold border-b border-border pb-2 mb-6 text-blue-400">
                1. Laboratory Profile & Print Branding
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">LAB NAME</label>
                  <input
                    type="text"
                    required
                    value={settings.name}
                    onChange={e => setSettings({ ...settings, name: e.target.value })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">TAGLINE / SLOGAN</label>
                  <input
                    type="text"
                    value={settings.tagline}
                    onChange={e => setSettings({ ...settings, tagline: e.target.value })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">ACCREDITATIONS</label>
                  <input
                    type="text"
                    value={settings.accreditation}
                    onChange={e => setSettings({ ...settings, accreditation: e.target.value })}
                    placeholder="e.g. NABL Accredited, ISO 9001:2015"
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-textSecondary mb-2">ADDRESS</label>
                  <textarea
                    rows={2}
                    value={settings.address}
                    onChange={e => setSettings({ ...settings, address: e.target.value })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">EMAIL</label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={e => setSettings({ ...settings, email: e.target.value })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">WEBSITE</label>
                  <input
                    type="text"
                    value={settings.website}
                    onChange={e => setSettings({ ...settings, website: e.target.value })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">PHONE</label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={e => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">HEADER HEIGHT (MM)</label>
                  <input
                    type="number"
                    value={settings.headerHeightMm}
                    onChange={e => setSettings({ ...settings, headerHeightMm: Number(e.target.value) })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">FOOTER MARGIN (MM)</label>
                  <input
                    type="number"
                    value={settings.footerMarginMm}
                    onChange={e => setSettings({ ...settings, footerMarginMm: Number(e.target.value) })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">LOGOS & IMAGES</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Logo URL"
                      value={settings.headerLogoUrl}
                      onChange={e => setSettings({ ...settings, headerLogoUrl: e.target.value })}
                      className="w-full bg-inputBackground border border-border rounded-lg p-2 text-xs text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Watermark URL"
                      value={settings.watermarkUrl}
                      onChange={e => setSettings({ ...settings, watermarkUrl: e.target.value })}
                      className="w-full bg-inputBackground border border-border rounded-lg p-2 text-xs text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                    />
                  </div>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-textSecondary mb-2">GLOBAL REPORT DISCLAIMER (PDF FOOTER)</label>
                  <input
                    type="text"
                    placeholder="e.g. * Clinical correlation required. Please consult a pathologist."
                    value={settings.footerDisclaimer || ''}
                    onChange={e => setSettings({ ...settings, footerDisclaimer: e.target.value })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                  />
                </div>
                <div className="md:col-span-3 flex flex-wrap gap-6 bg-elevated/40 p-4 rounded-xl border border-border">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showHeaderOnReports}
                      onChange={e => setSettings({ ...settings, showHeaderOnReports: e.target.checked })}
                      className="form-checkbox h-5 w-5 text-indigo-500 rounded bg-inputBackground border-border focus:ring-0"
                    />
                    <span className="text-sm font-semibold">Show Header on PDF Reports</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showWatermark}
                      onChange={e => setSettings({ ...settings, showWatermark: e.target.checked })}
                      className="form-checkbox h-5 w-5 text-indigo-500 rounded bg-inputBackground border-border focus:ring-0"
                    />
                    <span className="text-sm font-semibold">Enable Background Watermark</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showDigitalSignatures}
                      onChange={e => setSettings({ ...settings, showDigitalSignatures: e.target.checked })}
                      className="form-checkbox h-5 w-5 text-indigo-500 rounded bg-inputBackground border-border focus:ring-0"
                    />
                    <span className="text-sm font-semibold">Attach Digital Signatures Automatically</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Financials & Invoices */}
            <div>
              <h3 className="text-lg font-semibold border-b border-border pb-2 mb-6 text-blue-400">
                2. Billing & Invoicing Configurations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">INVOICE PREFIX</label>
                  <input
                    type="text"
                    value={settings.invoicePrefix}
                    onChange={e => setSettings({ ...settings, invoicePrefix: e.target.value })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">NEXT INVOICE NUMBER</label>
                  <input
                    type="number"
                    value={settings.nextInvoiceNumber}
                    onChange={e => setSettings({ ...settings, nextInvoiceNumber: Number(e.target.value) })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">DEFAULT TAX / VAT (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.defaultTaxPercent}
                    onChange={e => setSettings({ ...settings, defaultTaxPercent: Number(e.target.value) })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                  />
                </div>
                <div className="md:col-span-3 flex items-center space-x-6 bg-elevated/40 p-4 rounded-xl border border-border">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableQrPayment}
                      onChange={e => setSettings({ ...settings, enableQrPayment: e.target.checked })}
                      className="form-checkbox h-5 w-5 text-indigo-500 rounded bg-inputBackground border-border focus:ring-0"
                    />
                    <span className="text-sm font-semibold">Enable QR Dynamic Payments (UPI)</span>
                  </label>
                  {settings.enableQrPayment && (
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Merchant UPI ID (e.g. lab@upi)"
                        value={settings.upiId}
                        onChange={e => setSettings({ ...settings, upiId: e.target.value })}
                        className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notification Gateways */}
            <div>
              <h3 className="text-lg font-semibold border-b border-border pb-2 mb-6 text-blue-400">
                3. SMS & Notifications Gateways
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">SMS GATEWAY PROVIDER</label>
                  <select
                    value={settings.smsGatewayProvider}
                    onChange={e => setSettings({ ...settings, smsGatewayProvider: e.target.value })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                  >
                    <option value="Twilio">Twilio Gateway API</option>
                    <option value="Plivo">Plivo Standard SMS</option>
                    <option value="Msg91">Msg91 Enterprise</option>
                    <option value="Custom">Custom HTTP Gateway</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">SMS GATEWAY API KEY</label>
                  <input
                    type="password"
                    placeholder="Encrypted API token"
                    value={settings.smsApiKey}
                    onChange={e => setSettings({ ...settings, smsApiKey: e.target.value })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">WHATSAPP GATEWAY ENDPOINT</label>
                  <input
                    type="text"
                    value={settings.whatsAppGatewayUrl}
                    onChange={e => setSettings({ ...settings, whatsAppGatewayUrl: e.target.value })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">WHATSAPP API TOKEN</label>
                  <input
                    type="password"
                    placeholder="Enter security bearer token"
                    value={settings.whatsAppApiKey}
                    onChange={e => setSettings({ ...settings, whatsAppApiKey: e.target.value })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                  />
                </div>
              </div>
            </div>

            {/* SMTP & Email Server */}
            <div>
              <h3 className="text-lg font-semibold border-b border-border pb-2 mb-6 text-blue-400">
                4. SMTP Mail Server (SMTP Rules)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">SMTP HOST</label>
                  <input
                    type="text"
                    value={settings.smtpHost}
                    onChange={e => setSettings({ ...settings, smtpHost: e.target.value })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">SMTP PORT</label>
                  <input
                    type="number"
                    value={settings.smtpPort}
                    onChange={e => setSettings({ ...settings, smtpPort: Number(e.target.value) })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">SENDER DISPLAY NAME</label>
                  <input
                    type="text"
                    value={settings.smtpSenderName}
                    onChange={e => setSettings({ ...settings, smtpSenderName: e.target.value })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">SENDER EMAIL ADDRESS</label>
                  <input
                    type="email"
                    value={settings.smtpSenderEmail}
                    onChange={e => setSettings({ ...settings, smtpSenderEmail: e.target.value })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">SMTP USERNAME</label>
                  <input
                    type="text"
                    value={settings.smtpUsername}
                    onChange={e => setSettings({ ...settings, smtpUsername: e.target.value })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">SMTP PASSWORD</label>
                  <input
                    type="password"
                    placeholder="SMTP authentication password"
                    value={settings.smtpPassword}
                    onChange={e => setSettings({ ...settings, smtpPassword: e.target.value })}
                    className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                  />
                </div>
                <div className="md:col-span-3 flex items-center bg-elevated/40 p-4 rounded-xl border border-border">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.smtpEnableSsl}
                      onChange={e => setSettings({ ...settings, smtpEnableSsl: e.target.checked })}
                      className="form-checkbox h-5 w-5 text-indigo-500 rounded bg-inputBackground border-border focus:ring-0"
                    />
                    <span className="text-sm font-semibold">Enable SSL/TLS Secure Channel</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Backups Policies */}
            <div>
              <h3 className="text-lg font-semibold border-b border-border pb-2 mb-6 text-blue-400">
                5. Database Backup Rules
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-elevated/20 p-6 rounded-xl border border-border">
                <div className="md:col-span-2 flex items-center mb-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.backupEnabled}
                      onChange={e => setSettings({ ...settings, backupEnabled: e.target.checked })}
                      className="form-checkbox h-5 w-5 text-indigo-500 rounded bg-inputBackground border-border focus:ring-0"
                    />
                    <span className="text-sm font-bold">Enable Automatic System Backups</span>
                  </label>
                </div>
                {settings.backupEnabled && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-textSecondary mb-2">BACKUP FREQUENCY</label>
                      <select
                        value={settings.backupFrequency}
                        onChange={e => setSettings({ ...settings, backupFrequency: e.target.value })}
                        className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                      >
                        <option value="Daily">Every 24 Hours (Daily)</option>
                        <option value="Weekly">Every 7 Days (Weekly)</option>
                        <option value="Monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-textSecondary mb-2">SCHEDULED RUN TIME (LOCAL)</label>
                      <input
                        type="time"
                        value={settings.backupTime}
                        onChange={e => setSettings({ ...settings, backupTime: e.target.value })}
                        className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-textSecondary mb-2">TARGET DIRECTORY PATH (ABSOLUTE)</label>
                      <input
                        type="text"
                        value={settings.backupPath}
                        onChange={e => setSettings({ ...settings, backupPath: e.target.value })}
                        className="w-full bg-inputBackground border border-border rounded-lg p-3 text-textPrimary focus:ring-1 focus:ring-focusRing outline-none"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-border flex justify-end">
              <button
                type="submit"
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/20 transform hover:-translate-y-0.5 transition-all"
              >
                Save System Settings
              </button>
            </div>
          </form>
        )}

        {/* ROLES & CAPABILITIES MATRIX TAB */}
        {activeTab === 'permissions' && !loading && (
          <div className="animate-fadeIn">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-blue-400">Granular Capabilities Matrix</h3>
                <p className="text-textSecondary text-xs">Assign direct system permission boundaries directly to user roles.</p>
              </div>
            </div>

            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-elevated/60 border-b border-border">
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-textSecondary">Capability / Action</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-textSecondary">Module</th>
                    {roles.map(role => (
                      <th
                        key={role.roleId}
                        className="p-4 text-xs font-bold uppercase tracking-wider text-center text-indigo-400"
                      >
                        {role.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {capabilities.map(cap => (
                    <tr key={cap.capabilityId} className="hover:bg-elevated/20 transition-colors">
                      <td className="p-4 font-semibold text-sm">
                        {cap.name}
                        <span className="block text-xxs text-textSecondary font-mono mt-0.5">{cap.action}</span>
                      </td>
                      <td className="p-4 text-xs text-textSecondary font-mono">{cap.module}</td>
                      {roles.map(role => {
                        const isChecked = mappings.some(
                          m => m.roleId === role.roleId && m.capabilityId === cap.capabilityId
                        );
                        return (
                          <td key={role.roleId} className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(role.roleId, cap.capabilityId)}
                              className="form-checkbox h-5 w-5 text-indigo-500 rounded bg-inputBackground border-border focus:ring-0 cursor-pointer"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DEPARTMENT OPERATING HOURS TAB */}
        {activeTab === 'departments' && !loading && (
          <div className="animate-fadeIn space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-blue-400">Department Scope Configurations</h3>
                <p className="text-textSecondary text-xs">Restrict roles to specific department operating times and search policies.</p>
              </div>
              <button
                onClick={() => {
                  setEditingPolicy({
                    roleName: 'Reception',
                    departmentId: departments[0]?.departmentId || '',
                    operatingHoursStart: '08:00',
                    operatingHoursEnd: '20:00',
                    defaultTATHours: 24,
                    canSearchAll: false
                  });
                  setShowPolicyForm(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm shadow transition-all"
              >
                + Add Scope Policy
              </button>
            </div>

            {/* List Policies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {policies.map(p => (
                <div key={p.configId} className="border border-border rounded-xl p-5 bg-elevated/20 flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="bg-indigo-600/30 text-indigo-300 border border-indigo-500/20 text-xxs font-bold uppercase px-2 py-0.5 rounded-full">
                        {p.roleName}
                      </span>
                      <h4 className="font-bold text-sm text-textPrimary">{p.departmentName} ({p.departmentCode})</h4>
                    </div>
                    <div className="text-xs text-textSecondary space-y-1">
                      <p>⌚ Operating Hours: <strong>{p.operatingHoursStart} - {p.operatingHoursEnd}</strong></p>
                      <p>⏱️ Default Turnaround: <strong>{p.defaultTATHours} Hours</strong></p>
                      <p>🔍 Can Search All Branches: <strong>{p.canSearchAll ? 'Yes' : 'No'}</strong></p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setEditingPolicy(p);
                        setShowPolicyForm(true);
                      }}
                      className="px-3 py-1 text-xs bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePolicy(p.configId)}
                      className="px-3 py-1 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {policies.length === 0 && (
                <p className="text-textSecondary text-sm py-4 md:col-span-2">No department scope mappings configured yet.</p>
              )}
            </div>

            {/* Form modal */}
            {showPolicyForm && editingPolicy && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
                <div className="bg-card border border-border p-6 rounded-2xl w-full max-w-lg shadow-2xl">
                  <h3 className="text-lg font-bold mb-4 border-b border-border pb-2 text-indigo-400">
                    Configure Operating Policy
                  </h3>
                  <form onSubmit={handleSavePolicy} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-textSecondary mb-1">TARGET ROLE</label>
                      <select
                        value={editingPolicy.roleName}
                        onChange={e => setEditingPolicy({ ...editingPolicy, roleName: e.target.value })}
                        className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm text-textPrimary outline-none"
                      >
                        <option value="Admin">Admin</option>
                        <option value="Reception">Reception</option>
                        <option value="Pathologist">Pathologist</option>
                        <option value="PathTech">PathTech</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-textSecondary mb-1">DEPARTMENT</label>
                      <select
                        value={editingPolicy.departmentId}
                        onChange={e => setEditingPolicy({ ...editingPolicy, departmentId: e.target.value })}
                        className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm text-textPrimary outline-none"
                      >
                        {departments.map(d => (
                          <option key={d.departmentId} value={d.departmentId}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-textSecondary mb-1">START OPERATING TIME</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 08:00"
                          value={editingPolicy.operatingHoursStart}
                          onChange={e => setEditingPolicy({ ...editingPolicy, operatingHoursStart: e.target.value })}
                          className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm text-textPrimary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-textSecondary mb-1">END OPERATING TIME</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 20:00"
                          value={editingPolicy.operatingHoursEnd}
                          onChange={e => setEditingPolicy({ ...editingPolicy, operatingHoursEnd: e.target.value })}
                          className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm text-textPrimary outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-textSecondary mb-1">DEFAULT TAT (HOURS)</label>
                      <input
                        type="number"
                        required
                        value={editingPolicy.defaultTATHours}
                        onChange={e => setEditingPolicy({ ...editingPolicy, defaultTATHours: Number(e.target.value) })}
                        className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm text-textPrimary outline-none"
                      />
                    </div>
                    <div>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingPolicy.canSearchAll}
                          onChange={e => setEditingPolicy({ ...editingPolicy, canSearchAll: e.target.checked })}
                          className="form-checkbox h-5 w-5 text-indigo-500 rounded bg-inputBackground border-border focus:ring-0"
                        />
                        <span className="text-sm font-semibold">Enable Global Search Across Branches</span>
                      </label>
                    </div>
                    <div className="pt-4 border-t border-border flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPolicyForm(false);
                          setEditingPolicy(null);
                        }}
                        className="px-4 py-2 border border-border hover:bg-elevated/40 text-textSecondary text-sm rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg"
                      >
                        Save Policy
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PRICING & DISCOUNTS TAB */}
        {activeTab === 'pricing' && !loading && (
          <div className="animate-fadeIn space-y-10">
            {/* Discounts Sub-section */}
            <div className="border-b border-border pb-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-blue-400">Discount Master Rules</h3>
                  <p className="text-textSecondary text-xs">Set flat rate or percentage based promotional codes.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingDiscount({
                      code: '',
                      name: '',
                      type: 0,
                      value: 0,
                      isActive: true,
                      effectiveFrom: '',
                      effectiveTo: ''
                    });
                    setShowDiscountForm(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow"
                >
                  + Create Discount
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {discounts.map(d => (
                  <div key={d.discountDefinitionId} className="border border-border rounded-xl p-5 bg-elevated/10">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                          {d.code}
                        </span>
                        <h4 className="font-bold text-sm mt-2">{d.name}</h4>
                      </div>
                      <span className={`h-2.5 w-2.5 rounded-full ${d.isActive ? 'bg-success' : 'bg-textSecondary'}`} />
                    </div>
                    <div className="text-xs text-textSecondary space-y-1 mb-4">
                      <p>Value: <strong>{d.type === 0 ? `${d.value}%` : `$${d.value}`}</strong></p>
                      {d.maxLimit && <p>Max Limit: <strong>${d.maxLimit}</strong></p>}
                      {d.effectiveFrom && (
                        <p>Dates: <strong>{dayjs(d.effectiveFrom).format('MMM D, YYYY')} - {d.effectiveTo ? dayjs(d.effectiveTo).format('MMM D, YYYY') : 'Forever'}</strong></p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setEditingDiscount(d);
                        setShowDiscountForm(true);
                      }}
                      className="w-full text-center py-2 text-xs border border-border hover:bg-elevated/50 rounded font-semibold text-indigo-400"
                    >
                      Edit Rule
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Referral Partners Sub-section */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-blue-400">Referral Partners Directory</h3>
                  <p className="text-textSecondary text-xs">Track clinics, doctors, and hospitals with commission structures.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingPartner({
                      name: '',
                      partnerType: 0,
                      contactInfo: '',
                      defaultCommissionPercentage: 0,
                      calculationBase: 1,
                      isActive: true,
                      paymentCollectionModel: 'Direct Billing'
                    });
                    setShowPartnerForm(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow"
                >
                  + Add Referral Partner
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {partners.map(p => (
                  <div key={p.referralPartnerId} className="border border-border rounded-xl p-5 bg-elevated/15 flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2.5 mb-2">
                        <span className="bg-indigo-600/30 text-indigo-300 text-xxs font-bold px-2 py-0.5 rounded">
                          {p.partnerType === 0 ? 'Doctor' : p.partnerType === 1 ? 'Clinic' : 'Hospital'}
                        </span>
                        <h4 className="font-bold text-sm">{p.name}</h4>
                      </div>
                      <div className="text-xs text-textSecondary space-y-1">
                        {p.contactInfo && <p>📞 Contact: <strong>{p.contactInfo}</strong></p>}
                        <p>💸 Commission: <strong>{p.defaultCommissionPercentage}%</strong> ({p.calculationBase === 0 ? 'Before Discount' : 'After Discount'})</p>
                        {p.paymentCollectionModel && <p>💳 Collection Model: <strong>{p.paymentCollectionModel}</strong></p>}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => {
                          setEditingPartner(p);
                          setShowPartnerForm(true);
                        }}
                        className="px-3 py-1.5 text-xs border border-border hover:bg-elevated/50 rounded font-semibold text-indigo-400"
                      >
                        Edit
                      </button>
                      {p.isActive && (
                        <button
                          onClick={() => handleDeactivatePartner(p.referralPartnerId)}
                          className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 rounded font-semibold"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discount Form Modal */}
            {showDiscountForm && editingDiscount && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
                <div className="bg-card border border-border p-6 rounded-2xl w-full max-w-md shadow-2xl">
                  <h3 className="text-lg font-bold mb-4 border-b border-border pb-2 text-indigo-400">
                    {editingDiscount.discountDefinitionId ? 'Edit Discount Rule' : 'Create Discount Definition'}
                  </h3>
                  <form onSubmit={handleSaveDiscount} className="space-y-4">
                    {!editingDiscount.discountDefinitionId && (
                      <div>
                        <label className="block text-xs font-bold text-textSecondary mb-1">DISCOUNT CODE</label>
                        <input
                          type="text"
                          required
                          value={editingDiscount.code}
                          onChange={e => setEditingDiscount({ ...editingDiscount, code: e.target.value.toUpperCase() })}
                          className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm text-textPrimary outline-none font-mono"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-textSecondary mb-1">PROMOTION NAME</label>
                      <input
                        type="text"
                        required
                        value={editingDiscount.name}
                        onChange={e => setEditingDiscount({ ...editingDiscount, name: e.target.value })}
                        className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm text-textPrimary outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-textSecondary mb-1">DISCOUNT TYPE</label>
                        <select
                          value={editingDiscount.type}
                          onChange={e => setEditingDiscount({ ...editingDiscount, type: Number(e.target.value) })}
                          className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm text-textPrimary outline-none"
                        >
                          <option value={0}>Percentage (%)</option>
                          <option value={1}>Flat Amount ($)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-textSecondary mb-1">RATE / VALUE</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={editingDiscount.value}
                          onChange={e => setEditingDiscount({ ...editingDiscount, value: Number(e.target.value) })}
                          className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm text-textPrimary outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-textSecondary mb-1">MAX LIMIT ($) (OPTIONAL)</label>
                      <input
                        type="number"
                        value={editingDiscount.maxLimit || ''}
                        onChange={e => setEditingDiscount({ ...editingDiscount, maxLimit: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm text-textPrimary outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-textSecondary mb-1">EFFECTIVE FROM</label>
                        <input
                          type="date"
                          value={editingDiscount.effectiveFrom ? dayjs(editingDiscount.effectiveFrom).format('YYYY-MM-DD') : ''}
                          onChange={e => setEditingDiscount({ ...editingDiscount, effectiveFrom: e.target.value ? dayjs(e.target.value).toISOString() : undefined })}
                          className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm text-textPrimary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-textSecondary mb-1">EFFECTIVE TO</label>
                        <input
                          type="date"
                          value={editingDiscount.effectiveTo ? dayjs(editingDiscount.effectiveTo).format('YYYY-MM-DD') : ''}
                          onChange={e => setEditingDiscount({ ...editingDiscount, effectiveTo: e.target.value ? dayjs(e.target.value).toISOString() : undefined })}
                          className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm text-textPrimary outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingDiscount.isActive}
                          onChange={e => setEditingDiscount({ ...editingDiscount, isActive: e.target.checked })}
                          className="form-checkbox h-5 w-5 text-indigo-500 rounded bg-inputBackground border-border focus:ring-0"
                        />
                        <span className="text-sm font-semibold">Active & Redeemable</span>
                      </label>
                    </div>
                    <div className="pt-4 border-t border-border flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDiscountForm(false);
                          setEditingDiscount(null);
                        }}
                        className="px-4 py-2 border border-border hover:bg-elevated/40 text-textSecondary text-sm rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg animate-pulseSlow"
                      >
                        Save Discount
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Partner Form Modal */}
            {showPartnerForm && editingPartner && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
                <div className="bg-card border border-border p-6 rounded-2xl w-full max-w-md shadow-2xl">
                  <h3 className="text-lg font-bold mb-4 border-b border-border pb-2 text-indigo-400">
                    {editingPartner.referralPartnerId ? 'Edit Referral Partner' : 'Register Referral Partner'}
                  </h3>
                  <form onSubmit={handleSavePartner} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-textSecondary mb-1">PARTNER FULL NAME</label>
                      <input
                        type="text"
                        required
                        value={editingPartner.name}
                        onChange={e => setEditingPartner({ ...editingPartner, name: e.target.value })}
                        className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm text-textPrimary outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-textSecondary mb-1">PARTNER TYPE</label>
                        <select
                          value={editingPartner.partnerType}
                          onChange={e => setEditingPartner({ ...editingPartner, partnerType: Number(e.target.value) })}
                          className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm text-textPrimary outline-none"
                        >
                          <option value={0}>Doctor</option>
                          <option value={1}>Clinic</option>
                          <option value={2}>Hospital</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-textSecondary mb-1">COMMISSION (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={editingPartner.defaultCommissionPercentage}
                          onChange={e => setEditingPartner({ ...editingPartner, defaultCommissionPercentage: Number(e.target.value) })}
                          className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm text-textPrimary outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-textSecondary mb-1">CALCULATION BASE</label>
                      <select
                        value={editingPartner.calculationBase}
                        onChange={e => setEditingPartner({ ...editingPartner, calculationBase: Number(e.target.value) })}
                        className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm text-textPrimary outline-none"
                      >
                        <option value={0}>Gross Pricing (Before Discounts)</option>
                        <option value={1}>Net Pricing (After Discounts)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-textSecondary mb-1">CONTACT CHANNELS (PHONE/EMAIL)</label>
                      <input
                        type="text"
                        value={editingPartner.contactInfo || ''}
                        onChange={e => setEditingPartner({ ...editingPartner, contactInfo: e.target.value })}
                        className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm text-textPrimary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-textSecondary mb-1">PAYMENT COLLECTION MODEL</label>
                      <input
                        type="text"
                        value={editingPartner.paymentCollectionModel || ''}
                        onChange={e => setEditingPartner({ ...editingPartner, paymentCollectionModel: e.target.value })}
                        placeholder="e.g. Direct Billing, Monthly Invoice"
                        className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-sm text-textPrimary outline-none"
                      />
                    </div>
                    <div>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingPartner.isActive}
                          onChange={e => setEditingPartner({ ...editingPartner, isActive: e.target.checked })}
                          className="form-checkbox h-5 w-5 text-indigo-500 rounded bg-inputBackground border-border focus:ring-0"
                        />
                        <span className="text-sm font-semibold">Active & Working Referral</span>
                      </label>
                    </div>
                    <div className="pt-4 border-t border-border flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPartnerForm(false);
                          setEditingPartner(null);
                        }}
                        className="px-4 py-2 border border-border hover:bg-elevated/40 text-textSecondary text-sm rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg"
                      >
                        Save Partner
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AUDIT LOG VIEWER TAB */}
        {activeTab === 'audit' && !loading && (
          <div className="animate-fadeIn space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-blue-400">System Forensic Audit Trail</h3>
              <p className="text-textSecondary text-xs">Verify changes, configuration alterations, and transactional tracking events.</p>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-elevated/10 p-5 rounded-xl border border-border">
              <div>
                <label className="block text-xxs font-bold text-textSecondary mb-1.5">ACTOR USER</label>
                <select
                  value={selectedActor}
                  onChange={e => { setSelectedActor(e.target.value); setAuditOffset(0); }}
                  className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-xs text-textPrimary outline-none"
                >
                  <option value="">All Actors</option>
                  {users.map(u => (
                    <option key={u.userId} value={u.userId}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xxs font-bold text-textSecondary mb-1.5">RESOURCE TYPE</label>
                <select
                  value={selectedResourceType}
                  onChange={e => { setSelectedResourceType(e.target.value); setAuditOffset(0); }}
                  className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-xs text-textPrimary outline-none"
                >
                  <option value="">All Types</option>
                  <option value="Settings">Settings</option>
                  <option value="Patient">Patient</option>
                  <option value="Visit">Visit</option>
                  <option value="Invoice">Invoice</option>
                  <option value="Payment">Payment</option>
                  <option value="Discount">Discount</option>
                  <option value="ReferralPartner">Referral Partner</option>
                </select>
              </div>
              <div>
                <label className="block text-xxs font-bold text-textSecondary mb-1.5">ACTION EVENT</label>
                <input
                  type="text"
                  placeholder="e.g. UpdateSystemSettings"
                  value={selectedAction}
                  onChange={e => { setSelectedAction(e.target.value); setAuditOffset(0); }}
                  className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-xs text-textPrimary outline-none"
                />
              </div>
              <div>
                <label className="block text-xxs font-bold text-textSecondary mb-1.5">START DATE</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); setAuditOffset(0); }}
                  className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-xs text-textPrimary outline-none"
                />
              </div>
              <div>
                <label className="block text-xxs font-bold text-textSecondary mb-1.5">END DATE</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => { setEndDate(e.target.value); setAuditOffset(0); }}
                  className="w-full bg-inputBackground border border-border rounded-lg p-2.5 text-xs text-textPrimary outline-none"
                />
              </div>
              <div className="md:col-span-5 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedActor('');
                    setSelectedResourceType('');
                    setSelectedAction('');
                    setStartDate('');
                    setEndDate('');
                    setAuditOffset(0);
                    loadAuditLogs();
                  }}
                  className="px-4 py-2 border border-border hover:bg-elevated/45 text-textSecondary text-xs rounded-lg font-semibold"
                >
                  Clear Filters
                </button>
                <button
                  onClick={loadAuditLogs}
                  className="ml-3 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg font-semibold shadow"
                >
                  Refresh Logs
                </button>
              </div>
            </div>

            {/* Audit Log Grid */}
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-elevated/60 border-b border-border">
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-textSecondary">Timestamp</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-textSecondary">Actor</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-textSecondary">Event Action</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-textSecondary">Resource Module</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-textSecondary">Resource ID</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-center text-textSecondary">Audit Trace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {auditLogs.map(log => (
                    <tr key={log.auditId} className="hover:bg-elevated/20 transition-colors">
                      <td className="p-4 text-xs text-textSecondary font-mono">
                        {dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                      </td>
                      <td className="p-4 text-xs font-semibold">
                        {log.actorName} <span className="block text-xxs text-textSecondary font-mono">@{log.actorUsername}</span>
                      </td>
                      <td className="p-4 text-xs text-indigo-400 font-mono font-semibold">{log.action}</td>
                      <td className="p-4 text-xs text-textPrimary font-semibold">{log.resourceType}</td>
                      <td className="p-4 text-xs text-textSecondary font-mono">{log.resourceId}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => {
                            let parsed = log.payload;
                            if (typeof log.payload === 'string') {
                              try {
                                parsed = JSON.parse(log.payload);
                              } catch {
                                parsed = log.payload;
                              }
                            }
                            setSelectedLogPayload(parsed);
                          }}
                          className="px-3 py-1.5 text-xs bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 rounded font-semibold"
                        >
                          View Diff
                        </button>
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-textSecondary text-sm font-medium">
                        No audit records found matching selected filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {auditTotal > auditLimit && (
              <div className="flex justify-between items-center pt-4">
                <span className="text-xs text-textSecondary">
                  Showing {auditOffset + 1} to {Math.min(auditOffset + auditLimit, auditTotal)} of {auditTotal} logs
                </span>
                <div className="flex space-x-2">
                  <button
                    disabled={auditOffset === 0}
                    onClick={() => setAuditOffset(prev => Math.max(0, prev - auditLimit))}
                    className="px-3.5 py-2 border border-border hover:bg-elevated/45 rounded-lg text-xs font-semibold disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    disabled={auditOffset + auditLimit >= auditTotal}
                    onClick={() => setAuditOffset(prev => prev + auditLimit)}
                    className="px-3.5 py-2 border border-border hover:bg-elevated/45 rounded-lg text-xs font-semibold disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Diff details modal */}
            {selectedLogPayload && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
                <div className="bg-card border border-border p-6 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl">
                  <h3 className="text-lg font-bold mb-4 border-b border-border pb-2 text-indigo-400">
                    State Difference Details
                  </h3>
                  <div className="space-y-4">
                    {/* Render before/after mapping if payload conforms to standard */}
                    {selectedLogPayload.Old || selectedLogPayload.New || selectedLogPayload.old || selectedLogPayload.new ? (
                      <div className="overflow-x-auto border border-border rounded-xl">
                        <table className="min-w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-elevated/50 border-b border-border">
                              <th className="p-3 font-bold text-textSecondary uppercase">Property Name</th>
                              <th className="p-3 font-bold text-red-400 uppercase">Original (Before)</th>
                              <th className="p-3 font-bold text-success uppercase">Modified (After)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border font-mono">
                            {Object.keys({
                              ...(selectedLogPayload.Old || selectedLogPayload.old || {}),
                              ...(selectedLogPayload.New || selectedLogPayload.new || {})
                            }).map(key => {
                              const before = (selectedLogPayload.Old || selectedLogPayload.old)?.[key];
                              const after = (selectedLogPayload.New || selectedLogPayload.new)?.[key];
                              const isDiff = JSON.stringify(before) !== JSON.stringify(after);

                              return (
                                <tr key={key} className={isDiff ? 'bg-indigo-500/5' : 'opacity-60'}>
                                  <td className="p-3 font-semibold text-textPrimary">{key}</td>
                                  <td className="p-3 text-red-300 break-all">{before !== undefined ? String(before) : '—'}</td>
                                  <td className="p-3 text-emerald-300 break-all font-semibold">{after !== undefined ? String(after) : '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <pre className="bg-inputBackground p-4 rounded-xl border border-border text-xs text-textSecondary font-mono overflow-auto max-h-80">
                        {JSON.stringify(selectedLogPayload, null, 2)}
                      </pre>
                    )}
                  </div>
                  <div className="mt-6 border-t border-border pt-4 flex justify-end">
                    <button
                      onClick={() => setSelectedLogPayload(null)}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg"
                    >
                      Close Inspector
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
