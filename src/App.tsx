import { Button } from '@/components/ui/button';

export default function App() {
  return (
    <main className="mx-auto max-w-xl p-8">
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">Formango theme check</h1>
        <p className="mt-2 text-muted-foreground">Mango on cream, with dark ink on the mango.</p>
        <div className="mt-6 flex gap-3">
          <Button>Primary action</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Delete</Button>
        </div>
      </div>
    </main>
  );
}
