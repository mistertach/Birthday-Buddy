'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function createEvent(data: {
    name: string;
    date: Date | string; // Accept string from form, convert to Date
    location?: string;
    contactId?: string;
    giftStatus?: string;
    giftBudget?: number;
    giftNotes?: string;
}) {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error('Not authenticated');
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        console.error('[createEvent] User not found for email:', session.user.email);
        throw new Error('User not found');
    }

    console.log('[createEvent] Payload:', { ...data, userId: user.id });

    try {
        const event = await prisma.partyEvent.create({
            data: {
                userId: user.id,
                name: data.name,
                date: new Date(data.date),
                location: data.location,
                contactId: data.contactId || undefined,
                giftStatus: data.giftStatus || 'NONE',
                giftBudget: data.giftBudget ? parseFloat(data.giftBudget.toString()) : undefined,
                giftNotes: data.giftNotes
            }
        });

        console.log('[createEvent] Created:', event.id);
        revalidatePath('/dashboard');
        return event;
    } catch (e) {
        console.error('[createEvent] DB Create Error:', e);
        throw e;
    }
}

export async function updateEvent(id: string, data: {
    name?: string;
    date?: Date | string;
    location?: string;
    giftStatus?: string;
    giftBudget?: number;
    giftNotes?: string;
    rsvpStatus?: string;
}) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Not authenticated');
    }

    // Verify ownership
    const existing = await prisma.partyEvent.findUnique({
        where: { id }
    });

    if (!existing || existing.userId !== session.user.id) {
        throw new Error('Not authorized');
    }

    const event = await prisma.partyEvent.update({
        where: { id },
        data: {
            name: data.name,
            date: data.date ? new Date(data.date) : undefined,
            location: data.location,
            giftStatus: data.giftStatus,
            giftBudget: data.giftBudget !== undefined ? parseFloat(data.giftBudget.toString()) : undefined,
            giftNotes: data.giftNotes,
            rsvpStatus: data.rsvpStatus
        }
    });

    revalidatePath('/dashboard');
    return event;
}

export async function deleteEvent(id: string) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Not authenticated');
    }

    const existing = await prisma.partyEvent.findUnique({
        where: { id }
    });

    if (!existing || existing.userId !== session.user.id) {
        throw new Error('Not authorized');
    }

    await prisma.partyEvent.delete({
        where: { id }
    });

    revalidatePath('/dashboard');
    return { success: true };
}

export async function getEvents() {
    const session = await auth();
    if (!session?.user?.email) {
        return [];
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return [];
    }

    const events = await prisma.partyEvent.findMany({
        where: { userId: user.id },
        orderBy: { date: 'asc' },
        include: {
            contact: true
        }
    });

    return events;
}
