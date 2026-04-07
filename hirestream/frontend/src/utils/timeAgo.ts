/**
 * formatTimeAgo — Robust UTC-aware relative time formatter
 *
 * The backend stores timestamps as naive UTC via datetime.utcnow() and now
 * always serializes them with a trailing "Z" (e.g. "2026-03-29T05:30:00Z").
 *
 * JavaScript's Date constructor treats strings WITHOUT a timezone designator
 * as LOCAL time, causing an IST offset error of 5.5 hours. This utility
 * always forces UTC interpretation as a safety net even for legacy strings.
 */

function parseUTC(ts: string): Date {
    if (!ts) return new Date();
    // If already has timezone info (Z or +HH:MM), parse directly
    if (ts.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(ts)) {
        return new Date(ts);
    }
    // Naive datetime string from backend — treat as UTC by appending Z
    return new Date(ts + 'Z');
}

/**
 * Returns a human-friendly relative time string:
 *   "just now" | "2 minutes ago" | "1 hour ago" | "Yesterday at 4:15 PM" | "Mar 28, 2026 · 10:30 AM"
 */
export function formatTimeAgo(ts: string): string {
    const date = parseUTC(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    // Guard against future timestamps (clock skew)
    if (diffMs < 0) return 'just now';

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffSec < 60)   return 'just now';
    if (diffMin < 60)   return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
    if (diffHrs < 24)   return diffHrs === 1 ? '1 hour ago'   : `${diffHrs} hours ago`;
    if (diffDays === 1) return `Yesterday at ${formatLocalTime(date)}`;
    if (diffDays < 7)   return `${diffDays} days ago`;

    return `${formatLocalDate(date)} · ${formatLocalTime(date)}`;
}

/**
 * Returns a full timestamp string:
 *   "Today 10:32 AM" | "Yesterday 4:15 PM" | "Mar 28 · 9:00 AM"
 */
export function formatFullTimestamp(ts: string): string {
    const date = parseUTC(ts);
    const now = new Date();

    const isToday =
        date.getFullYear() === now.getFullYear() &&
        date.getMonth()    === now.getMonth() &&
        date.getDate()     === now.getDate();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
        date.getFullYear() === yesterday.getFullYear() &&
        date.getMonth()    === yesterday.getMonth() &&
        date.getDate()     === yesterday.getDate();

    if (isToday)     return `Today ${formatLocalTime(date)}`;
    if (isYesterday) return `Yesterday ${formatLocalTime(date)}`;
    return `${formatLocalDate(date)} · ${formatLocalTime(date)}`;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function formatLocalTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatLocalDate(date: Date): string {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}
