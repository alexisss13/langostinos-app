'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ArrowLeft, Calendar, Pencil, Trash2, Banknote, CreditCard, 
  Package, CheckCircle, Search, Filter, Store, TrendingDown, History, PieChart 
} from 'lucide-react';
import { getSalesByDate, deleteSale } from '@/actions/sales';
import Link from 'next/link';

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
  const today = new Date().toLocaleDateString('en-CA');
  const [date, setDate] = useState(today);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('TODOS');

  useEffect(() => { loadSales(); }, [date]);

  const loadSales = async () => {
    setLoading(true);
    try {
        const data = await getSalesByDate(date);
        setSales(data as unknown as SaleRecord[]);
        setSelectedProduct('TODOS');
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("¿Borrar esta venta permanentemente?")) return;
    await deleteSale(id);
    loadSales();
  };

  const formatTime = (d: Date) => {
    return new Date(d).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const productTypes = useMemo(() => {
    const types = new Set(sales.map(s => s.batch.size));
    return Array.from(types).sort();
  }, [sales]);

  const filteredSales = useMemo(() => {
    if (selectedProduct === 'TODOS') return sales;
    return sales.filter(s => s.batch.size === selectedProduct);
  }, [sales, selectedProduct]);

  const totalFiltered = filteredSales.reduce((acc, curr) => acc + curr.totalPrice, 0);
  const weightFiltered = filteredSales.reduce((acc, curr) => acc + curr.weightKg, 0);

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-white p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4 sticky top-0 bg-neutral-950 z-10">
        <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-full">
          <ArrowLeft />
        </Button>
        <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Historial de Ventas</h1>
            <p className="text-xs text-blue-400 font-medium">Registro Diario</p>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 overflow-auto space-y-4 pb-24"> {/* pb-24 para el navbar */}
        
        {/* BARRA DE FILTROS */}
        <Card className="p-4 space-y-4 bg-neutral-900 border-neutral-800 shadow-lg">
            {/* Fila 1: Fecha */}
            <div className="flex items-center gap-3 bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                <Calendar className="text-neutral-500" size={20} />
                <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    className="flex-1 bg-transparent text-base font-bold text-white outline-none"
                />
                <Button size="icon" variant="ghost" onClick={loadSales} className="h-8 w-8 text-blue-500 hover:bg-blue-900/20 hover:text-blue-400">
                    <Search size={18} />
                </Button>
            </div>

            {/* Fila 2: Filtro de Producto */}
            {sales.length > 0 && (
                <div className="flex items-center gap-3 pt-2 border-t border-neutral-800">
                    <Filter className="text-neutral-500" size={18} />
                    <select 
                        value={selectedProduct}
                        onChange={(e) => setSelectedProduct(e.target.value)}
                        className="flex-1 bg-transparent text-sm font-medium text-neutral-300 outline-none py-1"
                    >
                        <option value="TODOS" className="bg-neutral-900 text-white">Todos los productos ({sales.length})</option>
                        {productTypes.map(type => (
                            <option key={type} value={type} className="bg-neutral-900 text-white">{type}</option>
                        ))}
                    </select>
                </div>
            )}
        </Card>

        {/* RESUMEN RÁPIDO */}
        {sales.length > 0 && (
            <div className="flex justify-between px-2 mb-3 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                <span>{filteredSales.length} movimientos</span>
                <span>Total: <span className="text-emerald-500">S/ {totalFiltered.toFixed(2)}</span> • {weightFiltered.toFixed(2)} kg</span>
            </div>
        )}

        {/* LISTA FILTRADA */}
        {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-500 space-y-2">
                <div className="animate-spin text-blue-500"><Search size={24}/></div>
                <span className="text-xs">Buscando registros...</span>
            </div>
        ) : filteredSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-600 space-y-3 border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/30">
                <Search size={32} className="opacity-20" />
                <span className="text-sm font-medium">
                    {sales.length === 0 ? "No hay ventas en esta fecha." : "No hay ventas de este producto."}
                </span>
            </div>
        ) : (
            filteredSales.map((sale) => (
                <div key={sale.id} className={`p-4 rounded-xl border shadow-sm transition-colors flex justify-between items-center ${sale.isPaid ? 'bg-neutral-900 border-neutral-800' : 'bg-rose-950/10 border-rose-900/30'}`}>
                    <div className="flex-1">
                        <div className="flex justify-between items-start pr-2 mb-1">
                            <span className="font-bold text-white text-lg">{sale.batch.size}</span>
                            <span className="text-[10px] text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded font-mono">{formatTime(sale.createdAt)}</span>
                        </div>
                        
                        <div className="text-sm text-neutral-400 mb-2">
                            <span className="text-neutral-200 font-medium">{Number(sale.weightKg).toFixed(2)} kg</span>
                            <span className="mx-1.5 opacity-30">|</span>
                            <span className="text-white font-bold">S/ {Number(sale.totalPrice).toFixed(2)}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            {sale.isPaid ? (
                                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-900/50 flex items-center gap-1">
                                    <Banknote size={10} /> Pagado
                                </span>
                            ) : (
                                <span className="text-[10px] text-rose-400 font-bold bg-rose-900/20 px-2 py-0.5 rounded border border-rose-900/50 flex items-center gap-1">
                                    <CreditCard size={10} /> 
                                    {sale.amountPaid > 0 ? `A cta: ${sale.amountPaid}` : 'Fiado'}
                                    {sale.customerName ? ` (${sale.customerName})` : ''}
                                </span>
                            )}
                            
                            {sale.status === 'EN_PUESTO' ? (
                                <span className="text-[10px] text-amber-400 font-bold bg-amber-900/20 px-2 py-0.5 rounded border border-amber-900/50 flex items-center gap-1">
                                    <Package size={10} /> En Puesto
                                </span>
                            ) : (
                                <span className="text-[10px] text-neutral-400 font-bold bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700 flex items-center gap-1">
                                    <CheckCircle size={10} /> Entregado
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 border-l border-neutral-800 pl-3 ml-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-lg" onClick={() => onEdit(sale)}>
                            <Pencil size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-900/20 rounded-lg" onClick={() => handleDelete(sale.id)}>
                            <Trash2 size={16} />
                        </Button>
                    </div>
                </div>
            ))
        )}
      </div>

      {/* BOTTOM NAVIGATION (ACTIVE: HISTORIAL) */}
      <div className="bg-neutral-900 border-t border-neutral-800 fixed bottom-0 w-full h-16 grid grid-cols-4 items-center z-50 pb-safe left-0">
            <button className="flex flex-col items-center justify-center text-neutral-500 hover:text-blue-400 h-full transition-colors border-t-2 border-transparent hover:border-blue-500/50" onClick={onBack}>
                <Store size={22} strokeWidth={2} />
                <span className="text-[10px] font-medium mt-1">Ventas</span>
            </button>
            <button className="flex flex-col items-center justify-center text-neutral-500 hover:text-rose-400 h-full transition-colors border-t-2 border-transparent hover:border-rose-500/50" onClick={onBack}>
                <TrendingDown size={22} strokeWidth={2} />
                <span className="text-[10px] font-medium mt-1">Gastos</span>
            </button>
            <button className="flex flex-col items-center justify-center text-blue-500 h-full border-t-2 border-blue-500">
                <History size={22} strokeWidth={2.5} />
                <span className="text-[10px] font-bold mt-1">Historial</span>
            </button>
            <Link href="/reportes" className="flex flex-col items-center justify-center text-neutral-500 hover:text-purple-400 h-full transition-colors border-t-2 border-transparent hover:border-purple-500/50">
                <PieChart size={22} strokeWidth={2} />
                <span className="text-[10px] font-medium mt-1">Reportes</span>
            </Link>
        </div>
    </div>
  );
}