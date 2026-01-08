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
    const secretCheck = !!process.env.AUTH_SECRET;
    console.log('[createEvent] Environment Check:', {
        hasAuthSecret: secretCheck,
        nodeEnv: process.env.NODE_ENV
    });

    if (!session?.user?.email) {
        console.error('[createEvent] Auth Failed. Session:', session ? 'Exists (empty user)' : 'Null');
        return { success: false, error: 'Not authenticated. Please try logging in again.' };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return { success: false, error: 'User account not found.' };
    }

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

        revalidatePath('/dashboard');
        return { success: true, data: event };
    } catch (e) {
        console.error('[createEvent] DB Create Error:', e);
        return { success: false, error: 'Database error occurred.' };
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
    if (!session?.user?.email) {
        return { success: false, error: 'Not authenticated' };
    }

    // Verify ownership via email lookup for safety (since we have userId from session usually, but let's consistency check)
    // Actually, updateEvent relied on session.user.id in the original code.
    // Let's switch to email lookup to be consistent with createEvent fix.

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) return { success: false, error: 'User not found' };

    const existing = await prisma.partyEvent.findUnique({
        where: { id }
    });

    if (!existing || existing.userId !== user.id) {
        return { success: false, error: 'Not authorized to edit this event' };
    }

    try {
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
        return { success: true, data: event };
    } catch (e) {
        console.error('[updateEvent] Error:', e);
        return { success: false, error: 'Failed to update event' };
    }
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
