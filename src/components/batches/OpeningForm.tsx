'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, PackageOpen, Save, Trash2, Edit2, Check, X, ArrowLeft, PlusCircle, Box } from 'lucide-react';
import { openDay, getTodayBatches, updateBatch, deleteBatch } from '@/actions/batches';

const SUGGESTED_SIZES = ['Pequeño', 'Mediano', 'Grande', 'Jumbo', 'Pescado', 'Calamar'];

type BatchData = { 
    id: string; 
    size: string; 
    price: number; 
    stockKg: number; 
    initialCrates: number; 
    remainingCrates: number; 
};

type NewItem = {
    id: string;
    size: string;
    price: string;
    crates: string;
};

export default function OpeningForm({ onSuccess }: { onSuccess: () => void }) {
  const [existingBatches, setExistingBatches] = useState<BatchData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [trigger, setTrigger] = useState(0);
  
  const [editPrice, setEditPrice] = useState('');
  const [editCrates, setEditCrates] = useState('');

  const [newItems, setNewItems] = useState<NewItem[]>([
    { id: '1', size: '', price: '', crates: '' }
  ]);
  
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
        try {
            const data = await getTodayBatches();
            if (isMounted) setExistingBatches(data as unknown as BatchData[]);
        } catch (err) { console.error(err); }
    };
    loadData();
    return () => { isMounted = false; };
  }, [trigger]); 

  const refreshBatches = () => setTrigger(t => t + 1);

  // --- LÓGICA DE EDICIÓN ---
  const startEdit = (batch: BatchData) => {
    setEditingId(batch.id);
    setEditPrice(batch.price.toString());
    setEditCrates(batch.initialCrates.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditPrice('');
    setEditCrates('');
  };

  const saveEdit = (id: string) => {
    startTransition(async () => {
        await updateBatch(id, parseFloat(editPrice), parseInt(editCrates));
        setEditingId(null);
        refreshBatches();
    });
  };

  const handleDelete = (id: string) => {
    if(!confirm("¿Seguro que quieres eliminar esta caja?")) return;
    startTransition(async () => {
        await deleteBatch(id);
        refreshBatches();
    });
  };

  // --- LÓGICA DE CREACIÓN ---
  const updateNewItem = (id: string, field: keyof NewItem, value: string) => {
    setNewItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addNewRow = () => {
    setNewItems(prev => [...prev, { id: Date.now().toString(), size: '', price: '', crates: '' }]);
  };

  const removeNewRow = (id: string) => {
    setNewItems(prev => prev.filter(item => item.id !== id));
  };

  const setSizeName = (id: string, name: string) => {
    updateNewItem(id, 'size', name);
  };

  const handleCreate = () => {
    const dataToSave = newItems
        .filter(item => item.size.trim() !== '' && parseFloat(item.price) > 0 && parseInt(item.crates) > 0)
        .map(item => ({
            size: item.size.trim(),
            price: parseFloat(item.price),
            crates: parseInt(item.crates)
        }));

    if (dataToSave.length === 0) {
        alert("⚠️ Ingresa al menos un producto válido.");
        return;
    }

    startTransition(async () => {
      await openDay(dataToSave);
      setNewItems([{ id: Date.now().toString(), size: '', price: '', crates: '' }]);
      refreshBatches();
    });
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-white p-4">
      {/* HEADER OSCURO */}
      <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4">
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
                setNewItems([{ id: '1', size: '', price: '', crates: '' }]);
                onSuccess();
            }}
            className="hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-full transition-colors"
        >
            <ArrowLeft size={24}/>
        </Button>
        <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Gestión de Inventario</h1>
            <p className="text-xs text-neutral-500 font-medium">Control de Cajas y Precios</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-8 pb-safe">
        
        {/* SECCIÓN 1: LOTES ACTIVOS */}
        {existingBatches.length > 0 && (
            <div>
                <h3 className="text-xs font-bold text-neutral-500 uppercase mb-3 pl-1 tracking-wider">Cajas en Piso (Hoy)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {existingBatches.map(batch => (
                        <Card key={batch.id} className="p-4 bg-neutral-900 border-neutral-800 shadow-sm transition-all hover:border-neutral-700">
                            {editingId === batch.id ? (
                                // MODO EDICIÓN
                                <div className="flex items-center gap-3 w-full">
                                    <div className="w-24 font-bold text-white text-sm truncate">{batch.size}</div>
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[10px] text-neutral-500 uppercase font-bold">Precio</label>
                                        <input 
                                            type="number" 
                                            value={editPrice}
                                            onChange={e => setEditPrice(e.target.value)}
                                            className="w-full bg-neutral-800 text-white rounded px-2 py-1 text-sm font-mono border border-neutral-700 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[10px] text-neutral-500 uppercase font-bold">Stock</label>
                                        <input 
                                            type="number" 
                                            value={editCrates}
                                            onChange={e => setEditCrates(e.target.value)}
                                            className="w-full bg-neutral-800 text-white rounded px-2 py-1 text-sm font-mono border border-neutral-700 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <Button size="icon" className="h-7 w-7 bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => saveEdit(batch.id)}><Check size={14} /></Button>
                                        <Button size="icon" className="h-7 w-7 bg-neutral-700 hover:bg-neutral-600 text-neutral-300" onClick={cancelEdit}><X size={14} /></Button>
                                    </div>
                                </div>
                            ) : (
                                // MODO LECTURA
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-neutral-800 p-2 rounded-lg">
                                            <Box size={20} className="text-blue-500" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-lg">{batch.size}</div>
                                            <div className="text-xs text-neutral-400 font-mono">
                                                S/ {batch.price.toFixed(2)}  •  Ini: {batch.initialCrates}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <div className={`text-xs font-bold px-2 py-1 rounded ${batch.remainingCrates > 0 ? 'bg-blue-900/30 text-blue-400 border border-blue-900' : 'bg-red-900/30 text-red-400 border border-red-900'}`}>
                                            Restan: {batch.remainingCrates}
                                        </div>
                                        <div className="flex flex-col gap-1 border-l border-neutral-800 pl-2 ml-2">
                                            <button className="text-neutral-500 hover:text-blue-400 transition-colors" onClick={() => startEdit(batch)}><Edit2 size={16} /></button>
                                            <button className="text-neutral-500 hover:text-rose-400 transition-colors" onClick={() => handleDelete(batch.id)}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </div>
        )}

        {/* SECCIÓN 2: AGREGAR NUEVOS */}
        <div>
            <h3 className="text-xs font-bold text-neutral-500 uppercase mb-3 pl-1 flex items-center gap-2 tracking-wider">
                <PackageOpen size={14}/> Nuevo Ingreso
            </h3>
            
            <div className="space-y-3">
                {newItems.map((item, index) => (
                    <Card key={item.id} className="p-4 border-neutral-800 bg-neutral-900 shadow-sm relative group">
                        <div className="flex gap-3 items-end">
                            {/* Input Nombre Producto */}
                            <div className="flex-[2] space-y-1">
                                <label className="text-[10px] uppercase text-neutral-500 font-bold">Producto</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej: Pescado"
                                    value={item.size}
                                    onChange={(e) => updateNewItem(item.id, 'size', e.target.value)}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white placeholder:text-neutral-700 outline-none focus:border-blue-500 transition-colors"
                                    list={`sizes-${item.id}`}
                                />
                                <datalist id={`sizes-${item.id}`}>
                                    {SUGGESTED_SIZES.map(s => <option key={s} value={s} />)}
                                </datalist>
                            </div>

                            {/* Input Precio */}
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] uppercase text-neutral-500 font-bold">Precio</label>
                                <input 
                                    type="number" 
                                    placeholder="0.00"
                                    value={item.price}
                                    onChange={(e) => updateNewItem(item.id, 'price', e.target.value)}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-2 text-white text-center font-mono placeholder:text-neutral-700 outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>

                            {/* Input Cajas */}
                            <div className="w-16 space-y-1">
                                <label className="text-[10px] uppercase text-neutral-500 font-bold">Cajas</label>
                                <input 
                                    type="number" 
                                    placeholder="0"
                                    value={item.crates}
                                    onChange={(e) => updateNewItem(item.id, 'crates', e.target.value)}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-2 text-white text-center font-mono placeholder:text-neutral-700 outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>

                            {/* Botón Borrar Fila */}
                            {newItems.length > 1 && (
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-10 w-10 text-rose-500 hover:bg-rose-900/20 hover:text-rose-400 rounded-lg"
                                    onClick={() => removeNewRow(item.id)}
                                >
                                    <Trash2 size={18} />
                                </Button>
                            )}
                        </div>
                        
                        {/* Botones rápidos */}
                        {item.size === '' && (
                            <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
                                {SUGGESTED_SIZES.map(s => (
                                    <button 
                                        key={s}
                                        onClick={() => setSizeName(item.id, s)}
                                        className="text-[10px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700 px-3 py-1.5 rounded-full whitespace-nowrap hover:bg-neutral-700 hover:text-white hover:border-neutral-600 transition-all"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}
                    </Card>
                ))}
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-3 mt-6 pb-8">
                <Button 
                    variant="outline"
                    className="flex-1 h-12 border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 hover:border-neutral-700"
                    onClick={addNewRow}
                >
                    <PlusCircle className="mr-2 h-4 w-4" /> Agregar Fila
                </Button>
                
                <Button 
                    className="flex-[2] h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                    onClick={handleCreate}
                    disabled={isPending}
                >
                    {isPending ? <Loader2 className="animate-spin" /> : <><Save className="mr-2" /> GUARDAR CAMBIOS</>}
                </Button>
            </div>
        </div>

      </div>
    </div>
  );
}