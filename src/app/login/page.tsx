import LoginForm from '@/components/login-form';

export default function LoginPage() {
    return (
        <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100">
            <div className="w-full max-w-md">
                <LoginForm />
            </div>
        </main>
    );
}
