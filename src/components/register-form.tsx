'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { registerUser } from '@/lib/actions';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function RegisterForm({ callbackUrl, senderName }: { callbackUrl?: string; senderName?: string }) {
    const [state, dispatch] = useActionState(registerUser, undefined);

    return (
        <form action={dispatch} className="space-y-3">
            <input type="hidden" name="callbackUrl" value={callbackUrl || '/dashboard'} />
            <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
                <h1 className="mb-3 text-2xl font-bold text-gray-900">
                    {senderName ? (
                        <>
                            <span className="block text-lg font-normal text-gray-600 mb-1">
                                {senderName} invited you!
                            </span>
                            Create your account
                        </>
                    ) : (
                        'Create an account'
                    )}
                </h1>
                <div className="w-full">
                    <div>
                        <label
                            className="mb-3 mt-5 block text-xs font-medium text-gray-900"
                            htmlFor="name"
                        >
                            Name
                        </label>
                        <input
                            className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-3 text-sm outline-2 placeholder:text-gray-500"
                            id="name"
                            type="text"
                            name="name"
                            placeholder="Enter your name"
                            required
                        />
                    </div>
                    <div className="mt-4">
                        <label
                            className="mb-3 mt-5 block text-xs font-medium text-gray-900"
                            htmlFor="email"
                        >
                            Email
                        </label>
                        <input
                            className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-3 text-sm outline-2 placeholder:text-gray-500"
                            id="email"
                            type="email"
                            name="email"
                            placeholder="Enter your email address"
                            required
                        />
                    </div>
                    <div className="mt-4">
                        <label
                            className="mb-3 mt-5 block text-xs font-medium text-gray-900"
                            htmlFor="password"
                        >
                            Password
                        </label>
                        <input
                            className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-3 text-sm outline-2 placeholder:text-gray-500"
                            id="password"
                            type="password"
                            name="password"
                            placeholder="Enter password"
                            required
                            minLength={6}
                        />
                    </div>
                </div>
                <RegisterButton />
                <div className="flex h-8 items-end space-x-1" aria-live="polite">
                    {state?.error && (
                        <p className="text-sm text-red-500">{state.error}</p>
                    )}
                </div>
                <p className="mt-4 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link href="/login" className="text-indigo-600 hover:underline">
                        Log in
                    </Link>
                </p>
            </div>
        </form>
    );
}

function RegisterButton() {
    const { pending } = useFormStatus();

    return (
        <button
            className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-500 transition-colors flex justify-center"
            aria-disabled={pending}
        >
            {pending ? <Loader2 className="animate-spin" /> : 'Create Account'}
        </button>
    );
}
