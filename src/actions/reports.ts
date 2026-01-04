'use server';

import { prisma } from '@/lib/prisma';

// Función para obtener las estadísticas de una fecha
export async function getDailyStats(dateStr: string) {
  // Configurar rango de fecha (Inicio y Fin del día en hora local aprox)
  const startOfDay = new Date(`${dateStr}T00:00:00`);
  const endOfDay = new Date(`${dateStr}T23:59:59`);

  try {
    // 1. Obtener VENTAS del día
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: { batch: true }
    });

    // 2. Obtener GASTOS del día
    const expenses = await prisma.expense.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // 3. Calcular Totales
    let totalVendido = 0;      // Dinero teórico total
    let totalCobrado = 0;      // Dinero real en mano (incluye pagos parciales)
    let totalFiado = 0;        // Deuda generada hoy
    let totalKilos = 0;        // Kilos movidos
    let totalGastos = 0;       // Salidas

    sales.forEach(sale => {
      totalVendido += sale.totalPrice.toNumber();
      totalCobrado += sale.amountPaid.toNumber();
      totalKilos += sale.weightKg.toNumber();
    });
    
    totalFiado = totalVendido - totalCobrado;

    expenses.forEach(exp => {
      totalGastos += exp.amount.toNumber();
    });

    // 4. Filtrar Deudores (Quienes no han pagado completo)
    const debtors = sales
      .filter(s => !s.isPaid)
      .map(s => ({
        id: s.id,
        client: s.customerName || 'Cliente Anónimo',
        debt: s.totalPrice.toNumber() - s.amountPaid.toNumber(),
        product: s.batch.size,
        time: s.createdAt
      }));

    // 5. Agrupar Ventas por Producto (Para el gráfico de pastel mental)
    const byProduct: Record<string, { kg: number, soles: number }> = {};
    sales.forEach(s => {
        const size = s.batch.size;
        if (!byProduct[size]) byProduct[size] = { kg: 0, soles: 0 };
        byProduct[size].kg += s.weightKg.toNumber();
        byProduct[size].soles += s.totalPrice.toNumber();
    });

    return {
      summary: {
        totalVendido,
        totalCobrado,
        totalFiado,
        totalKilos,
        totalGastos,
        neto: totalCobrado - totalGastos, // Lo que te queda en el bolsillo hoy
      },
      debtors,
      byProduct
    };

  } catch (error) {
    console.error("Error en reporte:", error);
    return null;
  }
}