const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

export function formatBirthday(day: number, month: number, year?: number | null): string {
    const m = MONTHS[Math.max(0, Math.min(11, month - 1))];
    return year ? `${m} ${day}, ${year}` : `${m} ${day}`;
}

export function monthName(month: number): string {
    return MONTHS_FULL[Math.max(0, Math.min(11, month - 1))];
}

/** Days until next occurrence of this birthday (0 = today) */
export function daysUntilBirthday(day: number, month: number, today = new Date()): number {
    const y = today.getFullYear();
    const todayMidnight = new Date(y, today.getMonth(), today.getDate());
    const next = new Date(y, month - 1, day);
    if (next < todayMidnight) next.setFullYear(y + 1);
    return Math.round((next.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
}

/** Visual sort date — missed-this-month stays in current month; everything else sorted by next occurrence */
export function visualSortDate(day: number, month: number): Date {
    const today = new Date();
    const y = today.getFullYear();
    const todayMidnight = new Date(y, today.getMonth(), today.getDate());
    const d = new Date(y, month - 1, day);
    // Only push to next year if the birthday has passed AND is NOT in the current month.
    // Same-month birthdays that have passed are "missed" — keep them visible here.
    const isCurrentMonth = d.getMonth() === todayMidnight.getMonth();
    if (d < todayMidnight && !isCurrentMonth) d.setFullYear(y + 1);
    return d;
}

export type BirthdayStatus = 'today' | 'missed' | 'wished' | 'upcoming';

export function getBirthdayStatus(
    day: number, month: number, lastWishedYear: number | null
): BirthdayStatus {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = today.getFullYear();
    const bday = new Date(year, month - 1, day);
    // Today always shows — even if already wished
    if (bday.getTime() === today.getTime()) return 'today';
    // Wished on a past day → hide from list
    if (lastWishedYear === year) return 'wished';
    // Missed = same month, already passed, not yet wished
    if (bday < today && bday.getMonth() === today.getMonth()) return 'missed';
    return 'upcoming';
}

export function relativeLabel(days: number): string {
    if (days === 0) return 'Today! 🎉';
    if (days === 1) return 'Tomorrow';
    if (days <= 7) return `In ${days} days`;
    if (days <= 14) return `In ${days} days`;
    return `${days}d`;
}

export function ageturning(day: number, month: number, birthYear: number | null): number | null {
    if (!birthYear) return null;
    const today = new Date();
    let age = today.getFullYear() - birthYear;
    const hadBirthday =
        today.getMonth() + 1 > month ||
        (today.getMonth() + 1 === month && today.getDate() >= day);
    if (!hadBirthday) age--;
    return age + 1; // turning age
}
