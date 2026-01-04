'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, Users, Wallet, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { getDailyStats } from '@/actions/reports';

// DEFINICIÓN DE TIPOS (Adiós 'any')
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
    time: string | Date; // Prisma a veces devuelve string al serializar
  }>;
  byProduct: Record<string, { kg: number; soles: number }>;
};

export default function ReportsPage() {
  // Fecha por defecto: HOY (formato YYYY-MM-DD para el input date)
  const todayStr = new Date().toLocaleDateString('en-CA'); 
  const [date, setDate] = useState(todayStr);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. DEFINIMOS LA FUNCIÓN PRIMERO (Con useCallback para eficiencia)
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
        const stats = await getDailyStats(date);
        if (stats) {
            setData(stats as unknown as ReportData);
        }
    } catch (error) {
        console.error("Error cargando reporte:", error);
    } finally {
        setLoading(false);
    }
  }, [date]); // Se recrea solo si cambia la fecha

  // 2. LUEGO EL EFECTO QUE LA LLAMA
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
        
        {/* Selector de Fecha */}
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
            
            {/* 1. RESUMEN FINANCIERO (CARDS) */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="p-3 bg-white border-l-4 border-l-green-500 shadow-sm">
                    <div className="text-xs text-zinc-500 font-bold uppercase flex items-center gap-1">
                        <TrendingUp size={14}/> Venta Total
                    </div>
                    <div className="text-2xl font-bold text-zinc-800">S/ {data.summary.totalVendido.toFixed(2)}</div>
                    <div className="text-xs text-zinc-400">{data.summary.totalKilos.toFixed(2)} Kg vendidos</div>
                </Card>

                <Card className="p-3 bg-white border-l-4 border-l-red-500 shadow-sm">
                    <div className="text-xs text-zinc-500 font-bold uppercase flex items-center gap-1">
                        <TrendingDown size={14}/> Gastos
                    </div>
                    <div className="text-2xl font-bold text-red-600">- S/ {data.summary.totalGastos.toFixed(2)}</div>
                    <div className="text-xs text-zinc-400">Salidas del día</div>
                </Card>

                <Card className="p-3 bg-white border-l-4 border-l-blue-500 shadow-sm">
                    <div className="text-xs text-zinc-500 font-bold uppercase flex items-center gap-1">
                        <Wallet size={14}/> En Caja (Neto)
                    </div>
                    {/* Caja Real = Lo cobrado - Gastos */}
                    <div className="text-2xl font-bold text-blue-600">S/ {data.summary.neto.toFixed(2)}</div>
                    <div className="text-xs text-zinc-400">Efectivo real en mano</div>
                </Card>

                <Card className="p-3 bg-white border-l-4 border-l-yellow-500 shadow-sm">
                    <div className="text-xs text-zinc-500 font-bold uppercase flex items-center gap-1">
                        <AlertCircle size={14}/> Por Cobrar
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">S/ {data.summary.totalFiado.toFixed(2)}</div>
                    <div className="text-xs text-zinc-400">{data.debtors.length} clientes deben</div>
                </Card>
            </div>

            {/* 2. LISTA DE MOROSOS */}
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

            {/* 3. DESGLOSE POR PRODUCTO */}
            <div>
                <h3 className="text-sm font-bold text-zinc-500 mb-2 uppercase">Ventas por Producto</h3>
                <div className="space-y-2">
                    {Object.entries(data.byProduct).map(([size, val]) => (
                        <div key={size} className="flex justify-between items-center p-3 bg-white rounded-lg border shadow-sm">
                            <span className="font-bold text-zinc-700">{size}</span>
                            <div className="text-right">
                                <div className="font-bold text-zinc-900">S/ {val.soles.toFixed(2)}</div>
                                <div className="text-xs text-zinc-500">{val.kg.toFixed(2)} Kg</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
      )}
    </div>
  );
}