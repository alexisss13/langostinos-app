'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, PackageOpen, Save } from 'lucide-react';
import { openDay } from '@/actions/batches';

const SIZES = ['Pequeño', 'Mediano', 'Grande', 'Jumbo'];

export default function OpeningForm({ onSuccess }: { onSuccess: () => void }) {
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [crates, setCrates] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const handleInputChange = (size: string, field: 'price' | 'crates', value: string) => {
    if (field === 'price') setPrices(prev => ({ ...prev, [size]: value }));
    else setCrates(prev => ({ ...prev, [size]: value }));
  };

  const handleSave = () => {
    // Filtramos solo los tamaños que tienen datos (por si no llegó Jumbo hoy)
    const dataToSave = SIZES.map(size => ({
      size,
      price: parseFloat(prices[size] || '0'),
      crates: parseInt(crates[size] || '0')
    })).filter(item => item.price > 0 && item.crates > 0);

    if (dataToSave.length === 0) {
      alert("⚠️ Ingresa al menos un tamaño con precio y cantidad de cajas.");
      return;
    }

    startTransition(async () => {
      const res = await openDay(dataToSave);
      if (res.success) {
        onSuccess(); // Recargamos la pantalla principal
      } else {
        alert("Error al abrir el día");
      }
    });
  };

  return (
    <div className="flex flex-col h-screen bg-blue-50 p-4 justify-center">
      <div className="text-center mb-6">
        <div className="inline-block p-3 bg-blue-100 rounded-full mb-2">
            <PackageOpen size={48} className="text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-blue-900">Apertura de Día</h1>
        <p className="text-blue-600">¿Qué llegó hoy al muelle?</p>
      </div>

      <div className="space-y-4 mb-8">
        {SIZES.map(size => (
          <Card key={size} className="p-3 flex items-center gap-2 border-blue-200 shadow-sm">
            <div className="w-20 font-bold text-blue-800">{size}</div>
            
            <div className="flex-1">
                <label className="text-[10px] uppercase text-zinc-400 font-bold">Precio (S/)</label>
                <input 
                    type="number" 
                    placeholder="0.00"
                    className="w-full border-b-2 border-blue-200 bg-transparent py-1 text-lg font-bold outline-none focus:border-blue-500"
                    onChange={(e) => handleInputChange(size, 'price', e.target.value)}
                />
            </div>
            
            <div className="flex-1 border-l pl-2">
                <label className="text-[10px] uppercase text-zinc-400 font-bold">Cajas</label>
                <input 
                    type="number" 
                    placeholder="0"
                    className="w-full border-b-2 border-blue-200 bg-transparent py-1 text-lg font-bold outline-none focus:border-blue-500"
                    onChange={(e) => handleInputChange(size, 'crates', e.target.value)}
                />
            </div>
          </Card>
        ))}
      </div>

      <Button 
        size="lg" 
        className="w-full h-14 text-xl bg-blue-600 hover:bg-blue-700 shadow-lg"
        onClick={handleSave}
        disabled={isPending}
      >
        {isPending ? <Loader2 className="animate-spin" /> : <><Save className="mr-2" /> ABRIR VENTA</>}
      </Button>
    </div>
  );
}