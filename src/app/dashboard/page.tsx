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

    const contacts = await getContacts();

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

    const rawUser = session.user?.email
        ? await prisma.user.findUnique({
            where: { email: session.user.email },
        })
        : null;

    const isAdmin = rawUser?.isAdmin ?? false;
    const notificationPref = rawUser?.wantsEmailNotifications ?? true;

    // Fetch global categories
    const { getGlobalCategories } = await import('@/lib/contact-actions');
    const categories = await getGlobalCategories();

    const streak = rawUser?.streak ?? 0;
    const wishesDelivered = rawUser?.wishesDelivered ?? 0;

    const rawEvents = await getEvents();
    const events: PartyEvent[] = rawEvents.map((e: any) => ({
        ...e,
        giftStatus: (e.giftStatus as any) || 'NONE',
        rsvpStatus: (e.rsvpStatus as any) || 'PENDING',
        location: e.location ?? null,
        contactId: e.contactId ?? null,
        giftBudget: e.giftBudget ?? null,
        giftNotes: e.giftNotes ?? null
    }));

    return (
        <DashboardClient
            initialContacts={normalizedContacts}
            initialEvents={events}
            userName={session.user.name}
            isAdmin={isAdmin}
            initialCategories={categories}
            initialNotificationPref={notificationPref}
            stats={{ streak, wishesDelivered }}
        />
    );
}

