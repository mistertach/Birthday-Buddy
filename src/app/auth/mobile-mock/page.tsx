import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { signMobileToken } from '@/lib/mobile-auth';

interface PageProps {
    searchParams: Promise<{
        provider?: string;
    }>;
}

export default async function MobileMockPage({ searchParams }: PageProps) {
    const { provider = 'google' } = await searchParams;
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

    async function handleMockLogin(formData: FormData) {
        'use server';

        const email = formData.get('email') as string;
        const name = formData.get('name') as string;

        if (!email || !name) {
            return;
        }

        // Find or create user
        let user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    name,
                },
            });
        }

        // Get the redirect URI from cookies
        const cookieStore = await cookies();
        const redirectUri = cookieStore.get('mobile_redirect_uri')?.value;

        if (!redirectUri) {
            throw new Error('Redirect URI cookie missing or expired. Please restart the login flow on your mobile app.');
        }

        // Clean up the cookie
        cookieStore.delete('mobile_redirect_uri');

        // Sign token
        const token = await signMobileToken(user.id, user.email!);

        // Redirect back to mobile app
        const params = new URLSearchParams({
            token,
            id: user.id,
            email: user.email!,
            name: user.name || '',
            isAdmin: user.isAdmin ? 'true' : 'false',
        });

        redirect(`${redirectUri}?${params.toString()}`);
    }

    return (
        <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-indigo-500/20 rounded-2xl p-8 shadow-2xl">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/30 mb-4 animate-pulse">
                        <span className="text-3xl">🔧</span>
                    </div>
                    <h1 className="text-xl font-bold text-white text-center">
                        Social Auth Sandbox
                    </h1>
                    <p className="text-xs text-indigo-400 mt-1">
                        Testing Mobile {providerName} Sign-In
                    </p>
                </div>

                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-6">
                    <p className="text-xs text-slate-300 leading-relaxed">
                        <strong className="text-indigo-300">Notice:</strong> Social credentials (`AUTH_{provider.toUpperCase()}_ID`) are not set in `.env`.
                        This sandbox page simulates a successful login response to test your Expo Go connection.
                    </p>
                </div>

                <form action={handleMockLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Mock Name
                        </label>
                        <input
                            type="text"
                            name="name"
                            defaultValue="Developer Buddy"
                            placeholder="Enter any name"
                            required
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Mock Email
                        </label>
                        <input
                            type="email"
                            name="email"
                            defaultValue="developer@birthdaybuddy.app"
                            placeholder="Enter any email address"
                            required
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600 transition-colors"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg text-sm shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all duration-200 mt-2"
                    >
                        Simulate {providerName} Login
                    </button>
                </form>
            </div>
        </div>
    );
}
