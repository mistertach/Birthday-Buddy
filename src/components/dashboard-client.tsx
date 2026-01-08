'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ReminderType, type Contact } from '@/lib/types';
import { getCategoryDotColor, getVisualDate, getBirthdayStatus, getDaysUntil, getNextBirthdays } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { AddEditContact } from '@/components/AddEditContact';
import { ContactCard } from '@/components/ContactCard';
import { ContactDetailModal } from '@/components/ContactDetailModal';

import { SettingsModal } from '@/components/SettingsModal';
import { InviteModal } from '@/components/InviteModal';
import PendingSharesNotification from '@/components/PendingSharesNotification';
import AcceptShareModal from '@/components/AcceptShareModal';
import {
    Plus,
    Check,
    Search,
    Calendar as CalendarIcon,
    List,
    ChevronDown,
    ChevronRight,
    LogOut,
    Settings,
    Shield,
    UserPlus,
    X,
    Trophy,
    Flame,
    Sparkles
} from 'lucide-react';
import { createContact, createContacts, updateContact, deleteContact, markAsWished } from '@/lib/contact-actions';
import { handleSignOut, updateNotificationPreference } from '@/lib/actions';

interface DashboardClientProps {
    initialContacts: Contact[];
    userName?: string | null;
    isAdmin?: boolean;
    initialCategories: string[];
    initialNotificationPref: boolean;
    stats: {
        streak: number;
        wishesDelivered: number;
    };
}

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
    userName,
    isAdmin,
    initialCategories,
    initialNotificationPref,
    stats,
}: DashboardClientProps) {
    const [contacts, setContacts] = useState<Contact[]>(() => initialContacts.map(normalizeContact));
    const [view, setView] = useState<'list' | 'calendar'>('list');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [wantsNotifications, setWantsNotifications] = useState(initialNotificationPref);
    const [editingContact, setEditingContact] = useState<Contact | undefined>(undefined);
    const openNewContactModal = () => {
        setEditingContact(undefined);
        setIsModalOpen(true);
    };
    const [selectedContact, setSelectedContact] = useState<Contact | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [filterRel, setFilterRel] = useState<string>('All');



    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>(() => {
        const m = new Date().toLocaleString('default', { month: 'long' });
        return { [m]: true };
    });

    // Merge global categories with any unique ones found in user's contacts
    const categories = useMemo(() => {
        const cats = new Set<string>(initialCategories);
        contacts.forEach(c => c.relationship && cats.add(c.relationship));
        return Array.from(cats).sort();
    }, [contacts, initialCategories]);

    const toggleMonth = (month: string) => {
        setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }));
    };

    const handleSaveContact = async (contact: Contact) => {
        try {
            if (editingContact) {
                const updated = normalizeContact(await updateContact(contact.id, contact));
                setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
            } else {
                const created = normalizeContact(await createContact(contact));
                setContacts(prev => [...prev, created]);
            }
            setIsModalOpen(false);
            setEditingContact(undefined);
        } catch (error) {
            console.error('Failed to save contact:', error);
            alert('Failed to save contact');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Delete this contact?')) {
            try {
                await deleteContact(id);
                setContacts(prev => prev.filter(c => c.id !== id));
            } catch (error) {
                console.error('Failed to delete:', error);
                alert('Failed to delete contact');
            }
        }
    };

    const handleWish = async (id: string, forceState?: boolean) => {
        try {
            const shouldMark = forceState !== undefined ? forceState : true;
            await markAsWished(id, shouldMark);

            const currentYear = new Date().getFullYear();
            setContacts(prev => prev.map(c =>
                c.id === id
                    ? { ...c, lastWishedYear: shouldMark ? currentYear : undefined }
                    : c
            ));
            if (shouldMark) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#6366f1', '#a855f7', '#ec4899']
                });
            }
        } catch (error) {
            console.error('Failed to update wish status:', error);
        }
    };

    const handleImportJSON = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const text = evt.target?.result as string;
                const data = JSON.parse(text);
                if (data.contacts && Array.isArray(data.contacts)) {
                    if (confirm(`Restore ${data.contacts.length} contacts?`)) {
                        // Clean data for import (remove IDs to let DB generate them)
                        const cleanContacts = data.contacts.map((c: any) => ({
                            name: c.name,
                            day: c.day,
                            month: c.month,
                            year: c.year,
                            phone: c.phone,
                            relationship: c.relationship,
                            reminderType: c.reminderType,
                            notes: c.notes,
                            lastWishedYear: c.lastWishedYear,
                            parentId: c.parentId
                        }));

                        await createContacts(cleanContacts);
                        // Refresh local state (optimistic or re-fetch)
                        // For now, we rely on revalidatePath in the action, but we should also update local state
                        // Since createContacts returns the created objects, we could use that, but revalidatePath + router.refresh() is cleaner in Next.js
                        // However, we are in a client component.
                        window.location.reload(); // Simple reload to fetch new data
                        alert("Restored successfully!");
                        setIsModalOpen(false);
                    }
                }
            } catch (e) {
                console.error(e);
                alert("Failed to parse file.");
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
                            name: name.trim(),
                            day: parseInt(parts[2]),
                            month: parseInt(parts[1]),
                            year: parseInt(parts[0]),
                            phone: phone?.trim(),
                            relationship: 'Other',
                            reminderType: 'Morning of'
                        });
                    }
                }
            });
            if (newContacts.length > 0) {
                await createContacts(newContacts);
                window.location.reload();
                alert(`Imported ${newContacts.length} contacts!`);
            }
        };
        reader.readAsText(file);
    };

    // Auto-celebrate today's birthdays on load
    useEffect(() => {
        const hasBirthdayToday = contacts.some(c => getBirthdayStatus(c) === 'today');
        if (hasBirthdayToday) {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                // since particles fall down, start a bit higher than average
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);
        }
    }, [contacts]);

    const handleToggleNotifications = async (enabled: boolean) => {
        try {
            const result = await updateNotificationPreference(enabled);
            if (result.success) {
                setWantsNotifications(enabled);
            } else {
                alert('Failed to update notification settings');
            }
        } catch (error) {
            console.error('Failed to toggle notifications:', error);
            alert('Failed to update settings');
        }
    };

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

    const nextUpContacts = useMemo(() => {
        // Filter out those that have already been wished this year
        const unwished = contacts.filter(c => getBirthdayStatus(c) !== 'wished');
        return getNextBirthdays(unwished, 3).filter(c => {
            const days = getDaysUntil(c.day, c.month);
            return days <= 7; // Only show next 7 days in "Next Up"
        });
    }, [contacts]);

    const renderListWithSeparators = () => {
        const groups: React.ReactNode[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Pre-calculate counts for each month in the current sorted list
        const monthCounts: Record<string, number> = {};
        sortedContacts.forEach(contact => {
            const visualDate = getVisualDate(contact.day, contact.month);
            const monthName = visualDate.toLocaleString('default', { month: 'long' });
            monthCounts[monthName] = (monthCounts[monthName] || 0) + 1;
        });

        let lastMonth = '';
        let currentGroupContacts: Contact[] = [];

        sortedContacts.forEach((contact) => {
            const visualDate = getVisualDate(contact.day, contact.month);
            const monthName = visualDate.toLocaleString('default', { month: 'long' });

            if (monthName !== lastMonth) {
                if (currentGroupContacts.length > 0) {
                    if (expandedMonths[lastMonth]) {
                        groups.push(renderContactGroup(currentGroupContacts, lastMonth));
                    }
                }

                const isExpanded = expandedMonths[monthName];
                groups.push(
                    <button
                        key={`header-${monthName}`}
                        onClick={() => toggleMonth(monthName)}
                        className="sticky top-[138px] z-10 w-full flex items-center justify-between py-2.5 px-1 bg-slate-50/95 backdrop-blur-sm border-b border-slate-100 hover:bg-slate-100 transition-colors"
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
                        {searchQuery ? "Try a different search term or clear filters." : "Start by adding your first birthday buddy!"}
                    </p>
                    <button
                        onClick={openNewContactModal}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                        <Plus size={18} />
                        Add Buddy
                    </button>
                </div>
            );
        }

        return <div className="space-y-0 pb-20">{groups}</div>;
    };

    const renderContactGroup = (groupContacts: Contact[], monthKey: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const filtered = groupContacts.filter(c => {
            const visualDate = getVisualDate(c.day, c.month);
            const status = getBirthdayStatus(c);

            if (visualDate >= today) return true;
            if (status === 'wished') return false;

            return true;
        });

        if (filtered.length === 0) {
            return <div key={`group-${monthKey}`} className="py-4 text-center text-xs text-slate-300 italic mb-2">No pending birthdays.</div>;
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

    const calendarMonths = useMemo(() => {
        const currentMonthIdx = new Date().getMonth();
        const months = [];
        for (let i = 0; i < 12; i++) {
            const mIdx = (currentMonthIdx + i) % 12;
            months.push(mIdx);
        }
        return months;
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 pb-20 max-w-xl mx-auto shadow-2xl shadow-slate-200 border-x border-slate-100 relative">
            <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                        Birthday Buddy
                    </h1>
                    <div className="flex items-center gap-3 text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5">
                        <span>{userName || 'Friend'}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span className="flex items-center gap-1 text-orange-500"><Flame size={12} fill="currentColor" /> {stats.streak}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span className="flex items-center gap-1 text-yellow-500"><Trophy size={12} fill="currentColor" /> {stats.wishesDelivered}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <a
                            href="/admin"
                            className="p-2 rounded-full text-purple-600 hover:bg-purple-50 transition-colors"
                            title="Admin Panel"
                        >
                            <Shield size={20} />
                        </a>
                    )}

                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors"
                    >
                        <UserPlus size={16} />
                        Share Birthdays
                    </button>

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
                        title="Settings"
                    >
                        <Settings size={20} />
                    </button>
                    <button
                        onClick={() => handleSignOut()}
                        className="p-2 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
                        title="Sign out"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="p-4 space-y-4">
                {/* StatsCard removed - stats inlined in header/subheader if needed, or see below */}

                {/* Next Up Section */}
                {nextUpContacts.length > 0 && !searchQuery && filterRel === 'All' && (
                    <div className="pt-2 animate-fade-in mb-2">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Sparkles size={16} className="text-indigo-500" />
                                Next Up
                            </h2>
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                This Week
                            </span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 mask-gradient-right">
                            {nextUpContacts.map(contact => {
                                const days = getDaysUntil(contact.day, contact.month);
                                const status = getBirthdayStatus(contact);
                                const isToday = status === 'today';
                                const isWished = status === 'wished';

                                return (
                                    <div
                                        key={`next-${contact.id}`}
                                        className="flex-shrink-0 w-[180px] p-3 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group relative overflow-hidden"
                                        onClick={() => setSelectedContact(contact)}
                                    >
                                        {/* Highlight Accent */}
                                        <div className={`absolute top-0 left-0 w-1 h-full ${isToday ? 'bg-rose-500' : 'bg-indigo-500'}`}></div>

                                        <div className="flex flex-col gap-2">
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                                                        {new Date(2000, contact.month - 1, contact.day).toLocaleString('default', { month: 'short' })} {contact.day}
                                                    </span>
                                                    <h3 className="font-bold text-slate-900 truncate pr-1 text-sm">{contact.name}</h3>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (isToday) {
                                                            handleWish(contact.id, !isWished);
                                                        } else {
                                                            setSelectedContact(contact);
                                                        }
                                                    }}
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
                                                <div className={`w-1.5 h-1.5 rounded-full ${getCategoryDotColor(contact.relationship)}`}></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2 sticky top-[73px] z-20 bg-slate-50/95 backdrop-blur-sm py-2 border-b border-slate-100">
                    {isSearchOpen ? (
                        <div className="flex-1 relative animate-fade-in">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-200 rounded-full text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <button
                                onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                        >
                            <Search size={18} />
                        </button>
                    )}

                    {!isSearchOpen && (
                        <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar mask-gradient-right">
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

                {/* Minimal Stats Inline Display if desired, or relying on Header modification below */}


                {view === 'list' ? (
                    <div className="animate-fade-in">
                        {renderListWithSeparators()}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center animate-fade-in">
                        <CalendarIcon size={48} className="mx-auto text-slate-200 mb-4" />
                        <h3 className="text-lg font-bold text-slate-800">Calendar View</h3>
                        <p className="text-slate-500 mb-6">Tap a name to see details.</p>

                        <div className="grid grid-cols-1 gap-4 text-left">
                            {calendarMonths.map((monthIndex) => {
                                const monthContacts = sortedContacts.filter(c => (c.month - 1) === monthIndex);
                                monthContacts.sort((a, b) => a.day - b.day);

                                if (monthContacts.length === 0) return null;

                                const monthName = new Date(2024, monthIndex, 1).toLocaleString('default', { month: 'long' });

                                return (
                                    <div key={monthIndex} className="border-b border-slate-100 last:border-0 pb-3">
                                        <h4 className="font-bold text-indigo-900 mb-2 text-sm sticky top-0 bg-white py-1">{monthName}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {monthContacts.map(c => {
                                                const status = getBirthdayStatus(c);
                                                let dotColor = getCategoryDotColor(c.relationship);
                                                if (status === 'missed') dotColor = 'bg-rose-500';
                                                if (status === 'wished') dotColor = 'bg-green-500';

                                                return (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => setSelectedContact(c)}
                                                        className="bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all text-xs px-2.5 py-1.5 rounded-lg border border-slate-100 flex items-center gap-2 group"
                                                    >
                                                        <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
                                                        <span className="font-semibold text-slate-400 group-hover:text-slate-600 w-4 text-right">{c.day}</span>
                                                        <span className="font-medium text-slate-700">{c.name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </main>

            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-xl pointer-events-none z-20">
                <button
                    onClick={openNewContactModal}
                    className="absolute right-6 bottom-0 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center hover:scale-105 active:scale-95 transition-all pointer-events-auto"
                >
                    <Plus size={28} strokeWidth={2.5} />
                </button>
            </div>

            {isModalOpen && (
                <AddEditContact
                    onSave={handleSaveContact}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingContact(undefined);
                    }}
                    initialData={editingContact}
                    categories={categories}
                    contacts={contacts}
                />
            )}

            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 flex justify-around items-center z-30 max-w-xl mx-auto">
                <button
                    onClick={() => setView('list')}
                    className={`flex flex-col items-center gap-1 ${view === 'list' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <List size={24} />
                    <span className="text-[10px] font-medium">List</span>
                </button>
                <button
                    onClick={() => setView('calendar')}
                    className={`flex flex-col items-center gap-1 ${view === 'calendar' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <CalendarIcon size={24} />
                    <span className="text-[10px] font-medium">Calendar</span>
                </button>
            </nav>

            {/* Invite Modal */}
            {showInviteModal && (
                <InviteModal
                    contacts={contacts}
                    onClose={() => setShowInviteModal(false)}
                />
            )}

            {/* Share Accept Modal */}
            <AcceptShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
            />

            {/* Settings Modal */}

            {isSettingsOpen && (
                <SettingsModal
                    onClose={() => setIsSettingsOpen(false)}
                    wantsNotifications={wantsNotifications}
                    onToggleNotifications={handleToggleNotifications}
                    onExport={() => {
                        // Convert contacts to CSV
                        const headers = ['name', 'day', 'month', 'year', 'relationship', 'phone', 'reminderType', 'notes'];
                        const rows = contacts.map(c => [
                            c.name,
                            c.day.toString(),
                            c.month.toString(),
                            c.year?.toString() || '',
                            c.relationship || '',
                            c.phone || '',
                            c.reminderType || 'MORNING',
                            c.notes || ''
                        ]);

                        const csvContent = [
                            headers.join(','),
                            ...rows.map(row => row.map(cell => {
                                // Escape cells that contain commas or quotes
                                if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                                    return `"${cell.replace(/"/g, '""')}"`;
                                }
                                return cell;
                            }).join(','))
                        ].join('\n');

                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'birthday-buddy-contacts.csv';
                        a.click();
                        URL.revokeObjectURL(url);
                    }}
                    onImportCSV={handleImportCSV}
                />
            )}

            {selectedContact && (
                <ContactDetailModal
                    contact={selectedContact}
                    parentContact={selectedContact.parentId ? contacts.find(c => c.id === selectedContact.parentId) : undefined}
                    onWish={handleWish}
                    onEdit={(c) => { setSelectedContact(undefined); setEditingContact(c); setIsModalOpen(true); }}
                    onClose={() => setSelectedContact(undefined)}
                />
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
