import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signMobileToken } from '@/lib/mobile-auth';

const RegisterSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
});

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, email, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: { name, email, password: hashedPassword },
    });

    const token = await signMobileToken(user.id, user.email!);
    return NextResponse.json({
        token,
        user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin },
    }, { status: 201 });
}
