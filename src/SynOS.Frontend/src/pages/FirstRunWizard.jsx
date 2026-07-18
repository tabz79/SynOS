import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
    Database, 
    FolderOpen, 
    Cloud, 
    User, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    ChevronRight, 
    Check, 
    Server, 
    Lock,
    ShieldCheck,
    RefreshCw
} from 'lucide-react';

export function FirstRunWizard() {
    const { isConfigured, setIsConfigured } = useAuth();
    const navigate = useNavigate();

    // Wizard Steps: 1: Activation, 2: Admin Account, 3: Installation Progress, 4: Success
    const [step, setStep] = useState(1);
    const [isLoadingDefaults, setIsLoadingDefaults] = useState(true);

    // Form fields
    const [middlewareKey, setMiddlewareKey] = useState('');
    
    // Admin fields
    const [adminName, setAdminName] = useState('Administrator');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [adminConfirmPassword, setAdminConfirmPassword] = useState('');

    // Database configurations (hidden by default, editable in advanced drawer)
    const [dbServer, setDbServer] = useState('localhost');
    const [dbName, setDbName] = useState('SynOSDb');
    const [dbUser, setDbUser] = useState('sa');
    const [dbPassword, setDbPassword] = useState('');
    const [useWindowsAuth, setUseWindowsAuth] = useState(true);

    // Storage paths (hidden, configured automatically)
    const [pacsFolder, setPacsFolder] = useState('C:\\SynOS_Files\\PACS');
    const [documentFolder, setDocumentFolder] = useState('C:\\SynOS_Files');
    const [workingDir, setWorkingDir] = useState('C:\\SynOS_Working');
    
    // License metadata fetched during validation
    const [licenseInfo, setLicenseInfo] = useState(null);

    // Wizard control states
    const [error, setError] = useState(null);
    const [isValidating, setIsValidating] = useState(false);
    const [showDbTroubleshoot, setShowDbTroubleshoot] = useState(false);

    // Handover and Recovery panel states
    const [isHandingOver, setIsHandingOver] = useState(false);
    const [showRecoveryPanel, setShowRecoveryPanel] = useState(false);
    const [diagnosticsLogs, setDiagnosticsLogs] = useState('');
    const [showDiagModal, setShowDiagModal] = useState(false);
    const [targetUrls, setTargetUrls] = useState({ statusUrl: '', loginUrl: '' });

    // Step 3 progress states
    const [subSteps, setSubSteps] = useState([
        { id: 'license', label: 'Activating license key', status: 'idle' },
        { id: 'database', label: 'Initializing local database', status: 'idle' },
        { id: 'storage', label: 'Setting up local file storage', status: 'idle' },
        { id: 'admin', label: 'Creating administrator account', status: 'idle' },
        { id: 'finalize', label: 'Finalizing system configuration', status: 'idle' }
    ]);

    useEffect(() => {
        // If already configured, redirect to login or dashboard
        if (isConfigured) {
            navigate('/', { replace: true });
        }
    }, [isConfigured, navigate]);

    // Fetch default connection strings & folder path settings from backend
    useEffect(() => {
        const fetchDefaultsAndProgress = async () => {
            try {
                // Fetch defaults first
                const resDefaults = await fetch('/api/v1/setup/defaults');
                if (resDefaults.ok) {
                    const data = await resDefaults.json();
                    setDbServer(data.databaseServer || 'localhost');
                    setDbName(data.databaseName || 'SynOSDb');
                    setDbUser(data.databaseUser || 'sa');
                    setDbPassword(data.databasePassword || '');
                    setPacsFolder(data.pacsStorageFolder || 'C:\\SynOS_Files\\PACS');
                    setDocumentFolder(data.documentStorageFolder || 'C:\\SynOS_Files');
                    setWorkingDir(data.workingDirectory || 'C:\\SynOS_Working');
                }

                // Fetch checkpoint progress to resume if needed
                const resProgress = await fetch('/api/v1/setup/progress');
                if (resProgress.ok) {
                    const data = await resProgress.json();
                    if (data.currentStep) {
                        setStep(data.currentStep);
                    }
                    if (data.databaseServer) setDbServer(data.databaseServer);
                    if (data.databaseName) setDbName(data.databaseName);
                    if (data.adminUsername) setAdminEmail(data.adminUsername);
                    if (data.licenseActivated) {
                        setLicenseInfo({ success: true });
                    }
                }
            } catch (err) {
                console.error("Error loading setup configurations:", err);
            } finally {
                setIsLoadingDefaults(false);
            }
        };
        fetchDefaultsAndProgress();
    }, []);

    const saveProgress = async (nextStep, licenseActivatedVal) => {
        try {
            await fetch('/api/v1/setup/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentStep: nextStep,
                    licenseActivated: licenseActivatedVal !== undefined ? licenseActivatedVal : (licenseInfo !== null),
                    databaseServer: dbServer,
                    databaseName: dbName,
                    adminUsername: adminEmail
                })
            });
        } catch (err) {
            console.error("Failed to save progress:", err);
        }
    };

    // Step 1: Validate license with Cloud Activator
    const handleVerifyLicense = async (e) => {
        e.preventDefault();
        setError(null);
        setIsValidating(true);

        try {
            const res = await fetch('/api/v1/setup/test-middleware', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiUrl: 'https://cloud.tbzlabs.in/api/events',
                    apiKey: middlewareKey
                })
            });
            const data = await res.json();
            if (data.success) {
                setLicenseInfo(data);
                await saveProgress(2, true);
                setStep(2);
            } else {
                setError(data.message || "License activation failed. Please check your key and try again.");
            }
        } catch (err) {
            setError("Could not connect to the activation server. Please check your internet connection.");
        } finally {
            setIsValidating(false);
        }
    };

    // Step 2: Transition to progress setup after validating administrator input
    const handleAdminSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (adminPassword !== adminConfirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (adminPassword.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        await saveProgress(3);
        setStep(3);
    };

    // Trigger installation progress flow automatically when Step 3 is reached
    useEffect(() => {
        if (step === 3) {
            runSetupSequence();
        }
    }, [step]);

    const updateSubStepStatus = (id, status) => {
        setSubSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    };

    const runSetupSequence = async () => {
        setError(null);
        setShowDbTroubleshoot(false);

        // 1. Activating License
        updateSubStepStatus('license', 'running');
        await new Promise(r => setTimeout(r, 800));
        updateSubStepStatus('license', 'success');

        // 2. Initializing database
        updateSubStepStatus('database', 'running');
        try {
            const dbCheck = await fetch('/api/v1/setup/test-db', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    server: dbServer,
                    database: dbName,
                    user: useWindowsAuth ? '' : dbUser,
                    password: useWindowsAuth ? '' : dbPassword
                })
            });
            const dbRes = await dbCheck.json();
            if (!dbRes.success) {
                updateSubStepStatus('database', 'failed');
                setError(`Database Connection Failed: ${dbRes.message || "Please verify SQL settings."}`);
                setShowDbTroubleshoot(true);
                return;
            }
            updateSubStepStatus('database', 'success');
        } catch (err) {
            updateSubStepStatus('database', 'failed');
            setError("Failed to query the database host. Please verify SQL Server settings.");
            setShowDbTroubleshoot(true);
            return;
        }

        // 3. Setting up storage paths
        updateSubStepStatus('storage', 'running');
        try {
            const paths = [documentFolder, pacsFolder, workingDir];
            for (const path of paths) {
                const pCheck = await fetch('/api/v1/setup/test-path', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path })
                });
                const pRes = await pCheck.json();
                if (!pRes.success) {
                    updateSubStepStatus('storage', 'failed');
                    setError(`Permission check failed for path (${path}): ${pRes.message}`);
                    return;
                }
            }
            updateSubStepStatus('storage', 'success');
        } catch (err) {
            updateSubStepStatus('storage', 'failed');
            setError("Failed to verify folder write permissions.");
            return;
        }

        // 4. Creating administrator account
        updateSubStepStatus('admin', 'running');
        await new Promise(r => setTimeout(r, 600));
        updateSubStepStatus('admin', 'success');

        // 5. Finalizing system configuration
        updateSubStepStatus('finalize', 'running');
        try {
            const initCheck = await fetch('/api/v1/setup/initialize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    databaseServer: dbServer,
                    databaseName: dbName,
                    databaseUser: useWindowsAuth ? '' : dbUser,
                    databasePassword: useWindowsAuth ? '' : dbPassword,
                    middlewareApiUrl: 'https://cloud.tbzlabs.in/api/events',
                    middlewareApiKey: middlewareKey,
                    labId: licenseInfo?.labId || 'LAB001',
                    licenseType: licenseInfo?.licenseType || 'OnPremise',
                    maximumBranches: licenseInfo?.maximumBranches || 1,
                    licenseExpiryDate: licenseInfo?.expiryDate,
                    licenseStatus: licenseInfo?.licenseStatus || 'Active',
                    enabledFeatures: licenseInfo?.enabledFeatures || [],
                    documentStorageFolder: documentFolder,
                    pacsStorageFolder: pacsFolder,
                    workingDirectory: workingDir,
                    adminUsername: adminEmail, // Primary identity is email
                    adminPassword: adminPassword
                })
            });
            const initRes = await initCheck.json();
            if (initCheck.ok && initRes.success) {
                updateSubStepStatus('finalize', 'success');
                await new Promise(r => setTimeout(r, 800));
                setTargetUrls({ statusUrl: initRes.serviceStatusUrl, loginUrl: initRes.loginUrl });
                startHandoverPolling(initRes.serviceStatusUrl, initRes.loginUrl);
            } else {
                updateSubStepStatus('finalize', 'failed');
                setError(initRes.message || "Failed to finalize system configurations.");
            }
        } catch (err) {
            updateSubStepStatus('finalize', 'failed');
            setError("Server connection timed out during initialization.");
        }
    };

    const startHandoverPolling = (statusUrl, loginUrl) => {
        setIsHandingOver(true);
        const startTime = Date.now();

        const poll = async () => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1200);
                const res = await fetch(statusUrl, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (res.ok) {
                    const data = await res.json();
                    if (data.isConfigured) {
                        clearInterval(intervalId);
                        window.location.href = loginUrl;
                        return;
                    }
                }
            } catch (err) {
                // Fallback: Check setup status on current origin
                try {
                    const currentRes = await fetch('/api/v1/setup/status');
                    if (currentRes.ok) {
                        const currentData = await currentRes.json();
                        if (currentData.isConfigured) {
                            clearInterval(intervalId);
                            window.location.href = '/login';
                            return;
                        }
                    }
                } catch(e) {}
            }

            if (Date.now() - startTime > 5000) {
                setShowRecoveryPanel(true);
            }
        };

        const intervalId = setInterval(poll, 1500);
        poll();
    };

    if (isLoadingDefaults) {
        return (
            <div className="h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                <p className="text-zinc-400 font-medium">Preparing First-Run Wizard...</p>
            </div>
        );
    }

    if (isHandingOver) {
        return (
            <div className="min-h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100 select-none relative overflow-hidden">
                {/* Ambient Background Glow Effects */}
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-900/5 rounded-full blur-[120px] pointer-events-none" />

                <div className="w-full max-w-md bg-zinc-900/70 border border-zinc-800/80 backdrop-blur-xl rounded-2xl p-8 shadow-2xl relative z-10 space-y-6 text-center">
                    <div className="flex justify-center">
                        <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold text-white">Starting SynOS...</h2>
                        <p className="text-zinc-400 text-xs leading-relaxed">
                            The system is starting the background Windows Service and initializing components. You will be redirected automatically.
                        </p>
                    </div>

                    {showRecoveryPanel && (
                        <div className="p-5 bg-zinc-950/80 border border-amber-500/20 rounded-xl space-y-4 text-left animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="space-y-1">
                                <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider">Service Startup Notice</h3>
                                <p className="text-zinc-400 text-[11px] leading-normal">
                                    Starting SynOS is taking longer than expected. The background service might still be completing migrations. We are continuing to poll the service in the background.
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                                <button
                                    type="button"
                                    onClick={() => {
                                        window.location.href = '/login';
                                    }}
                                    className="col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-3 rounded-lg font-bold transition-all text-center shadow-lg"
                                >
                                    Proceed to Login →
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            const res = await fetch(targetUrls.statusUrl);
                                            if (res.ok) {
                                                const data = await res.json();
                                                if (data.isConfigured) {
                                                    window.location.href = targetUrls.loginUrl;
                                                }
                                            }
                                        } catch(e) {}
                                    }}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 py-2 px-3 rounded-lg font-semibold transition-all border border-zinc-700"
                                >
                                    Retry Connection
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDiagnosticsLogs(
                                            `Target Ports:\nSetup Host: 59998\nProduction Service: 59999\n\nTarget URLs:\nStatus URL: ${targetUrls.statusUrl}\nLogin URL: ${targetUrls.loginUrl}\n\nTroubleshooting Instructions:\n1. Verify the 'TBZ Labs - SynOS' service status in Services.msc.\n2. Ensure port 59999 is not occupied by another process.\n3. View local installer logs at C:\\ProgramData\\TBZ Labs\\SynOS\\Logs\\install.log`
                                        );
                                        setShowDiagModal(true);
                                    }}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 py-2 px-3 rounded-lg font-semibold transition-all border border-zinc-700"
                                >
                                    View Diagnostics
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText("C:\\ProgramData\\TBZ Labs\\SynOS\\Logs\\install.log");
                                        alert("Log file path copied to clipboard:\nC:\\ProgramData\\TBZ Labs\\SynOS\\Logs\\install.log");
                                    }}
                                    className="col-span-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 py-2 px-3 rounded-lg font-semibold transition-all border border-emerald-500/20 text-center"
                                >
                                    Copy Install Log Path
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {showDiagModal && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">System Diagnostics</h3>
                            <pre className="bg-zinc-950 p-4 rounded-lg text-[10px] font-mono text-zinc-300 whitespace-pre-wrap max-h-60 overflow-y-auto border border-zinc-800">
                                {diagnosticsLogs}
                            </pre>
                            <button
                                type="button"
                                onClick={() => setShowDiagModal(false)}
                                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 py-2 px-4 rounded-lg text-xs font-semibold"
                            >
                                Close Diagnostics
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100 select-none relative overflow-hidden">
            {/* Ambient Background Glow Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-lg bg-zinc-900/80 border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl relative z-10">
                
                {/* Header Section */}
                <div className="p-8 pb-6 border-b border-zinc-800/50 flex flex-col items-center text-center">
                    <img 
                        src="/assets/synos-lockup.svg" 
                        alt="SynOS Logo" 
                        className="h-9 object-contain mb-4 filter brightness-125" 
                    />
                    <h1 className="text-2xl font-bold tracking-tight text-white">
                        {step === 1 && "Activate SynOS"}
                        {step === 2 && "Create Administrator Account"}
                        {step === 3 && "Setting up SynOS..."}
                        {step === 4 && "System Configured!"}
                    </h1>
                    <p className="text-zinc-400 text-xs mt-1 max-w-[320px]">
                        {step === 1 && "Enter the activation key provided to you by TBZ Labs to start setup."}
                        {step === 2 && "This email credentials will serve as your master sign-in profile."}
                        {step === 3 && "Please wait while we initialize local resources and database structures."}
                        {step === 4 && "Onboarding completed successfully. Your diagnostic suite is ready."}
                    </p>
                </div>

                {/* Feedback Alerts */}
                {error && (
                    <div className="px-8 pt-6">
                        <div className="bg-red-950/40 border border-red-900/50 text-red-300 text-xs p-4 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <span className="font-semibold block mb-0.5">Configuration Alert</span>
                                <span>{error}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Panels Content */}
                <div className="p-8">
                    
                    {/* STEP 1: ACTIVATION KEY */}
                    {step === 1 && (
                        <form onSubmit={handleVerifyLicense} className="space-y-5 animate-in fade-in duration-300">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Activation Key</label>
                                <input
                                    type="text"
                                    required
                                    value={middlewareKey}
                                    onChange={(e) => setMiddlewareKey(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25 transition-all text-sm font-mono tracking-wider"
                                    placeholder="XXXX-XXXX-XXXX-XXXX"
                                    disabled={isValidating}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isValidating || !middlewareKey.trim()}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                {isValidating && <Loader2 className="w-4 h-4 animate-spin" />}
                                Activate & Continue
                            </button>
                        </form>
                    )}

                    {/* STEP 2: ADMINISTRATOR SETUP */}
                    {step === 2 && (
                        <form onSubmit={handleAdminSubmit} className="space-y-4 animate-in fade-in duration-300">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={adminName}
                                    onChange={(e) => setAdminName(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25 transition-all text-sm"
                                    placeholder="e.g. Dr. John Doe"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Email Address (Login Identity)</label>
                                <input
                                    type="email"
                                    required
                                    value={adminEmail}
                                    onChange={(e) => setAdminEmail(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25 transition-all text-sm"
                                    placeholder="admin@laboratory.com"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={adminPassword}
                                        onChange={(e) => setAdminPassword(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25 transition-all text-sm"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Confirm Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={adminConfirmPassword}
                                        onChange={(e) => setAdminConfirmPassword(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25 transition-all text-sm"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 text-sm"
                            >
                                Set Up SynOS
                            </button>
                        </form>
                    )}

                    {/* STEP 3: AUTOMATIC PREPARATION CHECKLIST */}
                    {step === 3 && (
                        <div className="space-y-5 animate-in fade-in duration-300">
                            <div className="space-y-3.5 bg-zinc-950/60 p-5 rounded-xl border border-zinc-800/40">
                                {subSteps.map((s) => (
                                    <div key={s.id} className="flex items-center justify-between text-xs py-1">
                                        <span className="text-zinc-300 font-medium">{s.label}...</span>
                                        <div className="flex items-center">
                                            {s.status === 'idle' && (
                                                <div className="w-4 h-4 rounded-full border border-zinc-800" />
                                            )}
                                            {s.status === 'running' && (
                                                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                            )}
                                            {s.status === 'success' && (
                                                <Check className="w-4 h-4 text-emerald-500 font-bold" />
                                            )}
                                            {s.status === 'failed' && (
                                                <AlertCircle className="w-4 h-4 text-red-500" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Database Setup Troubleshooting Drawer (Slides down on DB test failure) */}
                            {showDbTroubleshoot && (
                                <div className="mt-4 p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 animate-in slide-in-from-top duration-300">
                                    <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wide">
                                        <Server className="w-4 h-4" />
                                        Advanced SQL Server Settings
                                    </div>
                                    <p className="text-zinc-400 text-[11px] leading-relaxed">
                                        Auto-detection was unable to connect to SQL Server. Please provide connection parameters below.
                                    </p>
                                    <div className="grid grid-cols-2 gap-3.5">
                                        <div className="space-y-1 col-span-2">
                                            <label className="text-[9px] font-bold text-zinc-500 uppercase">Database Server</label>
                                            <input
                                                type="text"
                                                value={dbServer}
                                                onChange={(e) => setDbServer(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-zinc-500 uppercase">Database Name</label>
                                            <input
                                                type="text"
                                                value={dbName}
                                                onChange={(e) => setDbName(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100"
                                            />
                                        </div>
                                        <div className="space-y-1 flex flex-col justify-center">
                                            <label className="text-[9px] font-bold text-zinc-500 uppercase mb-1">Authentication</label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="checkbox" 
                                                    id="windowsAuth"
                                                    checked={useWindowsAuth} 
                                                    onChange={(e) => setUseWindowsAuth(e.target.checked)} 
                                                    className="w-3.5 h-3.5 bg-zinc-950 border border-zinc-800 rounded"
                                                />
                                                <label htmlFor="windowsAuth" className="text-[10px] text-zinc-400">Windows Auth</label>
                                            </div>
                                        </div>
                                        {!useWindowsAuth && (
                                            <>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-zinc-500 uppercase">SQL User</label>
                                                    <input
                                                        type="text"
                                                        value={dbUser}
                                                        onChange={(e) => setDbUser(e.target.value)}
                                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-zinc-500 uppercase">SQL Password</label>
                                                    <input
                                                        type="password"
                                                        value={dbPassword}
                                                        onChange={(e) => setDbPassword(e.target.value)}
                                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={runSetupSequence}
                                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        Retry System Verification
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 4: READY TO LAUNCH */}
                    {step === 4 && (
                        <div className="space-y-5 text-center animate-in scale-in duration-300">
                            <div className="flex justify-center mb-1">
                                <div className="w-14 h-14 bg-emerald-950 border border-emerald-500/30 rounded-full flex items-center justify-center shadow-lg shadow-emerald-950/40">
                                    <ShieldCheck className="w-8 h-8 text-emerald-500" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-base font-bold text-white">License Activated</h2>
                                <p className="text-zinc-400 text-xs font-semibold">{licenseInfo?.labName || "SynOS Laboratory Suite"}</p>
                            </div>
                            
                            <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/40 grid grid-cols-2 gap-2 text-left text-[11px] leading-relaxed max-w-sm mx-auto">
                                <div>
                                    <span className="text-zinc-500 block">Licensing tier</span>
                                    <span className="text-zinc-300 font-medium">{licenseInfo?.licenseType || "On-Premise"}</span>
                                </div>
                                <div>
                                    <span className="text-zinc-500 block">Active branches</span>
                                    <span className="text-zinc-300 font-medium">Up to {licenseInfo?.maximumBranches || 1} branch</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsConfigured(true);
                                    navigate('/login', { replace: true });
                                }}
                                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-emerald-900/10 flex items-center justify-center gap-2 text-sm"
                            >
                                Launch SynOS
                            </button>
                        </div>
                    )}

                </div>

            </div>
        </div>
    );
}
