'use client';
import SalesHistory from '@/components/history/SalesHistory';
import { useRouter } from 'next/navigation';

export default function HistorialPage() {
  const router = useRouter();
  return <SalesHistory onBack={() => router.push('/')} onEdit={(sale) => { alert('Para editar, usa el panel principal.'); router.push('/'); }} />;
}