import { signIn } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get('provider');
    const redirectUri = searchParams.get('redirect_uri');

    if (!provider || !redirectUri) {
        return NextResponse.json({ error: 'Missing provider or redirect_uri' }, { status: 400 });
    }

    const hasGoogleKeys = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
    const hasAppleKeys = !!(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET);
    const useMock = (provider === 'google' && !hasGoogleKeys) || (provider === 'apple' && !hasAppleKeys);

    // Save the redirect URI in a cookie so we know where to go back
    const cookieStore = await cookies();
    cookieStore.set('mobile_redirect_uri', redirectUri, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 600, // 10 minutes
        path: '/',
    });

    if (useMock) {
        return NextResponse.redirect(new URL(`/auth/mobile-mock?provider=${provider}`, req.url));
    }

    try {
        await signIn(provider, {
            redirectTo: '/api/auth/mobile/social/callback',
        });
    } catch (error: any) {
        // NextAuth signIn throws a redirect error to navigate the user.
        // We rethrow it so Next.js handles the redirect properly.
        if (error && typeof error === 'object' && 'digest' in error) {
            throw error;
        }
        console.error('NextAuth signin error:', error);
        return NextResponse.redirect(new URL(`${redirectUri}?error=auth_init_failed`, req.url));
    }

    return NextResponse.json({ error: 'Failed to initiate sign in' }, { status: 500 });
}
