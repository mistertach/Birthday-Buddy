import ResetPasswordForm from '@/components/ResetPasswordForm';
import { validateResetToken } from '@/lib/password-reset-actions';
import { redirect } from 'next/navigation';

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    // Validate token before showing the form
    const validation = await validateResetToken(token);

    if (!validation.ok) {
        // Redirect to forgot password page with error
        redirect('/forgot-password?error=' + encodeURIComponent(validation.message || 'Invalid reset link'));
    }

    return (
        <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 p-4">
            <div className="w-full max-w-md">
                <ResetPasswordForm token={token} />
            </div>
        </main>
    );
}
