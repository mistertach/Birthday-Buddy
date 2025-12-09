'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { acceptInvitation } from '@/lib/invite-actions';
import { Check, Gift, ArrowRight } from 'lucide-react';

interface SharedContactStub {
    id: string;
    name: string;
    relationship: string | null;
}

interface Props {
    token: string;
    sender: { name: string | null; email: string | null };
    sharedContacts: SharedContactStub[];
    recipientEmail: string;
}

export default function AcceptInvitationClient({ token, sender, sharedContacts, recipientEmail }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [accepted, setAccepted] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(sharedContacts.map(c => c.id)));

    const handleAccept = () => {
        startTransition(async () => {
            const result = await acceptInvitation(token, Array.from(selectedIds));
            if (result.ok) {
                setAccepted(true);
                // Wait a moment then redirect
                setTimeout(() => {
                    router.push('/dashboard');
                }, 1500);
            } else {
                alert(result.message || 'Failed to accept invitation');
            }
        });
    };

    const toggleId = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === sharedContacts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(sharedContacts.map(c => c.id)));
        }
    };

    if (accepted) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                    <Check size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Invitation Accepted!</h2>
                <p className="text-slate-600 mb-6">
                    We're setting up your dashboard with your new contacts...
                </p>
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto p-6 md:p-8">
            <div className="text-center mb-8">
                <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Gift size={40} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                    {sender.name || 'A friend'} invited you!
                </h1>
                <p className="text-slate-600">
                    They want to share <strong>{sharedContacts.length} birthday contacts</strong> with you. Pick the ones you want to keep!
                </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-8">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-medium text-slate-700 text-sm flex justify-between items-center">
                    <span>Contacts to Import</span>
                    <button
                        onClick={toggleAll}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-bold uppercase"
                    >
                        {selectedIds.size === sharedContacts.length ? 'Deselect All' : 'Select All'}
                    </button>
                </div>
                <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
                    {sharedContacts.map((c) => (
                        <div
                            key={c.id}
                            onClick={() => toggleId(c.id)}
                            className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedIds.has(c.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                                    }`}>
                                    {selectedIds.has(c.id) && <Check size={12} strokeWidth={3} />}
                                </div>
                                <span className="text-slate-900 font-medium">{c.name}</span>
                            </div>
                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{c.relationship || 'Other'}</span>
                        </div>
                    ))}
                    {sharedContacts.length === 0 && (
                        <div className="p-4 text-center text-slate-500 text-sm">
                            No specific contacts shared, but you can still join!
                        </div>
                    )}
                </div>
                <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 text-xs text-slate-500 text-center">
                    {selectedIds.size} selected for import
                </div>
            </div>

            <button
                onClick={handleAccept}
                disabled={isPending || selectedIds.size === 0}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isPending ? 'Accepting...' : `Import ${selectedIds.size} Contacts`}
                {!isPending && <ArrowRight size={20} />}
            </button>

            <p className="mt-6 text-xs text-center text-slate-400">
                You are accepting this invitation as <strong>{recipientEmail}</strong>
            </p>
        </div>
    );
}
