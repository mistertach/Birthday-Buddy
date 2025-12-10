import React, { useState, useMemo } from 'react';
import { X, Send, Search, Check, Users, UserPlus, Share2, Loader2 } from 'lucide-react';
import { type Contact } from '@/lib/types';
import { createInvitation } from '@/lib/invite-actions';
import { checkUserExists, createContactShare } from '@/lib/contact-share-actions';

interface Props {
    onClose: () => void;
    contacts: Contact[];
}

type Mode = 'invite' | 'share';

export const InviteModal: React.FC<Props> = ({ onClose, contacts }) => {
    const [mode, setMode] = useState<Mode>('invite');
    const [step, setStep] = useState<'details' | 'select'>('details');
    const [friendEmail, setFriendEmail] = useState('');
    const [shareMessage, setShareMessage] = useState('');
    const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userExistsStatus, setUserExistsStatus] = useState<'idle' | 'checking' | 'exists' | 'not-exists'>('idle');

    // Extract unique categories from contacts
    const categories = useMemo(() => {
        const uniqueCats = new Set(contacts.map(c => c.relationship || 'Other'));
        return ['All', ...Array.from(uniqueCats).sort()];
    }, [contacts]);

    const toggleContact = (id: string) => {
        const newSelected = new Set(selectedContactIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedContactIds(newSelected);
    };

    const handleEmailChange = async (email: string) => {
        setFriendEmail(email);

        if (mode === 'share' && email.includes('@')) {
            setUserExistsStatus('checking');
            const result = await checkUserExists(email);
            if (result.ok) {
                setUserExistsStatus(result.exists ? 'exists' : 'not-exists');
            } else {
                setUserExistsStatus('idle');
            }
        } else {
            setUserExistsStatus('idle');
        }
    };

    const handleSubmit = async () => {
        if (!friendEmail) return;

        setIsSubmitting(true);
        try {
            if (mode === 'invite') {
                const result = await createInvitation(friendEmail, Array.from(selectedContactIds));
                if (result.ok) {
                    alert(result.message);
                    onClose();
                } else {
                    alert(result.message || 'Failed to send invitation');
                }
            } else {
                // Share mode
                const result = await createContactShare(friendEmail, Array.from(selectedContactIds), shareMessage || undefined);
                if (result.ok) {
                    alert(result.message);
                    onClose();
                } else {
                    alert(result.message || 'Failed to share contacts');
                }
            }
        } catch (error) {
            console.error('Submit error:', error);
            alert('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredContacts = useMemo(() => {
        return contacts.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.relationship?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || (c.relationship || 'Other') === selectedCategory;
            return matchesSearch && matchesCategory;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [contacts, searchQuery, selectedCategory]);

    const selectAll = () => {
        const currentlyVisibleIds = new Set(filteredContacts.map(c => c.id));
        const allVisibleSelected = filteredContacts.every(c => selectedContactIds.has(c.id));

        const newSelected = new Set(selectedContactIds);

        if (allVisibleSelected) {
            currentlyVisibleIds.forEach(id => newSelected.delete(id));
        } else {
            currentlyVisibleIds.forEach(id => newSelected.add(id));
        }
        setSelectedContactIds(newSelected);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
                {/* Header with Tab Selection */}
                <div className="flex-shrink-0">
                    <div className="flex justify-between items-center p-6 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-100 p-2 rounded-full">
                                <Users size={20} className="text-indigo-600" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">Share Birthday Contacts</h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>

                    {/* Mode Tabs */}
                    <div className="flex border-b border-gray-200 px-6">
                        <button
                            onClick={() => { setMode('invite'); setUserExistsStatus('idle'); }}
                            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${mode === 'invite'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <UserPlus size={18} />
                            Invite New User
                        </button>
                        <button
                            onClick={() => { setMode('share'); setUserExistsStatus('idle'); }}
                            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${mode === 'share'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Share2 size={18} />
                            Share with User
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {step === 'details' ? (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {mode === 'invite' ? "Friend's Email Address" : 'User Email Address'}
                                </label>
                                <input
                                    type="email"
                                    value={friendEmail}
                                    onChange={(e) => handleEmailChange(e.target.value)}
                                    placeholder="friend@example.com"
                                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-gray-900"
                                    autoFocus
                                />
                                {mode === 'share' && userExistsStatus === 'checking' && (
                                    <p className="mt-2 text-sm text-slate-500 flex items-center gap-2">
                                        <Loader2 size={14} className="animate-spin" />
                                        Checking...
                                    </p>
                                )}
                                {mode === 'share' && userExistsStatus === 'exists' && (
                                    <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                                        <Check size={14} /> User found
                                    </p>
                                )}
                                {mode === 'share' && userExistsStatus === 'not-exists' && (
                                    <p className="mt-2 text-sm text-red-600">
                                        User not registered. Try inviting them instead!
                                    </p>
                                )}
                                {mode === 'invite' && (
                                    <p className="mt-2 text-sm text-slate-500">
                                        We'll send them an invitation link to join Birthday Buddy.
                                    </p>
                                )}
                            </div>

                            {mode === 'share' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Message (Optional)
                                    </label>
                                    <textarea
                                        value={shareMessage}
                                        onChange={(e) => setShareMessage(e.target.value)}
                                        placeholder="Add a personal message..."
                                        className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-gray-900"
                                        rows={3}
                                    />
                                </div>
                            )}

                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                                <h3 className="font-semibold text-indigo-900 mb-1">Share Contacts?</h3>
                                <p className="text-sm text-indigo-800 mb-4">
                                    {mode === 'invite'
                                        ? 'You can pick birthdays to share with them (like family members or mutual friends) to help them get started.'
                                        : 'Select which birthday contacts you want to share with this user.'}
                                </p>
                                <button
                                    onClick={() => setStep('select')}
                                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                >
                                    Select contacts to share <span aria-hidden="true">&rarr;</span>
                                </button>
                            </div>

                            {selectedContactIds.size > 0 && (
                                <div className="flex items-center gap-2 text-sm text-green-600 font-medium bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                                    <Check size={16} />
                                    {selectedContactIds.size} contact{selectedContactIds.size !== 1 ? 's' : ''} selected to share
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search contacts..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-gray-900"
                                />
                            </div>

                            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedCategory === cat
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-slate-500">
                                    {selectedContactIds.size} selected ({filteredContacts.length} visible)
                                </span>
                                <button
                                    onClick={selectAll}
                                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                                >
                                    {filteredContacts.length > 0 && filteredContacts.every(c => selectedContactIds.has(c.id)) ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>

                            <div className="space-y-2 overflow-y-auto max-h-[300px] border rounded-lg border-slate-100 p-2">
                                {filteredContacts.map(contact => (
                                    <div
                                        key={contact.id}
                                        onClick={() => toggleContact(contact.id)}
                                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedContactIds.has(contact.id)
                                            ? 'bg-indigo-50 border border-indigo-200'
                                            : 'hover:bg-slate-50 border border-transparent'
                                            }`}
                                    >
                                        <div>
                                            <p className="font-medium text-slate-900">{contact.name}</p>
                                            <p className="text-xs text-slate-500">
                                                {contact.day}/{contact.month} • {contact.relationship || 'No category'}
                                            </p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedContactIds.has(contact.id)
                                            ? 'bg-indigo-600 border-indigo-600 text-white'
                                            : 'border-slate-300'
                                            }`}>
                                            {selectedContactIds.has(contact.id) && <Check size={12} />}
                                        </div>
                                    </div>
                                ))}
                                {filteredContacts.length === 0 && (
                                    <p className="text-center text-slate-500 py-8">No contacts found</p>
                                )}
                            </div>

                            <button
                                onClick={() => setStep('details')}
                                className="mt-4 w-full py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Done Selecting
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex-shrink-0">
                    <button
                        onClick={handleSubmit}
                        disabled={!friendEmail || isSubmitting || (mode === 'share' && userExistsStatus === 'not-exists')}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
                    >
                        {isSubmitting ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Send size={18} />
                                {mode === 'invite' ? 'Send Invitation' : 'Share Contacts'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
