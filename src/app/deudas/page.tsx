'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, User, Calendar, DollarSign, CheckCircle, Loader2, Weight, Tag } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/layout/BottomNav';
import { getDebtors, amortizeDebt } from '@/actions/debtors';

type DebtRecord = {
  id: string;
  customer: string;
  product: string;
  weight: number; // Nuevo
  price: number;  // Nuevo
  totalPrice: number;
  amountPaid: number;
  debt: number;
  date: Date;
};

export default function DebtorsPage() {
  const [debtors, setDebtors] = useState<DebtRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getDebtors();
            if (isMounted) setDebtors(data as unknown as DebtRecord[]);
        } catch (error) { console.error(error); } 
        finally { if (isMounted) setLoading(false); }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [refreshTrigger]);

  // Agrupar por Cliente
  const groupedDebts = useMemo(() => {
    const groups: Record<string, { totalDebt: number, records: DebtRecord[] }> = {};
    
    debtors.forEach(d => {
      if (search && !d.customer.toLowerCase().includes(search.toLowerCase())) return;

      if (!groups[d.customer]) {
        groups[d.customer] = { totalDebt: 0, records: [] };
      }
      groups[d.customer].records.push(d);
      groups[d.customer].totalDebt += d.debt;
    });

    // Ordenar clientes por deuda total (Mayor a menor)
    return Object.entries(groups).sort((a, b) => b[1].totalDebt - a[1].totalDebt);
  }, [debtors, search]);

  const handleAmortize = async (id: string, currentDebt: number) => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return alert("Ingresa un monto válido");
    if (amount > currentDebt + 0.1) return alert("No puedes pagar más de la deuda");

    startTransition(async () => {
      const res = await amortizeDebt(id, amount);
      if (res.success) {
        setPayingId(null);
        setPayAmount('');
        setRefreshTrigger(prev => prev + 1);
      } else {
        alert("Error al pagar");
      }
    });
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-white">
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950 sticky top-0 z-10">
        <div className="flex items-center gap-3">
            <Link href="/">
                <Button variant="ghost" size="icon" className="hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-full">
                    <ArrowLeft />
                </Button>
            </Link>
            <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Cobranzas</h1>
                <p className="text-xs text-amber-500 font-medium">Cartera de Clientes</p>
            </div>
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="p-4 pb-0">
        <div className="flex items-center gap-2 bg-neutral-900 px-3 py-2 rounded-xl border border-neutral-800 focus-within:border-amber-500/50 transition-colors">
            <Search size={18} className="text-neutral-500"/>
            <input 
                type="text" 
                placeholder="Buscar cliente..." 
                className="bg-transparent outline-none w-full text-white placeholder:text-neutral-600"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
        </div>
      </div>

      {/* LISTA */}
      <div className="flex-1 overflow-auto p-4 space-y-6 pb-24">
        {loading ? (
            <div className="text-center py-10 text-neutral-500 animate-pulse flex flex-col items-center gap-2">
                <Loader2 className="animate-spin text-amber-500"/> Cargando deudores...
            </div>
        ) : groupedDebts.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/30">
                <CheckCircle size={32} className="mx-auto mb-2 text-emerald-500/50"/>
                {search ? "No se encontraron clientes." : "¡Excelente! No hay deudas pendientes."}
            </div>
        ) : (
            groupedDebts.map(([clientName, data]) => (
                <div key={clientName} className="space-y-3">
                    {/* CABECERA CLIENTE */}
                    <div className="flex justify-between items-end px-2 border-b border-neutral-800 pb-2">
                        <div className="flex items-center gap-2 text-white font-bold text-lg">
                            <div className="bg-amber-900/20 p-1.5 rounded-lg text-amber-500"><User size={18} /></div>
                            {clientName}
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Deuda Total</p>
                            <span className="text-amber-400 font-black text-lg">S/ {data.totalDebt.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* LISTA DE DEUDAS DEL CLIENTE */}
                    <div className="space-y-3 pl-2">
                        {data.records.map(record => (
                            <Card key={record.id} className="p-4 bg-neutral-900 border-neutral-800 shadow-sm relative overflow-hidden group">
                                {/* Decoración lateral */}
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-500 to-amber-600"></div>
                                
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-black text-white text-base">{record.product}</span>
                                            <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <Calendar size={10}/> {new Date(record.date).toLocaleDateString('es-PE', {day:'2-digit', month:'2-digit'})}
                                            </span>
                                        </div>
                                        
                                        <div className="flex gap-3 text-xs text-neutral-400">
                                            <span className="flex items-center gap-1"><Weight size={12}/> {record.weight.toFixed(2)} kg</span>
                                            <span className="flex items-center gap-1"><Tag size={12}/> S/ {record.price.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="text-right">
                                        <div className="text-rose-500 font-bold text-lg">S/ {record.debt.toFixed(2)}</div>
                                        <div className="text-[10px] text-neutral-600">Total Venta: S/ {record.totalPrice.toFixed(2)}</div>
                                    </div>
                                </div>

                                {/* SECCIÓN DE PAGO */}
                                {payingId === record.id ? (
                                    <div className="mt-3 flex gap-2 animate-in fade-in zoom-in-95 duration-200 bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs font-bold">S/</span>
                                            <input 
                                                type="number" 
                                                autoFocus
                                                value={payAmount}
                                                onChange={e => setPayAmount(e.target.value)}
                                                placeholder={record.debt.toFixed(2)}
                                                className="w-full bg-neutral-900 border border-neutral-700 rounded-md py-1.5 pl-7 pr-2 text-sm text-white outline-none focus:border-amber-500 transition-colors"
                                            />
                                        </div>
                                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white h-8 w-8 p-0 rounded-md" onClick={() => handleAmortize(record.id, record.debt)} disabled={isPending}>
                                            {isPending ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle size={16}/>}
                                        </Button>
                                        <Button size="sm" variant="ghost" className="text-neutral-500 hover:text-white h-8 w-8 p-0" onClick={() => setPayingId(null)}>
                                            X
                                        </Button>
                                    </div>
                                ) : (
                                    <Button 
                                        variant="outline"
                                        size="sm"
                                        className="w-full h-8 bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-amber-400 hover:border-amber-900/50 text-xs transition-all"
                                        onClick={() => { setPayingId(record.id); setPayAmount(''); }}
                                    >
                                        <DollarSign size={14} className="mr-1.5"/> Amortizar Deuda
                                    </Button>
                                )}
                            </Card>
                        ))}
                    </div>
                </div>
            ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}