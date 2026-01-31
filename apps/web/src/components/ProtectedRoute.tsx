import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { clearUser, setLoading, setUser } from '@/store/authSlice';
import { authApi } from '@/api/authApi';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { user } = await authApi.me();
        dispatch(setUser(user));
      } catch (error) {
        dispatch(clearUser());
        navigate({ to: '/login' });
      } finally {
        dispatch(setLoading(false));
      }
    };

    if (isLoading) {
      checkAuth();
    } else if (!isAuthenticated) {
      navigate({ to: '/login' });
    }
  }, [dispatch, isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
