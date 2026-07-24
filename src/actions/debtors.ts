'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Definimos el tipo exacto para nuestra cláusula Where y evitamos el 'any'
type DebtorsWhereClause = {
  isPaid: boolean;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
};

/**
 * Obtiene la lista de deudores, opcionalmente filtrada por un rango de fechas.
 * @param {string} [startDateStr] - Fecha de inicio en formato ISO o YYYY-MM-DD.
 * @param {string} [endDateStr] - Fecha de fin en formato ISO o YYYY-MM-DD.
 * @returns {Promise<Array>} Lista de ventas no pagadas con su historial.
 */
export async function getDebtors(startDateStr?: string, endDateStr?: string) {
  try {
    // Inicializamos con nuestro tipo fuerte
    const whereClause: DebtorsWhereClause = { 
      isPaid: false 
    };

    // Si hay fechas, agregamos el filtro a createdAt
    if (startDateStr || endDateStr) {
      whereClause.createdAt = {};
      
      if (startDateStr) {
        // Aseguramos que tome desde las 00:00:00
        const start = new Date(startDateStr);
        start.setHours(0, 0, 0, 0);
        whereClause.createdAt.gte = start;
      }
      
      if (endDateStr) {
        // Aseguramos que tome hasta las 23:59:59
        const end = new Date(endDateStr);
        end.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = end;
      }
    }

    const debts = await prisma.sale.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: { 
        batch: true,
        payments: { orderBy: { date: 'desc' } }
      }
    });

    return debts.map(sale => ({
      id: sale.id,
      customer: sale.customerName || 'Cliente Anónimo',
      product: sale.batch.size,
      weight: sale.weightKg.toNumber(),
      price: sale.pricePerKg.toNumber(),
      totalPrice: sale.totalPrice.toNumber(),
      amountPaid: sale.amountPaid.toNumber(),
      debt: sale.totalPrice.toNumber() - sale.amountPaid.toNumber(),
      date: sale.createdAt,
      payments: sale.payments.map(p => ({
        id: p.id,
        amount: p.amount.toNumber(),
        date: p.date
      }))
    }));
  } catch (error) {
    console.error("Error obteniendo deudores:", error);
    return [];
  }
}

/**
 * Amortiza la deuda de una venta específica creando un registro de pago.
 * @param {string} saleId - ID de la venta.
 * @param {number} amount - Monto a pagar.
 * @returns {Promise<{success: boolean, message?: string}>} Resultado de la operación.
 */
export async function amortizeDebt(saleId: string, amount: number) {
  try {
    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) return { success: false, message: 'Venta no encontrada' };

    const currentPaid = sale.amountPaid.toNumber();
    const total = sale.totalPrice.toNumber();
    const newPaid = currentPaid + amount;
    const isPaid = newPaid >= (total - 0.01); 

    await prisma.$transaction([
      prisma.sale.update({
        where: { id: saleId },
        data: {
          amountPaid: newPaid,
          isPaid: isPaid,
          status: isPaid ? 'ENTREGADO' : sale.status 
        }
      }),
      prisma.payment.create({
        data: {
          saleId: saleId,
          amount: amount,
          date: new Date()
        }
      })
    ]);

    revalidatePath('/deudas');
    revalidatePath('/'); 
    revalidatePath('/reportes');
    
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: 'Error al procesar pago' };
  }
}