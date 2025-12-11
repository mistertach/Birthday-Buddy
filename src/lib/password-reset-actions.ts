'use server';

import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email-actions';

/**
 * Request a password reset - generates token and sends email
 */
export async function requestPasswordReset(email: string): Promise<{ ok: boolean; message: string }> {
    try {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() }
        });

        // Always return success to prevent email enumeration
        if (!user) {
            return { ok: true, message: 'If an account exists with that email, a password reset link has been sent.' };
        }

        // Generate secure random token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        // Delete any existing reset tokens for this user
        await prisma.passwordResetToken.deleteMany({
            where: { userId: user.id }
        });

        // Create new reset token
        await prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                token,
                expiresAt
            }
        });

        // Send reset email
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : process.env.NEXTAUTH_URL || 'http://localhost:3000';

        const resetLink = `${baseUrl}/reset-password/${token}`;
        await sendPasswordResetEmail(user.email!, resetLink);

        return { ok: true, message: 'If an account exists with that email, a password reset link has been sent.' };
    } catch (error: any) {
        console.error('Failed to request password reset:', error);
        return { ok: false, message: 'Failed to process password reset request. Please try again.' };
    }
}

/**
 * Validate a password reset token
 */
export async function validateResetToken(token: string): Promise<{ ok: boolean; userId?: string; message?: string }> {
    try {
        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token },
            include: { user: { select: { id: true, email: true } } }
        });

        if (!resetToken) {
            return { ok: false, message: 'Invalid or expired reset link.' };
        }

        if (new Date() > resetToken.expiresAt) {
            // Clean up expired token
            await prisma.passwordResetToken.delete({
                where: { id: resetToken.id }
            });
            return { ok: false, message: 'This reset link has expired. Please request a new one.' };
        }

        return { ok: true, userId: resetToken.userId };
    } catch (error) {
        console.error('Failed to validate reset token:', error);
        return { ok: false, message: 'Failed to validate reset link.' };
    }
}

/**
 * Reset password using a valid token
 */
export async function resetPassword(token: string, newPassword: string): Promise<{ ok: boolean; message: string }> {
    try {
        // Validate token first
        const validation = await validateResetToken(token);
        if (!validation.ok || !validation.userId) {
            return { ok: false, message: validation.message || 'Invalid reset link.' };
        }

        // Validate password strength
        if (newPassword.length < 6) {
            return { ok: false, message: 'Password must be at least 6 characters long.' };
        }

        // Hash new password
        const hashedPassword = await hash(newPassword, 10);

        // Update user password
        await prisma.user.update({
            where: { id: validation.userId },
            data: { password: hashedPassword }
        });

        // Delete the used token
        await prisma.passwordResetToken.deleteMany({
            where: { token }
        });

        return { ok: true, message: 'Password reset successfully! You can now log in with your new password.' };
    } catch (error: any) {
        console.error('Failed to reset password:', error);
        return { ok: false, message: 'Failed to reset password. Please try again.' };
    }
}
