import { Link } from 'react-router';

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-md font-display text-lg font-semibold text-foreground"
      aria-label="Formango home"
    >
      <img src="/favicon.svg" alt="" width={24} height={24} />
      <span>Formango</span>
    </Link>
  );
}
