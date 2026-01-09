'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// --- FUNCIÓN MÁGICA PARA OBTENER RANGO DE FECHAS EN PERÚ ---
function getPeruDateRange() {
    // Obtenemos la hora actual en la zona horaria de Lima
    const now = new Date();
    const peruTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
    
    // Inicio del día en Perú
    const startOfDay = new Date(peruTime);
    startOfDay.setHours(0, 0, 0, 0);
    
    // Fin del día en Perú
    const endOfDay = new Date(peruTime);
    endOfDay.setHours(23, 59, 59, 999);

    // Ajustamos el desfase UTC para que Prisma (que trabaja en UTC) entienda
    // Si Perú es UTC-5, le sumamos 5 horas para que coincida con el servidor
    // O mejor aún: usamos las fechas tal cual para comparar rangos, Prisma maneja las conversiones si le pasamos objetos Date correctos.
    
    // TRUCO: Para evitar lios con Prisma y zonas horarias, usaremos el rango calculado localmente 
    // pero asegurándonos de que cubra el "día lógico" en Perú.
    return { startOfDay, endOfDay };
}

export async function getTodayBatches() {
  const { startOfDay, endOfDay } = getPeruDateRange();

  const batches = await prisma.dailyBatch.findMany({
    where: {
      // Buscamos lotes creados entre las 00:00 y 23:59 hora PERÚ
      date: {
        gte: startOfDay,
        lte: endOfDay
      },
      isActive: true,
    },
    orderBy: { size: 'asc' }
  });

  return batches.map(b => ({
    id: b.id,
    size: b.size,
    price: b.basePricePerKg.toNumber(),
    remainingCrates: b.initialCrates - b.consumedCrates, 
    initialCrates: b.initialCrates,
    stockKg: (b.initialCrates * b.avgWeightPerCrate.toNumber())
  }));
}

export async function openDay(data: { size: string, price: number, crates: number }[]) {
  try {
    const { startOfDay, endOfDay } = getPeruDateRange();

    for (const item of data) {
      // 1. Buscamos si ya existe un lote de este tamaño y precio HOY (Hora Perú)
      const existingBatch = await prisma.dailyBatch.findFirst({
        where: {
          date: {
            gte: startOfDay,
            lte: endOfDay
          },
          size: item.size,
          basePricePerKg: item.price,
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
        // 3. Si no existe, creamos uno nuevo CON LA FECHA ACTUAL PERÚ
        const nowPeru = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }));
        
        await prisma.dailyBatch.create({
          data: {
            size: item.size,
            basePricePerKg: item.price,
            initialCrates: item.crates,
            avgWeightPerCrate: 24.0,
            date: nowPeru, // <--- IMPORTANTE: Guardamos con la hora de Perú
            isActive: true
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

// ... (El resto de funciones updateBatch y deleteBatch quedan IGUAL, ya que usan ID único)
export async function updateBatch(id: string, price: number, initialCrates: number) {
  try {
    await prisma.dailyBatch.update({
      where: { id },
      data: {
        basePricePerKg: price,
        initialCrates: initialCrates
      }
    });
    revalidatePath('/');
    return { success: true, message: 'Lote actualizado' };
  } catch (error) {
    console.error(error);
    return { success: false, message: 'Error al actualizar' };
  }
}

export async function deleteBatch(id: string) {
  try {
    const batch = await prisma.dailyBatch.findUnique({
        where: { id },
        include: { _count: { select: { sales: true } } }
    });

    if (batch && batch._count.sales > 0) {
        await prisma.dailyBatch.update({
            where: { id },
            data: { isActive: false }
        });
    } else {
        await prisma.dailyBatch.delete({ where: { id } });
    }
    
    revalidatePath('/');
    return { success: true, message: 'Lote eliminado' };
  } catch (error) {
    console.error(error);
    return { success: false, message: 'Error al eliminar' };
  }
}