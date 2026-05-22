import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-auth';

const ContactInputSchema = z.object({
    name: z.string().min(1),
    day: z.number().int().min(1).max(31),
    month: z.number().int().min(1).max(12),
    year: z.number().int().nullable().optional(),
    phone: z.string().nullable().optional(),
    relationship: z.string().nullable().optional(),
    reminderType: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    parentId: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req);
    if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const contacts = await prisma.contact.findMany({
        where: { userId: auth.userId },
        orderBy: [{ month: 'asc' }, { day: 'asc' }],
    });
    return NextResponse.json(contacts);
}

export async function POST(req: NextRequest) {
    const auth = await requireMobileUser(req);
    if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const body = await req.json().catch(() => null);
    const parsed = ContactInputSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const contact = await prisma.contact.create({
        data: { ...parsed.data, userId: auth.userId },
    });
    return NextResponse.json(contact, { status: 201 });
}
