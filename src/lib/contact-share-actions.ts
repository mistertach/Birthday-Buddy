'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { sendContactShareEmail } from '@/lib/email-actions';

/**
 * Check if a user exists by email without revealing their identity
 */
export async function checkUserExists(email: string): Promise<{ ok: boolean; exists: boolean; message?: string }> {
    const session = await auth();
    if (!session?.user?.email) {
        return { ok: false, exists: false, message: 'Unauthorized' };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            select: { id: true }
        });

        return { ok: true, exists: !!user };
    } catch (error) {
        console.error('Failed to check user existence:', error);
        return { ok: false, exists: false, message: 'Failed to verify user' };
    }
}

/**
 * Create a contact share to another existing user
 */
export async function createContactShare(
    recipientEmail: string,
    contactIds: string[],
    message?: string
): Promise<{ ok: boolean; message: string }> {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return { ok: false, message: 'Unauthorized' };
        }

        const sender = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!sender) {
            return { ok: false, message: 'User not found' };
        }

        // Check if sharing with self
        if (recipientEmail.toLowerCase() === session.user.email.toLowerCase()) {
            return { ok: false, message: 'You cannot share contacts with yourself' };
        }

        // Find recipient
        const recipient = await prisma.user.findUnique({
            where: { email: recipientEmail.toLowerCase().trim() }
        });

        if (!recipient) {
            return { ok: false, message: 'Recipient user not found. They may not be registered yet.' };
        }

        // Validate contact IDs
        if (!Array.isArray(contactIds) || contactIds.length === 0) {
            return { ok: false, message: 'No contacts selected' };
        }

        // Create the share
        await prisma.contactShare.create({
            data: {
                senderId: sender.id,
                recipientId: recipient.id,
                sharedContactIds: contactIds,
                message: message || null,
                status: 'PENDING'
            }
        });

        // Send email notification
        await sendContactShareEmail(recipient.email!, sender.name || 'A user', contactIds.length);

        return { ok: true, message: 'Contacts shared successfully!' };
    } catch (error: any) {
        console.error('Failed to create contact share:', error);
        return { ok: false, message: error?.message || 'Failed to share contacts' };
    }
}

/**
 * Get all pending contact shares for the current user
 */
export async function getPendingShares() {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return { ok: false, shares: [] };
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) {
            return { ok: false, shares: [] };
        }

        const shares = await prisma.contactShare.findMany({
            where: {
                recipientId: user.id,
                status: 'PENDING'
            },
            include: {
                sender: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return { ok: true, shares };
    } catch (error) {
        console.error('Failed to fetch pending shares:', error);
        return { ok: false, shares: [] };
    }
}

/**
 * Get details of a specific share including contact information
 */
export async function getShareDetails(shareId: string) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return null;
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) {
            return null;
        }

        const share = await prisma.contactShare.findUnique({
            where: { id: shareId },
            include: {
                sender: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        });

        if (!share || share.recipientId !== user.id) {
            return null;
        }

        // Fetch the shared contacts
        const contacts = await prisma.contact.findMany({
            where: {
                id: { in: share.sharedContactIds }
            },
            select: {
                id: true,
                name: true,
                relationship: true,
                day: true,
                month: true
            }
        });

        return {
            share,
            contacts
        };
    } catch (error) {
        console.error('Failed to fetch share details:', error);
        return null;
    }
}

/**
 * Accept a contact share and import selected contacts
 */
export async function acceptContactShare(
    shareId: string,
    selectedContactIds?: string[]
): Promise<{ ok: boolean; message: string }> {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return { ok: false, message: 'Unauthorized' };
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) {
            return { ok: false, message: 'User not found' };
        }

        const share = await prisma.contactShare.findUnique({
            where: { id: shareId }
        });

        if (!share || share.recipientId !== user.id) {
            return { ok: false, message: 'Share not found' };
        }

        if (share.status !== 'PENDING') {
            return { ok: false, message: 'This share has already been processed' };
        }

        // Determine which contacts to import
        let idsToImport = share.sharedContactIds;
        if (selectedContactIds && Array.isArray(selectedContactIds)) {
            const allowedSet = new Set(share.sharedContactIds);
            idsToImport = selectedContactIds.filter(id => allowedSet.has(id));
        }

        if (idsToImport.length === 0) {
            return { ok: false, message: 'No contacts selected' };
        }

        // Fetch original contacts
        const originalContacts = await prisma.contact.findMany({
            where: {
                id: { in: idsToImport }
            }
        });

        // Create new contacts for the recipient
        const newContactsData = originalContacts.map(c => ({
            userId: user.id,
            name: c.name,
            day: c.day,
            month: c.month,
            year: c.year,
            phone: c.phone,
            relationship: c.relationship,
            reminderType: c.reminderType,
            notes: c.notes ? `${c.notes} (Shared contact)` : 'Shared contact'
        }));

        await prisma.contact.createMany({
            data: newContactsData
        });

        // Update share status
        await prisma.contactShare.update({
            where: { id: shareId },
            data: { status: 'ACCEPTED' }
        });

        revalidatePath('/dashboard');
        return { ok: true, message: `Successfully added ${newContactsData.length} contact(s)!` };
    } catch (error: any) {
        console.error('Failed to accept contact share:', error);
        return { ok: false, message: error?.message || 'Failed to accept share' };
    }
}

/**
 * Reject a contact share
 */
export async function rejectContactShare(shareId: string): Promise<{ ok: boolean; message: string }> {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return { ok: false, message: 'Unauthorized' };
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) {
            return { ok: false, message: 'User not found' };
        }

        const share = await prisma.contactShare.findUnique({
            where: { id: shareId }
        });

        if (!share || share.recipientId !== user.id) {
            return { ok: false, message: 'Share not found' };
        }

        if (share.status !== 'PENDING') {
            return { ok: false, message: 'This share has already been processed' };
        }

        await prisma.contactShare.update({
            where: { id: shareId },
            data: { status: 'REJECTED' }
        });

        revalidatePath('/dashboard');
        return { ok: true, message: 'Share rejected' };
    } catch (error: any) {
        console.error('Failed to reject contact share:', error);
        return { ok: false, message: error?.message || 'Failed to reject share' };
    }
}
