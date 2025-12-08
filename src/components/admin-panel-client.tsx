'use client';

import { useState, useTransition } from 'react';
import {
    Users,
    Shield,
    Bell,
    Trash2,
    Calendar,
    Mail,
    Play,
    CheckCircle,
    XCircle,
    Clock,
    Settings,
    Tag,
    Plus,
    Send
} from 'lucide-react';
import {
    toggleUserAdmin,
    toggleUserNotifications,
    deleteUser,
    triggerCronManually,
    saveResendSettings,
    sendAdminTestEmail,
    addCategory,
    deleteCategory,
    verifyUserManually,
    unverifyUserManually
} from '@/lib/admin-actions';
import { sendTestDailyEmail, sendTestWeeklyEmail } from '@/lib/email-actions';

type User = {
    id: string;
    name: string | null;
    email: string | null;
    isAdmin: boolean;
    wantsEmailNotifications: boolean;
    emailVerified: Date | null;
    _count: {
        contacts: number;
    };
};

type Stats = {
    totalUsers: number;
    totalContacts: number;
    activeUsers: number;
    emailConfigured: boolean;
};

type ResendSettings = {
    resendApiKey: string;
    resendFromEmail: string;
};

type AdminPanelClientProps = {
    users: User[];
    stats: Stats;
    resendSettings: ResendSettings;
    categories: string[];
};

export default function AdminPanelClient({ users, stats, resendSettings, categories }: AdminPanelClientProps) {
    const [isPending, startTransition] = useTransition();
    const [cronResult, setCronResult] = useState<any>(null);
    const [cronLoading, setCronLoading] = useState(false);

    // Email settings state
    const [apiKey, setApiKey] = useState(resendSettings.resendApiKey);
    const [fromEmail, setFromEmail] = useState(resendSettings.resendFromEmail);
    const [emailSaving, setEmailSaving] = useState(false);
    const [emailResult, setEmailResult] = useState<any>(null);
    const [testEmailLoading, setTestEmailLoading] = useState(false);
    const [testDailyLoading, setTestDailyLoading] = useState(false);
    const [testWeeklyLoading, setTestWeeklyLoading] = useState(false);

    // Category state
    const [categoryList, setCategoryList] = useState(categories);
    const [newCategory, setNewCategory] = useState('');
    const [categoryLoading, setCategoryLoading] = useState(false);

    const handleToggleAdmin = async (userId: string) => {
        startTransition(async () => {
            const result = await toggleUserAdmin(userId);
            if (!result.ok) {
                alert(result.message);
            }
        });
    };

    const handleToggleNotifications = async (userId: string) => {
        startTransition(async () => {
            const result = await toggleUserNotifications(userId);
            if (!result.ok) {
                alert(result.message);
            }
        });
    };

    const handleDeleteUser = async (userId: string, userName: string | null) => {
        if (!confirm(`Are you sure you want to delete ${userName || 'this user'}? This action cannot be undone.`)) {
            return;
        }

        startTransition(async () => {
            const result = await deleteUser(userId);
            if (!result.ok) {
                alert(result.message);
            } else {
                alert(result.message);
            }
        });
    };

    const handleTriggerCron = async () => {
        setCronLoading(true);
        setCronResult(null);
        try {
            const result = await triggerCronManually();
            setCronResult(result);
        } catch (error: any) {
            setCronResult({ ok: false, message: error.message });
        } finally {
            setCronLoading(false);
        }
    };

    const handleSaveEmailSettings = async () => {
        setEmailSaving(true);
        setEmailResult(null);
        try {
            const result = await saveResendSettings({ apiKey, fromEmail });
            setEmailResult(result);
        } catch (error: any) {
            setEmailResult({ ok: false, message: error.message });
        } finally {
            setEmailSaving(false);
        }
    };

    const handleSendTestEmail = async () => {
        setTestEmailLoading(true);
        try {
            const result = await sendAdminTestEmail();
            alert(result.message);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setTestEmailLoading(false);
        }
    };

    const handleSendTestDaily = async () => {
        setTestDailyLoading(true);
        try {
            const result = await sendTestDailyEmail();
            alert(result.message);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setTestDailyLoading(false);
        }
    };

    const handleSendTestWeekly = async () => {
        setTestWeeklyLoading(true);
        try {
            const result = await sendTestWeeklyEmail();
            alert(result.message);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setTestWeeklyLoading(false);
        }
    };

    const handleAddCategory = async () => {
        if (!newCategory.trim()) return;

        setCategoryLoading(true);
        try {
            const result = await addCategory(newCategory);
            if (result.ok && result.category) {
                setCategoryList(prev => [...new Set([...prev, result.category!])].sort());
                setNewCategory('');
                alert(result.message);
            } else {
                alert(result.message);
            }
        } catch (error: any) {
            alert(error.message);
        } finally {
            setCategoryLoading(false);
        }
    };

    const handleDeleteCategory = async (category: string) => {
        if (!confirm(`Delete category "${category}"? All contacts will be moved to "Other".`)) {
            return;
        }

        setCategoryLoading(true);
        try {
            const result = await deleteCategory(category);
            if (result.ok) {
                setCategoryList(prev => prev.filter(c => c !== category));
                alert(result.message);
            } else {
                alert(result.message);
            }
        } catch (error: any) {
            alert(error.message);
        } finally {
            setCategoryLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Panel</h1>
                    <p className="text-gray-600">Manage users, configure email, and control system settings</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        icon={<Users className="w-6 h-6" />}
                        label="Total Users"
                        value={stats.totalUsers}
                        color="blue"
                    />
                    <StatCard
                        icon={<Calendar className="w-6 h-6" />}
                        label="Total Contacts"
                        value={stats.totalContacts}
                        color="green"
                    />
                    <StatCard
                        icon={<Bell className="w-6 h-6" />}
                        label="Active Users"
                        value={stats.activeUsers}
                        color="purple"
                    />
                    <StatCard
                        icon={<Mail className="w-6 h-6" />}
                        label="Email Status"
                        value={stats.emailConfigured ? 'Configured' : 'Not Set'}
                        color={stats.emailConfigured ? 'green' : 'red'}
                        isText
                    />
                </div>

                {/* Email Configuration */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
                            <Settings className="w-6 h-6 text-indigo-600" />
                            Email Configuration (Resend)
                        </h2>
                        <p className="text-gray-600">Configure Resend API for sending birthday reminder emails</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Resend API Key
                            </label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="re_..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                From Email Address
                            </label>
                            <input
                                type="email"
                                value={fromEmail}
                                onChange={(e) => setFromEmail(e.target.value)}
                                placeholder="noreply@yourdomain.com"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleSaveEmailSettings}
                            disabled={emailSaving}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                        >
                            {emailSaving ? 'Saving...' : 'Save Settings'}
                        </button>
                        <button
                            onClick={handleSendTestEmail}
                            disabled={testEmailLoading || !apiKey || !fromEmail}
                            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                        >
                            <Send className="w-4 h-4" />
                            {testEmailLoading ? 'Sending...' : 'Test Connection'}
                        </button>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-3">Preview Email Templates:</p>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleSendTestDaily}
                                disabled={testDailyLoading || !apiKey || !fromEmail}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                <Mail className="w-4 h-4" />
                                {testDailyLoading ? 'Sending...' : 'Test Daily Email'}
                            </button>
                            <button
                                onClick={handleSendTestWeekly}
                                disabled={testWeeklyLoading || !apiKey || !fromEmail}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                <Calendar className="w-4 h-4" />
                                {testWeeklyLoading ? 'Sending...' : 'Test Weekly Email'}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">These will send sample birthday reminder emails to your email address</p>
                    </div>

                    {emailResult && (
                        <div
                            className={`mt-4 p-4 rounded-lg ${emailResult.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                                }`}
                        >
                            {emailResult.message}
                        </div>
                    )}
                </div>

                {/* Category Management */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
                            <Tag className="w-6 h-6 text-indigo-600" />
                            Contact Categories
                        </h2>
                        <p className="text-gray-600">Manage relationship categories for contacts</p>
                    </div>

                    <div className="flex gap-3 mb-4">
                        <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                            placeholder="New category name..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <button
                            onClick={handleAddCategory}
                            disabled={categoryLoading || !newCategory.trim()}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                        >
                            <Plus className="w-4 h-4" />
                            Add Category
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {categoryList.map((category) => {
                            const isDefault = ['Work', 'Family', 'Friends', 'Other'].includes(category);
                            return (
                                <div
                                    key={category}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${isDefault
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                                        : 'bg-gray-50 border-gray-200 text-gray-700'
                                        }`}
                                >
                                    <Tag className="w-4 h-4" />
                                    <span className="font-medium">{category}</span>
                                    {!isDefault && (
                                        <button
                                            onClick={() => handleDeleteCategory(category)}
                                            disabled={categoryLoading}
                                            className="ml-2 text-red-600 hover:text-red-800 transition-colors"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-sm text-gray-500 mt-4">
                        Default categories (Work, Family, Friends, Other) cannot be deleted
                    </p>
                </div>

                {/* Cron Job Control */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Clock className="w-6 h-6 text-indigo-600" />
                                Cron Job Control
                            </h2>
                            <p className="text-gray-600 mt-1">
                                Manually trigger birthday reminder emails (runs daily at 6 AM UTC on Vercel)
                            </p>
                        </div>
                        <button
                            onClick={handleTriggerCron}
                            disabled={cronLoading}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                        >
                            <Play className="w-5 h-5" />
                            {cronLoading ? 'Running...' : 'Trigger Now'}
                        </button>
                    </div>

                    {cronResult && (
                        <div
                            className={`mt-4 p-4 rounded-xl border ${cronResult.ok
                                ? 'bg-green-50 border-green-200'
                                : 'bg-red-50 border-red-200'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                {cronResult.ok ? (
                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                )}
                                <div className="flex-1">
                                    <p className={`font-semibold ${cronResult.ok ? 'text-green-900' : 'text-red-900'}`}>
                                        {cronResult.message}
                                    </p>
                                    {cronResult.data && (
                                        <pre className="mt-2 text-sm bg-white/50 p-3 rounded-lg overflow-auto">
                                            {JSON.stringify(cronResult.data, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                    <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-6 h-6 text-indigo-600" />
                            User Management
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Contacts
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Admin
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Notifications
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Verified
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{user.name || 'N/A'}</div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                                                {user._count.contacts}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => handleToggleAdmin(user.id)}
                                                disabled={isPending}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-all ${user.isAdmin
                                                    ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                <Shield className="w-4 h-4" />
                                                {user.isAdmin ? 'Admin' : 'User'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => handleToggleNotifications(user.id)}
                                                disabled={isPending}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-all ${user.wantsEmailNotifications
                                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                <Bell className="w-4 h-4" />
                                                {user.wantsEmailNotifications ? 'On' : 'Off'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={async () => {
                                                        const action = user.emailVerified ? unverifyUserManually : verifyUserManually;
                                                        startTransition(async () => {
                                                            const result = await action(user.id);
                                                            alert(result.message);
                                                        });
                                                    }}
                                                    disabled={isPending}
                                                    className="hover:opacity-75 transition-opacity"
                                                    title={user.emailVerified ? "Click to unverify" : "Click to verify manually"}
                                                >
                                                    {user.emailVerified ? (
                                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                                    ) : (
                                                        <XCircle className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </button>
                                            </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button
                                                onClick={() => handleDeleteUser(user.id, user.name)}
                                                disabled={isPending}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {users.length === 0 && (
                        <div className="text-center py-12">
                            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-500">No users found</p>
                        </div>
                    )}
                </div>

                {/* Back to Dashboard */}
                <div className="mt-8 text-center">
                    <a
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                        ← Back to Dashboard
                    </a>
                </div>
            </div>
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    color,
    isText = false,
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    color: 'blue' | 'green' | 'purple' | 'red';
    isText?: boolean;
}) {
    const colorClasses = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        purple: 'from-purple-500 to-purple-600',
        red: 'from-red-500 to-red-600',
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} text-white shadow-md`}>
                    {icon}
                </div>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
                <p className="text-3xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
}
