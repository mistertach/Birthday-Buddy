import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requestPasswordReset } from '@/lib/password-reset-actions';

const ForgotPasswordSchema = z.object({
    email: z.string().email(),
});

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);
    const parsed = ForgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const result = await requestPasswordReset(parsed.data.email);
    return NextResponse.json({ ok: result.ok, message: result.message });
}
