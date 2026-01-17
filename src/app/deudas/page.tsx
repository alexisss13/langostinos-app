'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, User, Calendar, DollarSign, CheckCircle, Loader2, Weight, Tag, History, TrendingDown, X } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/layout/BottomNav';
import { getDebtors, amortizeDebt } from '@/actions/debtors';

type PaymentRecord = {
    id: string;
    amount: number;
    date: Date;
};

type DebtRecord = {
  id: string;
  customer: string;
  product: string;
  weight: number;
  price: number;
  totalPrice: number;
  amountPaid: number;
  debt: number;
  date: Date;
  payments: PaymentRecord[];
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

  const groupedDebts = useMemo(() => {
    const groups: Record<string, { totalDebt: number, records: DebtRecord[] }> = {};
    debtors.forEach(d => {
      if (search && !d.customer.toLowerCase().includes(search.toLowerCase())) return;
      if (!groups[d.customer]) groups[d.customer] = { totalDebt: 0, records: [] };
      groups[d.customer].records.push(d);
      groups[d.customer].totalDebt += d.debt;
    });
    return Object.entries(groups).sort((a, b) => b[1].totalDebt - a[1].totalDebt);
  }, [debtors, search]);

  const totalDebt = useMemo(() => {
    return groupedDebts.reduce((sum, [, data]) => sum + data.totalDebt, 0);
  }, [groupedDebts]);

  const handleAmortize = async (id: string, currentDebt: number) => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return alert("Monto inválido");
    if (amount > currentDebt + 0.1) return alert("No puedes pagar más de lo que debe");

    startTransition(async () => {
      const res = await amortizeDebt(id, amount);
      if (res.success) {
        setPayingId(null);
        setPayAmount('');
        setRefreshTrigger(prev => prev + 1);
      } else { alert("Error al pagar"); }
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-neutral-950 via-neutral-950 to-neutral-900 text-white">
      {/* Header mejorado */}
      <div className="bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/50 sticky top-0 z-20">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button 
                variant="ghost" 
                size="icon" 
                className="hover:bg-neutral-800/50 text-neutral-400 hover:text-white rounded-full transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Cobranzas</h1>
              <p className="text-xs text-amber-500/80 font-medium">Gestión de Cartera</p>
            </div>
          </div>
        </div>

        {/* Stats Card - Resumen */}
        <div className="px-4 pb-4">
          <div className="bg-gradient-to-br from-amber-900/20 to-rose-900/20 rounded-2xl p-4 border border-amber-800/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 uppercase font-semibold tracking-wider mb-1">Deuda Total</p>
                <p className="text-3xl font-black text-amber-400">S/ {totalDebt.toFixed(2)}</p>
              </div>
              <div className="bg-amber-500/10 p-3 rounded-xl">
                <TrendingDown className="w-8 h-8 text-amber-500" />
              </div>
            </div>
            <div className="flex gap-4 mt-3 pt-3 border-t border-neutral-800/50">
              <div>
                <p className="text-xs text-neutral-500">Clientes</p>
                <p className="text-lg font-bold text-white">{groupedDebts.length}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Ventas</p>
                <p className="text-lg font-bold text-white">{debtors.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de búsqueda mejorada */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              className="w-full bg-neutral-900/50 border border-neutral-800/50 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-amber-500/50 focus:bg-neutral-900 transition-all"
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lista de deudores mejorada */}
      <div className="flex-1 overflow-auto p-4 space-y-4 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
              <div className="absolute inset-0 blur-xl bg-amber-500/20 animate-pulse"></div>
            </div>
            <p className="text-neutral-400 text-sm">Cargando cobranzas...</p>
          </div>
        ) : groupedDebts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="bg-emerald-500/10 p-6 rounded-full mb-4">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {search ? "Sin resultados" : "¡Todo al día!"}
            </h3>
            <p className="text-neutral-500 text-center text-sm">
              {search ? "No se encontraron clientes con ese nombre" : "No hay deudas pendientes"}
            </p>
          </div>
        ) : (
          groupedDebts.map(([clientName, data]) => (
            <div key={clientName} className="space-y-3">
              {/* Header del cliente mejorado */}
              <div className="bg-gradient-to-r from-neutral-900 to-neutral-900/50 rounded-xl p-4 border border-neutral-800/50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-amber-500 to-rose-500 p-2.5 rounded-xl">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{clientName}</h3>
                      <p className="text-xs text-neutral-500">{data.records.length} venta{data.records.length > 1 ? 's' : ''} pendiente{data.records.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-500 uppercase font-semibold tracking-wide">Debe</p>
                    <span className="text-2xl font-black text-amber-400">S/ {data.totalDebt.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Lista de ventas mejorada */}
              <div className="space-y-3">
                {data.records.map(record => (
                  <Card key={record.id} className="bg-neutral-900/50 border-neutral-800/50 backdrop-blur-sm overflow-hidden hover:border-neutral-700/50 transition-all duration-200">
                    <div className="p-4 space-y-3">
                      {/* Info principal */}
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-white text-lg">{record.product}</span>
                            <span className="text-[10px] bg-neutral-800/70 text-neutral-400 px-2 py-1 rounded-md flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(record.date).toLocaleDateString('es-PE', {day:'2-digit', month:'2-digit', year:'2-digit'})}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs">
                            <span className="flex items-center gap-1.5 text-neutral-400">
                              <div className="bg-neutral-800/50 p-1 rounded">
                                <Weight className="w-3 h-3" />
                              </div>
                              {record.weight.toFixed(2)} kg
                            </span>
                            <span className="flex items-center gap-1.5 text-neutral-400">
                              <div className="bg-neutral-800/50 p-1 rounded">
                                <Tag className="w-3 h-3" />
                              </div>
                              S/ {record.price.toFixed(2)}/kg
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-rose-500 font-black text-xl">S/ {record.debt.toFixed(2)}</div>
                          <div className="text-[10px] text-neutral-600">de S/ {record.totalPrice.toFixed(2)}</div>
                          {record.amountPaid > 0 && (
                            <div className="text-[10px] text-emerald-500 font-semibold mt-1">
                              Pagado: S/ {record.amountPaid.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Historial de pagos mejorado */}
                      {record.payments.length > 0 && (
                        <div className="bg-neutral-950/70 rounded-lg p-3 border border-neutral-800/30">
                          <div className="flex items-center gap-2 mb-2">
                            <History className="w-3.5 h-3.5 text-neutral-500" />
                            <p className="text-xs text-neutral-500 uppercase font-bold tracking-wide">Historial</p>
                          </div>
                          <div className="space-y-1.5">
                            {record.payments.map(p => (
                              <div key={p.id} className="flex justify-between items-center text-xs py-1.5 border-b border-neutral-800/30 last:border-0">
                                <span className="text-neutral-400">
                                  {new Date(p.date).toLocaleDateString('es-PE', {day:'2-digit', month:'2-digit'})} • {new Date(p.date).toLocaleTimeString('es-PE',{hour:'2-digit', minute:'2-digit'})}
                                </span>
                                <span className="text-emerald-400 font-bold">+ S/ {p.amount.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Formulario de pago mejorado */}
                      {payingId === record.id ? (
                        <div className="bg-neutral-950/70 rounded-lg p-3 border border-amber-800/30 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm font-bold">S/</span>
                            <input 
                              type="number" 
                              autoFocus 
                              value={payAmount} 
                              onChange={e => setPayAmount(e.target.value)} 
                              placeholder={record.debt.toFixed(2)} 
                              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg py-2.5 pl-8 pr-4 text-base text-white outline-none focus:border-amber-500 transition-colors"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-lg h-10 transition-all duration-200" 
                              onClick={() => handleAmortize(record.id, record.debt)} 
                              disabled={isPending}
                            >
                              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                              Confirmar Pago
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg h-10 px-4" 
                              onClick={() => setPayingId(null)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full bg-neutral-950/50 border-neutral-800/50 text-neutral-400 hover:text-amber-400 hover:border-amber-800/50 hover:bg-neutral-900/50 rounded-lg h-10 font-semibold transition-all duration-200" 
                          onClick={() => { setPayingId(record.id); setPayAmount(''); }}
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          Registrar Pago
                        </Button>
                      )}
                    </div>
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