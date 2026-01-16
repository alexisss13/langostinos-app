'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, PackageOpen, Save, Trash2, Edit2, Check, X, ArrowLeft, PlusCircle, Box } from 'lucide-react';
import { openDay, getTodayBatches, updateBatch, deleteBatch } from '@/actions/batches';
import BottomNav from '@/components/layout/BottomNav'; // IMPORTAR NAV

const SUGGESTED_SIZES = ['Pequeño', 'Mediano', 'Grande', 'Jumbo', 'Pescado', 'Calamar'];

type BatchData = { id: string; size: string; price: number; stockKg: number; initialCrates: number; remainingCrates: number; };
type NewItem = { id: string; size: string; price: string; crates: string; };

export default function OpeningForm({ onSuccess }: { onSuccess: () => void }) {
  const [existingBatches, setExistingBatches] = useState<BatchData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);
  const [editPrice, setEditPrice] = useState('');
  const [editCrates, setEditCrates] = useState('');
  const [newItems, setNewItems] = useState<NewItem[]>([{ id: '1', size: '', price: '', crates: '' }]);
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

  const startEdit = (batch: BatchData) => { setEditingId(batch.id); setEditPrice(batch.price.toString()); setEditCrates(batch.initialCrates.toString()); };
  const cancelEdit = () => { setEditingId(null); setEditPrice(''); setEditCrates(''); };
  const saveEdit = (id: string) => { startTransition(async () => { await updateBatch(id, parseFloat(editPrice), parseInt(editCrates)); setEditingId(null); refreshBatches(); }); };
  const handleDelete = (id: string) => { if(!confirm("¿Borrar?")) return; startTransition(async () => { await deleteBatch(id); refreshBatches(); }); };
  
  const updateNewItem = (id: string, field: keyof NewItem, value: string) => { setNewItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item)); };
  const addNewRow = () => { setNewItems(prev => [...prev, { id: Date.now().toString(), size: '', price: '', crates: '' }]); };
  const removeNewRow = (id: string) => { setNewItems(prev => prev.filter(item => item.id !== id)); };
  const setSizeName = (id: string, name: string) => { updateNewItem(id, 'size', name); };
  
  const handleCreate = () => {
    const dataToSave = newItems.filter(item => item.size.trim() !== '' && parseFloat(item.price) > 0 && parseInt(item.crates) > 0)
        .map(item => ({ size: item.size.trim(), price: parseFloat(item.price), crates: parseInt(item.crates) }));

    if (dataToSave.length === 0) { alert("⚠️ Datos inválidos."); return; }

    startTransition(async () => {
      await openDay(dataToSave);
      setNewItems([{ id: Date.now().toString(), size: '', price: '', crates: '' }]);
      refreshBatches();
    });
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-white overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => { setNewItems([{ id: '1', size: '', price: '', crates: '' }]); onSuccess(); }} className="hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-full">
            <ArrowLeft size={24}/>
        </Button>
        <div><h1 className="text-lg font-bold text-white leading-tight">Inventario</h1><p className="text-xs text-neutral-500">Gestión de Cajas</p></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 scrollbar-hide">
        {/* LOTES ACTIVOS */}
        {existingBatches.length > 0 && (
            <div className="mb-6">
                <h3 className="text-xs font-bold text-neutral-500 uppercase mb-3 pl-1 tracking-wider">En Piso (Hoy)</h3>
                <div className="grid grid-cols-1 gap-3">
                    {existingBatches.map(batch => (
                        <Card key={batch.id} className="p-3 bg-neutral-900 border-neutral-800">
                            {editingId === batch.id ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-16 font-bold text-white text-sm truncate">{batch.size}</div>
                                    <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="w-full bg-neutral-950 text-white rounded px-2 py-1 text-sm border border-neutral-700" placeholder="Precio"/>
                                    <input type="number" value={editCrates} onChange={e => setEditCrates(e.target.value)} className="w-full bg-neutral-950 text-white rounded px-2 py-1 text-sm border border-neutral-700" placeholder="Stock"/>
                                    <Button size="icon" className="h-8 w-8 bg-emerald-600" onClick={() => saveEdit(batch.id)}><Check size={14}/></Button>
                                    <Button size="icon" className="h-8 w-8 bg-neutral-700" onClick={cancelEdit}><X size={14}/></Button>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-neutral-800 p-2 rounded-lg"><Box size={18} className="text-blue-500" /></div>
                                        <div><div className="font-bold text-white text-base">{batch.size}</div><div className="text-xs text-neutral-400">S/ {batch.price.toFixed(2)} • Ini: {batch.initialCrates}</div></div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${batch.remainingCrates > 0 ? 'bg-blue-900/30 text-blue-400' : 'bg-red-900/30 text-red-400'}`}>Restan: {batch.remainingCrates}</span>
                                        <button className="text-neutral-500 hover:text-blue-400 p-1" onClick={() => startEdit(batch)}><Edit2 size={16}/></button>
                                        <button className="text-neutral-500 hover:text-rose-400 p-1" onClick={() => handleDelete(batch.id)}><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </div>
        )}

        {/* NUEVO INGRESO */}
        <div>
            <h3 className="text-xs font-bold text-neutral-500 uppercase mb-3 pl-1 flex items-center gap-2 tracking-wider"><PackageOpen size={14}/> Nuevo Ingreso</h3>
            <div className="space-y-3">
                {newItems.map((item, index) => (
                    <Card key={item.id} className="p-3 border-neutral-800 bg-neutral-900">
                        <div className="flex gap-2 items-end">
                            <div className="flex-[2] space-y-1 min-w-0">
                                <label className="text-[9px] uppercase text-neutral-500 font-bold">Producto</label>
                                <input type="text" placeholder="Ej: Pescado" value={item.size} onChange={(e) => updateNewItem(item.id, 'size', e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-2 text-sm text-white focus:border-blue-500 outline-none" list={`sizes-${item.id}`}/>
                                <datalist id={`sizes-${item.id}`}>{SUGGESTED_SIZES.map(s => <option key={s} value={s} />)}</datalist>
                            </div>
                            <div className="flex-1 space-y-1 min-w-0">
                                <label className="text-[9px] uppercase text-neutral-500 font-bold">Precio</label>
                                <input type="number" placeholder="0.00" value={item.price} onChange={(e) => updateNewItem(item.id, 'price', e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-1 py-2 text-sm text-white text-center focus:border-blue-500 outline-none"/>
                            </div>
                            <div className="w-12 space-y-1 min-w-0">
                                <label className="text-[9px] uppercase text-neutral-500 font-bold">Cajas</label>
                                <input type="number" placeholder="0" value={item.crates} onChange={(e) => updateNewItem(item.id, 'crates', e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-1 py-2 text-sm text-white text-center focus:border-blue-500 outline-none"/>
                            </div>
                            {newItems.length > 1 && (
                                <button className="h-9 w-8 flex items-center justify-center text-rose-500 hover:bg-rose-900/20 rounded-lg" onClick={() => removeNewRow(item.id)}><Trash2 size={16}/></button>
                            )}
                        </div>
                        {item.size === '' && (
                            <div className="flex gap-2 mt-2 overflow-x-auto pb-2 scrollbar-hide">
                                {SUGGESTED_SIZES.map(s => (
                                    <button key={s} onClick={() => setSizeName(item.id, s)} className="text-[9px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-1 rounded-full whitespace-nowrap hover:text-white">{s}</button>
                                ))}
                            </div>
                        )}
                    </Card>
                ))}
            </div>
            <div className="flex gap-3 mt-4">
                <Button variant="outline" className="flex-1 h-10 border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white" onClick={addNewRow}><PlusCircle className="mr-2 h-4 w-4"/> Agregar</Button>
                <Button className="flex-[2] h-10 bg-blue-600 hover:bg-blue-500 text-white font-bold" onClick={handleCreate} disabled={isPending}>{isPending ? <Loader2 className="animate-spin"/> : "GUARDAR"}</Button>
            </div>
        </div>
      </div>

      <BottomNav /> {/* AQUI ESTÁ LA MAGIA */}
    </div>
  );
}