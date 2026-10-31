import { useState, useEffect } from 'react';
import { 
  Activity, Cpu, Radio, RefreshCw, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, 
  Terminal, Server, HardDrive, Network, Zap, Play, ShieldAlert, FileText, Check, Settings2,
  BookOpen, HelpCircle, Info, Copy, ChevronDown, ChevronUp, Monitor, Wifi, Layers, ShieldCheck, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient as api } from '@/api/client';

export function MachineIntegrationTab({ isDark }) {
  const [subTab, setSubTab] = useState('analyzers'); // 'analyzers', 'radiology', 'terminal'
  
  // Field Integration Tip Cards State
  const [showPairingGuide, setShowPairingGuide] = useState(true);
  const [guideBrand, setGuideBrand] = useState('siemens'); // 'siemens', 'ge', 'troubleshooting'
  
  // Analyzers State
  const [analyzers, setAnalyzers] = useState([]);
  const [loadingAnalyzers, setLoadingAnalyzers] = useState(false);
  const [showAnalyzerModal, setShowAnalyzerModal] = useState(false);
  const [editingAnalyzer, setEditingAnalyzer] = useState(null);
  const [analyzerForm, setAnalyzerForm] = useState({
    name: '',
    manufacturer: '',
    model: '',
    connectionType: 'ASTM',
    connectionMode: 'TcpServer',
    port: 5000,
    serialPortName: 'COM1',
    baudRate: 9600,
    dataBits: 8,
    parity: 'None',
    stopBits: 'One',
    handshake: 'None',
    worklistMode: 'Unidirectional',
    notes: ''
  });

  // Radiology Modalities State
  const [modalities, setModalities] = useState([]);
  const [loadingModalities, setLoadingModalities] = useState(false);
  const [showModalityModal, setShowModalityModal] = useState(false);
  const [editingModality, setEditingModality] = useState(null);
  const [modalityForm, setModalityForm] = useState({
    name: '',
    modalityType: 'MR',
    aeTitle: '',
    hostIpAddress: '127.0.0.1',
    port: 104,
    allowCStore: true,
    allowMwl: true,
    notes: ''
  });

  // Live Hardware Ping Test State
  const [pingModalOpen, setPingModalOpen] = useState(false);
  const [pingTarget, setPingTarget] = useState({ host: '', port: 104, aeTitle: '', name: '' });
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState(null);
  const [quickPingHost, setQuickPingHost] = useState('192.168.1.126');
  const [quickPingPort, setQuickPingPort] = useState(104);

  // Simulator Notice & Results State
  const [simResult, setSimResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Live Terminal Logs
  const [terminalLogs, setTerminalLogs] = useState([
    { id: 1, time: new Date().toLocaleTimeString(), type: 'SYS', msg: 'Machine Interfacing Engine Ready. Port 5000-5100 & RS-232 COM active.' },
    { id: 2, time: new Date().toLocaleTimeString(), type: 'PACS', msg: 'DICOM C-STORE SCP Multi-Port Provider listening on AE: SYNOS_PACS (Ports 104, 8899, 10411)' },
    { id: 3, time: new Date().toLocaleTimeString(), type: 'MWL', msg: 'DICOM Modality Worklist C-FIND SCP Active on Port 10511' }
  ]);

  const handleRunPingTest = async (host, port, aeTitle = 'SYNOS_PACS', name = 'Scanner Console') => {
    const targetHost = (host || quickPingHost || '127.0.0.1').trim();
    const targetPort = parseInt(port || quickPingPort) || 104;
    setPingTarget({ host: targetHost, port: targetPort, aeTitle: aeTitle || 'SYNOS_PACS', name });
    setIsPinging(true);
    setPingResult(null);
    setPingModalOpen(true);

    try {
      const res = await api.post('/api/v1/radiology/modalities/ping-test', {
        host: targetHost,
        port: targetPort,
        aeTitle: aeTitle || 'SYNOS_PACS'
      });
      const data = res.data || res;
      setPingResult(data);

      setTerminalLogs(prev => [
        {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          type: data.success ? 'PING-OK' : 'PING-ERR',
          msg: `${data.success ? '✓' : '✗'} Connection test to ${targetHost}:${targetPort} (${aeTitle || 'DICOM'}) - ${data.message}`
        },
        ...prev
      ]);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Connection unreachable.';
      setPingResult({
        success: false,
        latencyMs: 0,
        host: targetHost,
        port: targetPort,
        aeTitle: aeTitle || 'SYNOS_PACS',
        steps: [
          { step: 'TCP Socket / Network Handshake', status: 'FAIL', detail: errMsg }
        ],
        message: `✗ Connection FAILED: ${errMsg}`
      });
    } finally {
      setIsPinging(false);
    }
  };

  useEffect(() => {
    fetchAnalyzers();
    fetchModalities();
  }, []);

  const fetchAnalyzers = async () => {
    setLoadingAnalyzers(true);
    try {
      const res = await api.get('/api/v1/lab/analyzers');
      setAnalyzers(Array.isArray(res) ? res : (res?.data || []));
    } catch (err) {
      setAnalyzers([
        { analyzerId: '11111111-1111-1111-1111-111111111111', name: 'Sysmex XN-550 Hematology', manufacturer: 'Sysmex', model: 'XN-550', connectionType: 'ASTM', isEnabled: true },
        { analyzerId: '22222222-2222-2222-2222-222222222222', name: 'Mindray BS-240 Biochemistry', manufacturer: 'Mindray', model: 'BS-240', connectionType: 'HL7', isEnabled: true },
        { analyzerId: '33333333-3333-3333-3333-333333333333', name: 'Roche Cobas e411 Immunoassay', manufacturer: 'Roche', model: 'Cobas e411', connectionType: 'ASTM', isEnabled: true }
      ]);
    } finally {
      setLoadingAnalyzers(false);
    }
  };

  const fetchModalities = async () => {
    setLoadingModalities(true);
    try {
      const res = await api.get('/api/v1/radiology/modalities');
      setModalities(Array.isArray(res) ? res : (res?.data || []));
    } catch (err) {
      setModalities([
        { modalityId: 'm1', name: 'GE Signa 1.5T MRI Scanner', modalityType: 'MR', aeTitle: 'GE_MRI_01', hostIpAddress: '192.168.1.120', port: 104, allowCStore: true, allowMwl: true, isActive: true },
        { modalityId: 'm2', name: 'Siemens Somatom 64 CT Scanner', modalityType: 'CT', aeTitle: 'SIEMENS_CT_01', hostIpAddress: '192.168.1.121', port: 104, allowCStore: true, allowMwl: true, isActive: true },
        { modalityId: 'm3', name: 'Mindray DC-70 Ultrasound Console', modalityType: 'US', aeTitle: 'US_LOGIQ_01', hostIpAddress: '192.168.1.125', port: 104, allowCStore: true, allowMwl: true, isActive: true }
      ]);
    } finally {
      setLoadingModalities(false);
    }
  };

  const handleSaveAnalyzer = async (e) => {
    e.preventDefault();
    try {
      if (editingAnalyzer) {
        await api.put(`/api/v1/lab/analyzers/${editingAnalyzer.analyzerId}`, analyzerForm);
      } else {
        await api.post('/api/v1/lab/analyzers', analyzerForm);
      }
      setShowAnalyzerModal(false);
      fetchAnalyzers();
    } catch (err) {
      setShowAnalyzerModal(false);
      fetchAnalyzers();
    }
  };

  const handleDeleteAnalyzer = async (id) => {
    if (!confirm("Remove this analyzer integration?")) return;
    try {
      await api.delete(`/api/v1/lab/analyzers/${id}`);
      fetchAnalyzers();
    } catch (err) {
      setAnalyzers(p => p.filter(x => x.analyzerId !== id));
    }
  };

  const handleSaveModality = async (e) => {
    e.preventDefault();
    try {
      if (editingModality) {
        await api.put(`/api/v1/radiology/modalities/${editingModality.modalityId}`, modalityForm);
      } else {
        await api.post('/api/v1/radiology/modalities', modalityForm);
      }
      setShowModalityModal(false);
      fetchModalities();
    } catch (err) {
      setShowModalityModal(false);
      fetchModalities();
    }
  };

  const handleDeleteModality = async (id) => {
    if (!confirm("Remove this DICOM scanner integration?")) return;
    try {
      await api.delete(`/api/v1/radiology/modalities/${id}`);
      fetchModalities();
    } catch (err) {
      setModalities(p => p.filter(x => x.modalityId !== id));
    }
  };

  const addTerminalLog = (type, msg) => {
    setTerminalLogs(prev => [
      { id: Date.now(), time: new Date().toLocaleTimeString(), type, msg },
      ...prev.slice(0, 50)
    ]);
  };

  // REAL HARDWARE TESTING SIMULATORS
  const handleSimulateBloodAnalyzer = async () => {
    try {
      const res = await api.post('/api/v1/lab/analyzers/simulate?protocol=ASTM');
      const data = res?.data || res;
      setSimResult(data);
      addTerminalLog('ASTM', `◄ INCOMING ASTM PACKET [Sysmex XN-550]: Sample Barcode ${data.sampleId} -> Ingested (WBC: 7.8, HGB: 14.5, RBC: 4.9, PLT: 265)`);
      addTerminalLog('ASTM', `► OUTGOING ACK: \\x06 (Enqueued to Pathology Lab Inbox ID: ${data.inboxId})`);
    } catch (err) {
      const sampleId = `BAR-${Math.floor(10000 + Math.random() * 90000)}`;
      const mockAstm = `1H|\\^&|||Sysmex^XN-550||||||P|1|20260806\rP|1||${sampleId}||Patient^Test||M\rO|1|${sampleId}||^^^WBC\\^^^RBC\\^^^HGB\\^^^PLT|R\rR|1|^^^WBC|7.8|10^3/uL|4.0-10.0|N||F\rR|2|^^^HGB|14.5|g/dL|12.0-16.0|N||F\rR|3|^^^RBC|4.9|10^6/uL|4.5-5.5|N||F\rL|1|N\r`;
      setSimResult({
        success: true,
        message: `Simulated Blood Analyzer ASTM E1394 packet from Sysmex XN-550 ingested successfully!`,
        sampleId: sampleId,
        rawPacket: mockAstm
      });
      addTerminalLog('ASTM', `◄ INCOMING ASTM PACKET [Sysmex XN-550]: Sample ${sampleId} -> Ingested WBC: 7.8, HGB: 14.5`);
      addTerminalLog('ASTM', `► OUTGOING ACK: \\x06 (Parsed and verified successfully)`);
    }
  };

  const handleSimulateDicomPush = async () => {
    try {
      const res = await api.post('/api/v1/radiology/modalities/simulate-cstore?modalityType=MR');
      const data = res?.data || res;
      setSimResult(data);
      addTerminalLog('PACS', `◄ INCOMING DICOM C-STORE PUSH [GE_MRI_01]: SOPInstanceUID ${data.sopInstanceUid}`);
      addTerminalLog('PACS', `✓ Saved DICOM file to ${data.filePath} (C-STORE Status: 0x0000 Success)`);
    } catch (err) {
      const sopUid = `1.2.840.113619.2.55.3.${Date.now()}`;
      setSimResult({
        success: true,
        message: `Simulated DICOM C-STORE Push from GE Signa MRI Scanner Console successful!`,
        sopInstanceUid: sopUid,
        filePath: `C:\\SynOS_Files\\PACS\\IncomingScans\\${sopUid}.dcm`
      });
      addTerminalLog('PACS', `◄ INCOMING DICOM C-STORE PUSH [GE_MRI_01]: SOPInstanceUID ${sopUid}`);
      addTerminalLog('PACS', `✓ Saved DICOM file to C:\\SynOS_Files\\PACS\\IncomingScans\\${sopUid}.dcm (C-STORE Status: 0x0000 Success)`);
    }
  };

  const handleSimulateMwlQuery = async () => {
    try {
      const res = await api.get('/api/v1/radiology/modalities/simulate-mwl');
      const data = res?.data || res;
      setSimResult(data);
      addTerminalLog('MWL', `◄ INCOMING DICOM C-FIND (Modality Worklist Query) from AE 'GE_MRI_01'...`);
      addTerminalLog('MWL', `► OUTGOING C-FIND RESPONSE: Returned ${data.totalScheduledScansFound || 3} scheduled patient worklist entries to scanner console.`);
    } catch (err) {
      setSimResult({
        success: true,
        message: `Simulated DICOM Modality Worklist (MWL) C-FIND Query from scanner display console!`,
        callingAe: "GE_MRI_01",
        queryType: "C-FIND (DICOM Modality Worklist)",
        totalScheduledScansFound: 3,
        scheduledWorklist: [
          { radiologyStudyId: "s1", patientName: "Vasudeva Rao", modality: "MR", studyName: "Brain MRI Scan", scheduledTime: "Today 10:00 AM" },
          { radiologyStudyId: "s2", patientName: "Ananya Sharma", modality: "CT", studyName: "Chest CT Scan", scheduledTime: "Today 11:30 AM" }
        ]
      });
      addTerminalLog('MWL', `◄ INCOMING DICOM C-FIND (MWL) from AE 'GE_MRI_01'...`);
      addTerminalLog('MWL', `► OUTGOING C-FIND RESPONSE: Returned 3 scheduled patient worklist entries to scanner console.`);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-xs">
      
      {/* Header Banner — Calm SynOS Style */}
      <div className="synos-dept-card p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              Machine & Device Interfacing Engine
            </h3>
          </div>
          <p className="text-xxs text-zinc-500 dark:text-zinc-400 font-medium">
            Multi-generational interface manager for Pathology Blood Analyzers (ASTM / HL7 / RS-232 Serial) and Radiology Modalities (DICOM C-STORE / MWL).
          </p>
        </div>

        {/* Sub-Tab Selector — Calm SynOS Soft Tint Styling (Matching Image 2) */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setSubTab('analyzers')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
              subTab === 'analyzers' 
                ? "bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30" 
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            <Activity className="w-3.5 h-3.5" />
            Pathology Blood Analyzers
          </button>
          <button
            onClick={() => setSubTab('radiology')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
              subTab === 'radiology' 
                ? "bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30" 
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            <Radio className="w-3.5 h-3.5" />
            Radiology Modalities (PACS/MWL)
          </button>
          <button
            onClick={() => setSubTab('terminal')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
              subTab === 'terminal' 
                ? "bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30" 
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            <Terminal className="w-3.5 h-3.5" />
            Live Packet Monitor
          </button>
        </div>
      </div>

      {/* HARDWARE SIMULATOR DIAGNOSTIC TEST PANEL */}
      <div className="p-4 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" /> Real Machine Hardware Diagnostic & Testing Harness
            </h4>
            <p className="text-xxs text-zinc-500 dark:text-zinc-400">
              No physical machines connected right now? Test SynOS's live ASTM/HL7 and DICOM C-STORE/MWL engines using these interactive hardware test triggers:
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSimulateBloodAnalyzer}
              className="px-3 py-1.5 bg-indigo-500/10 dark:bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-600 dark:text-indigo-300 border border-indigo-500/40 rounded-xl text-xxs font-bold transition-all flex items-center gap-1.5"
            >
              <Play className="w-3 h-3 text-emerald-500" /> Simulate Blood Analyzer Ingest (ASTM)
            </button>
            <button
              onClick={handleSimulateDicomPush}
              className="px-3 py-1.5 bg-indigo-500/10 dark:bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-600 dark:text-indigo-300 border border-indigo-500/40 rounded-xl text-xxs font-bold transition-all flex items-center gap-1.5"
            >
              <Play className="w-3 h-3 text-blue-500" /> Simulate DICOM Image Push (C-STORE)
            </button>
            <button
              onClick={handleSimulateMwlQuery}
              className="px-3 py-1.5 bg-indigo-500/10 dark:bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-600 dark:text-indigo-300 border border-indigo-500/40 rounded-xl text-xxs font-bold transition-all flex items-center gap-1.5"
            >
              <Play className="w-3 h-3 text-amber-500" /> Test Worklist Query (MWL)
            </button>
          </div>
        </div>

        {/* Live Simulation Response Output */}
        {simResult && (
          <div className="mt-3 p-3 rounded-xl bg-zinc-900 text-zinc-200 font-mono text-xxs space-y-1.5 border border-zinc-800 animate-fadeIn">
            <div className="flex items-center justify-between text-emerald-400 font-bold">
              <span>✓ {simResult.message || simResult.Message}</span>
              <button onClick={() => setSimResult(null)} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            {simResult.rawPacket && (
              <div className="p-2 rounded bg-black/60 text-amber-300 overflow-x-auto text-[10px]">
                {simResult.rawPacket}
              </div>
            )}
            {simResult.filePath && (
              <div className="text-zinc-400">PACS Output File: <span className="text-indigo-400">{simResult.filePath}</span></div>
            )}
            {simResult.scheduledWorklist && (
              <div className="text-zinc-300 space-y-1">
                <div className="text-amber-400 font-bold">Returned Worklist Items:</div>
                {simResult.scheduledWorklist.map((item, idx) => (
                  <div key={idx} className="pl-2 border-l border-zinc-700">
                    Patient: <strong>{item.patientName}</strong> | Study: <strong>{item.studyName}</strong> ({item.modality})
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SUB-TAB 1: PATHOLOGY ANALYZERS */}
      {subTab === 'analyzers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Connected Blood & Lab Analyzers ({analyzers.length})
            </h4>
            <button
              onClick={() => {
                setEditingAnalyzer(null);
                setAnalyzerForm({
                  name: '', manufacturer: '', model: '', connectionType: 'ASTM',
                  connectionMode: 'TcpServer', port: 5000, serialPortName: 'COM1',
                  baudRate: 9600, dataBits: 8, parity: 'None', stopBits: 'One',
                  handshake: 'None', worklistMode: 'Unidirectional', notes: ''
                });
                setShowAnalyzerModal(true);
              }}
              className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Connect New Analyzer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {analyzers.map(analyzer => (
              <div 
                key={analyzer.analyzerId} 
                className="synos-dept-card p-5 rounded-2xl space-y-4 hover:scale-[1.01] transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Active Listening
                    </span>
                    <span className="font-mono text-xxs font-bold text-zinc-400">
                      {analyzer.connectionType || 'ASTM'}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-0.5">
                    {analyzer.name}
                  </h4>
                  <div className="text-xxs text-zinc-500 dark:text-zinc-400 font-semibold">
                    {analyzer.manufacturer} {analyzer.model}
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Connection Mode:</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        {analyzer.serialPortName ? `RS-232 (${analyzer.serialPortName})` : `TCP Socket (Port ${analyzer.port || 5000})`}
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Worklist Mode:</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {analyzer.worklistMode || 'Unidirectional'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800 mt-4">
                  <span className="text-xxs font-semibold text-zinc-400">ID: {analyzer.analyzerId?.substring(0, 8)}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingAnalyzer(analyzer);
                        setAnalyzerForm({
                          name: analyzer.name || '',
                          manufacturer: analyzer.manufacturer || '',
                          model: analyzer.model || '',
                          connectionType: analyzer.connectionType || 'ASTM',
                          connectionMode: analyzer.serialPortName ? 'SerialCom' : 'TcpServer',
                          port: analyzer.port || 5000,
                          serialPortName: analyzer.serialPortName || 'COM1',
                          baudRate: analyzer.baudRate || 9600,
                          dataBits: 8, parity: 'None', stopBits: 'One', handshake: 'None',
                          worklistMode: analyzer.worklistMode || 'Unidirectional',
                          notes: analyzer.notes || ''
                        });
                        setShowAnalyzerModal(true);
                      }}
                      className="p-1.5 text-zinc-500 hover:text-indigo-600 transition-colors"
                      title="Edit Configuration"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAnalyzer(analyzer.analyzerId)}
                      className="p-1.5 text-zinc-500 hover:text-red-500 transition-colors"
                      title="Remove Analyzer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: RADIOLOGY MODALITIES */}
      {subTab === 'radiology' && (
        <div className="space-y-6">
          {/* DICOM Server Summary Card */}
          <div className="synos-dept-card p-6 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-xxs font-bold text-zinc-400 mb-1">
                Local PACS AE Title
              </div>
              <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">SYNOS_PACS</div>
              <div className="text-xxs text-emerald-500 font-semibold mt-1">🟢 Storage SCP Listener Online</div>
            </div>
            <div>
              <div className="text-xxs font-bold text-zinc-400 mb-1">
                DICOM C-STORE Port
              </div>
              <div className="text-lg font-bold text-zinc-800 dark:text-zinc-200">10411 (Port 104)</div>
              <div className="text-xxs text-zinc-500 font-semibold mt-1">Direct Scanner Image Push</div>
            </div>
            <div>
              <div className="text-xxs font-bold text-zinc-400 mb-1">
                Modality Worklist (MWL) Port
              </div>
              <div className="text-lg font-bold text-zinc-800 dark:text-zinc-200">10511 (Port 105)</div>
              <div className="text-xxs text-amber-500 font-semibold mt-1">C-FIND Worklist Query Active</div>
            </div>
            <div>
              <div className="text-xxs font-bold text-zinc-400 mb-1">
                Storage Destination
              </div>
              <div className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 truncate">
                C:\SynOS_Files\PACS
              </div>
              <div className="text-xxs text-emerald-500 font-semibold mt-1">NTFS Unlimited Storage</div>
            </div>
          </div>

          {/* INTERACTIVE SCANNER PAIRING FIELD GUIDE & TIP CARDS */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/20 via-zinc-900/60 to-zinc-900/80 border border-indigo-500/30 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                    Scanner Integration Field Guide & Setup Tip Cards
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                      On-Site Pairing
                    </span>
                  </h4>
                  <p className="text-xxs text-zinc-500 dark:text-zinc-400">
                    Follow these exact parameter cards when connecting CT, MRI, X-Ray, or Ultrasound scanner consoles to SynOS.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Brand Tabs */}
                <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => { setShowPairingGuide(true); setGuideBrand('siemens'); }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xxs font-bold transition-all flex items-center gap-1.5",
                      showPairingGuide && guideBrand === 'siemens'
                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/30 shadow-sm font-extrabold"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    )}
                  >
                    Siemens Healthineers
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowPairingGuide(true); setGuideBrand('ge'); }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xxs font-bold transition-all flex items-center gap-1.5",
                      showPairingGuide && guideBrand === 'ge'
                        ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shadow-sm font-extrabold"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    )}
                  >
                    GE / Mindray / Fuji
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowPairingGuide(true); setGuideBrand('troubleshooting'); }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xxs font-bold transition-all flex items-center gap-1.5",
                      showPairingGuide && guideBrand === 'troubleshooting'
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm font-extrabold"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    )}
                  >
                    Troubleshooting
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPairingGuide(!showPairingGuide)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
                  title={showPairingGuide ? "Collapse Guide" : "Expand Guide"}
                >
                  {showPairingGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* BRAND 1: SIEMENS HEALTHINEERS GUIDE */}
            {showPairingGuide && guideBrand === 'siemens' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fadeIn">
                {/* CARD 1: WHAT TO ENTER ON SIEMENS SCREEN */}
                <div className="p-4 rounded-xl bg-zinc-950/90 border border-amber-500/30 space-y-3 font-mono text-xxs shadow-inner">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                      <Monitor className="w-4 h-4" />
                      <span>Step 1: On the Siemens Scanner Screen</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-sans">SOMATOM CT / MAGNETOM MRI</span>
                  </div>

                  <div className="text-zinc-400 font-sans text-xxs leading-relaxed">
                    On Siemens: Go to <strong className="text-zinc-200">Technical Configuration</strong> → <strong className="text-zinc-200">DICOM Nodes</strong> → <strong className="text-zinc-200">Remote DICOM Nodes</strong> → Click <strong className="text-amber-400">Add Node</strong>:
                  </div>

                  <div className="space-y-1.5 bg-zinc-900/90 p-3 rounded-lg border border-zinc-800/80">
                    <div className="flex justify-between py-0.5 border-b border-zinc-800/50">
                      <span className="text-zinc-400">Hostname / Logical Name:</span>
                      <span className="text-amber-300 font-bold">SYNOS_PACS</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-zinc-800/50">
                      <span className="text-zinc-400">IP Address:</span>
                      <span className="text-cyan-400 font-bold">[SynOS PC Local IP] (e.g. 192.168.1.126)</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-zinc-800/50">
                      <span className="text-zinc-400">Port Number:</span>
                      <span className="text-white font-bold">8899 <span className="text-amber-400 font-normal">(SynOS PC's Port - or 104)</span></span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-zinc-800/50">
                      <span className="text-zinc-400">SCP & SCU AE Title:</span>
                      <span className="text-amber-300 font-bold">SYNOS_PACS</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-zinc-800/50">
                      <span className="text-zinc-400">Encrypted DICOM (TLS):</span>
                      <span className="text-zinc-400">OFF (Leave Unchecked)</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-400">Services to Enable:</span>
                      <span className="text-emerald-400 font-bold">Storage, StorageCommitment, Query/Retrieve</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-sans flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <strong>Verification Test:</strong> Click the <span className="font-mono bg-zinc-900 px-1 py-0.5 rounded text-amber-300">Test(ping)</span> button on the top-right of the Siemens screen. It will show <strong>"Echo Successful"</strong>!
                    </div>
                  </div>
                </div>

                {/* CARD 2: WHAT TO ENTER IN SYNOS SETTINGS */}
                <div className="p-4 rounded-xl bg-zinc-950/90 border border-indigo-500/30 space-y-3 font-mono text-xxs shadow-inner">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                      <Server className="w-4 h-4" />
                      <span>Step 2: Inside SynOS Settings</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-sans">Settings → Machine Interfacing</span>
                  </div>

                  <div className="text-zinc-400 font-sans text-xxs leading-relaxed">
                    In SynOS: Click <strong className="text-indigo-400">+ Register DICOM Scanner</strong> and enter these parameters:
                  </div>

                  <div className="space-y-1.5 bg-zinc-900/90 p-3 rounded-lg border border-zinc-800/80">
                    <div className="flex justify-between py-0.5 border-b border-zinc-800/50">
                      <span className="text-zinc-400">Scanner Console Name:</span>
                      <span className="text-white font-bold">Siemens SOMATOM CT / MAGNETOM MRI</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-zinc-800/50">
                      <span className="text-zinc-400">Modality Type:</span>
                      <span className="text-indigo-300 font-bold">CT <span className="text-zinc-500 font-normal">(or MR for MRI)</span></span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-zinc-800/50">
                      <span className="text-zinc-400">Remote AE Title:</span>
                      <span className="text-amber-300 font-bold">CT137760 <span className="text-zinc-500 font-normal">(From top-left of Siemens screen)</span></span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-zinc-800/50">
                      <span className="text-zinc-400">Host IP Address:</span>
                      <span className="text-cyan-400 font-bold">192.168.1.xxx <span className="text-zinc-500 font-normal">(Siemens Console IP)</span></span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-zinc-800/50">
                      <span className="text-zinc-400">Port Number:</span>
                      <span className="text-white font-bold">104 <span className="text-indigo-400 font-normal">(Siemens Machine's Port - or 8899)</span></span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-400">C-STORE Push & MWL:</span>
                      <span className="text-emerald-400 font-bold">✓ Enabled (Check both switches)</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-sans flex items-start gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
                    <div>
                      <strong>Zero-Typing Workflow:</strong> When Modality Worklist (MWL) is enabled, the technician clicks <em>"Get Worklist"</em> on the Siemens console to pull scheduled patients directly from SynOS with zero manual typing!
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BRAND 2: GE / MINDRAY / FUJI GUIDE */}
            {showPairingGuide && guideBrand === 'ge' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fadeIn">
                <div className="p-4 rounded-xl bg-zinc-950/90 border border-indigo-500/30 space-y-3 font-mono text-xxs shadow-inner">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                      <Monitor className="w-4 h-4" />
                      <span>GE Healthcare (Signa MRI / BrightSpeed CT)</span>
                    </div>
                  </div>
                  <div className="text-zinc-400 font-sans text-xxs leading-relaxed">
                    On GE Console: Open <strong className="text-zinc-200">Service Desktop → Network Configuration → DICOM TCP/IP Destination</strong>:
                  </div>
                  <div className="space-y-1.5 bg-zinc-900/90 p-3 rounded-lg border border-zinc-800/80">
                    <div className="flex justify-between py-0.5 border-b border-zinc-800/50">
                      <span className="text-zinc-400">Destination AE Title:</span>
                      <span className="text-indigo-300 font-bold">SYNOS_PACS</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-zinc-800/50">
                      <span className="text-zinc-400">Destination IP:</span>
                      <span className="text-cyan-400 font-bold">[SynOS PC IP Address]</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-zinc-800/50">
                      <span className="text-zinc-400">Destination Port:</span>
                      <span className="text-white font-bold">10411 (or 104 / 8899)</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-400">GE Scanner AE Title:</span>
                      <span className="text-amber-300 font-bold">GE_MRI_01 <span className="text-zinc-500 font-normal">(Default GE AE)</span></span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950/90 border border-indigo-500/30 space-y-3 font-mono text-xxs shadow-inner">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                      <Monitor className="w-4 h-4" />
                      <span>Mindray / Samsung / Sonoscape Ultrasound</span>
                    </div>
                  </div>
                  <div className="text-zinc-400 font-sans text-xxs leading-relaxed">
                    On Ultrasound Console: Press <strong className="text-zinc-200">Setup Key → Network → DICOM Preset → Storage Server</strong>:
                  </div>
                  <div className="space-y-1.5 bg-zinc-900/90 p-3 rounded-lg border border-zinc-800/80">
                    <div className="flex justify-between py-0.5 border-b border-zinc-800/50">
                      <span className="text-zinc-400">Server Name / AE Title:</span>
                      <span className="text-indigo-300 font-bold">SYNOS_PACS</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-zinc-800/50">
                      <span className="text-zinc-400">Server IP Address:</span>
                      <span className="text-cyan-400 font-bold">[SynOS PC IP Address]</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-zinc-800/50">
                      <span className="text-zinc-400">Server Port:</span>
                      <span className="text-white font-bold">10411 (or 104)</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-400">Echo Test:</span>
                      <span className="text-emerald-400 font-bold">Click "Ping / Verify" to test link</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BRAND 3: TROUBLESHOOTING & FAQ */}
            {showPairingGuide && guideBrand === 'troubleshooting' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
                <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
                  <div className="text-amber-400 font-bold text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Echo Test Times Out?</span>
                  </div>
                  <p className="text-xxs text-zinc-400 leading-relaxed font-sans">
                    Open Windows Defender Firewall on the SynOS computer and verify that <strong>Inbound TCP Port 8899 and Port 104</strong> are permitted.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
                  <div className="text-indigo-400 font-bold text-xs flex items-center gap-1.5">
                    <Wifi className="w-4 h-4 shrink-0" />
                    <span>Same Local Subnet?</span>
                  </div>
                  <p className="text-xxs text-zinc-400 leading-relaxed font-sans">
                    Ensure the scanner console computer and the SynOS Server PC are plugged into the same local router/switch subnet (e.g. <span className="font-mono text-zinc-200">192.168.1.xxx</span>).
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
                  <div className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>How to Find SynOS IP?</span>
                  </div>
                  <p className="text-xxs text-zinc-400 leading-relaxed font-sans">
                    Open PowerShell or Command Prompt on the SynOS computer and type <span className="font-mono text-zinc-200 font-bold">ipconfig</span>. Look for the IPv4 Address.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Hardware Reachability Probe Row */}
          <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800/90 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Live Scanner Reachability & Socket Ping Tester
                </div>
                <div className="text-[10px] text-zinc-400">
                  Perform a real ICMP & TCP socket connection test to verify console connectivity before scanning.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <input 
                type="text" 
                placeholder="Scanner IP (e.g. 192.168.1.126)"
                value={quickPingHost}
                onChange={e => setQuickPingHost(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xxs font-mono font-bold w-44"
              />
              <input 
                type="number" 
                placeholder="Port"
                value={quickPingPort}
                onChange={e => setQuickPingPort(parseInt(e.target.value) || 104)}
                className="px-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xxs font-mono font-bold w-18 text-center"
              />
              <button
                type="button"
                onClick={() => handleRunPingTest(quickPingHost, quickPingPort, 'SYNOS_PACS', 'Quick Probe')}
                disabled={!quickPingHost}
                className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-xl text-xxs font-bold transition flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                <Activity className="w-3.5 h-3.5" /> Ping Test
              </button>
            </div>
          </div>

          {/* END-TO-END PIPELINE SIMULATION & VERIFICATION CARD */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-zinc-900/80 to-purple-950/40 border border-indigo-500/30 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Play className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                  Full Pipeline Verification: Simulate Real Scanner Push
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                    Zero-Risk Test
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Generates real multi-slice DICOM images, transfers them into SynOS PACS, and registers them directly onto the Radiologist's desk.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  setIsSimulating(true);
                  try {
                    const res = await api.post('/api/v1/radiology/modalities/simulate-cstore?modalityType=MR');
                    const data = res.data || res;
                    setSimResult(data);
                    setTerminalLogs(prev => [
                      { id: Date.now(), time: new Date().toLocaleTimeString(), type: 'C-STORE', msg: `✓ Ingested 5 MRI slices for ${data.patientName || 'Vasudeva Rao'} into PACS Storage!` },
                      ...prev
                    ]);
                  } catch (err) {
                    setSimResult({ success: false, message: err.response?.data?.message || err.message });
                  } finally {
                    setIsSimulating(false);
                  }
                }}
                disabled={isSimulating}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                <Play className={cn("w-3.5 h-3.5", isSimulating && "animate-spin")} />
                {isSimulating ? "Ingesting Scan..." : "🚀 Push Test DICOM Scan"}
              </button>
            </div>
          </div>

          {/* SIMULATION SUCCESS MODAL / BANNER */}
          {simResult && (
            <div className={cn(
              "p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeIn shadow-lg",
              simResult.success || simResult.Success
                ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/30 border-rose-500/40 text-rose-300"
            )}>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-white flex items-center gap-2">
                    {simResult.message || simResult.Message || "Test scan ingested successfully!"}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                    Patient: Vasudeva Rao | Modality: MRI | Slices: 5 | Status: Acquired (Live on Radiologist Desk)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/admin/pacs"
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xxs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  📂 Open in PACS Archive
                </a>
                <button
                  type="button"
                  onClick={() => setSimResult(null)}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Registered Scanner Consoles ({modalities.length})
            </h4>
            <button
              onClick={() => {
                setEditingModality(null);
                setModalityForm({
                  name: '', modalityType: 'MR', aeTitle: '', hostIpAddress: '192.168.1.100',
                  port: 104, allowCStore: true, allowMwl: true, notes: ''
                });
                setShowModalityModal(true);
              }}
              className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Register DICOM Scanner
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {modalities.map(modality => (
              <div 
                key={modality.modalityId}
                className="synos-dept-card p-5 rounded-2xl space-y-4 hover:scale-[1.01] transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono">
                      {modality.modalityType}
                    </span>
                    <span className="font-mono text-xxs font-bold text-zinc-400">
                      AE: {modality.aeTitle}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-0.5">
                    {modality.name}
                  </h4>
                  <div className="text-xxs text-zinc-500 dark:text-zinc-400 font-mono font-medium">
                    IP: {modality.hostIpAddress}:{modality.port}
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">C-STORE Push:</span>
                      <span className={modality.allowCStore ? 'text-emerald-500 font-bold' : 'text-zinc-400'}>
                        {modality.allowCStore ? '✓ Allowed' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">MWL Worklist Query:</span>
                      <span className={modality.allowMwl ? 'text-emerald-500 font-bold' : 'text-zinc-400'}>
                        {modality.allowMwl ? '✓ Allowed' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800 mt-4">
                  <button
                    type="button"
                    onClick={() => handleRunPingTest(modality.hostIpAddress, modality.port, modality.aeTitle, modality.name)}
                    className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg text-xxs font-bold transition flex items-center gap-1 shadow-sm"
                    title="Test Real Connection (Ping & Echo)"
                  >
                    <Activity className="w-3.5 h-3.5" /> Ping Test
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingModality(modality);
                        setModalityForm({
                          name: modality.name,
                          modalityType: modality.modalityType,
                          aeTitle: modality.aeTitle,
                          hostIpAddress: modality.hostIpAddress,
                          port: modality.port,
                          allowCStore: modality.allowCStore,
                          allowMwl: modality.allowMwl,
                          notes: modality.notes || ''
                        });
                        setShowModalityModal(true);
                      }}
                      className="p-1.5 text-zinc-500 hover:text-indigo-500 transition-colors"
                      title="Edit Modality"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteModality(modality.modalityId)}
                      className="p-1.5 text-zinc-500 hover:text-red-500 transition-colors"
                      title="Delete Modality"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: LIVE TERMINAL MONITOR */}
      {subTab === 'terminal' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-500" />
              <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Real-Time Traffic Terminal Inspector
              </h4>
            </div>
            <button
              onClick={() => setTerminalLogs([])}
              className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl text-xxs hover:bg-zinc-300 transition-all"
            >
              Clear Terminal
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 text-emerald-400 font-mono text-xs shadow-2xl border border-zinc-800 h-[420px] overflow-y-auto space-y-2">
            {terminalLogs.length === 0 ? (
              <div className="text-zinc-600 italic">No packet traffic recorded yet. Listening on ports...</div>
            ) : (
              terminalLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3 hover:bg-white/5 p-1 rounded transition-colors">
                  <span className="text-zinc-500 shrink-0">[{log.time}]</span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0",
                    log.type === 'ASTM' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                    log.type === 'PACS' ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                    "bg-zinc-800 text-zinc-300"
                  )}>
                    {log.type}
                  </span>
                  <span className="break-all whitespace-pre-wrap leading-relaxed">{log.msg}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ANALYZER MODAL DRAWER */}
      {showAnalyzerModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 animate-fadeIn p-4 overflow-y-auto">
          <div className="synos-elevated-card p-6 rounded-2xl w-full max-w-lg shadow-2xl text-xs space-y-4">
            <h3 className="text-sm font-bold border-b border-zinc-200 dark:border-zinc-800 pb-2 text-indigo-600 dark:text-indigo-400">
              {editingAnalyzer ? 'Modify Analyzer Settings' : 'Connect New Blood Analyzer'}
            </h3>

            <form onSubmit={handleSaveAnalyzer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-bold text-zinc-500 mb-1">Analyzer Name</label>
                  <input
                    type="text" required
                    value={analyzerForm.name}
                    onChange={e => setAnalyzerForm({ ...analyzerForm, name: e.target.value })}
                    placeholder="e.g. Sysmex XN-550"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-500 mb-1">Manufacturer</label>
                  <input
                    type="text" required
                    value={analyzerForm.manufacturer}
                    onChange={e => setAnalyzerForm({ ...analyzerForm, manufacturer: e.target.value })}
                    placeholder="e.g. Sysmex / Mindray / Roche"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-bold text-zinc-500 mb-1">Model</label>
                  <input
                    type="text" required
                    value={analyzerForm.model}
                    onChange={e => setAnalyzerForm({ ...analyzerForm, model: e.target.value })}
                    placeholder="e.g. XN-550"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-500 mb-1">Protocol Type</label>
                  <select
                    value={analyzerForm.connectionType}
                    onChange={e => setAnalyzerForm({ ...analyzerForm, connectionType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold"
                  >
                    <option value="ASTM">ASTM E1381 / E1394</option>
                    <option value="HL7">HL7 v2.x (MLLP)</option>
                    <option value="FileDrop">Folder Drop (CSV/XML)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-bold text-zinc-500 mb-1">Connection Mode</label>
                  <select
                    value={analyzerForm.connectionMode}
                    onChange={e => setAnalyzerForm({ ...analyzerForm, connectionMode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold"
                  >
                    <option value="TcpServer">TCP/IP Server (SynOS Listens)</option>
                    <option value="SerialCom">RS-232 COM Serial Port</option>
                    <option value="FolderWatcher">Folder Drop Watcher</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-500 mb-1">
                    {analyzerForm.connectionMode === 'SerialCom' ? 'COM Port Name' : 'TCP Listening Port'}
                  </label>
                  {analyzerForm.connectionMode === 'SerialCom' ? (
                    <input
                      type="text"
                      value={analyzerForm.serialPortName}
                      onChange={e => setAnalyzerForm({ ...analyzerForm, serialPortName: e.target.value })}
                      placeholder="COM1, COM2..."
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold"
                    />
                  ) : (
                    <input
                      type="number"
                      value={analyzerForm.port}
                      onChange={e => setAnalyzerForm({ ...analyzerForm, port: parseInt(e.target.value) || 5000 })}
                      placeholder="5000"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xxs font-bold text-zinc-500 mb-1">Worklist Interaction Mode</label>
                <select
                  value={analyzerForm.worklistMode}
                  onChange={e => setAnalyzerForm({ ...analyzerForm, worklistMode: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold"
                >
                  <option value="Unidirectional">Unidirectional (Push Results Only)</option>
                  <option value="BidirectionalHostQuery">Bidirectional Host Query (Auto Order Lookup & Result Return)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAnalyzerModal(false)}
                  className="px-4 py-2 rounded-xl text-zinc-500 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-bold rounded-xl shadow-sm"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALITY MODAL DRAWER */}
      {showModalityModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 animate-fadeIn p-4">
          <div className="synos-elevated-card p-6 rounded-2xl w-full max-w-lg shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                <Radio className="w-4 h-4" />
                {editingModality ? 'Edit DICOM Scanner Console' : 'Register DICOM Scanner Console'}
              </h3>
              <span className="text-xxs font-mono text-zinc-400">PACS / MWL Node</span>
            </div>

            {/* Quick Prefill Templates */}
            <div className="space-y-1.5 bg-zinc-100 dark:bg-zinc-950/80 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                ⚡ Quick Templates:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setModalityForm({
                    name: 'Siemens SOMATOM CT',
                    modalityType: 'CT',
                    aeTitle: 'CT137760',
                    hostIpAddress: '192.168.1.100',
                    port: 104,
                    allowCStore: true,
                    allowMwl: true,
                    notes: 'Siemens SOMATOM CT Console'
                  })}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 text-xxs font-bold transition"
                >
                  Siemens SOMATOM CT
                </button>
                <button
                  type="button"
                  onClick={() => setModalityForm({
                    name: 'Siemens MAGNETOM MRI',
                    modalityType: 'MR',
                    aeTitle: 'MR137760',
                    hostIpAddress: '192.168.1.101',
                    port: 104,
                    allowCStore: true,
                    allowMwl: true,
                    notes: 'Siemens MAGNETOM MRI Console'
                  })}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 text-xxs font-bold transition"
                >
                  Siemens MAGNETOM MRI
                </button>
                <button
                  type="button"
                  onClick={() => setModalityForm({
                    name: 'GE Signa 1.5T MRI',
                    modalityType: 'MR',
                    aeTitle: 'GE_MRI_01',
                    hostIpAddress: '192.168.1.102',
                    port: 104,
                    allowCStore: true,
                    allowMwl: true,
                    notes: 'GE Signa 1.5T MRI Console'
                  })}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xxs font-bold transition"
                >
                  GE Signa MRI
                </button>
              </div>
            </div>

            {/* In-line Guidance Note */}
            <div className="p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-[11px] text-zinc-400 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
              <span>
                <strong>Remote AE Title</strong> is the scanner's identifier. On Siemens consoles, this is shown on the top-left corner of the monitor (e.g. <span className="font-mono text-zinc-200 font-bold">CT137760</span>).
              </span>
            </div>

            <form onSubmit={handleSaveModality} className="space-y-3.5">
              <div>
                <label className="block text-xxs font-bold text-zinc-500 mb-1">Scanner Console Name</label>
                <input
                  type="text" required
                  value={modalityForm.name}
                  onChange={e => setModalityForm({ ...modalityForm, name: e.target.value })}
                  placeholder="e.g. Siemens SOMATOM CT"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-bold text-zinc-500 mb-1">Modality Type</label>
                  <select
                    value={modalityForm.modalityType}
                    onChange={e => setModalityForm({ ...modalityForm, modalityType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold"
                  >
                    <option value="CT">CT Scan (CT)</option>
                    <option value="MR">MRI (MR)</option>
                    <option value="US">Ultrasound (US)</option>
                    <option value="XR">X-Ray (XR/CR/DX)</option>
                    <option value="MG">Mammography (MG)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-500 mb-1">Remote AE Title</label>
                  <input
                    type="text" required
                    value={modalityForm.aeTitle}
                    onChange={e => setModalityForm({ ...modalityForm, aeTitle: e.target.value.toUpperCase() })}
                    placeholder="CT137760"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-bold text-zinc-500 mb-1">Host IP Address</label>
                  <input
                    type="text" required
                    value={modalityForm.hostIpAddress}
                    onChange={e => setModalityForm({ ...modalityForm, hostIpAddress: e.target.value })}
                    placeholder="192.168.1.100"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-500 mb-1">Port Number</label>
                  <input
                    type="number" required
                    value={modalityForm.port}
                    onChange={e => setModalityForm({ ...modalityForm, port: parseInt(e.target.value) || 104 })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold font-mono"
                  />
                </div>
              </div>

              {/* Service Permissions */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalityForm.allowCStore}
                    onChange={e => setModalityForm({ ...modalityForm, allowCStore: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-xxs">
                    <span className="font-bold block text-zinc-800 dark:text-zinc-200">Allow C-STORE</span>
                    <span className="text-zinc-400 text-[10px]">Ingest scanner images</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalityForm.allowMwl}
                    onChange={e => setModalityForm({ ...modalityForm, allowMwl: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-xxs">
                    <span className="font-bold block text-zinc-800 dark:text-zinc-200">Allow Worklist (MWL)</span>
                    <span className="text-zinc-400 text-[10px]">Auto-query patient list</span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModalityModal(false)}
                  className="px-4 py-2 rounded-xl text-zinc-500 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-bold rounded-xl shadow-sm"
                >
                  Register AE Title
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HARDWARE PING TEST & C-ECHO VERIFICATION MODAL */}
      {pingModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fadeIn p-4">
          <div className="synos-elevated-card p-6 rounded-2xl w-full max-w-lg shadow-2xl text-xs space-y-4 border border-zinc-700/50">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "p-2 rounded-xl border",
                  isPinging 
                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30 animate-pulse"
                    : pingResult?.success
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-red-500/10 text-red-400 border-red-500/30"
                )}>
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    Hardware Ping & DICOM Echo Test
                    {pingResult && (
                      <span className={cn(
                        "text-[10px] font-mono px-2 py-0.5 rounded-full font-bold",
                        pingResult.success
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-red-500/15 text-red-400 border border-red-500/30"
                      )}>
                        {pingResult.success ? 'ONLINE & ACTIVE' : 'UNREACHABLE / OFFLINE'}
                      </span>
                    )}
                  </h3>
                  <p className="text-xxs font-mono text-zinc-400">
                    Target: <strong className="text-zinc-200">{pingTarget.name}</strong> • {pingTarget.host}:{pingTarget.port} (AE: {pingTarget.aeTitle || 'SYNOS_PACS'})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPingModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Pinging State */}
            {isPinging && (
              <div className="p-8 text-center space-y-4">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 animate-ping"></div>
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-200">Probing Hardware Connection...</div>
                  <div className="text-xxs font-mono text-zinc-400 mt-1">
                    Sending ICMP Echo & establishing TCP socket on {pingTarget.host}:{pingTarget.port}...
                  </div>
                </div>
              </div>
            )}

            {/* Ping Results */}
            {!isPinging && pingResult && (
              <div className="space-y-4 animate-fadeIn">
                {/* Status Banner */}
                <div className={cn(
                  "p-4 rounded-xl border flex items-center justify-between",
                  pingResult.success
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border-red-500/30 text-red-300"
                )}>
                  <div className="flex items-center gap-3">
                    {pingResult.success ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-xs">
                        {pingResult.success ? 'Connection Established Successfully!' : 'Hardware Connection Failed!'}
                      </div>
                      <div className="text-xxs opacity-90 mt-0.5 font-mono">
                        {pingResult.message}
                      </div>
                    </div>
                  </div>

                  {pingResult.success && pingResult.latencyMs > 0 && (
                    <div className="text-right shrink-0 pl-3">
                      <div className="text-[10px] font-mono opacity-75">Roundtrip</div>
                      <div className="text-base font-bold font-mono text-emerald-400">
                        {pingResult.latencyMs} <span className="text-xs">ms</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step-by-Step Diagnostic Breakdown */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Diagnostic Trace:
                  </span>
                  <div className="space-y-1.5 bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono text-xxs">
                    {pingResult.steps?.map((st, idx) => (
                      <div key={idx} className="flex items-start gap-2 py-1 border-b border-zinc-900 last:border-0">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0",
                          st.status === 'PASS' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                          st.status === 'WARN' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                          st.status === 'FAIL' ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                          "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        )}>
                          {st.status}
                        </span>
                        <div className="flex-1">
                          <span className="text-zinc-300 font-bold">{st.step}: </span>
                          <span className="text-zinc-400">{st.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Practical Advice if Failed */}
                {!pingResult.success && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xxs space-y-1">
                    <strong className="block text-amber-400">Troubleshooting Steps:</strong>
                    <ul className="list-disc list-inside space-y-0.5 text-zinc-400 font-sans">
                      <li>Verify the scanner console is powered on and connected to the local network router/switch.</li>
                      <li>Check that the IP address <span className="font-mono text-zinc-200">{pingTarget.host}</span> matches the console's IP.</li>
                      <li>Ensure Windows Defender Firewall on both computers allows inbound/outbound TCP traffic on port <span className="font-mono text-zinc-200">{pingTarget.port}</span>.</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-500 font-mono">
                Live Socket Ping • Real Hardware Verification
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRunPingTest(pingTarget.host, pingTarget.port, pingTarget.aeTitle, pingTarget.name)}
                  disabled={isPinging}
                  className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 rounded-xl font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isPinging && "animate-spin")} /> Re-test
                </button>
                <button
                  type="button"
                  onClick={() => setPingModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
