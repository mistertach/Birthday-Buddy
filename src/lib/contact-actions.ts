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

    const contact = await prisma.contact.create({
        data: {
            ...data,
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

    // Add userId to each contact
    const dataWithUser = contactsData.map(c => ({
        ...c,
        userId: user.id,
    }));

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

    const contact = await prisma.contact.update({
        where: { id },
        data,
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
    const currentYear = new Date().getFullYear();

    await prisma.contact.update({
        where: { id },
        data: {
            lastWishedYear: wished ? currentYear : null,
        },
    });

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
