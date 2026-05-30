import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-auth';
import { sendInvitationEmail } from '@/lib/email-actions';
import crypto from 'crypto';

/**
 * POST /api/v1/invites
 * Create an invitation from a mobile user and send the invite email.
 * Body: { recipientEmail: string; contactIds?: string[] }
 */
export async function POST(req: NextRequest) {
    const auth = await requireMobileUser(req);
    if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let body: { recipientEmail?: string; contactIds?: string[] };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { recipientEmail, contactIds = [] } = body;
    if (!recipientEmail || !recipientEmail.includes('@')) {
        return NextResponse.json({ error: 'Valid recipient email is required' }, { status: 400 });
    }

    const sender = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { id: true, name: true, email: true },
    });
    if (!sender) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (recipientEmail.toLowerCase() === sender.email?.toLowerCase()) {
        return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 });
    }

    // Validate that the contactIds belong to this user
    let validatedContactIds: string[] = [];
    if (contactIds.length > 0) {
        const owned = await prisma.contact.findMany({
            where: { id: { in: contactIds }, userId: auth.userId },
            select: { id: true },
        });
        validatedContactIds = owned.map(c => c.id);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.invitation.create({
        data: {
            token,
            senderId: sender.id,
            recipientEmail,
            sharedContactIds: validatedContactIds,
            expiresAt,
        },
    });

    const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/invite/${token}`;

    const emailResult = await sendInvitationEmail(recipientEmail, sender.name || 'A friend', inviteLink);

    return NextResponse.json({
        ok: true,
        inviteLink,
        emailSent: emailResult.ok,
        message: emailResult.ok
            ? 'Invitation sent!'
            : 'Invitation created — email delivery may be delayed.',
    });
}
