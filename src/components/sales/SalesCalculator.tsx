'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Delete, CheckCircle, RefreshCcw, ArrowLeft, Loader2, 
  Package, UserCheck, Trash2, BoxSelect, Pencil, 
  CreditCard, Banknote, Ship
} from 'lucide-react';
import { registerSale, updateSale, deleteSale, getRecentSales, markCrateFinished } from '@/actions/sales';
import { getTodayBatches } from '@/actions/batches';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/layout/BottomNav'; // IMPORTAMOS EL COMPONENTE

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
        // Nota: Ya no redirigimos forzosamente a apertura si no hay lotes, 
        // para permitir ver historial o reportes.
        // Pero mostraremos un aviso visual si no hay stock.
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

  const formatPeruTime = (d: Date) => new Date(d).toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: true });

  if (isLoadingApp) return <div className="h-screen flex items-center justify-center bg-neutral-950"><Loader2 className="animate-spin text-blue-500 w-12 h-12"/></div>;

  // --- VISTA DASHBOARD (VENTAS) ---
  if (step === 1) {
    return (
      <div className="flex flex-col h-screen bg-neutral-950 text-white">
        <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-3 sticky top-0 z-10 flex justify-between items-center shadow-lg">
            <div><h1 className="text-xl font-black text-white tracking-tight">MuelleApp ⚓</h1><p className="text-xs text-neutral-400 font-medium">Panel de Control</p></div>
            <Link href="/apertura">
                <Button size="sm" className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 font-bold">
                    <Ship className="mr-1.5 h-4 w-4" /> Ingreso
                </Button>
            </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {batches.map((batch) => (
                <div key={batch.id} className="relative group">
                    <Button onClick={() => handleSelectBatch(batch)} className="w-full h-auto flex flex-col items-start justify-between p-4 bg-neutral-900 border border-neutral-800 hover:border-blue-500 hover:bg-neutral-800 text-left shadow-lg rounded-2xl transition-all duration-200 aspect-[4/3]" variant="ghost">
                        <div className="w-full"><span className="block font-black text-xl text-white mb-1 truncate w-full">{batch.size}</span><span className="block text-sm font-semibold text-neutral-400">S/ {batch.price.toFixed(2)} <span className="text-xs font-normal opacity-60">/kg</span></span></div>
                        <div className={`mt-2 text-xs font-bold px-2 py-1 rounded-md w-full text-center ${batch.remainingCrates > 0 ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-900' : 'bg-red-900/30 text-red-400 border border-red-900'}`}>{batch.remainingCrates > 0 ? `${batch.remainingCrates} Cajas` : 'Agotado'}</div>
                    </Button>
                    {batch.remainingCrates > 0 && (
                        <button className="absolute -top-2 -right-2 h-8 w-8 bg-neutral-800 border border-neutral-700 text-red-400 rounded-full shadow-md flex items-center justify-center hover:bg-red-900/50 hover:text-red-300 z-20" onClick={(e) => handleFinishCrate(e, batch.size)}><BoxSelect size={14} strokeWidth={2.5} /></button>
                    )}
                </div>
              ))}
              {batches.length === 0 && (
                  <div className="col-span-2 py-10 flex flex-col items-center justify-center text-neutral-500 border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/50">
                      <Ship size={40} className="mb-2 opacity-50"/>
                      <p className="text-sm font-medium">No hay ingreso registrado hoy.</p>
                      <Link href="/apertura" className="mt-2 text-blue-400 text-xs font-bold underline">Hacer Ingreso</Link>
                  </div>
              )}
            </div>

            <div>
                <h3 className="text-xs font-bold text-neutral-500 mb-3 uppercase tracking-wider px-1">Últimos Movimientos</h3>
                <div className="space-y-3">
                    {recentSales.map((sale) => (
                        <div key={sale.id} className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 shadow-sm flex justify-between items-center">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1"><span className="font-bold text-neutral-200">{sale.batch.size}</span><span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded">{formatPeruTime(sale.createdAt)}</span></div>
                                <div className="text-sm text-neutral-400"><span className="font-medium text-neutral-300">{Number(sale.weightKg).toFixed(2)} kg</span><span className="text-neutral-600 mx-2">|</span><span className="font-bold text-white">S/ {Number(sale.totalPrice).toFixed(2)}</span></div>
                                <div className="flex gap-2 mt-2">
                                    {sale.isPaid ? <span className="text-[10px] text-emerald-400 font-bold bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-900/50 flex items-center gap-1"><Banknote size={10}/> Pagado</span> : <span className="text-[10px] text-rose-400 font-bold bg-rose-900/20 px-2 py-0.5 rounded border border-rose-900/50 flex items-center gap-1"><CreditCard size={10}/> Deuda: S/ {(sale.totalPrice - sale.amountPaid).toFixed(2)}</span>}
                                    {sale.status === 'EN_PUESTO' && <span className="text-[10px] text-amber-400 font-bold bg-amber-900/20 px-2 py-0.5 rounded border border-amber-900/50 flex items-center gap-1"><Package size={10}/> En Puesto</span>}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 pl-2 border-l border-neutral-800">
                                <button className="text-blue-400 hover:text-blue-300 p-1" onClick={() => handleEdit(sale)}><Pencil size={18} /></button>
                                <button className="text-rose-400 hover:text-rose-300 p-1" onClick={() => handleDelete(sale.id)}><Trash2 size={18} /></button>
                            </div>
                        </div>
                    ))}
                    {recentSales.length === 0 && <div className="text-center text-neutral-600 py-8 text-sm italic">Tu historial de hoy está limpio.</div>}
                </div>
            </div>
        </div>

        {/* USAMOS EL COMPONENTE REUTILIZABLE */}
        <BottomNav />
      </div>
    );
  }

  // --- VISTA CALCULADORA (STEP 2) ---
  return (
    <div className={`flex flex-col h-screen max-h-screen bg-neutral-950 text-white`}>
      <div className={`px-4 py-3 flex justify-between items-center ${editingSaleId ? 'bg-orange-900/20 text-orange-200' : 'bg-neutral-900 border-b border-neutral-800'}`}>
        <Button variant="ghost" onClick={() => setStep(1)} className="hover:bg-white/5 px-0 -ml-2 text-inherit gap-1" disabled={isPending}><ArrowLeft size={20} /> <span className="text-sm font-bold">Volver</span></Button>
        <div className="text-right"><h2 className={`font-black text-xl ${editingSaleId ? 'text-orange-400' : 'text-blue-400'}`}>{selectedBatch?.size}</h2><p className="text-xs opacity-60">Base: S/ {selectedBatch?.price.toFixed(2)}</p></div>
      </div>
      <div className="flex-1 p-4 flex flex-col gap-4">
        {/* ... (Resto de la calculadora igual, no cambia) ... */}
        <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-4 left-4 text-[10px] font-bold tracking-widest text-neutral-500 uppercase">{inputMode === 'weight' ? 'Ingresando Peso' : 'Ingresando Dinero'}</div>
            <div className="flex flex-col gap-2 mt-4">
                <div className="flex justify-between items-end"><span className="text-neutral-500 text-sm font-bold mb-1">Peso (Kg)</span><span className={`text-4xl font-mono tracking-tight ${inputMode === 'weight' ? 'text-cyan-400 font-bold' : 'text-neutral-600'}`}>{inputMode === 'weight' ? inputValue : weight.toFixed(3)}</span></div>
                <div className="w-full h-px bg-neutral-800 my-2"></div>
                <div className="flex justify-between items-end"><span className="text-neutral-500 text-sm font-bold mb-1">Total (S/)</span><span className={`text-5xl font-mono tracking-tight ${inputMode === 'money' ? 'text-emerald-400 font-bold' : 'text-neutral-600'}`}>{inputMode === 'money' ? inputValue : total.toFixed(2)}</span></div>
            </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
            <Button onClick={toggleMode} variant="outline" className="h-12 bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:text-white border-0"><RefreshCcw className="w-4 h-4 mr-2" /> {inputMode === 'weight' ? 'A Soles' : 'A Kilos'}</Button>
            <Button onClick={() => setIsPendingPickup(!isPendingPickup)} className={`h-12 border-0 ${isPendingPickup ? 'bg-amber-500 hover:bg-amber-600 text-black font-bold' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}>{isPendingPickup ? <><Package className="w-4 h-4 mr-2"/> EN PUESTO</> : <><UserCheck className="w-4 h-4 mr-2"/> ENTREGADO</>}</Button>
        </div>

        <Card className="p-3 bg-neutral-900 border-neutral-800">
            <div className="flex gap-2 mb-3">
                <button onClick={() => { setPaymentType('full'); setPartialAmount(''); }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${paymentType === 'full' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : 'bg-neutral-800 text-neutral-400'}`}>Pagado</button>
                <button onClick={() => { setPaymentType('partial'); }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${paymentType === 'partial' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' : 'bg-neutral-800 text-neutral-400'}`}>A Cuenta</button>
                <button onClick={() => { setPaymentType('zero'); setPartialAmount(''); }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${paymentType === 'zero' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50' : 'bg-neutral-800 text-neutral-400'}`}>Fiado</button>
            </div>
            {(paymentType !== 'full') && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    {paymentType === 'partial' && <div className="flex items-center gap-2 bg-neutral-800 p-2 rounded-lg border border-neutral-700"><span className="text-xs font-bold text-neutral-400">Paga: S/</span><input type="number" value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)} className="bg-transparent text-white text-right font-bold w-full outline-none" placeholder="0.00" autoFocus /></div>}
                    <input type="text" placeholder="Nombre del Cliente (Obligatorio)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-3 text-sm text-white placeholder:text-neutral-500 outline-none focus:border-blue-500 transition-colors" />
                    <div className="text-right text-xs font-bold text-rose-400">Deuda Restante: S/ {currentDebt.toFixed(2)}</div>
                </div>
            )}
        </Card>

        <div className="flex items-center justify-between px-2 py-1 bg-neutral-800/50 rounded-lg border border-neutral-800">
            <span className="text-xs font-bold text-neutral-500 uppercase">Precio / Kg</span>
            <div className="flex items-center gap-4">
                <button className="w-8 h-8 rounded-full bg-neutral-700 text-white flex items-center justify-center active:scale-95 hover:bg-neutral-600" onClick={() => setFinalPrice(p => p - 0.5)}>-</button>
                <span className="text-lg font-mono font-bold text-white">{finalPrice.toFixed(2)}</span>
                <button className="w-8 h-8 rounded-full bg-neutral-700 text-white flex items-center justify-center active:scale-95 hover:bg-neutral-600" onClick={() => setFinalPrice(p => p + 0.5)}>+</button>
            </div>
        </div>
      </div>

      <div className="bg-neutral-900 p-4 pt-2 pb-6 grid grid-cols-[3fr_1fr] gap-3 h-[38vh] border-t border-neutral-800">
        <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <button key={n} className="bg-neutral-800 text-white text-2xl font-bold rounded-xl hover:bg-neutral-700 active:bg-neutral-600 transition-colors shadow-sm" onClick={() => handleNumPad(n.toString())} disabled={isPending}>{n}</button>)}
            <button className="bg-neutral-800 text-white text-2xl font-bold rounded-xl hover:bg-neutral-700" onClick={() => handleNumPad('.')} disabled={isPending}>.</button>
            <button className="bg-neutral-800 text-white text-2xl font-bold rounded-xl hover:bg-neutral-700" onClick={() => handleNumPad('0')} disabled={isPending}>0</button>
            <button className="bg-rose-900/20 text-rose-500 rounded-xl hover:bg-rose-900/40 flex items-center justify-center border border-rose-900/30" onClick={handleClear} disabled={isPending}><Delete /></button>
        </div>
        <button onClick={handleSave} disabled={isPending || total === 0} className={`rounded-2xl font-bold text-xl flex flex-col items-center justify-center gap-2 shadow-lg transition-all ${editingSaleId ? 'bg-orange-600 text-white hover:bg-orange-500' : isPendingPickup ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95'}`}>{isPending ? <Loader2 className="animate-spin" /> : (editingSaleId ? <><Pencil/> EDITAR</> : (isPendingPickup ? <><Package/> GUARDAR</> : <><CheckCircle size={32}/> COBRAR</>))}</button>
      </div>
    </div>
  );
}