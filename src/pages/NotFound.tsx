import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-8 text-center">
      <title>Page not found | Formango</title>
      <h1 className="text-2xl font-bold text-foreground">We could not find that page</h1>
      <p className="text-muted-foreground">The link may be old or mistyped.</p>
      <Button asChild>
        <Link to="/">Go home</Link>
      </Button>
    </main>
  );
}
