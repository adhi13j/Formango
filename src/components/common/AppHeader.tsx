import { LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/authContext';

/** The 56px bar on the account pages: logo, My forms, and the account menu. */
export function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const initial = (user?.email ?? '?').slice(0, 1).toUpperCase();
  return (
    <header className="flex h-14 items-center gap-6 border-b border-border bg-card px-4">
      <Logo to="/forms" />
      <nav aria-label="Main" className="flex items-center gap-4 text-sm">
        <Link to="/forms" className="font-medium text-foreground">
          My forms
        </Link>
        <Link to="/builder" className="text-muted-foreground hover:text-foreground">
          Try the guest builder
        </Link>
      </nav>
      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Account menu"
              className="rounded-full"
            >
              {initial}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="font-normal text-muted-foreground">
              {user?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                void signOut().then(() => navigate('/login'));
              }}
            >
              <LogOut size={16} aria-hidden="true" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
