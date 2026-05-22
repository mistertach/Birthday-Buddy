import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-auth';

const UpdateSchema = z.object({
    name: z.string().min(1).optional(),
    day: z.number().int().min(1).max(31).optional(),
    month: z.number().int().min(1).max(12).optional(),
    year: z.number().int().nullable().optional(),
    phone: z.string().nullable().optional(),
    relationship: z.string().nullable().optional(),
    reminderType: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
});

async function ensureOwned(contactId: string, userId: string) {
    const existing = await prisma.contact.findUnique({ where: { id: contactId }, select: { userId: true } });
    if (!existing) return 'not_found' as const;
    if (existing.userId !== userId) return 'forbidden' as const;
    return 'ok' as const;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireMobileUser(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { id } = await params;
    const contact = await prisma.contact.findUnique({ where: { id } });
    if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (contact.userId !== auth.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json(contact);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireMobileUser(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { id } = await params;
    const ownership = await ensureOwned(id, auth.userId);
    if (ownership === 'not_found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (ownership === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => null);
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const updated = await prisma.contact.update({ where: { id }, data: parsed.data });
    return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireMobileUser(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { id } = await params;
    const ownership = await ensureOwned(id, auth.userId);
    if (ownership === 'not_found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (ownership === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await prisma.contact.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
