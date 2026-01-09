'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Calendar, TrendingUp, TrendingDown, Users, 
  Wallet, AlertCircle, Package, Store, History, PieChart 
} from 'lucide-react';
import Link from 'next/link';
import { getDailyStats } from '@/actions/reports';

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
                <h1 className="text-xl font-bold text-white tracking-tight">Reportes</h1>
                <p className="text-xs text-purple-400 font-medium">Análisis Diario</p>
            </div>
        </div>
        
        <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800">
            <Calendar size={16} className="text-purple-500" />
            <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent outline-none text-sm font-bold text-white p-0 w-28"
            />
        </div>
      </div>

      {loading || !data ? (
        <div className="flex flex-col items-center justify-center flex-1 text-neutral-500 space-y-2">
            {loading ? (
                <>
                    <div className="animate-spin text-purple-500"><PieChart size={32}/></div>
                    <span className="text-xs animate-pulse">Calculando métricas...</span>
                </>
            ) : (
                "No hay datos para esta fecha."
            )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4 space-y-6 pb-24">
            
            {/* 1. RESUMEN FINANCIERO */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 bg-neutral-900 border-l-4 border-l-emerald-500 border-y border-r border-neutral-800 shadow-sm">
                    <div className="text-[10px] text-neutral-400 font-bold uppercase flex items-center gap-1 mb-1"><TrendingUp size={12}/> Venta Total</div>
                    <div className="text-xl font-black text-white">S/ {data.summary.totalVendido.toFixed(2)}</div>
                    <div className="text-[10px] text-neutral-500 font-medium">{data.summary.totalKilos.toFixed(2)} Kg vendidos</div>
                </Card>

                <Card className="p-4 bg-neutral-900 border-l-4 border-l-rose-500 border-y border-r border-neutral-800 shadow-sm">
                    <div className="text-[10px] text-neutral-400 font-bold uppercase flex items-center gap-1 mb-1"><TrendingDown size={12}/> Gastos</div>
                    <div className="text-xl font-black text-rose-500">- S/ {data.summary.totalGastos.toFixed(2)}</div>
                    <div className="text-[10px] text-neutral-500 font-medium">Salidas del día</div>
                </Card>

                <Card className="p-4 bg-neutral-900 border-l-4 border-l-blue-500 border-y border-r border-neutral-800 shadow-sm">
                    <div className="text-[10px] text-neutral-400 font-bold uppercase flex items-center gap-1 mb-1"><Wallet size={12}/> En Caja (Neto)</div>
                    <div className="text-xl font-black text-blue-400">S/ {data.summary.neto.toFixed(2)}</div>
                    <div className="text-[10px] text-neutral-500 font-medium">Efectivo real</div>
                </Card>

                <Card className="p-4 bg-neutral-900 border-l-4 border-l-amber-500 border-y border-r border-neutral-800 shadow-sm">
                    <div className="text-[10px] text-neutral-400 font-bold uppercase flex items-center gap-1 mb-1"><AlertCircle size={12}/> Por Cobrar</div>
                    <div className="text-xl font-black text-amber-500">S/ {data.summary.totalFiado.toFixed(2)}</div>
                    <div className="text-[10px] text-neutral-500 font-medium">{data.debtors.length} clientes deben</div>
                </Card>
            </div>

            {/* 2. DESGLOSE POR PRODUCTO */}
            <div>
                <h3 className="text-xs font-bold text-neutral-500 mb-3 uppercase tracking-wider px-1">Ventas por Producto</h3>
                <div className="space-y-3">
                    {Object.entries(data.byProduct).map(([size, val]) => {
                        const cajasTerminadas = val.consumedCrates;
                        const promedioReal = cajasTerminadas > 0 ? (val.kg / cajasTerminadas) : 0;
                        
                        return (
                            <div key={size} className="p-4 bg-neutral-900 rounded-xl border border-neutral-800 shadow-sm">
                                <div className="flex justify-between items-center border-b border-neutral-800 pb-3 mb-3">
                                    <span className="font-bold text-lg text-white">{size}</span>
                                    <div className="text-right">
                                        <div className="font-bold text-emerald-400 text-lg">S/ {val.soles.toFixed(2)}</div>
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-start text-sm">
                                    <div className="text-neutral-400">
                                        <div className="font-medium text-neutral-200 text-base mb-1">{val.kg.toFixed(2)} Kg <span className="text-xs text-neutral-500">vendidos</span></div>
                                        
                                        <div className="text-xs space-y-1.5 mt-2">
                                            {cajasTerminadas > 0 ? (
                                                <>
                                                    <div className="flex items-center gap-1.5 text-neutral-400">
                                                        <Package size={12} className="text-neutral-600"/> Bajaron: <span className="font-bold text-neutral-300">{cajasTerminadas} cajas</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-neutral-400">
                                                        <TrendingUp size={12} className="text-neutral-600"/> Promedio: <span className="font-bold text-blue-400 bg-blue-900/20 px-1.5 rounded">{promedioReal.toFixed(2)} kg/caja</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="italic text-neutral-600 text-xs">Sin cajas terminadas aún</div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Stock Restante */}
                                    <div className={`text-right px-2.5 py-1.5 rounded-lg text-xs font-bold border ${val.remainingCrates > 0 ? 'bg-blue-900/20 text-blue-400 border-blue-900/50' : 'bg-rose-900/20 text-rose-400 border-rose-900/50'}`}>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[9px] uppercase opacity-70 mb-0.5">En Piso</span>
                                            <span className="text-lg leading-none">{val.remainingCrates}</span>
                                            <span className="text-[9px] opacity-70">Cajas</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 3. LISTA DE MOROSOS */}
            {data.debtors.length > 0 && (
                <div>
                    <h3 className="text-xs font-bold text-neutral-500 mb-3 uppercase flex items-center gap-2 tracking-wider px-1">
                        <Users size={14} /> Deudores del Día
                    </h3>
                    <div className="bg-neutral-900 rounded-xl border border-neutral-800 divide-y divide-neutral-800">
                        {data.debtors.map((d) => (
                            <div key={d.id} className="p-3 flex justify-between items-center hover:bg-neutral-800/50 transition-colors">
                                <div>
                                    <p className="font-bold text-neutral-200 text-sm">{d.client}</p>
                                    <p className="text-[10px] text-neutral-500 mt-0.5">{d.product} • {new Date(d.time).toLocaleTimeString('es-PE', {hour:'2-digit', minute:'2-digit'})}</p>
                                </div>
                                <div className="text-rose-400 font-bold bg-rose-900/20 px-2 py-1 rounded text-xs border border-rose-900/30">
                                    Debe: S/ {d.debt.toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
      )}

      {/* BOTTOM NAVIGATION (ACTIVE: REPORTES) */}
      <div className="bg-neutral-900 border-t border-neutral-800 fixed bottom-0 w-full h-16 grid grid-cols-4 items-center z-50 pb-safe">
            <Link href="/" className="flex flex-col items-center justify-center text-neutral-500 hover:text-blue-400 h-full transition-colors border-t-2 border-transparent hover:border-blue-500/50">
                <Store size={22} strokeWidth={2} />
                <span className="text-[10px] font-medium mt-1">Ventas</span>
            </Link>
            {/* Nota: Gastos e Historial requieren estado interno, por eso mejor volver a Ventas primero */}
            <Link href="/" className="flex flex-col items-center justify-center text-neutral-500 hover:text-rose-400 h-full transition-colors border-t-2 border-transparent hover:border-rose-500/50">
                <TrendingDown size={22} strokeWidth={2} />
                <span className="text-[10px] font-medium mt-1">Gastos</span>
            </Link>
            <Link href="/" className="flex flex-col items-center justify-center text-neutral-500 hover:text-blue-400 h-full transition-colors border-t-2 border-transparent hover:border-blue-500/50">
                <History size={22} strokeWidth={2} />
                <span className="text-[10px] font-medium mt-1">Historial</span>
            </Link>
            <button className="flex flex-col items-center justify-center text-purple-500 h-full border-t-2 border-purple-500">
                <PieChart size={22} strokeWidth={2.5} />
                <span className="text-[10px] font-bold mt-1">Reportes</span>
            </button>
        </div>
    </div>
  );
}