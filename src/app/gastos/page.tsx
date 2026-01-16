'use client';
import ExpensesManager from '@/components/expenses/ExpensesManager';
import { useRouter } from 'next/navigation';

export default function GastosPage() {
  const router = useRouter();
  // El onBack ahora redirige al Home (SalesCalculator)
  return <ExpensesManager onBack={() => router.push('/')} />;
}