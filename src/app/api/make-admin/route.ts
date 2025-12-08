import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const secret = searchParams.get('secret');

    // Simple security check
    if (secret !== 'make-me-admin-please') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!email) {
        return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    try {
        const user = await prisma.user.update({
            where: { email },
            data: { isAdmin: true },
            select: {
                id: true,
                name: true,
                email: true,
                isAdmin: true,
            },
        });

        return NextResponse.json({ success: true, user });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
