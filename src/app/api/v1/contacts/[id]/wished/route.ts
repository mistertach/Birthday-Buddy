import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-auth';

const Schema = z.object({ wished: z.boolean() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireMobileUser(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

    const contact = await prisma.contact.findUnique({ where: { id }, select: { userId: true } });
    if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (contact.userId !== auth.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const currentYear = new Date().getFullYear();
    await prisma.contact.update({
        where: { id },
        data: { lastWishedYear: parsed.data.wished ? currentYear : null },
    });

    if (parsed.data.wished) {
        const user = await prisma.user.findUnique({ where: { id: auth.userId } });
        if (user) {
            const now = new Date();
            let newStreak = user.streak;
            if (user.lastWishDate) {
                const diffDays = Math.ceil(Math.abs(now.getTime() - user.lastWishDate.getTime()) / (1000 * 60 * 60 * 24));
                newStreak = diffDays <= 30 ? newStreak + 1 : 1;
            } else {
                newStreak = 1;
            }
            await prisma.user.update({
                where: { id: auth.userId },
                data: { wishesDelivered: { increment: 1 }, lastWishDate: now, streak: newStreak },
            });
        }
    }

    return NextResponse.json({ ok: true });
}
