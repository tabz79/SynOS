import React, { useEffect, useState } from 'react';
import { AdminApi } from '@/api/admin';
import { useTheme } from '@/context/ThemeContext';
// Native Date helpers to avoid dayjs dependency
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
import { 
  Settings, 
  ShieldAlert, 
  Clock, 
  Tag, 
  History, 
  Check, 
  X, 
  Trash2, 
  Edit2, 
  AlertCircle,
  Eye
} from 'lucide-react';

export function SystemSettingsScreen() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('settings');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [saveError, setSaveError] = useState(null);

  // Global Settings State
  const [settings, setSettings] = useState(null);

  // Roles & Permissions Matrix State
  const [roles, setRoles] = useState([]);
  const [capabilities, setCapabilities] = useState([]);
  const [mappings, setMappings] = useState([]);

  // Department Policies State
  const [policies, setPolicies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [showPolicyForm, setShowPolicyForm] = useState(false);

  // Pricing & Discounts State
  const [discounts, setDiscounts] = useState([]);
  const [partners, setPartners] = useState([]);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [showPartnerForm, setShowPartnerForm] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLimit] = useState(15);
  const [auditOffset, setAuditOffset] = useState(0);
  const [users, setUsers] = useState([]);
  const [selectedActor, setSelectedActor] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLogPayload, setSelectedLogPayload] = useState(null);

  // Load Settings Tab
  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await AdminApi.getSettings();
      setSettings(response);
    } catch (err) {
      setSaveError(err.message || 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  // Load Permissions Matrix
  const loadPermissions = async () => {
    setLoading(true);
    try {
      const response = await AdminApi.getPermissionsMatrix();
      setRoles(response?.roles || []);
      setCapabilities(response?.capabilities || []);
      setMappings(response?.mappings || []);
    } catch (err) {
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
        AdminApi.getDepartmentPolicies(),
        AdminApi.getDepartments()
      ]);
      setPolicies(policiesRes || []);
      setDepartments(deptsRes || []);
    } catch (err) {
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
        AdminApi.getDiscounts(),
        AdminApi.getReferralPartners()
      ]);
      setDiscounts(discountsRes || []);
      setPartners(partnersRes || []);
    } catch (err) {
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
      if (startDate) query += `&startDate=${dateToISOString(startDate)}`;
      if (endDate) query += `&endDate=${dateToISOString(endDate)}`;

      const response = await AdminApi.getAuditLogs(query);
      setAuditLogs(response?.logs || []);
      setAuditTotal(response?.totalCount || 0);

      // Fetch users once for filtering dropdown
      if (users.length === 0) {
        const usersRes = await AdminApi.getUsers();
        setUsers(usersRes || []);
      }
    } catch (err) {
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
  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    if (!settings) return;
    setLoading(true);
    setSaveSuccess(null);
    setSaveError(null);
    try {
      await AdminApi.updateSettings(settings);
      setSaveSuccess('Global system configuration successfully updated.');
    } catch (err) {
      setSaveError(err.message || 'Error occurred while saving configurations.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Capability mapping
  const togglePermission = async (roleId, capabilityId) => {
    const isMapped = mappings.some(m => m.roleId === roleId && m.capabilityId === capabilityId);
    let updatedCapabilityIds = [];

    if (isMapped) {
      updatedCapabilityIds = mappings
        .filter(m => m.roleId === roleId && m.capabilityId !== capabilityId)
        .map(m => m.capabilityId);
    } else {
      updatedCapabilityIds = [
        ...mappings.filter(m => m.roleId === roleId).map(m => m.capabilityId),
        capabilityId
      ];
    }

    try {
      await AdminApi.updateRoleCapabilities({
        roleId,
        capabilityIds: updatedCapabilityIds
      });
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
  const handleSavePolicy = async (e) => {
    e.preventDefault();
    if (!editingPolicy) return;
    setLoading(true);
    try {
      await AdminApi.saveDepartmentPolicy(editingPolicy);
      setShowPolicyForm(false);
      setEditingPolicy(null);
      setSaveSuccess('Department operating config saved.');
      loadDepartmentPolicies();
    } catch (err) {
      setSaveError(err.message || 'Conflict mapping or invalid database payload.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePolicy = async (id) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    setLoading(true);
    try {
      await AdminApi.deleteDepartmentPolicy(id);
      setSaveSuccess('Config policy deleted.');
      loadDepartmentPolicies();
    } catch (err) {
      setSaveError('Error deleting mapping.');
    } finally {
      setLoading(false);
    }
  };

  // Save/Update Discount
  const handleSaveDiscount = async (e) => {
    e.preventDefault();
    if (!editingDiscount) return;
    setLoading(true);
    try {
      if (editingDiscount.discountDefinitionId) {
        await AdminApi.updateDiscount(editingDiscount.discountDefinitionId, editingDiscount);
      } else {
        await AdminApi.createDiscount(editingDiscount);
      }
      setShowDiscountForm(false);
      setEditingDiscount(null);
      setSaveSuccess('Discount record saved.');
      loadPricingData();
    } catch (err) {
      setSaveError(err.message || 'Error occurred saving discount rules.');
    } finally {
      setLoading(false);
    }
  };

  // Save/Update Referral Partner
  const handleSavePartner = async (e) => {
    e.preventDefault();
    if (!editingPartner) return;
    setLoading(true);
    try {
      if (editingPartner.referralPartnerId) {
        await AdminApi.updateReferralPartner(editingPartner.referralPartnerId, editingPartner);
      } else {
        await AdminApi.createReferralPartner(editingPartner);
      }
      setShowPartnerForm(false);
      setEditingPartner(null);
      setSaveSuccess('Referral partner details saved.');
      loadPricingData();
    } catch (err) {
      setSaveError(err.message || 'Error saving referral details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivatePartner = async (id) => {
    if (!confirm('Are you sure you want to deactivate this referral partner?')) return;
    setLoading(true);
    try {
      await AdminApi.deleteReferralPartner(id);
      setSaveSuccess('Partner successfully deactivated.');
      loadPricingData();
    } catch (err) {
      setSaveError('Deactivation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 text-zinc-800 dark:text-zinc-100 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b dark:border-zinc-900/60 border-zinc-200 pb-4 gap-4">
        <div>
          <h1 className="text-xl font-medium tracking-tight text-zinc-800 dark:text-white flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-synos-primary" /> System Settings
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Configure system settings, access credentials, SMS APIs, discount structures, and inspect logs</p>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {saveSuccess && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-455 flex justify-between items-center transition-all">
          <span className="text-xs font-semibold">{saveSuccess}</span>
          <button onClick={() => setSaveSuccess(null)} className="text-emerald-500 hover:font-bold">×</button>
        </div>
      )}
      {saveError && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 flex justify-between items-center transition-all">
          <span className="text-xs font-semibold">{saveError}</span>
          <button onClick={() => setSaveError(null)} className="text-red-500 hover:font-bold">×</button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap border-b dark:border-zinc-850 border-zinc-200 pb-px mb-8 gap-1">
        {[
          { id: 'settings', label: 'System Configuration', icon: Settings },
          { id: 'permissions', label: 'Roles Matrix', icon: ShieldAlert },
          { id: 'departments', label: 'Department Hours', icon: Clock },
          { id: 'pricing', label: 'Pricing & Discounts', icon: Tag },
          { id: 'audit', label: 'Audit Logs', icon: History }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setAuditOffset(0);
            }}
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

      {/* Tab Contents */}
      <div className="bg-white dark:bg-zinc-950 border dark:border-zinc-900/60 border-zinc-100 rounded-2xl p-8 shadow-sm">
        {loading && <div className="text-center py-12 text-zinc-500 font-bold uppercase tracking-widest text-xs">Loading operational parameters...</div>}

        {/* SYSTEM SETUP TAB */}
        {activeTab === 'settings' && settings && !loading && (
          <form onSubmit={handleSettingsSubmit} className="space-y-8 animate-fadeIn text-xs">
            {/* Section 1: Lab Branding */}
            <div>
              <h3 className="text-sm font-bold border-b dark:border-zinc-800 border-zinc-200 pb-2 mb-6 text-synos-primary uppercase tracking-widest">
                1. Print Header & Lab Profile
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Lab Name</label>
                  <input
                    type="text"
                    required
                    value={settings.name || ''}
                    onChange={e => setSettings({ ...settings, name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Tagline / Slogan</label>
                  <input
                    type="text"
                    value={settings.tagline || ''}
                    onChange={e => setSettings({ ...settings, tagline: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Accreditations</label>
                  <input
                    type="text"
                    value={settings.accreditation || ''}
                    onChange={e => setSettings({ ...settings, accreditation: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Address</label>
                  <textarea
                    rows={2}
                    value={settings.address || ''}
                    onChange={e => setSettings({ ...settings, address: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Email</label>
                  <input
                    type="email"
                    value={settings.email || ''}
                    onChange={e => setSettings({ ...settings, email: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Website</label>
                  <input
                    type="text"
                    value={settings.website || ''}
                    onChange={e => setSettings({ ...settings, website: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Phone</label>
                  <input
                    type="text"
                    value={settings.phone || ''}
                    onChange={e => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Header Height (mm)</label>
                  <input
                    type="number"
                    value={settings.headerHeightMm || 0}
                    onChange={e => setSettings({ ...settings, headerHeightMm: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Footer Margin (mm)</label>
                  <input
                    type="number"
                    value={settings.footerMarginMm || 0}
                    onChange={e => setSettings({ ...settings, footerMarginMm: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Header Logo URL</label>
                  <input
                    type="text"
                    value={settings.headerLogoUrl || ''}
                    onChange={e => setSettings({ ...settings, headerLogoUrl: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div className="md:col-span-3 flex flex-wrap gap-6 bg-zinc-50/50 dark:bg-zinc-950/40 p-4 rounded-xl border dark:border-zinc-850 border-zinc-200/60 shadow-sm">
                  <label className="flex items-center space-x-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settings.showHeaderOnReports || false}
                      onChange={e => setSettings({ ...settings, showHeaderOnReports: e.target.checked })}
                      className="form-checkbox h-4.5 w-4.5 text-synos-primary rounded bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 focus:ring-0 cursor-pointer"
                    />
                    <span className="font-semibold text-zinc-300">Show Branding Header on PDF Reports</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settings.showWatermark || false}
                      onChange={e => setSettings({ ...settings, showWatermark: e.target.checked })}
                      className="form-checkbox h-4.5 w-4.5 text-synos-primary rounded bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 focus:ring-0 cursor-pointer"
                    />
                    <span className="font-semibold text-zinc-300">Enable Background Watermark</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settings.showDigitalSignatures || false}
                      onChange={e => setSettings({ ...settings, showDigitalSignatures: e.target.checked })}
                      className="form-checkbox h-4.5 w-4.5 text-synos-primary rounded bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 focus:ring-0 cursor-pointer"
                    />
                    <span className="font-semibold text-zinc-300">Attach Signatures Automatically</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Section 2: Billing & Invoicing */}
            <div>
              <h3 className="text-sm font-bold border-b dark:border-zinc-800 border-zinc-200 pb-2 mb-6 text-synos-primary uppercase tracking-widest">
                2. Invoice & Tax Rules
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Invoice Prefix</label>
                  <input
                    type="text"
                    value={settings.invoicePrefix || ''}
                    onChange={e => setSettings({ ...settings, invoicePrefix: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Next Invoice No</label>
                  <input
                    type="number"
                    value={settings.nextInvoiceNumber || 0}
                    onChange={e => setSettings({ ...settings, nextInvoiceNumber: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Default Tax (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.defaultTaxPercent || 0}
                    onChange={e => setSettings({ ...settings, defaultTaxPercent: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div className="md:col-span-3 flex items-center space-x-6 bg-zinc-50/50 dark:bg-zinc-950/40 p-4 rounded-xl border dark:border-zinc-850 border-zinc-200/60 shadow-sm">
                  <label className="flex items-center space-x-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settings.enableQrPayment || false}
                      onChange={e => setSettings({ ...settings, enableQrPayment: e.target.checked })}
                      className="form-checkbox h-4.5 w-4.5 text-synos-primary rounded bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 focus:ring-0 cursor-pointer"
                    />
                    <span className="font-semibold text-zinc-300">Enable Dynamic UPI QR Codes</span>
                  </label>
                  {settings.enableQrPayment && (
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="e.g. clinic@upi"
                        value={settings.upiId || ''}
                        onChange={e => setSettings({ ...settings, upiId: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Notification Gateways */}
            <div>
              <h3 className="text-sm font-bold border-b dark:border-zinc-800 border-zinc-200 pb-2 mb-6 text-synos-primary uppercase tracking-widest">
                3. Notification Gateways
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">SMS API Provider</label>
                  <select
                    value={settings.smsGatewayProvider || 'Twilio'}
                    onChange={e => setSettings({ ...settings, smsGatewayProvider: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  >
                    <option value="Twilio">Twilio Gateway API</option>
                    <option value="Plivo">Plivo Standard SMS</option>
                    <option value="Msg91">Msg91 Enterprise</option>
                    <option value="Custom">Custom HTTP Gateway</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">SMS API Token Key</label>
                  <input
                    type="password"
                    placeholder="Encrypted password/token key"
                    value={settings.smsApiKey || ''}
                    onChange={e => setSettings({ ...settings, smsApiKey: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: SMTP Servers */}
            <div>
              <h3 className="text-sm font-bold border-b dark:border-zinc-800 border-zinc-200 pb-2 mb-6 text-synos-primary uppercase tracking-widest">
                4. SMTP Mail Configurations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">SMTP Host</label>
                  <input
                    type="text"
                    value={settings.smtpHost || ''}
                    onChange={e => setSettings({ ...settings, smtpHost: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">SMTP Port</label>
                  <input
                    type="number"
                    value={settings.smtpPort || 587}
                    onChange={e => setSettings({ ...settings, smtpPort: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Sender Name</label>
                  <input
                    type="text"
                    value={settings.smtpSenderName || ''}
                    onChange={e => setSettings({ ...settings, smtpSenderName: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Sender Email</label>
                  <input
                    type="email"
                    value={settings.smtpSenderEmail || ''}
                    onChange={e => setSettings({ ...settings, smtpSenderEmail: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">SMTP Username</label>
                  <input
                    type="text"
                    value={settings.smtpUsername || ''}
                    onChange={e => setSettings({ ...settings, smtpUsername: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">SMTP Password</label>
                  <input
                    type="password"
                    placeholder="SMTP Authentication Password"
                    value={settings.smtpPassword || ''}
                    onChange={e => setSettings({ ...settings, smtpPassword: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div className="md:col-span-3 flex items-center bg-zinc-50/50 dark:bg-zinc-950/40 p-4 rounded-xl border dark:border-zinc-850 border-zinc-200/60 shadow-sm">
                  <label className="flex items-center space-x-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settings.smtpEnableSsl || false}
                      onChange={e => setSettings({ ...settings, smtpEnableSsl: e.target.checked })}
                      className="form-checkbox h-4.5 w-4.5 text-synos-primary rounded bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 focus:ring-0 cursor-pointer"
                    />
                    <span className="font-semibold text-zinc-300">Enable SSL/TLS Secure Channel</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Section 5: Database Backups */}
            <div>
              <h3 className="text-sm font-bold border-b dark:border-zinc-800 border-zinc-200 pb-2 mb-6 text-synos-primary uppercase tracking-widest">
                5. Database Auto-Backups
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-50/30 dark:bg-zinc-950/20 p-6 rounded-xl border dark:border-zinc-850 border-zinc-200/10">
                <div className="md:col-span-2 flex items-center mb-2">
                  <label className="flex items-center space-x-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settings.backupEnabled || false}
                      onChange={e => setSettings({ ...settings, backupEnabled: e.target.checked })}
                      className="form-checkbox h-4.5 w-4.5 text-synos-primary rounded bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 focus:ring-0 cursor-pointer"
                    />
                    <span className="font-bold text-zinc-300">Enable Automatic Database Backups</span>
                  </label>
                </div>
                {settings.backupEnabled && (
                  <>
                    <div>
                      <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Backup Frequency</label>
                      <select
                        value={settings.backupFrequency || 'Daily'}
                        onChange={e => setSettings({ ...settings, backupFrequency: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                      >
                        <option value="Daily">Daily (Every 24h)</option>
                        <option value="Weekly">Weekly (Every 7d)</option>
                        <option value="Monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Run Time (Local)</label>
                      <input
                        type="time"
                        value={settings.backupTime || '02:00'}
                        onChange={e => setSettings({ ...settings, backupTime: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Directory Backup Path</label>
                      <input
                        type="text"
                        value={settings.backupPath || ''}
                        onChange={e => setSettings({ ...settings, backupPath: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Submit btn */}
            <div className="pt-6 border-t dark:border-zinc-800 border-zinc-200 flex justify-end">
              <button
                type="submit"
                className="px-8 py-3 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg hover:shadow-synos-primary/20 transition-all active:scale-95"
              >
                Save Settings Configuration
              </button>
            </div>
          </form>
        )}

        {/* ROLES & CAPABILITIES TAB */}
        {activeTab === 'permissions' && !loading && (
          <div className="animate-fadeIn space-y-6">
            <div>
              <h3 className="text-sm font-bold text-synos-primary uppercase tracking-widest mb-1">Granular Capabilities Matrix</h3>
              <p className="text-zinc-500 text-xs font-semibold">Assign permissions and modules access directly to employee roles.</p>
            </div>

            <div className="overflow-x-auto border dark:border-zinc-850 border-zinc-200/10 rounded-xl">
              <table className="min-w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50/60 dark:bg-zinc-950/60 border-b dark:border-zinc-800 border-zinc-200">
                    <th className="p-4 text-xxs font-bold uppercase tracking-wider text-zinc-400">Capability Module / Action</th>
                    <th className="p-4 text-xxs font-bold uppercase tracking-wider text-zinc-400">Scope Module</th>
                    {roles.map(role => (
                      <th
                         key={role.roleId}
                        className="p-4 text-xxs font-bold uppercase tracking-wider text-center text-synos-primary"
                      >
                        {role.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                  {capabilities.map(cap => (
                    <tr key={cap.capabilityId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                      <td className="p-4 font-semibold">
                        {cap.name}
                        <span className="block text-xxs text-zinc-500 font-mono mt-0.5">{cap.action}</span>
                      </td>
                      <td className="p-4 font-mono text-zinc-400">{cap.module}</td>
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
                              className="form-checkbox h-4.5 w-4.5 text-synos-primary rounded bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 focus:ring-0 cursor-pointer"
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

        {/* DEPARTMENT POLICIES TAB */}
        {activeTab === 'departments' && !loading && (
          <div className="animate-fadeIn space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-synos-primary uppercase tracking-widest mb-1">Department operating hour bounds</h3>
                <p className="text-zinc-500 text-xs font-semibold">Define custom operating times, turnaround deadlines, and search access guidelines per role.</p>
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
                className="px-4 py-2 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold text-xxs uppercase tracking-wider rounded-xl shadow active:scale-95 transition-all"
              >
                + Add Operating Policy
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {policies.map(p => (
                <div key={p.configId} className="border dark:border-zinc-800 border-zinc-200/10 rounded-xl p-5 bg-zinc-50/30 dark:bg-zinc-950/20 flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-3.5 mb-2">
                      <span className="bg-synos-primary/10 text-synos-primary border border-synos-primary/20 text-xxs font-mono font-bold uppercase px-2.5 py-0.5 rounded-full">
                        {p.roleName}
                      </span>
                      <h4 className="font-bold text-sm text-zinc-100">{p.departmentName} ({p.departmentCode})</h4>
                    </div>
                    <div className="text-xs text-zinc-400 space-y-1 mt-3">
                      <p>⌚ Operating Hours: <strong>{p.operatingHoursStart} - {p.operatingHoursEnd}</strong></p>
                      <p>⏱️ Default Turnaround: <strong>{p.defaultTATHours} Hours</strong></p>
                      <p>🔍 Scope: <strong>{p.canSearchAll ? 'Global (All Branches)' : 'Isolated Branch'}</strong></p>
                    </div>
                  </div>
                  <div className="flex space-x-2 shrink-0">
                    <button
                      onClick={() => {
                        setEditingPolicy(p);
                        setShowPolicyForm(true);
                      }}
                      className="p-1.5 bg-synos-primary/10 text-synos-primary hover:bg-synos-primary/25 border border-synos-primary/20 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePolicy(p.configId)}
                      className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/25 border border-red-500/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {policies.length === 0 && (
                <p className="text-zinc-550 text-xs py-4 md:col-span-2">No custom operational policies saved.</p>
              )}
            </div>

            {/* Policy Dialog */}
            {showPolicyForm && editingPolicy && (
              <div className="fixed inset-0 bg-zinc-950/45 dark:bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 animate-fadeIn">
                <div 
                  className="border border-zinc-200 dark:border-zinc-900 p-6 rounded-2xl w-full max-w-lg shadow-2xl text-xs text-zinc-800 dark:text-zinc-250"
                  style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}
                >
                  <h3 className="text-sm font-semibold mb-4 border-b border-zinc-250 dark:border-zinc-850 pb-2 text-zinc-800 dark:text-zinc-200">
                    Set Department Policy Limits
                  </h3>
                  <form onSubmit={handleSavePolicy} className="space-y-4">
                    <div>
                      <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Target Role</label>
                      <select
                        value={editingPolicy.roleName}
                        onChange={e => setEditingPolicy({ ...editingPolicy, roleName: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                        style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff', colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                      >
                        <option value="Admin">Admin</option>
                        <option value="Reception">Reception</option>
                        <option value="Pathologist">Pathologist</option>
                        <option value="PathTech">PathTech</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Department</label>
                      <select
                        value={editingPolicy.departmentId}
                        onChange={e => setEditingPolicy({ ...editingPolicy, departmentId: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                        style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff', colorScheme: theme === 'dark' ? 'dark' : 'light' }}
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
                        <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Start Hours</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 08:00"
                          value={editingPolicy.operatingHoursStart}
                          onChange={e => setEditingPolicy({ ...editingPolicy, operatingHoursStart: e.target.value })}
                          className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                          style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1">End Hours</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 20:00"
                          value={editingPolicy.operatingHoursEnd}
                          onChange={e => setEditingPolicy({ ...editingPolicy, operatingHoursEnd: e.target.value })}
                          className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                          style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Default TAT (Hours)</label>
                      <input
                        type="number"
                        required
                        value={editingPolicy.defaultTATHours}
                        onChange={e => setEditingPolicy({ ...editingPolicy, defaultTATHours: Number(e.target.value) })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                        style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}
                      />
                    </div>
                    <div>
                      <label className="flex items-center space-x-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editingPolicy.canSearchAll || false}
                          onChange={e => setEditingPolicy({ ...editingPolicy, canSearchAll: e.target.checked })}
                          className="form-checkbox h-4.5 w-4.5 text-synos-primary rounded bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 focus:ring-0 cursor-pointer"
                        />
                        <span className="font-semibold text-zinc-650 dark:text-zinc-350">Enable Search Across All Branches</span>
                      </label>
                    </div>
                    <div className="pt-4 border-t border-zinc-200 dark:border-zinc-850 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPolicyForm(false);
                          setEditingPolicy(null);
                        }}
                        className="px-4 py-2 border border-zinc-250 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-650 dark:text-zinc-400 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold rounded-xl active:scale-95 transition-all animate-none"
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
            {/* Discount Master */}
            <div className="border-b dark:border-zinc-800 border-zinc-200 pb-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-bold text-synos-primary uppercase tracking-widest mb-1">Discount Masters</h3>
                  <p className="text-zinc-550 text-xs font-semibold">Manage active patient billing discount codes and promotions.</p>
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
                  className="px-4 py-2 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold text-xxs uppercase tracking-wider rounded-xl shadow active:scale-95 transition-all"
                >
                  + Add Discount
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {discounts.map(d => (
                  <div key={d.discountDefinitionId} className="border dark:border-zinc-800 border-zinc-200/10 rounded-xl p-5 bg-zinc-50/30 dark:bg-zinc-950/20 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-mono text-xs font-bold text-synos-primary bg-synos-primary/10 px-2 py-0.5 rounded">
                          {d.code}
                        </span>
                        <span className={`h-2 w-2 rounded-full ${d.isActive ? 'bg-emerald-500' : 'bg-zinc-650'}`} />
                      </div>
                      <h4 className="font-bold text-sm text-zinc-150 mb-2">{d.name}</h4>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1 mb-4">
                        <p>Discount Value: <strong>{d.type === 0 ? `${d.value}%` : `₹${d.value}`}</strong></p>
                        {d.maxLimit && <p>Max Cap: <strong>₹{d.maxLimit}</strong></p>}
                        {d.effectiveFrom && (
                          <p className="text-[10px] text-zinc-500">
                            Range: {formatDate(d.effectiveFrom)} – {d.effectiveTo ? formatDate(d.effectiveTo) : 'Forever'}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditingDiscount(d);
                        setShowDiscountForm(true);
                      }}
                      className="w-full text-center py-2 border dark:border-zinc-800 border-zinc-200/30 hover:bg-zinc-800 text-xxs font-bold uppercase tracking-wider text-synos-primary rounded-lg transition-colors"
                    >
                      Edit discount
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Referral Partners */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-bold text-synos-primary uppercase tracking-widest mb-1">Referral Partners Registry</h3>
                  <p className="text-zinc-550 text-xs font-semibold">Configure clinics, reference labs, and physicians commission settings.</p>
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
                  className="px-4 py-2 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold text-xxs uppercase tracking-wider rounded-xl shadow active:scale-95 transition-all"
                >
                  + Add Referral Partner
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {partners.map(p => (
                  <div key={p.referralPartnerId} className="border dark:border-zinc-800 border-zinc-200/10 rounded-xl p-5 bg-zinc-50/30 dark:bg-zinc-950/20 flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2.5 mb-2">
                        <span className="bg-synos-primary/10 text-synos-primary border border-synos-primary/20 text-xxs font-bold px-2 py-0.5 rounded">
                          {p.partnerType === 0 ? 'Doctor' : p.partnerType === 1 ? 'Clinic' : 'Hospital'}
                        </span>
                        <h4 className="font-bold text-sm text-zinc-150">{p.name}</h4>
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1 mt-3">
                        {p.contactInfo && <p>📞 Contact: <strong>{p.contactInfo}</strong></p>}
                        <p>💸 Commission: <strong>{p.defaultCommissionPercentage}%</strong> ({p.calculationBase === 0 ? 'Gross base' : 'Net base'})</p>
                        {p.paymentCollectionModel && <p>💳 Settlement Mode: <strong>{p.paymentCollectionModel}</strong></p>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setEditingPartner(p);
                          setShowPartnerForm(true);
                        }}
                        className="p-1.5 bg-synos-primary/10 text-synos-primary hover:bg-synos-primary/25 border border-synos-primary/20 rounded-lg transition-colors flex items-center justify-center"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {p.isActive && (
                        <button
                          onClick={() => handleDeactivatePartner(p.referralPartnerId)}
                          className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/25 border border-red-500/20 rounded-lg transition-colors flex items-center justify-center"
                          title="Deactivate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discount Dialog Form */}
            {showDiscountForm && editingDiscount && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl w-full max-w-md shadow-2xl text-xs text-zinc-200">
                  <h3 className="text-sm font-bold mb-4 border-b border-zinc-800 pb-2 text-synos-primary uppercase tracking-widest">
                    {editingDiscount.discountDefinitionId ? 'Modify Discount Rules' : 'New Discount Setup'}
                  </h3>
                  <form onSubmit={handleSaveDiscount} className="space-y-4">
                    {!editingDiscount.discountDefinitionId && (
                      <div>
                        <label className="block text-xxs font-bold text-zinc-400 mb-1">PROMO CODE</label>
                        <input
                          type="text"
                          required
                          value={editingDiscount.code}
                          onChange={e => setEditingDiscount({ ...editingDiscount, code: e.target.value.toUpperCase() })}
                          className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm font-mono"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xxs font-bold text-zinc-400 mb-1">CAMPAIGN NAME</label>
                      <input
                        type="text"
                        required
                        value={editingDiscount.name}
                        onChange={e => setEditingDiscount({ ...editingDiscount, name: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xxs font-bold text-zinc-400 mb-1">DISCOUNT TYPE</label>
                        <select
                          value={editingDiscount.type}
                          onChange={e => setEditingDiscount({ ...editingDiscount, type: Number(e.target.value) })}
                          className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                        >
                          <option value={0}>Percentage (%)</option>
                          <option value={1}>Flat Amount (₹)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xxs font-bold text-zinc-400 mb-1">RATE / VALUE</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={editingDiscount.value}
                          onChange={e => setEditingDiscount({ ...editingDiscount, value: Number(e.target.value) })}
                          className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xxs font-bold text-zinc-400 mb-1">MAX VALUE CAP (₹) (OPTIONAL)</label>
                      <input
                        type="number"
                        value={editingDiscount.maxLimit || ''}
                        onChange={e => setEditingDiscount({ ...editingDiscount, maxLimit: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xxs font-semibold text-zinc-400 mb-1">Effective From</label>
                        <input
                          type="date"
                          value={editingDiscount.effectiveFrom ? formatDateInput(editingDiscount.effectiveFrom) : ''}
                          onChange={e => setEditingDiscount({ ...editingDiscount, effectiveFrom: e.target.value ? dateToISOString(e.target.value) : undefined })}
                          className="w-full px-3 py-2.5 bg-white dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-705 dark:text-zinc-300 shadow-sm"
                          style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff', colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xxs font-semibold text-zinc-400 mb-1">Effective To</label>
                        <input
                          type="date"
                          value={editingDiscount.effectiveTo ? formatDateInput(editingDiscount.effectiveTo) : ''}
                          onChange={e => setEditingDiscount({ ...editingDiscount, effectiveTo: e.target.value ? dateToISOString(e.target.value) : undefined })}
                          className="w-full px-3 py-2.5 bg-white dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-705 dark:text-zinc-300 shadow-sm"
                          style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff', colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center space-x-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editingDiscount.isActive}
                          onChange={e => setEditingDiscount({ ...editingDiscount, isActive: e.target.checked })}
                          className="form-checkbox h-4.5 w-4.5 text-synos-primary rounded bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 focus:ring-0 cursor-pointer"
                        />
                        <span className="font-semibold text-zinc-300">Active & Redeemable</span>
                      </label>
                    </div>
                    <div className="pt-4 border-t border-zinc-800 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDiscountForm(false);
                          setEditingDiscount(null);
                        }}
                        className="px-4 py-2 border border-zinc-800 hover:bg-zinc-800 text-zinc-450 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold rounded-xl active:scale-95 transition-all"
                      >
                        Save Discount
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Partner Dialog Form */}
            {showPartnerForm && editingPartner && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl w-full max-w-md shadow-2xl text-xs text-zinc-200">
                  <h3 className="text-sm font-bold mb-4 border-b border-zinc-800 pb-2 text-synos-primary uppercase tracking-widest">
                    {editingPartner.referralPartnerId ? 'Edit Partner Details' : 'Register Referral Partner'}
                  </h3>
                  <form onSubmit={handleSavePartner} className="space-y-4">
                    <div>
                      <label className="block text-xxs font-bold text-zinc-400 mb-1">PARTNER FULL NAME</label>
                      <input
                        type="text"
                        required
                        value={editingPartner.name}
                        onChange={e => setEditingPartner({ ...editingPartner, name: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xxs font-bold text-zinc-400 mb-1">PARTNER TYPE</label>
                        <select
                          value={editingPartner.partnerType}
                          onChange={e => setEditingPartner({ ...editingPartner, partnerType: Number(e.target.value) })}
                          className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                        >
                          <option value={0}>Doctor</option>
                          <option value={1}>Clinic</option>
                          <option value={2}>Hospital</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xxs font-bold text-zinc-400 mb-1">COMMISSION (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={editingPartner.defaultCommissionPercentage}
                          onChange={e => setEditingPartner({ ...editingPartner, defaultCommissionPercentage: Number(e.target.value) })}
                          className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xxs font-bold text-zinc-400 mb-1">COMMISSION CALCULATION BASE</label>
                      <select
                        value={editingPartner.calculationBase}
                        onChange={e => setEditingPartner({ ...editingPartner, calculationBase: Number(e.target.value) })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                      >
                        <option value={0}>Gross Pricing (Before Discounts)</option>
                        <option value={1}>Net Pricing (After Discounts)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xxs font-bold text-zinc-400 mb-1">CONTACT INFO</label>
                      <input
                        type="text"
                        value={editingPartner.contactInfo || ''}
                        onChange={e => setEditingPartner({ ...editingPartner, contactInfo: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xxs font-bold text-zinc-400 mb-1">SETTLEMENT MODEL</label>
                      <input
                        type="text"
                        value={editingPartner.paymentCollectionModel || ''}
                        onChange={e => setEditingPartner({ ...editingPartner, paymentCollectionModel: e.target.value })}
                        placeholder="e.g. Direct Billing, Monthly Invoice"
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="flex items-center space-x-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editingPartner.isActive}
                          onChange={e => setEditingPartner({ ...editingPartner, isActive: e.target.checked })}
                          className="form-checkbox h-4.5 w-4.5 text-synos-primary rounded bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 focus:ring-0 cursor-pointer"
                        />
                        <span className="font-semibold text-zinc-300">Active Partner</span>
                      </label>
                    </div>
                    <div className="pt-4 border-t border-zinc-800 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPartnerForm(false);
                          setEditingPartner(null);
                        }}
                        className="px-4 py-2 border border-zinc-800 hover:bg-zinc-800 text-zinc-450 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold rounded-xl active:scale-95 transition-all"
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
          <div className="animate-fadeIn space-y-6 text-xs text-zinc-200">
            <div>
              <h3 className="text-sm font-bold text-synos-primary uppercase tracking-widest mb-1">System Forensic Audit Trail</h3>
              <p className="text-zinc-550 text-xs font-semibold">Inspect and audit configuration changes, transactional events, and user mappings.</p>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-zinc-50/30 dark:bg-zinc-950/20 p-5 rounded-xl border dark:border-zinc-800 border-zinc-200/10">
              <div>
                <label className="block text-xxs font-bold text-zinc-400 mb-1.5 uppercase tracking-wide">Actor User</label>
                <select
                  value={selectedActor}
                  onChange={e => { setSelectedActor(e.target.value); setAuditOffset(0); }}
                  className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                >
                  <option value="">All Actors</option>
                  {users.map(u => (
                    <option key={u.userId} value={u.userId}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xxs font-bold text-zinc-400 mb-1.5 uppercase tracking-wide">Resource Type</label>
                <select
                  value={selectedResourceType}
                  onChange={e => { setSelectedResourceType(e.target.value); setAuditOffset(0); }}
                  className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                >
                  <option value="">All Modules</option>
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
                <label className="block text-xxs font-bold text-zinc-400 mb-1.5 uppercase tracking-wide">Action Name</label>
                <input
                  type="text"
                  placeholder="e.g. UpdateSystemSettings"
                  value={selectedAction}
                  onChange={e => { setSelectedAction(e.target.value); setAuditOffset(0); }}
                  className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xxs font-medium text-zinc-450 dark:text-zinc-500 mb-1.5 uppercase tracking-wide">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); setAuditOffset(0); }}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff', colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                />
              </div>
              <div>
                <label className="block text-xxs font-medium text-zinc-450 dark:text-zinc-500 mb-1.5 uppercase tracking-wide">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => { setEndDate(e.target.value); setAuditOffset(0); }}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff', colorScheme: theme === 'dark' ? 'dark' : 'light' }}
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
                  className="px-4 py-2 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 text-xxs uppercase tracking-wider rounded-xl font-bold transition-all"
                >
                  Clear Filters
                </button>
                <button
                  onClick={loadAuditLogs}
                  className="ml-3 px-5 py-2 bg-synos-primary hover:bg-synos-primary/95 text-white text-xxs uppercase tracking-wider rounded-xl font-bold shadow active:scale-95 transition-all"
                >
                  Refresh Logs
                </button>
              </div>
            </div>

            {/* Audit Grid */}
            <div className="overflow-x-auto border dark:border-zinc-850 border-zinc-200/10 rounded-xl">
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/60 dark:bg-zinc-950/60 border-b dark:border-zinc-800 border-zinc-200">
                    <th className="p-4 text-xxs font-bold uppercase tracking-wider text-zinc-400">Timestamp</th>
                    <th className="p-4 text-xxs font-bold uppercase tracking-wider text-zinc-400">Actor</th>
                    <th className="p-4 text-xxs font-bold uppercase tracking-wider text-zinc-400">Action Event</th>
                    <th className="p-4 text-xxs font-bold uppercase tracking-wider text-zinc-400">Module</th>
                    <th className="p-4 text-xxs font-bold uppercase tracking-wider text-zinc-400">Resource ID</th>
                    <th className="p-4 text-xxs font-bold uppercase tracking-wider text-center text-zinc-400">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                  {auditLogs.map(log => (
                    <tr key={log.auditId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                      <td className="p-4 text-zinc-450 font-mono text-[11px]">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="p-4 text-zinc-200 font-semibold">
                        {log.actorName} <span className="block text-xxs text-zinc-500 font-mono font-medium">@{log.actorUsername}</span>
                      </td>
                      <td className="p-4 text-synos-primary font-mono font-bold">{log.action}</td>
                      <td className="p-4 text-zinc-300 font-semibold">{log.resourceType}</td>
                      <td className="p-4 text-zinc-500 font-mono">{log.resourceId}</td>
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
                          className="p-1.5 bg-synos-primary/10 text-synos-primary hover:bg-synos-primary/25 border border-synos-primary/20 rounded-lg transition-colors flex items-center justify-center mx-auto"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500 font-semibold uppercase tracking-wider">
                        No audit events match current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {auditTotal > auditLimit && (
              <div className="flex justify-between items-center pt-4">
                <span className="text-xxs font-bold text-zinc-500 uppercase tracking-widest">
                  Showing {auditOffset + 1} to {Math.min(auditOffset + auditLimit, auditTotal)} of {auditTotal} logs
                </span>
                <div className="flex space-x-2">
                  <button
                    disabled={auditOffset === 0}
                    onClick={() => setAuditOffset(prev => Math.max(0, prev - auditLimit))}
                    className="px-4 py-2 border border-zinc-800 hover:bg-zinc-800 rounded-xl text-xxs font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Prev
                  </button>
                  <button
                    disabled={auditOffset + auditLimit >= auditTotal}
                    onClick={() => setAuditOffset(prev => prev + auditLimit)}
                    className="px-4 py-2 border border-zinc-800 hover:bg-zinc-800 rounded-xl text-xxs font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Diff details modal */}
            {selectedLogPayload && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl">
                  <h3 className="text-sm font-bold mb-4 border-b border-zinc-800 pb-2 text-synos-primary uppercase tracking-widest">
                    State Difference Details
                  </h3>
                  <div className="space-y-4">
                    {selectedLogPayload.Old || selectedLogPayload.New || selectedLogPayload.old || selectedLogPayload.new ? (
                      <div className="overflow-x-auto border border-zinc-800 rounded-xl">
                        <table className="min-w-full text-left border-collapse text-xxs">
                          <thead>
                            <tr className="bg-zinc-950/50 border-b border-zinc-850">
                              <th className="p-3 font-bold text-zinc-400 uppercase tracking-wider">Property</th>
                              <th className="p-3 font-bold text-red-400 uppercase tracking-wider">Before (Original)</th>
                              <th className="p-3 font-bold text-emerald-400 uppercase tracking-wider">After (Modified)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800 font-mono">
                            {Object.keys({
                              ...(selectedLogPayload.Old || selectedLogPayload.old || {}),
                              ...(selectedLogPayload.New || selectedLogPayload.new || {})
                            }).map(key => {
                              const before = (selectedLogPayload.Old || selectedLogPayload.old)?.[key];
                              const after = (selectedLogPayload.New || selectedLogPayload.new)?.[key];
                              const isDiff = JSON.stringify(before) !== JSON.stringify(after);

                              return (
                                <tr key={key} className={isDiff ? 'bg-synos-primary/5' : 'opacity-55'}>
                                  <td className="p-3 font-semibold text-zinc-300">{key}</td>
                                  <td className="p-3 text-red-300 break-all">{before !== undefined ? String(before) : '—'}</td>
                                  <td className="p-3 text-emerald-300 break-all font-semibold">{after !== undefined ? String(after) : '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <pre className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xxs text-zinc-400 font-mono overflow-auto max-h-80">
                        {JSON.stringify(selectedLogPayload, null, 2)}
                      </pre>
                    )}
                  </div>
                  <div className="mt-6 border-t border-zinc-800 pt-4 flex justify-end">
                    <button
                      onClick={() => setSelectedLogPayload(null)}
                      className="px-6 py-2.5 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold text-xxs uppercase tracking-wider rounded-xl active:scale-95 transition-all"
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
