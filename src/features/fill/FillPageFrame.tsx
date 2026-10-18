import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Toaster } from 'sonner';

/** The fill page has no app chrome: just the form and a small footer outside it. */
export function FillPageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-background">
      <Toaster position="bottom-center" />
      <main className="min-h-0 flex-1">{children}</main>
      <footer className="border-t border-border bg-card py-2 text-center text-xs text-muted-foreground">
        Made with <Link to="/">Formango</Link>
        {' · '}
        <Link to="/privacy">Privacy</Link>
      </footer>
    </div>
  );
}
