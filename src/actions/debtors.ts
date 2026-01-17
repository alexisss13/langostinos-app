'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Obtener deudas con historial de pagos
export async function getDebtors() {
  try {
    const debts = await prisma.sale.findMany({
      where: { isPaid: false },
      orderBy: { createdAt: 'desc' },
      include: { 
        batch: true,
        payments: { orderBy: { date: 'desc' } } // Traemos los pagos
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
    console.error(error);
    return [];
  }
}

// Amortizar creando registro de pago
export async function amortizeDebt(saleId: string, amount: number) {
  try {
    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) return { success: false, message: 'Venta no encontrada' };

    const currentPaid = sale.amountPaid.toNumber();
    const total = sale.totalPrice.toNumber();
    const newPaid = currentPaid + amount;
    const isPaid = newPaid >= (total - 0.01); 

    // Transacción: Actualizar venta y crear pago
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
          date: new Date() // Fecha actual del pago
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