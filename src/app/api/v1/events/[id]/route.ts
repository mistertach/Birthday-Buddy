import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-auth';

const UpdateSchema = z.object({
    name: z.string().min(1).optional(),
    date: z.string().optional(),
    location: z.string().optional().nullable(),
    giftStatus: z.enum(['NONE', 'IDEA', 'BOUGHT', 'WRAPPED']).optional(),
    giftBudget: z.number().optional().nullable(),
    giftNotes: z.string().optional().nullable(),
    rsvpStatus: z.enum(['PENDING', 'GOING', 'NOT_GOING']).optional(),
});

async function getOwnedEvent(id: string, userId: string) {
    const event = await prisma.partyEvent.findUnique({ where: { id } });
    if (!event) return null;
    if (event.userId !== userId) return null;
    return event;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireMobileUser(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const event = await getOwnedEvent(id, auth.userId);
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const data = UpdateSchema.parse(body);

    const updated = await prisma.partyEvent.update({
        where: { id },
        data: {
            ...(data.name && { name: data.name }),
            ...(data.date && { date: new Date(data.date) }),
            ...(data.location !== undefined && { location: data.location }),
            ...(data.giftStatus && { giftStatus: data.giftStatus }),
            ...(data.giftBudget !== undefined && { giftBudget: data.giftBudget }),
            ...(data.giftNotes !== undefined && { giftNotes: data.giftNotes }),
            ...(data.rsvpStatus && { rsvpStatus: data.rsvpStatus }),
        },
    });

    return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireMobileUser(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const event = await getOwnedEvent(id, auth.userId);
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.partyEvent.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
}
