import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, ApiError } from '@/lib/api';
import type { User, AuthResponse } from '@/types/auth';
import { toast } from 'sonner';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<AuthResponse>('/api/me');
      if (res.ok && res.data?.user) {
        setUser(res.data.user);
        return true;
      }
      setUser(null);
      return false;
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 401) {
        setUser(null);
        return false;
      }
      console.error('[Auth] Check failed:', err);
      setUser(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const res = await apiFetch<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      if (res.ok && res.data?.user) {
        setUser(res.data.user);
        toast.success('Logged in successfully');
        navigate('/');
        return true;
      }
      
      setError(res.error || 'Login failed');
      return false;
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message);
      toast.error(apiErr.message);
      return false;
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    } catch (err) {
      console.error('[Auth] Logout error:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('tempmail_inbox');
      toast.success('Logged out');
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    loading,
    error,
    login,
    logout,
    checkAuth,
    isAuthenticated: !!user,
  };
}
