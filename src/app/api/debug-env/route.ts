import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        hasAuthSecret: !!process.env.AUTH_SECRET,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        authUrl: process.env.AUTH_URL,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        vercUrl: process.env.VERCEL_URL,
        nodeEnv: process.env.NODE_ENV,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
    });
}
