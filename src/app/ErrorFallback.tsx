import { Button } from '@/components/ui/button';

interface ErrorFallbackProps {
  title?: string;
  onReload?: () => void;
}

export function ErrorFallback({
  title = 'Something went wrong',
  onReload = () => window.location.reload(),
}: ErrorFallbackProps) {
  return (
    <div
      role="alert"
      className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-8 text-center"
    >
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="text-muted-foreground">Your work is safe. Reload the page to try again.</p>
      <Button onClick={onReload}>Reload</Button>
    </div>
  );
}
