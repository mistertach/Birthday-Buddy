import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signMobileToken } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const session = await auth();
    const cookieStore = await cookies();
    const redirectUri = cookieStore.get('mobile_redirect_uri')?.value;

    if (!redirectUri) {
        return NextResponse.json({ error: 'Missing redirect_uri cookie. Did the session expire?' }, { status: 400 });
    }

    // Clean up the cookie
    cookieStore.delete('mobile_redirect_uri');

    if (!session?.user || !session.user.email || !session.user.id) {
        console.log('Mobile social callback failed: No active NextAuth session found.');
        return NextResponse.redirect(new URL(`${redirectUri}?error=auth_failed`, req.url));
    }

    try {
        const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
        const token = await signMobileToken(session.user.id, session.user.email);
        
        const params = new URLSearchParams({
            token,
            id: session.user.id,
            email: session.user.email,
            name: session.user.name || '',
            isAdmin: dbUser?.isAdmin ? 'true' : 'false',
        });

        const targetUrl = `${redirectUri}?${params.toString()}`;
        return NextResponse.redirect(new URL(targetUrl, req.url));
    } catch (error) {
        console.error('Failed to sign mobile JWT token in social callback:', error);
        return NextResponse.redirect(new URL(`${redirectUri}?error=token_signing_failed`, req.url));
    }
}
