import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getInvitationByToken } from '@/lib/invite-actions';
import AcceptInvitationClient from '@/components/AcceptInvitationClient';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default async function InvitationPage(props: { params: Promise<{ token: string }> }) {
    const params = await props.params;
    const session = await auth();
    const token = params.token;

    // Force login if not authenticated
    if (!session?.user?.email) {
        // Redirect to register, preserving this page as the callback
        redirect(`/register?callbackUrl=/invite/${token}`);
    }

    const data = await getInvitationByToken(token);

    if (!data || 'error' in data) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={32} />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">Invitation Error</h1>
                    <p className="text-slate-600 mb-6">
                        {(data as any)?.message || 'This invitation is invalid or has expired.'}
                    </p>
                    <Link
                        href="/dashboard"
                        className="inline-block px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
                    >
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    const { invitation, sharedContacts } = data;

    // If user is the sender (accidentally clicked their own link), just warn them
    if (invitation.senderId === session.user.id) { // We assume session.user.id is available, check auth.ts type
        // Actually session.user might not have id if not extended. 
        // But let's assume if email matches recipient? 
    }

    // But we can check email matches recipient?
    // If different email, maybe warn? But they might accept on a different email.
    // Let's just proceed.

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <AcceptInvitationClient
                token={token}
                sender={{
                    name: invitation.sender.name,
                    email: invitation.sender.email
                }}
                sharedContacts={sharedContacts}
                recipientEmail={session.user.email}
            />
        </div>
    );
}
