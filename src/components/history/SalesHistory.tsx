'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Calendar, Pencil, Trash2, Banknote, CreditCard, Package, CheckCircle, Search } from 'lucide-react';
import { getSalesByDate, deleteSale } from '@/actions/sales';

// Reutilizamos el tipo (o lo importamos si estuviera en un archivo de types)
type SaleRecord = {
    id: string;
    weightKg: number;
    pricePerKg: number;
    totalPrice: number;
    amountPaid: number;
    status: 'ENTREGADO' | 'EN_PUESTO';
    isPaid: boolean;
    customerName: string | null;
    createdAt: Date;
    batch: { size: string };
};

export default function SalesHistory({ onBack, onEdit }: { onBack: () => void, onEdit: (sale: SaleRecord) => void }) {
  // Fecha hoy formato YYYY-MM-DD local
  const today = new Date().toLocaleDateString('en-CA');
  const [date, setDate] = useState(today);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSales();
  }, [date]);

  const loadSales = async () => {
    setLoading(true);
    try {
        const data = await getSalesByDate(date);
        setSales(data as unknown as SaleRecord[]);
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("¿Borrar esta venta permanentemente?")) return;
    await deleteSale(id);
    loadSales();
  };

  const formatTime = (d: Date) => {
    return new Date(d).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-100 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft />
            </Button>
            <h1 className="text-xl font-bold text-zinc-800">Historial</h1>
        </div>
      </div>

      {/* Filtro Fecha */}
      <Card className="p-3 mb-4 flex items-center gap-3 bg-white shadow-sm border-zinc-200">
        <Calendar className="text-zinc-400" />
        <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 bg-transparent text-lg font-bold text-zinc-700 outline-none"
        />
        <Button size="icon" variant="ghost" onClick={loadSales}>
            <Search size={20} />
        </Button>
      </Card>

      {/* Lista */}
      <div className="flex-1 overflow-auto space-y-2 pb-4">
        {loading ? (
            <div className="text-center py-10 text-zinc-400">Cargando...</div>
        ) : sales.length === 0 ? (
            <div className="text-center py-10 text-zinc-400">No hay ventas en esta fecha.</div>
        ) : (
            sales.map((sale) => (
                <div key={sale.id} className={`p-3 rounded-lg border flex justify-between items-center shadow-sm bg-white ${sale.isPaid ? 'border-zinc-200' : 'border-red-200'}`}>
                    <div className="flex-1">
                        <div className="flex justify-between items-start pr-2">
                            <span className="font-bold text-zinc-800 text-lg">{sale.batch.size}</span>
                            <span className="text-xs text-zinc-400 font-mono mt-1">{formatTime(sale.createdAt)}</span>
                        </div>
                        
                        <div className="text-sm text-zinc-600 my-1">
                            {Number(sale.weightKg).toFixed(2)}kg x S/{Number(sale.pricePerKg)} = <span className="font-bold text-zinc-900">S/{Number(sale.totalPrice).toFixed(2)}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            {/* Pago */}
                            {sale.isPaid ? (
                                <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                    <Banknote size={10} /> Pagado
                                </span>
                            ) : (
                                <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                    <CreditCard size={10} /> 
                                    {sale.amountPaid > 0 ? `A cta: ${sale.amountPaid}` : 'Fiado'}
                                    {sale.customerName ? ` (${sale.customerName})` : ''}
                                </span>
                            )}
                            
                            {/* Estado Entrega */}
                            {sale.status === 'EN_PUESTO' ? (
                                <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                    <Package size={10} /> En Puesto
                                </span>
                            ) : (
                                <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                    <CheckCircle size={10} /> Entregado
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 border-l pl-2 ml-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-50" onClick={() => onEdit(sale)}>
                            <Pencil size={18} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-50" onClick={() => handleDelete(sale.id)}>
                            <Trash2 size={18} />
                        </Button>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
}