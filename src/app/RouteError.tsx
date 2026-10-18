import { useEffect } from 'react';
import { useRouteError } from 'react-router';
import { logError } from '@/lib/logError';
import { ErrorFallback } from './ErrorFallback';

/** Router-level error element: shown when a route throws while loading or rendering. */
export function RouteError() {
  const error = useRouteError();
  useEffect(() => {
    logError('Route error', error);
  }, [error]);
  return <ErrorFallback />;
}
