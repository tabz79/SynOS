// File: web/src/services/formattingUtils.ts
// Centralized formatting utilities to ensure no duplication and keep components presentation-only.

/**
 * Formats a number to Indian currency representation (e.g., ₹1,246)
 */
export const formatRupees = (value: number): string => {
  if (isNaN(value) || value === null || value === undefined) return '₹0';
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
};

/**
 * Formats a value into Lakhs formatting (e.g. ₹12.48L) for values >= 1,000,000 or custom scales.
 */
export const formatLakhs = (value: number): string => {
  if (isNaN(value) || value === null || value === undefined) return '₹0.00L';
  
  // Format as Lakhs (1 Lakh = 100,000)
  const lakhs = value / 100000;
  return `₹${lakhs.toFixed(2)}L`;
};

/**
 * Formats a number as a percentage (e.g., 62.0%)
 */
export const formatPercentage = (value: number): string => {
  if (isNaN(value) || value === null || value === undefined) return '0.0%';
  return `${value.toFixed(1)}%`;
};

/**
 * Formats an ISO string or date into a readable date (e.g., 27 June 2026)
 */
export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    
    const day = d.getDate();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    
    return `${day} ${month} ${year}`;
  } catch {
    return 'N/A';
  }
};

/**
 * Formats an ISO string or date into a 24h clock string (e.g. 09:18 IST)
 */
export const formatTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    
    return `${hours}:${minutes} IST`;
  } catch {
    return 'N/A';
  }
};

/**
 * Calculates a relative timestamp string (e.g. 2 mins ago)
 */
export const formatRelativeTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'Never';
  try {
    const past = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - past.getTime();
    
    if (isNaN(diffMs) || diffMs < 0) return 'Just now';
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } catch {
    return 'N/A';
  }
};
