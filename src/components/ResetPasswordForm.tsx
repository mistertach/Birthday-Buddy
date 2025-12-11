'use client';

import { useState } from 'react';
import { resetPassword } from '@/lib/password-reset-actions';
import { Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
    token: string;
}

export default function ResetPasswordForm({ token }: Props) {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match.' });
            return;
        }

        if (password.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
            return;
        }

        setIsSubmitting(true);
        const result = await resetPassword(token, password);
        setIsSubmitting(false);

        setMessage({
            type: result.ok ? 'success' : 'error',
            text: result.message
        });

        if (result.ok) {
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
                <h1 className="mb-3 text-2xl font-bold text-gray-900">
                    Set new password
                </h1>
                <p className="text-sm text-gray-600 mb-6">
                    Enter your new password below.
                </p>

                <div>
                    <label
                        className="mb-3 mt-5 block text-xs font-medium text-gray-900"
                        htmlFor="password"
                    >
                        New Password
                    </label>
                    <div className="relative">
                        <input
                            className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 pr-12 text-sm outline-2 placeholder:text-gray-500 text-gray-900"
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            placeholder="Enter new password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isSubmitting}
                            minLength={6}
                        />
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <div className="mt-4">
                    <label
                        className="mb-3 block text-xs font-medium text-gray-900"
                        htmlFor="confirmPassword"
                    >
                        Confirm Password
                    </label>
                    <div className="relative">
                        <input
                            className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 pr-4 text-sm outline-2 placeholder:text-gray-500 text-gray-900"
                            id="confirmPassword"
                            type={showPassword ? 'text' : 'password'}
                            name="confirmPassword"
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={isSubmitting}
                            minLength={6}
                        />
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
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
                    disabled={isSubmitting || !password || !confirmPassword}
                    className="mt-6 w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-500 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="animate-spin" size={18} />
                            Resetting...
                        </>
                    ) : (
                        'Reset Password'
                    )}
                </button>
            </div>
        </form>
    );
}
