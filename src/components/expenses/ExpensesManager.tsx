'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
// Usamos input nativo con clases Tailwind para evitar problemas de importación
// import { Input } from '@/components/ui/input'; 
import { ArrowLeft, Plus, Loader2, Trash2, Snowflake, Zap, Coffee, Fuel } from 'lucide-react';
import { registerExpense, getRecentExpenses, deleteExpense } from '@/actions/expenses';

// Tipo de dato para el Gasto
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
  
  // EL TRUCO DEL GATILLO: Cada vez que este número cambie, el efecto se dispara
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // EFECTO DE CARGA (Aislado y seguro)
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
        try {
            const data = await getRecentExpenses();
            if (isMounted) {
                // Forzamos tipado
                setExpenses(data as unknown as ExpenseRecord[]);
            }
        } catch (error) {
            console.error("Error cargando gastos:", error);
        }
    };

    fetchData();

    // Limpieza para evitar fugas de memoria
    return () => { isMounted = false; };
  }, [refreshTrigger]); // Solo se ejecuta si cambia el gatillo

  const handleSave = () => {
    if (!description || !amount) return;
    startTransition(async () => {
      await registerExpense(description, parseFloat(amount));
      setDescription('');
      setAmount('');
      // Disparamos la recarga cambiando el número
      setRefreshTrigger(prev => prev + 1);
    });
  };

  const handleDelete = (id: string) => {
    if(!confirm("¿Borrar gasto?")) return;
    startTransition(async () => {
        await deleteExpense(id);
        // Disparamos la recarga
        setRefreshTrigger(prev => prev + 1);
    });
  };

  const setQuickExpense = (text: string) => setDescription(text);

  return (
    <div className="flex flex-col h-screen bg-zinc-100 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-bold text-red-600">Registro de Gastos</h1>
      </div>

      {/* Formulario */}
      <Card className="p-4 mb-6 bg-white shadow-sm border-red-100">
        <div className="space-y-4">
            <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Concepto</label>
                {/* Input Manual Robustecido */}
                <input 
                    type="text"
                    placeholder="Ej: Hielo, Petróleo..." 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1 font-lg"
                />
                
                {/* Atajos Rápidos */}
                <div className="flex gap-2 mt-2 overflow-x-auto pb-1 touch-pan-x">
                    <Button variant="outline" size="sm" onClick={() => setQuickExpense('Hielo')} className="text-xs whitespace-nowrap bg-zinc-50 h-8"><Snowflake size={14} className="mr-1"/> Hielo</Button>
                    <Button variant="outline" size="sm" onClick={() => setQuickExpense('Desayuno')} className="text-xs whitespace-nowrap bg-zinc-50 h-8"><Coffee size={14} className="mr-1"/> Comida</Button>
                    <Button variant="outline" size="sm" onClick={() => setQuickExpense('Cargadores')} className="text-xs whitespace-nowrap bg-zinc-50 h-8"><Zap size={14} className="mr-1"/> Cargador</Button>
                    <Button variant="outline" size="sm" onClick={() => setQuickExpense('Petróleo')} className="text-xs whitespace-nowrap bg-zinc-50 h-8"><Fuel size={14} className="mr-1"/> Petróleo</Button>
                </div>
            </div>

            <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Monto (S/)</label>
                <div className="flex gap-2">
                    <input 
                        type="number" 
                        placeholder="0.00" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="flex h-14 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-2xl font-bold text-red-600"
                    />
                    <Button 
                        size="icon" 
                        className="h-14 w-20 bg-red-600 hover:bg-red-700 shadow-lg shrink-0"
                        onClick={handleSave}
                        disabled={isPending || !amount}
                    >
                        {isPending ? <Loader2 className="animate-spin"/> : <Plus size={32} />}
                    </Button>
                </div>
            </div>
        </div>
      </Card>

      {/* Lista de Gastos */}
      <div className="flex-1 overflow-auto pb-4">
        <h3 className="text-sm font-bold text-zinc-500 mb-2 uppercase tracking-wider">Últimos Gastos</h3>
        <div className="space-y-2">
            {expenses.map((expense) => (
                <div key={expense.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-zinc-200 shadow-sm">
                    <div>
                        <p className="font-bold text-zinc-800">{expense.description}</p>
                        <p className="text-xs text-zinc-400">
                            {new Date(expense.date).toLocaleTimeString('es-PE', { hour: '2-digit', minute:'2-digit', hour12: true })}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-red-600 text-lg">- S/ {Number(expense.amount).toFixed(2)}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600" onClick={() => handleDelete(expense.id)}>
                            <Trash2 size={18} />
                        </Button>
                    </div>
                </div>
            ))}
            {expenses.length === 0 && (
                <div className="text-center py-8 text-zinc-400 text-sm">
                    No hay gastos registrados hoy.
                </div>
            )}
        </div>
      </div>
    </div>
  );
}