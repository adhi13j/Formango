import { Navigate, Outlet, useLocation } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from './authContext';

/** Wraps the pages that need an account. Visitors are sent to /login and come back afterwards. */
export function RequireAuth() {
  const { user, loading, configured } = useAuth();
  const location = useLocation();
  if (!configured) return <Navigate to="/login" replace />;
  if (loading) {
    return (
      <div className="p-8" aria-busy="true">
        <Skeleton className="h-10 w-64" />
      </div>
    );
  }
  if (!user) {
    const redirectTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} replace />;
  }
  return <Outlet />;
}
