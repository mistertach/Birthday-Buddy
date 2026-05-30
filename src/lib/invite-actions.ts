'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendInvitationEmail } from '@/lib/email-actions';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';


export async function createInvitation(recipientEmail: string, contactIds: string[], shareSenderBirthday = false) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return { ok: false, message: 'Unauthorized' };
        }

        if (recipientEmail.toLowerCase() === session.user.email.toLowerCase()) {
            return { ok: false, message: 'You cannot invite yourself.' };
        }

        if (!Array.isArray(contactIds)) {
            return { ok: false, message: 'Invalid contacts selected.' };
        }

        const sender = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!sender) {
            return { ok: false, message: 'User not found' };
        }

        // Generate a secure random token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

        // Encode shareSenderBirthday as a sentinel in the contactIds array.
        // '__SENDER_BIRTHDAY__' is stripped at accept time and handled specially.
        const allIds = [...contactIds];
        if (shareSenderBirthday) allIds.push('__SENDER_BIRTHDAY__');

        const invitation = await prisma.invitation.create({
            data: {
                token,
                senderId: sender.id,
                recipientEmail,
                sharedContactIds: allIds,
                expiresAt,
            },
        });

        // Determine base URL
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : process.env.NEXTAUTH_URL || 'http://localhost:3000';

        const inviteLink = `${baseUrl}/invite/${token}`;

        // Send email
        const emailResult = await sendInvitationEmail(recipientEmail, sender.name || 'A friend', inviteLink);

        if (!emailResult.ok) {
            // If email fails, return partial success with warning
            console.warn('Invitation created but email failed:', emailResult.message);
            return {
                ok: true,
                message: 'Invitation created but email failed to send. You can copy the link manually.',
                link: inviteLink
            };
        }

        return { ok: true, message: 'Invitation sent successfully!' };
    } catch (error: any) {
        console.error('Failed to create invitation:', error);
        return { ok: false, message: error?.message || 'Failed to create invitation' };
    }
}

export async function getInvitationByToken(token: string) {
    try {
        const invitation = await prisma.invitation.findUnique({
            where: { token },
            include: {
                sender: {
                    select: { name: true, email: true }
                }
            }
        });

        if (!invitation) return null;

        // Check expiration
        if (new Date() > invitation.expiresAt) {
            return { error: 'EXPIRED', message: 'This invitation has expired.' };
        }

        if (invitation.status !== 'PENDING') {
            return { error: 'USED', message: 'This invitation has already been used.' };
        }

        // Filter sentinel before querying contacts
        const hasSenderBday = invitation.sharedContactIds.includes('__SENDER_BIRTHDAY__');
        const realIds = invitation.sharedContactIds.filter(id => id !== '__SENDER_BIRTHDAY__');

        const sharedContacts = await prisma.contact.findMany({
            where: {
                id: { in: realIds }
            },
            select: {
                id: true,
                name: true,
                relationship: true
            }
        });

        return {
            invitation,
            sharedContacts,
            hasSenderBirthday: hasSenderBday,
        };
    } catch (error) {
        console.error('Failed to fetch invitation:', error);
        return null;
    }
}

export async function acceptInvitation(token: string, selectedContactIds?: string[]) {
    const session = await auth();
    if (!session?.user?.email) {
        return { ok: false, message: 'Unauthorized. Please sign in or register first.' };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return { ok: false, message: 'User not found' };
    }

    const invitation = await prisma.invitation.findUnique({
        where: { token },
    });

    if (!invitation || invitation.status !== 'PENDING') {
        return { ok: false, message: 'Invalid or expired invitation' };
    }

    try {
        // Determine which IDs to actually import.
        // If selectedContactIds is provided, intersect with invitation.sharedContactIds for security.
        // If not provided (legacy/default), import all shared.
        // Separate sentinel from real contact IDs
        const hasSenderBirthday = invitation.sharedContactIds.includes('__SENDER_BIRTHDAY__');
        const realContactIds = invitation.sharedContactIds.filter(id => id !== '__SENDER_BIRTHDAY__');

        let idsToImport = realContactIds;
        if (selectedContactIds && Array.isArray(selectedContactIds)) {
            const allowedSet = new Set(realContactIds);
            idsToImport = selectedContactIds.filter(id => allowedSet.has(id));
        }

        // Fetch the original contacts to copy
        const originalContacts = await prisma.contact.findMany({
            where: {
                id: { in: idsToImport }
            }
        });

        // Prepare data for new contacts
        // Fetch the sender's name for the notes attribution
        const inviteSender = await prisma.user.findUnique({
            where: { id: invitation.senderId },
            select: { name: true },
        });
        const senderLabel = inviteSender?.name || 'a friend';

        const newContactsData = originalContacts.map((c: any) => ({
            userId: user.id,
            name: c.name,
            day: c.day,
            month: c.month,
            year: c.year,
            phone: c.phone,
            relationship: c.relationship,
            reminderType: c.reminderType,
            notes: c.notes ? `${c.notes} (Shared by ${senderLabel})` : `Shared by ${senderLabel}`,
        }));

        if (newContactsData.length > 0) {
            await prisma.contact.createMany({ data: newContactsData });
        }

        // If sender shared their own birthday, add them as a contact too
        if (hasSenderBirthday) {
            const senderFull = await prisma.user.findUnique({
                where: { id: invitation.senderId },
                select: { name: true, birthdayDay: true, birthdayMonth: true },
            });
            if (senderFull?.birthdayDay && senderFull?.birthdayMonth && senderFull?.name) {
                await prisma.contact.create({
                    data: {
                        userId: user.id,
                        name: senderFull.name,
                        day: senderFull.birthdayDay,
                        month: senderFull.birthdayMonth,
                        relationship: 'Friend',
                        reminderType: 'Morning of',
                        notes: 'Added from Birthday Buddy invite',
                    },
                });
            }
        }

        // Update invitation status
        await prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: 'ACCEPTED' }
        });

        revalidatePath('/dashboard');
        return { ok: true, message: `Successfully accepted invitation and added ${newContactsData.length} contacts!` };
    } catch (error) {
        console.error('Failed to accept invitation:', error);
        return { ok: false, message: 'Failed to process acceptance' };
    }
}
