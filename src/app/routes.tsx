import { createBrowserRouter, type RouteObject } from 'react-router';
import Landing from '@/pages/Landing';
import NotFound from '@/pages/NotFound';
import { RouteError } from './RouteError';
import { RouteLoading } from './RouteLoading';

const routes: RouteObject[] = [
  { path: '/', element: <Landing />, errorElement: <RouteError /> },
  // Lazy: the builder (and later Moveable) stays out of the fill page bundle.
  {
    path: '/builder',
    lazy: async () => ({ Component: (await import('@/pages/Builder')).default }),
    errorElement: <RouteError />,
    hydrateFallbackElement: <RouteLoading />,
  },
  {
    path: '/fill/local',
    lazy: async () => ({ Component: (await import('@/pages/FillLocal')).default }),
    errorElement: <RouteError />,
    hydrateFallbackElement: <RouteLoading />,
  },
  { path: '*', element: <NotFound /> },
];

if (import.meta.env.DEV) {
  routes.unshift({
    path: '/dev/pdf-compare',
    lazy: async () => ({ Component: (await import('@/pages/dev/PdfCompare')).default }),
    hydrateFallbackElement: <RouteLoading />,
  });
  routes.unshift({
    path: '/dev/theme',
    lazy: async () => ({ Component: (await import('@/pages/ThemeCheck')).default }),
    hydrateFallbackElement: <RouteLoading />,
  });
}

export const router = createBrowserRouter(routes);
