import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

interface AdvancedSettingsData {
  connectionString?: string;
  labId?: string;
  jwtSecret?: string;
  jwtIssuer?: string;
  jwtAudience?: string;
  middlewareApiUrl?: string;
  middlewareApiKey?: string;
  backupEncryptionKey?: string;
  diagnosticsEncryptionKey?: string;
  pacsRootPath?: string;
  pacsMaxInstancesPerSeriesInSeriesTree?: number;
  pacsMaxTotalInstancesPerStudyInSeriesTree?: number;
  fileStorageBasePath?: string;
  fileStoragePublicBaseUrl?: string;
  secureLinkBaseUrl?: string;
  secureLinkPublicBaseUrl?: string;
  referralEconomicsEnabled?: boolean;
  inventoryValuationMethod?: string;
  allowedHosts?: string;
  trustedKey2026v1?: string;
  allowedOrigins?: string;
  rateLimitPermitLimit?: number;
  rateLimitWindowSeconds?: number;
  rateLimitQueueLimit?: number;

  // New properties
  workingDirectory?: string;
  jwtExpiryMinutes?: number;
  jwtRefreshTokenExpiryDays?: number;
  otaChannel?: string;
  otaPolicy?: string;
  otaMaintenanceDay?: string;
  otaMaintenanceStartHour?: string;
  otaMaintenanceEndHour?: string;
  
  licenseType?: string;
  maximumBranches?: number;
  licenseExpiryDate?: string;
  licenseStatus?: string;
  enabledFeatures?: string[];

  // Secrets Status Metadata
  jwtSecretStatus?: string;
  backupKeyStatus?: string;
  diagnosticsKeyStatus?: string;

  // WhatsApp settings
  whatsAppGraphApiVersion?: string;
  whatsAppAppSecret?: string;
  whatsAppVerifyToken?: string;
  whatsAppPhoneNumberId?: string;
  whatsAppBusinessAccountId?: string;
  whatsAppActiveTemplateName?: string;
  whatsAppPublicTunnelUrl?: string;
  whatsAppAccessToken?: string;
}

interface SystemHealthData {
  database: string;
  middleware: string;
  storage: string;
  storageFreeSpaceBytes: number;
  lastBackup: string;
  cloudSync: string;
  currentVersion: string;
  license: string;
  updateStatus: string;
}

const AdvancedSettingsTab: React.FC = () => {
  const [data, setData] = useState<AdvancedSettingsData | null>(null);
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Connection password inputs (only for testing, not stored here)
  const [dbServer, setDbServer] = useState('localhost');
  const [dbName, setDbName] = useState('SynOSDb');
  const [dbUser, setDbUser] = useState('sa');
  const [dbPassword, setDbPassword] = useState('');
  const [dbTestResult, setDbTestResult] = useState<string | null>(null);
  const [oneTimeKey, setOneTimeKey] = useState<string | null>(null);
  const [showKeyDialog, setShowKeyDialog] = useState(false);

  // Database Connection Locking States
  const [dbLocked, setDbLocked] = useState(true);
  const [dbTestSuccess, setDbTestSuccess] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [settingsRes, healthRes] = await Promise.all([
        apiClient.get('/admin/settings/advanced'),
        apiClient.get('/admin/settings/health')
      ]);
      setData(settingsRes.data);
      setHealth(healthRes.data);

      // Parse connection string for testing inputs if available
      if (settingsRes.data.connectionString) {
        const conn = settingsRes.data.connectionString;
        const serverMatch = conn.match(/Data Source=([^;]+)/) || conn.match(/Server=([^;]+)/);
        const dbMatch = conn.match(/Initial Catalog=([^;]+)/) || conn.match(/Database=([^;]+)/);
        const userMatch = conn.match(/User ID=([^;]+)/) || conn.match(/User=([^;]+)/);
        if (serverMatch) setDbServer(serverMatch[1]);
        if (dbMatch) setDbName(dbMatch[1]);
        if (userMatch) setDbUser(userMatch[1]);
        setDbTestSuccess(true);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load configurations.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const response = await apiClient.put('/admin/settings/advanced', data);
      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message });
        loadAll();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update settings.' });
    } finally {
      setActionLoading(false);
    }
  };

  const testDb = async () => {
    setDbTestResult(null);
    setDbTestSuccess(false);
    try {
      const response = await apiClient.post('/admin/settings/test-db', {
        server: dbServer,
        database: dbName,
        user: dbUser,
        password: dbPassword
      });
      if (response.data.success) {
        setDbTestResult('Connection Successful!');
        setDbTestSuccess(true);
      } else {
        setDbTestResult(`Error: ${response.data.message}`);
      }
    } catch (err: any) {
      setDbTestResult(`Request failed: ${err.message}`);
    }
  };

  const saveDbConfig = async () => {
    if (!data || !dbTestSuccess) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const compiledConnString = `Server=${dbServer};Database=${dbName};User ID=${dbUser};Password=${dbPassword};TrustServerCertificate=True;Encrypt=True;MultipleActiveResultSets=True;`;
      const response = await apiClient.put('/admin/settings/advanced', {
        ...data,
        connectionString: compiledConnString
      });
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Database configuration updated successfully!' });
        setDbLocked(true);
        loadAll();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save database settings.' });
    } finally {
      setActionLoading(false);
    }
  };

  const testPath = async (path: string) => {
    setMessage(null);
    try {
      const response = await apiClient.post('/admin/settings/test-path', { path });
      if (response.data.success) {
        setMessage({ type: 'success', text: `Path permissions validated successfully for: ${path}` });
      } else {
        setMessage({ type: 'error', text: `Path validation failed: ${response.data.message}` });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `Verification failed: ${err.message}` });
    }
  };

  const testMiddleware = async () => {
    setMessage(null);
    try {
      const response = await apiClient.post('/admin/settings/test-middleware', {
        apiUrl: data?.middlewareApiUrl,
        apiKey: data?.middlewareApiKey === '********' ? '' : data?.middlewareApiKey
      });
      if (response.data.success) {
        setMessage({ type: 'success', text: 'TBZ Cloud URL connection validated successfully.' });
      } else {
        setMessage({ type: 'error', text: `TBZ Cloud URL check failed: ${response.data.message}` });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `Connection check failed: ${err.message}` });
    }
  };

  const rotateSecret = async (secretType: 'jwt' | 'backup' | 'diagnostics' | 'middleware') => {
    let warning = '';
    if (secretType === 'jwt') {
      warning = 'Regenerating the JWT secret logs out all users. Are you sure you want to proceed?';
    } else if (secretType === 'backup') {
      warning = 'Rotating the backup key affects future backups. Are you sure you want to proceed?';
    } else if (secretType === 'diagnostics') {
      warning = 'Rotating the diagnostics key affects future diagnostic bundles. Are you sure you want to proceed?';
    } else if (secretType === 'middleware') {
      warning = 'Generating a new License Key will invalidate the current key immediately. Are you sure you want to proceed?';
    }

    if (!window.confirm(warning)) return;
    setMessage(null);
    try {
      const response = await apiClient.post('/admin/settings/rotate-secret', { secretType });
      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message });
        
        // If it's the middleware key, display the one-time generated key dialog
        if (secretType === 'middleware' && response.data.key) {
          setOneTimeKey(response.data.key);
          setShowKeyDialog(true);
        }
        
        loadAll();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Secret rotation failed.' });
    }
  };

  const runBackup = async () => {
    setMessage(null);
    try {
      const response = await apiClient.post('/admin/settings/run-backup');
      if (response.data.success) {
        setMessage({ type: 'success', text: `Manual backup generated successfully. ID: ${response.data.backupId}` });
        loadAll();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Manual backup execution failed.' });
    }
  };

  const runCloudSync = async () => {
    setMessage(null);
    try {
      const response = await apiClient.post('/admin/settings/sync-cloud');
      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const clearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear old archive logs? Current active log will not be deleted.')) return;
    setMessage(null);
    try {
      const response = await apiClient.post('/admin/settings/clear-logs');
      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const downloadLogs = () => {
    const url = `${apiClient.defaults.baseURL}/admin/settings/download-logs`;
    // Create an anchor element to trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `synos-api-${new Date().toISOString().slice(0,10)}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-400 font-medium font-display">Loading advanced configurations...</div>;
  }

  if (!data) {
    return <div className="text-center py-12 text-red-500 font-medium font-display">Failed to load configuration data.</div>;
  }

  return (
    <div className="space-y-8 animate-fadeIn text-slate-100 font-display">
      {/* 1. HEALTH SUMMARY CARD */}
      {health && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">System Health & Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Database Server</p>
                <p className="text-sm font-bold text-white mt-1">{health.database === 'Connected' ? 'Active & Migrated' : 'Disconnected'}</p>
              </div>
              <span className={`w-3 h-3 rounded-full ${health.database === 'Connected' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-red-500'}`}></span>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">TBZ Cloud Connection</p>
                <p className="text-sm font-bold text-white mt-1">{health.middleware}</p>
              </div>
              <span className={`w-3 h-3 rounded-full ${health.middleware === 'Connected' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-red-500'}`}></span>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Storage Volume</p>
                <p className="text-sm font-bold text-white mt-1">{(health.storageFreeSpaceBytes / (1024 * 1024 * 1024)).toFixed(1)} GB Free</p>
              </div>
              <span className={`w-3 h-3 rounded-full ${health.storage === 'Accessible' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-red-500'}`}></span>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-850">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Licensing & Version</p>
              <p className="text-xs font-bold text-indigo-400 mt-1">{health.currentVersion}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">{health.license}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-850 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Last System Backup:</span>
              <span className="font-bold text-white">{health.lastBackup}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cloud Sync Status:</span>
              <span className="font-bold text-emerald-400">{health.cloudSync}</span>
            </div>
          </div>
        </div>
      )}

      {/* Alert banners */}
      {message && (
        <div className={`p-4 rounded-lg text-xs font-semibold border ${
          message.type === 'success' ? 'bg-emerald-950/30 border-emerald-800 text-emerald-400' : 'bg-red-950/30 border-red-800 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* 1. SECTION: CONNECTION & INTEGRATION */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h3 className="text-base font-bold text-indigo-400 mb-6 border-b border-slate-850 pb-2">Connection & Integration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">TBZ Cloud URL</label>
              <input
                type="text"
                value={data.middlewareApiUrl || ''}
                onChange={e => setData({ ...data, middlewareApiUrl: e.target.value })}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-300 font-mono"
              />
            </div>
            <div className="md:col-span-2 bg-slate-950 p-4 rounded-lg border border-slate-850 mt-4">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center text-xs space-y-4 md:space-y-0">
                <div>
                  <span className="font-bold text-slate-300">License Key</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">Used by the integration clients to authenticate to the TBZ Cloud.</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2.5 py-1 rounded-full text-semibold text-[10px] ${
                    data.middlewareApiKey ? 'bg-emerald-950 border border-emerald-800 text-emerald-400' : 'bg-red-950 border border-red-800 text-red-400'
                  }`}>
                    {data.middlewareApiKey ? 'Active' : 'Missing'}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => rotateSecret('middleware')}
                      className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-xxs font-bold rounded transition-colors text-white"
                    >
                      Generate New
                    </button>
                    <button
                      type="button"
                      onClick={testMiddleware}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-xxs font-bold rounded transition-colors text-slate-300 border border-slate-700"
                    >
                      Test Connection
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 1.5. SECTION: DATABASE & INSTALLATION SETTINGS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h3 className="text-base font-bold text-indigo-400 mb-6 border-b border-slate-850 pb-2">License & Installation Settings</h3>
          
          {/* License Telemetry Card */}
          <div className="mb-6 p-5 rounded-xl bg-slate-950 border border-slate-850 text-xs space-y-3">
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-850 pb-2">Active License Telemetry</div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-semibold">Laboratory Identifier:</span>
              <span className="font-mono text-xs font-bold text-slate-300">{data.labId || 'LAB001'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-semibold">License Type:</span>
              <span className="text-indigo-400 font-bold">{data.licenseType || 'Commercial'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-semibold">Maximum Branches:</span>
              <span className="text-indigo-400 font-bold">{data.maximumBranches ?? 1}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-semibold">Expiry Date:</span>
              <span className="text-indigo-400 font-mono font-medium">{data.licenseExpiryDate ? new Date(data.licenseExpiryDate).toLocaleDateString() : 'Never'}</span>
            </div>
            {data.enabledFeatures && data.enabledFeatures.length > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Enabled Features:</span>
                <span className="text-indigo-400 font-mono text-[10px] bg-indigo-950/30 border border-indigo-800 px-2 py-0.5 rounded">{data.enabledFeatures.join(', ')}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-semibold">License Status:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                data.licenseStatus?.toLowerCase() === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
              }`}>
                {data.licenseStatus || 'Active'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Database Connection Parameters</span>
              <div className="flex items-center space-x-2">
                {dbLocked ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('⚠️ WARNING: Modifying database configurations incorrectly will disconnect SynOS and prevent the application from launching. Are you sure you want to unlock these settings?')) {
                        setDbLocked(false);
                        setDbTestSuccess(false);
                      }
                    }}
                    className="px-3 py-1.5 bg-red-950 border border-red-800 hover:bg-red-900 text-xxs font-bold rounded transition-colors text-red-400"
                  >
                    🔓 Unlock Settings
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setDbLocked(true);
                      loadAll();
                    }}
                    className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-xxs font-bold rounded transition-colors text-slate-300 border border-slate-700"
                  >
                    🔒 Lock & Revert
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Database Server</label>
                <input
                  type="text"
                  value={dbServer}
                  onChange={e => {
                    setDbServer(e.target.value);
                    setDbTestSuccess(false);
                  }}
                  disabled={dbLocked}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-300 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Database Name</label>
                <input
                  type="text"
                  value={dbName}
                  onChange={e => {
                    setDbName(e.target.value);
                    setDbTestSuccess(false);
                  }}
                  disabled={dbLocked}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-300 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">User ID (SQL Auth)</label>
                <input
                  type="text"
                  value={dbUser}
                  onChange={e => {
                    setDbUser(e.target.value);
                    setDbTestSuccess(false);
                  }}
                  disabled={dbLocked}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-300 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Password</label>
                <input
                  type="password"
                  value={dbPassword}
                  onChange={e => {
                    setDbPassword(e.target.value);
                    setDbTestSuccess(false);
                  }}
                  disabled={dbLocked}
                  placeholder={dbLocked ? '••••••••' : 'Enter SQL Password'}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-300 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {!dbLocked && (
              <div className="flex justify-between items-center pt-4 border-t border-slate-850 mt-4">
                <button
                  type="button"
                  onClick={testDb}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-xs font-semibold rounded-lg transition-colors text-white"
                >
                  Test Connection
                </button>
                <button
                  type="button"
                  onClick={saveDbConfig}
                  disabled={!dbTestSuccess || actionLoading}
                  className={`px-5 py-2 text-xs font-bold rounded-lg transition-colors shadow-lg ${
                    dbTestSuccess && !actionLoading
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Save Connection Settings
                </button>
              </div>
            )}

            {dbTestResult && (
              <div className={`p-3 rounded border text-xs font-mono mt-2 ${
                dbTestResult.includes('Successful') ? 'bg-emerald-950/20 border-emerald-800 text-emerald-400' : 'bg-red-950/20 border-red-800 text-red-400'
              }`}>
                {dbTestResult}
              </div>
            )}
          </div>
        </div>

        {/* 2. SECTION: PATHS & DIRECTORIES */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h3 className="text-base font-bold text-indigo-400 mb-6 border-b border-slate-850 pb-2">2. Storage Volumes & System Paths</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Document Storage Folder</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={data.fileStorageBasePath || ''}
                  onChange={e => setData({ ...data, fileStorageBasePath: e.target.value })}
                  className="flex-1 bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-slate-300"
                />
                <button
                  type="button"
                  onClick={() => testPath(data.fileStorageBasePath || '')}
                  className="px-4 bg-slate-850 hover:bg-slate-800 text-xs font-semibold rounded-lg transition-colors border border-slate-750"
                >
                  Verify
                </button>
              </div>
              <div className="mt-2 bg-slate-950 p-3 rounded border border-slate-850 text-[11px] text-slate-400 leading-relaxed">
                <span className="font-bold text-slate-200">Used for storing:</span> Reports, Invoices, Attachments, Signature Images, and Exports.
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">System Working Directory</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={data.workingDirectory || ''}
                  onChange={e => setData({ ...data, workingDirectory: e.target.value })}
                  className="flex-1 bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-slate-300"
                />
                <button
                  type="button"
                  onClick={() => testPath(data.workingDirectory || '')}
                  className="px-4 bg-slate-850 hover:bg-slate-800 text-xs font-semibold rounded-lg transition-colors border border-slate-750"
                >
                  Verify
                </button>
              </div>
              <div className="mt-2 bg-slate-950 p-3 rounded border border-slate-850 text-[11px] text-slate-400 leading-relaxed">
                <span className="font-bold text-slate-200">Used internally for:</span> Update deployment binaries, temporary file buffers, support diagnostics logs, and disaster recovery safeties.
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">PACS DICOM Storage Root Path</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={data.pacsRootPath || ''}
                  onChange={e => setData({ ...data, pacsRootPath: e.target.value })}
                  className="flex-1 bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-slate-300"
                />
                <button
                  type="button"
                  onClick={() => testPath(data.pacsRootPath || '')}
                  className="px-4 bg-slate-850 hover:bg-slate-800 text-xs font-semibold rounded-lg transition-colors border border-slate-750"
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. SECTION: SECURITY & SECRETS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h3 className="text-base font-bold text-indigo-400 mb-6 border-b border-slate-850 pb-2">2. Security Secrets & Token Lifetimes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">JWT Expiry Lifetime (Minutes)</label>
              <input
                type="number"
                value={data.jwtExpiryMinutes || 1440}
                onChange={e => setData({ ...data, jwtExpiryMinutes: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Refresh Token Expiry (Days)</label>
              <input
                type="number"
                value={data.jwtRefreshTokenExpiryDays || 7}
                onChange={e => setData({ ...data, jwtRefreshTokenExpiryDays: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-300"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-850">
            <h4 className="text-xs font-bold text-slate-300 uppercase">Cryptographic Secrets Management</h4>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 space-y-4">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-300">JWT Signing Key</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">Used for signing authentication payloads</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="px-2 py-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-semibold text-[10px]">
                    {data.jwtSecretStatus || 'Configured'}
                  </span>
                  <button
                    type="button"
                    onClick={() => rotateSecret('jwt')}
                    className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-xxs font-bold rounded transition-colors text-white"
                  >
                    Rotate Key
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs pt-3 border-t border-slate-900">
                <div>
                  <span className="font-bold text-slate-300">Backup Encryption Key</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">Used for encrypting physical database zip archives</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="px-2 py-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-semibold text-[10px]">
                    {data.backupKeyStatus || 'Configured'}
                  </span>
                  <button
                    type="button"
                    onClick={() => rotateSecret('backup')}
                    className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-xxs font-bold rounded transition-colors text-white"
                  >
                    Rotate Key
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs pt-3 border-t border-slate-900">
                <div>
                  <span className="font-bold text-slate-300">Diagnostics Key</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">Encrypts diagnostics and log telemetry dumps</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="px-2 py-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-semibold text-[10px]">
                    {data.diagnosticsKeyStatus || 'Configured'}
                  </span>
                  <button
                    type="button"
                    onClick={() => rotateSecret('diagnostics')}
                    className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-xxs font-bold rounded transition-colors text-white"
                  >
                    Rotate Key
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. SECTION: OTA UPDATES & MAINTENANCE */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h3 className="text-base font-bold text-indigo-400 mb-6 border-b border-slate-850 pb-2">3. OTA Updates & Scheduled Maintenance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Update Channel</label>
              <select
                value={data.otaChannel || 'Stable'}
                onChange={e => setData({ ...data, otaChannel: e.target.value })}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-300"
              >
                <option value="Stable">Stable releases (Recommended)</option>
                <option value="Beta">Beta (Pre-production testing)</option>
                <option value="Canary">Canary (Latest cutting-edge)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Application Update Policy</label>
              <select
                value={data.otaPolicy || 'NotifyOnly'}
                onChange={e => setData({ ...data, otaPolicy: e.target.value })}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-300"
              >
                <option value="NotifyOnly">Notify Only (Administrator decides)</option>
                <option value="Automatic">Automatic (Install during maintenance window)</option>
                <option value="Manual">Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Maintenance Window Day</label>
              <select
                value={data.otaMaintenanceDay || 'Sunday'}
                onChange={e => setData({ ...data, otaMaintenanceDay: e.target.value })}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-300"
              >
                <option value="Sunday">Sunday</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Start Hour</label>
                <input
                  type="time"
                  value={data.otaMaintenanceStartHour || '02:00'}
                  onChange={e => setData({ ...data, otaMaintenanceStartHour: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">End Hour</label>
                <input
                  type="time"
                  value={data.otaMaintenanceEndHour || '04:00'}
                  onChange={e => setData({ ...data, otaMaintenanceEndHour: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-300"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 5. SECTION: WHATSAPP INTEGRATION SETTINGS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h3 className="text-base font-bold text-indigo-400 mb-6 border-b border-slate-850 pb-2">4. WhatsApp Dispatch & Cloud API Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Meta Graph API Version</label>
              <input
                type="text"
                value={data.whatsAppGraphApiVersion || ''}
                onChange={e => setData({ ...data, whatsAppGraphApiVersion: e.target.value })}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">WhatsApp App Secret</label>
              <input
                type="password"
                value={data.whatsAppAppSecret || ''}
                onChange={e => setData({ ...data, whatsAppAppSecret: e.target.value })}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Webhook Verify Token</label>
              <input
                type="password"
                value={data.whatsAppVerifyToken || ''}
                onChange={e => setData({ ...data, whatsAppVerifyToken: e.target.value })}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Phone Number ID</label>
              <input
                type="text"
                value={data.whatsAppPhoneNumberId || ''}
                onChange={e => setData({ ...data, whatsAppPhoneNumberId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">WhatsApp Business Account ID</label>
              <input
                type="text"
                value={data.whatsAppBusinessAccountId || ''}
                onChange={e => setData({ ...data, whatsAppBusinessAccountId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Active Dispatch Template Name</label>
              <input
                type="text"
                value={data.whatsAppActiveTemplateName || ''}
                onChange={e => setData({ ...data, whatsAppActiveTemplateName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-300 font-mono"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Public Tunnel Webhook URL (For Local Tests)</label>
              <input
                type="text"
                value={data.whatsAppPublicTunnelUrl || ''}
                onChange={e => setData({ ...data, whatsAppPublicTunnelUrl: e.target.value })}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-300 font-mono"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Permanent System Access Token</label>
              <textarea
                rows={3}
                value={data.whatsAppAccessToken || ''}
                onChange={e => setData({ ...data, whatsAppAccessToken: e.target.value })}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-300 font-mono resize-none"
              />
            </div>
          </div>
        </div>

        {/* 6. SECTION: LOGS & MAINTENANCE OPERATIONS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h3 className="text-base font-bold text-indigo-400 mb-6 border-b border-slate-850 pb-2">5. Maintenance Actions & Operations Log</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={downloadLogs}
              className="px-4 py-3 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-xs font-bold rounded-lg text-slate-300 flex flex-col items-center justify-center space-y-2 transition-colors"
            >
              <span>📥</span>
              <span>Download active logs</span>
            </button>
            <button
              type="button"
              onClick={clearLogs}
              className="px-4 py-3 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-xs font-bold rounded-lg text-amber-500 flex flex-col items-center justify-center space-y-2 transition-colors"
            >
              <span>🗑</span>
              <span>Clear old logs</span>
            </button>
            <button
              type="button"
              onClick={runBackup}
              className="px-4 py-3 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-xs font-bold rounded-lg text-indigo-400 flex flex-col items-center justify-center space-y-2 transition-colors"
            >
              <span>💾</span>
              <span>Run Backup Now</span>
            </button>
            <button
              type="button"
              onClick={runCloudSync}
              className="px-4 py-3 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-xs font-bold rounded-lg text-emerald-400 flex flex-col items-center justify-center space-y-2 transition-colors"
            >
              <span>☁</span>
              <span>Retry Cloud Sync</span>
            </button>
          </div>
        </div>

        {/* Save/Submit bar */}
        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            type="submit"
            disabled={actionLoading}
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-xs font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/20 transform hover:-translate-y-0.5 transition-all text-white"
          >
            {actionLoading ? 'Saving Settings...' : 'Save Configurations'}
          </button>
        </div>
      </form>


      {/* One-time Copy Key Dialog */}
      {showKeyDialog && oneTimeKey && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center">
              ⚠️ One-Time Generated Key
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              This is the new License Key. For absolute security, this key is never displayed again. Please copy it immediately:
            </p>
            <div className="bg-slate-950 border border-slate-850 p-3 rounded font-mono text-xs text-indigo-400 break-all select-all flex justify-between items-center">
              <span>{oneTimeKey}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(oneTimeKey);
                  alert('Copied to clipboard!');
                }}
                className="ml-2 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-bold rounded text-white"
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
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-white"
              >
                Done & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSettingsTab;
