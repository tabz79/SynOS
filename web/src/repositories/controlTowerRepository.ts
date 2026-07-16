// File: web/src/repositories/controlTowerRepository.ts
// Centralized frontend repository layer for API communication and view model mapping.

import controlTowerClient from '../services/controlTowerClient';
import axios from 'axios';
import { 
  formatRupees, 
  formatPercentage, 
  formatDate, 
  formatTime, 
  formatRelativeTime 
} from '../services/formattingUtils';

// View Model Interfaces
export interface DashboardViewModel {
  generatedAt: string;
  projectionSequence: string;
  revenueTodayFormatted: string;
  patientsToday: number;
  avgBillFormatted: string;
  newCustomersFormatted: string;
  whatsAppDeliveredFormatted: string;
  
  // Sparkline Paths (SVG)
  revenueSparkline: string;
  patientsSparkline: string;
  avgBillSparkline: string;
  newCustomersSparkline: string;
  whatsAppSparkline: string;

  // Demographics Summary
  ageGroups: Array<{ label: string; value: number; percentFormatted: string }>;
  genderSplit: Array<{ label: string; value: number; percentFormatted: string }>;
  topLocations: Array<{ name: string; percentage: number }>;
  repeatCustomersPercent: string;
  firstTimeCustomersPercent: string;
  avgVisitsPerCustomer: number;
  retentionRate30D: string;

  // WhatsApp Summary
  whatsAppStatus: string;
  whatsAppAccount: string;
  whatsAppDeliveredCount: number;
  whatsAppReadCount: number;
  whatsAppRepliedCount: number;
  whatsAppFailedCount: number;
  whatsAppDeliveryRate: string;
  whatsAppReadRate: string;
  whatsAppRepliedRate: string;
  whatsAppFailedRate: string;

  // Lists
  topPartners: Array<{ index: number; name: string; revenueFormatted: string; patientsCount: number; avgBillFormatted: string; growthFormatted: string }>;
  topTests: Array<{ index: number; name: string; revenueFormatted: string; growthFormatted: string }>;

  // Context Snapshot Debugger
  rawContext: any;
}

export interface WhatsAppSummaryViewModel {
  connectionStatus: string;
  businessAccount: string;
  sentCount: number;
  deliveredCount: number;
  pendingCount: number;
  sendingCount: number;
  failedCount: number;
  retryQueueCount: number;
  totalQueue: number;
}

export interface WhatsAppLogItem {
  id: string;
  phone: string;
  messageType: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  createdAtRelative: string;
  sentAtFormatted: string;
  deliveredAtFormatted: string | null;
  patientId: string | null;
  visitId: string | null;
  reportId: string | null;
  labId: string;
  templateName: string | null;
  triggerEvent: string | null;
  retryCount: number;
  failureReason: string | null;
  provider: string;
  providerMessageId: string | null;
  channel: string;
  payloadJson: string;
}

export interface WhatsAppTemplate {
  name: string;
  body: string;
}

export interface PartnerViewModel {
  partnerId: string;
  partnerName: string;
  partnerLocation: string;
  totalPatients: number;
  totalTests: number;
  totalRevenueFormatted: string;
}

export interface PartnerDetailsViewModel {
  summary: {
    partnerId: string;
    partnerName: string;
    partnerLocation: string;
    revenueFormatted: string;
    patients: number;
    averageBillFormatted: string;
    repeatPatients: number;
    firstTimePatients: number;
    lastActivityFormatted: string;
    daysSinceLastReferral: number | null;
    totalUniquePatients: number;
    activePatientsLast90Days: number;
    inactivePatients90PlusDays: number;
    averageDaysBetweenReferrals: number;
    highestValuePatientName: string;
    highestValuePatientRevenueFormatted: string;
    mostRecentPatientName: string;
    mostRecentPatientDateFormatted: string;
  };
  monthlyRevenueTrend: Array<{ month: string; value: number; valueFormatted: string }>;
  monthlyPatientTrend: Array<{ month: string; value: number }>;
  averageBillTrend: Array<{ month: string; value: number; valueFormatted: string }>;
  genderDistribution: Record<string, number>;
  ageDistribution: Record<string, number>;
  topTests: Array<{ testCode: string; count: number }>;
  top10PatientsByRevenue: Array<{ patientId: string; patientName: string; revenueFormatted: string }>;
  completePatientDirectory: Array<{
    patientId: string;
    mrn: string;
    patientName: string;
    mobileNumber: string;
    age: number;
    gender: string;
    totalVisits: number;
    lifetimeRevenueFormatted: string;
    firstVisitFormatted: string;
    lastVisitFormatted: string;
    lastTestsOrdered: string;
  }>;
  recentPatientTimeline: Array<{
    visitDateFormatted: string;
    patientName: string;
    testsOrdered: string[];
    amountPaidFormatted: string;
  }>;
}

export interface CustomerChannelViewModel {
  sourceId: string;
  sourceName: string;
  sourceType: string;
  isFirstVisit: boolean;
  cohortTypeFormatted: string;
  totalPatients: number;
  totalRevenueFormatted: string;
}

export interface CustomerChannelDetailsViewModel {
  sourceId: string;
  sourceName: string;
  sourceType: string;
  isFirstVisit: boolean;
  cohortTypeFormatted: string;
  totalPatients: number;
  totalTests: number;
  totalRevenueFormatted: string;
  avgYieldFormatted: string;
  firstReferralDateFormatted: string;
  latestReferralDateFormatted: string;
}

export interface DemographicsViewModel {
  ageGroups: Array<{ ageGroup: string; patientCount: number; percentWidth: string; testCount: number; revenueFormatted: string }>;
  genders: Array<{ gender: string; isFemale: boolean; patientCount: number; percentWidth: string; testCount: number; revenueFormatted: string }>;
  locations: Array<{ location: string; patientCount: number; testCount: number; revenueFormatted: string }>;
}

// Repository Implementations
export const fetchDashboard = async (): Promise<DashboardViewModel> => {
  const [dashboardRes, whatsappRes, contextRes] = await Promise.all([
    controlTowerClient.get('/dashboard'),
    controlTowerClient.get('/whatsapp/summary'),
    controlTowerClient.get('/context')
  ]);

  const dash = dashboardRes.data;
  const wa = whatsappRes.data;
  const context = contextRes.data;

  const overview = dash.operational.overview;
  
  const revenueTodayVal = overview.revenueCollectedToday || 0;
  const patientsTodayVal = overview.registrationsToday || 0;
  const avgBillVal = overview.paymentsCountToday > 0 ? (revenueTodayVal / overview.paymentsCountToday) : 0;

  // New Customers (30D) maps to context patient count metadata
  const totalPatientsCount = context.knowledge?.totalPatients || 0;
  
  // WhatsApp stats
  const waDelivered = wa.delivered || 0;
  const waTotal = wa.totalQueue || 0;
  const waFailed = wa.failed || 0;
  const waRead = 0;
  const waReplied = 0;

  // DTO mapping to demographics metrics
  const ageMetrics = context.demographics?.ageGroups || [];
  const genderMetrics = context.demographics?.genders || [];
  const locationMetrics = context.demographics?.locations || [];

  const ageGroupsMapped = ageMetrics.map((a: any) => ({
    label: a.ageGroup,
    value: a.patientCount,
    percentFormatted: totalPatientsCount > 0 ? formatPercentage((a.patientCount / totalPatientsCount) * 100) : '0%'
  }));

  const genderSplitMapped = genderMetrics.map((g: any) => ({
    label: g.gender,
    value: g.patientCount,
    percentFormatted: totalPatientsCount > 0 ? formatPercentage((g.patientCount / totalPatientsCount) * 100) : '0%'
  }));

  const totalLocationPatients = locationMetrics.reduce((sum: number, l: any) => sum + l.patientCount, 0) || 1;
  const topLocationsMapped = locationMetrics.slice(0, 4).map((l: any) => ({
    name: l.location,
    percentage: Math.round((l.patientCount / totalLocationPatients) * 100)
  }));

  // Sparklines calculations (mapping database daily trends)
  const dailyData = dash.business.revenue.dailyData || [];
  const revenuePoints = dailyData.map((d: any) => Number(d.revenueCollected) || 0);
  const patientsPoints = dailyData.map((d: any) => Number(d.billsCreated) || 0);
  const avgBillPoints = dailyData.map((d: any) => {
    const pmts = Number(d.paymentsCount) || 0;
    const rev = Number(d.revenueCollected) || 0;
    return pmts > 0 ? rev / pmts : 0;
  });
  const newCustomersPoints = dailyData.map((d: any) => Number(d.patientsRegistered) || 0);
  
  const generateSparklineSvgPath = (rawPoints: number[]): string => {
    const points = rawPoints.map(p => typeof p === 'number' && !isNaN(p) ? p : 0);
    if (points.length < 2) return '';
    const width = 100;
    const height = 30;
    const maxVal = Math.max(...points) || 1;
    const step = width / (points.length - 1);
    
    return points.map((p, idx) => {
      const x = idx * step;
      const y = height - (p / maxVal) * (height - 10) - 5;
      return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  };

  // Top list mapping
  const partnersList = dash.business.referrals.partners || [];
  const topPartnersMapped = partnersList.slice(0, 5).map((part: any, idx: number) => ({
    index: idx + 1,
    name: part.partnerName,
    revenueFormatted: formatRupees(part.revenueGenerated),
    patientsCount: part.patientCount || 0,
    avgBillFormatted: formatRupees(part.patientCount > 0 ? part.revenueGenerated / part.patientCount : 0),
    growthFormatted: '—'
  }));

  const testsTrends = dash.intelligence.trends?.tests || [];
  const topTestsMapped = testsTrends.slice(0, 5).map((test: any, idx: number) => ({
    index: idx + 1,
    name: test.name,
    revenueFormatted: formatRupees(test.currentPeriodRevenue),
    growthFormatted: test.revenueGrowthRate >= 0 ? `↑ ${test.revenueGrowthRate.toFixed(1)}%` : `↓ ${test.revenueGrowthRate.toFixed(1)}%`
  }));

  return {
    generatedAt: formatDate(dash.metadata?.generatedAt || new Date().toISOString()),
    projectionSequence: (context.knowledge?.projectionSequence || dash.metadata?.projectionSequence || 0).toString(),
    revenueTodayFormatted: formatRupees(revenueTodayVal),
    patientsToday: patientsTodayVal,
    avgBillFormatted: formatRupees(avgBillVal),
    newCustomersFormatted: totalPatientsCount.toLocaleString(),
    whatsAppDeliveredFormatted: waDelivered.toLocaleString(),
    
    revenueSparkline: generateSparklineSvgPath(revenuePoints),
    patientsSparkline: generateSparklineSvgPath(patientsPoints),
    avgBillSparkline: generateSparklineSvgPath(avgBillPoints),
    newCustomersSparkline: generateSparklineSvgPath(newCustomersPoints),
    whatsAppSparkline: '',

    ageGroups: ageGroupsMapped,
    genderSplit: genderSplitMapped,
    topLocations: topLocationsMapped,
    repeatCustomersPercent: '—',
    firstTimeCustomersPercent: '—',
    avgVisitsPerCustomer: 0,
    retentionRate30D: '—',

    whatsAppStatus: wa.connectionStatus,
    whatsAppAccount: wa.businessAccount,
    whatsAppDeliveredCount: waDelivered,
    whatsAppReadCount: waRead,
    whatsAppRepliedCount: waReplied,
    whatsAppFailedCount: waFailed,
    whatsAppDeliveryRate: waTotal > 0 ? formatPercentage((waDelivered / waTotal) * 100) : '0%',
    whatsAppReadRate: 'No Data',
    whatsAppRepliedRate: 'No Data',
    whatsAppFailedRate: waTotal > 0 ? formatPercentage((waFailed / waTotal) * 100) : '0%',

    topPartners: topPartnersMapped,
    topTests: topTestsMapped,
    rawContext: context
  };
};

export const fetchWhatsAppSummary = async (): Promise<WhatsAppSummaryViewModel> => {
  const res = await controlTowerClient.get('/whatsapp/summary');
  const d = res.data;
  return {
    connectionStatus: d.connectionStatus || d.ConnectionStatus,
    businessAccount: d.businessAccount || d.BusinessAccount,
    sentCount: d.sent || d.Sent || 0,
    deliveredCount: d.delivered || d.Delivered || 0,
    pendingCount: d.pending || d.Pending || 0,
    sendingCount: d.sending || d.Sending || 0,
    failedCount: d.failed || d.Failed || 0,
    retryQueueCount: d.retryQueue || d.RetryQueue || 0,
    totalQueue: d.totalQueue || d.TotalQueue || 0
  };
};

export const fetchWhatsAppLogs = async (status?: string, channel?: string, messageType?: string, patientId?: string): Promise<WhatsAppLogItem[]> => {
  let url = '/whatsapp/logs?';
  if (status) url += `status=${encodeURIComponent(status)}&`;
  if (channel) url += `channel=${encodeURIComponent(channel)}&`;
  if (messageType) url += `messageType=${encodeURIComponent(messageType)}&`;
  if (patientId) url += `patientId=${encodeURIComponent(patientId)}&`;

  const res = await controlTowerClient.get(url);
  return res.data.map((item: any) => mapLogItem(item));
};

export const fetchWhatsAppLogDetails = async (id: string): Promise<WhatsAppLogItem> => {
  const res = await controlTowerClient.get(`/whatsapp/logs/${id}`);
  return mapLogItem(res.data);
};

const mapLogItem = (item: any): WhatsAppLogItem => ({
  id: item.id || item.Id,
  phone: item.phone || item.Phone,
  messageType: item.messageType || item.MessageType,
  status: item.status || item.Status,
  createdAt: item.createdAt || item.CreatedAt,
  sentAt: item.sentAt || item.SentAt,
  deliveredAt: item.deliveredAt || item.DeliveredAt,
  createdAtRelative: formatRelativeTime(item.createdAt || item.CreatedAt),
  sentAtFormatted: (item.sentAt || item.SentAt) ? formatDate(item.sentAt || item.SentAt) + ' ' + formatTime(item.sentAt || item.SentAt) : 'Pending',
  deliveredAtFormatted: (item.deliveredAt || item.DeliveredAt) ? formatDate(item.deliveredAt || item.DeliveredAt) + ' ' + formatTime(item.deliveredAt || item.DeliveredAt) : null,
  patientId: item.patientId || item.PatientId,
  visitId: item.visitId || item.VisitId,
  reportId: item.reportId || item.ReportId,
  labId: item.labId || item.LabId || '',
  templateName: item.templateName || item.TemplateName,
  triggerEvent: item.triggerEvent || item.TriggerEvent,
  retryCount: item.retryCount || item.RetryCount || 0,
  failureReason: item.failureReason || item.FailureReason,
  provider: item.provider || item.Provider,
  providerMessageId: item.providerMessageId || item.ProviderMessageId,
  channel: item.channel || item.Channel,
  payloadJson: item.payloadJson || item.PayloadJson
});

export const fetchWhatsAppTemplates = async (): Promise<WhatsAppTemplate[]> => {
  const res = await controlTowerClient.get('/whatsapp/templates');
  return res.data;
};

export const fetchPartners = async (query = ''): Promise<PartnerViewModel[]> => {
  const url = query ? `/context/referral-partners?q=${encodeURIComponent(query)}` : '/context';
  const res = await controlTowerClient.get(url);
  const list = query ? res.data : (res.data.topReferralPartners || []);
  
  return list.map((p: any) => ({
    partnerId: p.partnerId,
    partnerName: p.partnerName,
    partnerLocation: p.partnerLocation,
    totalPatients: p.totalPatients,
    totalTests: p.totalTests,
    totalRevenueFormatted: formatRupees(p.totalRevenueGenerated)
  }));
};

export const fetchPartnerDetails = async (id: string): Promise<PartnerDetailsViewModel> => {
  const res = await controlTowerClient.get(`/referrals/partners/${id}`);
  const data = res.data;
  
  return {
    summary: {
      partnerId: data.summary.partnerId,
      partnerName: data.summary.partnerName,
      partnerLocation: data.summary.partnerLocation,
      revenueFormatted: formatRupees(data.summary.revenue),
      patients: data.summary.patients,
      averageBillFormatted: formatRupees(data.summary.averageBill),
      repeatPatients: data.summary.repeatPatients,
      firstTimePatients: data.summary.firstTimePatients,
      lastActivityFormatted: formatDate(data.summary.lastActivity),
      daysSinceLastReferral: data.summary.daysSinceLastReferral,
      totalUniquePatients: data.summary.totalUniquePatients,
      activePatientsLast90Days: data.summary.activePatientsLast90Days,
      inactivePatients90PlusDays: data.summary.inactivePatients90PlusDays,
      averageDaysBetweenReferrals: data.summary.averageDaysBetweenReferrals,
      highestValuePatientName: data.summary.highestValuePatientName,
      highestValuePatientRevenueFormatted: formatRupees(data.summary.highestValuePatientRevenue),
      mostRecentPatientName: data.summary.mostRecentPatientName,
      mostRecentPatientDateFormatted: formatDate(data.summary.mostRecentPatientDate)
    },
    monthlyRevenueTrend: (data.monthlyRevenueTrend || []).map((t: any) => ({
      month: t.month,
      value: t.value,
      valueFormatted: formatRupees(t.value)
    })),
    monthlyPatientTrend: (data.monthlyPatientTrend || []).map((t: any) => ({
      month: t.month,
      value: t.value
    })),
    averageBillTrend: (data.averageBillTrend || []).map((t: any) => ({
      month: t.month,
      value: t.value,
      valueFormatted: formatRupees(t.value)
    })),
    genderDistribution: data.genderDistribution || {},
    ageDistribution: data.ageDistribution || {},
    topTests: (data.topTests || []).map((t: any) => ({
      testCode: t.testCode,
      count: t.count
    })),
    top10PatientsByRevenue: (data.top10PatientsByRevenue || []).map((t: any) => ({
      patientId: t.patientId,
      patientName: t.patientName,
      revenueFormatted: formatRupees(t.revenue)
    })),
    completePatientDirectory: (data.completePatientDirectory || []).map((p: any) => ({
      patientId: p.patientId,
      mrn: p.mrn,
      patientName: p.patientName,
      mobileNumber: p.mobileNumber,
      age: p.age,
      gender: p.gender,
      totalVisits: p.totalVisits,
      lifetimeRevenueFormatted: formatRupees(p.lifetimeRevenue),
      firstVisitFormatted: formatDate(p.firstVisit),
      lastVisitFormatted: formatDate(p.lastVisit),
      lastTestsOrdered: p.lastTestsOrdered
    })),
    recentPatientTimeline: (data.recentPatientTimeline || []).map((v: any) => ({
      visitDateFormatted: formatDate(v.visitDate),
      patientName: v.patientName,
      testsOrdered: v.testsOrdered || [],
      amountPaidFormatted: formatRupees(v.amountPaid)
    }))
  };
};

export interface PatientListItemViewModel {
  patientId: string;
  mrn: string;
  name: string;
  age: number;
  gender: string;
  mobileNumber: string;
  testsOrdered: string;
  referringDoctorOrPartner: string;
  totalVisits: number;
  lastVisitDateFormatted: string;
  lifetimeRevenueFormatted: string;
}

export interface PatientDetailsViewModel {
  patientId: string;
  mrn: string;
  name: string;
  age: number;
  gender: string;
  mobileNumber: string;
  referringDoctorOrPartner: string;
  totalVisits: number;
  lifetimeRevenueFormatted: string;
  firstVisitDateFormatted: string;
  lastVisitDateFormatted: string;
  visits: Array<{
    visitId: string;
    token: string;
    visitDateFormatted: string;
    tests: string[];
    amountPaidFormatted: string;
  }>;
}

export const fetchPatients = async (query = ''): Promise<PatientListItemViewModel[]> => {
  const url = query ? `/patients?q=${encodeURIComponent(query)}` : '/patients';
  const res = await controlTowerClient.get(url);
  const list = res.data || [];

  return list.map((p: any) => ({
    patientId: p.patientId,
    mrn: p.mrn,
    name: p.name,
    age: p.age,
    gender: p.gender,
    mobileNumber: p.mobileNumber,
    testsOrdered: p.testsOrdered || '—',
    referringDoctorOrPartner: p.referringDoctorOrPartner || 'Direct Walk-In',
    totalVisits: p.totalVisits,
    lastVisitDateFormatted: p.lastVisitDate ? formatDate(p.lastVisitDate) : '—',
    lifetimeRevenueFormatted: formatRupees(p.lifetimeRevenue)
  }));
};

export const fetchPatientDetails = async (id: string): Promise<PatientDetailsViewModel> => {
  const res = await controlTowerClient.get(`/patients/${id}`);
  const d = res.data;

  return {
    patientId: d.patientId,
    mrn: d.mrn,
    name: d.name,
    age: d.age,
    gender: d.gender,
    mobileNumber: d.mobileNumber,
    referringDoctorOrPartner: d.referringDoctorOrPartner || 'Direct Walk-In',
    totalVisits: d.totalVisits,
    lifetimeRevenueFormatted: formatRupees(d.lifetimeRevenue),
    firstVisitDateFormatted: d.firstVisitDate ? formatDate(d.firstVisitDate) : '—',
    lastVisitDateFormatted: d.lastVisitDate ? formatDate(d.lastVisitDate) : '—',
    visits: (d.visits || []).map((v: any) => ({
      visitId: v.visitId,
      token: v.token,
      visitDateFormatted: formatDate(v.visitDate),
      tests: v.tests || [],
      amountPaidFormatted: formatRupees(v.amountPaid)
    }))
  };
};

export const fetchDemographics = async (): Promise<DemographicsViewModel> => {
  const res = await controlTowerClient.get('/context');
  const d = res.data.demographics;
  
  const ageGroups = d.ageGroups || [];
  const maxAgeCount = Math.max(...ageGroups.map((x: any) => x.patientCount)) || 1;
  const ageGroupsMapped = ageGroups.map((a: any) => ({
    ageGroup: a.ageGroup || 'Unknown',
    patientCount: a.patientCount,
    percentWidth: `${(a.patientCount / maxAgeCount) * 100}%`,
    testCount: a.testCount,
    revenueFormatted: formatRupees(a.revenue)
  }));

  const genders = d.genders || [];
  const maxGenderCount = Math.max(...genders.map((x: any) => x.patientCount)) || 1;
  const gendersMapped = genders.map((g: any) => ({
    gender: g.gender,
    isFemale: g.gender.toLowerCase() === 'female',
    patientCount: g.patientCount,
    percentWidth: `${(g.patientCount / maxGenderCount) * 100}%`,
    testCount: g.testCount,
    revenueFormatted: formatRupees(g.revenue)
  }));

  const locations = d.locations || [];
  const locationsMapped = locations.map((l: any) => ({
    location: l.location,
    patientCount: l.patientCount,
    testCount: l.testCount,
    revenueFormatted: formatRupees(l.revenue)
  }));

  return {
    ageGroups: ageGroupsMapped,
    genders: gendersMapped,
    locations: locationsMapped
  };
};

export interface SettingsViewModel {
  generatedAt: string;
  labId: string;
  projectionStatus: string;
  lastProjectionAt: string | null;
  timeRange: string;
  schemaVersion: string;
}

export interface OperationsViewModel {
  workflow: {
    avgRegistrationToCheckoutMinutes: number;
    avgCheckoutToSampleDrawMinutes: number;
    avgSampleDrawToProcessingMinutes: number;
    avgProcessingToReportSignedMinutes: number;
    avgReportSignedToReportDeliveredMinutes: number;
    avgOverallTurnaroundTimeMinutes: number;
    totalCompletedVisitsCount: number;
  };
  delivery: {
    totalRequested: number;
    totalDelivered: number;
    totalPending: number;
    avgDeliverySpeedMinutes: number;
    methodsBreakdown: Array<{
      deliveryMethod: string;
      count: number;
    }>;
  };
  health: {
    pendingOutboxEvents: number;
    deadLetterEvents: number;
    lastEventReceived: string | null;
    lastProjectionTime: string | null;
    workers: Array<{
      workerName: string;
      lastProcessedSequence: number;
      lastUpdatedAtUtc: string;
      isHealthy: boolean;
    }>;
  };
}

export const fetchSettings = async (): Promise<SettingsViewModel> => {
  const res = await controlTowerClient.get('/context');
  const k = res.data.knowledge || {};
  return {
    generatedAt: k.availableSince || new Date().toISOString(),
    labId: k.labId || 'LAB001',
    projectionStatus: k.coverage ? 'Up-to-date' : 'Syncing',
    lastProjectionAt: k.availableSince || null,
    timeRange: k.coverage || 'All Time',
    schemaVersion: '1.1'
  };
};

export const fetchOperations = async (): Promise<OperationsViewModel> => {
  const res = await controlTowerClient.get('/dashboard');
  return res.data.operational;
};

export interface SupportTicket {
  id: string;
  labId: string;
  title: string;
  description: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  category: string;
  status: 'Created' | 'InAnalysis' | 'WaitingForUpdate' | 'Closed';
  createdAt: string;
  diagnosticBundleId?: string;
  diagnosticBundleStatus?: 'Missing' | 'Processing' | 'Ready' | 'Failed';
  supportCaseId?: string;
  statusMessage?: string;
}

export interface SupportCase {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  status: 'Open' | 'InProgress' | 'Resolved' | 'Closed';
  createdAt: string;
  resolvedAt?: string;
  affectedLabsCount: number;
}

export interface KnownIssue {
  id: string;
  title: string;
  description: string;
  diagnosticFingerprint: string;
  rootCause: string;
  workaround: string;
  fixedVersion: string;
  affectedVersions: string;
  resolutionPackage: string;
}

export interface RemoteLab {
  id: string;
  labCode: string;
  labName: string;
  geographicalRegion: string;
  activeVersion: string;
  osVersion: string;
  dotNetVersion: string;
  lastSeenAt: string | null;
  status: 'Online' | 'Offline' | 'Degraded';
  rolloutRing: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  licenseType?: string;
  licenseStatus?: string;
  maximumBranches?: number;
  branchCount?: number;
  expiryDate?: string;
  enabledFeatures?: string[];
  latestSnapshot?: {
    cpuUsagePercent: number;
    memoryUsageMB: number;
    diskFreeSpaceGB: number;
    pendingOutboxCount: number;
    deadLetterCount: number;
    timestamp: string;
  } | null;
}

export interface TimelineEvent {
  time: string;
  type: string;
  description: string;
  icon: string;
}

export const fetchSupportTickets = async (): Promise<SupportTicket[]> => {
  const res = await controlTowerClient.get('/tickets');
  return res.data;
};

export const fetchSupportCases = async (): Promise<SupportCase[]> => {
  const res = await controlTowerClient.get('/cases');
  return res.data;
};

export const fetchKnownIssues = async (): Promise<KnownIssue[]> => {
  const res = await controlTowerClient.get('/knownissues');
  return res.data;
};

export const createKnownIssue = async (issue: Omit<KnownIssue, 'id'>): Promise<void> => {
  await controlTowerClient.post('/knownissues', issue);
};

export const linkTicketToCase = async (ticketId: string, caseId: string): Promise<void> => {
  await controlTowerClient.post(`/tickets/${ticketId}/link`, { caseId });
};

export const updateTicketStatus = async (ticketId: string, status: string, statusMessage: string): Promise<void> => {
  await controlTowerClient.post(`/tickets/${ticketId}/status`, { status, statusMessage });
};

export const fetchRemoteLabs = async (): Promise<RemoteLab[]> => {
  const res = await controlTowerClient.get('/labs');
  return res.data;
};

export const registerLaboratory = async (lab: {
  labName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  licenseType: string;
  maximumBranches?: number;
  expiryDate?: string;
  enabledFeatures: string[];
}): Promise<{ success: boolean; labId: string; licenseKey: string }> => {
  const res = await controlTowerClient.post('/labs', lab);
  return res.data;
};

export const updateLabRolloutRing = async (labId: string, ring: string): Promise<void> => {
  await controlTowerClient.put(`/labs/${labId}/rollout-ring`, { rolloutRing: ring });
};

export const updateLabProperties = async (labId: string, properties: {
  labName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
}): Promise<void> => {
  await controlTowerClient.put(`/labs/${labId}/properties`, properties);
};

export const manageLabLicense = async (labId: string, license: {
  licenseType?: string;
  maximumBranches?: number;
  expiryDate?: string;
  enabledFeatures?: string[];
  status?: string;
}): Promise<void> => {
  await controlTowerClient.put(`/labs/${labId}/license`, license);
};

export const extendLabTrial = async (labId: string, daysToExtend: number): Promise<{ success: boolean; newExpiry: string }> => {
  const res = await controlTowerClient.post(`/labs/${labId}/extend-trial`, { daysToExtend });
  return res.data;
};

export const regenerateLabLicenseKey = async (labId: string): Promise<{ success: boolean; licenseKey: string }> => {
  const res = await controlTowerClient.post(`/labs/${labId}/regenerate-key`);
  return res.data;
};

export const renewLabSubscription = async (labId: string): Promise<{ success: boolean; newExpiry: string }> => {
  const res = await controlTowerClient.post(`/labs/${labId}/renew-subscription`);
  return res.data;
};

export const fetchLabTimeline = async (labId: string): Promise<TimelineEvent[]> => {
  const res = await controlTowerClient.get(`/labs/${labId}/timeline`);
  return res.data;
};

export const dispatchLabCommand = async (command: { labId: string; commandType: string; payloadJson: string }): Promise<void> => {
  const base = controlTowerClient.defaults.baseURL || 'http://localhost:5069/api/controltower';
  const commandUrl = base.replace('/api/controltower', '/api/commands/queue');
  await axios.post(commandUrl, command);
};

export interface DiagnosticBundleSummary {
  bundleId: string;
  labId: string;
  status: 'Processing' | 'Ready' | 'Failed';
  bundleSizeBytes: number;
  checksumSha256: string;
  completedAt: string | null;
  errorMessage: string | null;
  manifest: any;
  hostInventory: any;
  healthSnapshot: any;
  summaryMarkdown: string;
  recentLogs: string;
}

export const fetchDiagnosticBundleSummary = async (bundleId: string): Promise<DiagnosticBundleSummary> => {
  const res = await controlTowerClient.get(`/diagnostics/${bundleId}/summary`);
  return res.data;
};

// OTA Update APIs
export interface ReleasePackageViewModel {
  id: string;
  targetArchitecture: string;
  checksumSha256: string;
  requiredFreeSpaceBytes: number;
  schemaVersion: number;
}

export interface DeploymentPolicyViewModel {
  deploymentTimeoutSeconds: number;
  heartbeatTimeoutSeconds: number;
  rollbackThresholdPercentage: number;
}

export interface ReleaseViewModel {
  id: string;
  version: string;
  releaseNotes: string;
  rolloutRing: 'Canary' | 'Early' | 'Production';
  canaryPercentage: number;
  status: 'Draft' | 'Beta' | 'Stable' | 'Deprecated' | 'Paused' | 'Cancelled';
  createdAt: string;
  publishedAt: string | null;
  packages: ReleasePackageViewModel[];
  policy: DeploymentPolicyViewModel | null;
}

export interface DeploymentEventViewModel {
  eventType: string;
  occurredAt: string;
  payloadJson: string | null;
}

export interface DeploymentViewModel {
  id: string;
  labId: string;
  labName: string;
  releaseId: string;
  status: 'Pending' | 'Downloading' | 'Installing' | 'Success' | 'Completed' | 'Failed' | 'RolledBack' | 'Cancelled';
  startedAt: string;
  updatedAt: string;
  events: DeploymentEventViewModel[];
}

export const fetchReleases = async (): Promise<ReleaseViewModel[]> => {
  const res = await controlTowerClient.get('/releases');
  return res.data;
};

export const uploadReleasePackage = async (formData: FormData): Promise<void> => {
  await controlTowerClient.post('/releases', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const publishRelease = async (id: string, canaryPercentage: number): Promise<void> => {
  await controlTowerClient.post(`/releases/${id}/publish?canaryPercentage=${canaryPercentage}`);
};

export const pauseRelease = async (id: string): Promise<void> => {
  await controlTowerClient.post(`/releases/${id}/pause`);
};

export const resumeRelease = async (id: string): Promise<void> => {
  await controlTowerClient.post(`/releases/${id}/resume`);
};

export const cancelRelease = async (id: string): Promise<void> => {
  await controlTowerClient.post(`/releases/${id}/cancel`);
};

export const fetchDeployments = async (): Promise<DeploymentViewModel[]> => {
  const res = await controlTowerClient.get('/deployments');
  return res.data;
};

export interface EligibilityDetail {
  labId: string;
  labName: string;
  eligible: boolean;
  failedAt: string | null;
  reason: string;
  reasonDetail: string;
  currentVersion: string;
  targetVersion: string;
  ring: string;
}

export interface EligibilityResponse {
  summary: {
    eligible: number;
    disabled: number;
    ringMismatch: number;
    unconfigured: number;
    alreadyNewer: number;
    canaryPercentage: number;
  };
  labs: EligibilityDetail[];
}

export const fetchReleaseEligibility = async (version: string): Promise<EligibilityResponse> => {
  const res = await controlTowerClient.get(`/releases/${version}/eligibility`);
  return res.data;
};



