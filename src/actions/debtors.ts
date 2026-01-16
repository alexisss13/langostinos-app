'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Obtener todas las ventas no pagadas con DETALLE COMPLETO
export async function getDebtors() {
  try {
    const debts = await prisma.sale.findMany({
      where: { isPaid: false },
      orderBy: { createdAt: 'desc' }, // Las más recientes primero
      include: { batch: true }
    });

    return debts.map(sale => ({
      id: sale.id,
      customer: sale.customerName || 'Cliente Anónimo',
      product: sale.batch.size,
      weight: sale.weightKg.toNumber(), // NUEVO
      price: sale.pricePerKg.toNumber(), // NUEVO
      totalPrice: sale.totalPrice.toNumber(),
      amountPaid: sale.amountPaid.toNumber(),
      debt: sale.totalPrice.toNumber() - sale.amountPaid.toNumber(),
      date: sale.createdAt
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Amortizar deuda (Igual que antes)
export async function amortizeDebt(saleId: string, amount: number) {
  try {
    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) return { success: false, message: 'Venta no encontrada' };

    const currentPaid = sale.amountPaid.toNumber();
    const total = sale.totalPrice.toNumber();
    const newPaid = currentPaid + amount;

    // Verificar si ya se pagó todo (o más, por redondeo)
    const isPaid = newPaid >= (total - 0.01); 

    await prisma.sale.update({
      where: { id: saleId },
      data: {
        amountPaid: newPaid,
        isPaid: isPaid,
        status: isPaid ? 'ENTREGADO' : sale.status 
      }
    });

    revalidatePath('/deudas');
    revalidatePath('/'); 
    revalidatePath('/reportes');
    
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: 'Error al procesar pago' };
  }
}