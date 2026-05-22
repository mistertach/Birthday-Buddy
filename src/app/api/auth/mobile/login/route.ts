import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signMobileToken } from '@/lib/mobile-auth';

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid email or password format' }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await signMobileToken(user.id, user.email!);
    return NextResponse.json({
        token,
        user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin },
    });
}
