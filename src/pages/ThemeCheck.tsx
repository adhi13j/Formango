import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FONT_IDS, FONTS, loadAllFonts } from '@/lib/fonts';

export default function ThemeCheck() {
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    void loadAllFonts().then(() => setFontsReady(true));
  }, []);

  return (
    <main className="mx-auto max-w-xl p-8" data-fonts={fontsReady ? 'ready' : 'loading'}>
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">Formango theme check</h1>
        <p className="mt-2 text-muted-foreground">Mango on cream, with dark ink on the mango.</p>
        <div className="mt-6 flex gap-3">
          <Button>Primary action</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Delete</Button>
        </div>
        <ul className="doc-text mt-6 space-y-1 text-lg text-foreground">
          {FONT_IDS.map((id) => (
            <li key={id} data-font-id={id} style={{ fontFamily: `"${FONTS[id].family}"` }}>
              {FONTS[id].label}: <span className="font-bold">Bold</span> and regular
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
