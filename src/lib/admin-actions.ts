'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getAllUsers() {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error('Unauthorized');
    }

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!currentUser?.isAdmin) {
        throw new Error('Admin access required');
    }

    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            isAdmin: true,
            wantsEmailNotifications: true,
            emailVerified: true,
            _count: {
                select: {
                    contacts: true,
                },
            },
        },
        orderBy: {
            name: 'asc',
        },
    });

    return users;
}

export async function toggleUserAdmin(userId: string) {
    const session = await auth();
    if (!session?.user?.email) {
        return { ok: false, message: 'Unauthorized' };
    }

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!currentUser?.isAdmin) {
        return { ok: false, message: 'Admin access required' };
    }

    // Prevent removing your own admin status
    if (currentUser.id === userId) {
        return { ok: false, message: 'Cannot modify your own admin status' };
    }

    const targetUser = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!targetUser) {
        return { ok: false, message: 'User not found' };
    }

    await prisma.user.update({
        where: { id: userId },
        data: { isAdmin: !targetUser.isAdmin },
    });

    revalidatePath('/admin');
    return { ok: true, message: `User ${targetUser.isAdmin ? 'removed from' : 'added to'} admin` };
}

export async function toggleUserNotifications(userId: string) {
    const session = await auth();
    if (!session?.user?.email) {
        return { ok: false, message: 'Unauthorized' };
    }

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!currentUser?.isAdmin) {
        return { ok: false, message: 'Admin access required' };
    }

    const targetUser = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!targetUser) {
        return { ok: false, message: 'User not found' };
    }

    await prisma.user.update({
        where: { id: userId },
        data: { wantsEmailNotifications: !targetUser.wantsEmailNotifications },
    });

    revalidatePath('/admin');
    return { ok: true, message: 'Notification preference updated' };
}

export async function deleteUser(userId: string) {
    const session = await auth();
    if (!session?.user?.email) {
        return { ok: false, message: 'Unauthorized' };
    }

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!currentUser?.isAdmin) {
        return { ok: false, message: 'Admin access required' };
    }

    // Prevent deleting yourself
    if (currentUser.id === userId) {
        return { ok: false, message: 'Cannot delete your own account' };
    }

    await prisma.user.delete({
        where: { id: userId },
    });

    revalidatePath('/admin');
    return { ok: true, message: 'User deleted successfully' };
}

export async function getSystemStats() {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error('Unauthorized');
    }

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!currentUser?.isAdmin) {
        throw new Error('Admin access required');
    }

    const [totalUsers, totalContacts, activeUsers, settings] = await Promise.all([
        prisma.user.count(),
        prisma.contact.count(),
        prisma.user.count({
            where: { wantsEmailNotifications: true },
        }),
        prisma.appSettings.findUnique({
            where: { id: 1 },
        }),
    ]);

    return {
        totalUsers,
        totalContacts,
        activeUsers,
        emailConfigured: !!(settings?.resendApiKey && settings?.resendFromEmail),
    };
}

export async function triggerCronManually() {
    const session = await auth();
    if (!session?.user?.email) {
        return { ok: false, message: 'Unauthorized' };
    }

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!currentUser?.isAdmin) {
        return { ok: false, message: 'Admin access required' };
    }

    try {
        // Call the cron endpoint
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000';

        const response = await fetch(`${baseUrl}/api/cron/birthday-reminders`, {
            method: 'GET',
        });

        const data = await response.json();

        if (!response.ok) {
            return { ok: false, message: 'Failed to trigger cron job', data };
        }

        return { ok: true, message: 'Cron job triggered successfully', data };
    } catch (error: any) {
        console.error('Error triggering cron:', error);
        return { ok: false, message: error.message || 'Failed to trigger cron job' };
    }
}

export async function getResendSettings() {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error('Unauthorized');
    }

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!currentUser?.isAdmin) {
        throw new Error('Admin access required');
    }

    const settings = await prisma.appSettings.findUnique({
        where: { id: 1 },
    });

    return {
        resendApiKey: settings?.resendApiKey || '',
        resendFromEmail: settings?.resendFromEmail || '',
    };
}

export async function saveResendSettings({ apiKey, fromEmail }: { apiKey: string; fromEmail: string }) {
    const session = await auth();
    if (!session?.user?.email) {
        return { ok: false, message: 'Unauthorized' };
    }

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!currentUser?.isAdmin) {
        return { ok: false, message: 'Admin access required' };
    }

    const trimmedApiKey = apiKey.trim();
    const trimmedFromEmail = fromEmail.trim();

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (trimmedFromEmail && !EMAIL_REGEX.test(trimmedFromEmail)) {
        return { ok: false, message: 'Please enter a valid sender email address.' };
    }

    try {
        await prisma.appSettings.upsert({
            where: { id: 1 },
            create: {
                id: 1,
                resendApiKey: trimmedApiKey || null,
                resendFromEmail: trimmedFromEmail || null,
            },
            update: {
                resendApiKey: trimmedApiKey || null,
                resendFromEmail: trimmedFromEmail || null,
            },
        });

        revalidatePath('/admin');

        return {
            ok: true,
            message: trimmedApiKey
                ? 'Resend settings saved successfully'
                : 'Resend settings cleared',
        };
    } catch (error: any) {
        console.error('Failed to save Resend settings:', error);
        return {
            ok: false,
            message: 'Unable to save settings. Please try again.',
        };
    }
}

export async function sendAdminTestEmail() {
    const session = await auth();
    if (!session?.user?.email) {
        return { ok: false, message: 'Unauthorized' };
    }

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!currentUser?.isAdmin) {
        return { ok: false, message: 'Admin access required' };
    }

    const settings = await prisma.appSettings.findUnique({
        where: { id: 1 },
    });

    if (!settings?.resendApiKey) {
        return { ok: false, message: 'Resend API key is not configured yet.' };
    }

    if (!settings.resendFromEmail) {
        return { ok: false, message: 'From email address is missing. Please set it before testing.' };
    }

    try {
        const { Resend } = await import('resend');
        const resend = new Resend(settings.resendApiKey);

        await resend.emails.send({
            from: `Birthday Buddy <${settings.resendFromEmail}>`,
            to: session.user.email,
            subject: 'Birthday Buddy – Admin Test Email',
            html: `
                <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #334155;">
                    <h2 style="color:#4f46e5;">🎉 Birthday Buddy Admin Test</h2>
                    <p>This is a confirmation that your Resend integration is configured correctly.</p>
                    <p>The system is ready to send birthday reminders!</p>
                    <p style="margin-top:24px; font-size:12px; color:#64748b;">Sent from the Admin Panel</p>
                </div>
            `,
        });

        return { ok: true, message: 'Test email sent! Please check your inbox.' };
    } catch (error: any) {
        console.error('Failed to send admin test email:', error);
        const message = error?.message ?? 'Failed to send test email via Resend.';
        return { ok: false, message };
    }
}

export async function getCategories() {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error('Unauthorized');
    }

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!currentUser?.isAdmin) {
        throw new Error('Admin access required');
    }

    // Get unique categories from all contacts
    const contacts = await prisma.contact.findMany({
        select: {
            relationship: true,
        },
        distinct: ['relationship'],
    });

    const categories = contacts
        .map(c => c.relationship)
        .filter((cat): cat is string => cat !== null)
        .sort();

    // Ensure default categories exist
    const defaultCategories = ['Work', 'Family', 'Friends', 'Other'];
    const allCategories = Array.from(new Set([...defaultCategories, ...categories]));

    return allCategories.sort();
}

export async function addCategory(category: string) {
    const session = await auth();
    if (!session?.user?.email) {
        return { ok: false, message: 'Unauthorized' };
    }

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!currentUser?.isAdmin) {
        return { ok: false, message: 'Admin access required' };
    }

    const trimmedCategory = category.trim();
    if (!trimmedCategory) {
        return { ok: false, message: 'Category name cannot be empty' };
    }

    if (trimmedCategory.length > 50) {
        return { ok: false, message: 'Category name is too long (max 50 characters)' };
    }

    revalidatePath('/admin');
    return { ok: true, message: `Category "${trimmedCategory}" is now available`, category: trimmedCategory };
}

export async function deleteCategory(category: string) {
    const session = await auth();
    if (!session?.user?.email) {
        return { ok: false, message: 'Unauthorized' };
    }

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!currentUser?.isAdmin) {
        return { ok: false, message: 'Admin access required' };
    }

    // Prevent deleting default categories
    const defaultCategories = ['Work', 'Family', 'Friends', 'Other'];
    if (defaultCategories.includes(category)) {
        return { ok: false, message: 'Cannot delete default categories' };
    }

    // Update all contacts with this category to 'Other'
    await prisma.contact.updateMany({
        where: { relationship: category },
        data: { relationship: 'Other' },
    });

    revalidatePath('/admin');
    return { ok: true, message: `Category "${category}" deleted. Contacts moved to "Other"` };
}
