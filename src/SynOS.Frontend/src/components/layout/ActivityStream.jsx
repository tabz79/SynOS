import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Activity, CheckCircle2, User, CreditCard, TestTube2, AlertCircle, Stethoscope, Microscope, FileText } from 'lucide-react'
import { ReceptionApi } from '../../api/reception'
import { cn } from "@/lib/utils"
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext' // Context for theme detection

export function ActivityStream({ serverTime }) {
    const [events, setEvents] = useState(() => {
        try {
            const cached = localStorage.getItem('synos_cached_activity_events');
            return cached ? JSON.parse(cached) : [];
        } catch (_) {
            return [];
        }
    });
    const [loading, setLoading] = useState(() => {
        try {
            return !localStorage.getItem('synos_cached_activity_events');
        } catch (_) {
            return true;
        }
    });
    const { user } = useAuth();
    // THEME DETECTION (Matches ActionQueue)
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const fetchActivity = async () => {
        try {
            const data = await ReceptionApi.getActivityStream();

            let mappedData = data.filter(e => {
                if (!e.metadataObj) {
                    try {
                        e.metadataObj = (typeof e.metadata === 'string') ? JSON.parse(e.metadata) : (e.metadata || {});
                    }
                    catch { e.metadataObj = {}; }
                }

                if (e.visibility === 'Hide') return false;

                // 1. Filter out Inventory Alerts & non-patient logs (Live stream is strictly patient & report timeline)
                const typeStr = (e.eventType || '').toUpperCase();
                const titleStr = (e.title || e.summaryText || e.SummaryText || '').toLowerCase();
                const tokenStr = (e.tokenId || e.TokenId || e.token || '').trim();

                const isFinalizedOrBilled = typeStr === 'VISIT_FINALIZED' || 
                                           typeStr === 'BILL_GENERATED' || 
                                           typeStr === 'PAYMENT_RECEIVED' || 
                                           typeStr === 'RECEIVABLE_CREATED' ||
                                           titleStr.includes('prepaid') ||
                                           titleStr.includes('partner collects');

                // Suppress unfinalized draft tokens (DRAFT-..., D-..., or explicit draft status)
                const isDraftToken = tokenStr.toUpperCase().startsWith('DRAFT-') || 
                                     tokenStr.toUpperCase().startsWith('D-') || 
                                     titleStr.includes('draft-') ||
                                     titleStr.includes('draft visit');
                const isDraftStatus = (e.metadataObj?.status || '').toLowerCase() === 'draft' || 
                                      (e.status || '').toLowerCase() === 'draft' ||
                                      Boolean(e.metadataObj?.isDraft);

                if (!isFinalizedOrBilled && (isDraftToken || isDraftStatus)) {
                    return false;
                }

                // Suppress inventory alerts and raw internal events only
                if (typeStr.includes('INVENTORY') || 
                    titleStr.includes('inventory') || 
                    titleStr.includes('stock') ||
                    titleStr.includes('insufficient stock')) {
                    return false;
                }

                // 2. Billing filter: Remove zero bills (unless prepaid/finalized/due)
                if (e.eventType === 'BILL_GENERATED' && !isFinalizedOrBilled) {
                    if (titleStr.includes('0.00')) return false;
                    const total = parseFloat(e.metadataObj.Total || e.metadataObj.Amount || 0);
                    if (total === 0) return false;
                }

                return true;
            });

            const sorted = mappedData.sort((a, b) => {
                const dateA = new Date(a.occurredAt).getTime();
                const dateB = new Date(b.occurredAt).getTime();
                return dateB - dateA;
            });

            setEvents(sorted);
            try {
                if (sorted.length > 0) {
                    localStorage.setItem('synos_cached_activity_events', JSON.stringify(sorted.slice(0, 200)));
                }
            } catch (_) {}
            setLoading(false);
        } catch (err) {
            console.warn("Activity Stream Poll Failed (Server may be updating):", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivity();
        const interval = setInterval(fetchActivity, 5000);
        return () => clearInterval(interval);
    }, [user?.role]);

    const getRelativeTime = (dateString) => {
        if (!dateString) return "";
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "";
            let now = serverTime ? new Date(serverTime) : new Date();
            if (isNaN(now.getTime())) now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);
            if (isNaN(diffInSeconds)) return "";

            if (diffInSeconds < 60) return "just now";
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
            return `${Math.floor(diffInSeconds / 86400)}d ago`;
        } catch { return ""; }
    };

    const cleanActorName = (actor) => {
        if (!actor) return "";
        const trimmed = String(actor).trim();
        if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(trimmed)) {
            return "";
        }
        if (trimmed.toLowerCase() === "system" || trimmed.toLowerCase() === "user" || trimmed.toLowerCase() === "unknown") {
            return "";
        }
        return trimmed;
    };

    const formatEventTitle = (event) => {
        const type = (event.eventType || "").toUpperCase();
        const msg = event.messageResolved || event.title || event.summaryText || event.SummaryText || "";
        const meta = event.metadataObj || {};
        const patientName = meta.PatientName || event.patientName || "Patient";
        const token = (event.tokenId || event.TokenId || event.token || "").trim();
        const rawActor = event.actorName || meta.ActorName || meta.CreatedBy || event.actorType;
        const actor = cleanActorName(rawActor);

        const lowerMsg = msg.toLowerCase();

        // 1. Patient Registration (1st time)
        if (type === 'PATIENT_REGISTERED' || lowerMsg.includes('registered patient') || lowerMsg.includes('patient registered') || lowerMsg.includes('new patient registered')) {
            return `Patient ${patientName} registered`;
        }

        // 2. Audit / Amendments / Updates
        if (type === 'VISIT_UPDATED' || type === 'VISIT_CORRECTED' || type === 'VISIT_CORRECTED_AFTER_PAYMENT' || lowerMsg.includes('amend') || lowerMsg.includes('corrected') || lowerMsg.includes('audit')) {
            const actorStr = actor ? `by ${actor}` : '';
            let detail = '';
            if (lowerMsg.includes('added') || lowerMsg.includes('add test')) detail = 'test added';
            else if (lowerMsg.includes('removed') || lowerMsg.includes('remove test')) detail = 'test removed';
            else if (lowerMsg.includes('discount') || lowerMsg.includes('concession')) detail = 'discount updated';
            else if (lowerMsg.includes('referral') || lowerMsg.includes('doctor') || lowerMsg.includes('partner')) detail = 'doctor updated';
            else if (lowerMsg.includes('demographic') || lowerMsg.includes('patient')) detail = 'patient updated';

            const detailStr = detail ? ` (${detail})` : '';
            return `Visit amended ${actorStr}${detailStr}`.replace(/\s+/g, ' ').trim();
        }

        // 3. Billing, Settlement, Full Due & Payment
        if (type === 'BILL_GENERATED' || type === 'PAYMENT_RECEIVED' || type === 'RECEIVABLE_CREATED' || type === 'VISIT_FINALIZED' || lowerMsg.includes('payment received') || lowerMsg.includes('billed') || lowerMsg.includes('prepaid') || lowerMsg.includes('partner collects') || lowerMsg.includes('finalized')) {
            const tests = meta.TestCodes && Array.isArray(meta.TestCodes) && meta.TestCodes.length > 0
                ? meta.TestCodes.join(', ') 
                : (meta.TestNames || meta.Services || 'tests');
            const refDoc = meta.DoctorName || meta.PartnerName || meta.ReferralPartner || (lowerMsg.includes('dr.') ? msg.match(/dr\.\s*[\w\s]+/i)?.[0] : '');
            const actorStr = actor ? `by ${actor}` : '';
            const refStr = refDoc ? `, referred by ${refDoc}` : '';
            
            const isPrepaid = lowerMsg.includes('prepaid') || lowerMsg.includes('partner collects') || meta.Method === 'PartnerCollects';
            const isFullDue = lowerMsg.includes('full due') || meta.PaymentStatus === 'PendingPayment' || meta.PaymentStatus === 'FullDue' || meta.IsFullDue;
            
            let actionPrefix = 'Billed';
            if (isPrepaid) actionPrefix = 'Prepaid visit billed';
            else if (isFullDue) actionPrefix = 'Full Due bill confirmed';

            return `${actionPrefix} ${actorStr} for ${tests}${refStr}`.replace(/\s+/g, ' ').trim();
        }

        // 4. Sample Collection (Phlebotomy)
        if (type === 'SPECIMEN_COLLECTED' || type === 'SAMPLE_COLLECTED' || lowerMsg.includes('sample collected') || lowerMsg.includes('specimen collected')) {
            return actor ? `Sample collected by ${actor}` : `Sample collected`;
        }

        // 5. Sample Processing (Lab Workbench)
        if (type === 'SPECIMEN_PROCESSED' || type === 'SAMPLE_PROCESSED' || lowerMsg.includes('results finalized') || lowerMsg.includes('sample processed') || lowerMsg.includes('testing completed')) {
            return actor ? `Sample processed by ${actor}` : `Sample processed`;
        }

        // 6. Report Drafted (Typist)
        if (type === 'REPORT_DRAFTED' || lowerMsg.includes('drafted') || lowerMsg.includes('typing completed') || lowerMsg.includes('interpretation saved')) {
            return actor ? `Report drafted by ${actor}` : `Report drafted`;
        }

        // 7. Report Verified & Signed (Pathologist / Manual)
        if (type === 'REPORT_VERIFIED' || type === 'REPORT_SIGNED' || lowerMsg.includes('verified & signed') || lowerMsg.includes('digitally signed') || lowerMsg.includes('manually verified') || lowerMsg.includes('report signed')) {
            const isManual = lowerMsg.includes('manually') || meta.IsManual || type === 'REPORT_MANUALLY_VERIFIED';
            if (isManual) {
                return `Report signed`; // (No username for manual sign as per spec)
            }
            return actor ? `Report verified & signed by ${actor}` : `Report verified & signed`;
        }

        // 8. Ready at Delivery Desk
        if (type === 'REPORT_DELIVERED' || type === 'READY_FOR_DELIVERY' || lowerMsg.includes('ready for delivery') || lowerMsg.includes('ready at delivery')) {
            return `Report is ready at Delivery desk.`;
        }

        // 9. Visit Started / Token Assigned
        if (type === 'VISIT_STARTED' || lowerMsg.includes('visit started') || lowerMsg.includes('token id') || lowerMsg.includes('token assigned')) {
            const isDraftToken = token && (token.toUpperCase().startsWith('DRAFT-') || token.toUpperCase().startsWith('D-'));
            return token && !isDraftToken && token !== 'System'
                ? `Token ID ${token} assigned to ${patientName}`
                : `Visit started for ${patientName}`;
        }

        // Fallback
        let clean = msg.replace(/\(Fact:.*?\)/g, "").trim();
        clean = clean.replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, "").trim();
        return clean;
    };

    const mapEventTypeToIcon = (type, msg) => {
        const message = (msg || "").toLowerCase();
        if (type === 'VISIT_UPDATED' || type === 'VISIT_CORRECTED' || type === 'VISIT_CORRECTED_AFTER_PAYMENT' || message.includes('amend') || message.includes('audit') || message.includes('corrected')) {
            return <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
        }
        if (message.includes('added test')) return <Activity className="h-4 w-4 text-amber-500" />;
        if (message.includes('removed test')) return <Activity className="h-4 w-4 text-rose-500" />;
        if (message.includes('referral partner')) return <User className="h-4 w-4 text-purple-500" />;

        switch (type) {
            case 'VISIT_CREATED': return <User className="h-4 w-4 text-muted-foreground" />;
            case 'PAYMENT_RECEIVED':
            case 'RECEIVABLE_CREATED':
            case 'VISIT_FINALIZED': return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />;
            case 'SPECIMEN_COLLECTED': return <TestTube2 className="h-4 w-4 text-blue-500" />;
            case 'SPECIMEN_PROCESSED': return <Microscope className="h-4 w-4 text-indigo-500" />;
            case 'REPORT_VERIFIED':
            case 'REPORT_SIGNED': return <CheckCircle2 className="h-4 w-4 text-teal-600" />;
            default: return <Activity className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const groupedEvents = useMemo(() => {
        // Create maps of VisitId -> Latest Token and Patient
        const latestTokenMap = {};
        const latestPatientMap = {};
        events.forEach(event => {
            const visitId = event.visitId || event.VisitId || event.metadataObj?.VisitId;
            const rawToken = event.tokenId || event.TokenId || event.token || event.metadataObj?.TokenId;
            const patient = event.metadataObj?.PatientName || event.patientName;
            if (visitId) {
                if (patient && !latestPatientMap[visitId]) {
                    latestPatientMap[visitId] = patient;
                }
                if (rawToken) {
                    const cleanToken = rawToken.trim();
                    const isDraft = cleanToken.toUpperCase().startsWith("DRAFT-") || cleanToken.toUpperCase().startsWith("D-");
                    const current = latestTokenMap[visitId];
                    const currentIsDraft = current && (current.toUpperCase().startsWith("DRAFT-") || current.toUpperCase().startsWith("D-"));
                    if (!current) {
                        latestTokenMap[visitId] = cleanToken;
                    } else if (currentIsDraft && !isDraft) {
                        latestTokenMap[visitId] = cleanToken;
                    }
                }
            }
        });

        // Group events by Token into a unified timeline map
        const groupsByToken = new Map();

        events.forEach(event => {
            const msg = event.title || event.summaryText || event.SummaryText || "";
            const visitId = event.visitId || event.VisitId || event.metadataObj?.VisitId;
            const rawToken = event.tokenId || event.TokenId || event.token || event.metadataObj?.TokenId;
            
            // Resolve token using our latestTokenMap
            let token = rawToken || "System";
            if (visitId && latestTokenMap[visitId]) {
                token = latestTokenMap[visitId];
            }
            token = (token || "").trim();

            let groupPatientName = event.metadataObj?.PatientName || (visitId ? latestPatientMap[visitId] : null);
            if (!groupPatientName) {
                groupPatientName = (token === "System") ? "Operational Log" : "Processing...";
            }

            if (!groupsByToken.has(token)) {
                groupsByToken.set(token, {
                    token: token,
                    patientName: groupPatientName,
                    actorName: event.metadataObj?.ActorName || event.actorName || "User",
                    items: [],
                    timestamp: event.occurredAt
                });
            }

            const group = groupsByToken.get(token);
            if (group.patientName === "Processing..." && groupPatientName !== "Processing...") {
                group.patientName = groupPatientName;
            }
            if (new Date(event.occurredAt) > new Date(group.timestamp)) {
                group.timestamp = event.occurredAt;
            }
            group.items.push({ ...event, messageResolved: msg });
        });

        const rawGroups = Array.from(groupsByToken.values());

        // Sort groups by latest activity descending
        rawGroups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return rawGroups.map(group => {
            const seenCategories = new Set();
            const mergedItems = group.items.filter(item => {
                const type = (item.eventType || '').toUpperCase();
                const msg = (item.title || item.summaryText || item.SummaryText || '').toLowerCase();

                let category = type;
                if (type === 'BILL_GENERATED' || type === 'PAYMENT_RECEIVED' || type === 'RECEIVABLE_CREATED' || type === 'VISIT_FINALIZED' || msg.includes('payment received') || msg.includes('billed') || msg.includes('prepaid') || msg.includes('finalized')) {
                    category = 'BILLING';
                }
                else if (type === 'VISIT_UPDATED' || type === 'VISIT_CORRECTED' || type === 'VISIT_CORRECTED_AFTER_PAYMENT' || msg.includes('amend') || msg.includes('corrected') || msg.includes('audit')) {
                    category = 'AMENDMENT_' + (item.eventId || item.occurredAt);
                }
                else if (type === 'SPECIMEN_COLLECTED' || type === 'SAMPLE_COLLECTED' || msg.includes('sample collected') || msg.includes('specimen collected')) {
                    category = 'COLLECTION';
                }
                else if (type === 'RESULT_VERIFIED' || type === 'SPECIMEN_PROCESSED' || type === 'SAMPLE_PROCESSED' || msg.includes('results finalized') || msg.includes('sample processed') || msg.includes('testing completed') || msg.includes('result saved')) {
                    category = 'PROCESSING';
                }
                else if (type === 'REPORT_DRAFTED' || msg.includes('drafted') || msg.includes('typing completed')) {
                    category = 'DRAFT';
                }
                else if (type === 'REPORT_VERIFIED' || type === 'REPORT_SIGNED' || msg.includes('verified & signed') || msg.includes('report signed')) {
                    category = 'VERIFY';
                }

                if (seenCategories.has(category)) {
                    return false;
                }
                seenCategories.add(category);
                return true;
            });

            // Fallback: If mergedItems is empty, retain the latest event so patient is never an empty card
            const finalItems = mergedItems.length > 0 ? mergedItems : (group.items.length > 0 ? [group.items[0]] : []);

            return { ...group, items: finalItems };
        }).filter(group => group.items.length > 0);
    }, [events]);

    // STYLES MATCHING ACTION QUEUE
    const ui = {
        container: isDark
            ? "bg-zinc-900 border-white/5 shadow-2xl"
            : "bg-white border-black/[0.1] shadow-[0_4px_20px_rgba(0,0,0,0.05)]",
        headerRow: isDark
            ? "bg-zinc-800 border-b border-white/5"
            : "border-b border-black/[0.08]",
    };

    // Light mode Gradient for Header
    const lightHeaderStyle = !isDark ? {
        background: `linear-gradient(to bottom, rgba(248, 253, 255, 0.98) 0%, rgba(238, 245, 248, 0.98) 50%, rgba(228, 235, 238, 0.98) 100%)`
    } : {};

    return (
        <div className={cn("flex flex-col h-full rounded-xl border overflow-hidden transition-all duration-300", ui.container)}>
            {/* MATCHING HEADER STYLE */}
            <div className={cn("h-11 sm:h-12 flex items-center px-3.5 sm:px-4 shrink-0", ui.headerRow)} style={lightHeaderStyle}>
                <div className="flex items-center gap-2">
                    {/* REQ: Keep Pulse Green in Top Window Bar */}
                    <Activity className="h-4 w-4 text-green-600" />
                    <h2 className={cn(
                        "text-sm font-semibold",
                        isDark ? "text-zinc-200" : "text-zinc-800"
                    )}>
                        Live Stream
                    </h2>
                </div>
            </div>

            <div className="flex-1 overflow-hidden p-0 relative">
                <ScrollArea className="h-full">
                    <div className="p-3 sm:p-3.5 space-y-4">
                        {loading && <div className="text-center text-xs text-muted-foreground py-4">Syncing stream...</div>}

                        {!loading && events.length === 0 && (
                            <div className="text-center text-xs text-muted-foreground py-8">
                                No activity in the last 24 hours
                            </div>
                        )}

                        {groupedEvents.map((group, groupIdx) => (
                            // REQ: Left side lines too faded -> Made darker (border-black/[0.1] or border-zinc-700)
                            <div key={`${group.token}-${groupIdx}`} className={cn(
                                "relative pl-3 ml-1.5 border-l",
                                isDark ? "border-zinc-700" : "border-black/[0.12]" // Darker border
                            )}>
                                {/* Timeline Dot */}
                                <div className={cn(
                                    "absolute -left-[5px] top-0.5 h-2.5 w-2.5 rounded-full border-2",
                                    isDark ? "bg-zinc-800 border-zinc-900" : "bg-white border-white ring-1 ring-black/[0.1]"
                                )} />

                                <div className="mb-3 flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                        {/* REQ: Fix Token Spacing - Trimmed & Monospace Font adjusted */}
                                        <span className={cn(
                                            "text-[10px] font-mono font-medium px-1.5 py-0.5 rounded",
                                            isDark ? "text-zinc-400 bg-white/5" : "text-zinc-600 bg-black/[0.04]"
                                        )}>
                                            {(group.token || "").trim()}
                                        </span>
                                        <span className="text-xs text-foreground/90 font-medium truncate max-w-[140px]">
                                            {group.patientName}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground pl-1 font-medium">
                                        {getRelativeTime(group.timestamp)}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    {group.items.map((event, idx) => (
                                        <div key={event.eventId || idx} className="group relative flex gap-2.5 text-xs">
                                            <div className="mt-0.5 transition-colors text-muted-foreground group-hover:text-foreground">
                                                {mapEventTypeToIcon(event.eventType, event.messageResolved)}
                                            </div>
                                            <div className="flex-1 space-y-0.5">
                                                <p className="text-xs leading-snug text-foreground/90 group-hover:text-foreground transition-colors font-medium">
                                                    {formatEventTitle(event)}
                                                </p>

                                                {event.subMessage && (
                                                    <p className="text-[10px] text-emerald-600/80 dark:text-emerald-500/70">{event.subMessage}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
}
