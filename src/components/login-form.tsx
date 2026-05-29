'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { authenticate, signInWithMagicLink } from '@/lib/actions';
import SocialAuthButtons from '@/components/social-auth-buttons';
import { Loader2 } from 'lucide-react';

type AuthMethod = 'password' | 'magic';

export default function LoginForm() {
    const [method, setMethod] = useState<AuthMethod>('password');
    const [email, setEmail] = useState('');

    const [passwordError, passwordDispatch] = useActionState(authenticate, undefined);
    const [magicState, magicDispatch] = useActionState(signInWithMagicLink, undefined);

    return (
        <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
            <h1 className="mb-6 text-2xl font-bold text-gray-900">Welcome back</h1>

            {/* Social auth */}
            <SocialAuthButtons />

            <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-50 text-gray-500">Or sign in with email</span>
                </div>
            </div>

            {/* Shared email field */}
            <div>
                <label className="mb-2 block text-xs font-medium text-gray-900" htmlFor="shared-email">
                    Email
                </label>
                <input
                    id="shared-email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full rounded-md border border-gray-200 py-[9px] pl-3 text-sm outline-2 placeholder:text-gray-500 text-gray-900"
                />
            </div>

            {/* Auth method tabs */}
            <div className="mt-4 mb-4 flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                    type="button"
                    onClick={() => setMethod('password')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${method === 'password' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                    Password
                </button>
                <button
                    type="button"
                    onClick={() => setMethod('magic')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${method === 'magic' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                    Email link
                </button>
            </div>

            {/* Password form */}
            {method === 'password' && (
                <form action={passwordDispatch} className="space-y-4">
                    <input type="hidden" name="email" value={email} />
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-medium text-gray-900" htmlFor="password">
                                Password
                            </label>
                            <a href="/forgot-password" className="text-xs text-indigo-600 hover:text-indigo-800">
                                Forgot password?
                            </a>
                        </div>
                        <input
                            id="password"
                            className="block w-full rounded-md border border-gray-200 py-[9px] pl-3 text-sm outline-2 placeholder:text-gray-500 text-gray-900"
                            type="password"
                            name="password"
                            placeholder="Enter password"
                            required
                            minLength={6}
                        />
                    </div>
                    <LoginButton />
                    <div className="flex h-6 items-end" aria-live="polite">
                        {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
                    </div>
                </form>
            )}

            {/* Magic link form */}
            {method === 'magic' && (
                <form action={magicDispatch} className="space-y-4">
                    <input type="hidden" name="email" value={email} />
                    <p className="text-sm text-gray-600">We'll send a one-click login link to your inbox — no password needed.</p>
                    <MagicLinkButton />
                    {magicState && (
                        <div className="text-sm text-center" aria-live="polite">
                            <p className={magicState.includes('sent') ? 'text-green-600' : 'text-red-500'}>
                                {magicState}
                            </p>
                        </div>
                    )}
                </form>
            )}

            <p className="mt-6 text-center text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <a href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                    Sign up
                </a>
            </p>
        </div>
    );
}

function LoginButton() {
    const { pending } = useFormStatus();
    return (
        <button
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-500 transition-colors flex justify-center"
            aria-disabled={pending}
        >
            {pending ? <Loader2 className="animate-spin" /> : 'Log in'}
        </button>
    );
}

function MagicLinkButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full bg-white border border-indigo-600 text-indigo-600 py-2 rounded-lg hover:bg-indigo-50 transition-colors font-medium text-sm disabled:opacity-50"
        >
            {pending ? 'Sending…' : 'Email me a login link'}
        </button>
    );
}
