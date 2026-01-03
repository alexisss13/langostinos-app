import SalesCalculator from '@/components/sales/SalesCalculator';

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50">
      {/* Aquí cargamos la calculadora de combate */}
      <SalesCalculator />
    </main>
  );
}