'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function registerExpense(description: string, amount: number) {
  try {
    await prisma.expense.create({
      data: {
        description,
        amount,
      },
    });
    revalidatePath('/');
    return { success: true, message: 'Gasto registrado' };
  } catch (error) {
    return { success: false, message: 'Error al registrar gasto' };
  }
}

export async function getRecentExpenses() {
  const expenses = await prisma.expense.findMany({
    take: 10,
    orderBy: { date: 'desc' },
  });
  
  // Limpieza de Decimal a Number
  return expenses.map(e => ({
    ...e,
    amount: e.amount.toNumber(),
  }));
}

export async function deleteExpense(id: string) {
    try {
        await prisma.expense.delete({ where: { id } });
        revalidatePath('/');
        return { success: true };
    } catch(e) { return { success: false }; }
}