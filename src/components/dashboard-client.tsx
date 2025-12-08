'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ReminderType, type Contact } from '@/lib/types';
import { getCategoryDotColor, getVisualDate, getBirthdayStatus } from '@/lib/utils';
import { AddEditContact } from '@/components/AddEditContact';
import { ContactCard } from '@/components/ContactCard';
import { ContactDetailModal } from '@/components/ContactDetailModal';
import { SettingsModal } from '@/components/SettingsModal';
import {
    Plus,
    Search,
    Calendar as CalendarIcon,
    List,
    ChevronDown,
    ChevronRight,
    LogOut,
    Settings,
    Shield
} from 'lucide-react';
import { createContact, createContacts, updateContact, deleteContact, markAsWished } from '@/lib/contact-actions';
import { handleSignOut, updateNotificationPreference } from '@/lib/actions';

interface DashboardClientProps {
    initialContacts: Contact[];
    userName?: string | null;
    isAdmin?: boolean;
    initialCategories: string[];
    initialNotificationPref: boolean;
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
}: DashboardClientProps) {
    const [contacts, setContacts] = useState<Contact[]>(() => initialContacts.map(normalizeContact));
    const [view, setView] = useState<'list' | 'calendar'>('list');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [wantsNotifications, setWantsNotifications] = useState(initialNotificationPref);
    const [editingContact, setEditingContact] = useState<Contact | undefined>(undefined);
    const openNewContactModal = () => {
        setEditingContact(undefined);
        setIsModalOpen(true);
    };
    const [selectedContact, setSelectedContact] = useState<Contact | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');
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

    const renderListWithSeparators = () => {
        const groups: React.ReactNode[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

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
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{monthName}</h3>
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
                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200 mt-4">
                    <p className="text-slate-400">No birthdays found.</p>
                    <button onClick={openNewContactModal} className="text-indigo-600 font-semibold mt-2">Add one now</button>
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
                            onEdit={(c) => { setEditingContact(c); setIsModalOpen(true); }}
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
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Birthday Buddy <span className="text-indigo-500">(BB)</span>
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                        Welcome, {userName || 'Friend'}
                    </p>
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
                <div className="flex flex-col gap-3 sticky top-[73px] z-20 bg-slate-50 pb-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Find someone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        <button
                            onClick={() => setFilterRel('All')}
                            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filterRel === 'All' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                        >
                            All
                        </button>
                        {categories.map(r => (
                            <button
                                key={r}
                                onClick={() => setFilterRel(r)}
                                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filterRel === r ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

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

            <button
                onClick={openNewContactModal}
                className="fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
            >
                <Plus size={28} strokeWidth={2.5} />
            </button>

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
