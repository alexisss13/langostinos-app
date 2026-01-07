'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { SaleStatus } from '@prisma/client';

type SaleData = {
  id?: string;
  size: string;
  weight: number;
  pricePerKg: number;
  total: number;
  isCrate: boolean;
  status: 'ENTREGADO' | 'EN_PUESTO';
  amountPaid: number; // NUEVO CAMPO
  customerName?: string;
};

export async function registerSale(data: SaleData) {
  try {
    // Si pagó menos del total, NO está pagado completamente (isPaid = false)
    // Pero permitimos una tolerancia de 0.10 céntimos por redondeo
    const isFullyPaid = data.amountPaid >= (data.total - 0.1);

    let batch = await prisma.dailyBatch.findFirst({
      where: { size: data.size, isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!batch) {
      batch = await prisma.dailyBatch.create({
        data: {
          size: data.size,
          basePricePerKg: data.pricePerKg,
          initialCrates: 0,
        },
      });
    }

    await prisma.sale.create({
      data: {
        batchId: batch.id,
        weightKg: data.weight,
        pricePerKg: data.pricePerKg,
        totalPrice: data.total,
        amountPaid: data.amountPaid, // Guardamos lo que dio
        isCrate: data.isCrate,
        status: data.status === 'EN_PUESTO' ? SaleStatus.EN_PUESTO : SaleStatus.ENTREGADO,
        isPaid: isFullyPaid, 
        customerName: data.customerName || '',
      },
    });

    revalidatePath('/');
    return { success: true, message: '¡Venta Guardada!' };
  } catch (error) {
    console.error('Error al vender:', error);
    return { success: false, message: 'Error al guardar venta.' };
  }
}

export async function updateSale(data: SaleData) {
  if (!data.id) return { success: false, message: 'Falta ID' };
  
  try {
    const isFullyPaid = data.amountPaid >= (data.total - 0.1);

    await prisma.sale.update({
      where: { id: data.id },
      data: {
        weightKg: data.weight,
        pricePerKg: data.pricePerKg,
        totalPrice: data.total,
        amountPaid: data.amountPaid,
        status: data.status === 'EN_PUESTO' ? SaleStatus.EN_PUESTO : SaleStatus.ENTREGADO,
        isPaid: isFullyPaid,
        customerName: data.customerName || '',
      },
    });

    revalidatePath('/');
    return { success: true, message: 'Venta actualizada' };
  } catch (error) {
    return { success: false, message: 'Error al editar' };
  }
}

export async function deleteSale(saleId: string) {
  try {
    await prisma.sale.delete({ where: { id: saleId } });
    revalidatePath('/');
    return { success: true, message: 'Venta eliminada' };
  } catch (error) {
    return { success: false, message: 'Error al eliminar' };
  }
}

export async function getRecentSales() {
  const sales = await prisma.sale.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { batch: true },
  });

  return sales.map(sale => ({
    ...sale,
    weightKg: sale.weightKg.toNumber(),
    pricePerKg: sale.pricePerKg.toNumber(),
    totalPrice: sale.totalPrice.toNumber(),
    amountPaid: sale.amountPaid.toNumber(), // Convertimos también este
    batch: {
        ...sale.batch,
        basePricePerKg: sale.batch.basePricePerKg.toNumber(),
        avgWeightPerCrate: sale.batch.avgWeightPerCrate.toNumber(),
    }
  }));
}

// MARCAR UNA CAJA COMO TERMINADA (Consumida)
export async function markCrateFinished(size: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Buscamos el lote activo de hoy
    const batch = await prisma.dailyBatch.findFirst({
      where: {
        date: { gte: today },
        size: size,
        isActive: true
      }
    });

    if (!batch) return { success: false, message: 'Lote no encontrado' };

    // 2. VERIFICACIÓN DE SEGURIDAD (El Freno de Mano) 🛑
    // Si las consumidas ya son iguales o mayores a las iniciales, NO hacemos nada.
    if (batch.consumedCrates >= batch.initialCrates) {
        return { success: false, message: 'Ya no quedan cajas por consumir' };
    }

    // 3. Si hay stock, procedemos a restar
    await prisma.dailyBatch.update({
      where: { id: batch.id },
      data: {
        consumedCrates: { increment: 1 }
      }
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

// NUEVA FUNCIÓN: Obtener TODAS las ventas de una fecha específica
export async function getSalesByDate(dateStr: string) {
  const startOfDay = new Date(`${dateStr}T00:00:00`);
  const endOfDay = new Date(`${dateStr}T23:59:59`);

  const sales = await prisma.sale.findMany({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: { createdAt: 'desc' },
    include: { batch: true },
  });

  return sales.map(sale => ({
    ...sale,
    weightKg: sale.weightKg.toNumber(),
    pricePerKg: sale.pricePerKg.toNumber(),
    totalPrice: sale.totalPrice.toNumber(),
    amountPaid: sale.amountPaid.toNumber(),
    batch: {
        ...sale.batch,
        basePricePerKg: sale.batch.basePricePerKg.toNumber(),
        avgWeightPerCrate: sale.batch.avgWeightPerCrate.toNumber(),
    }
  }));
}