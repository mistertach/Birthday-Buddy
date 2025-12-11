'use client';

import { useState, useEffect } from 'react';
import { X, Check, Gift, ArrowRight, Loader2 } from 'lucide-react';
import { getPendingShares, getShareDetails, acceptContactShare, rejectContactShare } from '@/lib/contact-share-actions';

interface PendingShare {
    id: string;
    sender: {
        name: string | null;
        email: string | null;
    };
    sharedContactIds: string[];
    message: string | null;
    createdAt: Date;
}

interface ContactStub {
    id: string;
    name: string;
    relationship: string | null;
    day: number;
    month: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function AcceptShareModal({ isOpen, onClose }: Props) {
    const [shares, setShares] = useState<PendingShare[]>([]);
    const [currentShareIndex, setCurrentShareIndex] = useState(0);
    const [contacts, setContacts] = useState<ContactStub[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadShares();
        }
    }, [isOpen]);

    useEffect(() => {
        if (shares.length > 0 && currentShareIndex < shares.length) {
            loadShareDetails(shares[currentShareIndex].id);
        }
    }, [shares, currentShareIndex]);

    const loadShares = async () => {
        setLoading(true);
        const result = await getPendingShares();
        if (result.ok && result.shares) {
            setShares(result.shares as any);
        }
        setLoading(false);
    };

    const loadShareDetails = async (shareId: string) => {
        const details = await getShareDetails(shareId);
        if (details) {
            setContacts(details.contacts as any);
            setSelectedIds(new Set(details.contacts.map((c: any) => c.id)));
        }
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
        if (selectedIds.size === contacts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(contacts.map(c => c.id)));
        }
    };

    const handleAccept = async () => {
        if (selectedIds.size === 0) {
            alert('Please select at least one contact to accept');
            return;
        }

        setProcessing(true);
        const result = await acceptContactShare(shares[currentShareIndex].id, Array.from(selectedIds));
        setProcessing(false);

        if (result.ok) {
            if (currentShareIndex < shares.length - 1) {
                setCurrentShareIndex(currentShareIndex + 1);
            } else {
                alert(result.message);
                onClose();
                window.location.reload();
            }
        } else {
            alert(result.message || 'Failed to accept share');
        }
    };

    const handleReject = async () => {
        if (!confirm('Are you sure you want to reject this share?')) {
            return;
        }

        setProcessing(true);
        const result = await rejectContactShare(shares[currentShareIndex].id);
        setProcessing(false);

        if (result.ok) {
            if (currentShareIndex < shares.length - 1) {
                setCurrentShareIndex(currentShareIndex + 1);
            } else {
                onClose();
            }
        } else {
            alert(result.message || 'Failed to reject share');
        }
    };

    if (!isOpen) return null;

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-8 flex flex-col items-center">
                    <Loader2 className="animate-spin text-indigo-600" size={32} />
                    <p className="mt-4 text-gray-600">Loading shares...</p>
                </div>
            </div>
        );
    }

    if (shares.length === 0) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl p-8 max-w-md text-center">
                    <p className="text-gray-600 mb-4">No pending shares</p>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                        Close
                    </button>
                </div>
            </div>
        );
    }

    const currentShare = shares[currentShareIndex];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-100 p-2 rounded-full">
                            <Gift size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                {currentShare.sender.name || 'Someone'} shared contacts
                            </h2>
                            {shares.length > 1 && (
                                <p className="text-sm text-gray-500">
                                    Share {currentShareIndex + 1} of {shares.length}
                                </p>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {currentShare.message && (
                    <div className="px-6 pt-4 pb-2">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                            <p className="text-sm text-indigo-900">
                                <strong>Message:</strong> {currentShare.message}
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium text-slate-700">
                            {selectedIds.size} of {contacts.length} selected
                        </span>
                        <button
                            onClick={toggleAll}
                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                            {selectedIds.size === contacts.length ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>

                    <div className="space-y-2">
                        {contacts.map((contact) => (
                            <div
                                key={contact.id}
                                onClick={() => toggleId(contact.id)}
                                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedIds.has(contact.id)
                                        ? 'bg-indigo-50 border border-indigo-200'
                                        : 'hover:bg-slate-50 border border-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedIds.has(contact.id)
                                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                                : 'border-slate-300 bg-white'
                                            }`}
                                    >
                                        {selectedIds.has(contact.id) && <Check size={12} strokeWidth={3} />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">{contact.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {contact.day}/{contact.month} • {contact.relationship || 'Other'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={handleReject}
                        disabled={processing}
                        className="flex-1 py-3 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors"
                    >
                        Reject
                    </button>
                    <button
                        onClick={handleAccept}
                        disabled={processing || selectedIds.size === 0}
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200"
                    >
                        {processing ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : (
                            <>
                                Accept {selectedIds.size > 0 && `(${selectedIds.size})`}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
