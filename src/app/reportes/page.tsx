'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Calendar, TrendingUp, TrendingDown, Users, 
  Wallet, AlertCircle, Package, PieChart, DollarSign, 
  Weight, Loader2, ShoppingCart, CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { getDailyStats } from '@/actions/reports';
import BottomNav from '@/components/layout/BottomNav';

type ReportData = {
  summary: {
    totalVendido: number;
    totalCobrado: number;
    totalFiado: number;
    totalKilos: number;
    totalGastos: number;
    neto: number;
  };
  debtors: Array<{
    id: string;
    client: string;
    debt: number;
    product: string;
    time: string | Date;
    weightKg: number;
    pricePerKg: number;
    totalPrice: number;
    amountPaid: number;
  }>;
  byProduct: Record<string, { 
      kg: number; 
      soles: number;
      remainingCrates: number; 
      consumedCrates: number;
  }>;
};

export default function ReportsPage() {
  const todayStr = new Date().toLocaleDateString('en-CA'); 
  const [date, setDate] = useState(todayStr);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
        const stats = await getDailyStats(date);
        if (stats) setData(stats as unknown as ReportData);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [date]);

  useEffect(() => { loadData(); }, [loadData]);

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
              <h1 className="text-xl font-bold text-white tracking-tight">Reportes</h1>
              <p className="text-xs text-purple-500/80 font-medium">Análisis del Día</p>
            </div>
          </div>
          
          {/* Selector de fecha mejorado */}
          <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl px-3 py-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-500" />
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent outline-none text-sm font-semibold text-white w-28"
            />
          </div>
        </div>
      </div>

      {loading || !data ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          {loading ? (
            <>
              <div className="relative">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                <div className="absolute inset-0 blur-xl bg-purple-500/20 animate-pulse"></div>
              </div>
              <p className="text-neutral-400 text-sm">Calculando métricas...</p>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <div className="bg-neutral-800/30 p-6 rounded-full mb-4">
                <PieChart className="w-12 h-12 text-neutral-600" />
              </div>
              <p className="text-neutral-500">No hay datos para esta fecha</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4 space-y-5 pb-24">
            
          {/* 1. RESUMEN FINANCIERO - Grid mejorado */}
          <div className="grid grid-cols-2 gap-3">
            {/* Venta Total */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 border-emerald-800/30">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full -mr-10 -mt-10"></div>
              <div className="p-4 relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-emerald-500/10 p-1.5 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide">Venta Total</div>
                </div>
                <div className="text-2xl font-black text-emerald-400 mb-1">S/ {data.summary.totalVendido.toFixed(2)}</div>
                <div className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                  <Weight className="w-3 h-3" />
                  {data.summary.totalKilos.toFixed(2)} kg
                </div>
              </div>
            </Card>

            {/* Gastos */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-rose-900/20 to-rose-800/10 border-rose-800/30">
              <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/5 rounded-full -mr-10 -mt-10"></div>
              <div className="p-4 relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-rose-500/10 p-1.5 rounded-lg">
                    <TrendingDown className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="text-[10px] text-rose-400 font-bold uppercase tracking-wide">Gastos</div>
                </div>
                <div className="text-2xl font-black text-rose-400 mb-1">S/ {data.summary.totalGastos.toFixed(2)}</div>
                <div className="text-xs text-neutral-500 font-medium">Egresos del día</div>
              </div>
            </Card>

            {/* En Caja */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-800/30">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full -mr-10 -mt-10"></div>
              <div className="p-4 relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-blue-500/10 p-1.5 rounded-lg">
                    <Wallet className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wide">En Caja</div>
                </div>
                <div className="text-2xl font-black text-blue-400 mb-1">S/ {data.summary.neto.toFixed(2)}</div>
                <div className="text-xs text-neutral-500 font-medium">Efectivo neto</div>
              </div>
            </Card>

            {/* Por Cobrar */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-amber-900/20 to-amber-800/10 border-amber-800/30">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full -mr-10 -mt-10"></div>
              <div className="p-4 relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-amber-500/10 p-1.5 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wide">Por Cobrar</div>
                </div>
                <div className="text-2xl font-black text-amber-400 mb-1">S/ {data.summary.totalFiado.toFixed(2)}</div>
                <div className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {data.debtors.length} cliente{data.debtors.length !== 1 ? 's' : ''}
                </div>
              </div>
            </Card>
          </div>

          {/* 2. DESGLOSE POR PRODUCTO - Mejorado */}
          <div>
            <div className="flex items-center gap-2 mb-4 px-1">
              <ShoppingCart className="w-4 h-4 text-neutral-500" />
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Ventas por Producto</h3>
            </div>
            
            <div className="space-y-3">
              {Object.entries(data.byProduct).map(([size, val]) => {
                const cajasTerminadas = val.consumedCrates;
                const promedioReal = cajasTerminadas > 0 ? (val.kg / cajasTerminadas) : 0;
                
                return (
                  <Card key={size} className="bg-neutral-900/50 border-neutral-800/50 overflow-hidden">
                    <div className="p-4">
                      {/* Header del producto */}
                      <div className="flex justify-between items-start mb-4 pb-3 border-b border-neutral-800/50">
                        <div className="flex items-center gap-3">
                          <div className="bg-gradient-to-br from-purple-500 to-blue-500 p-2.5 rounded-xl">
                            <Package className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-black text-white text-lg">{size}</h4>
                            <p className="text-xs text-neutral-500">{val.kg.toFixed(2)} kg vendidos</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-emerald-400 font-black text-xl">S/ {val.soles.toFixed(2)}</div>
                        </div>
                      </div>
                      
                      {/* Info de cajas */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        {/* Cajas consumidas */}
                        <div className="bg-neutral-950/70 rounded-lg p-3 border border-neutral-800/30">
                          <div className="flex items-center gap-2 mb-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-neutral-500" />
                            <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wide">Bajadas</p>
                          </div>
                          {cajasTerminadas > 0 ? (
                            <>
                              <p className="text-2xl font-black text-white">{cajasTerminadas}</p>
                              <p className="text-xs text-neutral-500">cajas</p>
                            </>
                          ) : (
                            <p className="text-sm text-neutral-600 italic">Sin cajas</p>
                          )}
                        </div>

                        {/* Stock restante */}
                        <div className={`rounded-lg p-3 border ${
                          val.remainingCrates > 0 
                            ? 'bg-blue-900/20 border-blue-800/50' 
                            : 'bg-rose-900/20 border-rose-800/50'
                        }`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <Package className="w-3.5 h-3.5 text-neutral-500" />
                            <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wide">En Piso</p>
                          </div>
                          <p className={`text-2xl font-black ${
                            val.remainingCrates > 0 ? 'text-blue-400' : 'text-rose-400'
                          }`}>
                            {val.remainingCrates}
                          </p>
                          <p className="text-xs text-neutral-500">cajas</p>
                        </div>
                      </div>

                      {/* Promedio por caja */}
                      {cajasTerminadas > 0 && (
                        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg p-3 border border-purple-800/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-purple-400" />
                              <span className="text-xs text-neutral-400 font-semibold">Promedio por caja</span>
                            </div>
                            <span className="text-lg font-black text-purple-400">{promedioReal.toFixed(2)} kg</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* 3. LISTA DE DEUDORES - Mejorada */}
          {data.debtors.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4 px-1">
                <Users className="w-4 h-4 text-neutral-500" />
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Deudores del Día</h3>
                <span className="bg-rose-500/10 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-rose-500/30">
                  {data.debtors.length}
                </span>
              </div>
              
              <Card className="bg-neutral-900/50 border-neutral-800/50 overflow-hidden divide-y divide-neutral-800/30">
                {data.debtors.map((d) => (
                  <div key={d.id} className="p-4 hover:bg-neutral-800/30 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="bg-rose-500/10 p-1.5 rounded">
                            <Users className="w-3 h-3 text-rose-400" />
                          </div>
                          <p className="font-bold text-white text-base">{d.client}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-neutral-500 ml-7">
                          <span className="font-semibold text-neutral-400">{d.product}</span>
                          <span className="text-neutral-700">•</span>
                          <span className="font-mono">{new Date(d.time).toLocaleTimeString('es-PE', {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                      </div>
                      <div className="bg-rose-900/20 border border-rose-800/50 rounded-lg px-3 py-2 ml-3">
                        <p className="text-[10px] text-rose-400 uppercase font-bold mb-0.5 opacity-70">Debe</p>
                        <p className="text-rose-400 font-black text-lg">S/ {d.debt.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Detalles de la venta */}
                    <div className="bg-neutral-950/70 rounded-lg p-3 border border-neutral-800/30 ml-7">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-1.5 text-neutral-500 mb-1">
                            <Weight className="w-3 h-3" />
                            <span className="text-[10px] uppercase font-bold">Peso</span>
                          </div>
                          <p className="text-white font-bold">{d.weightKg.toFixed(2)} kg</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 text-neutral-500 mb-1">
                            <DollarSign className="w-3 h-3" />
                            <span className="text-[10px] uppercase font-bold">Precio/kg</span>
                          </div>
                          <p className="text-white font-bold">S/ {d.pricePerKg.toFixed(2)}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 text-neutral-500 mb-1">
                            <TrendingUp className="w-3 h-3" />
                            <span className="text-[10px] uppercase font-bold">Total</span>
                          </div>
                          <p className="text-emerald-400 font-bold">S/ {d.totalPrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 text-neutral-500 mb-1">
                            <Wallet className="w-3 h-3" />
                            <span className="text-[10px] uppercase font-bold">Pagó</span>
                          </div>
                          <p className="text-blue-400 font-bold">S/ {d.amountPaid.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}

        </div>
      )}

      <BottomNav />
    </div>
  );
}