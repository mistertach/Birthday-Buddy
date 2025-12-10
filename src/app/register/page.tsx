import RegisterForm from '@/components/register-form';
import { prisma } from '@/lib/prisma';

async function getInvitationDetails(token: string) {
    const invitation = await prisma.invitation.findUnique({
        where: { token },
        include: { sender: { select: { name: true } } }
    });
    if (!invitation) return null;
    return {
        senderName: invitation.sender?.name,
        recipientEmail: invitation.recipientEmail
    };
}

export default async function RegisterPage(props: { searchParams: Promise<{ callbackUrl?: string }> }) {
    const searchParams = await props.searchParams;
    const callbackUrl = searchParams.callbackUrl;

    let senderName: string | undefined;
    let recipientEmail: string | undefined;
    let isInvite = false;

    // Check if callback URL is an invite link to extract context
    if (callbackUrl?.includes('/invite/')) {
        const token = callbackUrl.split('/invite/')[1];
        if (token) {
            const inviteDetails = await getInvitationDetails(token);
            if (inviteDetails) {
                senderName = inviteDetails.senderName || undefined;
                recipientEmail = inviteDetails.recipientEmail;
                isInvite = true;
            }
        }
    }

    return (
        <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 p-4">
            <div className="w-full max-w-md">
                {!isInvite && (
                    <div className="mb-6 text-center">
                        <h2 className="text-3xl font-bold text-indigo-900 mb-2">🎉 Birthday Buddy</h2>
                        <p className="text-gray-700 text-sm">
                            Never miss a birthday again! Organize your contacts and get timely reminders to celebrate the people you care about.
                        </p>
                    </div>
                )}
                <RegisterForm
                    callbackUrl={callbackUrl}
                    senderName={senderName}
                    recipientEmail={recipientEmail}
                />
            </div>
        </main>
    );
}
