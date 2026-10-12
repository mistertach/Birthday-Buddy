import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendMagicLinkEmail } from '@/lib/email-actions';
import { signMobileToken } from '@/lib/mobile-auth';

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getBaseUrl() {
    return process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

/**
 * Request a mobile magic sign-in link - generates a token and emails it.
 * Always returns a generic message to prevent email enumeration.
 */
export async function requestMobileMagicLink(email: string): Promise<{ ok: boolean; message: string }> {
    const genericMessage = 'If an account exists with that email, a sign-in link has been sent.';

    try {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });

        if (!user) {
            return { ok: true, message: genericMessage };
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

        await prisma.mobileMagicLinkToken.deleteMany({ where: { userId: user.id } });
        await prisma.mobileMagicLinkToken.create({
            data: { userId: user.id, token, expiresAt },
        });

        const loginLink = `${getBaseUrl()}/api/auth/mobile/magic-link/verify?token=${token}`;
        await sendMagicLinkEmail(user.email!, loginLink);

        return { ok: true, message: genericMessage };
    } catch (error) {
        console.error('Failed to request mobile magic link:', error);
        return { ok: false, message: 'Failed to send sign-in link. Please try again.' };
    }
}

/**
 * Verify a mobile magic-link token and mint a mobile bearer token for its user.
 * Deletes the token so it can only be used once.
 */
export async function verifyMobileMagicLink(token: string): Promise<
    | { ok: true; jwt: string; user: { id: string; email: string; name: string | null; isAdmin: boolean } }
    | { ok: false; message: string }
> {
    try {
        const magicLinkToken = await prisma.mobileMagicLinkToken.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!magicLinkToken) {
            return { ok: false, message: 'Invalid or expired sign-in link.' };
        }

        await prisma.mobileMagicLinkToken.delete({ where: { id: magicLinkToken.id } });

        if (new Date() > magicLinkToken.expiresAt) {
            return { ok: false, message: 'This sign-in link has expired. Please request a new one.' };
        }

        const { user } = magicLinkToken;
        if (!user.email) {
            return { ok: false, message: 'This account has no email on file.' };
        }

        const jwt = await signMobileToken(user.id, user.email);
        return {
            ok: true,
            jwt,
            user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin },
        };
    } catch (error) {
        console.error('Failed to verify mobile magic link:', error);
        return { ok: false, message: 'Failed to verify sign-in link.' };
    }
}
