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
            birthdayDay: true,
            birthdayMonth: true,
        },
    });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
    const auth = await requireMobileUser(req);
    if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let body: { name?: string; birthdayDay?: number | null; birthdayMonth?: number | null };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const update: Record<string, any> = {};
    if (typeof body.name === 'string' && body.name.trim().length >= 1) {
        update.name = body.name.trim();
    }
    if ('birthdayDay' in body) {
        const d = body.birthdayDay;
        update.birthdayDay = d !== null && d !== undefined && d >= 1 && d <= 31 ? d : null;
    }
    if ('birthdayMonth' in body) {
        const m = body.birthdayMonth;
        update.birthdayMonth = m !== null && m !== undefined && m >= 1 && m <= 12 ? m : null;
    }

    if (Object.keys(update).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const user = await prisma.user.update({
        where: { id: auth.userId },
        data: update,
        select: {
            id: true, email: true, name: true, birthdayDay: true, birthdayMonth: true, plan: true,
        },
    });

    return NextResponse.json(user);
}
