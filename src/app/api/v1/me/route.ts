import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-auth';

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req);
    if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: {
            id: true,
            email: true,
            name: true,
            image: true,
            isAdmin: true,
            wantsEmailNotifications: true,
            wishesDelivered: true,
            streak: true,
            plan: true,
        },
    });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user);
}
