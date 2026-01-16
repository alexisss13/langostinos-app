'use client';
import OpeningForm from '@/components/batches/OpeningForm';
import { useRouter } from 'next/navigation';

export default function AperturaPage() {
  const router = useRouter();
  return <OpeningForm onSuccess={() => router.push('/')} />;
}