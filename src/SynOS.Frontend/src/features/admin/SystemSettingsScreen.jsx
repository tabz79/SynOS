import React, { useEffect, useState, useRef } from 'react';
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

function formatFileSize(bytes) {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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
  Printer,
  Database,
  LifeBuoy,
  Info
} from 'lucide-react';
import { apiClient } from '@/api/client';

export function SystemSettingsScreen() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('settings');
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [saveError, setSaveError] = useState(null);

  // Backup State
  const [backups, setBackups] = useState([]);
  const [runningBackup, setRunningBackup] = useState(false);
  const [restoringBackupId, setRestoringBackupId] = useState(null);
  const [uploadingBackup, setUploadingBackup] = useState(false);

  // Reset Operational Data State
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetting, setResetting] = useState(false);

  // Support Tickets State
  const [tickets, setTickets] = useState([]);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketPriority, setTicketPriority] = useState('Medium');
  const [ticketCategory, setTicketCategory] = useState('General');

  // About / System Update State
  const [systemInfo, setSystemInfo] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [applyingUpdate, setApplyingUpdate] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState(null);
  const [readinessReport, setReadinessReport] = useState(null);
  const [checkingReadiness, setCheckingReadiness] = useState(false);
  const [updateManifest, setUpdateManifest] = useState(JSON.stringify({
    TargetArchitecture: "x64",
    RequiredDiskSpaceGB: 10,
    DatabaseVersion: "LocalDB v15.0"
  }, null, 2));

  // Branches State
  const [branches, setBranches] = useState([]);
  const [editingBranch, setEditingBranch] = useState(null);
  const [showBranchForm, setShowBranchForm] = useState(false);

  // Workspaces State
  const [workspaces, setWorkspaces] = useState([]);
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [showWorkspaceForm, setShowWorkspaceForm] = useState(false);

  // Global Settings State
  const [settings, setSettings] = useState(null);
  const [advancedSettings, setAdvancedSettings] = useState(null);
  const [savingAdvanced, setSavingAdvanced] = useState(false);
  const [oneTimeKey, setOneTimeKey] = useState(null);
  const [showKeyDialog, setShowKeyDialog] = useState(false);

  // License Key State
  const [newLicenseKey, setNewLicenseKey] = useState('');
  const [licenseUpdating, setLicenseUpdating] = useState(false);
  const [licenseMsg, setLicenseMsg] = useState(null);

  // Roles & Permissions Matrix State
  const [roles, setRoles] = useState([]);
  const [capabilities, setCapabilities] = useState([]);
  const [mappings, setMappings] = useState([]);

  // Sync scrollbar references for Roles Matrix
  const topScrollRef = useRef(null);
  const tableContainerRef = useRef(null);
  const tableRef = useRef(null);
  const [tableWidth, setTableWidth] = useState(0);

  useEffect(() => {
    if (activeTab === 'permissions' && tableRef.current) {
      const handleResize = () => {
        setTableWidth(tableRef.current.scrollWidth);
      };
      const observer = new ResizeObserver(handleResize);
      observer.observe(tableRef.current);
      handleResize();
      return () => observer.disconnect();
    }
  }, [activeTab, mappings, roles, capabilities]);

  const handleTopScroll = () => {
    if (tableContainerRef.current && topScrollRef.current) {
      tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleTableScroll = () => {
    if (tableContainerRef.current && topScrollRef.current) {
      topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
  };

  // Department Policies State
  const [policies, setPolicies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
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

  const loadAdvancedSettings = async () => {
    setLoading(true);
    try {
      const response = await AdminApi.getAdvancedSettings();
      setAdvancedSettings(response);
    } catch (err) {
      setSaveError(err.message || 'Failed to load advanced settings.');
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

  const loadWorkspaces = async () => {
    setLoading(true);
    try {
      const response = await AdminApi.getWorkspaces();
      setWorkspaces(response || []);
    } catch (err) {
      setSaveError(err.message || 'Failed to load workspaces.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWorkspace = async (e) => {
    e.preventDefault();
    if (!editingWorkspace.name?.trim() || !editingWorkspace.routePath?.trim()) {
      return setSaveError('Workspace Name and Route Path cannot be empty.');
    }

    setLoading(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      if (editingWorkspace.workspaceId) {
        await AdminApi.updateWorkspace(editingWorkspace.workspaceId, {
          name: editingWorkspace.name.trim(),
          routePath: editingWorkspace.routePath.trim(),
          isActive: editingWorkspace.isActive
        });
        setSaveSuccess('Workspace details updated successfully.');
      } else {
        await AdminApi.createWorkspace({
          name: editingWorkspace.name.trim(),
          routePath: editingWorkspace.routePath.trim()
        });
        setSaveSuccess('New workspace registered successfully.');
      }
      setShowWorkspaceForm(false);
      setEditingWorkspace(null);
      await loadWorkspaces();
    } catch (err) {
      setSaveError(err.message || 'Failed to save workspace.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkspace = async (workspaceId) => {
    if (!window.confirm('Are you sure you want to delete this workspace? This will remove all staff access permissions bound to this route.')) return;

    setLoading(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await AdminApi.deleteWorkspace(workspaceId);
      setSaveSuccess('Workspace deleted successfully.');
      await loadWorkspaces();
    } catch (err) {
      setSaveError(err.message || 'Failed to delete workspace.');
    } finally {
      setLoading(false);
    }
  };

  // Backup handlers
  const loadBackups = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/v1/admin/operations/backups');
      setBackups(res || []);
    } catch (err) {
      setSaveError(err.message || 'Failed to load backups.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunBackup = async () => {
    setRunningBackup(true);
    setSaveSuccess(null);
    setSaveError(null);
    try {
      const res = await apiClient.post('/api/v1/admin/operations/backups/run?backupType=Full');
      setSaveSuccess(res?.message || 'Backup executed successfully');
      loadBackups();
    } catch (err) {
      setSaveError(err.message || 'Failed to execute backup.');
    } finally {
      setRunningBackup(false);
    }
  };

  const handleRestoreBackup = async (backupId, fileName) => {
    if (!window.confirm(`Are you sure you want to restore database to backup "${fileName}"? This will restart host operations.`)) return;
    setRestoringBackupId(backupId);
    setSaveSuccess(null);
    setSaveError(null);
    try {
      const res = await apiClient.post(`/api/v1/admin/operations/backups/restore?backupId=${backupId}&fileName=${fileName}`);
      setSaveSuccess(res?.message || 'Restore completed successfully');
      loadBackups();
    } catch (err) {
      setSaveError(err.message || 'Failed to restore database.');
    } finally {
      setRestoringBackupId(null);
    }
  };

  const handleUploadBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingBackup(true);
    setSaveSuccess(null);
    setSaveError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post('/api/v1/admin/operations/backups/upload', formData);
      setSaveSuccess(res?.message || 'Backup uploaded successfully.');
      loadBackups();
    } catch (err) {
      setSaveError(err.message || 'Failed to upload backup.');
    } finally {
      setUploadingBackup(false);
      e.target.value = ''; // Reset input to allow uploading the same file again
    }
  };

  const handleResetOperationalData = async (e) => {
    e.preventDefault();
    if (!resetPassword) {
      setResetError('Password is required');
      return;
    }
    setResetting(true);
    setResetError('');
    setResetSuccess('');
    try {
      const res = await apiClient.post('/api/v1/admin/settings/reset-operational-data', {
        password: resetPassword
      });
      setResetSuccess(res?.message || 'Operational data successfully reset.');
      setShowResetDialog(false);
      setResetPassword('');
      alert(`Success: ${res?.message || 'Operational data successfully reset.'}\nBackup ID: ${res?.backupId}`);
    } catch (err) {
      setResetError(err.response?.data?.error || err.message || 'Failed to reset operational data.');
    } finally {
      setResetting(false);
    }
  };

  // Support handlers
  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/v1/admin/operations/tickets');
      setTickets(res || []);
    } catch (err) {
      setSaveError(err.message || 'Failed to load support tickets.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    setSubmittingTicket(true);
    setSaveSuccess(null);
    setSaveError(null);
    try {
      const res = await apiClient.post('/api/v1/admin/operations/tickets/create', {
        title: ticketTitle,
        description: ticketDesc,
        priority: ticketPriority,
        category: ticketCategory
      });
      setSaveSuccess(res?.message || 'Support ticket queued successfully');
      setTicketTitle('');
      setTicketDesc('');
      loadTickets();
    } catch (err) {
      setSaveError(err.message || 'Failed to submit support ticket.');
    } finally {
      setSubmittingTicket(false);
    }
  };

  // About/updates handlers
  const loadSystemInfo = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/v1/admin/operations/system-info');
      setSystemInfo(res);
    } catch (err) {
      setSaveError(err.message || 'Failed to load system info.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setSaveSuccess(null);
    setSaveError(null);
    setAvailableUpdate(null);
    try {
      const res = await apiClient.post('/api/v1/admin/operations/updates/check');
      if (res?.updateAvailable || res?.UpdateAvailable) {
        const updateData = {
          updateAvailable: res.updateAvailable ?? res.UpdateAvailable,
          version: res.version ?? res.Version,
          releaseNotes: res.releaseNotes ?? res.ReleaseNotes,
          schemaVersion: res.schemaVersion ?? res.SchemaVersion,
          requiredFreeSpaceBytes: res.requiredFreeSpaceBytes ?? res.RequiredFreeSpaceBytes,
          checksumSha256: res.checksumSha256 ?? res.ChecksumSha256,
          downloadUrl: res.downloadUrl ?? res.DownloadUrl,
          deploymentId: res.deploymentId ?? res.DeploymentId,
          packageId: res.packageId ?? res.PackageId
        };
        setAvailableUpdate(updateData);
        setSaveSuccess(`Update v${updateData.version} is available!`);
      } else {
        setSaveSuccess(res?.message || 'The system is already running the latest software version.');
      }
      loadSystemInfo();
    } catch (err) {
      setSaveError(err.message || 'Failed to check for updates.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleCheckReadiness = async (manifestToApply) => {
    setCheckingReadiness(true);
    setSaveSuccess(null);
    setSaveError(null);
    setReadinessReport(null);
    try {
      const res = await apiClient.post('/api/v1/admin/operations/updates/assess', manifestToApply);
      setReadinessReport({ manifest: manifestToApply, report: res });
    } catch (err) {
      setSaveError(err.message || 'Failed to assess update readiness.');
    } finally {
      setCheckingReadiness(false);
    }
  };

  const handleApplyUpdate = async (manifestToApply, backupId) => {
    setApplyingUpdate(true);
    setSaveSuccess(null);
    setSaveError(null);
    setReadinessReport(null);
    try {
      const payload = {
        ...manifestToApply,
        backupId: backupId
      };
      const res = await apiClient.post('/api/v1/admin/operations/updates/apply', payload);
      setSaveSuccess(res?.message || 'Update successfully applied.');
      loadSystemInfo();
    } catch (err) {
      setSaveError(err.message || 'Failed to apply update.');
    } finally {
      setApplyingUpdate(false);
    }
  };

  const handleUpdateLicenseKey = async () => {
    if (!newLicenseKey.trim()) {
      setLicenseMsg({ type: 'error', text: 'Please enter a valid License Key.' });
      return;
    }
    setLicenseUpdating(true);
    setLicenseMsg(null);
    try {
      const res = await AdminApi.updateLicenseKey(newLicenseKey.trim());
      if (res.success) {
        setLicenseMsg({ type: 'success', text: res.message || 'License key applied successfully.' });
        setNewLicenseKey('');
        loadSettings();
      } else {
        setLicenseMsg({ type: 'error', text: res.message || 'Failed to update license key.' });
      }
    } catch (err) {
      setLicenseMsg({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to connect to backend server.'
      });
    } finally {
      setLicenseUpdating(false);
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
    if (activeTab === 'workspaces') loadWorkspaces();
    if (activeTab === 'printing') loadPrintingData();
    if (activeTab === 'audit') loadAuditLogs();
    if (activeTab === 'backup') loadBackups();
    if (activeTab === 'advanced') loadAdvancedSettings();
    if (activeTab === 'about') {
      loadSystemInfo();
      loadSettings();
    }
  }, [activeTab, auditOffset]);

  // Support tab polling loop
  useEffect(() => {
    if (activeTab !== 'support') return;

    loadTickets(); // Immediate load

    const interval = setInterval(() => {
      loadTickets();
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [activeTab]);

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

  const handleAdvancedSettingsSubmit = async (e) => {
    e.preventDefault();
    if (!advancedSettings) return;
    setSavingAdvanced(true);
    setSaveSuccess(null);
    setSaveError(null);
    try {
      await AdminApi.updateAdvancedSettings(advancedSettings);
      setSaveSuccess('Advanced system configurations successfully saved to appsettings.json. Some changes may require restarting the application host.');
    } catch (err) {
      setSaveError(err.message || 'Failed to update advanced settings.');
    } finally {
      setSavingAdvanced(false);
    }
  };

  const rotateSecret = async (secretType) => {
    let warning = '';
    if (secretType === 'jwt') {
      warning = 'Regenerating the JWT secret logs out all users. Are you sure you want to proceed?';
    } else if (secretType === 'backup') {
      warning = 'Rotating the backup key affects future backups. Are you sure you want to proceed?';
    } else if (secretType === 'diagnostics') {
      warning = 'Rotating the diagnostics key affects future diagnostic bundles. Are you sure you want to proceed?';
    } else if (secretType === 'middleware') {
      warning = 'Generating a new Middleware API Key will invalidate the current key immediately, disconnecting the Middleware until the new key is updated in its configuration. Are you sure you want to proceed?';
    }

    if (!window.confirm(warning)) return;
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const response = await AdminApi.rotateSecret(secretType);
      if (response.success) {
        setSaveSuccess(`${secretType.toUpperCase()} secret rotated successfully.`);
        if (secretType === 'middleware' && response.key) {
          setOneTimeKey(response.key);
          setShowKeyDialog(true);
        }
        loadAdvancedSettings();
      }
    } catch (err) {
      setSaveError(err.message || 'Secret rotation failed.');
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

  const handleSaveDepartment = async (e) => {
    e.preventDefault();
    if (!editingDepartment.code?.trim() || !editingDepartment.name?.trim()) {
      return setSaveError('Department Code and Name cannot be empty.');
    }

    setLoading(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      if (editingDepartment.departmentId) {
        await AdminApi.updateDepartment(editingDepartment.departmentId, {
          name: editingDepartment.name.trim(),
          macroDepartment: editingDepartment.macroDepartment?.trim() || 'Pathology',
          isActive: editingDepartment.isActive
        });
        setSaveSuccess('Department details updated successfully.');
      } else {
        await AdminApi.createDepartment({
          code: editingDepartment.code.trim().toUpperCase(),
          name: editingDepartment.name.trim(),
          macroDepartment: editingDepartment.macroDepartment?.trim() || 'Pathology'
        });
        setSaveSuccess('New department registered successfully.');
      }
      setShowDepartmentForm(false);
      setEditingDepartment(null);
      await loadDepartmentPolicies();
    } catch (err) {
      setSaveError(err.message || 'Failed to save department.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepartment = async (departmentId) => {
    if (!window.confirm('Are you sure you want to delete this department? This will remove all operational policies and test master mapping associations.')) return;

    setLoading(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await AdminApi.deleteDepartment(departmentId);
      setSaveSuccess('Department deleted successfully.');
      await loadDepartmentPolicies();
    } catch (err) {
      setSaveError(err.message || 'Failed to delete department.');
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
    <div className="w-full py-8 px-6 text-zinc-800 dark:text-zinc-100 font-sans">
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

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(156, 163, 175, 0.08);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--synos-primary, #2563eb);
          border-radius: 9999px;
          opacity: 0.8;
        }
      `}} />

      {/* Grid Layout: Left Menu Sidebar, Right Settings Contents Card */}
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-start">
        {/* Left Sub-Sidebar Menu Navigation */}
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`sticky top-0 lg:top-8 z-20 lg:sticky bg-white dark:bg-zinc-950 border dark:border-zinc-900/60 border-zinc-100 rounded-2xl p-4 shadow-sm flex overflow-x-auto lg:flex-col gap-1 lg:gap-1.5 custom-scrollbar lg:overflow-x-visible transition-all duration-300 ${
            (!isCollapsed || isHovered) ? 'lg:w-64' : 'lg:w-20'
          }`}
        >
          <div className="hidden lg:block px-4 py-3 border-b dark:border-zinc-900 border-zinc-100 mb-2">
            <div className={`flex items-center gap-3 transition-all duration-300 ${(!isCollapsed || isHovered) ? 'justify-between' : 'justify-center'}`}>
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hover:bg-zinc-100 dark:hover:bg-zinc-900 p-1.5 rounded-lg transition-colors flex items-center justify-center shrink-0"
                title={isCollapsed ? "Expand System Settings Menu" : "Collapse System Settings Menu"}
              >
                <Settings className="w-5 h-5 text-synos-primary animate-spin-slow" />
              </button>
              {(!isCollapsed || isHovered) && (
                <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 animate-fadeIn truncate flex-1">
                  System Settings
                </h2>
              )}
            </div>
          </div>
          {[
            { id: 'settings', label: 'System Configuration', icon: Settings },
            { id: 'permissions', label: 'Roles Matrix', icon: ShieldAlert },
            { id: 'departments', label: 'Department Hours', icon: Clock },
            { id: 'pricing', label: 'Pricing & Discounts', icon: Tag },
            { id: 'branches', label: 'Branches', icon: Globe },
            { id: 'workspaces', label: 'Workspace Registry', icon: ShieldAlert },
            { id: 'printing', label: 'Printing Setup', icon: Printer },
            { id: 'audit', label: 'Audit Logs', icon: History },
            { id: 'backup', label: 'Backup & Restore', icon: Database },
            { id: 'advanced', label: 'Super Admin Config', icon: ShieldAlert },
            { id: 'support', label: 'Support Desk', icon: LifeBuoy },
            { id: 'about', label: 'About & Updates', icon: Info }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setAuditOffset(0);
                setIsCollapsed(true);
              }}
              className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all whitespace-nowrap lg:whitespace-normal border shrink-0 lg:shrink w-full ${
                (!isCollapsed || isHovered) ? 'justify-start' : 'justify-center'
              } ${
                activeTab === tab.id
                  ? 'bg-synos-primary/10 text-synos-primary border-synos-primary/10'
                  : 'border-transparent text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
              title={tab.label}
            >
              <tab.icon className="w-4 h-4 shrink-0 text-current" />
              {(!isCollapsed || isHovered) && (
                <span className="truncate animate-fadeIn">{tab.label}</span>
              )}
            </button>
          ))}
        </div>

        {/* Right Tab Contents Card Container */}
        <div className="w-full bg-white dark:bg-zinc-950 border dark:border-zinc-900/60 border-zinc-100 rounded-2xl p-8 shadow-sm">
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

            {/* Top Dummy Scrollbar for Horizontal Scroll Indicator */}
            <div 
              ref={topScrollRef}
              onScroll={handleTopScroll}
              className="overflow-x-auto overflow-y-hidden border dark:border-zinc-850 border-zinc-200/10 rounded-t-xl bg-zinc-50 dark:bg-zinc-950 custom-scrollbar shrink-0"
              style={{ minHeight: '6px' }}
            >
              <div style={{ width: tableWidth, height: '1px' }} />
            </div>

            <div 
              ref={tableContainerRef}
              onScroll={handleTableScroll}
              className="max-h-[calc(100vh-220px)] overflow-auto border-x border-b dark:border-zinc-850 border-zinc-200/10 rounded-b-xl custom-scrollbar"
            >
              <table ref={tableRef} className="min-w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-950 border-b dark:border-zinc-800 border-zinc-200">
                  <tr className="bg-zinc-50 dark:bg-zinc-950">
                    <th className="p-4 text-xxs font-bold uppercase tracking-wider text-zinc-400 bg-zinc-50 dark:bg-zinc-950">Capability Module / Action</th>
                    <th className="p-4 text-xxs font-bold uppercase tracking-wider text-zinc-400 bg-zinc-50 dark:bg-zinc-950">Scope Module</th>
                    {roles.map(role => (
                      <th
                        key={role.roleId}
                        className="p-4 text-xxs font-bold uppercase tracking-wider text-center text-synos-primary bg-zinc-50 dark:bg-zinc-950"
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
          <div className="animate-fadeIn space-y-12">
            {/* Departments Registry Section */}
            <div className="border-b dark:border-zinc-850 border-zinc-200 pb-8 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-synos-primary uppercase tracking-widest mb-1">Departments Registry</h3>
                  <p className="text-zinc-500 text-xs font-semibold">Register diagnostic processing departments, assign codes, and set macro categories.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingDepartment({
                      code: '',
                      name: '',
                      macroDepartment: 'Pathology',
                      isActive: true
                    });
                    setShowDepartmentForm(true);
                  }}
                  className="px-4 py-2 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold text-xxs uppercase tracking-wider rounded-xl shadow active:scale-95 transition-all"
                >
                  + Register Department
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {departments.map(d => {
                  const isReserved = d.code === "GENERAL" || d.code === "RAD" || d.name.toLowerCase() === "radiology" || d.name.toLowerCase() === "general laboratory operations";
                  return (
                    <div key={d.departmentId} className="border dark:border-zinc-800 border-zinc-200/10 rounded-xl p-5 bg-zinc-50/30 dark:bg-zinc-950/20 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="bg-zinc-100 dark:bg-zinc-900 border dark:border-zinc-850 border-zinc-200 text-zinc-700 dark:text-zinc-300 text-xxs font-mono font-bold uppercase px-2.5 py-0.5 rounded-full">
                            {d.code}
                          </span>
                          <span className={`text-xxs font-bold px-2 py-0.5 rounded-full ${d.isActive ? 'bg-emerald-500/15 text-emerald-450 border border-emerald-500/20' : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20'}`}>
                            {d.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 mt-2">{d.name}</h4>
                        <div className="text-xs text-zinc-450 dark:text-zinc-500 space-y-1 mt-3">
                          <p>📂 Macro-Dept: <strong>{d.macroDepartment || 'Pathology'}</strong></p>
                          {isReserved && <p className="text-xxs text-amber-500/80 italic font-semibold mt-1">⚠️ Reserved System Department</p>}
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 mt-4 pt-3 border-t dark:border-zinc-900 border-zinc-100">
                        <button
                          disabled={isReserved}
                          onClick={() => {
                            setEditingDepartment(d);
                            setShowDepartmentForm(true);
                          }}
                          className="p-1.5 bg-synos-primary/10 text-synos-primary hover:bg-synos-primary/25 border border-synos-primary/20 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={isReserved}
                          onClick={() => handleDeleteDepartment(d.departmentId)}
                          className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/25 border border-red-500/20 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Department Hours / Operating Policies Section */}
            <div className="space-y-6">
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
            </div>

            {/* Department Dialog */}
            {showDepartmentForm && editingDepartment && (
              <div className="fixed inset-0 bg-zinc-950/45 dark:bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 animate-fadeIn">
                <div 
                  className="border border-zinc-200 dark:border-zinc-900 p-6 rounded-2xl w-full max-w-md shadow-2xl text-xs text-zinc-800 dark:text-zinc-250"
                  style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}
                >
                  <h3 className="text-sm font-semibold mb-4 border-b border-zinc-250 dark:border-zinc-850 pb-2 text-zinc-800 dark:text-zinc-200">
                    {editingDepartment.departmentId ? 'Update Department Settings' : 'Register New Department'}
                  </h3>
                  <form onSubmit={handleSaveDepartment} className="space-y-4">
                    <div>
                      <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1 uppercase tracking-wider">Department Code</label>
                      <input
                        type="text"
                        required
                        disabled={!!editingDepartment.departmentId}
                        placeholder="e.g. HEM, BIO, RAD"
                        value={editingDepartment.code || ''}
                        onChange={e => setEditingDepartment({ ...editingDepartment, code: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm disabled:opacity-55"
                        style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1 uppercase tracking-wider">Department Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Hematology"
                        value={editingDepartment.name || ''}
                        onChange={e => setEditingDepartment({ ...editingDepartment, name: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                        style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xxs font-semibold text-zinc-400 dark:text-zinc-500 mb-1 uppercase tracking-wider">Macro-Department Division</label>
                      <select
                        value={editingDepartment.macroDepartment || 'Pathology'}
                        onChange={e => setEditingDepartment({ ...editingDepartment, macroDepartment: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                        style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff', colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                      >
                        <option value="Pathology">Pathology Division</option>
                        <option value="Radiology">Radiology Division</option>
                        <option value="Operations">Operations / Core</option>
                      </select>
                    </div>
                    {editingDepartment.departmentId && (
                      <div className="flex items-center space-x-3 py-1">
                        <label className="flex items-center space-x-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={editingDepartment.isActive || false}
                            onChange={e => setEditingDepartment({ ...editingDepartment, isActive: e.target.checked })}
                            className="form-checkbox h-4.5 w-4.5 text-synos-primary rounded bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 focus:ring-0 cursor-pointer"
                          />
                          <span className="font-semibold text-zinc-650 dark:text-zinc-350">Department Operational Active Status</span>
                        </label>
                      </div>
                    )}
                    <div className="pt-4 border-t border-zinc-200 dark:border-zinc-850 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDepartmentForm(false);
                          setEditingDepartment(null);
                        }}
                        className="px-4 py-2 border border-zinc-250 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-650 dark:text-zinc-400 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold rounded-xl active:scale-95 transition-all"
                      >
                        Save Department
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

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
                          className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
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
                          className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
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

        {/* WORKSPACE REGISTRY TAB */}
        {activeTab === 'workspaces' && !loading && (
          <div className="animate-fadeIn space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-synos-primary uppercase tracking-widest mb-1">System Workspace Registry</h3>
                <p className="text-zinc-550 text-xs font-semibold">Register and manage operational dashboard routes and screen accesses dynamically.</p>
              </div>
              <button
                onClick={() => {
                  setEditingWorkspace({
                    name: '',
                    routePath: '',
                    isActive: true
                  });
                  setShowWorkspaceForm(true);
                }}
                className="px-4 py-2 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold text-xxs uppercase tracking-wider rounded-xl shadow active:scale-95 transition-all"
              >
                + Register New Screen
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workspaces.map(ws => (
                <div 
                  key={ws.workspaceId} 
                  className="border dark:border-zinc-800 border-zinc-200/10 rounded-xl p-5 bg-zinc-50/30 dark:bg-zinc-950/20 flex flex-col justify-between"
                  style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="bg-synos-primary/10 text-synos-primary border border-synos-primary/20 text-xxs font-mono font-bold px-2 py-0.5 rounded-md">
                          {ws.routePath}
                        </span>
                        <span className={`w-1.5 h-1.5 rounded-full ${ws.isActive ? 'bg-emerald-500' : 'bg-zinc-550'}`} title={ws.isActive ? 'Active' : 'Inactive'} />
                      </div>
                      <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 mt-2">{ws.name}</h4>
                      <p className="text-[10px] text-zinc-400 mt-1">Registered: {formatDate(ws.createdAt)}</p>
                    </div>
                    <div className="flex space-x-2 shrink-0">
                      <button
                        onClick={() => {
                          setEditingWorkspace(ws);
                          setShowWorkspaceForm(true);
                        }}
                        className="p-1.5 bg-synos-primary/10 text-synos-primary hover:bg-synos-primary/25 border border-synos-primary/20 rounded-lg transition-colors"
                        title="Edit Screen"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteWorkspace(ws.workspaceId)}
                        className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/25 border border-red-500/20 rounded-lg transition-colors"
                        title="Delete Screen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {workspaces.length === 0 && (
                <p className="text-zinc-550 text-xs py-4 md:col-span-3">No custom dynamic workspaces registered yet.</p>
              )}
            </div>

            {/* Workspace Registry Dialog Modal */}
            {showWorkspaceForm && editingWorkspace && (
              <div className="fixed inset-0 bg-zinc-950/45 dark:bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 animate-fadeIn">
                <div 
                  className="border border-zinc-200 dark:border-zinc-900 p-6 rounded-2xl w-full max-w-md shadow-2xl text-xs text-zinc-800 dark:text-zinc-250"
                  style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}
                >
                  <h3 className="text-sm font-semibold mb-4 border-b border-zinc-250 dark:border-zinc-850 pb-2 text-zinc-800 dark:text-zinc-200">
                    {editingWorkspace.workspaceId ? 'Modify Workspace Specifications' : 'Register New Screen Module'}
                  </h3>
                  <form onSubmit={handleSaveWorkspace} className="space-y-4">
                    <div>
                      <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Screen / Workspace Name</label>
                      <input
                        type="text"
                        required
                        value={editingWorkspace.name}
                        onChange={e => setEditingWorkspace({ ...editingWorkspace, name: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                        style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}
                        placeholder="e.g. Radiology Diagnostics"
                      />
                    </div>
                    <div>
                      <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Relative Route Path</label>
                      <input
                        type="text"
                        required
                        value={editingWorkspace.routePath}
                        onChange={e => setEditingWorkspace({ ...editingWorkspace, routePath: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                        style={{ backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff' }}
                        placeholder="e.g. /radiology"
                      />
                    </div>
                    {editingWorkspace.workspaceId && (
                      <div className="flex items-center space-x-3.5 select-none bg-zinc-50/50 dark:bg-zinc-950/40 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-850 shadow-sm">
                        <input
                          type="checkbox"
                          id="ws-active"
                          checked={editingWorkspace.isActive}
                          onChange={e => setEditingWorkspace({ ...editingWorkspace, isActive: e.target.checked })}
                          className="rounded border-zinc-300 dark:border-zinc-700 text-synos-primary focus:ring-synos-primary w-4 h-4"
                        />
                        <label htmlFor="ws-active" className="text-xxs font-semibold text-zinc-400 dark:text-zinc-500 cursor-pointer">
                          Active & Authorizable
                        </label>
                      </div>
                    )}
                    <div className="flex justify-end space-x-2.5 pt-4 border-t border-zinc-250 dark:border-zinc-855">
                      <button
                        type="button"
                        onClick={() => {
                          setShowWorkspaceForm(false);
                          setEditingWorkspace(null);
                        }}
                        className="px-4 py-2 border border-zinc-300 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-xxs uppercase tracking-wider font-bold transition-all text-zinc-650 dark:text-zinc-400"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-synos-primary hover:bg-synos-primary/95 text-white text-xxs uppercase tracking-wider rounded-xl font-bold shadow active:scale-95 transition-all"
                      >
                        Save Screen
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

        {/* BACKUP & RESTORE TAB */}
        {activeTab === 'backup' && !loading && (
          <div className="space-y-8 animate-fadeIn text-xs">
            <div>
              <h3 className="text-sm font-bold text-synos-primary border-b dark:border-zinc-800 border-zinc-200 pb-2 mb-6 tracking-widest">
                Database Backup Policy & Manual Actions
              </h3>
              <p className="text-zinc-500 font-semibold mb-6">Manage automated database snapshots and restore recovery operations.</p>
              
              {settings && (
                <form onSubmit={handleSettingsSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 bg-zinc-50 dark:bg-zinc-900/40 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-850">
                  <div className="flex items-center space-x-3 md:col-span-4 mb-2 select-none">
                    <input
                      type="checkbox"
                      id="backupEnabled"
                      checked={settings.backupEnabled ?? false}
                      onChange={e => setSettings({ ...settings, backupEnabled: e.target.checked })}
                      className="rounded border-zinc-300 dark:border-zinc-700 text-synos-primary focus:ring-synos-primary w-4.5 h-4.5 cursor-pointer"
                    />
                    <label htmlFor="backupEnabled" className="text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer">
                      Enable Automated Local Database Backups
                    </label>
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-zinc-400 mb-2 tracking-wide">Backup Frequency</label>
                    <select
                      value={settings.backupFrequency || 'Daily'}
                      onChange={e => setSettings({ ...settings, backupFrequency: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 font-semibold shadow-sm"
                    >
                      <option value="Daily">Daily (GFS retention)</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-zinc-400 mb-2 tracking-wide">Execution Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 02:00"
                      value={settings.backupTime || ''}
                      onChange={e => setSettings({ ...settings, backupTime: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xxs font-bold text-zinc-400 mb-2 tracking-wide">Backup Storage Path</label>
                    <input
                      type="text"
                      value={settings.backupPath || ''}
                      onChange={e => setSettings({ ...settings, backupPath: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                    />
                  </div>
                  <div className="md:col-span-4 flex justify-end">
                    <button
                      type="submit"
                      className="h-10 px-6 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold text-xxs tracking-wider rounded-xl shadow active:scale-95 transition-all w-full md:w-auto flex items-center justify-center"
                    >
                      Save Backup Policy
                    </button>
                  </div>
                </form>
              )}

              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 tracking-widest">
                  Available Encrypted Backups
                </h4>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    id="backup-file-upload"
                    accept=".zip.enc,.zip,.bak,.mdf,.ldf"
                    onChange={handleUploadBackup}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('backup-file-upload').click()}
                    disabled={uploadingBackup}
                    className="h-10 px-6 bg-zinc-600 hover:bg-zinc-700 text-white font-bold text-xxs tracking-wider rounded-xl shadow active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    {uploadingBackup ? '⏳ Uploading...' : '📤 Upload Backup File'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRunBackup}
                    disabled={runningBackup}
                    className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xxs tracking-wider rounded-xl shadow active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    {runningBackup ? '⏳ Running...' : '💾 Execute Manual Backup Now'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-900 rounded-2xl">
                <table className="min-w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-900">
                      <th className="p-4 font-bold text-zinc-400 tracking-wider">Backup ID</th>
                      <th className="p-4 font-bold text-zinc-400 tracking-wider">File Name</th>
                      <th className="p-4 font-bold text-zinc-400 tracking-wider">Size</th>
                      <th className="p-4 font-bold text-zinc-400 tracking-wider">Created Date</th>
                      <th className="p-4 font-bold text-zinc-400 tracking-wider">Integrity</th>
                      <th className="p-4 font-bold text-zinc-400 tracking-wider text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-900">
                    {backups.map(b => (
                      <tr key={b.backupId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/20 transition-colors">
                        <td className="p-4 font-mono font-bold text-zinc-500">{b.backupId}</td>
                        <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200">{b.fileName}</td>
                        <td className="p-4 font-mono text-zinc-700 dark:text-zinc-300">{formatFileSize(b.size)}</td>
                        <td className="p-4 text-zinc-400 dark:text-zinc-500 font-mono">
                          {formatDateTime(b.createdAt)}
                        </td>
                        <td className="p-4 text-emerald-500 font-bold">✓ Verified</td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleRestoreBackup(b.backupId, b.fileName)}
                            disabled={restoringBackupId === b.backupId}
                            className="h-8 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xxs tracking-wider rounded-lg transition-all flex items-center justify-center inline-block mx-auto"
                          >
                            {restoringBackupId === b.backupId ? 'Restoring...' : '🔄 Restore'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {backups.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-zinc-400 dark:text-zinc-500 text-xs font-semibold">
                          No database backup records found on disk.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* System Reset & Maintenance */}
              <div className="bg-red-50 dark:bg-red-955/10 p-6 rounded-2xl border border-red-200 dark:border-red-900/30 mt-8 space-y-4">
                <h3 className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-widest flex items-center gap-2">
                  ⚠️ System Maintenance
                </h3>
                <p className="text-xxs text-red-650/80 dark:text-red-400/85 font-semibold leading-relaxed">
                  Purge all transactional data, reports, billing, and patient records from the system while preserving static configurations. This action is irreversible.
                </p>
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => setShowResetDialog(true)}
                    className="h-10 px-6 bg-red-600 hover:bg-red-700 text-white font-bold text-xxs tracking-wider rounded-xl shadow active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    Reset Operational Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUPPORT DESK TAB */}
        {activeTab === 'support' && !loading && (
          <div className="space-y-8 animate-fadeIn text-xs">
            <div>
              <h3 className="text-sm font-bold text-synos-primary border-b dark:border-zinc-800 border-zinc-200 pb-2 mb-6 tracking-widest">
                Support Triage & Crash Desk
              </h3>
              <p className="text-zinc-500 font-semibold mb-6">Create diagnostics tickets and verify support sync telemetry.</p>

              <form onSubmit={handleSubmitTicket} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 bg-zinc-50 dark:bg-zinc-900/40 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-850">
                <div className="md:col-span-2">
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 tracking-wide">Ticket Title / Summary</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Thermal printer print spools frozen"
                    value={ticketTitle}
                    onChange={e => setTicketTitle(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 tracking-wide">Priority</label>
                  <select
                    value={ticketPriority}
                    onChange={e => setTicketPriority(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 font-semibold shadow-sm"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 tracking-wide">Category</label>
                  <select
                    value={ticketCategory}
                    onChange={e => setTicketCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 font-semibold shadow-sm"
                  >
                    <option value="Database">Database</option>
                    <option value="Printers">Printers / Labels</option>
                    <option value="Backup">Backup & Recovery</option>
                    <option value="OTA">OTA Updates</option>
                    <option value="General">General Exception</option>
                  </select>
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 tracking-wide">Description of Issue</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide full description of exceptions, warning patterns, and hardware configurations..."
                    value={ticketDesc}
                    onChange={e => setTicketDesc(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div className="md:col-span-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2">
                  <span className="text-xxs font-semibold text-zinc-400 dark:text-zinc-500 tracking-wide">
                    📎 Telemetry: Submitting compiles diagnostic manifests.
                  </span>
                  <button
                    type="submit"
                    disabled={submittingTicket}
                    className="h-10 px-6 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold text-xxs tracking-wider rounded-xl shadow active:scale-95 transition-all w-full md:w-auto flex items-center justify-center"
                  >
                    {submittingTicket ? 'Submitting...' : '📩 Submit Support Ticket'}
                  </button>
                </div>
              </form>

              <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 tracking-widest mb-6">
                Active Incident Outbox Log
              </h4>

              <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-900 rounded-2xl">
                <table className="min-w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-900">
                      <th className="p-4 font-bold text-zinc-400 tracking-wider">Ticket ID</th>
                      <th className="p-4 font-bold text-zinc-400 tracking-wider">Title</th>
                      <th className="p-4 font-bold text-zinc-400 tracking-wider">Category</th>
                      <th className="p-4 font-bold text-zinc-400 tracking-wider">Priority</th>
                      <th className="p-4 font-bold text-zinc-400 tracking-wider">Status</th>
                      <th className="p-4 font-bold text-zinc-400 tracking-wider">Latest Update Comment</th>
                      <th className="p-4 font-bold text-zinc-400 tracking-wider">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-900">
                    {tickets.map(t => (
                      <tr key={t.ticketId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/20 transition-colors">
                        <td className="p-4 font-mono font-bold text-zinc-500">{t.ticketId}</td>
                        <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200">{t.title}</td>
                        <td className="p-4 text-zinc-650 dark:text-zinc-400 font-semibold">{t.category}</td>
                        <td className="p-4">
                          <span className={'px-2 py-0.5 rounded text-xxs font-bold ' + (
                            t.priority === 'Critical' ? 'bg-red-500/10 text-red-500 border border-red-500/10' :
                            t.priority === 'High' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/10' :
                            'bg-blue-500/10 text-blue-500 border border-blue-500/10'
                          )}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={'px-2 py-0.5 rounded text-xxs font-bold ' + (
                            t.status === 'Submitted' ? 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/10' :
                            t.status === 'Under Review' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/10' :
                            t.status === 'In Progress' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/10' :
                            t.status === 'Waiting for Customer' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/10' :
                            t.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10' :
                            t.status === 'Closed' ? 'bg-slate-500/10 text-slate-500 border border-slate-500/10' :
                            'bg-zinc-500/10 text-zinc-500 border border-zinc-500/10'
                          )}>
                            {t.status}
                          </span>
                        </td>
                        <td className="p-4 text-zinc-500 dark:text-zinc-400 font-medium">
                          {t.statusMessage || <span className="text-zinc-400 dark:text-zinc-600 italic">No update comments yet.</span>}
                        </td>
                        <td className="p-4 text-zinc-400 dark:text-zinc-500 font-mono">
                          {formatDateTime(t.updatedAt || t.createdAt)}
                        </td>
                      </tr>
                    ))}
                    {tickets.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-zinc-400 dark:text-zinc-500 text-xs font-semibold">
                          No support tickets found in outbox telemetry.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ADVANCED SUPER ADMIN CONFIG TAB */}
        {activeTab === 'advanced' && advancedSettings && !loading && (
          <>
            <form onSubmit={handleAdvancedSettingsSubmit} className="space-y-8 animate-fadeIn text-xs">
            {/* Section 1: Host & Database Connection */}
            <div>
              <h3 className="text-sm font-bold border-b dark:border-zinc-800 border-zinc-200 pb-2 mb-6 text-synos-primary uppercase tracking-widest">
                1. Host & Database Connection
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Database Connection String</label>
                  <input
                    type="text"
                    required
                    value={advancedSettings.connectionString || ''}
                    onChange={e => setAdvancedSettings({ ...advancedSettings, connectionString: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Allowed Hosts</label>
                  <input
                    type="text"
                    required
                    value={advancedSettings.allowedHosts || ''}
                    onChange={e => setAdvancedSettings({ ...advancedSettings, allowedHosts: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Inventory Valuation Method</label>
                  <select
                    value={advancedSettings.inventoryValuationMethod || 'FIFO'}
                    onChange={e => setAdvancedSettings({ ...advancedSettings, inventoryValuationMethod: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  >
                    <option value="FIFO">FIFO (First-In, First-Out)</option>
                    <option value="LIFO">LIFO (Last-In, First-Out)</option>
                    <option value="Average">Weighted Average Cost</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Security & JWT Cryptography */}
            <div>
              <h3 className="text-sm font-bold border-b dark:border-zinc-800 border-zinc-200 pb-2 mb-6 text-synos-primary uppercase tracking-widest">
                2. Security & JWT Cryptography
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">JWT Signing Secret</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-10 px-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono text-zinc-500 dark:text-zinc-400 flex items-center select-none shadow-sm">
                      ••••••••••••••••
                    </div>
                    <button
                      type="button"
                      onClick={() => rotateSecret('jwt')}
                      className="h-10 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-750 transition-all whitespace-nowrap active:scale-98 flex items-center justify-center"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">JWT Issuer</label>
                  <input
                    type="text"
                    value={advancedSettings.jwtIssuer || ''}
                    onChange={e => setAdvancedSettings({ ...advancedSettings, jwtIssuer: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">JWT Audience</label>
                  <input
                    type="text"
                    value={advancedSettings.jwtAudience || ''}
                    onChange={e => setAdvancedSettings({ ...advancedSettings, jwtAudience: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Backup AES Encryption Key</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-10 px-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono text-zinc-500 dark:text-zinc-400 flex items-center select-none shadow-sm">
                      ••••••••••••••••
                    </div>
                    <button
                      type="button"
                      onClick={() => rotateSecret('backup')}
                      className="h-10 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-750 transition-all whitespace-nowrap active:scale-98 flex items-center justify-center"
                    >
                      Rotate
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Diagnostics AES Encryption Key</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-10 px-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono text-zinc-500 dark:text-zinc-400 flex items-center select-none shadow-sm">
                      ••••••••••••••••
                    </div>
                    <button
                      type="button"
                      onClick={() => rotateSecret('diagnostics')}
                      className="h-10 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-750 transition-all whitespace-nowrap active:scale-98 flex items-center justify-center"
                    >
                      Rotate
                    </button>
                  </div>
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={advancedSettings.referralEconomicsEnabled || false}
                      onChange={e => setAdvancedSettings({ ...advancedSettings, referralEconomicsEnabled: e.target.checked })}
                      className="h-4 w-4 rounded border-zinc-300 text-synos-primary focus:ring-synos-primary"
                    />
                    <span className="text-xxs font-bold text-zinc-400 uppercase tracking-wide">Enable Referral Economics</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Section 3: Middleware Configuration */}
            <div>
              <h3 className="text-sm font-bold border-b dark:border-zinc-800 border-zinc-200 pb-2 mb-6 text-synos-primary uppercase tracking-widest">
                3. Middleware & Control Tower Integration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Middleware API Endpoint Url</label>
                  <input
                    type="text"
                    value={advancedSettings.middlewareApiUrl || ''}
                    onChange={e => setAdvancedSettings({ ...advancedSettings, middlewareApiUrl: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Middleware API Key / Secret</label>
                  <div className="flex items-center gap-2">
                    <div className={`flex-1 h-10 px-3 border rounded-xl text-xs font-mono flex items-center select-none shadow-sm ${
                      advancedSettings.middlewareApiKey 
                        ? 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400' 
                        : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-500'
                    }`}>
                      {advancedSettings.middlewareApiKey ? '••••••••••••••••' : 'Missing'}
                    </div>
                    <button
                      type="button"
                      onClick={() => rotateSecret('middleware')}
                      className="h-10 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-750 transition-all whitespace-nowrap active:scale-98 flex items-center justify-center"
                    >
                      {advancedSettings.middlewareApiKey ? 'Regenerate' : 'Generate'}
                    </button>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Middleware CORS Allowed Origins</label>
                  <input
                    type="text"
                    value={advancedSettings.allowedOrigins || ''}
                    onChange={e => setAdvancedSettings({ ...advancedSettings, allowedOrigins: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t dark:border-zinc-900 border-zinc-200/50">
                  <div>
                    <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Rate Limit Permit Limit</label>
                    <input
                      type="number"
                      value={advancedSettings.rateLimitPermitLimit || 0}
                      onChange={e => setAdvancedSettings({ ...advancedSettings, rateLimitPermitLimit: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Rate Limit Window (Seconds)</label>
                    <input
                      type="number"
                      value={advancedSettings.rateLimitWindowSeconds || 0}
                      onChange={e => setAdvancedSettings({ ...advancedSettings, rateLimitWindowSeconds: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Rate Limit Queue Limit</label>
                    <input
                      type="number"
                      value={advancedSettings.rateLimitQueueLimit || 0}
                      onChange={e => setAdvancedSettings({ ...advancedSettings, rateLimitQueueLimit: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: PACS DICOM & Files Storage */}
            <div>
              <h3 className="text-sm font-bold border-b dark:border-zinc-800 border-zinc-200 pb-2 mb-6 text-synos-primary uppercase tracking-widest">
                4. PACS DICOM & File Storage Paths
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">PACS Storage Root Path</label>
                  <input
                    type="text"
                    value={advancedSettings.pacsRootPath || ''}
                    onChange={e => setAdvancedSettings({ ...advancedSettings, pacsRootPath: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">File Storage Base Path</label>
                  <input
                    type="text"
                    value={advancedSettings.fileStorageBasePath || ''}
                    onChange={e => setAdvancedSettings({ ...advancedSettings, fileStorageBasePath: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">PACS Max Instances Per Series</label>
                  <input
                    type="number"
                    value={advancedSettings.pacsMaxInstancesPerSeriesInSeriesTree || 0}
                    onChange={e => setAdvancedSettings({ ...advancedSettings, pacsMaxInstancesPerSeriesInSeriesTree: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">PACS Max Total Instances Per Study</label>
                  <input
                    type="number"
                    value={advancedSettings.pacsMaxTotalInstancesPerStudyInSeriesTree || 0}
                    onChange={e => setAdvancedSettings({ ...advancedSettings, pacsMaxTotalInstancesPerStudyInSeriesTree: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">File Storage Public Base URL</label>
                  <input
                    type="text"
                    value={advancedSettings.fileStoragePublicBaseUrl || ''}
                    onChange={e => setAdvancedSettings({ ...advancedSettings, fileStoragePublicBaseUrl: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Secure Link Base URL</label>
                  <input
                    type="text"
                    value={advancedSettings.secureLinkBaseUrl || ''}
                    onChange={e => setAdvancedSettings({ ...advancedSettings, secureLinkBaseUrl: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Secure Link Public Base URL</label>
                  <input
                    type="text"
                    value={advancedSettings.secureLinkPublicBaseUrl || ''}
                    onChange={e => setAdvancedSettings({ ...advancedSettings, secureLinkPublicBaseUrl: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Trusted Keys */}
            <div>
              <h3 className="text-sm font-bold border-b dark:border-zinc-800 border-zinc-200 pb-2 mb-6 text-synos-primary uppercase tracking-widest">
                5. Trusted OTA Public Signing Keys
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xxs font-bold text-zinc-400 mb-2 uppercase tracking-wide">KeyId 'key-2026-v1' Public Key PEM</label>
                  <textarea
                    rows={6}
                    value={advancedSettings.trustedKey2026v1 || ''}
                    onChange={e => setAdvancedSettings({ ...advancedSettings, trustedKey2026v1: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                    placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t dark:border-zinc-900 border-zinc-200/50">
              <button
                type="submit"
                disabled={savingAdvanced}
                className="h-10 px-6 bg-synos-primary hover:bg-synos-primary-dark text-white font-bold text-xxs tracking-wider rounded-xl shadow active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                {savingAdvanced ? 'Saving advanced configurations...' : 'Save Advanced Configurations'}
              </button>
            </div>
          </form>

          {/* System Reset & Maintenance */}
          <div className="bg-red-50 dark:bg-red-950/10 p-6 rounded-2xl border border-red-200 dark:border-red-900/30 mt-8 space-y-4">
            <h3 className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-widest flex items-center gap-2">
              ⚠️ System Maintenance
            </h3>
            <p className="text-xxs text-red-600/80 dark:text-red-400/80 font-semibold leading-relaxed">
              Purge all transactional data, reports, billing, and patient records from the system while preserving static configurations. This action is irreversible.
            </p>
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setShowResetDialog(true)}
                className="h-10 px-6 bg-red-600 hover:bg-red-700 text-white font-bold text-xxs tracking-wider rounded-xl shadow active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                Reset Operational Data
              </button>
            </div>
          </div>
          </>
        )}

        {/* ABOUT & UPDATES TAB */}
        {activeTab === 'about' && !loading && (
          <div className="space-y-8 animate-fadeIn text-xs">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-zinc-50 dark:bg-zinc-900/40 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-850 flex flex-col justify-between">
                <div>
                  <h4 className="text-xxs font-bold text-zinc-400 dark:text-zinc-500 tracking-widest mb-3">
                    On-Prem Client Identity
                  </h4>
                  <div className="text-2xl font-bold text-synos-primary">{settings?.labId || 'LAB001'}</div>
                  <div className="text-xxs text-zinc-400 mt-1 font-semibold">{settings?.name || 'TBZ Labs Khammam Branch'}</div>
                </div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/40 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-850 flex flex-col justify-between">
                <div>
                  <h4 className="text-xxs font-bold text-zinc-400 dark:text-zinc-500 tracking-widest mb-3">
                    Active Suite Version
                  </h4>
                  <div className="text-2xl font-bold text-synos-primary">v1.2.0</div>
                  <div className="text-xxs text-emerald-500 font-bold mt-1">✓ Running stable release ring</div>
                </div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/40 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-850 flex flex-col justify-between">
                <div>
                  <h4 className="text-xxs font-bold text-zinc-400 dark:text-zinc-500 tracking-widest mb-3">
                    System Environment
                  </h4>
                  <div className="text-xxs text-zinc-650 dark:text-zinc-400 font-semibold font-mono space-y-1 mt-1">
                    <div>OS: {systemInfo?.os || 'Windows 11 Home 23H2'}</div>
                    <div>Runtime: .NET {systemInfo?.dotNet || '8.0.3'}</div>
                  </div>
                </div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/40 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-850 flex flex-col justify-between">
                <div>
                  <h4 className="text-xxs font-bold text-zinc-400 dark:text-zinc-500 tracking-widest mb-3">
                    License Subscription
                  </h4>
                  <div className={`text-2xl font-bold ${
                    settings?.licenseStatus === 'Suspended' ? 'text-red-500' : 'text-emerald-500'
                  }`}>
                    {settings?.licenseType || 'Trial'}
                  </div>
                  <div className="text-xxs text-zinc-450 dark:text-zinc-400 font-semibold mt-1">
                    {settings?.licenseStatus === 'Suspended' ? '🔴 Suspended' : '🟢 Active'} 
                    {settings?.licenseExpiryDate && ` • Exp: ${formatDateInput(settings.licenseExpiryDate)}`}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900/40 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-850">
              <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 tracking-widest mb-4">
                License Key Manager
              </h4>
              <p className="text-xxs text-zinc-400 mb-4 font-semibold">
                Verify, update, or roll your local license key to refresh branch capacity and cloud synchronization.
              </p>
              {licenseMsg && (
                <div className={`p-3 rounded-xl mb-4 text-xxs font-semibold ${
                  licenseMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'
                }`}>
                  {licenseMsg.text}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Enter License Key (e.g. TBZ-XXXX-XXXX-XXXX-XXXX)"
                  value={newLicenseKey}
                  onChange={e => setNewLicenseKey(e.target.value)}
                  className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-synos-primary transition-colors text-zinc-800 dark:text-zinc-200 shadow-sm font-mono"
                />
                <button
                  type="button"
                  onClick={handleUpdateLicenseKey}
                  disabled={licenseUpdating}
                  className="h-10 px-6 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold text-xxs tracking-wider rounded-xl shadow active:scale-95 transition-all flex items-center justify-center"
                >
                  {licenseUpdating ? 'Updating...' : 'Apply Key'}
                </button>
              </div>

              {settings && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-850 text-xxs font-semibold">
                  <div>
                    <span className="text-zinc-400 dark:text-zinc-500">Branch License Limit:</span>{' '}
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{settings.maximumBranches ?? 1} branch(es)</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 dark:text-zinc-500">Enabled Features:</span>{' '}
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {settings.enabledFeatures && settings.enabledFeatures.length > 0 
                        ? settings.enabledFeatures.join(', ') 
                        : 'Core Diagnostic Platform'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900/40 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-850">
              <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 tracking-widest mb-4">
                Software Update Manager
              </h4>
              
              <div className="flex justify-between items-center bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-850 mb-6">
                <div>
                  <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {availableUpdate ? `Status: Update Available (v${availableUpdate.version})` : 'Status: System up to date'}
                  </div>
                  <div className="text-xxs text-zinc-400 mt-1">
                    Last checked: {systemInfo?.lastChecked ? formatDateTime(systemInfo.lastChecked) : 'Recently'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCheckUpdate}
                  disabled={checkingUpdate}
                  className="h-10 px-6 border border-zinc-200 dark:border-zinc-850 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-150 dark:hover:bg-zinc-900 font-bold text-xxs tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center"
                >
                  {checkingUpdate ? 'Checking...' : 'Check for Updates'}
                </button>
              </div>

              {availableUpdate && !readinessReport && (
                <div className="bg-white dark:bg-zinc-950 border border-synos-primary/30 p-5 rounded-2xl mb-6 space-y-4 shadow-sm animate-fadeIn">
                  <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-900 pb-3">
                    <div>
                      <h5 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">New Software Available</h5>
                      <p className="text-xxs text-zinc-400 mt-0.5">Version: <span className="font-mono text-synos-primary font-bold">v{availableUpdate.version}</span></p>
                    </div>
                    <span className="text-[10px] bg-synos-primary/10 text-synos-primary font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Staged
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xxs font-mono">
                    <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-850/50">
                      <div className="text-zinc-400 mb-1">Estimated Download</div>
                      <div className="font-bold text-zinc-800 dark:text-zinc-200">50.0 MB</div>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-850/50">
                      <div className="text-zinc-400 mb-1">Database Schema</div>
                      <div className="font-bold text-zinc-800 dark:text-zinc-200">v{availableUpdate.schemaVersion}</div>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-850/50">
                      <div className="text-zinc-400 mb-1">Required Space</div>
                      <div className="font-bold text-zinc-800 dark:text-zinc-200">
                        {availableUpdate.requiredFreeSpaceBytes ? `${(availableUpdate.requiredFreeSpaceBytes / (1024 * 1024)).toFixed(1)} MB` : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xxs font-bold text-zinc-400 uppercase tracking-wider">Release Notes</div>
                    <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-850/50 text-xs text-zinc-700 dark:text-zinc-300 font-sans leading-relaxed whitespace-pre-line">
                      {availableUpdate.releaseNotes || 'No notes provided for this version.'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCheckReadiness(availableUpdate)}
                    disabled={applyingUpdate || checkingReadiness}
                    className="w-full h-11 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold text-xs tracking-wider rounded-xl shadow active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    {checkingReadiness ? 'Checking Readiness...' : (applyingUpdate ? 'Applying Update...' : '⚙️ Install Software Update Now')}
                  </button>
                </div>
              )}

              {readinessReport && (
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl mb-6 space-y-6 shadow-sm animate-fadeIn text-xs">
                  <div className="flex justify-between items-center border-b border-zinc-150 dark:border-zinc-900 pb-4">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-850 dark:text-zinc-150">Pre-Update Readiness Advisor</h4>
                      <p className="text-xxs text-zinc-400 mt-1">Target Version: <span className="font-mono text-synos-primary font-bold">v{readinessReport.manifest?.version}</span></p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReadinessReport(null)}
                      className="text-zinc-400 hover:text-zinc-655 dark:hover:text-zinc-200 text-xs font-bold font-mono"
                    >
                      ✕ Close
                    </button>
                  </div>

                  <div className="space-y-3">
                    {readinessReport.report.checks.map((check) => {
                      const getSeverityStyle = (severity) => {
                        if (severity === 0 || severity === 'Success') return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
                        if (severity === 1 || severity === 'Warning') return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
                        return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
                      };

                      const getIcon = (severity) => {
                        if (severity === 0 || severity === 'Success') return '✓';
                        if (severity === 1 || severity === 'Warning') return '⚠';
                        return '✗';
                      };

                      return (
                        <div key={check.code} className="flex items-start gap-3 bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-850/50">
                          <span className={`flex items-center justify-center h-5 w-5 rounded-full border text-[10px] font-bold shrink-0 ${getSeverityStyle(check.severity)}`}>
                            {getIcon(check.severity)}
                          </span>
                          <div>
                            <div className="font-bold text-zinc-850 dark:text-zinc-200 text-xs">{check.title}</div>
                            <div className="text-xxs text-zinc-450 dark:text-zinc-400 mt-0.5">{check.message}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 border border-zinc-200 dark:border-zinc-850 rounded-xl space-y-2">
                    <div className="text-xxs font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider">Estimated Installation & Downtime</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xxs font-mono mt-1 text-zinc-600 dark:text-zinc-400">
                      <div>
                        <div className="text-zinc-400 mb-0.5">Download</div>
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">12 sec</div>
                      </div>
                      <div>
                        <div className="text-zinc-400 mb-0.5">Backup</div>
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">8 sec</div>
                      </div>
                      <div>
                        <div className="text-zinc-400 mb-0.5">DB Migration</div>
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">4 sec</div>
                      </div>
                      <div>
                        <div className="text-zinc-400 mb-0.5">Restart</div>
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">15 sec</div>
                      </div>
                    </div>
                    <div className="border-t border-zinc-200 dark:border-zinc-800/80 pt-2 mt-2 flex justify-between text-xs items-center">
                      <span className="text-zinc-450 dark:text-zinc-400">Estimated offline time:</span>
                      <span className="font-bold text-synos-primary">≈ 40 seconds</span>
                    </div>
                  </div>

                  {readinessReport.report.checks.some(c => c.severity === 1 || c.severity === 'Warning') && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span>⚠️</span>
                        <span>Operational Conditions Detected</span>
                      </div>
                      <p className="text-xxs leading-relaxed font-semibold">
                        The following operational conditions were detected. Installing now may interrupt laboratory operations. Continue only if you are within a planned maintenance window.
                      </p>
                    </div>
                  )}

                  {!readinessReport.report.canInstall && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span>✗</span>
                        <span>Critical Blocker(s) Present</span>
                      </div>
                      <p className="text-xxs leading-relaxed font-semibold">
                        Pre-update validation checks failed with critical errors. Please resolve all error items before proceeding with the upgrade.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setReadinessReport(null)}
                      className="flex-1 h-11 border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-150 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold text-xs tracking-wider rounded-xl transition-colors flex items-center justify-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyUpdate(readinessReport.manifest, readinessReport.report.backupId)}
                      disabled={applyingUpdate || !readinessReport.report.canInstall}
                      className="flex-1 h-11 bg-synos-primary hover:bg-synos-primary/95 text-white font-bold text-xs tracking-wider rounded-xl shadow active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {applyingUpdate ? 'Applying Update...' : 'Install Update'}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4 border-t border-zinc-200 dark:border-zinc-850/80 pt-6">
                <label className="block text-xxs font-bold text-zinc-400 mb-1 tracking-wide uppercase">
                  Developer Mode: Trigger Manual Update Manifest
                </label>
                <textarea
                  rows={3}
                  value={updateManifest}
                  onChange={e => setUpdateManifest(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-mono outline-none focus:border-synos-primary transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleCheckReadiness(JSON.parse(updateManifest))}
                    disabled={applyingUpdate || checkingReadiness}
                    className="h-10 px-6 bg-zinc-650 hover:bg-zinc-700 text-white font-bold text-xxs tracking-wider rounded-xl shadow active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    {checkingReadiness ? 'Checking Readiness...' : (applyingUpdate ? 'Applying Update...' : 'Trigger Manual Apply')}
                  </button>
                </div>
              </div>
              {/* One-time Copy Key Dialog */}
              {showKeyDialog && oneTimeKey && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl text-zinc-850 dark:text-zinc-200">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      ⚠️ One-Time Generated Key
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      This is the new Middleware API Key. For absolute security, this key is never displayed again. Please copy it immediately:
                    </p>
                    <div className="bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-3 rounded-xl font-mono text-xs text-synos-primary break-all select-all flex justify-between items-center">
                      <span>{oneTimeKey}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(oneTimeKey);
                          alert('Copied to clipboard!');
                        }}
                        className="ml-2 px-2.5 py-1 bg-synos-primary hover:bg-synos-primary/95 text-[10px] font-bold rounded-lg text-white shadow-sm transition-all"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setShowKeyDialog(false);
                          setOneTimeKey(null);
                        }}
                        className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold rounded-xl transition-all text-zinc-700 dark:text-zinc-300"
                      >
                        Done & Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Reset Operational Data Confirmation Dialog */}
              {showResetDialog && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl text-zinc-850 dark:text-zinc-200">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-red-600 dark:text-red-400 uppercase tracking-wider">
                      ⚠️ Reset Operational Data
                    </h3>
                    
                    <div className="space-y-2 text-xs text-zinc-650 dark:text-zinc-400">
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200">This operation will:</p>
                      <ul className="list-disc list-inside space-y-1.5 pl-2 font-medium">
                        <li>Automatically create a complete database backup before making any changes.</li>
                        <li>Remove all operational data (patients, visits, reports, billing, results, operational logs, etc.).</li>
                        <li>Preserve all master data (tests, pricing, departments, users, roles, settings, templates, reference ranges, branches, license, etc.).</li>
                      </ul>
                      
                      <div className="mt-3 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">Backup Location</span>
                        <code className="text-xxs font-mono font-bold text-synos-primary">C:\ProgramData\TBZ Labs\SynOS\Backups\</code>
                      </div>
                    </div>

                    <form onSubmit={handleResetOperationalData} className="space-y-4 pt-2">
                      {resetError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xxs font-semibold text-red-600 dark:text-red-450">
                          {resetError}
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="block text-xxs font-bold text-zinc-400 uppercase tracking-wider">
                          Confirm Administrator Password
                        </label>
                        <input
                          type="password"
                          required
                          placeholder="Enter your password"
                          value={resetPassword}
                          onChange={e => setResetPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-red-500 transition-colors text-zinc-800 dark:text-zinc-200 shadow-sm"
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowResetDialog(false);
                            setResetPassword('');
                            setResetError('');
                          }}
                          disabled={resetting}
                          className="flex-1 h-10 border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-150 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold text-xxs tracking-wider rounded-xl transition-colors flex items-center justify-center"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={resetting}
                          className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white font-bold text-xxs tracking-wider rounded-xl shadow active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {resetting ? 'Backing up & Resetting...' : 'Backup & Reset'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);
}
