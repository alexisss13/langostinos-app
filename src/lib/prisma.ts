import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// 1. Configuración de conexión
const connectionString = process.env.DATABASE_URL;

// 2. Creamos el "Pool" de conexiones (Gestor de Postgres)
const pool = new Pool({ connectionString });

// 3. Creamos el Adaptador de Prisma (El puente)
const adapter = new PrismaPg(pool);

// 4. Singleton para Next.js (Evitar que se abran mil conexiones al recargar)
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter, // <--- AQUÍ ESTÁ EL TRUCO: Pasamos 'adapter' en vez de url
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;