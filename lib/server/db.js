import { PrismaClient } from '@prisma/client';

// One client for the whole process: the custom server and Next's route handlers share it
export const prisma = globalThis.__fpPrisma || (globalThis.__fpPrisma = new PrismaClient());

export const parse = (row) => (row ? JSON.parse(row.data) : null);
