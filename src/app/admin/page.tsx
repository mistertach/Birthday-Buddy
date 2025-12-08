import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAllUsers, getSystemStats, getResendSettings, getCategories } from '@/lib/admin-actions';
import AdminPanelClient from '@/components/admin-panel-client';
import { prisma } from '@/lib/prisma';

export default async function AdminPage() {
    const session = await auth();

    if (!session?.user?.email) {
        redirect('/login');
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user?.isAdmin) {
        redirect('/dashboard');
    }

    const [users, stats, resendSettings, categories] = await Promise.all([
        getAllUsers(),
        getSystemStats(),
        getResendSettings(),
        getCategories(),
    ]);

    return (
        <AdminPanelClient
            users={users}
            stats={stats}
            resendSettings={resendSettings}
            categories={categories}
        />
    );
}
