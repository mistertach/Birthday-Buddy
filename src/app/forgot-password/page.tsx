import ForgotPasswordForm from '@/components/ForgotPasswordForm';

export default function ForgotPasswordPage() {
    return (
        <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 p-4">
            <div className="w-full max-w-md">
                <ForgotPasswordForm />
            </div>
        </main>
    );
}
