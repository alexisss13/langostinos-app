'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Delete, CheckCircle, RefreshCcw, ArrowLeft, Loader2, 
  Package, UserCheck, Trash2, BoxSelect, Pencil, 
  CreditCard, Banknote, TrendingDown, Ship 
} from 'lucide-react';
import { registerSale, updateSale, deleteSale, getRecentSales, markCrateFinished } from '@/actions/sales';
import { getTodayBatches } from '@/actions/batches';
import ExpensesManager from '@/components/expenses/ExpensesManager';
import OpeningForm from '@/components/batches/OpeningForm';

// Tipo actualizado con todas las propiedades requeridas
type BatchData = { 
    id: string; 
    size: string; 
    price: number; 
    stockKg: number; 
    initialCrates: number; 
    remainingCrates: number; // Campo obligatorio
};

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

export default function SalesCalculator() {
  const [isLoadingApp, setIsLoadingApp] = useState(true);
  const [currentView, setCurrentView] = useState<'loading' | 'opening' | 'sales' | 'expenses'>('loading');

  const [step, setStep] = useState<1 | 2>(1);
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BatchData | null>(null);
  
  const [isPending, startTransition] = useTransition();

  // Estados Calculadora
  const [inputMode, setInputMode] = useState<'weight' | 'money'>('weight');
  const [inputValue, setInputValue] = useState<string>('0');
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [isPendingPickup, setIsPendingPickup] = useState(false);
  const [paymentType, setPaymentType] = useState<'full' | 'zero' | 'partial'>('full');
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [recentSales, setRecentSales] = useState<SaleRecord[]>([]);

  // CARGA INICIAL
  const initApp = useCallback(async () => {
    try {
        const todayBatches = await getTodayBatches();
        
        if (todayBatches.length > 0) {
            setBatches(todayBatches);
            const sales = await getRecentSales();
            setRecentSales(sales as unknown as SaleRecord[]);
            setCurrentView('sales');
        } else {
            setCurrentView('opening');
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoadingApp(false);
    }
  }, []);

  useEffect(() => {
    initApp();
  }, [initApp]);

  const refreshData = async () => {
    const sales = await getRecentSales();
    setRecentSales(sales as unknown as SaleRecord[]);
    // Recargamos los lotes para actualizar el stock visual de cajas
    const updatedBatches = await getTodayBatches();
    if(updatedBatches.length > 0) setBatches(updatedBatches);
  };

  const weight = inputMode === 'weight' 
    ? parseFloat(inputValue) 
    : parseFloat(inputValue) / (finalPrice || 1);
    
  const total = inputMode === 'money' 
    ? parseFloat(inputValue) 
    : parseFloat(inputValue) * (finalPrice || 0);

  const currentPaid = paymentType === 'full' ? total : (paymentType === 'zero' ? 0 : parseFloat(partialAmount) || 0);
  const currentDebt = total - currentPaid;

  const handleSelectBatch = (batch: BatchData) => {
    setSelectedBatch(batch);
    setFinalPrice(batch.price);
    resetCalculator();
    setStep(2);
  };

  const handleEdit = (sale: SaleRecord) => {
    // CORRECCIÓN: El objeto fallback ahora tiene todas las propiedades de BatchData
    const originalBatch: BatchData = batches.find(b => b.size === sale.batch.size) || { 
        id: '0', 
        size: sale.batch.size, 
        price: sale.pricePerKg, 
        stockKg: 0, 
        initialCrates: 0,
        remainingCrates: 0 // <--- Agregado para cumplir con el tipo
    };
    
    setSelectedBatch(originalBatch);
    setFinalPrice(sale.pricePerKg);
    setInputValue(sale.weightKg.toString());
    setInputMode('weight');
    setIsPendingPickup(sale.status === 'EN_PUESTO');
    
    if (sale.isPaid) {
        setPaymentType('full');
        setPartialAmount('');
    } else if (sale.amountPaid === 0) {
        setPaymentType('zero');
        setPartialAmount('');
    } else {
        setPaymentType('partial');
        setPartialAmount(sale.amountPaid.toString());
    }

    setCustomerName(sale.customerName || '');
    setEditingSaleId(sale.id);
    setStep(2);
  };

  const resetCalculator = () => {
    setInputValue('0');
    setIsPendingPickup(false);
    setPaymentType('full');
    setPartialAmount('');
    setCustomerName('');
    setEditingSaleId(null);
  };

  const handleNumPad = (num: string) => {
    setInputValue(prev => {
      if (prev === '0' && num !== '.') return num;
      if (num === '.' && prev.includes('.')) return prev;
      if (prev.length > 6) return prev;
      return prev + num;
    });
  };

  const handleClear = () => setInputValue('0');

  const toggleMode = () => {
    if (inputMode === 'weight') {
      setInputValue((weight * finalPrice).toFixed(2));
      setInputMode('money');
    } else {
      setInputValue((total / finalPrice).toFixed(3));
      setInputMode('weight');
    }
  };

  const handleSave = () => {
    if (!selectedBatch || total <= 0) return;
    
    if (currentDebt > 0.1 && customerName.trim() === '') {
        alert("⚠️ Si hay deuda, escribe el nombre del cliente.");
        return;
    }

    startTransition(async () => {
      const finalStatus: 'EN_PUESTO' | 'ENTREGADO' = isPendingPickup ? 'EN_PUESTO' : 'ENTREGADO';

      const data = {
        id: editingSaleId || undefined,
        size: selectedBatch.size,
        weight: weight,
        pricePerKg: finalPrice,
        total: total,
        isCrate: false,
        status: finalStatus,
        amountPaid: currentPaid, 
        customerName: customerName
      };

      let result;
      if (editingSaleId) {
        result = await updateSale(data);
      } else {
        result = await registerSale(data);
      }

      if (result.success) {
        setStep(1);
        resetCalculator();
        refreshData();
      } else {
        alert("❌ Error al guardar");
      }
    });
  };

  const handleDelete = (id: string) => {
    if(!confirm("¿Borrar venta?")) return;
    startTransition(async () => {
        await deleteSale(id);
        refreshData();
    });
  };

  const handleFinishCrate = (e: React.MouseEvent, size: string) => {
    e.stopPropagation(); 
    if(!confirm(`¿Se terminó caja de ${size}?`)) return;
    startTransition(async () => {
        const res = await markCrateFinished(size);
        if(res.success) {
            alert(`✅ Caja de ${size} vacía.`);
            refreshData(); 
        }
    });
  };

  const formatPeruTime = (dateString: Date) => {
    return new Date(dateString).toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  if (isLoadingApp) {
    return <div className="h-screen flex items-center justify-center bg-zinc-50"><Loader2 className="animate-spin text-blue-600 w-10 h-10"/></div>;
  }

  if (currentView === 'opening') {
    return <OpeningForm onSuccess={initApp} />;
  }

  if (currentView === 'expenses') {
    return <ExpensesManager onBack={() => setCurrentView('sales')} />;
  }

  // VISTA PRINCIPAL (DASHBOARD)
  if (step === 1) {
    return (
      <div className="flex flex-col h-screen bg-zinc-50 p-4">
        <div className="flex justify-between items-center mb-4 gap-2">
            <h1 className="text-xl font-bold text-zinc-800 flex-1">Ventas ⚓</h1>
            
            <Button 
                variant="outline" 
                size="sm" 
                className="bg-blue-50 text-blue-700 border-blue-200"
                onClick={() => setCurrentView('opening')} 
            >
                <Ship className="mr-1 h-4 w-4" /> Ingreso
            </Button>

            <Button 
                variant="outline" 
                size="sm" 
                className="bg-red-50 text-red-600 border-red-200"
                onClick={() => setCurrentView('expenses')}
            >
                <TrendingDown className="mr-1 h-4 w-4" /> Gastos
            </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          {batches.map((batch) => (
            <div key={batch.id} className="relative group">
                <Button onClick={() => handleSelectBatch(batch)} className="w-full h-32 text-xl flex flex-col items-center justify-center space-y-2 border-2 border-zinc-200 hover:border-blue-500 hover:bg-blue-50 text-black shadow-sm rounded-xl" variant="ghost">
                    <span className="font-bold text-2xl">{batch.size}</span>
                    <span className="text-sm opacity-80">S/ {batch.price.toFixed(2)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-normal ${batch.remainingCrates > 0 ? 'bg-zinc-200 text-zinc-600' : 'bg-red-100 text-red-600'}`}>
                        Quedan: {batch.remainingCrates} Cajas
                    </span>
                </Button>
                <Button size="sm" variant="destructive" className="absolute -top-2 -right-2 h-8 w-8 rounded-full shadow-md p-0" onClick={(e) => handleFinishCrate(e, batch.size)}>
                    <BoxSelect size={14} />
                </Button>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-auto pb-4">
            <h3 className="text-sm font-bold text-zinc-500 mb-2 uppercase tracking-wider">Últimos Movimientos</h3>
            <div className="space-y-2">
                {recentSales.map((sale) => (
                    <div key={sale.id} className={`p-3 rounded-lg border flex justify-between items-center shadow-sm ${sale.isPaid ? 'bg-white border-zinc-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex-1">
                            <div className="font-bold text-zinc-800 flex items-center gap-2">
                                {sale.batch.size} 
                                <span className="text-xs font-normal text-zinc-400">({formatPeruTime(sale.createdAt)})</span>
                            </div>
                            <div className="text-sm text-zinc-600">
                                {Number(sale.weightKg).toFixed(2)}kg x S/{Number(sale.pricePerKg)} = <span className="font-bold">S/{Number(sale.totalPrice).toFixed(2)}</span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mt-1">
                                {sale.isPaid ? (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                        <Banknote size={12} /> Pagado
                                    </span>
                                ) : (
                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                        <CreditCard size={12} /> 
                                        {sale.amountPaid > 0 ? `A cta: S/${sale.amountPaid}` : 'Fiado'} 
                                        {sale.customerName ? ` (${sale.customerName})` : ''}
                                    </span>
                                )}
                                
                                {sale.status === 'EN_PUESTO' ? (
                                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                        <Package size={12} /> En Puesto
                                    </span>
                                ) : (
                                    <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                        <CheckCircle size={12} /> Entregado
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleEdit(sale)}><Pencil size={18} /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(sale.id)}><Trash2 size={18} /></Button>
                        </div>
                    </div>
                ))}
                {recentSales.length === 0 && <div className="text-center text-zinc-400 py-4 text-sm">No hay ventas registradas aún.</div>}
            </div>
        </div>
      </div>
    );
  }

  // VISTA CALCULADORA
  return (
    <div className={`p-4 flex flex-col h-screen max-h-screen ${editingSaleId ? 'bg-orange-50' : 'bg-zinc-50'}`}>
      <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-lg border border-zinc-200 shadow-sm">
        <Button variant="ghost" onClick={() => setStep(1)} className="gap-2" disabled={isPending}>
            <ArrowLeft size={20} /> Cancelar
        </Button>
        <div className="text-right">
          <h2 className="font-bold text-xl text-zinc-800">{selectedBatch?.size}</h2>
          <p className="text-sm text-zinc-500">{editingSaleId ? <span className="text-orange-600 font-bold">EDITANDO</span> : `Base: S/ ${selectedBatch?.price.toFixed(2)}`}</p>
        </div>
      </div>

      <Card className={`p-4 mb-2 bg-white text-center shadow-md border-2 transition-colors ${isPendingPickup ? 'border-yellow-400' : 'border-blue-500'}`}>
        <div className="grid grid-cols-2 gap-4 text-left border-b border-zinc-100 pb-2 mb-2">
          <div>
            <span className="text-xs text-zinc-400 block uppercase font-bold">Peso (Kg)</span>
            <span className={`text-3xl font-mono ${inputMode === 'weight' ? 'text-blue-600 font-bold' : 'text-zinc-300'}`}>
              {inputMode === 'weight' ? inputValue : weight.toFixed(3)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-zinc-400 block uppercase font-bold">Importe (S/)</span>
            <span className={`text-3xl font-mono ${inputMode === 'money' ? 'text-green-600 font-bold' : 'text-zinc-300'}`}>
              {inputMode === 'money' ? inputValue : total.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
            <Button onClick={toggleMode} variant="outline" className="flex-1 text-xs" disabled={isPending}>
                <RefreshCcw className="w-3 h-3 mr-1" /> {inputMode === 'weight' ? 'Modo: PESO' : 'Modo: SOLES'}
            </Button>
            <Button onClick={() => setIsPendingPickup(!isPendingPickup)} className={`flex-1 text-xs border ${isPendingPickup ? 'bg-yellow-100 border-yellow-500 text-yellow-900' : 'bg-white text-zinc-500'}`} variant="ghost">
                {isPendingPickup ? <><Package className="w-4 h-4 mr-1"/> En Puesto</> : <><UserCheck className="w-4 h-4 mr-1"/> Se lo lleva</>}
            </Button>
        </div>
      </Card>

      <Card className="p-3 mb-2 bg-white border border-zinc-200 shadow-sm">
        <div className="flex gap-1 mb-2">
            <Button onClick={() => { setPaymentType('full'); setPartialAmount(''); }} className={`flex-1 text-xs ${paymentType === 'full' ? 'bg-green-100 text-green-800 border-green-500 border' : 'bg-zinc-50 text-zinc-500'}`} variant="ghost">Todo</Button>
            <Button onClick={() => { setPaymentType('partial'); }} className={`flex-1 text-xs ${paymentType === 'partial' ? 'bg-blue-100 text-blue-800 border-blue-500 border' : 'bg-zinc-50 text-zinc-500'}`} variant="ghost">A cuenta</Button>
            <Button onClick={() => { setPaymentType('zero'); setPartialAmount(''); }} className={`flex-1 text-xs ${paymentType === 'zero' ? 'bg-red-100 text-red-800 border-red-500 border' : 'bg-zinc-50 text-zinc-500'}`} variant="ghost">Fiado</Button>
        </div>
        {paymentType === 'partial' && (
            <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-600">Monto: S/</span>
                <input type="number" value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)} className="border rounded p-1 w-24 text-right font-bold" placeholder="0.00" />
            </div>
        )}
        {paymentType !== 'full' && (
            <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-red-600 bg-red-50 p-1 rounded">
                    <span>Deuda:</span><span>S/ {currentDebt.toFixed(2)}</span>
                </div>
                <input type="text" placeholder="Nombre cliente (Obligatorio)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm outline-blue-500 bg-zinc-50" />
            </div>
        )}
      </Card>

      <div className="flex items-center justify-between mb-2 px-2">
        <span className="text-sm font-bold text-zinc-600">Precio/Kg:</span>
        <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" className="h-10 w-10" onClick={() => setFinalPrice(p => p - 0.5)} disabled={isPending}>-</Button>
            <span className="text-xl font-bold w-16 text-center text-zinc-800">{finalPrice.toFixed(2)}</span>
            <Button size="icon" variant="outline" className="h-10 w-10" onClick={() => setFinalPrice(p => p + 0.5)} disabled={isPending}>+</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 flex-1 mb-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <Button key={n} variant="outline" className="text-3xl h-full font-bold text-zinc-700 active:bg-zinc-200" onClick={() => handleNumPad(n.toString())} disabled={isPending}>{n}</Button>
        ))}
        <Button variant="outline" className="text-3xl h-full text-zinc-700" onClick={() => handleNumPad('.')} disabled={isPending}>.</Button>
        <Button variant="outline" className="text-3xl h-full font-bold text-zinc-700" onClick={() => handleNumPad('0')} disabled={isPending}>0</Button>
        <Button variant="destructive" className="h-full bg-red-100 text-red-600 hover:bg-red-200 border-none" onClick={handleClear} disabled={isPending}><Delete /></Button>
      </div>

      <Button onClick={handleSave} disabled={isPending || total === 0} className={`w-full h-16 text-xl shadow-lg transition-all ${isPending ? 'bg-zinc-400' : editingSaleId ? 'bg-orange-500 hover:bg-orange-600 text-white' : isPendingPickup ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
        {isPending ? <Loader2 className="animate-spin" /> : (editingSaleId ? <>✏️ ACTUALIZAR</> : (isPendingPickup ? <>📦 EN PUESTO - S/ {total.toFixed(2)}</> : <>✅ COBRAR - S/ {total.toFixed(2)}</>))}
      </Button>
    </div>
  );
}