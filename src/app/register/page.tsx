import RegisterForm from '@/components/register-form';

export default async function RegisterPage(props: { searchParams: Promise<{ callbackUrl?: string }> }) {
    const searchParams = await props.searchParams;
    const callbackUrl = searchParams.callbackUrl;

    return (
        <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100">
            <div className="w-full max-w-md">
                <RegisterForm callbackUrl={callbackUrl} />
            </div>
        </main>
    );
}
