'use server';

import { auth, signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}

export async function handleSignOut() {
    await signOut();
}

const RegisterSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
});

export async function registerUser(
    prevState: any,
    formData: FormData,
) {
    const validatedFields = RegisterSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { name, email, password } = validatedFields.data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        return {
            error: 'User already exists',
        };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
        },
    });

    // Sign in automatically
    await signIn('credentials', {
        email,
        password,
        redirect: true,
        redirectTo: '/dashboard',
    });

    return { success: true };
}

export async function updateNotificationPreference(wantsNotifications: boolean) {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error('Unauthorized');
    }

    try {
        await prisma.user.update({
            where: { email: session.user.email },
            data: { wantsEmailNotifications: wantsNotifications },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Failed to update notification preference:', error);
        return { success: false, error: 'Failed to update settings' };
    }
}
