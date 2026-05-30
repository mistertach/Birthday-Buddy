import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getContacts } from '@/lib/contact-actions';
import { getEvents } from '@/lib/event-actions';
import DashboardClient from '@/components/dashboard-client';
import { prisma } from '@/lib/prisma';
import { ReminderType, type Contact, type PartyEvent } from '@/lib/types';

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const [contacts, rawUser, rawEvents] = await Promise.all([
        getContacts(),
        session.user?.email
            ? prisma.user.findUnique({ where: { email: session.user.email } })
            : null,
        getEvents(),
    ]);

    const normalizedContacts: Contact[] = contacts.map((contact: any) => ({
        id: contact.id,
        name: contact.name,
        day: contact.day,
        month: contact.month,
        year: contact.year ?? undefined,
        phone: contact.phone ?? undefined,
        relationship: contact.relationship ?? 'Friend',
        reminderType: (contact.reminderType ?? ReminderType.MORNING) as ReminderType,
        notes: contact.notes ?? undefined,
        lastWishedYear: contact.lastWishedYear ?? undefined,
        parentId: contact.parentId ?? undefined,
    }));

    const events: PartyEvent[] = rawEvents.map((e: any) => ({
        ...e,
        giftStatus: (e.giftStatus as any) || 'NONE',
        rsvpStatus: (e.rsvpStatus as any) || 'PENDING',
        location: e.location ?? null,
        contactId: e.contactId ?? null,
        giftBudget: e.giftBudget ?? null,
        giftNotes: e.giftNotes ?? null,
    }));

    const { getGlobalCategories } = await import('@/lib/contact-actions');
    const categories = await getGlobalCategories();

    // ── Pending invitation for this user (they may have registered via invite link
    //    but not yet accepted it — show a recovery banner on the dashboard)
    const pendingInvitation = session.user.email
        ? await prisma.invitation.findFirst({
            where: {
                recipientEmail: session.user.email,
                status: 'PENDING',
                expiresAt: { gt: new Date() },
            },
            include: {
                sender: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        })
        : null;

    // ── Count pending contact shares so the client can decide whether to show the notification
    const pendingSharesCount = rawUser
        ? await prisma.contactShare.count({
            where: { recipientId: rawUser.id, status: 'PENDING' },
        })
        : 0;

    return (
        <DashboardClient
            initialContacts={normalizedContacts}
            initialEvents={events}
            userName={session.user.name}
            isAdmin={rawUser?.isAdmin ?? false}
            initialCategories={categories}
            initialNotificationPref={rawUser?.wantsEmailNotifications ?? true}
            stats={{ streak: rawUser?.streak ?? 0, wishesDelivered: rawUser?.wishesDelivered ?? 0 }}
            isMyBirthday={!!(rawUser?.birthdayDay && rawUser?.birthdayMonth &&
            rawUser.birthdayDay === new Date().getDate() &&
            rawUser.birthdayMonth === new Date().getMonth() + 1)}
        userBirthday={rawUser?.birthdayDay && rawUser?.birthdayMonth
            ? { day: rawUser.birthdayDay, month: rawUser.birthdayMonth }
            : null}
        pendingInvitation={pendingInvitation ? {
                token: pendingInvitation.token,
                senderName: pendingInvitation.sender?.name ?? null,
                contactCount: pendingInvitation.sharedContactIds.length,
            } : null}
            hasPendingShares={pendingSharesCount > 0}
        />
    );
}
