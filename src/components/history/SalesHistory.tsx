'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ArrowLeft, Calendar, Pencil, Trash2, Banknote, CreditCard, 
  Package, CheckCircle, Search, Filter, TrendingUp, Loader2, 
  Weight, DollarSign, Clock, X
} from 'lucide-react';
import { getSalesByDate, deleteSale } from '@/actions/sales';
import BottomNav from '@/components/layout/BottomNav';

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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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
    await deleteSale(id);
    setDeleteConfirm(null);
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
  const totalPaidFiltered = filteredSales.reduce((acc, curr) => acc + curr.amountPaid, 0);

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
              <h1 className="text-xl font-bold text-white tracking-tight">Historial de Ventas</h1>
              <p className="text-xs text-blue-500/80 font-medium">Registro Completo</p>
            </div>
          </div>
        </div>

        {/* Selector de fecha mejorado */}
        <div className="px-4 pb-4">
          <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-3 flex items-center gap-3">
            <div className="bg-blue-500/10 p-2 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 bg-transparent text-base font-semibold text-white outline-none"
            />
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={loadSales} 
              className="h-9 w-9 text-blue-500 hover:bg-blue-500/10 hover:text-blue-400 rounded-lg transition-all"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filtro de producto mejorado */}
        {sales.length > 0 && (
          <div className="px-4 pb-4">
            <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-3 flex items-center gap-3">
              <div className="bg-neutral-800/50 p-2 rounded-lg">
                <Filter className="w-4 h-4 text-neutral-400" />
              </div>
              <select 
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="flex-1 bg-transparent text-sm font-medium text-white outline-none"
              >
                <option value="TODOS" className="bg-neutral-900 text-white">
                  Todos los productos ({sales.length})
                </option>
                {productTypes.map(type => {
                  const count = sales.filter(s => s.batch.size === type).length;
                  return (
                    <option key={type} value={type} className="bg-neutral-900 text-white">
                      {type} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        )}

        {/* Stats cards cuando hay ventas */}
        {filteredSales.length > 0 && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 rounded-xl p-3 border border-emerald-800/30">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <p className="text-[9px] text-emerald-400 uppercase font-bold tracking-wider">Total</p>
                </div>
                <p className="text-lg font-black text-emerald-400">S/ {totalFiltered.toFixed(2)}</p>
              </div>
              
              <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 rounded-xl p-3 border border-blue-800/30">
                <div className="flex items-center gap-2 mb-1">
                  <Weight className="w-3.5 h-3.5 text-blue-500" />
                  <p className="text-[9px] text-blue-400 uppercase font-bold tracking-wider">Peso</p>
                </div>
                <p className="text-lg font-black text-blue-400">{weightFiltered.toFixed(1)} kg</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 rounded-xl p-3 border border-purple-800/30">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-purple-500" />
                  <p className="text-[9px] text-purple-400 uppercase font-bold tracking-wider">Ventas</p>
                </div>
                <p className="text-lg font-black text-purple-400">{filteredSales.length}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de ventas mejorada */}
      <div className="flex-1 overflow-auto p-4 space-y-3 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <div className="absolute inset-0 blur-xl bg-blue-500/20 animate-pulse"></div>
            </div>
            <p className="text-neutral-400 text-sm">Cargando historial...</p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="bg-neutral-800/30 p-6 rounded-full mb-4">
              <Search className="w-12 h-12 text-neutral-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {sales.length === 0 ? "Sin ventas" : "Sin resultados"}
            </h3>
            <p className="text-neutral-500 text-center text-sm">
              {sales.length === 0 
                ? "No hay ventas registradas en esta fecha" 
                : "No hay ventas de este producto"}
            </p>
          </div>
        ) : (
          filteredSales.map((sale) => (
            <Card 
              key={sale.id} 
              className={`overflow-hidden border transition-all duration-200 ${
                sale.isPaid 
                  ? 'bg-neutral-900/50 border-neutral-800/50 hover:border-neutral-700/50' 
                  : 'bg-gradient-to-br from-rose-950/20 to-rose-900/10 border-rose-800/30 hover:border-rose-700/40'
              }`}
            >
              <div className="p-4">
                {/* Header de la venta */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-black text-white text-lg">{sale.batch.size}</h3>
                      {!sale.isPaid && (
                        <span className="bg-rose-500/10 text-rose-400 text-[9px] font-bold px-2 py-0.5 rounded-md border border-rose-500/30">
                          DEUDA
                        </span>
                      )}
                    </div>
                    
                    {/* Info principal */}
                    <div className="flex items-center gap-3 text-sm mb-2">
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <div className="bg-neutral-800/50 p-1 rounded">
                          <Weight className="w-3 h-3" />
                        </div>
                        <span className="font-semibold text-white">{Number(sale.weightKg).toFixed(2)} kg</span>
                      </div>
                      <div className="text-neutral-600">•</div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-400 text-xs">Total:</span>
                        <span className="text-emerald-400 font-bold">S/ {Number(sale.totalPrice).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Badges de estado */}
                    <div className="flex flex-wrap gap-2">
                      {/* Badge de pago */}
                      {sale.isPaid ? (
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-900/20 px-2.5 py-1 rounded-lg border border-emerald-800/50 flex items-center gap-1.5">
                          <Banknote className="w-3 h-3" />
                          Pagado
                        </span>
                      ) : (
                        <span className="text-[10px] text-rose-400 font-bold bg-rose-900/20 px-2.5 py-1 rounded-lg border border-rose-800/50 flex items-center gap-1.5">
                          <CreditCard className="w-3 h-3" />
                          {sale.amountPaid > 0 ? `Pagó S/ ${sale.amountPaid.toFixed(2)}` : 'Fiado'}
                          {sale.customerName && ` - ${sale.customerName}`}
                        </span>
                      )}
                      
                      {/* Badge de entrega */}
                      {sale.status === 'EN_PUESTO' ? (
                        <span className="text-[10px] text-amber-400 font-bold bg-amber-900/20 px-2.5 py-1 rounded-lg border border-amber-800/50 flex items-center gap-1.5">
                          <Package className="w-3 h-3" />
                          En Puesto
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-400 font-bold bg-neutral-800/50 px-2.5 py-1 rounded-lg border border-neutral-700/50 flex items-center gap-1.5">
                          <CheckCircle className="w-3 h-3" />
                          Entregado
                        </span>
                      )}

                      {/* Badge de hora */}
                      <span className="text-[10px] text-neutral-500 font-mono bg-neutral-800/30 px-2.5 py-1 rounded-lg border border-neutral-700/30 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {formatTime(sale.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex flex-col gap-2 ml-3 pl-3 border-l border-neutral-800/50">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-lg transition-all" 
                      onClick={() => onEdit(sale)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-rose-400 hover:text-rose-300 hover:bg-rose-900/20 rounded-lg transition-all" 
                      onClick={() => setDeleteConfirm(sale.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Detalle de deuda si aplica */}
                {!sale.isPaid && sale.amountPaid > 0 && (
                  <div className="mt-3 pt-3 border-t border-neutral-800/30">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-500">Pendiente por pagar:</span>
                      <span className="text-rose-400 font-bold text-sm">
                        S/ {(sale.totalPrice - sale.amountPaid).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Modal de confirmación de borrado */}
                {deleteConfirm === sale.id && (
                  <div className="mt-3 pt-3 border-t border-rose-800/30 bg-rose-950/20 -mx-4 -mb-4 px-4 pb-4 rounded-b-xl animate-in fade-in zoom-in-95 duration-200">
                    <p className="text-sm text-rose-300 font-semibold mb-3 flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      ¿Borrar esta venta permanentemente?
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg h-9 transition-all"
                        onClick={() => handleDelete(sale.id)}
                      >
                        Sí, borrar
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

      <BottomNav />
    </div>
  );
}