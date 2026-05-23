import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-auth';
import { GoogleGenAI } from '@google/genai';

const Schema = z.object({
    tone: z.enum(['casual', 'warm', 'fun', 'professional']).default('warm'),
    belated: z.boolean().default(false),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireMobileUser(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const contact = await prisma.contact.findUnique({ where: { id } });
    if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (contact.userId !== auth.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { tone, belated } = Schema.parse(body);

    const fallback = belated
        ? `Happy belated birthday, ${contact.name}! 🎉 Sorry for the late wish — hope it was a wonderful day!`
        : `Happy Birthday, ${contact.name}! 🎉 Hope your day is as wonderful as you are!`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ message: fallback });

    try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = belated
            ? `Write a short, ${tone} BELATED birthday message for ${contact.name}.
Relationship: ${contact.relationship || 'friend'}.
Personal Notes: ${contact.notes || 'None'}.
The birthday has already passed so apologise warmly for the late wish.
Keep it under 2 sentences. Do not include hashtags or emojis unless the tone is 'fun'.`
            : `Write a short, ${tone} birthday message for ${contact.name}.
Relationship: ${contact.relationship || 'friend'}.
Personal Notes: ${contact.notes || 'None'}.
Make it feel personal but concise (under 2 sentences).
Do not include hashtags or emojis unless the tone is 'fun'.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        const message = response.text?.trim() || fallback;
        return NextResponse.json({ message });
    } catch {
        return NextResponse.json({ message: fallback });
    }
}
