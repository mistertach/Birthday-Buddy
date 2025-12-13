import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Email from 'next-auth/providers/email';
import { authConfig } from './auth.config';
import { prisma } from '@/lib/prisma';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sendMagicLinkEmail } from '@/lib/email-actions';

async function getUser(email: string) {
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        return user;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw new Error('Failed to fetch user.');
    }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma),
    session: { strategy: 'jwt' }, // Use JWT to avoid database sessions for Credentials
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const user = await getUser(email);
                    if (!user) return null;

                    const passwordsMatch = await bcrypt.compare(password, user.password || '');
                    if (passwordsMatch) return user;
                }

                console.log('Invalid credentials');
                return null;
            },
        }),
        Email({
            server: {
                host: 'localhost',
                port: 25,
                secure: false,
            },
            from: 'noreply@birthdaybuddy.app',
            sendVerificationRequest: async ({ identifier: email, url }) => {
                console.log(`[Auth] Attempting to send magic link to ${email}`);
                try {
                    await sendMagicLinkEmail(email, url);
                    console.log(`[Auth] Magic link sent successfully to ${email}`);
                } catch (error) {
                    console.error('[Auth] Failed to send magic link:', error);
                    throw error;
                }
            },
        }),
    ],
});
