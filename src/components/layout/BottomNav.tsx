'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Store, TrendingDown, History, PieChart, Users } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="bg-neutral-900 border-t border-neutral-800 fixed bottom-0 w-full h-16 grid grid-cols-5 items-center z-50 pb-safe left-0">
      <Link href="/" className={`flex flex-col items-center justify-center h-full transition-colors border-t-2 ${isActive('/') ? 'border-blue-500 text-blue-500' : 'border-transparent text-neutral-500 hover:text-blue-400'}`}>
        <Store size={20} strokeWidth={2.5} />
        <span className="text-[9px] font-bold mt-1">Ventas</span>
      </Link>
      
      <Link href="/gastos" className={`flex flex-col items-center justify-center h-full transition-colors border-t-2 ${isActive('/gastos') ? 'border-rose-500 text-rose-500' : 'border-transparent text-neutral-500 hover:text-rose-400'}`}>
        <TrendingDown size={20} strokeWidth={2} />
        <span className="text-[9px] font-medium mt-1">Gastos</span>
      </Link>

      <Link href="/deudas" className={`flex flex-col items-center justify-center h-full transition-colors border-t-2 ${isActive('/deudas') ? 'border-amber-500 text-amber-500' : 'border-transparent text-neutral-500 hover:text-amber-400'}`}>
        <Users size={20} strokeWidth={2} />
        <span className="text-[9px] font-medium mt-1">Deudas</span>
      </Link>

      <Link href="/historial" className={`flex flex-col items-center justify-center h-full transition-colors border-t-2 ${isActive('/historial') ? 'border-blue-400 text-blue-400' : 'border-transparent text-neutral-500 hover:text-blue-300'}`}>
        <History size={20} strokeWidth={2} />
        <span className="text-[9px] font-medium mt-1">Historial</span>
      </Link>

      <Link href="/reportes" className={`flex flex-col items-center justify-center h-full transition-colors border-t-2 ${isActive('/reportes') ? 'border-purple-500 text-purple-500' : 'border-transparent text-neutral-500 hover:text-purple-400'}`}>
        <PieChart size={20} strokeWidth={2} />
        <span className="text-[9px] font-medium mt-1">Reportes</span>
      </Link>
    </div>
  );
}