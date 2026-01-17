'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Delete, CheckCircle, RefreshCcw, ArrowLeft, Loader2, 
  Package, UserCheck, Trash2, BoxSelect, Pencil, 
  CreditCard, Banknote, Ship, Scale, DollarSign, X, ShoppingBag
} from 'lucide-react';
import { registerSale, updateSale, deleteSale, getRecentSales, markCrateFinished } from '@/actions/sales';
import { getTodayBatches } from '@/actions/batches';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/layout/BottomNav';

type BatchData = { 
    id: string; size: string; price: number; stockKg: number; initialCrates: number; remainingCrates: number; 
};

type SaleRecord = {
    id: string; weightKg: number; pricePerKg: number; totalPrice: number; amountPaid: number;
    status: 'ENTREGADO' | 'EN_PUESTO'; isPaid: boolean; customerName: string | null; createdAt: Date; batch: { size: string };
};

export default function SalesCalculator() {
  const router = useRouter();
  const [isLoadingApp, setIsLoadingApp] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BatchData | null>(null);
  const [isPending, startTransition] = useTransition();

  const [inputMode, setInputMode] = useState<'weight' | 'money'>('weight');
  const [inputValue, setInputValue] = useState<string>('0');
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [isPendingPickup, setIsPendingPickup] = useState(false);
  const [paymentType, setPaymentType] = useState<'full' | 'zero' | 'partial'>('full');
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [recentSales, setRecentSales] = useState<SaleRecord[]>([]);

  const initApp = useCallback(async () => {
    try {
        const todayBatches = await getTodayBatches();
        if (todayBatches.length > 0) {
            setBatches(todayBatches);
            const sales = await getRecentSales();
            setRecentSales(sales as unknown as SaleRecord[]);
        }
    } catch (e) { console.error(e); } finally { setIsLoadingApp(false); }
  }, []);

  useEffect(() => { initApp(); }, [initApp]);

  const refreshData = async () => {
    const sales = await getRecentSales();
    setRecentSales(sales as unknown as SaleRecord[]);
    const updatedBatches = await getTodayBatches();
    if(updatedBatches.length > 0) setBatches(updatedBatches);
  };

  const weight = inputMode === 'weight' ? parseFloat(inputValue) : parseFloat(inputValue) / (finalPrice || 1);
  const total = inputMode === 'money' ? parseFloat(inputValue) : parseFloat(inputValue) * (finalPrice || 0);
  const currentPaid = paymentType === 'full' ? total : (paymentType === 'zero' ? 0 : parseFloat(partialAmount) || 0);
  const currentDebt = total - currentPaid;

  const handleSelectBatch = (batch: BatchData) => {
    setSelectedBatch(batch); setFinalPrice(batch.price); resetCalculator(); setStep(2);
  };

  const handleEdit = (sale: SaleRecord) => {
    const originalBatch = batches.find(b => b.size === sale.batch.size) || { 
        id: '0', size: sale.batch.size, price: sale.pricePerKg, stockKg: 0, initialCrates: 0, remainingCrates: 0 
    };
    setSelectedBatch(originalBatch); setFinalPrice(sale.pricePerKg); setInputValue(sale.weightKg.toString());
    setInputMode('weight'); setIsPendingPickup(sale.status === 'EN_PUESTO');
    if (sale.isPaid) { setPaymentType('full'); setPartialAmount(''); } 
    else if (sale.amountPaid === 0) { setPaymentType('zero'); setPartialAmount(''); } 
    else { setPaymentType('partial'); setPartialAmount(sale.amountPaid.toString()); }
    setCustomerName(sale.customerName || ''); setEditingSaleId(sale.id); setStep(2);
  };

  const resetCalculator = () => {
    setInputValue('0'); setIsPendingPickup(false); setPaymentType('full'); setPartialAmount(''); setCustomerName(''); setEditingSaleId(null);
  };

  const handleNumPad = (num: string) => {
    setInputValue(prev => {
      if (num === '.' && prev.includes('.')) return prev;
      if ((prev === '0' || prev === '0.00' || prev === '0.000') && num !== '.') return num;
      if (prev.length > 9) return prev;
      return prev + num;
    });
  };

  const handleClear = () => setInputValue('0');

  const toggleMode = () => {
    if (inputMode === 'weight') { setInputValue((weight * finalPrice).toFixed(2)); setInputMode('money'); } 
    else { setInputValue((total / finalPrice).toFixed(3)); setInputMode('weight'); }
  };

  const handleSave = () => {
    if (!selectedBatch || total <= 0) return;
    if (currentDebt > 0.1 && customerName.trim() === '') { alert("⚠️ Nombre obligatorio si hay deuda."); return; }

    startTransition(async () => {
      const status: 'EN_PUESTO' | 'ENTREGADO' = isPendingPickup ? 'EN_PUESTO' : 'ENTREGADO';
      const data = {
        id: editingSaleId || undefined, size: selectedBatch.size, weight, pricePerKg: finalPrice, total, 
        isCrate: false, status, amountPaid: currentPaid, customerName
      };
      const result = editingSaleId ? await updateSale(data) : await registerSale(data);
      if (result.success) { setStep(1); resetCalculator(); refreshData(); } else { alert("❌ Error al guardar"); }
    });
  };

  const handleDelete = (id: string) => {
    if(!confirm("¿Borrar venta?")) return;
    startTransition(async () => { await deleteSale(id); refreshData(); });
  };

  const handleFinishCrate = (e: React.MouseEvent, size: string) => {
    e.stopPropagation(); 
    if(!confirm(`¿Se terminó caja de ${size}?`)) return;
    startTransition(async () => {
        const res = await markCrateFinished(size);
        if(res.success) refreshData(); else alert(res.message);
    });
  };

  const formatPeruTime = (dateString: Date) => new Date(dateString).toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: true });

  if (isLoadingApp) return <div className="h-screen flex items-center justify-center bg-neutral-950"><Loader2 className="animate-spin text-blue-500 w-12 h-12"/></div>;

  // --- VISTA DASHBOARD (STEP 1) ---
  if (step === 1) {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-b from-neutral-950 via-neutral-950 to-neutral-900 text-white">
        {/* HEADER */}
        <div className="bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/50 px-4 py-3 sticky top-0 z-20 flex justify-between items-center">
            <div>
                <h1 className="text-xl font-black text-white tracking-tight">MuelleApp ⚓</h1>
                <p className="text-xs text-blue-500 font-medium">Panel de Ventas</p>
            </div>
            
            <Link href="/apertura">
                <Button size="sm" className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 font-bold backdrop-blur-md">
                    <Ship className="mr-1.5 h-4 w-4" /> Ingreso
                </Button>
            </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
            
            {/* GRID DE PRODUCTOS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {batches.map((batch) => (
                <div key={batch.id} className="relative group">
                    <Button 
                        onClick={() => handleSelectBatch(batch)} 
                        className="w-full h-auto flex flex-col items-start justify-between p-4 bg-neutral-900/50 border border-neutral-800/50 hover:border-blue-500/50 hover:bg-neutral-900 text-left shadow-sm rounded-2xl transition-all duration-200 aspect-[4/3] relative overflow-hidden" 
                        variant="ghost"
                    >
                        {/* Decoración de fondo */}
                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full -mr-8 -mt-8 pointer-events-none"></div>
                        
                        <div className="w-full relative z-10">
                            <span className="block font-black text-xl text-white mb-1 truncate w-full">{batch.size}</span>
                            <span className="block text-xs font-medium text-neutral-400">Precio Base</span>
                            <span className="block text-lg font-bold text-blue-400">S/ {batch.price.toFixed(2)}</span>
                        </div>
                        
                        <div className={`mt-2 text-xs font-bold px-2.5 py-1 rounded-lg w-full text-center relative z-10 border ${
                            batch.remainingCrates > 0 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                            {batch.remainingCrates > 0 ? `${batch.remainingCrates} Cajas` : 'Agotado'}
                        </div>
                    </Button>
                    
                    {batch.remainingCrates > 0 && (
                        <button 
                            className="absolute -top-2 -right-2 h-9 w-9 bg-neutral-900 border border-neutral-700 text-rose-400 rounded-full shadow-lg flex items-center justify-center hover:bg-rose-950 hover:text-rose-300 hover:scale-110 transition-all z-20" 
                            onClick={(e) => handleFinishCrate(e, batch.size)}
                        >
                            <BoxSelect size={16} strokeWidth={2.5} />
                        </button>
                    )}
                </div>
              ))}
              
              {batches.length === 0 && (
                  <div className="col-span-2 py-12 flex flex-col items-center justify-center text-neutral-500 border-2 border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20">
                      <div className="bg-neutral-800/50 p-4 rounded-full mb-3">
                        <Ship size={32} className="opacity-50"/>
                      </div>
                      <p className="text-sm font-medium">No hay ingreso registrado hoy.</p>
                      <Link href="/apertura" className="mt-3 text-blue-400 text-xs font-bold bg-blue-500/10 px-4 py-2 rounded-full hover:bg-blue-500/20 transition-colors">
                        Hacer Ingreso Ahora
                      </Link>
                  </div>
              )}
            </div>

            {/* LISTA DE ÚLTIMAS VENTAS */}
            <div>
                <div className="flex items-center gap-2 mb-3 px-1">
                    <ShoppingBag className="w-4 h-4 text-neutral-500" />
                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Últimos Movimientos</h3>
                </div>
                
                <div className="space-y-3">
                    {recentSales.map((sale) => (
                        <div key={sale.id} className="bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800/50 shadow-sm flex justify-between items-center backdrop-blur-sm">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="font-bold text-white text-base">{sale.batch.size}</span>
                                    <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-md font-mono border border-neutral-700/50">
                                        {formatPeruTime(sale.createdAt)}
                                    </span>
                                </div>
                                <div className="text-sm text-neutral-400 flex items-center gap-2">
                                    <span className="font-medium text-neutral-300">{Number(sale.weightKg).toFixed(2)} kg</span>
                                    <span className="text-neutral-700">•</span>
                                    <span className="font-bold text-emerald-400">S/ {Number(sale.totalPrice).toFixed(2)}</span>
                                </div>
                                <div className="flex gap-2 mt-2.5">
                                    {sale.isPaid 
                                        ? <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1"><Banknote size={10}/> Pagado</span> 
                                        : <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 flex items-center gap-1"><CreditCard size={10}/> Deuda: S/ {(sale.totalPrice - sale.amountPaid).toFixed(2)}</span>
                                    }
                                    {sale.status === 'EN_PUESTO' && (
                                        <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1"><Package size={10}/> En Puesto</span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 pl-3 ml-2 border-l border-neutral-800">
                                <button className="w-8 h-8 flex items-center justify-center text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors" onClick={() => handleEdit(sale)}>
                                    <Pencil size={16} />
                                </button>
                                <button className="w-8 h-8 flex items-center justify-center text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors" onClick={() => handleDelete(sale.id)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {recentSales.length === 0 && <div className="text-center text-neutral-600 py-8 text-sm italic">Tu historial de hoy está limpio.</div>}
                </div>
            </div>
        </div>

        <BottomNav />
      </div>
    );
  }

  // --- VISTA CALCULADORA (STEP 2) ---
  return (
    <div className="flex flex-col h-screen max-h-screen bg-neutral-950 text-white">
      {/* Header Calculadora */}
      <div className={`px-4 py-3 flex justify-between items-center ${editingSaleId ? 'bg-orange-500/10 border-orange-500/20' : 'bg-neutral-950 border-neutral-800'} border-b sticky top-0 z-10`}>
        <Button variant="ghost" onClick={() => setStep(1)} className="hover:bg-white/5 px-0 -ml-2 text-inherit gap-2" disabled={isPending}>
            <ArrowLeft size={20} /> <span className="text-sm font-bold">Volver</span>
        </Button>
        <div className="text-right">
            <h2 className={`font-black text-xl leading-none ${editingSaleId ? 'text-orange-400' : 'text-white'}`}>{selectedBatch?.size}</h2>
            <p className="text-[10px] uppercase font-bold text-neutral-500 mt-1">Precio Base: <span className="text-blue-400">S/ {selectedBatch?.price.toFixed(2)}</span></p>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
        
        {/* DISPLAY PRINCIPAL */}
        <div className="bg-neutral-900/50 rounded-3xl p-6 border border-neutral-800 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-xl group-hover:bg-blue-500/10 transition-all"></div>
            
            <div className="absolute top-5 left-6 text-[10px] font-black tracking-widest text-neutral-500 uppercase flex items-center gap-1.5">
                {inputMode === 'weight' ? <Scale size={12}/> : <DollarSign size={12}/>}
                {inputMode === 'weight' ? 'Ingresando Peso' : 'Ingresando Dinero'}
            </div>

            <div className="flex flex-col gap-4 mt-6">
                <div className="flex justify-between items-end relative z-10">
                    <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">Peso (Kg)</span>
                    <span className={`text-5xl font-mono tracking-tighter ${inputMode === 'weight' ? 'text-blue-400 font-bold drop-shadow-[0_0_10px_rgba(96,165,250,0.3)]' : 'text-neutral-600'}`}>
                        {inputMode === 'weight' ? inputValue : weight.toFixed(3)}
                    </span>
                </div>
                
                <div className="w-full h-px bg-gradient-to-r from-transparent via-neutral-800 to-transparent"></div>
                
                <div className="flex justify-between items-end relative z-10">
                    <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">Total (S/)</span>
                    <span className={`text-6xl font-mono tracking-tighter ${inputMode === 'money' ? 'text-emerald-400 font-bold drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]' : 'text-neutral-500'}`}>
                        {inputMode === 'money' ? inputValue : total.toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
        
        {/* BOTONES DE CONTROL */}
        <div className="grid grid-cols-2 gap-3">
            <Button onClick={toggleMode} variant="outline" className="h-14 bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white hover:border-neutral-700 rounded-xl transition-all">
                <RefreshCcw className="w-4 h-4 mr-2" /> 
                <div className="flex flex-col items-start text-xs">
                    <span className="opacity-50 font-medium">Cambiar a</span>
                    <span className="font-bold text-sm">{inputMode === 'weight' ? 'Soles' : 'Kilos'}</span>
                </div>
            </Button>
            
            <Button onClick={() => setIsPendingPickup(!isPendingPickup)} className={`h-14 border-0 rounded-xl transition-all ${isPendingPickup ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30' : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800'}`}>
                {isPendingPickup ? <Package className="w-5 h-5 mr-2"/> : <UserCheck className="w-5 h-5 mr-2"/>}
                <div className="flex flex-col items-start text-xs">
                    <span className="opacity-50 font-medium">Estado</span>
                    <span className="font-bold text-sm">{isPendingPickup ? 'EN PUESTO' : 'ENTREGADO'}</span>
                </div>
            </Button>
        </div>

        {/* TARJETA DE PAGO */}
        <Card className="p-4 bg-neutral-900 border-neutral-800 rounded-2xl space-y-4">
            <div className="flex gap-2 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
                <button onClick={() => { setPaymentType('full'); setPartialAmount(''); }} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${paymentType === 'full' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : 'text-neutral-500 hover:text-white'}`}>Pagado</button>
                <button onClick={() => { setPaymentType('partial'); }} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${paymentType === 'partial' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-neutral-500 hover:text-white'}`}>A Cuenta</button>
                <button onClick={() => { setPaymentType('zero'); setPartialAmount(''); }} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${paymentType === 'zero' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50' : 'text-neutral-500 hover:text-white'}`}>Fiado</button>
            </div>
            
            {(paymentType !== 'full') && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    {paymentType === 'partial' && (
                        <div className="flex items-center gap-3 bg-neutral-950 p-3 rounded-xl border border-neutral-800 focus-within:border-blue-500/50 transition-colors">
                            <span className="text-xs font-bold text-neutral-500 uppercase">Paga:</span>
                            <div className="flex-1 flex items-center text-white">
                                <span className="text-neutral-500 mr-1">S/</span>
                                <input type="number" value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)} className="bg-transparent font-bold w-full outline-none text-lg" placeholder="0.00" autoFocus />
                            </div>
                        </div>
                    )}
                    
                    <input type="text" placeholder="Nombre del Cliente (Obligatorio)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-blue-500/50 transition-colors" />
                    
                    <div className="flex justify-between items-center text-xs px-1">
                        <span className="text-neutral-500 font-medium">Deuda Pendiente:</span>
                        <span className="text-rose-400 font-bold bg-rose-900/20 px-2 py-0.5 rounded border border-rose-900/30">S/ {currentDebt.toFixed(2)}</span>
                    </div>
                </div>
            )}
        </Card>

        {/* AJUSTE FINO */}
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-900/50 rounded-xl border border-neutral-800/50">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Precio / Kg</span>
            <div className="flex items-center gap-4">
                <button className="w-8 h-8 rounded-full bg-neutral-800 text-white flex items-center justify-center active:scale-90 hover:bg-neutral-700 transition-all shadow-sm" onClick={() => setFinalPrice(p => p - 0.5)}>-</button>
                <span className="text-lg font-mono font-bold text-white min-w-[3ch] text-center">{finalPrice.toFixed(2)}</span>
                <button className="w-8 h-8 rounded-full bg-neutral-800 text-white flex items-center justify-center active:scale-90 hover:bg-neutral-700 transition-all shadow-sm" onClick={() => setFinalPrice(p => p + 0.5)}>+</button>
            </div>
        </div>
      </div>

      {/* KEYPAD */}
      <div className="bg-neutral-950 p-4 pt-2 pb-6 grid grid-cols-[3fr_1fr] gap-3 h-[40vh] border-t border-neutral-800 shrink-0">
        <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button key={n} className="bg-neutral-900 text-white text-2xl font-medium rounded-2xl hover:bg-neutral-800 active:bg-neutral-700 transition-all shadow-sm active:scale-95" onClick={() => handleNumPad(n.toString())} disabled={isPending}>{n}</button>
            ))}
            <button className="bg-neutral-900 text-white text-2xl font-medium rounded-2xl hover:bg-neutral-800 active:scale-95 transition-all" onClick={() => handleNumPad('.')} disabled={isPending}>.</button>
            <button className="bg-neutral-900 text-white text-2xl font-medium rounded-2xl hover:bg-neutral-800 active:scale-95 transition-all" onClick={() => handleNumPad('0')} disabled={isPending}>0</button>
            <button className="bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500/20 active:scale-95 transition-all flex items-center justify-center border border-rose-500/20" onClick={handleClear} disabled={isPending}><Delete /></button>
        </div>
        
        <button 
            onClick={handleSave} 
            disabled={isPending || total === 0} 
            className={`rounded-2xl font-black text-xl flex flex-col items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                editingSaleId ? 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-900/20' : 
                isPendingPickup ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-900/20' : 
                'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-900/20'
            }`}
        >
            {isPending ? <Loader2 className="animate-spin w-8 h-8" /> : (editingSaleId ? <><Pencil/> EDITAR</> : (isPendingPickup ? <><Package className="w-8 h-8"/> GUARDAR</> : <><CheckCircle className="w-8 h-8"/> COBRAR</>))}
        </button>
      </div>
    </div>
  );
}