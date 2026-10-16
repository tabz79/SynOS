import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

/**
 * Enterprise Compact Date Formatter: YYYY-MM-DD HH:mm
 * Keeps tables dense and prevents long ISO timestamps from expanding printable A4 bounds.
 */
export function formatDateCompact(val) {
    if (!val) return '—';
    try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return String(val);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${day} ${hh}:${mm}`;
    } catch {
        return String(val);
    }
}

