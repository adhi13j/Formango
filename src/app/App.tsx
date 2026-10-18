import { RouterProvider } from 'react-router/dom';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ErrorBoundary } from './ErrorBoundary';
import { router } from './routes';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  );
}
