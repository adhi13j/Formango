import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from './authContext';

/** Only same-site paths are allowed as a place to return to, so a link cannot send people elsewhere. */
export function safeRedirect(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/forms';
}

export function LoginCard({ redirectTo }: { redirectTo: string | null }) {
  const { signIn, signUp, configured } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const signingUp = mode === 'signUp';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const outcome = await (signingUp ? signUp : signIn)(email, password);
    setBusy(false);
    if (outcome.ok === true) navigate(safeRedirect(redirectTo), { replace: true });
    else if (outcome.ok === 'check-email') setCheckEmail(true);
    else setError(outcome.message);
  };

  if (checkEmail) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="m-0 text-xl font-bold text-foreground">Check your inbox</h1>
        <p className="text-muted-foreground">
          We sent a link to {email}. Click it, then come back and sign in.
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            setCheckEmail(false);
            setMode('signIn');
          }}
        >
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      noValidate
      className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <h1 className="m-0 mb-2 text-xl font-bold text-foreground">
        {signingUp ? 'Create your account' : 'Welcome back'}
      </h1>
      {!configured && (
        <p role="alert" className="m-0 text-sm text-error">
          Accounts are not set up on this copy of the app yet.
        </p>
      )}
      <div className="space-y-1">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'login-error' : undefined}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type={showPassword ? 'text' : 'password'}
          autoComplete={signingUp ? 'new-password' : 'current-password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'login-error' : undefined}
        />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={showPassword}
            onChange={(event) => setShowPassword(event.target.checked)}
          />
          Show password
        </label>
        {signingUp && <p className="m-0 text-xs text-muted-foreground">At least 8 characters.</p>}
      </div>
      {error && (
        <p id="login-error" role="alert" className="m-0 text-sm text-error">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={busy || !configured}>
        {busy && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
        {signingUp ? 'Sign up' : 'Sign in'}
      </Button>
      <p className="m-0 text-center text-sm text-muted-foreground">
        {signingUp ? 'Already have an account?' : 'New here?'}{' '}
        <button
          type="button"
          className="cursor-pointer border-0 bg-transparent p-0 font-medium text-foreground underline"
          onClick={() => {
            setMode(signingUp ? 'signIn' : 'signUp');
            setError(null);
          }}
        >
          {signingUp ? 'Sign in' : 'Create an account'}
        </button>
      </p>
      <p className="m-0 text-center text-sm">
        <Link to="/builder" className="text-muted-foreground underline">
          Try the builder without an account
        </Link>
      </p>
    </form>
  );
}
