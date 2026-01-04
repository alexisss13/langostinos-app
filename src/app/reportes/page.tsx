'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, Users, Wallet, AlertCircle, Package } from 'lucide-react';
import Link from 'next/link';
import { getDailyStats } from '@/actions/reports';

// Tipos
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
      consumedCrates: number; // Dato nuevo
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
        if (stats) {
            setData(stats as unknown as ReportData);
        }
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen bg-zinc-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
            <Link href="/">
                <Button variant="ghost" size="icon"><ArrowLeft /></Button>
            </Link>
            <h1 className="text-xl font-bold text-zinc-800">Reportes 📊</h1>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-md border shadow-sm">
            <Calendar size={16} className="text-zinc-400 ml-2" />
            <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent outline-none text-sm font-bold text-zinc-700 p-1"
            />
        </div>
      </div>

      {loading || !data ? (
        <div className="text-center py-20 text-zinc-400">
            {loading ? <span className="animate-pulse">Calculando números...</span> : "No hay datos para esta fecha."}
        </div>
      ) : (
        <div className="space-y-6">
            
            {/* 1. RESUMEN FINANCIERO */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="p-3 bg-white border-l-4 border-l-green-500 shadow-sm">
                    <div className="text-xs text-zinc-500 font-bold uppercase flex items-center gap-1"><TrendingUp size={14}/> Venta Total</div>
                    <div className="text-2xl font-bold text-zinc-800">S/ {data.summary.totalVendido.toFixed(2)}</div>
                    <div className="text-xs text-zinc-400">{data.summary.totalKilos.toFixed(2)} Kg vendidos</div>
                </Card>

                <Card className="p-3 bg-white border-l-4 border-l-red-500 shadow-sm">
                    <div className="text-xs text-zinc-500 font-bold uppercase flex items-center gap-1"><TrendingDown size={14}/> Gastos</div>
                    <div className="text-2xl font-bold text-red-600">- S/ {data.summary.totalGastos.toFixed(2)}</div>
                    <div className="text-xs text-zinc-400">Salidas del día</div>
                </Card>

                <Card className="p-3 bg-white border-l-4 border-l-blue-500 shadow-sm">
                    <div className="text-xs text-zinc-500 font-bold uppercase flex items-center gap-1"><Wallet size={14}/> En Caja (Neto)</div>
                    <div className="text-2xl font-bold text-blue-600">S/ {data.summary.neto.toFixed(2)}</div>
                    <div className="text-xs text-zinc-400">Efectivo real en mano</div>
                </Card>

                <Card className="p-3 bg-white border-l-4 border-l-yellow-500 shadow-sm">
                    <div className="text-xs text-zinc-500 font-bold uppercase flex items-center gap-1"><AlertCircle size={14}/> Por Cobrar</div>
                    <div className="text-2xl font-bold text-yellow-600">S/ {data.summary.totalFiado.toFixed(2)}</div>
                    <div className="text-xs text-zinc-400">{data.debtors.length} clientes deben</div>
                </Card>
            </div>

            {/* 2. DESGLOSE POR PRODUCTO (CON CÁLCULO REAL) */}
            <div>
                <h3 className="text-sm font-bold text-zinc-500 mb-2 uppercase">Ventas por Producto</h3>
                <div className="space-y-2">
                    {Object.entries(data.byProduct).map(([size, val]) => {
                        // LA MATEMÁTICA DEL PUEBLO:
                        const cajasTerminadas = val.consumedCrates;
                        const promedioReal = cajasTerminadas > 0 ? (val.kg / cajasTerminadas) : 0;
                        
                        return (
                            <div key={size} className="p-3 bg-white rounded-lg border shadow-sm">
                                <div className="flex justify-between items-center border-b border-zinc-100 pb-2 mb-2">
                                    <span className="font-bold text-lg text-zinc-800">{size}</span>
                                    <div className="text-right">
                                        <div className="font-bold text-zinc-900 text-lg">S/ {val.soles.toFixed(2)}</div>
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-start text-sm">
                                    <div className="text-zinc-600">
                                        <div className="font-bold text-zinc-800 text-base">{val.kg.toFixed(2)} Kg <span className="font-normal text-xs text-zinc-500">vendidos</span></div>
                                        
                                        <div className="text-xs text-zinc-500 mt-2 space-y-1">
                                            {cajasTerminadas > 0 ? (
                                                <>
                                                    <div className="flex items-center gap-1">
                                                        📦 Se bajaron: <span className="font-bold text-zinc-700">{cajasTerminadas} cajas</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        ⚖️ Promedio real: <span className="font-bold text-blue-600 bg-blue-50 px-1 rounded">{promedioReal.toFixed(2)} kg/caja</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="italic text-zinc-400">Sin cajas terminadas aún</div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Stock Restante */}
                                    <div className={`text-right px-2 py-1 rounded text-xs font-bold ${val.remainingCrates > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] uppercase opacity-70">En Piso</span>
                                            <span className="text-lg">{val.remainingCrates}</span>
                                            <span className="text-[10px]">Cajas</span>
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
                    <h3 className="text-sm font-bold text-zinc-500 mb-2 uppercase flex items-center gap-2">
                        <Users size={16} /> Deudores del Día
                    </h3>
                    <div className="bg-white rounded-lg border shadow-sm divide-y">
                        {data.debtors.map((d) => (
                            <div key={d.id} className="p-3 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-zinc-800">{d.client}</p>
                                    <p className="text-xs text-zinc-400">{d.product} - {new Date(d.time).toLocaleTimeString('es-PE', {hour:'2-digit', minute:'2-digit'})}</p>
                                </div>
                                <div className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded text-sm">
                                    Debe: S/ {d.debt.toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
      )}
    </div>
  );
}