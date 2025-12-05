import RegisterForm from '@/components/register-form';

export default function RegisterPage() {
    return (
        <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100">
            <div className="w-full max-w-md">
                <RegisterForm />
            </div>
        </main>
    );
}
