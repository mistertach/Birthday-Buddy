import { NextRequest, NextResponse } from 'next/server';
import { verifyMobileMagicLink } from '@/lib/mobile-magic-link';

const APP_CALLBACK_URL = 'birthdaybuddy://auth-callback';

export async function GET(req: NextRequest) {
    const token = new URL(req.url).searchParams.get('token');
    if (!token) {
        return NextResponse.redirect(new URL(`${APP_CALLBACK_URL}?error=missing_token`, req.url));
    }

    const result = await verifyMobileMagicLink(token);
    if (!result.ok) {
        const params = new URLSearchParams({ error: 'invalid_or_expired_link' });
        return NextResponse.redirect(new URL(`${APP_CALLBACK_URL}?${params.toString()}`, req.url));
    }

    const params = new URLSearchParams({
        token: result.jwt,
        id: result.user.id,
        email: result.user.email,
        name: result.user.name || '',
        isAdmin: result.user.isAdmin ? 'true' : 'false',
    });

    return NextResponse.redirect(new URL(`${APP_CALLBACK_URL}?${params.toString()}`, req.url));
}
