'use server';

import { prisma } from '@/lib/prisma';

export async function getDailyStats(dateStr: string) {
  const startOfDay = new Date(`${dateStr}T00:00:00`);
  const endOfDay = new Date(`${dateStr}T23:59:59`);

  try {
    // 1. Datos de Ventas
    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      include: { batch: true }
    });

    // 2. Datos de Gastos
    const expenses = await prisma.expense.findMany({
      where: { date: { gte: startOfDay, lte: endOfDay } },
    });

    // 3. Datos de Lotes (Para stock y cajas consumidas)
    const batches = await prisma.dailyBatch.findMany({
        where: { date: { gte: startOfDay, lte: endOfDay } }
    });

    // Mapa auxiliar para contar cajas
    const stockMap: Record<string, { remaining: number, consumed: number }> = {};
    
    batches.forEach(b => {
        if (!stockMap[b.size]) stockMap[b.size] = { remaining: 0, consumed: 0 };
        stockMap[b.size].remaining += (b.initialCrates - b.consumedCrates);
        stockMap[b.size].consumed += b.consumedCrates; // <--- AQUÍ SUMAMOS LAS CAJAS VACÍAS
    });

    let totalVendido = 0;
    let totalCobrado = 0;
    let totalFiado = 0;
    let totalKilos = 0;
    let totalGastos = 0;

    sales.forEach(sale => {
      totalVendido += sale.totalPrice.toNumber();
      totalCobrado += sale.amountPaid.toNumber();
      totalKilos += sale.weightKg.toNumber();
    });
    
    totalFiado = totalVendido - totalCobrado;

    expenses.forEach(exp => {
      totalGastos += exp.amount.toNumber();
    });

    // ACTUALIZADO: Ahora incluimos todos los detalles de la venta
    const debtors = sales
      .filter(s => !s.isPaid)
      .map(s => ({
        id: s.id,
        client: s.customerName || 'Cliente Anónimo',
        debt: s.totalPrice.toNumber() - s.amountPaid.toNumber(),
        product: s.batch.size,
        time: s.createdAt,
        weightKg: s.weightKg.toNumber(),        // ← NUEVO
        pricePerKg: s.pricePerKg.toNumber(),    // ← NUEVO
        totalPrice: s.totalPrice.toNumber(),    // ← NUEVO
        amountPaid: s.amountPaid.toNumber()     // ← NUEVO
      }));

    // Agrupación por producto con DATOS REALES
    const byProduct: Record<string, { kg: number, soles: number, remainingCrates: number, consumedCrates: number }> = {};
    
    sales.forEach(s => {
        const size = s.batch.size;
        if (!byProduct[size]) {
            byProduct[size] = { 
                kg: 0, 
                soles: 0, 
                remainingCrates: stockMap[size]?.remaining || 0,
                consumedCrates: stockMap[size]?.consumed || 0 // <--- Pasamos el dato al frontend
            };
        }
        byProduct[size].kg += s.weightKg.toNumber();
        byProduct[size].soles += s.totalPrice.toNumber();
    });

    return {
      summary: { totalVendido, totalCobrado, totalFiado, totalKilos, totalGastos, neto: totalCobrado - totalGastos },
      debtors,
      byProduct
    };

  } catch (error) {
    console.error(error);
    return null;
  }
}