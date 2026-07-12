import React, { useState } from 'react';
import axios from 'axios';
import apiClient from '../services/apiClient';

const SetupWizard: React.FC<{ onSetupComplete: () => void }> = ({ onSetupComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Lab Identity States
  const [resolvedLabId, setResolvedLabId] = useState<string>('LAB001');
  const [resolvedLabName, setResolvedLabName] = useState<string>('');
  const [resolvedLicenseStatus, setResolvedLicenseStatus] = useState<string>('');
  const [resolvedLicenseType, setResolvedLicenseType] = useState<string>('Commercial');
  const [resolvedMaximumBranches, setResolvedMaximumBranches] = useState<number>(1);
  const [resolvedLicenseExpiry, setResolvedLicenseExpiry] = useState<string>('');
  const [resolvedEnabledFeatures, setResolvedEnabledFeatures] = useState<string[]>([]);
  const [mwTested, setMwTested] = useState<boolean>(false);

  // Form States
  const [dbServer, setDbServer] = useState('localhost');
  const [dbName, setDbName] = useState('SynOSDb');
  const [dbUser, setDbUser] = useState('sa');
  const [dbPassword, setDbPassword] = useState('');
  const [dbTestResult, setDbTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const [middlewareUrl, setMiddlewareUrl] = useState('http://localhost:5069/api/events');
  const [middlewareKey, setMiddlewareKey] = useState('TBZ-LAB-KEY-12345');
  const [mwTestResult, setMwTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const [docStorage, setDocStorage] = useState('C:\\SynOS_Files');
  const [pacsStorage, setPacsStorage] = useState('C:\\SynOS_Pacs');
  const [workingDir, setWorkingDir] = useState('C:\\SynOS_Working');
  const [pathTestResult, setPathTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const [adminUser, setAdminUser] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');

  const testDatabase = async () => {
    setLoading(true);
    setDbTestResult(null);
    try {
      const response = await apiClient.post('/setup/test-db', {
        server: dbServer,
        database: dbName,
        user: dbUser,
        password: dbPassword
      });
      setDbTestResult(response.data);
    } catch (err: any) {
      setDbTestResult({ success: false, message: err.response?.data?.message || 'Database test request failed.' });
    } finally {
      setLoading(false);
    }
  };

  const testMiddleware = async () => {
    setLoading(true);
    setMwTestResult(null);
    setMwTested(false);
    try {
      const response = await apiClient.post('/setup/test-middleware', {
        apiUrl: middlewareUrl,
        apiKey: middlewareKey
      });
      setMwTestResult(response.data);
      if (response.data.success) {
        setResolvedLabId(response.data.labId || 'LAB001');
        setResolvedLabName(response.data.labName || 'Development Lab');
        setResolvedLicenseStatus(response.data.licenseStatus || 'Active');
        setResolvedLicenseType(response.data.licenseType || 'Commercial');
        setResolvedMaximumBranches(response.data.maximumBranches || 1);
        setResolvedLicenseExpiry(response.data.expiryDate || '');
        setResolvedEnabledFeatures(response.data.enabledFeatures || []);
        setMwTested(true);
      }
    } catch (err: any) {
      setMwTestResult({ success: false, message: err.response?.data?.message || 'License activation failed.' });
    } finally {
      setLoading(false);
    }
  };

  const testPath = async (pathType: 'doc' | 'pacs' | 'work') => {
    setLoading(true);
    setPathTestResult(null);
    const path = pathType === 'doc' ? docStorage : pathType === 'pacs' ? pacsStorage : workingDir;
    try {
      const response = await apiClient.post('/setup/test-path', { path });
      setPathTestResult({ success: response.data.success, message: `${pathType.toUpperCase()} Path: ${response.data.message || 'Verification successful.'}` });
    } catch (err: any) {
      setPathTestResult({ success: false, message: err.response?.data?.message || 'Path verification request failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword !== adminConfirmPassword) {
      setErrorMessage('Admin passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await axios.post('/api/v1/setup/initialize', {
        databaseServer: dbServer,
        databaseName: dbName,
        databaseUser: dbUser,
        databasePassword: dbPassword,
        middlewareApiUrl: middlewareUrl,
        middlewareApiKey: middlewareKey,
        labId: resolvedLabId,
        licenseType: resolvedLicenseType,
        maximumBranches: resolvedMaximumBranches,
        licenseExpiryDate: resolvedLicenseExpiry,
        licenseStatus: resolvedLicenseStatus,
        enabledFeatures: resolvedEnabledFeatures,
        documentStorageFolder: docStorage,
        pacsStorageFolder: pacsStorage,
        workingDirectory: workingDir,
        adminUsername: adminUser,
        adminPassword: adminPassword
      });

      if (response.data.success) {
        setSuccessMessage('System initialized successfully! Redirecting...');
        setTimeout(() => {
          onSetupComplete();
        }, 2000);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Setup initialization failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-white font-display selection:bg-indigo-500 selection:text-white">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-fuchsia-500/10 blur-[120px]"></div>
      </div>

      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 z-10 backdrop-blur-md bg-opacity-80">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
            SynOS Setup Wizard
          </h1>
          <p className="text-slate-400 text-xs mt-2">
            Configure your lab intelligence environment parameters
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-between items-center mb-8 relative">
          <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-slate-800 -translate-y-1/2 z-0"></div>
          <div 
            className="absolute left-0 top-1/2 h-[2px] bg-gradient-to-r from-indigo-500 to-purple-500 -translate-y-1/2 z-0 transition-all duration-300"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          ></div>
          {[1, 2, 3, 4].map((s) => (
            <button
              key={s}
              onClick={() => s < step && setStep(s)}
              disabled={s >= step}
              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all duration-300 ${
                step === s
                  ? 'bg-indigo-600 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                  : s < step
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-slate-905 border-slate-800 text-slate-500'
              }`}
            >
              {s < step ? '✓' : s}
            </button>
          ))}
        </div>

        {/* Message banners */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-lg bg-red-950/30 border border-red-800 text-red-400 text-xs font-semibold animate-fadeIn">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-4 rounded-lg bg-emerald-950/30 border border-emerald-800 text-emerald-400 text-xs font-semibold animate-fadeIn">
            {successMessage}
          </div>
        )}

        {/* Wizard Form Panels */}
        <div className="space-y-6">
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">
                Step 1: SQL Server Database
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Server / Instance</label>
                  <input
                    type="text"
                    value={dbServer}
                    onChange={(e) => setDbServer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Database Name</label>
                  <input
                    type="text"
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Database User (SQL Auth)</label>
                  <input
                    type="text"
                    value={dbUser}
                    onChange={(e) => setDbUser(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Password</label>
                  <input
                    type="password"
                    value={dbPassword}
                    onChange={(e) => setDbPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={testDatabase}
                  disabled={loading}
                  className="px-4 py-2 border border-slate-700 hover:border-slate-500 text-xs font-semibold rounded-lg transition-colors bg-slate-950"
                >
                  {loading ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold rounded-lg transition-colors shadow-lg"
                >
                  Continue
                </button>
              </div>              {dbTestResult && (
                <div className={`p-4 rounded-lg text-xs font-mono border ${
                  dbTestResult.success ? 'bg-emerald-950/20 border-emerald-800 text-emerald-400' : 'bg-red-950/20 border-red-800 text-red-400'
                }`}>
                  {dbTestResult.success ? '✓ Connection successful!' : `✗ Error: ${dbTestResult.message}`}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">
                Step 2: Connect to TBZ Cloud
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">TBZ Cloud URL</label>
                  <input
                    type="text"
                    value={middlewareUrl}
                    onChange={(e) => {
                      setMiddlewareUrl(e.target.value);
                      setMwTested(false);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">License Key</label>
                  <input
                    type="password"
                    value={middlewareKey}
                    onChange={(e) => {
                      setMiddlewareKey(e.target.value);
                      setMwTested(false);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-slate-800 text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Back
                </button>
                <div className="space-x-3">
                  <button
                    type="button"
                    onClick={testMiddleware}
                    disabled={loading}
                    className="px-4 py-2 border border-slate-700 hover:border-slate-500 text-xs font-semibold rounded-lg transition-colors bg-slate-950"
                  >
                    {loading ? 'Activating...' : 'Activate License'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!mwTested}
                    className={`px-6 py-2 text-xs font-semibold rounded-lg transition-colors shadow-lg ${
                      mwTested ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Continue
                  </button>
                </div>
              </div>

              {mwTestResult && (
                <div className={`p-4 rounded-lg text-xs font-mono border ${
                  mwTestResult.success ? 'bg-emerald-950/20 border-emerald-800 text-emerald-400' : 'bg-red-950/20 border-red-800 text-red-400'
                }`}>
                  {mwTestResult.success ? '✓ License activation successful!' : `✗ Error: ${mwTestResult.message}`}
                </div>
              )}

              {mwTested && (
                <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs font-medium space-y-2 animate-fadeIn mt-4">
                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Connected License Information</div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">Laboratory Name:</span>
                    <span className="text-indigo-400 font-bold">{resolvedLabName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">License Type:</span>
                    <span className="text-indigo-400 font-semibold">{resolvedLicenseType}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">Maximum Branches:</span>
                    <span className="text-indigo-400 font-bold">{resolvedMaximumBranches}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">Expiry Date:</span>
                    <span className="text-indigo-400 font-mono">{resolvedLicenseExpiry ? new Date(resolvedLicenseExpiry).toLocaleDateString() : 'Never'}</span>
                  </div>
                  {resolvedEnabledFeatures && resolvedEnabledFeatures.length > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Enabled Features:</span>
                      <span className="text-indigo-400 font-mono text-[10px] bg-indigo-950/30 border border-indigo-800 px-2 py-0.5 rounded">{resolvedEnabledFeatures.join(', ')}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">License Status:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      resolvedLicenseStatus?.toLowerCase() === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {resolvedLicenseStatus || 'Unknown'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">
                Step 3: Storage & Working Directories
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Document Storage Path (Absolute)</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={docStorage}
                      onChange={(e) => setDocStorage(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => testPath('doc')}
                      className="px-3 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg transition-colors"
                    >
                      Verify
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Stores reports, invoices, patient attachments, signature images</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">PACS Storage Root Path (Absolute)</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={pacsStorage}
                      onChange={(e) => setPacsStorage(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => testPath('pacs')}
                      className="px-3 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg transition-colors"
                    >
                      Verify
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Stores raw DICOM imagery and study series metadata</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">System Working Directory (Absolute)</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={workingDir}
                      onChange={(e) => setWorkingDir(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => testPath('work')}
                      className="px-3 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg transition-colors"
                    >
                      Verify
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Internal workspace used for updates, backups, diagnostics, recovery</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-slate-800 text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold rounded-lg transition-colors shadow-lg"
                >
                  Continue
                </button>
              </div>

              {pathTestResult && (
                <div className={`p-4 rounded-lg text-xs font-mono border ${
                  pathTestResult.success ? 'bg-emerald-950/20 border-emerald-800 text-emerald-400' : 'bg-red-950/20 border-red-800 text-red-400'
                }`}>
                  {pathTestResult.success ? `✓ ${pathTestResult.message}` : `✗ Error: ${pathTestResult.message}`}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <form onSubmit={handleInitialize} className="space-y-6 animate-fadeIn">
              <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">
                Step 4: Administrator Account
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Admin Username</label>
                  <input
                    type="text"
                    required
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Password</label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 border border-slate-800 text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-xs font-semibold rounded-lg transition-all shadow-lg hover:shadow-indigo-500/20 transform hover:-translate-y-0.5"
                >
                  {loading ? 'Initializing System...' : 'Initialize & Finish Setup'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
