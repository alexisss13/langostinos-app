'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Plus, Loader2, Trash2, Snowflake, Zap, Coffee, Fuel, Droplet } from 'lucide-react';
import { registerExpense, getRecentExpenses, deleteExpense } from '@/actions/expenses';
import BottomNav from '@/components/layout/BottomNav'; // IMPORTAR NAV

type ExpenseRecord = { id: string; description: string; amount: number; date: Date; };

export default function ExpensesManager({ onBack }: { onBack: () => void }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [isPending, startTransition] = useTransition();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
        try {
            const data = await getRecentExpenses();
            if (isMounted) setExpenses(data as unknown as ExpenseRecord[]);
        } catch (error) { console.error("Error cargando gastos:", error); }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [refreshTrigger]);

  const handleSave = () => {
    if (!description || !amount) return;
    startTransition(async () => {
      await registerExpense(description, parseFloat(amount));
      setDescription('');
      setAmount('');
      setRefreshTrigger(prev => prev + 1);
    });
  };

  const handleDelete = (id: string) => {
    if(!confirm("¿Borrar gasto?")) return;
    startTransition(async () => {
        await deleteExpense(id);
        setRefreshTrigger(prev => prev + 1);
    });
  };

  const setQuickExpense = (text: string) => setDescription(text);

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-white p-4">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4 sticky top-0 bg-neutral-950 z-10">
        <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-full">
          <ArrowLeft />
        </Button>
        <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Gastos Operativos</h1>
            <p className="text-xs text-rose-400 font-medium">Registro de Salidas</p>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="space-y-6 flex-1 overflow-auto pb-24">
        
        {/* FORMULARIO */}
        <Card className="p-5 bg-neutral-900 border-neutral-800 shadow-lg">
            <div className="space-y-5">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Concepto del Gasto</label>
                    <input type="text" placeholder="Ej: Hielo, Petróleo..." value={description} onChange={(e) => setDescription(e.target.value)} className="flex h-12 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2 text-base text-white placeholder:text-neutral-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all"/>
                    
                    <div className="flex gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar">
                        <button onClick={() => setQuickExpense('Hielo')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-800 border border-neutral-700 text-xs font-medium text-cyan-400 hover:bg-neutral-700 whitespace-nowrap transition-colors"><Snowflake size={14}/> Hielo</button>
                        <button onClick={() => setQuickExpense('Comida')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-800 border border-neutral-700 text-xs font-medium text-amber-400 hover:bg-neutral-700 whitespace-nowrap transition-colors"><Coffee size={14}/> Comida</button>
                        <button onClick={() => setQuickExpense('Petróleo')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-800 border border-neutral-700 text-xs font-medium text-purple-400 hover:bg-neutral-700 whitespace-nowrap transition-colors"><Fuel size={14}/> Petróleo</button>
                        <button onClick={() => setQuickExpense('Agua')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-800 border border-neutral-700 text-xs font-medium text-blue-400 hover:bg-neutral-700 whitespace-nowrap transition-colors"><Droplet size={14}/> Agua</button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Monto (S/)</label>
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">S/</span>
                            <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="flex h-14 w-full rounded-xl border border-neutral-700 bg-neutral-950 pl-10 pr-4 py-2 text-2xl font-bold text-white placeholder:text-neutral-700 focus:border-rose-500 outline-none transition-all"/>
                        </div>
                        <Button size="icon" className="h-14 w-20 bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/20 rounded-xl shrink-0 transition-all active:scale-95" onClick={handleSave} disabled={isPending || !amount || !description}>
                            {isPending ? <Loader2 className="animate-spin text-white"/> : <Plus size={32} className="text-white" />}
                        </Button>
                    </div>
                </div>
            </div>
        </Card>

        {/* LISTA DE GASTOS */}
        <div>
            <h3 className="text-xs font-bold text-neutral-500 mb-3 uppercase tracking-wider px-1">Movimientos de Hoy</h3>
            <div className="space-y-2">
                {expenses.map((expense) => (
                    <div key={expense.id} className="flex justify-between items-center p-4 bg-neutral-900 rounded-xl border border-neutral-800 shadow-sm hover:border-neutral-700 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="bg-rose-900/20 p-2.5 rounded-full text-rose-500"><Zap size={18} /></div>
                            <div>
                                <p className="font-bold text-neutral-200 text-sm">{expense.description}</p>
                                <p className="text-[10px] text-neutral-500 font-medium bg-neutral-800 px-1.5 py-0.5 rounded w-fit mt-1">{new Date(expense.date).toLocaleTimeString('es-PE', { hour: '2-digit', minute:'2-digit', hour12: true })}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-rose-400 text-lg">- S/ {Number(expense.amount).toFixed(2)}</span>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-neutral-600 hover:text-rose-500 hover:bg-rose-900/10 rounded-full" onClick={() => handleDelete(expense.id)}><Trash2 size={18} /></Button>
                        </div>
                    </div>
                ))}
                
                {expenses.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-neutral-600 space-y-3 border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/30">
                        <Zap size={32} className="opacity-20" />
                        <span className="text-sm font-medium">No hay gastos registrados hoy.</span>
                    </div>
                )}
            </div>
        </div>
      </div>

      <BottomNav /> {/* AQUI TAMBIEN */}
    </div>
  );
}