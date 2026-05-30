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
  Eye,
  Globe,
  Printer
} from 'lucide-react';

export function SystemSettingsScreen() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('settings');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [saveError, setSaveError] = useState(null);

  // Branches State
  const [branches, setBranches] = useState([]);
  const [editingBranch, setEditingBranch] = useState(null);
  const [showBranchForm, setShowBranchForm] = useState(false);

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

  // Printing & Hardware State
  const [printers, setPrinters] = useState([]);
  const [terminals, setTerminals] = useState([]);
  const [editingPrinter, setEditingPrinter] = useState(null);
  const [showPrinterForm, setShowPrinterForm] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState(null);
  const [showTerminalForm, setShowTerminalForm] = useState(false);
  const [thermalSettings, setThermalSettings] = useState({
    paperWidth: '80mm',
    textSize: 'standard',
    fontFamily: 'sans-serif',
    showHeader: true,
    showAgeGender: true,
    showVisitId: true,
    showTokenBox: true,
    showDoctorName: true,
    showItemDiscounts: true,
    showUpiQr: false,
    upiId: '',
    headerSubtext: '',
    footerDisclaimer: '* Clinical correlation required'
  });
  const [isOverrideActive, setIsOverrideActive] = useState(false);

  const loadPrintingData = async () => {
    setLoading(true);
    try {
      const [printersRes, terminalsRes, branchesRes, globalSettings] = await Promise.all([
        AdminApi.getBranchPrinters(),
        AdminApi.getTerminalPrinterConfigs(),
        AdminApi.getBranches(),
        AdminApi.getGlobalThermalSettings()
      ]);
      setPrinters(printersRes || []);
      setTerminals(terminalsRes || []);
      setBranches(branchesRes || []);

      const local = localStorage.getItem('synos_thermal_layout_settings');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          setThermalSettings(parsed);
          setIsOverrideActive(true);
        } catch {
          setThermalSettings(globalSettings || {});
          setIsOverrideActive(false);
        }
      } else {
        setThermalSettings(globalSettings || {});
        setIsOverrideActive(false);
      }
    } catch (err) {
      setSaveError(err.message || 'Failed to load printing hardware configurations.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrinter = async (e) => {
    e.preventDefault();
    if (!editingPrinter.printerName?.trim()) {
      return setSaveError('Printer Name cannot be empty.');
    }
    if (!editingPrinter.branchId) {
      return setSaveError('Please select a branch.');
    }

    setLoading(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      if (editingPrinter.printerId) {
        await AdminApi.updateBranchPrinter(editingPrinter.printerId, {
          printerName: editingPrinter.printerName.trim(),
          printerType: editingPrinter.printerType || 'Thermal80mm',
          isActive: editingPrinter.isActive,
          branchId: editingPrinter.branchId
        });
        setSaveSuccess('Printer details updated successfully.');
      } else {
        await AdminApi.createBranchPrinter({
          printerName: editingPrinter.printerName.trim(),
          printerType: editingPrinter.printerType || 'Thermal80mm',
          isActive: editingPrinter.isActive ?? true,
          branchId: editingPrinter.branchId
        });
        setSaveSuccess('New branch printer registered successfully.');
      }
      setShowPrinterForm(false);
      setEditingPrinter(null);
      await loadPrintingData();
    } catch (err) {
      setSaveError(err.message || 'Failed to save printer.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePrinter = async (printerId) => {
    if (!window.confirm('Are you sure you want to delete this branch printer?')) return;

    setLoading(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await AdminApi.deleteBranchPrinter(printerId);
      setSaveSuccess('Printer deleted successfully.');
      await loadPrintingData();
    } catch (err) {
      setSaveError(err.message || 'Failed to delete printer.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTerminalConfig = async (e) => {
    e.preventDefault();
    if (!editingTerminal.terminalIdentifier?.trim()) {
      return setSaveError('Terminal Identifier cannot be empty.');
    }
    if (!editingTerminal.branchId) {
      return setSaveError('Please select a branch.');
    }

    setLoading(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const payload = {
        terminalIdentifier: editingTerminal.terminalIdentifier.trim(),
        branchId: editingTerminal.branchId,
        isLeadPrintTerminal: editingTerminal.isLeadPrintTerminal ?? false,
        specificReceiptPrinterId: editingTerminal.specificReceiptPrinterId || null
      };

      const isExisting = terminals.some(t => t.terminalIdentifier === editingTerminal.terminalIdentifier);

      if (isExisting) {
        await AdminApi.updateTerminalPrinterConfig(editingTerminal.terminalIdentifier, payload);
        setSaveSuccess('Terminal printer configuration updated successfully.');
      } else {
        await AdminApi.createTerminalPrinterConfig(payload);
        setSaveSuccess('Terminal printer configuration registered successfully.');
      }
      setShowTerminalForm(false);
      setEditingTerminal(null);
      await loadPrintingData();
    } catch (err) {
      setSaveError(err.message || 'Failed to save terminal configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTerminalConfig = async (terminalIdentifier) => {
    if (!window.confirm('Are you sure you want to remove this terminal authorization?')) return;

    setLoading(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await AdminApi.deleteTerminalPrinterConfig(terminalIdentifier);
      setSaveSuccess('Terminal authorization removed successfully.');
      await loadPrintingData();
    } catch (err) {
      setSaveError(err.message || 'Failed to delete terminal configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGlobalThermalSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      await AdminApi.saveGlobalThermalSettings(thermalSettings);
      setSaveSuccess('Global thermal layout settings successfully updated and saved on server.');
    } catch (err) {
      setSaveError(err.message || 'Failed to save global settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLocalOverride = () => {
    localStorage.setItem('synos_thermal_layout_settings', JSON.stringify(thermalSettings));
    setIsOverrideActive(true);
    setSaveSuccess('Workstation-specific print layout override applied locally.');
  };

  const handleClearLocalOverride = async () => {
    localStorage.removeItem('synos_thermal_layout_settings');
    setIsOverrideActive(false);
    setSaveSuccess('Workstation-specific override cleared. Reverted to global server fallback.');
    await loadPrintingData();
  };

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

  const loadBranches = async () => {
    setLoading(true);
    try {
      const response = await AdminApi.getBranches();
      setBranches(response || []);
    } catch (err) {
      setSaveError(err.message || 'Failed to load branches.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    if (!editingBranch.code?.trim() || !editingBranch.name?.trim()) {
      return setSaveError('Branch Code and Name cannot be empty.');
    }

    setLoading(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      if (editingBranch.branchId) {
        await AdminApi.updateBranch(editingBranch.branchId, {
          code: editingBranch.code.trim(),
          name: editingBranch.name.trim(),
          isActive: editingBranch.isActive,
          address: editingBranch.address?.trim() || null,
          phone: editingBranch.phone?.trim() || null,
          email: editingBranch.email?.trim() || null
        });
        setSaveSuccess('Branch details updated successfully.');
      } else {
        await AdminApi.createBranch({
          code: editingBranch.code.trim(),
          name: editingBranch.name.trim(),
          address: editingBranch.address?.trim() || null,
          phone: editingBranch.phone?.trim() || null,
          email: editingBranch.email?.trim() || null
        });
        setSaveSuccess('New branch registered successfully.');
      }
      setShowBranchForm(false);
      setEditingBranch(null);
      await loadBranches();
    } catch (err) {
      setSaveError(err.message || 'Failed to save branch.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBranch = async (branchId) => {
    if (!window.confirm('Are you sure you want to delete this branch? If this branch has active staff assignments, you must deactivate it instead.')) return;

    setLoading(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await AdminApi.deleteBranch(branchId);
      setSaveSuccess('Branch deleted successfully.');
      await loadBranches();
    } catch (err) {
      setSaveError(err.message || 'Failed to delete branch.');
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
    if (activeTab === 'branches') loadBranches();
    if (activeTab === 'printing') loadPrintingData();
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
          { id: 'branches', label: 'Branches', icon: Globe },
          { id: 'printing', label: 'Printing Setup', icon: Printer },
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
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Watermark Image URL</label>
                  <input
                    type="text"
                    value={settings.watermarkUrl || ''}
                    onChange={e => setSettings({ ...settings, watermarkUrl: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                    placeholder="e.g. /images/watermark.png"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Global Report Disclaimer (PDF Footer)</label>
                  <input
                    type="text"
                    value={settings.footerDisclaimer || ''}
                    onChange={e => setSettings({ ...settings, footerDisclaimer: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                    placeholder="e.g. * Clinical correlation required. Please consult a pathologist."
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
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t dark:border-zinc-900 border-zinc-200/50">
                  <div>
                    <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">WhatsApp Gateway URL</label>
                    <input
                      type="text"
                      placeholder="e.g. https://api.whatsapp.com/v1/messages"
                      value={settings.whatsAppGatewayUrl || ''}
                      onChange={e => setSettings({ ...settings, whatsAppGatewayUrl: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">WhatsApp API Key / Secret</label>
                    <input
                      type="password"
                      placeholder="WhatsApp Gateway authentication key"
                      value={settings.whatsAppApiKey || ''}
                      onChange={e => setSettings({ ...settings, whatsAppApiKey: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                    />
                  </div>
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

        {/* BRANCHES MANAGEMENT TAB */}
        {activeTab === 'branches' && !loading && (
          <div className="animate-fadeIn space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-synos-primary uppercase tracking-widest mb-1">Laboratory branches & facilities</h3>
                <p className="text-zinc-500 text-xs font-semibold">Manage physical laboratory branches, active status, and accession codes.</p>
              </div>
              <button
                onClick={() => {
                  setEditingBranch({
                    code: '',
                    name: '',
                    isActive: true,
                    address: '',
                    phone: '',
                    email: ''
                  });
                  setShowBranchForm(true);
                }}
                className="px-4 py-2 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold text-xxs uppercase tracking-wider rounded-xl shadow active:scale-95 transition-all"
              >
                + Add Branch
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {branches.map(b => (
                <div 
                  key={b.branchId} 
                  className="border dark:border-zinc-800 border-zinc-200/10 rounded-xl p-5 bg-zinc-50/30 dark:bg-zinc-950/20 flex flex-col justify-between"
                  style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="bg-synos-primary/10 text-synos-primary border border-synos-primary/20 text-xxs font-mono font-bold px-2 py-0.5 rounded-md">
                          {b.code}
                        </span>
                        <span className={`w-1.5 h-1.5 rounded-full ${b.isActive ? 'bg-emerald-500' : 'bg-zinc-550'}`} title={b.isActive ? 'Active' : 'Inactive'} />
                      </div>
                      <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 mt-2">{b.name}</h4>
                    </div>
                    <div className="flex space-x-2 shrink-0">
                      <button
                        onClick={() => {
                          setEditingBranch(b);
                          setShowBranchForm(true);
                        }}
                        className="p-1.5 bg-synos-primary/10 text-synos-primary hover:bg-synos-primary/25 border border-synos-primary/20 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {b.code !== 'MAIN' && (
                        <button
                          onClick={() => handleDeleteBranch(b.branchId)}
                          className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/25 border border-red-500/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="border-t dark:border-zinc-800 border-zinc-100 pt-3 mt-2 flex justify-between items-center text-xxs text-zinc-400">
                    <span>Status: <strong>{b.isActive ? 'Active Operational' : 'Deactivated'}</strong></span>
                    <span className="font-mono text-[9px] opacity-60">{b.branchId}</span>
                  </div>
                </div>
              ))}
              {branches.length === 0 && (
                <p className="text-zinc-550 text-xs py-4 md:col-span-3">No laboratory branches saved.</p>
              )}
            </div>

            {/* Branch Form Dialog */}
            {showBranchForm && editingBranch && (
              <div className="fixed inset-0 bg-zinc-950/45 dark:bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 animate-fadeIn">
                <div 
                  className="border border-zinc-200 dark:border-zinc-900 p-6 rounded-2xl w-full max-w-md shadow-2xl text-xs text-zinc-800 dark:text-zinc-250"
                  style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}
                >
                  <h3 className="text-sm font-semibold mb-4 border-b border-zinc-250 dark:border-zinc-850 pb-2 text-zinc-800 dark:text-zinc-200">
                    {editingBranch.branchId ? 'Edit Branch' : 'Register New Branch'}
                  </h3>
                  <form onSubmit={handleSaveBranch} className="space-y-4">
                    <div>
                      <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Branch Code</label>
                      <input
                        type="text"
                        maxLength={10}
                        required
                        value={editingBranch.code}
                        onChange={e => setEditingBranch({ ...editingBranch, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 font-mono"
                        placeholder="e.g. MAIN, BR2, NORTH"
                        disabled={editingBranch.code === 'MAIN'}
                      />
                    </div>
                    <div>
                      <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Branch Name</label>
                      <input
                        type="text"
                        required
                        value={editingBranch.name}
                        onChange={e => setEditingBranch({ ...editingBranch, name: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300"
                        placeholder="e.g. North Laboratory Branch"
                      />
                    </div>
                    <div>
                      <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Physical Address</label>
                      <textarea
                        rows={2}
                        value={editingBranch.address || ''}
                        onChange={e => setEditingBranch({ ...editingBranch, address: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 resize-none"
                        placeholder="e.g. 123 Health Street, North Zone"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Contact Phone</label>
                        <input
                          type="text"
                          value={editingBranch.phone || ''}
                          onChange={e => setEditingBranch({ ...editingBranch, phone: e.target.value })}
                          className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300"
                          placeholder="e.g. +91 98765 43210"
                        />
                      </div>
                      <div>
                        <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Contact Email</label>
                        <input
                          type="email"
                          value={editingBranch.email || ''}
                          onChange={e => setEditingBranch({ ...editingBranch, email: e.target.value })}
                          className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300"
                          placeholder="e.g. branch@apex.com"
                        />
                      </div>
                    </div>
                    {editingBranch.branchId && editingBranch.code !== 'MAIN' && (
                      <div className="flex items-center space-x-2 pt-2">
                        <input
                          type="checkbox"
                          id="branch-active"
                          checked={editingBranch.isActive}
                          onChange={e => setEditingBranch({ ...editingBranch, isActive: e.target.checked })}
                          className="rounded border-zinc-300 dark:border-zinc-700 text-synos-primary focus:ring-synos-primary w-4 h-4"
                        />
                        <label htmlFor="branch-active" className="text-xxs font-semibold text-zinc-400 dark:text-zinc-500 cursor-pointer">
                          Active & Operational
                        </label>
                      </div>
                    )}
                    <div className="flex justify-end space-x-2.5 pt-4 border-t border-zinc-250 dark:border-zinc-850">
                      <button
                        type="button"
                        onClick={() => {
                          setShowBranchForm(false);
                          setEditingBranch(null);
                        }}
                        className="px-4 py-2 border border-zinc-300 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-xxs uppercase tracking-wider font-bold transition-all text-zinc-650 dark:text-zinc-400"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-synos-primary hover:bg-synos-primary/95 text-white text-xxs uppercase tracking-wider rounded-xl font-bold shadow active:scale-95 transition-all"
                      >
                        Save Branch
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PRINTING SETUP TAB */}
        {activeTab === 'printing' && !loading && (
          <div className="animate-fadeIn space-y-8 text-xs">
            {/* Helper Info Box displaying current workstation Terminal ID */}
            <div className="p-6 rounded-2xl bg-synos-primary/10 border border-synos-primary/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h4 className="font-bold text-sm text-synos-primary uppercase tracking-wider">Your Workstation Terminal</h4>
                <p className="text-zinc-500 text-xs font-semibold mt-1">
                  Active Web Terminal ID: <strong className="font-mono text-zinc-800 dark:text-zinc-200 bg-zinc-150 dark:bg-zinc-900 px-2 py-0.5 rounded border dark:border-white/5">{localStorage.getItem('synos_terminal_id') || 'Not Generated'}</strong>
                </p>
              </div>
              <button
                onClick={() => {
                  const currentId = localStorage.getItem('synos_terminal_id') || `web-${Math.random().toString(36).substr(2, 9)}`;
                  if (!localStorage.getItem('synos_terminal_id')) {
                    localStorage.setItem('synos_terminal_id', currentId);
                  }
                  setEditingTerminal({
                    terminalIdentifier: currentId,
                    branchId: branches[0]?.branchId || '',
                    isLeadPrintTerminal: true,
                    specificReceiptPrinterId: ''
                  });
                  setShowTerminalForm(true);
                }}
                className="px-4 py-2 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold text-xxs uppercase tracking-wider rounded-xl shadow active:scale-95 transition-all shrink-0"
              >
                Authorize This Workstation
              </button>
            </div>

            {/* Section 1: Branch Printers */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-synos-primary uppercase tracking-widest">1. Branch Printers Registry</h3>
                  <p className="text-zinc-500 text-xs font-semibold">Expose physical thermal or barcode printer hardware available in your branch nodes.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingPrinter({
                      printerName: '',
                      printerType: 'Thermal80mm',
                      isActive: true,
                      branchId: branches[0]?.branchId || ''
                    });
                    setShowPrinterForm(true);
                  }}
                  className="px-4 py-2 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold text-xxs uppercase tracking-wider rounded-xl shadow active:scale-95 transition-all"
                >
                  + Register Printer
                </button>
              </div>

              <div className="overflow-x-auto border dark:border-zinc-850 border-zinc-200/10 rounded-xl bg-zinc-50/10 dark:bg-zinc-950/20">
                <table className="min-w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/60 dark:bg-zinc-950/60 border-b dark:border-zinc-800 border-zinc-200">
                      <th className="p-4 text-xxs font-bold uppercase tracking-wider text-zinc-400">Printer Name (OS Config)</th>
                      <th className="p-4 text-xxs font-bold uppercase tracking-wider text-zinc-400">Branch</th>
                      <th className="p-4 text-xxs font-bold uppercase tracking-wider text-zinc-400">Printer Type / Standard</th>
                      <th className="p-4 text-xxs font-bold uppercase tracking-wider text-zinc-400">Status</th>
                      <th className="p-4 text-xxs font-bold uppercase tracking-wider text-right text-zinc-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                    {printers.map(printer => (
                      <tr key={printer.printerId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                        <td className="p-4 font-bold text-zinc-800 dark:text-zinc-200">{printer.printerName}</td>
                        <td className="p-4 text-zinc-500 font-semibold">{printer.branch?.name || 'Unknown Branch'}</td>
                        <td className="p-4 font-mono font-bold text-synos-primary">{printer.printerType || 'Thermal80mm'}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase ${printer.isActive ? 'text-emerald-500' : 'text-zinc-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${printer.isActive ? 'bg-emerald-500' : 'bg-zinc-550'}`} />
                            {printer.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => {
                                setEditingPrinter(printer);
                                setShowPrinterForm(true);
                              }}
                              className="p-1.5 bg-synos-primary/10 text-synos-primary hover:bg-synos-primary/25 border border-synos-primary/20 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePrinter(printer.printerId)}
                              className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/25 border border-red-500/20 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {printers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-zinc-500 font-semibold uppercase tracking-wider">
                          No branch printers registered yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Terminal Configurations */}
            <div className="space-y-4 pt-6 border-t dark:border-zinc-900 border-zinc-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-synos-primary uppercase tracking-widest">2. Workstation Terminals Authorization</h3>
                  <p className="text-zinc-500 text-xs font-semibold">Authorize workstation endpoints, toggle Lead Print capability, and map dedicated receipt hardware.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingTerminal({
                      terminalIdentifier: '',
                      branchId: branches[0]?.branchId || '',
                      isLeadPrintTerminal: false,
                      specificReceiptPrinterId: ''
                    });
                    setShowTerminalForm(true);
                  }}
                  className="px-4 py-2 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold text-xxs uppercase tracking-wider rounded-xl shadow active:scale-95 transition-all"
                >
                  + Authorize Terminal
                </button>
              </div>

              <div className="overflow-x-auto border dark:border-zinc-850 border-zinc-200/10 rounded-xl bg-zinc-50/10 dark:bg-zinc-950/20">
                <table className="min-w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/60 dark:bg-zinc-950/60 border-b dark:border-zinc-800 border-zinc-200">
                      <th className="p-4 text-xxs font-bold uppercase tracking-wider text-zinc-400">Terminal Identifier (Machine cookie/footprint)</th>
                      <th className="p-4 text-xxs font-bold uppercase tracking-wider text-zinc-400">Branch Assignment</th>
                      <th className="p-4 text-xxs font-bold uppercase tracking-wider text-zinc-400">Printer Routing</th>
                      <th className="p-4 text-xxs font-bold uppercase tracking-wider text-zinc-400">Lead Print Terminal</th>
                      <th className="p-4 text-xxs font-bold uppercase tracking-wider text-right text-zinc-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                    {terminals.map(config => {
                      const isCurrent = config.terminalIdentifier === localStorage.getItem('synos_terminal_id');
                      return (
                        <tr key={config.terminalIdentifier} className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors ${isCurrent ? 'bg-synos-primary/[0.03]' : ''}`}>
                          <td className="p-4 font-mono font-bold text-zinc-850 dark:text-zinc-200">
                            {config.terminalIdentifier}
                            {isCurrent && (
                              <span className="ml-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-sans font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Current Node
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-zinc-550 font-semibold">{config.branch?.name || 'Unknown Branch'}</td>
                          <td className="p-4 font-semibold text-zinc-700 dark:text-zinc-300">
                            {config.specificReceiptPrinter?.printerName ? (
                              <span className="flex items-center gap-1.5">
                                <Printer className="w-3.5 h-3.5 text-synos-primary" />
                                {config.specificReceiptPrinter.printerName}
                              </span>
                            ) : (
                              <span className="text-zinc-400 italic">OS Default / None Assigned</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase ${config.isLeadPrintTerminal ? 'text-synos-primary' : 'text-zinc-500'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${config.isLeadPrintTerminal ? 'bg-synos-primary' : 'bg-zinc-550'}`} />
                              {config.isLeadPrintTerminal ? 'AUTHORIZED LEAD' : 'Standard Web'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setEditingTerminal(config);
                                  setShowTerminalForm(true);
                                }}
                                className="p-1.5 bg-synos-primary/10 text-synos-primary hover:bg-synos-primary/25 border border-synos-primary/20 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTerminalConfig(config.terminalIdentifier)}
                                className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/25 border border-red-500/20 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {terminals.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-zinc-500 font-semibold uppercase tracking-wider">
                          No workstation terminals authorized yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3: Thermal Receipt Layout Customizer */}
            <div className="space-y-6 pt-6 border-t dark:border-zinc-900 border-zinc-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-synos-primary uppercase tracking-widest">3. Thermal Receipt Layout Customizer</h3>
                  <p className="text-zinc-500 text-xs font-semibold">Customize thermal receipt dimensions, spacing, typography, and transaction UPI QR codes.</p>
                </div>
                {isOverrideActive && (
                  <button
                    onClick={handleClearLocalOverride}
                    className="px-4 py-2 border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-550 font-bold text-xxs uppercase tracking-wider rounded-xl transition-all"
                  >
                    Clear Workstation Override
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveGlobalThermalSettings} className="space-y-6 bg-zinc-50/5 dark:bg-zinc-950/20 p-6 rounded-2xl border dark:border-zinc-900 border-zinc-100/10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Paper Dimensions & Font Setup */}
                  <div>
                    <h4 className="font-bold text-xs text-zinc-700 dark:text-zinc-300 mb-3 border-b dark:border-zinc-850 pb-1.5 uppercase tracking-wider">Dimensions & Font</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xxs font-bold text-zinc-400 mb-1.5 uppercase tracking-wide">Paper Width Size</label>
                        <select
                          value={thermalSettings.paperWidth || '80mm'}
                          onChange={e => setThermalSettings({ ...thermalSettings, paperWidth: e.target.value })}
                          className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                        >
                          <option value="80mm">Standard Thermal roll (80mm width / 3-inch)</option>
                          <option value="58mm">Compact Thermal roll (58mm width / 2-inch)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xxs font-bold text-zinc-400 mb-1.5 uppercase tracking-wide">Typography & Font Family</label>
                        <select
                          value={thermalSettings.fontFamily || 'sans-serif'}
                          onChange={e => setThermalSettings({ ...thermalSettings, fontFamily: e.target.value })}
                          className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                        >
                          <option value="sans-serif">Standard sans-serif (Clean & Modern)</option>
                          <option value="mono">Monospace typewriter (Fixed Width Alignment)</option>
                          <option value="outfit">Elegant Outfit Sans (Premium Look)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xxs font-bold text-zinc-400 mb-1.5 uppercase tracking-wide">Text Size & Line Spacing</label>
                        <select
                          value={thermalSettings.textSize || 'standard'}
                          onChange={e => setThermalSettings({ ...thermalSettings, textSize: e.target.value })}
                          className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                        >
                          <option value="standard">Standard Size (Comfortable legibility)</option>
                          <option value="compact">Compact / Ultra-Save (Saves paper roll, tight padding)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Content Toggles */}
                  <div>
                    <h4 className="font-bold text-xs text-zinc-700 dark:text-zinc-300 mb-3 border-b dark:border-zinc-855 pb-1.5 uppercase tracking-wider">Content Toggles</h4>
                    <div className="space-y-3 pt-1">
                      <label className="flex items-center space-x-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={thermalSettings.showHeader ?? true}
                          onChange={e => setThermalSettings({ ...thermalSettings, showHeader: e.target.checked })}
                          className="form-checkbox h-4.5 w-4.5 text-synos-primary rounded bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 focus:ring-0 cursor-pointer"
                        />
                        <span className="font-semibold text-zinc-350">Show Branding Header / Title</span>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={thermalSettings.showAgeGender ?? true}
                          onChange={e => setThermalSettings({ ...thermalSettings, showAgeGender: e.target.checked })}
                          className="form-checkbox h-4.5 w-4.5 text-synos-primary rounded bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 focus:ring-0 cursor-pointer"
                        />
                        <span className="font-semibold text-zinc-350">Show Patient Sex & Age</span>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={thermalSettings.showVisitId ?? true}
                          onChange={e => setThermalSettings({ ...thermalSettings, showVisitId: e.target.checked })}
                          className="form-checkbox h-4.5 w-4.5 text-synos-primary rounded bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 focus:ring-0 cursor-pointer"
                        />
                        <span className="font-semibold text-zinc-350">Show Visit ID / Accession Code</span>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={thermalSettings.showTokenBox ?? true}
                          onChange={e => setThermalSettings({ ...thermalSettings, showTokenBox: e.target.checked })}
                          className="form-checkbox h-4.5 w-4.5 text-synos-primary rounded bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 focus:ring-0 cursor-pointer"
                        />
                        <span className="font-semibold text-zinc-350">Show Large Token Callout Box</span>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={thermalSettings.showDoctorName ?? true}
                          onChange={e => setThermalSettings({ ...thermalSettings, showDoctorName: e.target.checked })}
                          className="form-checkbox h-4.5 w-4.5 text-synos-primary rounded bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 focus:ring-0 cursor-pointer"
                        />
                        <span className="font-semibold text-zinc-350">Show Referring Doctor Name</span>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={thermalSettings.showItemDiscounts ?? true}
                          onChange={e => setThermalSettings({ ...thermalSettings, showItemDiscounts: e.target.checked })}
                          className="form-checkbox h-4.5 w-4.5 text-synos-primary rounded bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 focus:ring-0 cursor-pointer"
                        />
                        <span className="font-semibold text-zinc-350">Show Itemized Discount Column</span>
                      </label>
                    </div>
                  </div>

                  {/* Payment UPI QR Code Setup */}
                  <div>
                    <h4 className="font-bold text-xs text-zinc-700 dark:text-zinc-300 mb-3 border-b dark:border-zinc-855 pb-1.5 uppercase tracking-wider">Transaction UPI QR</h4>
                    <div className="space-y-4">
                      <label className="flex items-center space-x-3 cursor-pointer select-none pt-1">
                        <input
                          type="checkbox"
                          checked={thermalSettings.showUpiQr ?? false}
                          onChange={e => setThermalSettings({ ...thermalSettings, showUpiQr: e.target.checked })}
                          className="form-checkbox h-4.5 w-4.5 text-synos-primary rounded bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 focus:ring-0 cursor-pointer"
                        />
                        <span className="font-semibold text-zinc-350">Print Dynamic UPI Payment QR Code</span>
                      </label>

                      {thermalSettings.showUpiQr && (
                        <div className="animate-fadeIn">
                          <label className="block text-xxs font-bold text-zinc-400 mb-1.5 uppercase tracking-wide">Lab Merchant UPI ID</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. labmerchant@okaxis"
                            value={thermalSettings.upiId || ''}
                            onChange={e => setThermalSettings({ ...thermalSettings, upiId: e.target.value.trim() })}
                            className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 font-mono shadow-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Headers & Footers Texts */}
                  <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div>
                      <label className="block text-xxs font-bold text-zinc-400 mb-1.5 uppercase tracking-wide">Receipt Sub-Header Greeting Text</label>
                      <input
                        type="text"
                        placeholder="e.g. Welcome to Khammam Branch. Diagnostics Excellence."
                        value={thermalSettings.headerSubtext || ''}
                        onChange={e => setThermalSettings({ ...thermalSettings, headerSubtext: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xxs font-bold text-zinc-400 mb-1.5 uppercase tracking-wide">Receipt Footer Disclaimer / Instructions</label>
                      <input
                        type="text"
                        placeholder="e.g. * Clinical correlation required. Bring this slip for reports."
                        value={thermalSettings.footerDisclaimer || ''}
                        onChange={e => setThermalSettings({ ...thermalSettings, footerDisclaimer: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Buttons */}
                <div className="pt-4 border-t dark:border-zinc-900 border-zinc-250/20 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="text-xxs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                    Active Setup: {isOverrideActive ? (
                      <span className="text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/10">Workstation Local Override Active</span>
                    ) : (
                      <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">Global Server Defaults Applied</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <button
                      type="button"
                      onClick={handleSaveLocalOverride}
                      className="flex-1 md:flex-initial px-5 py-2.5 border dark:border-zinc-850 border-zinc-200 hover:bg-zinc-150 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold text-xxs uppercase tracking-wider rounded-xl transition-all shadow-sm"
                    >
                      Apply for This Workstation Only
                    </button>
                    <button
                      type="submit"
                      className="flex-1 md:flex-initial px-6 py-2.5 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold text-xxs uppercase tracking-wider rounded-xl shadow active:scale-95 transition-all"
                    >
                      Save Globally as Default
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Printer Form Dialog */}
            {showPrinterForm && editingPrinter && (
              <div className="fixed inset-0 bg-zinc-950/45 dark:bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 animate-fadeIn">
                <div 
                  className="border border-zinc-200 dark:border-zinc-900 p-6 rounded-2xl w-full max-w-md shadow-2xl text-xs text-zinc-800 dark:text-zinc-250 bg-white dark:bg-zinc-950"
                  style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}
                >
                  <h3 className="text-sm font-semibold mb-4 border-b border-zinc-250 dark:border-zinc-850 pb-2 text-zinc-800 dark:text-zinc-200">
                    {editingPrinter.printerId ? 'Edit Branch Printer' : 'Register New Branch Printer'}
                  </h3>
                  <form onSubmit={handleSavePrinter} className="space-y-4">
                    <div>
                      <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Printer Display Name</label>
                      <input
                        type="text"
                        required
                        value={editingPrinter.printerName}
                        onChange={e => setEditingPrinter({ ...editingPrinter, printerName: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300"
                        placeholder="e.g. EPSON TM-T82III Billing Desk 1"
                      />
                    </div>
                    <div>
                      <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Branch Location</label>
                      <select
                        required
                        value={editingPrinter.branchId}
                        onChange={e => setEditingPrinter({ ...editingPrinter, branchId: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                      >
                        <option value="">Select branch...</option>
                        {branches.map(b => (
                          <option key={b.branchId} value={b.branchId}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Printer Type</label>
                      <select
                        required
                        value={editingPrinter.printerType || 'Thermal80mm'}
                        onChange={e => setEditingPrinter({ ...editingPrinter, printerType: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                      >
                        <option value="Thermal80mm">Thermal Receipt 80mm (ESC/POS)</option>
                        <option value="BarcodeZebra">Barcode Label (ZPL/EPL)</option>
                      </select>
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                      <input
                        type="checkbox"
                        id="printer-active"
                        checked={editingPrinter.isActive ?? true}
                        onChange={e => setEditingPrinter({ ...editingPrinter, isActive: e.target.checked })}
                        className="rounded border-zinc-300 dark:border-zinc-700 text-synos-primary focus:ring-synos-primary w-4 h-4"
                      />
                      <label htmlFor="printer-active" className="text-xxs font-semibold text-zinc-400 dark:text-zinc-500 cursor-pointer">
                        Active & Available for Spooling
                      </label>
                    </div>
                    <div className="flex justify-end space-x-2.5 pt-4 border-t border-zinc-250 dark:border-zinc-850">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPrinterForm(false);
                          setEditingPrinter(null);
                        }}
                        className="px-4 py-2 border border-zinc-300 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-xxs uppercase tracking-wider font-bold transition-all text-zinc-650 dark:text-zinc-400"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-synos-primary hover:bg-synos-primary/95 text-white text-xxs uppercase tracking-wider rounded-xl font-bold shadow active:scale-95 transition-all"
                      >
                        Save Printer
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Terminal Form Dialog */}
            {showTerminalForm && editingTerminal && (
              <div className="fixed inset-0 bg-zinc-950/45 dark:bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 animate-fadeIn">
                <div 
                  className="border border-zinc-200 dark:border-zinc-900 p-6 rounded-2xl w-full max-w-md shadow-2xl text-xs text-zinc-800 dark:text-zinc-250 bg-white dark:bg-zinc-950"
                  style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}
                >
                  <h3 className="text-sm font-semibold mb-4 border-b border-zinc-250 dark:border-zinc-850 pb-2 text-zinc-800 dark:text-zinc-200">
                    {terminals.some(t => t.terminalIdentifier === editingTerminal.terminalIdentifier) ? 'Edit Terminal Authorization' : 'Authorize Workstation Terminal'}
                  </h3>
                  <form onSubmit={handleSaveTerminalConfig} className="space-y-4">
                    <div>
                      <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Terminal Identifier footprint</label>
                      <input
                        type="text"
                        required
                        value={editingTerminal.terminalIdentifier}
                        onChange={e => setEditingTerminal({ ...editingTerminal, terminalIdentifier: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 font-mono"
                        placeholder="e.g. web-a1b2c3d4e"
                        disabled={terminals.some(t => t.terminalIdentifier === editingTerminal.terminalIdentifier)}
                      />
                    </div>
                    <div>
                      <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Branch Assignment</label>
                      <select
                        required
                        value={editingTerminal.branchId}
                        onChange={e => setEditingTerminal({ ...editingTerminal, branchId: e.target.value, specificReceiptPrinterId: '' })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                      >
                        <option value="">Select branch...</option>
                        {branches.map(b => (
                          <option key={b.branchId} value={b.branchId}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Dedicated Thermal Printer (Optional)</label>
                      <select
                        value={editingTerminal.specificReceiptPrinterId || ''}
                        onChange={e => setEditingTerminal({ ...editingTerminal, specificReceiptPrinterId: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                      >
                        <option value="">None (Use Operating System Default)</option>
                        {printers
                          .filter(p => p.branchId === editingTerminal.branchId && p.isActive)
                          .map(p => (
                            <option key={p.printerId} value={p.printerId}>{p.printerName} ({p.printerType})</option>
                          ))}
                      </select>
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                      <input
                        type="checkbox"
                        id="terminal-lead"
                        checked={editingTerminal.isLeadPrintTerminal ?? false}
                        onChange={e => setEditingTerminal({ ...editingTerminal, isLeadPrintTerminal: e.target.checked })}
                        className="rounded border-zinc-300 dark:border-zinc-700 text-synos-primary focus:ring-synos-primary w-4 h-4"
                      />
                      <label htmlFor="terminal-lead" className="text-xxs font-semibold text-zinc-400 dark:text-zinc-500 cursor-pointer">
                        Designate as Lead Print Terminal (SignalR Listener)
                      </label>
                    </div>
                    <div className="flex justify-end space-x-2.5 pt-4 border-t border-zinc-250 dark:border-zinc-850">
                      <button
                        type="button"
                        onClick={() => {
                          setShowTerminalForm(false);
                          setEditingTerminal(null);
                        }}
                        className="px-4 py-2 border border-zinc-300 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-xxs uppercase tracking-wider font-bold transition-all text-zinc-650 dark:text-zinc-400"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-synos-primary hover:bg-synos-primary/95 text-white text-xxs uppercase tracking-wider rounded-xl font-bold shadow active:scale-95 transition-all"
                      >
                        Authorize Workstation
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
