'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ReminderType, type Contact, type PartyEvent } from '@/lib/types';
import { getCategoryDotColor, getVisualDate, getBirthdayStatus, getDaysUntil, getNextBirthdays } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { AddEditContact } from '@/components/AddEditContact';
import { ContactCard } from '@/components/ContactCard';
import { ContactDetailModal } from '@/components/ContactDetailModal';
import { SettingsModal } from '@/components/SettingsModal';
import { InviteModal } from '@/components/InviteModal';
import AcceptShareModal from '@/components/AcceptShareModal';
import PendingSharesNotification from '@/components/PendingSharesNotification';
import { AddEditEvent } from '@/components/AddEditEvent';
import { EventCard } from '@/components/EventCard';
import {
    Plus, Check, Search, Calendar as CalendarIcon, List, PartyPopper,
    ChevronDown, ChevronRight, ChevronLeft, LogOut, Settings, Shield, UserPlus,
    X, Trophy, Flame, Sparkles, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { createContact, createContacts, updateContact, deleteContact, markAsWished } from '@/lib/contact-actions';
import { handleSignOut, updateNotificationPreference } from '@/lib/actions';

interface DashboardClientProps {
    initialContacts: Contact[];
    initialEvents: PartyEvent[];
    userName?: string | null;
    isAdmin?: boolean;
    initialCategories: string[];
    initialNotificationPref: boolean;
    stats: {
        streak: number;
        wishesDelivered: number;
    };
    pendingInvitation?: {
        token: string;
        senderName: string | null;
        contactCount: number;
    } | null;
    hasPendingShares?: boolean;
    isMyBirthday?: boolean;
    userBirthday?: { day: number; month: number } | null;
}

// --- Small helpers ---
type Toast = { id: string; message: string; type: 'success' | 'error' };
type ConfirmState = { message: string; onConfirm: () => void } | null;

const normalizeContact = (contact: any): Contact => ({
    ...contact,
    year: contact.year ?? undefined,
    phone: contact.phone ?? undefined,
    relationship: contact.relationship ?? 'Friend',
    reminderType: (contact.reminderType ?? ReminderType.MORNING) as ReminderType,
    notes: contact.notes ?? undefined,
    lastWishedYear: contact.lastWishedYear ?? undefined,
    parentId: contact.parentId ?? undefined,
});

export default function DashboardClient({
    initialContacts,
    initialEvents,
    userName,
    isAdmin,
    initialCategories,
    initialNotificationPref,
    stats,
    pendingInvitation,
    hasPendingShares,
    isMyBirthday,
    userBirthday,
}: DashboardClientProps) {
    const router = useRouter();

    const [contacts, setContacts] = useState<Contact[]>(() => initialContacts.map(normalizeContact));
    const [events, setEvents] = useState<PartyEvent[]>(initialEvents);

    // --- View state (2 tabs) ---
    const [view, setView] = useState<'birthdays' | 'events'>('birthdays');
    const [birthdayView, setBirthdayView] = useState<'list' | 'grid'>('list');

    // --- Calendar grid state ---
    const [calViewDate, setCalViewDate] = useState<Date>(() => {
        const d = new Date();
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [selectedCalDay, setSelectedCalDay] = useState<Date | null>(null);

    // --- FAB state ---
    const [isFabOpen, setIsFabOpen] = useState(false);

    // --- Modal state ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [wantsNotifications, setWantsNotifications] = useState(initialNotificationPref);
    const [editingContact, setEditingContact] = useState<Contact | undefined>(undefined);
    const [editingEvent, setEditingEvent] = useState<PartyEvent | undefined>(undefined);
    const [selectedContact, setSelectedContact] = useState<Contact | undefined>(undefined);

    // --- Search / filter ---
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRel, setFilterRel] = useState<string>('All');

    // --- Month expand state (list view) ---
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>(() => {
        const m = new Date().toLocaleString('default', { month: 'long' });
        return { [m]: true };
    });

    // --- Toast system ---
    const [toasts, setToasts] = useState<Toast[]>([]);
    const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    // --- Confirm modal ---
    const [confirm, setConfirm] = useState<ConfirmState>(null);
    const showConfirm = useCallback((message: string, onConfirm: () => void) => {
        setConfirm({ message, onConfirm });
    }, []);

    // --- Categories ---
    const categories = useMemo(() => {
        const cats = new Set<string>(initialCategories);
        contacts.forEach(c => c.relationship && cats.add(c.relationship));
        return Array.from(cats).sort();
    }, [contacts, initialCategories]);

    // --- Sorted / filtered contacts ---
    const sortedContacts = useMemo(() => {
        let filtered = contacts.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filterRel !== 'All') {
            filtered = filtered.filter(c => c.relationship === filterRel);
        }
        return filtered.sort((a, b) => {
            const dateA = getVisualDate(a.day, a.month);
            const dateB = getVisualDate(b.day, b.month);
            return dateA.getTime() - dateB.getTime();
        });
    }, [contacts, searchQuery, filterRel]);

    // --- Next Up items (birthdays + events in next 14 days) ---
    const nextUpItems = useMemo(() => {
        const unwished = contacts.filter(c => getBirthdayStatus(c) !== 'wished');
        const upcomingBirthdays = getNextBirthdays(unwished, 5).filter(c => getDaysUntil(c.day, c.month) <= 14);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcomingEvents = events.filter(e => {
            const d = new Date(e.date);
            return d >= today && d <= new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
        });
        const items = [
            ...upcomingBirthdays.map(c => ({ type: 'birthday' as const, data: c, date: getVisualDate(c.day, c.month) })),
            ...upcomingEvents.map(e => ({ type: 'event' as const, data: e, date: new Date(e.date) })),
        ];
        return items.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 10);
    }, [contacts, events]);

    // --- Auto-celebrate today's birthdays + user's own birthday ---
    useEffect(() => {
        const hasBirthdayToday = isMyBirthday || contacts.some(c => getBirthdayStatus(c) === 'today');
        if (hasBirthdayToday) {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
            const interval: any = setInterval(() => {
                const timeLeft = animationEnd - Date.now();
                if (timeLeft <= 0) return clearInterval(interval);
                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);
        }
    }, [contacts]);

    // --- Handlers ---
    const openNewContactModal = () => {
        setEditingContact(undefined);
        setIsModalOpen(true);
        setIsFabOpen(false);
    };

    const openNewEventModal = () => {
        setEditingEvent(undefined);
        setIsEventModalOpen(true);
        setIsFabOpen(false);
    };

    const handleSaveContact = async (contact: Contact) => {
        try {
            if (editingContact) {
                const updated = normalizeContact(await updateContact(contact.id, contact));
                setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
                showToast('Buddy updated!');
            } else {
                const { id, ...contactData } = contact;
                const created = normalizeContact(await createContact(contactData));
                setContacts(prev => [...prev, created]);
                showToast('Buddy added! 🎉');
            }
            setIsModalOpen(false);
            setEditingContact(undefined);
        } catch {
            showToast('Failed to save contact', 'error');
        }
    };

    const handleDelete = (id: string) => {
        showConfirm('Delete this contact? This cannot be undone.', async () => {
            try {
                await deleteContact(id);
                setContacts(prev => prev.filter(c => c.id !== id));
                showToast('Contact deleted');
            } catch {
                showToast('Failed to delete contact', 'error');
            }
        });
    };

    const handleWish = async (id: string, forceState?: boolean) => {
        try {
            const shouldMark = forceState !== undefined ? forceState : true;
            await markAsWished(id, shouldMark);
            const currentYear = new Date().getFullYear();
            setContacts(prev => prev.map(c =>
                c.id === id ? { ...c, lastWishedYear: shouldMark ? currentYear : undefined } : c
            ));
            if (shouldMark) {
                confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#6366f1', '#a855f7', '#ec4899'] });
            }
        } catch {
            showToast('Failed to update wish status', 'error');
        }
    };

    const handleEventSave = (event: PartyEvent) => {
        const normalized = { ...event, date: new Date(event.date) };
        if (editingEvent) {
            setEvents(prev => prev.map(e => e.id === normalized.id ? normalized : e));
            showToast('Event updated!');
        } else {
            setEvents(prev => [...prev, normalized].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
            showToast('Event created! 🎉');
        }
        setIsEventModalOpen(false);
        setEditingEvent(undefined);
    };

    const handleEventDelete = (id: string) => {
        setEvents(prev => prev.filter(e => e.id !== id));
        showToast('Event deleted');
    };

    const handleToggleNotifications = async (enabled: boolean) => {
        try {
            const result = await updateNotificationPreference(enabled);
            if (result.success) {
                setWantsNotifications(enabled);
            } else {
                showToast('Failed to update notification settings', 'error');
            }
        } catch {
            showToast('Failed to update settings', 'error');
        }
    };

    const handleImportJSON = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const text = evt.target?.result as string;
                const data = JSON.parse(text);
                if (data.contacts && Array.isArray(data.contacts)) {
                    showConfirm(`Restore ${data.contacts.length} contacts?`, async () => {
                        const cleanContacts = data.contacts.map((c: any) => ({
                            name: c.name, day: c.day, month: c.month, year: c.year,
                            phone: c.phone, relationship: c.relationship,
                            reminderType: c.reminderType, notes: c.notes,
                            lastWishedYear: c.lastWishedYear, parentId: c.parentId,
                        }));
                        await createContacts(cleanContacts);
                        router.refresh();
                        showToast('Contacts restored!');
                        setIsModalOpen(false);
                    });
                }
            } catch {
                showToast('Failed to parse file', 'error');
            }
        };
        reader.readAsText(file);
    };

    const handleImportCSV = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const text = evt.target?.result as string;
            const lines = text.split('\n').slice(1);
            const newContacts: any[] = [];
            lines.forEach((line) => {
                const [name, date, phone] = line.split(',');
                if (name && date) {
                    const parts = date.trim().split('-');
                    if (parts.length === 3) {
                        newContacts.push({
                            name: name.trim(), day: parseInt(parts[2]), month: parseInt(parts[1]),
                            year: parseInt(parts[0]), phone: phone?.trim(),
                            relationship: 'Other', reminderType: 'Morning of',
                        });
                    }
                }
            });
            if (newContacts.length > 0) {
                await createContacts(newContacts);
                router.refresh();
                showToast(`Imported ${newContacts.length} contacts!`);
            }
        };
        reader.readAsText(file);
    };

    // --- Month toggle ---
    const toggleMonth = (month: string) => {
        setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }));
    };

    // =========================================================
    // RENDER: List View
    // =========================================================
    const renderContactGroup = (groupContacts: Contact[], monthKey: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const filtered = groupContacts.filter(c => {
            const visualDate = getVisualDate(c.day, c.month);
            if (visualDate >= today) return true;
            if (getBirthdayStatus(c) === 'wished') return false;
            return true;
        });
        if (filtered.length === 0) {
            return <div key={`group-${monthKey}`} className="py-3 text-center text-xs text-slate-300 italic">No pending birthdays.</div>;
        }
        return (
            <div key={`group-${monthKey}`} className="space-y-2 mb-4 mt-2 animate-fade-in">
                {filtered.map(contact => {
                    const parent = contact.parentId ? contacts.find(c => c.id === contact.parentId) : undefined;
                    return (
                        <ContactCard
                            key={contact.id}
                            contact={contact}
                            parentContact={parent}
                            onWish={handleWish}
                            onEdit={(c: Contact) => { setEditingContact(c); setIsModalOpen(true); }}
                            onDelete={(c) => handleDelete(c.id)}
                        />
                    );
                })}
            </div>
        );
    };

    const renderListWithSeparators = () => {
        const monthCounts: Record<string, number> = {};
        sortedContacts.forEach(contact => {
            const monthName = getVisualDate(contact.day, contact.month).toLocaleString('default', { month: 'long' });
            monthCounts[monthName] = (monthCounts[monthName] || 0) + 1;
        });

        const groups: React.ReactNode[] = [];
        let lastMonth = '';
        let currentGroupContacts: Contact[] = [];

        sortedContacts.forEach((contact) => {
            const monthName = getVisualDate(contact.day, contact.month).toLocaleString('default', { month: 'long' });
            if (monthName !== lastMonth) {
                if (currentGroupContacts.length > 0 && expandedMonths[lastMonth]) {
                    groups.push(renderContactGroup(currentGroupContacts, lastMonth));
                }
                const isExpanded = expandedMonths[monthName];
                groups.push(
                    <button
                        key={`header-${monthName}`}
                        onClick={() => toggleMonth(monthName)}
                        className="sticky top-[116px] z-10 w-full flex items-center justify-between py-2.5 px-1 bg-slate-50/95 backdrop-blur-sm border-b border-slate-100 hover:bg-slate-100 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{monthName}</h3>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[10px] font-bold rounded-full border border-slate-200">
                                {monthCounts[monthName]}
                            </span>
                        </div>
                        {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                    </button>
                );
                lastMonth = monthName;
                currentGroupContacts = [];
            }
            currentGroupContacts.push(contact);
        });

        if (currentGroupContacts.length > 0 && expandedMonths[lastMonth]) {
            groups.push(renderContactGroup(currentGroupContacts, lastMonth));
        }

        if (groups.length === 0) {
            return (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 mt-4 animate-fade-in">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="text-slate-300" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">No buddies found</h3>
                    <p className="text-slate-500 text-sm max-w-[200px] mx-auto mb-6">
                        {searchQuery ? 'Try a different search term or clear filters.' : 'Start by adding your first birthday buddy!'}
                    </p>
                    <button
                        onClick={openNewContactModal}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                        <Plus size={18} /> Add Buddy
                    </button>
                </div>
            );
        }
        return <div className="space-y-0 pb-20">{groups}</div>;
    };

    // =========================================================
    // RENDER: Calendar Grid View
    // =========================================================
    const renderCalendarGrid = () => {
        const year = calViewDate.getFullYear();
        const month = calViewDate.getMonth(); // 0-indexed
        const totalDays = new Date(year, month + 1, 0).getDate();

        let startDow = new Date(year, month, 1).getDay();
        startDow = startDow === 0 ? 6 : startDow - 1; // Mon=0 … Sun=6

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Map day → {contacts, events}
        const dayMap: Record<number, { contacts: Contact[]; events: PartyEvent[] }> = {};
        contacts.forEach(c => {
            if (c.month === month + 1) {
                if (!dayMap[c.day]) dayMap[c.day] = { contacts: [], events: [] };
                dayMap[c.day].contacts.push(c);
            }
        });
        events.forEach(e => {
            const d = new Date(e.date);
            if (d.getFullYear() === year && d.getMonth() === month) {
                const day = d.getDate();
                if (!dayMap[day]) dayMap[day] = { contacts: [], events: [] };
                dayMap[day].events.push(e);
            }
        });

        const cells: (number | null)[] = [];
        for (let i = 0; i < startDow; i++) cells.push(null);
        for (let d = 1; d <= totalDays; d++) cells.push(d);

        const monthLabel = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
        const selDay = selectedCalDay?.getDate();
        const selMonth = selectedCalDay?.getMonth();
        const selYear = selectedCalDay?.getFullYear();
        const selItems = selDay && selMonth === month && selYear === year ? dayMap[selDay] : null;

        return (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 animate-fade-in">
                {/* Month navigation */}
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => { setCalViewDate(new Date(year, month - 1, 1)); setSelectedCalDay(null); }}
                        className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <h3 className="font-bold text-slate-800 text-sm">{monthLabel}</h3>
                    <button
                        onClick={() => { setCalViewDate(new Date(year, month + 1, 1)); setSelectedCalDay(null); }}
                        className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* Day-of-week headers */}
                <div className="grid grid-cols-7 mb-1">
                    {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                        <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{d}</div>
                    ))}
                </div>

                {/* Calendar cells */}
                <div className="grid grid-cols-7 gap-0.5">
                    {cells.map((day, i) => {
                        if (!day) return <div key={`empty-${i}`} className="aspect-square" />;
                        const cellDate = new Date(year, month, day);
                        const isToday = cellDate.getTime() === today.getTime();
                        const isSelected = selDay === day && selMonth === month && selYear === year;
                        const items = dayMap[day];
                        const hasBirthdays = (items?.contacts.length ?? 0) > 0;
                        const hasEvents = (items?.events.length ?? 0) > 0;

                        return (
                            <button
                                key={day}
                                onClick={() => items ? setSelectedCalDay(isSelected ? null : cellDate) : undefined}
                                className={`aspect-square flex flex-col items-center justify-start pt-1 rounded-lg transition-all text-slate-700
                                    ${isToday ? 'bg-indigo-600 !text-white' : ''}
                                    ${isSelected && !isToday ? 'bg-indigo-50 ring-1 ring-indigo-300' : ''}
                                    ${!isToday && items ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'}
                                `}
                            >
                                <span className={`text-xs font-medium ${isToday ? 'text-white' : 'text-slate-700'}`}>{day}</span>
                                {(hasBirthdays || hasEvents) && (
                                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                                        {items.contacts.slice(0, 3).map((c, ci) => (
                                            <div key={ci} className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : getCategoryDotColor(c.relationship)}`} />
                                        ))}
                                        {hasEvents && (
                                            <div className={`w-1 h-1 rounded-full ${isToday ? 'bg-purple-200' : 'bg-purple-500'}`} />
                                        )}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex gap-3 mt-3 pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <div className="w-2 h-2 rounded-full bg-indigo-500" /> Birthday
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <div className="w-2 h-2 rounded-full bg-purple-500" /> Event
                    </div>
                </div>

                {/* Selected day details */}
                {selItems && (
                    <div className="mt-4 space-y-2 animate-fade-in border-t border-slate-100 pt-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                            {selectedCalDay!.toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </h4>
                        {selItems.contacts.map(c => {
                            const parent = c.parentId ? contacts.find(p => p.id === c.parentId) : undefined;
                            return (
                                <ContactCard
                                    key={c.id} contact={c} parentContact={parent}
                                    onWish={handleWish}
                                    onEdit={(c) => { setEditingContact(c); setIsModalOpen(true); }}
                                    onDelete={(c) => handleDelete(c.id)}
                                />
                            );
                        })}
                        {selItems.events.map(e => (
                            <EventCard key={e.id} event={e} onEdit={(e) => { setEditingEvent(e); setIsEventModalOpen(true); }} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // =========================================================
    // MAIN RENDER
    // =========================================================
    return (
        <div className="min-h-screen bg-slate-50 pb-20 max-w-xl mx-auto shadow-2xl shadow-slate-200 border-x border-slate-100 relative">

            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Birthday Buddy</h1>
                    <div className="flex items-center gap-3 text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5">
                        <span>{userName || 'Friend'}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span className="flex items-center gap-1 text-orange-500"><Flame size={12} fill="currentColor" /> {stats.streak}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span className="flex items-center gap-1 text-yellow-500"><Trophy size={12} fill="currentColor" /> {stats.wishesDelivered}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <a href="/admin" className="p-2 rounded-full text-purple-600 hover:bg-purple-50 transition-colors" title="Admin Panel">
                            <Shield size={20} />
                        </a>
                    )}
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors"
                    >
                        <UserPlus size={16} /> Share
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 transition-colors" title="Settings">
                        <Settings size={20} />
                    </button>
                    <button onClick={() => handleSignOut()} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 transition-colors" title="Sign out">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="p-4 space-y-4">

                {/* ── Self-birthday celebration banner ── */}
                {isMyBirthday && (
                    <div className="flex items-center gap-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-3 rounded-xl animate-fade-in">
                        <span className="text-2xl">🎂</span>
                        <div>
                            <p className="font-bold">Happy Birthday, {userName?.split(' ')[0]}! 🎉</p>
                            <p className="text-xs text-white/80">Wishing you an incredible day — you deserve it!</p>
                        </div>
                    </div>
                )}

                {/* ── Pending invitation banner ── */}
                {pendingInvitation && (
                    <a
                        href={`/invite/${pendingInvitation.token}`}
                        className="flex items-center gap-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-3 rounded-xl animate-fade-in"
                    >
                        <span className="text-xl">🎁</span>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">
                                {pendingInvitation.senderName ?? 'A friend'} shared {pendingInvitation.contactCount} birthday{pendingInvitation.contactCount !== 1 ? 's' : ''} with you!
                            </p>
                            <p className="text-xs text-white/80">Tap to review and add them →</p>
                        </div>
                    </a>
                )}

                {/* ── Pending contact-share notification ── */}
                {hasPendingShares && (
                    <PendingSharesNotification onViewShares={() => setShowShareModal(true)} />
                )}

                {/* Next Up (only on birthdays tab, no active search) */}
                {view === 'birthdays' && nextUpItems.length > 0 && !searchQuery && filterRel === 'All' && (
                    <div className="pt-2 animate-fade-in mb-2">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Sparkles size={16} className="text-indigo-500" /> Next Up
                            </h2>
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Coming Up</span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 mask-gradient-right">
                            {nextUpItems.map((item, i) => {
                                if (item.type === 'birthday') {
                                    const contact = item.data as Contact;
                                    const days = getDaysUntil(contact.day, contact.month);
                                    const status = getBirthdayStatus(contact);
                                    const isToday = status === 'today';
                                    const isWished = status === 'wished';
                                    return (
                                        <div
                                            key={`next-bd-${contact.id}`}
                                            className="flex-shrink-0 w-[180px] p-3 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group relative overflow-hidden"
                                            onClick={() => setSelectedContact(contact)}
                                        >
                                            <div className={`absolute top-0 left-0 w-1 h-full ${isToday ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                                                            {new Date(2000, contact.month - 1, contact.day).toLocaleString('default', { month: 'short' })} {contact.day}
                                                        </span>
                                                        <h3 className="font-bold text-slate-900 truncate pr-1 text-sm">{contact.name}</h3>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); isToday ? handleWish(contact.id, !isWished) : setSelectedContact(contact); }}
                                                        className={`p-1.5 rounded-lg transition-colors ${isToday
                                                            ? isWished ? 'bg-green-100 text-green-600' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                                            : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                                                        }`}
                                                    >
                                                        {isToday ? <Check size={14} strokeWidth={3} /> : <Plus size={14} />}
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isToday ? 'bg-rose-100 text-rose-700' : 'bg-indigo-50 text-indigo-700'}`}>
                                                        {isToday ? 'TODAY!' : days === 1 ? 'Tomorrow' : `In ${days} days`}
                                                    </span>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${getCategoryDotColor(contact.relationship)}`} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                } else {
                                    const event = item.data as PartyEvent;
                                    const d = new Date(event.date);
                                    return (
                                        <div
                                            key={`next-evt-${event.id}`}
                                            onClick={() => { setEditingEvent(event); setIsEventModalOpen(true); }}
                                            className="flex-shrink-0 w-[180px] p-3 rounded-2xl bg-white border-2 border-purple-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
                                        >
                                            <div className="flex flex-col gap-2">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-bold text-purple-600 uppercase tracking-tighter flex items-center gap-1">
                                                        <PartyPopper size={10} /> {d.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                    </span>
                                                    <h3 className="font-bold text-slate-900 truncate pr-1 text-sm">{event.name}</h3>
                                                </div>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 self-start">
                                                    {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    </div>
                )}

                {/* Search + Filter (always together) */}
                {view === 'birthdays' && (
                    <div className="sticky top-[73px] z-20 bg-slate-50/95 backdrop-blur-sm py-2 border-b border-slate-100 space-y-2">
                        {/* Search row + view toggle */}
                        <div className="flex items-center gap-2">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-200 rounded-full text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            {/* List / Grid toggle */}
                            <div className="flex bg-white border border-slate-200 rounded-full p-0.5 gap-0.5">
                                <button
                                    onClick={() => setBirthdayView('list')}
                                    className={`p-1.5 rounded-full transition-colors ${birthdayView === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                                    title="List view"
                                >
                                    <List size={16} />
                                </button>
                                <button
                                    onClick={() => setBirthdayView('grid')}
                                    className={`p-1.5 rounded-full transition-colors ${birthdayView === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                                    title="Calendar view"
                                >
                                    <CalendarIcon size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Filter chips (hidden in calendar grid mode) */}
                        {birthdayView === 'list' && (
                            <div className="flex gap-2 overflow-x-auto no-scrollbar mask-gradient-right">
                                <button
                                    onClick={() => setFilterRel('All')}
                                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterRel === 'All' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                                >
                                    All
                                </button>
                                {categories.map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setFilterRel(r)}
                                        className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterRel === r ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Birthdays tab content */}
                {view === 'birthdays' && (
                    birthdayView === 'list'
                        ? <div className="animate-fade-in">{renderListWithSeparators()}</div>
                        : renderCalendarGrid()
                )}

                {/* Events tab content */}
                {view === 'events' && (
                    <div className="animate-fade-in space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">Parties & Events</h2>
                            <button
                                onClick={openNewEventModal}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
                            >
                                <Plus size={16} /> New Event
                            </button>
                        </div>
                        {events.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
                                <PartyPopper className="mx-auto text-slate-300 mb-2" size={32} />
                                <p className="text-slate-500 font-medium mb-1">No events planned yet</p>
                                <p className="text-slate-400 text-sm">Track parties, RSVP, and gift planning here.</p>
                            </div>
                        ) : (
                            events.map(event => (
                                <EventCard
                                    key={event.id} event={event}
                                    onEdit={(e) => { setEditingEvent(e); setIsEventModalOpen(true); }}
                                />
                            ))
                        )}
                    </div>
                )}
            </main>

            {/* FAB */}
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-xl pointer-events-none z-20">
                {/* Backdrop to close FAB */}
                {isFabOpen && (
                    <div className="fixed inset-0 z-10 pointer-events-auto" onClick={() => setIsFabOpen(false)} />
                )}

                {/* Sub-actions */}
                <div className={`absolute right-6 bottom-16 flex flex-col gap-3 transition-all duration-200 pointer-events-auto z-20
                    ${isFabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                    <button onClick={openNewEventModal} className="flex items-center justify-end gap-3">
                        <span className="bg-white px-3 py-1 rounded-lg shadow-sm text-xs font-bold text-slate-600 border border-slate-100">Party / Event</span>
                        <div className="w-10 h-10 bg-purple-600 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                            <PartyPopper size={18} />
                        </div>
                    </button>
                    <button onClick={openNewContactModal} className="flex items-center justify-end gap-3">
                        <span className="bg-white px-3 py-1 rounded-lg shadow-sm text-xs font-bold text-slate-600 border border-slate-100">New Buddy</span>
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                            <UserPlus size={18} />
                        </div>
                    </button>
                </div>

                {/* Main FAB button */}
                <button
                    onClick={() => setIsFabOpen(prev => !prev)}
                    className={`absolute right-6 bottom-0 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center hover:scale-105 active:scale-95 transition-all pointer-events-auto z-20
                        ${isFabOpen ? 'rotate-45 bg-slate-700' : ''}`}
                >
                    <Plus size={28} strokeWidth={2.5} className="transition-transform duration-300" />
                </button>
            </div>

            {/* Bottom nav (2 tabs) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 flex justify-around items-center z-30 max-w-xl mx-auto">
                <button
                    onClick={() => setView('birthdays')}
                    className={`flex flex-col items-center gap-1 ${view === 'birthdays' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <CalendarIcon size={24} />
                    <span className="text-[10px] font-medium">Birthdays</span>
                </button>
                <button
                    onClick={() => setView('events')}
                    className={`flex flex-col items-center gap-1 ${view === 'events' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <PartyPopper size={24} />
                    <span className="text-[10px] font-medium">Events</span>
                </button>
            </nav>

            {/* Modals */}
            {isModalOpen && (
                <AddEditContact
                    onSave={handleSaveContact}
                    onClose={() => { setIsModalOpen(false); setEditingContact(undefined); }}
                    initialData={editingContact}
                    categories={categories}
                    contacts={contacts}
                />
            )}

            {isEventModalOpen && (
                <AddEditEvent
                    onClose={() => { setIsEventModalOpen(false); setEditingEvent(undefined); }}
                    onSave={handleEventSave}
                    onDelete={handleEventDelete}
                    initialData={editingEvent}
                    contacts={contacts}
                />
            )}

            {showInviteModal && (
                <InviteModal contacts={contacts} onClose={() => setShowInviteModal(false)} userBirthday={userBirthday ?? undefined} userName={userName ?? undefined} />
            )}

            <AcceptShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} />

            {isSettingsOpen && (
                <SettingsModal
                    onClose={() => setIsSettingsOpen(false)}
                    wantsNotifications={wantsNotifications}
                    onToggleNotifications={handleToggleNotifications}
                    onExport={() => {
                        const headers = ['name', 'day', 'month', 'year', 'relationship', 'phone', 'reminderType', 'notes'];
                        const rows = contacts.map(c => [
                            c.name, c.day.toString(), c.month.toString(), c.year?.toString() || '',
                            c.relationship || '', c.phone || '', c.reminderType || 'MORNING', c.notes || '',
                        ]);
                        const csvContent = [headers.join(','), ...rows.map(row =>
                            row.map(cell => (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
                                ? `"${cell.replace(/"/g, '""')}"` : cell
                            ).join(',')
                        )].join('\n');
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = 'birthday-buddy-contacts.csv'; a.click();
                        URL.revokeObjectURL(url);
                    }}
                    onImportCSV={handleImportCSV}
                />
            )}

            {selectedContact && (
                <ContactDetailModal
                    contact={selectedContact}
                    parentContact={selectedContact.parentId ? contacts.find(c => c.id === selectedContact.parentId) : undefined}
                    contactEvents={events.filter(e => e.contactId === selectedContact.id)}
                    onWish={handleWish}
                    onEdit={(c) => { setSelectedContact(undefined); setEditingContact(c); setIsModalOpen(true); }}
                    onClose={() => setSelectedContact(undefined)}
                />
            )}

            {/* Toast notifications */}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none w-full max-w-xs px-4">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-down
                            ${toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`}
                    >
                        {toast.type === 'success'
                            ? <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
                            : <AlertCircle size={16} className="text-red-200 flex-shrink-0" />
                        }
                        {toast.message}
                    </div>
                ))}
            </div>

            {/* Confirm modal */}
            {confirm && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-slide-up">
                        <p className="text-slate-800 font-medium mb-6 leading-relaxed">{confirm.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirm(null)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { confirm.onConfirm(); setConfirm(null); }}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slide-up {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes slide-down {
                    from { transform: translateY(-10px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                .animate-slide-down { animation: slide-down 0.2s ease-out; }
                .animate-fade-in { animation: fade-in 0.4s ease-out; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
