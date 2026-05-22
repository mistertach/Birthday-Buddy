import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

const TOKEN_TTL = '30d';

function getSecret() {
    const secret = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
        throw new Error('MOBILE_JWT_SECRET (or AUTH_SECRET) is not set');
    }
    return new TextEncoder().encode(secret);
}

export async function signMobileToken(userId: string, email: string) {
    return await new SignJWT({ sub: userId, email })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(TOKEN_TTL)
        .setAudience('mobile')
        .sign(getSecret());
}

export async function verifyMobileToken(token: string) {
    const { payload } = await jwtVerify(token, getSecret(), { audience: 'mobile' });
    return { userId: payload.sub as string, email: payload.email as string };
}

export async function requireMobileUser(req: NextRequest) {
    const header = req.headers.get('authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
        return { error: 'Missing bearer token', status: 401 as const };
    }
    try {
        const { userId, email } = await verifyMobileToken(match[1]);
        return { userId, email };
    } catch {
        return { error: 'Invalid or expired token', status: 401 as const };
    }
}
