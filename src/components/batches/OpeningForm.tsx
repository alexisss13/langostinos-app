'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Loader2, PackageOpen, Trash2, Edit2, Check, X, ArrowLeft, 
  PlusCircle, Box, Package, DollarSign, Layers, AlertCircle 
} from 'lucide-react';
import { openDay, getTodayBatches, updateBatch, deleteBatch } from '@/actions/batches';
import BottomNav from '@/components/layout/BottomNav';

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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
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
  
  const handleDelete = async (id: string) => { 
    startTransition(async () => { 
      await deleteBatch(id); 
      setDeleteConfirm(null);
      refreshBatches(); 
    }); 
  };
  
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
    const dataToSave = newItems.filter(item => 
      item.size.trim() !== '' && 
      parseFloat(item.price) > 0 && 
      parseInt(item.crates) > 0
    ).map(item => ({ 
      size: item.size.trim(), 
      price: parseFloat(item.price), 
      crates: parseInt(item.crates) 
    }));

    if (dataToSave.length === 0) { 
      alert("⚠️ Completa al menos un producto válido."); 
      return; 
    }

    startTransition(async () => {
      await openDay(dataToSave);
      setNewItems([{ id: Date.now().toString(), size: '', price: '', crates: '' }]);
      refreshBatches();
    });
  };

  const totalCrates = existingBatches.reduce((sum, b) => sum + b.remainingCrates, 0);
  const totalInitial = existingBatches.reduce((sum, b) => sum + b.initialCrates, 0);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-neutral-950 via-neutral-950 to-neutral-900 text-white">
      {/* Header mejorado */}
      <div className="bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/50 sticky top-0 z-20">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { 
                setNewItems([{ id: '1', size: '', price: '', crates: '' }]); 
                onSuccess(); 
              }} 
              className="hover:bg-neutral-800/50 text-neutral-400 hover:text-white rounded-full transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Inventario</h1>
              <p className="text-xs text-blue-500/80 font-medium">Gestión de Stock</p>
            </div>
          </div>
        </div>

        {/* Stats de inventario */}
        {existingBatches.length > 0 && (
          <div className="px-4 pb-4">
            <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-2xl p-4 border border-blue-800/30">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-neutral-400 uppercase font-semibold tracking-wider mb-1">Stock Actual</p>
                  <p className="text-3xl font-black text-blue-400">{totalCrates}</p>
                  <p className="text-xs text-neutral-500">cajas disponibles</p>
                </div>
                <div className="bg-blue-500/10 p-3 rounded-xl">
                  <Package className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              <div className="flex gap-4 pt-3 border-t border-neutral-800/50">
                <div>
                  <p className="text-xs text-neutral-500">Inicial</p>
                  <p className="text-lg font-bold text-white">{totalInitial}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Productos</p>
                  <p className="text-lg font-bold text-white">{existingBatches.length}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Consumido</p>
                  <p className="text-lg font-bold text-white">{totalInitial - totalCrates}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-5">
        {/* LOTES ACTIVOS mejorados */}
        {existingBatches.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4 px-1">
              <Layers className="w-4 h-4 text-neutral-500" />
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">En Piso</h3>
              <span className="bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-500/30">
                {existingBatches.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {existingBatches.map(batch => (
                <Card key={batch.id} className="bg-neutral-900/50 border-neutral-800/50 overflow-hidden">
                  {editingId === batch.id ? (
                    <div className="p-4 bg-blue-950/20">
                      <p className="text-xs text-blue-400 font-bold mb-3 flex items-center gap-2">
                        <Edit2 className="w-3.5 h-3.5" />
                        Editando: {batch.size}
                      </p>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-xs text-neutral-500 font-semibold block mb-1.5">Precio S/</label>
                          <input 
                            type="number" 
                            value={editPrice} 
                            onChange={e => setEditPrice(e.target.value)} 
                            className="w-full bg-neutral-950 text-white rounded-lg px-3 py-2 text-sm border border-neutral-700 focus:border-blue-500 outline-none" 
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-neutral-500 font-semibold block mb-1.5">Cajas Iniciales</label>
                          <input 
                            type="number" 
                            value={editCrates} 
                            onChange={e => setEditCrates(e.target.value)} 
                            className="w-full bg-neutral-950 text-white rounded-lg px-3 py-2 text-sm border border-neutral-700 focus:border-blue-500 outline-none" 
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg h-9" 
                          onClick={() => saveEdit(batch.id)}
                          disabled={isPending}
                        >
                          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Guardar</>}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg h-9 px-4" 
                          onClick={cancelEdit}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-2.5 rounded-xl mt-0.5">
                            <Box className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-black text-white text-lg mb-2">{batch.size}</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-neutral-950/70 rounded-lg p-2 border border-neutral-800/50">
                                <div className="flex items-center gap-1 text-neutral-500 mb-1">
                                  <DollarSign className="w-3 h-3" />
                                  <span className="text-[10px] uppercase font-bold">Precio</span>
                                </div>
                                <p className="text-white font-bold">S/ {batch.price.toFixed(2)}</p>
                              </div>
                              <div className="bg-neutral-950/70 rounded-lg p-2 border border-neutral-800/50">
                                <div className="flex items-center gap-1 text-neutral-500 mb-1">
                                  <Package className="w-3 h-3" />
                                  <span className="text-[10px] uppercase font-bold">Inicial</span>
                                </div>
                                <p className="text-white font-bold">{batch.initialCrates} cajas</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-3">
                          <div className={`px-3 py-1.5 rounded-lg border ${
                            batch.remainingCrates > 0 
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}>
                            <p className="text-[10px] uppercase font-bold opacity-70">Quedan</p>
                            <p className="text-xl font-black leading-none">{batch.remainingCrates}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-lg" 
                              onClick={() => startEdit(batch)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-900/20 rounded-lg" 
                              onClick={() => setDeleteConfirm(batch.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Modal de confirmación */}
                      {deleteConfirm === batch.id && (
                        <div className="mt-3 pt-3 border-t border-rose-800/30 bg-rose-950/20 -mx-4 -mb-4 px-4 pb-4 rounded-b-xl animate-in fade-in zoom-in-95 duration-200">
                          <p className="text-sm text-rose-300 font-semibold mb-3 flex items-center gap-2">
                            <Trash2 className="w-4 h-4" />
                            ¿Eliminar {batch.size} del inventario?
                          </p>
                          <div className="flex gap-2">
                            <Button 
                              size="sm"
                              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg h-9"
                              onClick={() => handleDelete(batch.id)}
                              disabled={isPending}
                            >
                              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sí, eliminar'}
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
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* NUEVO INGRESO mejorado */}
        <div>
          <div className="flex items-center gap-2 mb-4 px-1">
            <PackageOpen className="w-4 h-4 text-neutral-500" />
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Nuevo Ingreso</h3>
          </div>
          
          <div className="space-y-3">
            {newItems.map((item) => (
              <Card key={item.id} className="bg-neutral-900/50 border-neutral-800/50">
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-[2fr_1fr_auto] gap-3">
                    <div>
                      <label className="text-xs text-neutral-500 font-bold uppercase block mb-2">Producto</label>
                      <input 
                        type="text" 
                        placeholder="Nombre del producto" 
                        value={item.size} 
                        onChange={(e) => updateNewItem(item.id, 'size', e.target.value)} 
                        className="w-full bg-neutral-950/70 border border-neutral-700/50 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:bg-neutral-950 outline-none" 
                        list={`sizes-${item.id}`}
                      />
                      <datalist id={`sizes-${item.id}`}>
                        {SUGGESTED_SIZES.map(s => <option key={s} value={s} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 font-bold uppercase block mb-2">Precio S/</label>
                      <input 
                        type="number" 
                        placeholder="0.00" 
                        value={item.price} 
                        onChange={(e) => updateNewItem(item.id, 'price', e.target.value)} 
                        className="w-full bg-neutral-950/70 border border-neutral-700/50 rounded-lg px-3 py-2.5 text-sm text-white text-center placeholder:text-neutral-600 focus:border-blue-500/50 focus:bg-neutral-950 outline-none"
                      />
                    </div>
                    <div className="w-20">
                      <label className="text-xs text-neutral-500 font-bold uppercase block mb-2">Cajas</label>
                      <input 
                        type="number" 
                        placeholder="0" 
                        value={item.crates} 
                        onChange={(e) => updateNewItem(item.id, 'crates', e.target.value)} 
                        className="w-full bg-neutral-950/70 border border-neutral-700/50 rounded-lg px-2 py-2.5 text-sm text-white text-center placeholder:text-neutral-600 focus:border-blue-500/50 focus:bg-neutral-950 outline-none"
                      />
                    </div>
                  </div>

                  {/* Botones sugeridos */}
                  {item.size === '' && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-800/30">
                      {SUGGESTED_SIZES.map(s => (
                        <button 
                          key={s} 
                          onClick={() => setSizeName(item.id, s)} 
                          className="text-xs font-semibold bg-neutral-800/50 text-neutral-400 border border-neutral-700/50 px-3 py-1.5 rounded-lg hover:text-white hover:bg-neutral-800 hover:border-neutral-700 transition-all"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Botón eliminar */}
                  {newItems.length > 1 && (
                    <button 
                      className="w-full text-xs text-rose-400 hover:text-rose-300 font-semibold py-2 flex items-center justify-center gap-2 hover:bg-rose-900/10 rounded-lg transition-all" 
                      onClick={() => removeNewRow(item.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar fila
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 mt-4">
            <Button 
              variant="outline" 
              className="flex-1 h-11 border-neutral-800/50 bg-neutral-900/50 text-neutral-400 hover:text-white hover:bg-neutral-800/50 rounded-xl font-semibold" 
              onClick={addNewRow}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Agregar Producto
            </Button>
            <Button 
              className="flex-[2] h-11 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl shadow-lg shadow-blue-900/30 transition-all" 
              onClick={handleCreate} 
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  GUARDAR INVENTARIO
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}