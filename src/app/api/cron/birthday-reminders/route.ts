'use server';

import { NextResponse } from 'next/server';
import { sendDayOfBirthdayReminders, sendWeeklyBirthdayReminders } from '@/lib/email-actions';

function isWeeklyRun(date: Date) {
  // Run weekly roundup on Mondays (0 = Sunday, 1 = Monday)
  return date.getUTCDay() === 1;
}

export async function GET() {
  const startedAt = new Date();

  const dayOfResult = await sendDayOfBirthdayReminders();
  let weeklyResult: Awaited<ReturnType<typeof sendWeeklyBirthdayReminders>> | null = null;

  if (isWeeklyRun(startedAt)) {
    weeklyResult = await sendWeeklyBirthdayReminders();
  }

  return NextResponse.json({
    ok: true,
    startedAt: startedAt.toISOString(),
    dayOf: dayOfResult,
    weekly: weeklyResult,
  });
}
