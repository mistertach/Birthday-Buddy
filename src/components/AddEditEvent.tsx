import React, { useState, useEffect } from 'react';
import { PartyEvent, Contact } from '@/lib/types';
import { X, Calendar, MapPin, Gift, DollarSign, StickyNote, Check } from 'lucide-react';
import { createEvent, updateEvent, deleteEvent } from '@/lib/event-actions';

interface AddEditEventProps {
    onClose: () => void;
    onSave: () => void; // Trigger refresh
    initialData?: PartyEvent;
    contacts: Contact[];
}

export const AddEditEvent: React.FC<AddEditEventProps> = ({ onClose, onSave, initialData, contacts }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [date, setDate] = useState(initialData?.date ? new Date(initialData.date).toISOString().slice(0, 16) : '');
    const [location, setLocation] = useState(initialData?.location || '');
    const [contactId, setContactId] = useState(initialData?.contactId || '');

    const [giftStatus, setGiftStatus] = useState(initialData?.giftStatus || 'NONE');
    const [giftBudget, setGiftBudget] = useState(initialData?.giftBudget?.toString() || '');
    const [giftNotes, setGiftNotes] = useState(initialData?.giftNotes || '');

    const [rsvpStatus, setRsvpStatus] = useState(initialData?.rsvpStatus || 'PENDING');

    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            let result;
            if (initialData) {
                result = await updateEvent(initialData.id, {
                    name,
                    date,
                    location,
                    giftStatus,
                    giftBudget: giftBudget ? parseFloat(giftBudget) : undefined,
                    giftNotes,
                    rsvpStatus
                });
            } else {
                result = await createEvent({
                    name,
                    date,
                    location,
                    contactId: contactId || undefined,
                    giftStatus,
                    giftBudget: giftBudget ? parseFloat(giftBudget) : undefined,
                    giftNotes
                });
            }

            if (result && !result.success) {
                alert(result.error);
                setIsSaving(false);
                return;
            }

            onSave();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to save event');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (confirm('Delete this event?')) {
            try {
                if (initialData) {
                    const result = await deleteEvent(initialData.id);
                    if (!result.success) {
                        alert(result.error);
                        return;
                    }
                }
                onSave();
                onClose();
            } catch (e) {
                alert('Failed to delete');
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800">{initialData ? 'Edit Event' : 'New Party'}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto no-scrollbar">
                    <form id="eventForm" onSubmit={handleSubmit} className="space-y-6">

                        {/* Name / Contact Link */}
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-slate-700">Who is it for?</label>
                            <select
                                value={contactId}
                                onChange={(e) => {
                                    setContactId(e.target.value);
                                    const c = contacts.find(c => c.id === e.target.value);
                                    if (c && !name) setName(c.name + "'s Party");
                                }}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none mb-2"
                            >
                                <option value="">-- Ad-hoc (No Contact Link) --</option>
                                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>

                            <input
                                required
                                type="text"
                                placeholder="Event Name (e.g. Timmy's Birthday)"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:font-normal"
                            />
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">When</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        required
                                        type="datetime-local"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Where</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Location / Address"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Gift Section */}
                        <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100">
                            <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                                <Gift size={16} /> Gift Planner
                            </h3>

                            <div className="grid grid-cols-2 gap-3 mb-3">
                                {['NONE', 'IDEA', 'BOUGHT', 'WRAPPED'].map(status => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => setGiftStatus(status as any)}
                                        className={`text-xs font-bold py-2 rounded-lg border transition-all ${giftStatus === status
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                            : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200'
                                            }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <div className="relative w-1/3">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input
                                        type="number"
                                        placeholder="Budget"
                                        value={giftBudget}
                                        onChange={(e) => setGiftBudget(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 bg-white border border-indigo-100 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Gift Ideas / Notes"
                                    value={giftNotes}
                                    onChange={(e) => setGiftNotes(e.target.value)}
                                    className="flex-1 px-3 py-2 bg-white border border-indigo-100 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* RSVP */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">RSVP Status</label>
                            <div className="flex gap-2">
                                {['PENDING', 'GOING', 'NOT_GOING'].map(status => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => setRsvpStatus(status as any)}
                                        className={`flex-1 text-xs font-bold py-2.5 rounded-xl border transition-all ${rsvpStatus === status
                                            ? 'bg-slate-800 text-white border-slate-800'
                                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        {status.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </form>
                </div>

                <div className="p-4 border-t border-slate-100 bg-white grid grid-cols-[auto_1fr] gap-3">
                    {initialData && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="px-4 py-3 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors"
                        >
                            Delete
                        </button>
                    )}
                    <button
                        type="submit"
                        form="eventForm"
                        disabled={isSaving}
                        className={`py-3 rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5 transition-all w-full flex justify-center items-center gap-2 ${initialData ? '' : 'col-span-2'}`}
                    >
                        {isSaving ? 'Saving...' : (initialData ? 'Save Changes' : 'Create Party')}
                    </button>
                </div>
            </div>
        </div>
    );
};
