'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, PackageOpen, Save, Trash2, Edit2, Check, X, ArrowLeft, PlusCircle } from 'lucide-react';
import { openDay, getTodayBatches, updateBatch, deleteBatch } from '@/actions/batches';

// Tamaños estándar como sugerencia rápida
const SUGGESTED_SIZES = ['Pequeño', 'Mediano', 'Grande', 'Jumbo', 'Pescado', 'Calamar'];

// Tipo local para visualización
type BatchData = { 
    id: string; 
    size: string; 
    price: number; 
    stockKg: number; 
    initialCrates: number; 
    remainingCrates: number; 
};

// Tipo para el formulario de nuevos ingresos
type NewItem = {
    id: string;
    size: string;
    price: string;
    crates: string;
};

export default function OpeningForm({ onSuccess }: { onSuccess: () => void }) {
  const [existingBatches, setExistingBatches] = useState<BatchData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Gatillo para recargar datos (Solución al error de setState)
  const [trigger, setTrigger] = useState(0);
  
  // Edición temporal
  const [editPrice, setEditPrice] = useState('');
  const [editCrates, setEditCrates] = useState('');

  // Lista dinámica de ingresos
  const [newItems, setNewItems] = useState<NewItem[]>([
    { id: '1', size: '', price: '', crates: '' }
  ]);
  
  const [isPending, startTransition] = useTransition();

  // --- EFECTO DE CARGA LIMPIO ---
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
        try {
            const data = await getTodayBatches();
            if (isMounted) {
                setExistingBatches(data as unknown as BatchData[]);
            }
        } catch (err) {
            console.error("Error cargando lotes:", err);
        }
    };
    loadData();
    return () => { isMounted = false; };
  }, [trigger]); // Se ejecuta al inicio y cada vez que 'trigger' cambia

  // Función simple para disparar la recarga
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

  // --- LÓGICA DE CREACIÓN (DINÁMICA) ---
  const updateNewItem = (id: string, field: keyof NewItem, value: string) => {
    setNewItems(prev => prev.map(item => 
        item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const addNewRow = () => {
    setNewItems(prev => [...prev, { id: Date.now().toString(), size: '', price: '', crates: '' }]);
  };

  const removeNewRow = (id: string) => {
    setNewItems(prev => prev.filter(item => item.id !== id));
  };

  // Autocompletar nombre
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
        alert("⚠️ Ingresa al menos un producto con nombre, precio y cantidad.");
        return;
    }

    startTransition(async () => {
      await openDay(dataToSave);
      // Reiniciar formulario con una fila vacía
      setNewItems([{ id: Date.now().toString(), size: '', price: '', crates: '' }]);
      refreshBatches();
    });
  };

  return (
    <div className="flex flex-col h-screen bg-blue-50 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={onSuccess}>
            <ArrowLeft className="text-blue-900"/>
        </Button>
        <h1 className="text-xl font-bold text-blue-900">Gestión de Inventario 📦</h1>
      </div>

      <div className="flex-1 overflow-auto space-y-6">
        
        {/* SECCIÓN 1: LOTES ACTIVOS */}
        {existingBatches.length > 0 && (
            <div>
                <h3 className="text-sm font-bold text-blue-800 uppercase mb-2 pl-1">Cajas en Piso (Hoy)</h3>
                <div className="space-y-2">
                    {existingBatches.map(batch => (
                        <Card key={batch.id} className="p-3 flex items-center justify-between border-blue-200 shadow-sm bg-white">
                            {editingId === batch.id ? (
                                <div className="flex items-center gap-2 w-full">
                                    <div className="w-20 font-bold text-blue-800 text-sm">{batch.size}</div>
                                    <div className="flex-1">
                                        <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="w-full border-b border-blue-300 font-bold text-sm outline-none" placeholder="Precio"/>
                                    </div>
                                    <div className="flex-1">
                                        <input type="number" value={editCrates} onChange={e => setEditCrates(e.target.value)} className="w-full border-b border-blue-300 font-bold text-sm outline-none" placeholder="Stock"/>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 bg-green-50" onClick={() => saveEdit(batch.id)}><Check size={16} /></Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 bg-red-50" onClick={cancelEdit}><X size={16} /></Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <div className="font-bold text-blue-900 text-lg">{batch.size}</div>
                                        <div className="text-xs text-blue-600">
                                            S/ {batch.price.toFixed(2)}  •  Ini: {batch.initialCrates}  •  <span className="font-bold">Restan: {batch.remainingCrates}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-blue-600" onClick={() => startEdit(batch)}><Edit2 size={16} /></Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-red-600" onClick={() => handleDelete(batch.id)}><Trash2 size={16} /></Button>
                                    </div>
                                </>
                            )}
                        </Card>
                    ))}
                </div>
            </div>
        )}

        {/* SECCIÓN 2: AGREGAR NUEVOS (DINÁMICO) */}
        <div className="pt-4 border-t border-blue-200">
            <h3 className="text-sm font-bold text-blue-800 uppercase mb-2 pl-1 flex items-center gap-2">
                <PackageOpen size={16}/> Ingresar Nueva Mercadería
            </h3>
            
            {/* Lista de filas de ingreso */}
            <div className="space-y-3">
                {newItems.map((item, index) => (
                    <Card key={item.id} className="p-3 border-blue-100 shadow-sm bg-blue-50/50">
                        <div className="flex gap-2 items-end">
                            {/* Input Nombre Producto */}
                            <div className="flex-1 relative">
                                <label className="text-[10px] uppercase text-zinc-400 font-bold block mb-1">Producto</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej: Pescado"
                                    value={item.size}
                                    onChange={(e) => updateNewItem(item.id, 'size', e.target.value)}
                                    className="w-full border-b border-zinc-300 bg-transparent py-1 text-base font-bold outline-none focus:border-blue-500 text-zinc-700 placeholder:text-zinc-300"
                                    list={`sizes-${item.id}`} // Datalist para sugerencias
                                />
                                {/* Sugerencias nativas */}
                                <datalist id={`sizes-${item.id}`}>
                                    {SUGGESTED_SIZES.map(s => <option key={s} value={s} />)}
                                </datalist>
                            </div>

                            {/* Input Precio */}
                            <div className="w-20">
                                <label className="text-[10px] uppercase text-zinc-400 font-bold block mb-1">Precio</label>
                                <input 
                                    type="number" 
                                    placeholder="0.00"
                                    value={item.price}
                                    onChange={(e) => updateNewItem(item.id, 'price', e.target.value)}
                                    className="w-full border-b border-zinc-300 bg-transparent py-1 text-base font-bold outline-none focus:border-blue-500 text-zinc-700 placeholder:text-zinc-300"
                                />
                            </div>

                            {/* Input Cajas */}
                            <div className="w-16">
                                <label className="text-[10px] uppercase text-zinc-400 font-bold block mb-1">Cajas</label>
                                <input 
                                    type="number" 
                                    placeholder="0"
                                    value={item.crates}
                                    onChange={(e) => updateNewItem(item.id, 'crates', e.target.value)}
                                    className="w-full border-b border-zinc-300 bg-transparent py-1 text-base font-bold outline-none focus:border-blue-500 text-zinc-700 placeholder:text-zinc-300"
                                />
                            </div>

                            {/* Botón Borrar Fila (solo si hay más de 1) */}
                            {newItems.length > 1 && (
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 text-red-400 hover:bg-red-50 -mb-1"
                                    onClick={() => removeNewRow(item.id)}
                                >
                                    <Trash2 size={16} />
                                </Button>
                            )}
                        </div>
                        
                        {/* Botones rápidos de sugerencia (solo si está vacío el nombre) */}
                        {item.size === '' && (
                            <div className="flex gap-2 mt-2 overflow-x-auto pb-1 no-scrollbar">
                                {SUGGESTED_SIZES.map(s => (
                                    <button 
                                        key={s}
                                        onClick={() => setSizeName(item.id, s)}
                                        className="text-xs bg-white border border-blue-100 text-blue-600 px-2 py-1 rounded-full whitespace-nowrap hover:bg-blue-50"
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
            <div className="flex gap-2 mt-4 pb-8">
                <Button 
                    variant="outline"
                    className="flex-1 h-12 border-blue-200 text-blue-700 hover:bg-blue-100"
                    onClick={addNewRow}
                >
                    <PlusCircle className="mr-2 h-4 w-4" /> Agregar otro
                </Button>
                
                <Button 
                    className="flex-[2] h-12 bg-blue-600 hover:bg-blue-700 shadow-md text-lg"
                    onClick={handleCreate}
                    disabled={isPending}
                >
                    {isPending ? <Loader2 className="animate-spin" /> : <><Save className="mr-2" /> GUARDAR</>}
                </Button>
            </div>
        </div>

      </div>
    </div>
  );
}