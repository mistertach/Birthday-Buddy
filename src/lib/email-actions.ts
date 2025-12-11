'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { revalidatePath } from 'next/cache';
import { ReminderType } from '@/lib/types';

type ResendSettings = {
  resendApiKey: string;
  resendFromEmail: string;
};

const DEFAULT_TEST_SUBJECT = 'Birthday Buddy – Test Email';
const DEFAULT_TEST_HTML = `
  <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #334155;">
    <h2 style="color:#4f46e5;">🎉 Birthday Buddy Test</h2>
    <p>This is a confirmation that your Resend integration is configured correctly.</p>
    <p>You will start receiving birthday reminders based on your dashboard settings.</p>
    <p style="margin-top:24px; font-size:12px; color:#64748b;">If you did not request this email, you can safely ignore it.</p>
  </div>
`;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function getSharedSettingsRecord(): Promise<ResendSettings | null> {
  try {
    const rows = (await prisma.$queryRaw`
      SELECT "resendApiKey" AS "resendApiKey", "resendFromEmail" AS "resendFromEmail"
      FROM "AppSettings"
      WHERE "id" = 1
    `) as { resendApiKey: string | null; resendFromEmail: string | null }[];

    const result = rows[0];
    if (!result?.resendApiKey || !result?.resendFromEmail) {
      return null;
    }

    return {
      resendApiKey: result.resendApiKey,
      resendFromEmail: result.resendFromEmail,
    };
  } catch (error: any) {
    if (error?.code === '42P01') {
      console.error('AppSettings table is missing. Apply the latest Prisma migration to create it.', error);
      return null;
    }

    console.error('Failed to load shared Resend settings:', error);
    throw error;
  }
}

export async function saveResendSettings({
  apiKey,
  fromEmail,
}: {
  apiKey: string;
  fromEmail: string;
}): Promise<{ ok: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.email) {
    return { ok: false, message: 'You must be signed in to update email settings.' };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!(user as any)?.isAdmin) {
    return { ok: false, message: 'Only administrators can update Resend settings.' };
  }

  const trimmedApiKey = apiKey.trim();
  const trimmedFromEmail = fromEmail.trim();

  if (trimmedFromEmail && !EMAIL_REGEX.test(trimmedFromEmail)) {
    return { ok: false, message: 'Please enter a valid sender email address.' };
  }

  try {
    await prisma.$executeRaw`
      INSERT INTO "AppSettings" ("id", "resendApiKey", "resendFromEmail", "createdAt", "updatedAt")
      VALUES (1, ${trimmedApiKey || null}, ${trimmedFromEmail || null}, now(), now())
      ON CONFLICT ("id")
      DO UPDATE SET
        "resendApiKey" = EXCLUDED."resendApiKey",
        "resendFromEmail" = EXCLUDED."resendFromEmail",
        "updatedAt" = now();
    `;

    revalidatePath('/dashboard');

    return {
      ok: true,
      message: trimmedApiKey
        ? 'Resend settings saved. You can now send birthday reminders.'
        : 'Resend settings cleared.',
    };
  } catch (error: any) {
    if (error?.code === '42P01') {
      console.error('AppSettings table missing while saving Resend settings.', error);
      return {
        ok: false,
        message: 'Email settings storage is missing. Apply the latest database migration and try again.',
      };
    }

    console.error('Failed to save Resend settings:', error);
    return {
      ok: false,
      message: 'Unable to save settings right now. Please try again in a moment.',
    };
  }
}

export async function sendResendTestEmail() {
  const session = await auth();
  if (!session?.user?.email) {
    return { ok: false, message: 'Unauthorized' };
  }

  const settings = await getSharedSettingsRecord();

  if (!settings?.resendApiKey) {
    return { ok: false, message: 'Resend API key is not configured yet.' };
  }

  if (!settings.resendFromEmail) {
    return { ok: false, message: 'From email address is missing. Please set it before testing.' };
  }

  try {
    const resend = new Resend(settings.resendApiKey);
    await resend.emails.send({
      from: `Birthday Buddy <${settings.resendFromEmail}>`,
      to: session.user.email,
      subject: DEFAULT_TEST_SUBJECT,
      html: DEFAULT_TEST_HTML,
    });

    return { ok: true, message: 'Test email sent! Please check your inbox.' };
  } catch (error: any) {
    console.error('Failed to send Resend test email:', error);
    const message = error?.message ?? 'Failed to send test email via Resend.';
    return { ok: false, message };
  }
}

export async function getSharedResendSettings(): Promise<ResendSettings | null> {
  return getSharedSettingsRecord();
}

function normalizeReminderType(reminderType: string | null | undefined): ReminderType | null {
  if (!reminderType) return ReminderType.MORNING;
  const values = new Set(Object.values(ReminderType));
  return values.has(reminderType as ReminderType) ? (reminderType as ReminderType) : ReminderType.MORNING;
}

type BirthdayContact = {
  id: string;
  name: string;
  day: number;
  month: number;
  year: number | null;
  relationship: string | null;
  reminderType: string | null;
  userId: string;
};

function getDaysUntilDate(day: number, month: number): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(today.getFullYear(), month - 1, day);
  if (target < today) {
    target.setFullYear(target.getFullYear() + 1);
  }
  const diff = target.getTime() - today.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function isBirthdayToday(day: number, month: number, reference: Date) {
  return reference.getDate() === day && reference.getMonth() === month - 1;
}

function formatBirthdayLine(contact: BirthdayContact): string {
  const relationship = contact.relationship ? ` (${contact.relationship})` : '';
  return `• ${contact.name}${relationship} – ${contact.day}/${contact.month}`;
}

function formatWeeklyEmailHTML(userName: string | null | undefined, contacts: BirthdayContact[]): string {
  const intro = userName ? `Hi ${userName},` : 'Hi there,';
  const items = contacts
    .map((contact) => {
      const daysUntil = getDaysUntilDate(contact.day, contact.month);
      const relationship = contact.relationship ? ` (${contact.relationship})` : '';
      const humanTiming = daysUntil === 0 ? '🎉 Today!' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`;
      return `
        <li style="margin-bottom:12px;">
          <strong>${contact.name}</strong>${relationship}<br/>
          <span style="color:#475569; font-size:14px;">${humanTiming} • ${contact.day}/${contact.month}${contact.year ? `/${contact.year}` : ''}</span>
        </li>
      `;
    })
    .join('');

  return `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#0f172a;">
      <h1 style="color:#4f46e5; font-size:22px;">🎉 Your birthday preview for the week</h1>
      <p style="font-size:16px; line-height:24px;">${intro}</p>
      <p style="font-size:15px; line-height:22px;">Here are the birthdays coming up in the next 7 days:</p>
      <ul style="padding-left:18px; margin-top:18px; list-style:disc;">${items}</ul>
      <p style="margin-top:24px; font-size:13px; color:#64748b;">You can mark wishes or add notes anytime in your Birthday Buddy dashboard.</p>
    </div>
  `;
}

function formatDailyEmailHTML(userName: string | null | undefined, contacts: BirthdayContact[]): string {
  const intro = userName ? `Good morning ${userName},` : 'Good morning,';
  const lines = contacts.map(formatBirthdayLine).join('<br/>');
  return `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#0f172a;">
      <h1 style="color:#ef4444; font-size:22px;">🎂 Today\'s birthdays</h1>
      <p style="font-size:16px; line-height:24px;">${intro}</p>
      <p style="font-size:15px; line-height:22px;">It\'s time to celebrate these friends today:</p>
      <div style="margin-top:16px; font-size:15px; line-height:22px;">${lines}</div>
      <p style="margin-top:24px; font-size:13px; color:#64748b;">Open Birthday Buddy to send wishes and log that you reached out.</p>
    </div>
  `;
}

async function fetchEligibleUsers() {
  return prisma.user.findMany({
    where: {
      wantsEmailNotifications: true,
      email: { not: null },
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
}

async function fetchContactsForUser(userId: string): Promise<BirthdayContact[]> {
  const contacts = (await prisma.contact.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      day: true,
      month: true,
      year: true,
      relationship: true,
      reminderType: true,
      userId: true,
    },
  })) as BirthdayContact[];

  return contacts;
}

export async function sendWeeklyBirthdayReminders() {
  const settings = await getSharedSettingsRecord();
  if (!settings) {
    return { ok: false, message: 'Shared Resend settings are not configured.' };
  }

  const resend = new Resend(settings.resendApiKey);
  const referenceDate = new Date();
  referenceDate.setHours(0, 0, 0, 0);

  const users = await fetchEligibleUsers();

  const results: { userEmail: string | null; sent: boolean; contacts: number; error?: string }[] = [];

  for (const user of users) {
    const contacts = await fetchContactsForUser(user.id);
    const upcoming = contacts.filter((contact) => {
      const reminderPref = normalizeReminderType(contact.reminderType);
      if (reminderPref === ReminderType.NONE) return false;

      const daysUntil = getDaysUntilDate(contact.day, contact.month);
      if (daysUntil > 7 || daysUntil < 0) return false;

      return reminderPref === ReminderType.WEEK_BEFORE || reminderPref === ReminderType.MORNING || reminderPref === ReminderType.DAY_BEFORE;
    });

    if (!upcoming.length || !user.email) {
      results.push({ userEmail: user.email, sent: false, contacts: 0 });
      continue;
    }

    try {
      await resend.emails.send({
        from: `Birthday Buddy <${settings.resendFromEmail}>`,
        to: user.email,
        subject: '🎉 Your Birthday Buddy week ahead',
        html: formatWeeklyEmailHTML(user.name, upcoming),
      });

      results.push({ userEmail: user.email, sent: true, contacts: upcoming.length });
    } catch (error: any) {
      console.error('Failed to send weekly reminder', { userId: user.id, error });
      results.push({ userEmail: user.email, sent: false, contacts: upcoming.length, error: error?.message });
    }
  }

  return { ok: true, results };
}

export async function sendDayOfBirthdayReminders() {
  const settings = await getSharedSettingsRecord();
  if (!settings) {
    return { ok: false, message: 'Shared Resend settings are not configured.' };
  }

  const resend = new Resend(settings.resendApiKey);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const users = await fetchEligibleUsers();
  const results: { userEmail: string | null; sent: boolean; contacts: number; error?: string }[] = [];

  for (const user of users) {
    const contacts = await fetchContactsForUser(user.id);
    const todaysBirthdays = contacts.filter((contact) => {
      const reminderPref = normalizeReminderType(contact.reminderType);
      if (reminderPref === ReminderType.NONE) return false;
      if (reminderPref === ReminderType.WEEK_BEFORE) return false;
      return isBirthdayToday(contact.day, contact.month, today);
    });

    if (!todaysBirthdays.length || !user.email) {
      results.push({ userEmail: user.email, sent: false, contacts: 0 });
      continue;
    }

    try {
      await resend.emails.send({
        from: `Birthday Buddy <${settings.resendFromEmail}>`,
        to: user.email,
        subject: '🎂 Birthdays to celebrate today',
        html: formatDailyEmailHTML(user.name, todaysBirthdays),
      });

      results.push({ userEmail: user.email, sent: true, contacts: todaysBirthdays.length });
    } catch (error: any) {
      console.error('Failed to send daily reminder', { userId: user.id, error });
      results.push({ userEmail: user.email, sent: false, contacts: todaysBirthdays.length, error: error?.message });
    }
  }

  return { ok: true, results };
}

/**
 * Send a test daily birthday reminder email to the current user
 */
export async function sendTestDailyEmail() {
  const session = await auth();
  if (!session?.user?.email) {
    return { ok: false, message: 'Unauthorized' };
  }

  const settings = await getSharedSettingsRecord();
  if (!settings?.resendApiKey) {
    return { ok: false, message: 'Resend API key is not configured yet.' };
  }

  if (!settings.resendFromEmail) {
    return { ok: false, message: 'From email address is missing. Please set it before testing.' };
  }

  // Get current user
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true }
  });

  if (!user) {
    return { ok: false, message: 'User not found' };
  }

  // Fetch user's real contacts
  const contacts = await fetchContactsForUser(user.id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter for today's birthdays
  const todaysBirthdays = contacts.filter((contact) => {
    const reminderPref = normalizeReminderType(contact.reminderType);
    if (reminderPref === ReminderType.NONE) return false;
    if (reminderPref === ReminderType.WEEK_BEFORE) return false;
    return isBirthdayToday(contact.day, contact.month, today);
  });

  // Use real data if available, otherwise use sample data
  const contactsToShow = todaysBirthdays.length > 0 ? todaysBirthdays : [
    {
      id: 'sample-1',
      name: 'John Doe',
      day: today.getDate(),
      month: today.getMonth() + 1,
      year: 1990,
      relationship: 'Friend',
      reminderType: 'MORNING',
      userId: 'test'
    },
    {
      id: 'sample-2',
      name: 'Jane Smith',
      day: today.getDate(),
      month: today.getMonth() + 1,
      year: null,
      relationship: 'Family',
      reminderType: 'MORNING',
      userId: 'test'
    }
  ];

  const subjectPrefix = todaysBirthdays.length > 0 ? '[TEST - Real Data]' : '[TEST - Sample Data]';

  try {
    const resend = new Resend(settings.resendApiKey);
    await resend.emails.send({
      from: `Birthday Buddy <${settings.resendFromEmail}>`,
      to: session.user.email,
      subject: `🎂 ${subjectPrefix} Birthdays to celebrate today`,
      html: formatDailyEmailHTML(session.user.name, contactsToShow),
    });

    const dataType = todaysBirthdays.length > 0
      ? `Test daily email sent with ${todaysBirthdays.length} real birthday(s)!`
      : 'Test daily email sent with sample data (no real birthdays today).';

    return { ok: true, message: `${dataType} Check your inbox to see how it looks.` };
  } catch (error: any) {
    console.error('Failed to send test daily email:', error);
    const message = error?.message ?? 'Failed to send test email.';
    return { ok: false, message };
  }
}

/**
 * Send a test weekly birthday reminder email to the current user
 */
export async function sendTestWeeklyEmail() {
  const session = await auth();
  if (!session?.user?.email) {
    return { ok: false, message: 'Unauthorized' };
  }

  const settings = await getSharedSettingsRecord();
  if (!settings?.resendApiKey) {
    return { ok: false, message: 'Resend API key is not configured yet.' };
  }

  if (!settings.resendFromEmail) {
    return { ok: false, message: 'From email address is missing. Please set it before testing.' };
  }

  // Get current user
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true }
  });

  if (!user) {
    return { ok: false, message: 'User not found' };
  }

  // Fetch user's real contacts
  const contacts = await fetchContactsForUser(user.id);

  // Filter for upcoming birthdays in next 7 days
  const upcoming = contacts.filter((contact) => {
    const reminderPref = normalizeReminderType(contact.reminderType);
    if (reminderPref === ReminderType.NONE) return false;

    const daysUntil = getDaysUntilDate(contact.day, contact.month);
    if (daysUntil > 7 || daysUntil < 0) return false;

    return reminderPref === ReminderType.WEEK_BEFORE || reminderPref === ReminderType.MORNING || reminderPref === ReminderType.DAY_BEFORE;
  });

  // Use real data if available, otherwise use sample data
  const today = new Date();
  const contactsToShow = upcoming.length > 0 ? upcoming : [
    {
      id: 'sample-1',
      name: 'Alice Johnson',
      day: today.getDate(),
      month: today.getMonth() + 1,
      year: 1985,
      relationship: 'Friend',
      reminderType: 'MORNING',
      userId: 'test'
    },
    {
      id: 'sample-2',
      name: 'Bob Williams',
      day: today.getDate() + 2,
      month: today.getMonth() + 1,
      year: 1992,
      relationship: 'Work',
      reminderType: 'WEEK_BEFORE',
      userId: 'test'
    },
    {
      id: 'sample-3',
      name: 'Carol Martinez',
      day: today.getDate() + 5,
      month: today.getMonth() + 1,
      year: null,
      relationship: 'Family',
      reminderType: 'WEEK_BEFORE',
      userId: 'test'
    }
  ];

  const subjectPrefix = upcoming.length > 0 ? '[TEST - Real Data]' : '[TEST - Sample Data]';

  try {
    const resend = new Resend(settings.resendApiKey);
    await resend.emails.send({
      from: `Birthday Buddy <${settings.resendFromEmail}>`,
      to: session.user.email,
      subject: `🎉 ${subjectPrefix} Your Birthday Buddy week ahead`,
      html: formatWeeklyEmailHTML(session.user.name, contactsToShow),
    });

    const dataType = upcoming.length > 0
      ? `Test weekly email sent with ${upcoming.length} real upcoming birthday(s)!`
      : 'Test weekly email sent with sample data (no real birthdays in next 7 days).';

    return { ok: true, message: `${dataType} Check your inbox to see how it looks.` };
  } catch (error: any) {
    console.error('Failed to send test weekly email:', error);
    const message = error?.message ?? 'Failed to send test email.';
    return { ok: false, message };
  }
}

export async function sendInvitationEmail(
  toEmail: string,
  senderName: string,
  inviteLink: string
): Promise<{ ok: boolean; message?: string }> {
  const settings = await getSharedSettingsRecord();
  if (!settings?.resendApiKey || !settings?.resendFromEmail) {
    return { ok: false, message: 'Email settings are not configured.' };
  }

  try {
    const resend = new Resend(settings.resendApiKey);
    await resend.emails.send({
      from: `Birthday Buddy <${settings.resendFromEmail}>`,
      to: toEmail,
      subject: `${senderName} invited you to Birthday Buddy!`,
      html: `
        <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #334155;">
          <h2 style="color:#4f46e5;">🎉 You've been invited!</h2>
          <p><strong>${senderName}</strong> wants to share their birthday contacts with you on Birthday Buddy.</p>
          <p style="font-size: 16px; margin: 16px 0;"><strong>Never again miss a birthday!</strong> Birthday Buddy helps you organize your contacts and sends you timely reminders so you can be the best friend/relative ever.</p>
          <p>Click the link below to accept the invitation and import the shared contacts:</p>
          <p>
            <a href="${inviteLink}" style="display:inline-block; background-color:#4f46e5; color:white; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:bold;">Accept Invitation</a>
          </p>
          <p style="margin-top:24px; font-size:12px; color:#64748b;">If you ignore this email, the invitation will expire automatically.</p>
        </div>
      `,
    });

    return { ok: true };
  } catch (error: any) {
    console.error('Failed to send invitation email:', error);
    return { ok: false, message: error?.message ?? 'Failed to send invitation email.' };
  }
}

export async function sendContactShareEmail(
  toEmail: string,
  senderName: string,
  contactCount: number
): Promise<{ ok: boolean; message?: string }> {
  const settings = await getSharedSettingsRecord();
  if (!settings?.resendApiKey || !settings?.resendFromEmail) {
    return { ok: false, message: 'Email settings are not configured.' };
  }

  try {
    const resend = new Resend(settings.resendApiKey);
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXTAUTH_URL || 'http://localhost:3000';

    await resend.emails.send({
      from: `Birthday Buddy <${settings.resendFromEmail}>`,
      to: toEmail,
      subject: `${senderName} shared birthday contacts with you!`,
      html: `
        <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #334155;">
          <h2 style="color:#4f46e5;">🎁 Contact Share Notification</h2>
          <p><strong>${senderName}</strong> has shared <strong>${contactCount} birthday contact${contactCount !== 1 ? 's' : ''}</strong> with you on Birthday Buddy!</p>
          <p style="margin: 16px 0;">They want to help you keep track of important birthdays.</p>
          <p>Log in to your account to review and accept the shared contacts:</p>
          <p>
            <a href="${baseUrl}/dashboard" style="display:inline-block; background-color:#4f46e5; color:white; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:bold;">View Shared Contacts</a>
          </p>
          <p style="margin-top:24px; font-size:12px; color:#64748b;">You can choose which contacts to accept or reject the share.</p>
        </div>
      `,
    });

    return { ok: true };
  } catch (error: any) {
    console.error('Failed to send contact share email:', error);
    return { ok: false, message: error?.message ?? 'Failed to send contact share email.' };
  }
}

export async function sendPasswordResetEmail(
  toEmail: string,
  resetLink: string
): Promise<{ ok: boolean; message?: string }> {
  const settings = await getSharedSettingsRecord();
  if (!settings?.resendApiKey || !settings?.resendFromEmail) {
    return { ok: false, message: 'Email settings are not configured.' };
  }

  try {
    const resend = new Resend(settings.resendApiKey);

    await resend.emails.send({
      from: `Birthday Buddy <${settings.resendFromEmail}>`,
      to: toEmail,
      subject: 'Reset your Birthday Buddy password',
      html: `
        <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #334155;">
          <h2 style="color:#4f46e5;">🔐 Password Reset Request</h2>
          <p>You requested to reset your password for Birthday Buddy.</p>
          <p style="margin: 16px 0;">Click the button below to reset your password. This link will expire in <strong>1 hour</strong>.</p>
          <p>
            <a href="${resetLink}" style="display:inline-block; background-color:#4f46e5; color:white; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:bold;">Reset Password</a>
          </p>
          <p style="margin-top:24px; font-size:12px; color:#64748b;">If you didn't request this, you can safely ignore this email.</p>
          <p style="font-size:12px; color:#64748b;">For security, this link will only work once.</p>
        </div>
      `,
    });

    return { ok: true };
  } catch (error: any) {
    console.error('Failed to send password reset email:', error);
    return { ok: false, message: error?.message ?? 'Failed to send password reset email.' };
  }
}
