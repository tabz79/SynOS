import React, { useState, useEffect } from 'react';
import { 
  fetchReleases, 
  uploadReleasePackage, 
  publishRelease, 
  pauseRelease, 
  resumeRelease, 
  cancelRelease, 
  fetchDeployments,
  fetchReleaseEligibility,
  ReleaseViewModel,
  DeploymentViewModel,
  EligibilityResponse
} from '../../repositories/controlTowerRepository';

const ReleaseManagerTab: React.FC = () => {
  const [releases, setReleases] = useState<ReleaseViewModel[]>([]);
  const [deployments, setDeployments] = useState<DeploymentViewModel[]>([]);
  const [selectedRelease, setSelectedRelease] = useState<ReleaseViewModel | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
  const [expandedLabId, setExpandedLabId] = useState<string | null>(null);
  
  const [releaseNotes, setReleaseNotes] = useState('');
  const [rolloutRing, setRolloutRing] = useState<'Canary' | 'Early' | 'Production'>('Canary');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [canaryPercentage, setCanaryPercentage] = useState(10);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedDeploymentId, setExpandedDeploymentId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const loadData = async () => {
    try {
      const rels = await fetchReleases();
      setReleases(rels);
      
      let activeRelease = selectedRelease;
      if (rels.length > 0) {
        if (selectedRelease) {
          const matched = rels.find(r => r.id === selectedRelease.id);
          activeRelease = matched || rels[0];
        } else {
          activeRelease = rels[0];
        }
        setSelectedRelease(activeRelease);
      } else {
        setSelectedRelease(null);
        activeRelease = null;
      }
      
      const deps = await fetchDeployments();
      setDeployments(deps);

      if (activeRelease) {
        try {
          const elig = await fetchReleaseEligibility(activeRelease.version);
          setEligibility(elig);
        } catch (eligErr) {
          console.error('Failed to load eligibility details:', eligErr);
        }
      } else {
        setEligibility(null);
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: 'Failed to load updates inventory database data.', isError: true });
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Poll deployment states every 5s
    return () => clearInterval(interval);
  }, [selectedRelease?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setMessage({ text: 'Please select a package ZIP file.', isError: true });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('releaseNotes', releaseNotes);
      formData.append('rolloutRing', rolloutRing);

      await uploadReleasePackage(formData);
      setMessage({ text: 'Release package successfully uploaded, verified, and parsed.', isError: false });
      setSelectedFile(null);
      setReleaseNotes('');
      // Reset input element
      const fileInput = document.getElementById('package-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      await loadData();
    } catch (err: any) {
      console.error(err);
      setMessage({ text: err.response?.data?.error || 'Failed to upload release package.', isError: true });
    } finally {
      setIsUploading(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await publishRelease(id, canaryPercentage);
      setMessage({ text: `Release successfully published with ${canaryPercentage}% Canary rollout gate.`, isError: false });
      await loadData();
    } catch (err: any) {
      console.error(err);
      setMessage({ text: 'Failed to publish release.', isError: true });
    }
  };

  const handlePause = async (id: string) => {
    try {
      await pauseRelease(id);
      setMessage({ text: 'Release rollout successfully paused.', isError: false });
      await loadData();
    } catch (err: any) {
      console.error(err);
      setMessage({ text: 'Failed to pause rollout.', isError: true });
    }
  };

  const handleResume = async (id: string) => {
    try {
      await resumeRelease(id);
      setMessage({ text: 'Release rollout successfully resumed.', isError: false });
      await loadData();
    } catch (err: any) {
      console.error(err);
      setMessage({ text: 'Failed to resume rollout.', isError: true });
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelRelease(id);
      setMessage({ text: 'Release rollout successfully cancelled across active deployments.', isError: false });
      await loadData();
    } catch (err: any) {
      console.error(err);
      setMessage({ text: 'Failed to cancel rollout.', isError: true });
    }
  };

  // Rollout calculation helper
  const getReleaseStats = (releaseId: string) => {
    const relDeps = deployments.filter(d => d.releaseId === releaseId);
    const total = relDeps.length;
    const completed = relDeps.filter(d => d.status === 'Completed').length;
    const failed = relDeps.filter(d => d.status === 'Failed' || d.status === 'RolledBack').length;
    const active = relDeps.filter(d => d.status !== 'Completed' && d.status !== 'Failed' && d.status !== 'RolledBack' && d.status !== 'Cancelled').length;

    return { total, completed, failed, active };
  };

  return (
    <div className="space-y-6 animate-fadeIn text-white">
      <div>
        <h2 className="text-2xl font-bold font-display">Release Manager</h2>
        <p className="text-sm text-textSecondary mt-1">Manage target SemVer distributions, multi-platform packages, and canary deployment rollouts.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg border text-sm font-medium ${
          message.isError ? 'bg-error/10 border-error text-error' : 'bg-success/10 border-success text-success'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Release List */}
        <div className="bg-cardBg border border-cardBorder rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-sm font-display uppercase tracking-wider text-textSecondary">Active Releases</h3>
          {releases.length === 0 ? (
            <p className="text-xs text-textMuted font-mono">No releases uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {releases.map(rel => {
                const stats = getReleaseStats(rel.id);
                const isSelected = selectedRelease?.id === rel.id;
                return (
                  <button
                    key={rel.id}
                    onClick={() => setSelectedRelease(rel)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      isSelected 
                        ? 'bg-brandSecondary/25 border-brandPrimary shadow-card-glow' 
                        : 'bg-[#0b0c16] border-cardBorder hover:border-cardBorder/80'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold font-mono">v{rel.version}</h4>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                        rel.status === 'Stable' ? 'bg-success/15 text-success' :
                        rel.status === 'Draft' ? 'bg-textMuted/15 text-textMuted' :
                        rel.status === 'Paused' ? 'bg-amber-500/15 text-amber-500' :
                        'bg-error/15 text-error'
                      }`}>
                        {rel.status}
                      </span>
                    </div>
                    <div className="mt-3 flex justify-between text-[11px] text-textSecondary font-mono border-t border-cardBorder/40 pt-2">
                      <span>Ring: {rel.rolloutRing}</span>
                      <span>Canary: {rel.canaryPercentage}%</span>
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-textMuted font-mono">
                      <span>Done: {stats.completed}</span>
                      <span>Active: {stats.active}</span>
                      <span>Fail: {stats.failed}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Release Detail & Rollout Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {selectedRelease ? (
            <div className="bg-cardBg border border-cardBorder rounded-xl p-6 space-y-6">
              <div>
                <h3 className="text-xl font-bold font-display">Version Profile: v{selectedRelease.version}</h3>
                <p className="text-xs text-textSecondary mt-0.5">Created at {new Date(selectedRelease.createdAt).toLocaleString()}</p>
              </div>

              {/* Release Notes */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider">Release Notes</h4>
                <p className="text-sm bg-[#0b0c16] p-3 border border-cardBorder rounded-lg font-mono">
                  {selectedRelease.releaseNotes || 'No notes provided.'}
                </p>
              </div>

              {/* Staging slider & Actions */}
              <div className="space-y-4 border-t border-cardBorder pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-textSecondary">Canary Staging Control</h4>
                
                {selectedRelease.status === 'Draft' || selectedRelease.status === 'Stable' ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span>Target Canary Percentage</span>
                      <span className="text-brandPrimary font-bold">{canaryPercentage}% of fleet</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={canaryPercentage} 
                      onChange={(e) => setCanaryPercentage(Number(e.target.value))}
                      className="w-full h-1.5 bg-[#0b0c16] rounded-lg appearance-none cursor-pointer accent-brandPrimary"
                    />
                    <div className="flex justify-between text-[10px] text-textMuted font-mono">
                      <span>0% (Halted)</span>
                      <span>50% (Active Canary)</span>
                      <span>100% (Production Rollout)</span>
                    </div>
                  </div>
                ) : null}

                {/* Rollout Action buttons */}
                <div className="flex flex-wrap gap-3 mt-3">
                  {selectedRelease.status === 'Draft' && (
                    <button
                      onClick={() => handlePublish(selectedRelease.id)}
                      className="px-4 py-2 bg-success text-white font-bold text-xs rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Publish & Stage Rollout
                    </button>
                  )}
                  {selectedRelease.status === 'Stable' && (
                    <>
                      <button
                        onClick={() => handlePause(selectedRelease.id)}
                        className="px-4 py-2 bg-amber-600 text-white font-bold text-xs rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Pause Rollout
                      </button>
                      <button
                        onClick={() => handleCancel(selectedRelease.id)}
                        className="px-4 py-2 bg-error text-white font-bold text-xs rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Cancel Rollout
                      </button>
                    </>
                  )}
                  {selectedRelease.status === 'Paused' && (
                    <>
                      <button
                        onClick={() => handleResume(selectedRelease.id)}
                        className="px-4 py-2 bg-success text-white font-bold text-xs rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Resume Rollout
                      </button>
                      <button
                        onClick={() => handleCancel(selectedRelease.id)}
                        className="px-4 py-2 bg-error text-white font-bold text-xs rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Cancel Rollout
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Package details */}
              <div className="space-y-3 border-t border-cardBorder pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-textSecondary">Target Package Signatures</h4>
                {selectedRelease.packages && selectedRelease.packages.map(pkg => (
                  <div key={pkg.id} className="bg-[#0b0c16] p-4 border border-cardBorder rounded-lg space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Architecture:</span>
                      <span className="font-bold">{pkg.targetArchitecture}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Database Schema:</span>
                      <span className="font-bold">v{pkg.schemaVersion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Required Free Space:</span>
                      <span className="font-bold">{(pkg.requiredFreeSpaceBytes / (1024 * 1024 * 1024)).toFixed(2)} GB</span>
                    </div>
                    <div className="flex justify-between border-t border-cardBorder/40 pt-2 mt-2">
                      <span className="text-textSecondary">SHA-256 Checksum:</span>
                      <span className="font-bold text-[10px] text-textMuted select-all">{pkg.checksumSha256}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Eligible Labs Audit */}
              {eligibility && (
                <div className="space-y-3 border-t border-cardBorder pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-textSecondary">Eligible Labs Audit</h4>
                  <div className="bg-[#0b0c16] p-4 border border-cardBorder rounded-lg space-y-4">
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-mono border-b border-cardBorder/40 pb-3">
                      <span className="text-emerald-400 font-bold">✓ {eligibility.summary.eligible} Eligible</span>
                      <span className="text-rose-500 font-bold">✗ {eligibility.summary.disabled} Disabled</span>
                      <span className="text-amber-500 font-bold">✗ {eligibility.summary.ringMismatch} Ring Mismatch</span>
                      <span className="text-zinc-400 font-bold">✗ {eligibility.summary.unconfigured} Unconfigured</span>
                      <span className="text-blue-400 font-bold">✗ {eligibility.summary.alreadyNewer} Already Newer</span>
                      <span className="text-purple-400 font-bold">✗ {eligibility.summary.canaryPercentage} Canary Gated</span>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {eligibility.labs.map(lab => {
                        const isExpanded = expandedLabId === lab.labId;
                        const getRingBadgeIcon = (ring: string) => {
                          switch (ring) {
                            case 'Canary': return '🟣';
                            case 'Early': return '🟡';
                            case 'Production': return '🟢';
                            case 'Disabled': return '🔴';
                            default: return '⚪';
                          }
                        };

                        return (
                          <div key={lab.labId} className="border border-cardBorder/30 rounded bg-cardBg/30 overflow-hidden text-xs">
                            <div 
                              onClick={() => setExpandedLabId(isExpanded ? null : lab.labId)}
                              className="p-2.5 flex justify-between items-center cursor-pointer hover:bg-cardBg/50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white">{getRingBadgeIcon(lab.ring)} {lab.labName}</span>
                                <span className="text-[10px] text-textMuted font-mono">({lab.labId})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold ${lab.eligible ? 'text-emerald-400' : 'text-rose-500'}`}>
                                  {lab.eligible ? '✓ Eligible' : '✗ Ineligible'}
                                </span>
                                <span className="text-textSecondary text-[9px]">{isExpanded ? '▲' : '▼'}</span>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="p-3 border-t border-cardBorder/40 bg-black/20 font-mono text-[10px] space-y-1.5">
                                <div className="flex justify-between">
                                  <span className="text-textSecondary">Current Version:</span>
                                  <span className="font-bold text-white">{lab.currentVersion}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-textSecondary">Target Version:</span>
                                  <span className="font-bold text-white">{lab.targetVersion}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-textSecondary">Failed At Stage:</span>
                                  <span className="font-bold text-rose-400">{lab.failedAt || 'None'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-textSecondary">Reason Enum:</span>
                                  <span className="font-bold text-amber-500">{lab.reason}</span>
                                </div>
                                <div className="border-t border-cardBorder/25 pt-1.5 mt-1">
                                  <span className="text-textSecondary block mb-1">Diagnostic Detail:</span>
                                  <span className="text-white block bg-[#05060a] p-2 rounded border border-cardBorder/30 whitespace-pre-line leading-relaxed font-sans">{lab.reasonDetail}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-cardBg border border-cardBorder rounded-xl p-6 text-center text-textMuted">
              Select or upload a release package to configure rollout rings.
            </div>
          )}

          {/* Publish Release Form */}
          <form onSubmit={handleUpload} className="bg-cardBg border border-cardBorder rounded-xl p-6 space-y-4">
            <h3 className="font-bold text-sm font-display uppercase tracking-wider text-textSecondary">Publish New Release Package</h3>
            
            <div className="space-y-1">
              <label className="text-[10px] text-textSecondary uppercase font-bold">Package Zip File</label>
              <input 
                id="package-file-input"
                type="file" 
                required 
                onChange={handleFileChange}
                className="w-full bg-[#0b0c16] border border-cardBorder text-xs text-white p-2.5 rounded-lg outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-textSecondary uppercase font-bold">Target Rollout Ring</label>
                <select 
                  value={rolloutRing} 
                  onChange={(e: any) => setRolloutRing(e.target.value)}
                  className="w-full bg-[#0b0c16] border border-cardBorder text-xs text-white p-2.5 rounded-lg outline-none focus:border-brandPrimary"
                >
                  <option value="Canary">Canary (Internal Testing & Developer Environments)</option>
                  <option value="Early">Early Adopters (Staging & Non-critical Clinical Sites)</option>
                  <option value="Production">Production (All Active Installations)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-textSecondary uppercase font-bold">Release Notes</label>
              <textarea 
                required 
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                className="w-full bg-[#0b0c16] border border-cardBorder text-xs text-white p-2.5 rounded-lg h-24 outline-none focus:border-brandPrimary resize-none"
                placeholder="Describe this release features, fixes, or schema changes..."
              />
            </div>

            <button 
              type="submit"
              disabled={isUploading}
              className="w-full py-2.5 bg-gradient-to-r from-brandSecondary to-brandPrimary text-white font-bold text-xs rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isUploading ? 'Uploading and validating package...' : 'Upload and Stage Package'}
            </button>
          </form>

          {/* Active Deployments Log */}
          <div className="bg-cardBg border border-cardBorder rounded-xl p-6 space-y-4">
            <h3 className="font-bold text-sm font-display uppercase tracking-wider text-textSecondary">Active Deployments Progress Log</h3>
            {deployments.length === 0 ? (
              <p className="text-xs text-textMuted font-mono">No deployments registered yet.</p>
            ) : (
              <div className="space-y-3">
                {deployments.map(dep => {
                  const isExpanded = expandedDeploymentId === dep.id;
                  return (
                    <div key={dep.id} className="border border-cardBorder rounded-lg bg-[#0b0c16] overflow-hidden">
                      <div 
                        onClick={() => setExpandedDeploymentId(isExpanded ? null : dep.id)}
                        className="p-4 flex justify-between items-center cursor-pointer hover:bg-cardBg/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono">{dep.labName}</span>
                            <span className="text-[10px] text-textMuted font-mono select-all">({dep.labId})</span>
                          </div>
                          <div className="text-[10px] text-textSecondary font-mono">
                            Started: {new Date(dep.startedAt).toLocaleTimeString()} • Updated: {new Date(dep.updatedAt).toLocaleTimeString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                            dep.status === 'Completed' || dep.status === 'Success' ? 'bg-success/15 text-success' :
                            dep.status === 'Failed' || dep.status === 'RolledBack' ? 'bg-error/15 text-error' :
                            dep.status === 'Cancelled' ? 'bg-textMuted/15 text-textMuted' :
                            'bg-brandPrimary/15 text-brandPrimary'
                          }`}>
                            {dep.status}
                          </span>
                          <span className="text-textSecondary text-xs">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 border-t border-cardBorder/40 bg-cardBg/30 space-y-2">
                          <h4 className="text-[10px] font-bold text-textSecondary uppercase tracking-wider font-mono">Lifecycle Event Trace</h4>
                          <div className="p-3 bg-[#07080f] rounded border border-cardBorder/40 font-mono text-[10px] space-y-1">
                            {dep.events && dep.events.length > 0 ? (
                              dep.events.map((ev, idx) => (
                                <div key={idx} className="flex gap-4">
                                  <span className="text-textMuted">[{new Date(ev.occurredAt).toLocaleTimeString()}]</span>
                                  <span className={
                                    ev.eventType === 'Completed' || ev.eventType === 'Healthy' ? 'text-success font-semibold' :
                                    ev.eventType === 'Failed' || ev.eventType === 'RolledBack' ? 'text-error font-semibold' :
                                    'text-brandPrimary'
                                  }>
                                    {ev.eventType}
                                  </span>
                                  {ev.payloadJson && <span className="text-textSecondary select-all">{ev.payloadJson}</span>}
                                </div>
                              ))
                            ) : (
                              <div className="text-textMuted">No events logged.</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReleaseManagerTab;
