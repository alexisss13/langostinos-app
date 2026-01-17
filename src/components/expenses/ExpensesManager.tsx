'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ArrowLeft, Plus, Loader2, Trash2, Snowflake, Zap, Coffee, 
  Fuel, Droplet, DollarSign, TrendingDown, Clock, X 
} from 'lucide-react';
import { registerExpense, getRecentExpenses, deleteExpense } from '@/actions/expenses';
import BottomNav from '@/components/layout/BottomNav';

type ExpenseRecord = { 
  id: string; 
  description: string; 
  amount: number; 
  date: Date; 
};

export default function ExpensesManager({ onBack }: { onBack: () => void }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [isPending, startTransition] = useTransition();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

  const handleDelete = async (id: string) => {
    startTransition(async () => {
        await deleteExpense(id);
        setDeleteConfirm(null);
        setRefreshTrigger(prev => prev + 1);
    });
  };

  const setQuickExpense = (text: string) => setDescription(text);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-neutral-950 via-neutral-950 to-neutral-900 text-white">
      {/* Header mejorado */}
      <div className="bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/50 sticky top-0 z-20">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBack} 
              className="hover:bg-neutral-800/50 text-neutral-400 hover:text-white rounded-full transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Gastos</h1>
              <p className="text-xs text-rose-500/80 font-medium">Control de Egresos</p>
            </div>
          </div>
        </div>

        {/* Card de total de gastos */}
        {expenses.length > 0 && (
          <div className="px-4 pb-4">
            <div className="bg-gradient-to-br from-rose-900/20 to-rose-800/10 rounded-2xl p-4 border border-rose-800/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-400 uppercase font-semibold tracking-wider mb-1">Total de Hoy</p>
                  <p className="text-3xl font-black text-rose-400">S/ {totalExpenses.toFixed(2)}</p>
                </div>
                <div className="bg-rose-500/10 p-3 rounded-xl">
                  <TrendingDown className="w-8 h-8 text-rose-500" />
                </div>
              </div>
              <div className="flex gap-4 mt-3 pt-3 border-t border-neutral-800/50">
                <div>
                  <p className="text-xs text-neutral-500">Movimientos</p>
                  <p className="text-lg font-bold text-white">{expenses.length}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Promedio</p>
                  <p className="text-lg font-bold text-white">S/ {(totalExpenses / expenses.length).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contenido principal */}
      <div className="flex-1 overflow-auto p-4 space-y-5 pb-24">
        
        {/* FORMULARIO mejorado */}
        <Card className="bg-neutral-900/50 border-neutral-800/50 overflow-hidden">
          <div className="p-5 space-y-5">
            {/* Campo de concepto */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" />
                Concepto del Gasto
              </label>
              <input 
                type="text" 
                placeholder="¿En qué gastaste?" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                className="flex h-12 w-full rounded-xl border border-neutral-700/50 bg-neutral-950/70 px-4 py-2 text-base text-white placeholder:text-neutral-600 focus:border-rose-500/50 focus:bg-neutral-950 outline-none transition-all"
              />
              
              {/* Botones rápidos mejorados */}
              <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => setQuickExpense('Hielo')} 
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs font-semibold text-cyan-400 hover:bg-cyan-500/20 transition-all"
                >
                  <Snowflake className="w-3.5 h-3.5" /> Hielo
                </button>
                <button 
                  onClick={() => setQuickExpense('Comida')} 
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-all"
                >
                  <Coffee className="w-3.5 h-3.5" /> Comida
                </button>
                <button 
                  onClick={() => setQuickExpense('Petróleo')} 
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs font-semibold text-purple-400 hover:bg-purple-500/20 transition-all"
                >
                  <Fuel className="w-3.5 h-3.5" /> Petróleo
                </button>
                <button 
                  onClick={() => setQuickExpense('Agua')} 
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 transition-all"
                >
                  <Droplet className="w-3.5 h-3.5" /> Agua
                </button>
              </div>
            </div>

            {/* Campo de monto */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5" />
                Monto
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-lg">S/</span>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    className="flex h-14 w-full rounded-xl border border-neutral-700/50 bg-neutral-950/70 pl-12 pr-4 py-2 text-2xl font-bold text-white placeholder:text-neutral-700 focus:border-rose-500/50 focus:bg-neutral-950 outline-none transition-all"
                  />
                </div>
                <Button 
                  size="icon" 
                  className="h-14 w-16 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 shadow-lg shadow-rose-900/30 rounded-xl shrink-0 transition-all active:scale-95" 
                  onClick={handleSave} 
                  disabled={isPending || !amount || !description}
                >
                  {isPending ? (
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  ) : (
                    <Plus className="w-7 h-7 text-white" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* LISTA DE GASTOS mejorada */}
        <div>
          <div className="flex items-center gap-2 mb-4 px-1">
            <Clock className="w-4 h-4 text-neutral-500" />
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Movimientos de Hoy</h3>
            {expenses.length > 0 && (
              <span className="bg-rose-500/10 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-rose-500/30">
                {expenses.length}
              </span>
            )}
          </div>
          
          <div className="space-y-3">
            {expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="bg-neutral-800/30 p-6 rounded-full mb-4">
                  <Zap className="w-12 h-12 text-neutral-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Sin gastos</h3>
                <p className="text-neutral-500 text-center text-sm">No hay gastos registrados hoy</p>
              </div>
            ) : (
              expenses.map((expense) => (
                <Card 
                  key={expense.id} 
                  className="bg-neutral-900/50 border-neutral-800/50 hover:border-neutral-700/50 transition-all overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="bg-rose-500/10 p-2.5 rounded-xl mt-0.5">
                          <TrendingDown className="w-5 h-5 text-rose-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-white text-base mb-1">{expense.description}</p>
                          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                            <Clock className="w-3 h-3" />
                            <span className="font-mono">
                              {new Date(expense.date).toLocaleTimeString('es-PE', { 
                                hour: '2-digit', 
                                minute:'2-digit', 
                                hour12: true 
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-3">
                        <span className="font-black text-rose-400 text-xl">
                          - S/ {Number(expense.amount).toFixed(2)}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 text-neutral-600 hover:text-rose-500 hover:bg-rose-900/20 rounded-lg transition-all" 
                          onClick={() => setDeleteConfirm(expense.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Modal de confirmación de borrado */}
                    {deleteConfirm === expense.id && (
                      <div className="mt-3 pt-3 border-t border-rose-800/30 bg-rose-950/20 -mx-4 -mb-4 px-4 pb-4 rounded-b-xl animate-in fade-in zoom-in-95 duration-200">
                        <p className="text-sm text-rose-300 font-semibold mb-3 flex items-center gap-2">
                          <Trash2 className="w-4 h-4" />
                          ¿Eliminar este gasto?
                        </p>
                        <div className="flex gap-2">
                          <Button 
                            size="sm"
                            className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg h-9 transition-all"
                            onClick={() => handleDelete(expense.id)}
                            disabled={isPending}
                          >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sí, eliminar'}
                          </Button>
                          <Button 
                            size="sm"
                            variant="ghost"
                            className="flex-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg h-9"
                            onClick={() => setDeleteConfirm(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}