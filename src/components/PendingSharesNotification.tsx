'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { getPendingShares } from '@/lib/contact-share-actions';

interface PendingShare {
    id: string;
    sender: {
        name: string | null;
        email: string | null;
    };
    sharedContactIds: string[];
    createdAt: Date;
}

interface Props {
    onViewShares: () => void;
}

export default function PendingSharesNotification({ onViewShares }: Props) {
    const [shares, setShares] = useState<PendingShare[]>([]);
    const [dismissed, setDismissed] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadShares();
    }, []);

    const loadShares = async () => {
        setLoading(true);
        const result = await getPendingShares();
        if (result.ok && result.shares) {
            setShares(result.shares as any);
        }
        setLoading(false);
    };

    if (loading || shares.length === 0 || dismissed) {
        return null;
    }

    const totalContacts = shares.reduce((sum, share) => sum + share.sharedContactIds.length, 0);

    return (
        <div className=\"bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-3 rounded-lg shadow-lg mb-6 animate-fade-in\">
            < div className =\"flex items-center justify-between gap-4\">
                < div className =\"flex items-center gap-3 flex-1\">
                    < div className =\"bg-white/20 p-2 rounded-full\">
                        < Bell size = { 20} />
                    </div >
                    <div>
                        <p className=\"font-semibold\">
                            {shares.length === 1
                                ? `${shares[0].sender.name || 'Someone'} shared ${shares[0].sharedContactIds.length} contact${shares[0].sharedContactIds.length !== 1 ? 's' : ''} with you`
                                : `${shares.length} people shared ${totalContacts} contacts with you`}
                        </p>
                        <p className=\"text-sm text-white/90\">
                            Click to review and accept
                        </p >
                    </div >
                </div >
        <div className=\"flex items-center gap-2\">
            < button
    onClick = { onViewShares }
    className =\"bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 transition-colors\"
        >
        View
                    </button >
        <button
            onClick={() => setDismissed(true)}
            className=\"p-2 hover:bg-white/10 rounded-full transition-colors\"
    aria - label=\"Dismiss notification\"
        >
        <X size={18} />
                    </button >
                </div >
            </div >
        </div >
    );
}
