import { Navigate, useSearchParams } from 'react-router';
import { Logo } from '@/components/common/Logo';
import { useAuth } from '@/features/auth/authContext';
import { LoginCard, safeRedirect } from '@/features/auth/LoginCard';
import { usePageMeta } from '@/lib/usePageMeta';

export default function Login() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const redirectTo = params.get('redirectTo');
  usePageMeta('Sign in · Formango');
  if (!loading && user) return <Navigate to={safeRedirect(redirectTo)} replace />;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
      <Logo />
      <LoginCard redirectTo={redirectTo} />
    </main>
  );
}
