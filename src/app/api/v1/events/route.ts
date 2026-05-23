import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-auth';

const CreateSchema = z.object({
    name: z.string().min(1),
    date: z.string(),
    location: z.string().optional().nullable(),
    contactId: z.string().optional().nullable(),
    giftStatus: z.enum(['NONE', 'IDEA', 'BOUGHT', 'WRAPPED']).default('NONE'),
    giftBudget: z.number().optional().nullable(),
    giftNotes: z.string().optional().nullable(),
    rsvpStatus: z.enum(['PENDING', 'GOING', 'NOT_GOING']).default('PENDING'),
});

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const events = await prisma.partyEvent.findMany({
        where: { userId: auth.userId },
        orderBy: { date: 'asc' },
    });

    return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
    const auth = await requireMobileUser(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json().catch(() => ({}));
    const data = CreateSchema.parse(body);

    const event = await prisma.partyEvent.create({
        data: {
            userId: auth.userId,
            name: data.name,
            date: new Date(data.date),
            location: data.location ?? undefined,
            contactId: data.contactId ?? undefined,
            giftStatus: data.giftStatus,
            giftBudget: data.giftBudget ?? undefined,
            giftNotes: data.giftNotes ?? undefined,
            rsvpStatus: data.rsvpStatus,
        },
    });

    return NextResponse.json(event, { status: 201 });
}
