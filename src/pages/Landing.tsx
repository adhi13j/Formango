import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-8 text-center">
      <title>Formango</title>
      <h1 className="text-2xl font-bold text-foreground">Landing</h1>
      <p className="text-muted-foreground">The landing page arrives in Phase 4.</p>
      <Button asChild>
        <Link to="/builder">Try the builder</Link>
      </Button>
    </main>
  );
}
