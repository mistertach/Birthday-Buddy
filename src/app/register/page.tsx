import RegisterForm from '@/components/register-form';
import { prisma } from '@/lib/prisma';

async function getInvitationSender(token: string) {
    const invitation = await prisma.invitation.findUnique({
        where: { token },
        include: { sender: { select: { name: true } } }
    });
    return invitation?.sender?.name;
}

export default async function RegisterPage(props: { searchParams: Promise<{ callbackUrl?: string }> }) {
    const searchParams = await props.searchParams;
    const callbackUrl = searchParams.callbackUrl;

    let senderName: string | undefined;

    // Check if callback URL is an invite link to extract context
    if (callbackUrl?.includes('/invite/')) {
        const token = callbackUrl.split('/invite/')[1];
        if (token) {
            senderName = await getInvitationSender(token) || undefined;
        }
    }

    return (
        <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100">
            <div className="w-full max-w-md">
                <RegisterForm callbackUrl={callbackUrl} senderName={senderName} />
            </div>
        </main>
    );
}
