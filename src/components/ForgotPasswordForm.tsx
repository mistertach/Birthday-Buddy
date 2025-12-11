'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { requestPasswordReset } from '@/lib/password-reset-actions';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordForm() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsSubmitting(true);

        const result = await requestPasswordReset(email);

        setIsSubmitting(false);
        setMessage({
            type: result.ok ? 'success' : 'error',
            text: result.message
        });

        if (result.ok) {
            setEmail('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
                <h1 className="mb-3 text-2xl font-bold text-gray-900">
                    Reset your password
                </h1>
                <p className="text-sm text-gray-600 mb-6">
                    Enter your email address and we'll send you a link to reset your password.
                </p>

                <div>
                    <label
                        className="mb-3 mt-5 block text-xs font-medium text-gray-900"
                        htmlFor="email"
                    >
                        Email Address
                    </label>
                    <div className="relative">
                        <input
                            className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 pr-4 text-sm outline-2 placeholder:text-gray-500 text-gray-900"
                            id="email"
                            type="email"
                            name="email"
                            placeholder="Enter your email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isSubmitting}
                        />
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    </div>
                </div>

                {message && (
                    <div className={`mt-4 p-3 rounded-lg text-sm ${message.type === 'success'
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                        {message.text}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting || !email}
                    className="mt-6 w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-500 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="animate-spin" size={18} />
                            Sending...
                        </>
                    ) : (
                        'Send Reset Link'
                    )}
                </button>

                <div className="mt-4 text-center">
                    <Link
                        href="/login"
                        className="text-sm text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                    >
                        <ArrowLeft size={14} />
                        Back to Login
                    </Link>
                </div>
            </div>
        </form>
    );
}
