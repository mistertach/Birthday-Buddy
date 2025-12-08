import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function createAdminUser() {
    const email = process.argv[2];
    const password = process.argv[3];
    const name = process.argv[4] || 'Admin';

    if (!email || !password) {
        console.error('Usage: tsx scripts/create-admin.ts <email> <password> [name]');
        process.exit(1);
    }

    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            // Update existing user to admin
            await prisma.user.update({
                where: { email },
                data: { isAdmin: true },
            });
            console.log(`✅ User ${email} is now an admin!`);
        } else {
            // Create new admin user
            const hashedPassword = await bcrypt.hash(password, 10);
            await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    isAdmin: true,
                },
            });
            console.log(`✅ Admin user created: ${email}`);
        }
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

createAdminUser();
