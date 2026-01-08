'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import type { Contact } from '@/lib/types';


export async function getContacts() {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error('Unauthorized');
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { contacts: true },
    });

    return user?.contacts || [];
}

export async function createContact(data: Omit<Contact, 'id'>) {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error('Unauthorized');
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        throw new Error('User not found');
    }

    const { events, ...cleanData } = data;

    const contact = await prisma.contact.create({
        data: {
            ...cleanData,
            userId: user.id,
        },
    });

    revalidatePath('/dashboard');
    return contact;
}

export async function createContacts(contactsData: Omit<Contact, 'id'>[]) {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error('Unauthorized');
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        throw new Error('User not found');
    }

    // Add userId to each contact and remove events
    const dataWithUser = contactsData.map(c => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { events, ...rest } = c;
        return {
            ...rest,
            userId: user.id,
        };
    });

    const created = await prisma.contact.createMany({
        data: dataWithUser,
    });

    revalidatePath('/dashboard');
    return created;
}

export async function updateContact(id: string, data: Partial<Contact>) {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error('Unauthorized');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { events, ...cleanData } = data;

    const contact = await prisma.contact.update({
        where: { id },
        data: cleanData,
    });

    revalidatePath('/dashboard');
    return contact;
}

export async function deleteContact(id: string) {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error('Unauthorized');
    }

    await prisma.contact.delete({
        where: { id },
    });

    revalidatePath('/dashboard');
}

export async function markAsWished(id: string, wished: boolean) {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error('Unauthorized');
    }

    const currentYear = new Date().getFullYear();

    // First update the contact
    await prisma.contact.update({
        where: { id },
        data: {
            lastWishedYear: wished ? currentYear : null,
        },
    });

    if (wished) {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (user) {
            const now = new Date();
            const lastWish = user.lastWishDate;
            let newStreak = user.streak;

            // Simple streak logic:
            // If last wish was within 30 days, increment streak
            // Else, reset to 1
            if (lastWish) {
                const diffTime = Math.abs(now.getTime() - lastWish.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays <= 30) {
                    newStreak += 1;
                } else {
                    newStreak = 1;
                }
            } else {
                newStreak = 1;
            }

            await prisma.user.update({
                where: { email: session.user.email },
                data: {
                    wishesDelivered: { increment: 1 },
                    lastWishDate: now,
                    streak: newStreak
                }
            });
        }
    }

    revalidatePath('/dashboard');
}

export async function getGlobalCategories() {
    // Default categories
    const defaultCategories = ['Work', 'Family', 'Friends', 'Other'];

    // Fetch custom categories from DB
    const dbCategories = await prisma.category.findMany({
        select: { name: true }
    });

    const customNames = dbCategories.map(c => c.name);

    // Merge and deduplicate
    return Array.from(new Set([...defaultCategories, ...customNames])).sort();
}
