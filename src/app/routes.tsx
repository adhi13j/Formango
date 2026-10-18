import { createBrowserRouter, type RouteObject } from 'react-router';
import NotFound from '@/pages/NotFound';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { RouteError } from './RouteError';
import { RouteLoading } from './RouteLoading';

const routes: RouteObject[] = [
  {
    path: '/',
    lazy: async () => ({ Component: (await import('@/pages/Landing')).default }),
    errorElement: <RouteError />,
    hydrateFallbackElement: <RouteLoading />,
  },
  {
    path: '/privacy',
    lazy: async () => ({ Component: (await import('@/pages/Privacy')).default }),
    errorElement: <RouteError />,
    hydrateFallbackElement: <RouteLoading />,
  },
  // Lazy: the builder (and later Moveable) stays out of the fill page bundle.
  {
    path: '/builder',
    lazy: async () => ({ Component: (await import('@/pages/Builder')).default }),
    errorElement: <RouteError />,
    hydrateFallbackElement: <RouteLoading />,
  },
  {
    path: '/login',
    lazy: async () => ({ Component: (await import('@/pages/Login')).default }),
    errorElement: <RouteError />,
    hydrateFallbackElement: <RouteLoading />,
  },
  {
    path: '/f/:slug',
    lazy: async () => ({ Component: (await import('@/pages/PublicFill')).default }),
    errorElement: <RouteError />,
    hydrateFallbackElement: <RouteLoading />,
  },
  {
    element: <RequireAuth />,
    errorElement: <RouteError />,
    children: [
      {
        path: '/forms',
        lazy: async () => ({ Component: (await import('@/pages/Forms')).default }),
        hydrateFallbackElement: <RouteLoading />,
      },
      {
        path: '/forms/:id/edit',
        lazy: async () => ({ Component: (await import('@/pages/EditForm')).default }),
        hydrateFallbackElement: <RouteLoading />,
      },
      {
        path: '/forms/:id/responses',
        lazy: async () => ({ Component: (await import('@/pages/Responses')).default }),
        hydrateFallbackElement: <RouteLoading />,
      },
    ],
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
