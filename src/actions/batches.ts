'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getTodayBatches() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const batches = await prisma.dailyBatch.findMany({
    where: {
      date: { gte: today },
      isActive: true,
    },
    orderBy: { size: 'asc' }
  });

  return batches.map(b => ({
    id: b.id,
    size: b.size,
    price: b.basePricePerKg.toNumber(),
    // Calculamos las cajas restantes visualmente (Iniciales - Consumidas)
    remainingCrates: b.initialCrates - b.consumedCrates, 
    initialCrates: b.initialCrates,
    stockKg: (b.initialCrates * b.avgWeightPerCrate.toNumber())
  }));
}

// ESTA FUNCIÓN AHORA ES INTELIGENTE: SUMA SI YA EXISTE
export async function openDay(data: { size: string, price: number, crates: number }[]) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const item of data) {
      // 1. Buscamos si ya existe un lote de este tamaño y precio hoy
      const existingBatch = await prisma.dailyBatch.findFirst({
        where: {
          date: { gte: today },
          size: item.size,
          basePricePerKg: item.price, // Mismo precio
          isActive: true
        }
      });

      if (existingBatch) {
        // 2. Si existe, SUMAMOS las cajas nuevas
        await prisma.dailyBatch.update({
          where: { id: existingBatch.id },
          data: {
            initialCrates: { increment: item.crates }
          }
        });
      } else {
        // 3. Si no existe (o el precio es diferente), CREAMOS uno nuevo
        await prisma.dailyBatch.create({
          data: {
            size: item.size,
            basePricePerKg: item.price,
            initialCrates: item.crates,
            avgWeightPerCrate: 24.0,
          }
        });
      }
    }

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}