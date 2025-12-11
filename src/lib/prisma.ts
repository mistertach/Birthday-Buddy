import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        // @ts-expect-error - Prisma 7 requires datasource URL at runtime even though types don't reflect it
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
        log: ['query'],
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
