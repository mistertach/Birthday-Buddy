import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requestMobileMagicLink } from '@/lib/mobile-magic-link';

const MagicLinkRequestSchema = z.object({
    email: z.string().email(),
});

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);
    const parsed = MagicLinkRequestSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const result = await requestMobileMagicLink(parsed.data.email);
    return NextResponse.json({ ok: result.ok, message: result.message });
}
