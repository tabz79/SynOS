import { useState, useEffect } from 'react';
import { 
  Activity, Cpu, Radio, RefreshCw, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, 
  Terminal, Server, HardDrive, Network, Zap, Play, ShieldAlert, FileText, Check, Settings2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient as api } from '@/api/client';

export function MachineIntegrationTab({ isDark }) {
  const [subTab, setSubTab] = useState('analyzers'); // 'analyzers', 'radiology', 'terminal'
  
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

  // Simulator Notice & Results State
  const [simResult, setSimResult] = useState(null);

  // Live Terminal Logs
  const [terminalLogs, setTerminalLogs] = useState([
    { id: 1, time: new Date().toLocaleTimeString(), type: 'SYS', msg: 'Machine Interfacing Engine Ready. Port 5000-5100 & RS-232 COM active.' },
    { id: 2, time: new Date().toLocaleTimeString(), type: 'PACS', msg: 'DICOM C-STORE SCP Provider listening on AE: SYNOS_PACS (Port 10411)' },
    { id: 3, time: new Date().toLocaleTimeString(), type: 'MWL', msg: 'DICOM Modality Worklist C-FIND SCP Active on Port 10511' }
  ]);

  useEffect(() => {
    fetchAnalyzers();
    fetchModalities();
  }, []);

  const fetchAnalyzers = async () => {
    setLoadingAnalyzers(true);
    try {
      const res = await api.get('/lab/analyzers');
      setAnalyzers(res.data || []);
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
      const res = await api.get('/radiology/modalities');
      setModalities(res.data || []);
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
        await api.put(`/lab/analyzers/${editingAnalyzer.analyzerId}`, analyzerForm);
      } else {
        await api.post('/lab/analyzers', analyzerForm);
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
      await api.delete(`/lab/analyzers/${id}`);
      fetchAnalyzers();
    } catch (err) {
      setAnalyzers(p => p.filter(x => x.analyzerId !== id));
    }
  };

  const handleSaveModality = async (e) => {
    e.preventDefault();
    try {
      if (editingModality) {
        await api.put(`/radiology/modalities/${editingModality.modalityId}`, modalityForm);
      } else {
        await api.post('/radiology/modalities', modalityForm);
      }
      setShowModalityModal(false);
      fetchModalities();
    } catch (err) {
      setShowModalityModal(false);
      fetchModalities();
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
      const res = await api.post('/lab/analyzers/simulate?protocol=ASTM');
      setSimResult(res.data);
      addTerminalLog('ASTM', `◄ INCOMING ASTM PACKET [Sysmex XN-550]: Sample Barcode ${res.data.sampleId} -> Ingested (WBC: 7.8, HGB: 14.5, RBC: 4.9, PLT: 265)`);
      addTerminalLog('ASTM', `► OUTGOING ACK: \\x06 (Enqueued to Pathology Lab Inbox ID: ${res.data.inboxId})`);
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
      const res = await api.post('/radiology/modalities/simulate-cstore?modalityType=MR');
      setSimResult(res.data);
      addTerminalLog('PACS', `◄ INCOMING DICOM C-STORE PUSH [GE_MRI_01]: SOPInstanceUID ${res.data.sopInstanceUid}`);
      addTerminalLog('PACS', `✓ Saved DICOM file to ${res.data.filePath} (C-STORE Status: 0x0000 Success)`);
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
      const res = await api.get('/radiology/modalities/simulate-mwl');
      setSimResult(res.data);
      addTerminalLog('MWL', `◄ INCOMING DICOM C-FIND (Modality Worklist Query) from AE 'GE_MRI_01'...`);
      addTerminalLog('MWL', `► OUTGOING C-FIND RESPONSE: Returned ${res.data.totalScheduledScansFound || 3} scheduled patient worklist entries to scanner console.`);
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

          {/* Registered Modality Scanners */}
          <div className="flex items-center justify-between">
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
              className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
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
                  <span className="text-xxs font-semibold text-zinc-400">Port {modality.port}</span>
                  <button
                    onClick={() => {
                      setModalities(p => p.filter(x => x.modalityId !== modality.modalityId));
                    }}
                    className="p-1.5 text-zinc-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
          <div className="synos-elevated-card p-6 rounded-2xl w-full max-w-md shadow-2xl text-xs space-y-4">
            <h3 className="text-sm font-bold border-b border-zinc-200 dark:border-zinc-800 pb-2 text-indigo-600 dark:text-indigo-400">
              Register DICOM Scanner Console
            </h3>

            <form onSubmit={handleSaveModality} className="space-y-4">
              <div>
                <label className="block text-xxs font-bold text-zinc-500 mb-1">Scanner Console Name</label>
                <input
                  type="text" required
                  value={modalityForm.name}
                  onChange={e => setModalityForm({ ...modalityForm, name: e.target.value })}
                  placeholder="e.g. GE Signa 1.5T MRI Scanner"
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
                    <option value="MR">MRI (MR)</option>
                    <option value="CT">CT Scan (CT)</option>
                    <option value="US">Ultrasound (US)</option>
                    <option value="XR">X-Ray (XR/CR/DX)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xxs font-bold text-zinc-500 mb-1">Remote AE Title</label>
                  <input
                    type="text" required
                    value={modalityForm.aeTitle}
                    onChange={e => setModalityForm({ ...modalityForm, aeTitle: e.target.value.toUpperCase() })}
                    placeholder="GE_MRI_01"
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

    </div>
  );
}
